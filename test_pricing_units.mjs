import assert from "assert";
import { calculateExactCost } from "./agent/pricing.ts";

console.log("================================================================================");
console.log("🧪 RUNNING EXACT COST ACCOUNTING & PRICING UNIT TESTS");
console.log("================================================================================");

// TEST 1: Paid Tier with exact tokens (gemini-2.5-flash)
{
  const result = calculateExactCost({
    modelId: "gemini-2.5-flash",
    promptTokens: 10000,
    cachedTokens: 2000,
    candidateTokens: 1000,
    searchCallsCount: 2,
    searchProvider: "tavily",
    mode: "live",
    isFreeTier: false,
  });

  // Non-cached prompt = 10000 - 2000 = 8000 -> 8000 * 0.075 / 1e6 = 0.000600
  // Cached prompt = 2000 -> 2000 * 0.01875 / 1e6 = 0.0000375
  // Output / Thinking = 1000 -> 1000 * 0.30 / 1e6 = 0.000300
  // LLM Subtotal = 0.000600 + 0.0000375 + 0.000300 = 0.0009375 -> 0.000938
  // Search (Tavily 2 queries) = 2 * 0.005 = 0.010000
  // Total = 0.010938
  console.log("\n[TEST 1] Paid Tier (gemini-2.5-flash) with 10k prompt (2k cached), 1k output, 2 Tavily searches:");
  console.log("  • LLM Inference Cost:", result.llmInferenceCostUsd, "USD (Expected: 0.000938)");
  console.log("  • Search Cost:", result.searchCostUsd, "USD (Expected: 0.010000)");
  console.log("  • Total Estimated Cost:", result.totalEstimatedCostUsd, "USD (Expected: 0.010938)");
  assert.strictEqual(result.llmInferenceCostUsd, 0.000938);
  assert.strictEqual(result.searchCostUsd, 0.01);
  assert.strictEqual(result.totalEstimatedCostUsd, 0.010938);
  console.log("  ✅ PASS: Exact token cost formula matched perfectly without double counting.");
}

// TEST 2: Google AI Studio Free Tier
{
  const result = calculateExactCost({
    modelId: "gemini-2.5-flash",
    promptTokens: 15000,
    cachedTokens: 3000,
    candidateTokens: 800,
    searchCallsCount: 3,
    searchProvider: "wikipedia_live",
    mode: "live",
    isFreeTier: true,
  });

  console.log("\n[TEST 2] Free Tier (Google AI Studio Free API + Wikipedia Live):");
  console.log("  • LLM Inference Cost:", result.llmInferenceCostUsd, "USD (Expected: 0)");
  console.log("  • Search Cost:", result.searchCostUsd, "USD (Expected: 0)");
  console.log("  • Total Estimated Cost:", result.totalEstimatedCostUsd, "USD (Expected: 0)");
  console.log("  • Disclaimer:", result.disclaimer);
  assert.strictEqual(result.llmInferenceCostUsd, 0);
  assert.strictEqual(result.searchCostUsd, 0);
  assert.strictEqual(result.totalEstimatedCostUsd, 0);
  assert.strictEqual(result.isFreeTier, true);
  console.log("  ✅ PASS: Free tier produces exact $0.00 cost.");
}

// TEST 3: Unconfigured / Unknown Model ID
{
  const result = calculateExactCost({
    modelId: "custom-unreleased-llm-v99",
    promptTokens: 5000,
    cachedTokens: 0,
    candidateTokens: 500,
    searchCallsCount: 1,
    searchProvider: "wikipedia_live",
    mode: "live",
    isFreeTier: false,
  });

  console.log("\n[TEST 3] Unconfigured Model (custom-unreleased-llm-v99):");
  console.log("  • Is Configured:", result.isConfigured, "(Expected: false)");
  console.log("  • LLM Inference Cost:", result.llmInferenceCostUsd, "(Expected: 'chưa xác định')");
  console.log("  • Total Estimated Cost:", result.totalEstimatedCostUsd, "(Expected: 'chưa xác định')");
  assert.strictEqual(result.isConfigured, false);
  assert.strictEqual(result.llmInferenceCostUsd, "chưa xác định");
  assert.strictEqual(result.totalEstimatedCostUsd, "chưa xác định");
  console.log("  ✅ PASS: Unconfigured model strictly returns 'chưa xác định' without generic fallback.");
}

// TEST 4: Mock Sandbox Mode
{
  const result = calculateExactCost({
    modelId: "mock_llm",
    promptTokens: 20000,
    cachedTokens: 5000,
    candidateTokens: 2000,
    searchCallsCount: 5,
    searchProvider: "mock_search",
    mode: "mock",
  });

  console.log("\n[TEST 4] Mock Mode Sandbox:");
  console.log("  • LLM Cost:", result.llmInferenceCostUsd, "(Expected: 0)");
  console.log("  • Search Cost:", result.searchCostUsd, "(Expected: 0)");
  console.log("  • Total Cost:", result.totalEstimatedCostUsd, "(Expected: 0)");
  console.log("  • Pricing Version:", result.pricingVersion);
  assert.strictEqual(result.llmInferenceCostUsd, 0);
  assert.strictEqual(result.totalEstimatedCostUsd, 0);
  console.log("  ✅ PASS: Mock sandbox generates exactly 0.0 USD actual cost.");
}

console.log("\n================================================================================");
console.log("🎉 ALL PRICING & COST ACCOUNTING UNIT TESTS PASSED!");
console.log("================================================================================\n");
