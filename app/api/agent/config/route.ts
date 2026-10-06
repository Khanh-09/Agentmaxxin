import { NextResponse } from "next/server";
import { getAgentRuntimeConfig } from "@/agent/config";

export async function GET() {
  const config = getAgentRuntimeConfig();
  // Safe sanitized configuration response (NO API keys exposed)
  return NextResponse.json({
    mode: config.mode,
    isLive: config.isLive,
    llm: {
      provider: config.llm.provider,
      model: config.llm.model,
      status: config.llm.status,
    },
    search: {
      provider: config.search.provider,
      status: config.search.status,
    },
    web3: {
      network: config.web3.network,
      rpcActive: true,
    },
    limits: {
      maxSteps: config.limits.maxSteps,
      taskTimeoutMs: config.limits.taskTimeoutMs,
      pricing: {
        inputPerMillion: config.limits.pricingPerMillionInputTokensUsd,
        outputPerMillion: config.limits.pricingPerMillionOutputTokensUsd,
      },
    },
  });
}
