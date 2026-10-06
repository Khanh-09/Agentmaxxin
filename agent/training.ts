/**
 * SELF-TRAINING, IN-CONTEXT FEW-SHOT EXEMPLARS & ACTIVE LEARNING LOOP
 *
 * Implements DSPy / Self-Play principles for LLM agents:
 * 1. Collects high-scoring execution traces (Exemplars).
 * 2. Selects relevant Few-Shot examples dynamically for user prompts.
 * 3. Formulates reflection lessons when tools or groundedness fail.
 * 4. Benchmarks performance and computes domain intelligence scores.
 */
import fs from "fs";
import path from "path";
import { getExecutionLogs } from "./logger";
import { getAgentLearnings, saveAgentLearning } from "./knowledge";


const EXEMPLARS_FILE = path.join(process.cwd(), ".agent-exemplars.json");

export type Exemplar = {
  id: string;
  domain: string;
  userPrompt: string;
  toolsCalled: string[];
  reasoningSnippet: string;
  score: number;
  timestamp: string;
};

// Seed high-reward exemplars for few-shot learning
const SEED_EXEMPLARS: Exemplar[] = [
  {
    id: "ex_swap_gas",
    domain: "web3",
    userPrompt: "Simulate swapping 0.5 ETH to USDC and check current Base Sepolia gas fees",
    toolsCalled: ["simulate_token_swap", "estimate_gas_and_fees"],
    reasoningSnippet:
      "Chained swap simulator to calculate 0.3% pool fee and 0.1% slippage, then inspected EIP-1559 Base fee to provide a complete DeFi breakdown.",
    score: 100,
    timestamp: new Date().toISOString(),
  },
  {
    id: "ex_transfer_proposal",
    domain: "web3",
    userPrompt: "Prepare transfer of 0.0001 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    toolsCalled: ["prepare_transfer"],
    reasoningSnippet:
      "Validated recipient 0x address, checked current wallet balance, estimated gas, and returned a structured proposal for human approval.",
    score: 100,
    timestamp: new Date().toISOString(),
  },
  {
    id: "ex_research_scrape",
    domain: "research",
    userPrompt: "Search the web for latest AI Agent trends with sources",
    toolsCalled: ["get_web_search"],
    reasoningSnippet:
      "Conducted web search, extracted key facts regarding autonomous workflows, and formatted output with clear clickable URL sources.",
    score: 100,
    timestamp: new Date().toISOString(),
  },
];

export function getExemplars(): Exemplar[] {
  try {
    if (fs.existsSync(EXEMPLARS_FILE)) {
      const data = JSON.parse(fs.readFileSync(EXEMPLARS_FILE, "utf8"));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  saveExemplars(SEED_EXEMPLARS);
  return SEED_EXEMPLARS;
}

export function saveExemplars(items: Exemplar[]) {
  try {
    fs.writeFileSync(EXEMPLARS_FILE, JSON.stringify(items.slice(0, 50), null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save exemplars:", err);
  }
}

export function recordHighRewardExemplar(domain: string, userPrompt: string, toolsCalled: string[], reasoningSnippet: string, score = 100) {
  if (score < 90) return;
  const list = getExemplars();
  // Prevent duplicate prompts
  if (list.some((e) => e.userPrompt.toLowerCase() === userPrompt.toLowerCase())) return;

  list.unshift({
    id: `ex_${Date.now()}`,
    domain,
    userPrompt,
    toolsCalled,
    reasoningSnippet: reasoningSnippet.slice(0, 200),
    score,
    timestamp: new Date().toISOString(),
  });
  saveExemplars(list);
}

/** Retrieve dynamic Few-Shot Exemplars for a given query and domain */
export function getRelevantExemplars(userPrompt: string, domain?: string, maxCount = 2): Exemplar[] {
  const all = getExemplars();
  const lower = userPrompt.toLowerCase();

  return all
    .filter((e) => (domain ? e.domain === domain : true) || lower.includes(e.domain))
    .slice(0, maxCount);
}

/** ─── SELF-TRAINING BENCHMARK & ACCURACY METRICS ─── */
export function calculateIntelligenceMetrics() {
  const runs = getExecutionLogs(100);
  const totalRuns = runs.length;

  if (totalRuns === 0) {
    return {
      totalRuns: 0,
      overallSuccessRate: "100%",
      avgGroundednessScore: 100,
      domainBreakdown: {},
      learningsCount: getAgentLearnings().length,
      exemplarsCount: getExemplars().length,
      status: "CALIBRATED",
    };
  }

  const domainStats: Record<string, { total: number; passed: number; totalScore: number }> = {};
  let totalScore = 0;
  let passedCount = 0;

  for (const run of runs) {
    const domain = run.domain || "general";
    if (!domainStats[domain]) {
      domainStats[domain] = { total: 0, passed: 0, totalScore: 0 };
    }
    domainStats[domain].total += 1;
    const score = run.evaluation?.score ?? (run.evaluation?.verdict === "PASS" ? 100 : 60);
    domainStats[domain].totalScore += score;
    totalScore += score;

    if (run.evaluation?.verdict === "PASS" || run.evaluation?.grounded) {
      domainStats[domain].passed += 1;
      passedCount += 1;
    }
  }

  const domainBreakdown: Record<string, { runs: number; successRate: string; avgScore: number }> = {};
  for (const [dom, stat] of Object.entries(domainStats)) {
    domainBreakdown[dom] = {
      runs: stat.total,
      successRate: `${((stat.passed / stat.total) * 100).toFixed(1)}%`,
      avgScore: Math.round(stat.totalScore / stat.total),
    };
  }

  return {
    totalRuns,
    overallSuccessRate: `${((passedCount / totalRuns) * 100).toFixed(1)}%`,
    avgGroundednessScore: Math.round(totalScore / totalRuns),
    domainBreakdown,
    learningsCount: getAgentLearnings().length,
    exemplarsCount: getExemplars().length,
    status: "ACTIVE_LEARNING_ENGAGED",
  };
}

/** ─── ACTIVE SELF-CORRECTION REFLECTION ─── */
export function reflectAndLearnFromRun(run: {
  domain: string;
  userPrompt: string;
  toolsCalled: string[];
  evaluation: { score: number; verdict: string; feedback?: string[] };
}) {
  if (run.evaluation.score < 80 || run.evaluation.verdict === "FAIL") {
    const feedbackSummary = run.evaluation.feedback?.join("; ") || "Execution lacked sufficient grounding or tool precision.";
    const lesson = `Query on domain '${run.domain}' ('${run.userPrompt}') had low quality score (${run.evaluation.score}/100). Reason: ${feedbackSummary}`;
    const action = `When encountering queries like '${run.userPrompt.slice(0, 50)}...', always invoke dedicated specialized verification tools before synthesizing the final response.`;
    saveAgentLearning(run.domain, lesson, action);
  }
}
