/**
 * AGENT RUNTIME CONFIGURATION & ADAPTER MODE REGISTRY
 *
 * Explicitly exposes whether the system is running in LIVE service mode
 * or MOCK / DEMO SANDBOX mode. In LIVE mode, silent mock fallbacks are strictly prohibited.
 */

export type AgentMode = "live" | "mock";

export type AgentRuntimeConfig = {
  mode: AgentMode;
  isLive: boolean;
  llm: {
    provider: "google_gemini" | "mock_llm";
    model: string;
    status: "ready" | "missing_key" | "error";
    isLive: boolean;
  };
  search: {
    provider: "tavily" | "wikipedia_live" | "mock_search";
    status: "ready" | "limited" | "mock";
    isLive: boolean;
  };
  web3: {
    rpcUrl: string;
    network: string;
    isLive: boolean;
  };
  storage: {
    type: "persistent_json";
    storageDir: string;
  };
  limits: {
    maxSteps: number;
    stepTimeoutMs: number;
    taskTimeoutMs: number;
    pricingPerMillionInputTokensUsd?: number | "chưa xác định";
    pricingPerMillionOutputTokensUsd?: number | "chưa xác định";
  };
};

export function getAgentRuntimeConfig(): AgentRuntimeConfig {
  const envMode = process.env.AGENT_MODE?.toLowerCase();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
  
  // Explicit live mode if key present and not forced to mock
  const isLive = envMode === "mock" ? false : hasGeminiKey;
  const mode: AgentMode = isLive ? "live" : "mock";

  const searchProvider = isLive
    ? process.env.TAVILY_API_KEY
      ? "tavily"
      : "wikipedia_live"
    : "mock_search";

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  return {
    mode,
    isLive,
    llm: {
      provider: isLive ? "google_gemini" : "mock_llm",
      model,
      status: hasGeminiKey ? "ready" : "missing_key",
      isLive,
    },
    search: {
      provider: searchProvider,
      status: isLive ? "ready" : "mock",
      isLive,
    },
    web3: {
      rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      network: "Base L2 Mainnet",
      isLive: true,
    },
    storage: {
      type: "persistent_json",
      storageDir: process.env.DATA_DIR || "Local Project Root",
    },
    limits: {
      maxSteps: 5,
      stepTimeoutMs: 8000,
      taskTimeoutMs: 45000,
      pricingPerMillionInputTokensUsd: 0.075,
      pricingPerMillionOutputTokensUsd: 0.30,
    },
  };
}
