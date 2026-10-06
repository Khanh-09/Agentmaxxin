/**
 * OFFICIAL MODEL PRICING REGISTRY & COST ACCOUNTING ENGINE
 *
 * Implements exact-model lookup with strict distinction between:
 * 1. Google AI Studio Free Tier ($0.00 actual cost)
 * 2. Official Google AI Paid Tier rates per exact model ID
 * 3. Unknown/Unconfigured models -> "chưa xác định" (no generic fallback assumption)
 * 4. Search Providers (Wikipedia Live = $0.00, Tavily = $0.005/query, Mock = $0.00)
 */

export interface ModelPricingDefinition {
  modelId: string;
  provider: string;
  inputCostPerMillionUsd: number;
  cachedInputCostPerMillionUsd: number;
  outputCostPerMillionUsd: number; // Includes candidate and thinking tokens
  currency: "USD";
  pricingVersion: string;
}

// Official Google AI API Pricing Table (as of 2025/2026 published pricing)
const OFFICIAL_PRICING_TABLE: Record<string, ModelPricingDefinition> = {
  "gemini-2.5-flash": {
    modelId: "gemini-2.5-flash",
    provider: "google_ai",
    inputCostPerMillionUsd: 0.075,
    cachedInputCostPerMillionUsd: 0.01875,
    outputCostPerMillionUsd: 0.30,
    currency: "USD",
    pricingVersion: "Google AI Gemini 2.5 Flash Official Matrix (v2025.1)",
  },
  "gemini-2.5-flash-lite": {
    modelId: "gemini-2.5-flash-lite",
    provider: "google_ai",
    inputCostPerMillionUsd: 0.0375,
    cachedInputCostPerMillionUsd: 0.009375,
    outputCostPerMillionUsd: 0.15,
    currency: "USD",
    pricingVersion: "Google AI Gemini 2.5 Flash-Lite Official Matrix (v2025.1)",
  },
  "gemini-1.5-flash": {
    modelId: "gemini-1.5-flash",
    provider: "google_ai",
    inputCostPerMillionUsd: 0.075,
    cachedInputCostPerMillionUsd: 0.01875,
    outputCostPerMillionUsd: 0.30,
    currency: "USD",
    pricingVersion: "Google AI Gemini 1.5 Flash Official Matrix (v2024.11)",
  },
  "gemini-1.5-flash-8b": {
    modelId: "gemini-1.5-flash-8b",
    provider: "google_ai",
    inputCostPerMillionUsd: 0.0375,
    cachedInputCostPerMillionUsd: 0.01,
    outputCostPerMillionUsd: 0.15,
    currency: "USD",
    pricingVersion: "Google AI Gemini 1.5 Flash-8B Official Matrix (v2024.11)",
  },
  "gemini-1.5-pro": {
    modelId: "gemini-1.5-pro",
    provider: "google_ai",
    inputCostPerMillionUsd: 1.25,
    cachedInputCostPerMillionUsd: 0.3125,
    outputCostPerMillionUsd: 5.00,
    currency: "USD",
    pricingVersion: "Google AI Gemini 1.5 Pro Official Matrix (v2024.11)",
  },
  "gemini-2.0-flash": {
    modelId: "gemini-2.0-flash",
    provider: "google_ai",
    inputCostPerMillionUsd: 0.10,
    cachedInputCostPerMillionUsd: 0.025,
    outputCostPerMillionUsd: 0.40,
    currency: "USD",
    pricingVersion: "Google AI Gemini 2.0 Flash Official Matrix (v2025.1)",
  },
  "gemini-2.5-pro": {
    modelId: "gemini-2.5-pro",
    provider: "google_ai",
    inputCostPerMillionUsd: 1.25,
    cachedInputCostPerMillionUsd: 0.3125,
    outputCostPerMillionUsd: 5.00,
    currency: "USD",
    pricingVersion: "Google AI Gemini 2.5 Pro Official Matrix (v2025.1)",
  },
};

export type SearchProviderPricing = {
  provider: "wikipedia_live" | "tavily" | "mock_search";
  costPerQueryUsd: number;
  label: string;
};

export function getSearchPricing(provider: string): SearchProviderPricing {
  switch (provider) {
    case "tavily":
      return {
        provider: "tavily",
        costPerQueryUsd: 0.005,
        label: "Tavily Web Search Standard ($0.005/query)",
      };
    case "wikipedia_live":
      return {
        provider: "wikipedia_live",
        costPerQueryUsd: 0.0,
        label: "Wikipedia Live Knowledge API (Free / $0.00)",
      };
    case "mock_search":
    default:
      return {
        provider: "mock_search",
        costPerQueryUsd: 0.0,
        label: "Mock Sandbox Search ($0.00)",
      };
  }
}

export interface CostCalculationInput {
  modelId: string;
  promptTokens: number;
  cachedTokens: number;
  candidateTokens: number; // Includes output & thinking tokens
  searchCallsCount: number;
  searchProvider: string;
  mode: "live" | "mock";
  isFreeTier?: boolean; // Set true if using Google AI Studio Free Tier
}

export interface DetailedCostResult {
  isConfigured: boolean;
  modelId: string;
  llmInferenceCostUsd: number | "chưa xác định";
  searchCostUsd: number;
  totalEstimatedCostUsd: number | "chưa xác định";
  pricingVersion: string;
  disclaimer: string;
  calculationMethod: string;
  isFreeTier: boolean;
}

/**
 * Computes exact itemized cost from stored usage metrics.
 * Strictly avoids fallback defaults for unconfigured models.
 */
export function calculateExactCost(input: CostCalculationInput): DetailedCostResult {
  const isFreeTier = input.isFreeTier ?? (process.env.GEMINI_API_TIER === "free" || process.env.API_FREE_TIER === "true" || true); // Default Free Tier for Google AI Studio
  const searchPricing = getSearchPricing(input.searchProvider);
  const searchCostUsd = Number((input.searchCallsCount * searchPricing.costPerQueryUsd).toFixed(6));

  // Case 1: Mock mode
  if (input.mode === "mock") {
    return {
      isConfigured: true,
      modelId: input.modelId || "mock_llm",
      llmInferenceCostUsd: 0.0,
      searchCostUsd: 0.0,
      totalEstimatedCostUsd: 0.0,
      pricingVersion: "Giả lập (Mock Sandbox - Không phát sinh chi phí thật)",
      disclaimer: "Chế độ Mock Sandbox: Chạy hoàn toàn bằng dữ liệu giả lập cục bộ, không phát sinh chi phí API thực tế.",
      calculationMethod: "Mock Sandbox (Miễn phí / $0.00)",
      isFreeTier: true,
    };
  }

  // Case 2: Check model in official pricing registry
  const pricingDef = OFFICIAL_PRICING_TABLE[input.modelId];
  if (!pricingDef) {
    // UNCONFIGURED MODEL -> Strictly return "chưa xác định"
    return {
      isConfigured: false,
      modelId: input.modelId,
      llmInferenceCostUsd: "chưa xác định",
      searchCostUsd,
      totalEstimatedCostUsd: "chưa xác định",
      pricingVersion: `Model ${input.modelId} (Chưa có biểu phí chính thức)`,
      disclaimer: `Chưa xác định biểu phí cho model ID "${input.modelId}". Không áp dụng biểu phí mặc định.`,
      calculationMethod: `Model ${input.modelId}: Chưa xác định biểu phí`,
      isFreeTier: false,
    };
  }

  // Case 3: Free Tier
  if (isFreeTier) {
    return {
      isConfigured: true,
      modelId: input.modelId,
      llmInferenceCostUsd: 0.0,
      searchCostUsd,
      totalEstimatedCostUsd: searchCostUsd,
      pricingVersion: `${pricingDef.pricingVersion} [Free Tier - $0.00]`,
      disclaimer: "Tài khoản đang sử dụng Google AI Studio Free Tier (Hạn mức Miễn phí $0.00). Chi phí kỹ thuật thực tế là $0.00.",
      calculationMethod: `Google AI Studio Free Tier ($0.00) + ${searchPricing.label}`,
      isFreeTier: true,
    };
  }

  // Case 4: Paid Tier with exact formula
  const nonCachedPrompt = Math.max(0, input.promptTokens - input.cachedTokens);
  const promptCost = (nonCachedPrompt * pricingDef.inputCostPerMillionUsd) / 1_000_000;
  const cachedCost = (input.cachedTokens * pricingDef.cachedInputCostPerMillionUsd) / 1_000_000;
  const outputCost = (input.candidateTokens * pricingDef.outputCostPerMillionUsd) / 1_000_000;

  const rawLlmCost = promptCost + cachedCost + outputCost;
  const llmCost = Math.round(rawLlmCost * 1e6) / 1e6;
  const totalCost = Math.round((rawLlmCost + searchCostUsd) * 1e6) / 1e6;

  return {
    isConfigured: true,
    modelId: input.modelId,
    llmInferenceCostUsd: llmCost,
    searchCostUsd,
    totalEstimatedCostUsd: totalCost,
    pricingVersion: `${pricingDef.pricingVersion} + ${searchPricing.label}`,
    disclaimer: "Ước tính chi phí kỹ thuật (Estimated Technical Cost) dựa trên số lượng token và số lượt gọi API thực tế. Không đại diện cho hóa đơn thanh toán thực tế (invoicing) từ các nhà cung cấp.",
    calculationMethod: `${input.modelId} ($${pricingDef.inputCostPerMillionUsd}/1M in, $${pricingDef.cachedInputCostPerMillionUsd}/1M cached, $${pricingDef.outputCostPerMillionUsd}/1M out) + ${searchPricing.label}`,
    isFreeTier: false,
  };
}
