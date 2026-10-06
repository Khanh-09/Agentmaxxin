import { Step } from "./agent";

export type EvaluationResult = {
  score: number; // 0 - 100
  verdict: "PASS" | "NEEDS_REVISION";
  grounded: boolean;
  toolExecutionSuccess: boolean;
  feedback: string[];
};

export function evaluateResponse(
  userQuery: string,
  answer: string,
  steps: Step[],
  domain: string
): EvaluationResult {
  const feedback: string[] = [];
  let score = 100;

  // 1. Tool execution check
  const hasErrors = steps.some((s) => s.error);
  if (hasErrors) {
    score -= 30;
    feedback.push("One or more tool calls encountered execution errors.");
  }

  // 2. Step limit check
  if (answer.includes("hit my step limit") || answer.trim().length === 0) {
    score -= 50;
    feedback.push("Response exceeded maximum step limit or returned empty text.");
  }

  // 3. Domain-specific grounding criteria
  if (domain === "analytics") {
    const hasMathTool = steps.some((s) => s.tool === "calculate");
    if (!hasMathTool && (userQuery.includes("tính") || userQuery.includes("%"))) {
      score -= 20;
      feedback.push("Quantitative question answered without invoking `calculate` tool.");
    }
  }

  if (domain === "research") {
    const hasSearchOrScraper = steps.some(
      (s) => s.tool === "extract_web_page" || s.tool === "get_web_search"
    );
    if (!hasSearchOrScraper && userQuery.includes("http")) {
      score -= 25;
      feedback.push("URL provided but `extract_web_page` was not executed.");
    }
  }

  if (domain === "creative") {
    const hasCreativeTool = steps.some((s) => s.tool === "generate_creative_brief");
    if (!hasCreativeTool && userQuery.toLowerCase().includes("brief")) {
      feedback.push("Creative brief generated without `generate_creative_brief` tool template.");
    }
  }

  const finalScore = Math.max(0, score);
  const verdict: "PASS" | "NEEDS_REVISION" = finalScore >= 70 ? "PASS" : "NEEDS_REVISION";

  return {
    score: finalScore,
    verdict,
    grounded: finalScore >= 70 && !hasErrors,
    toolExecutionSuccess: !hasErrors,
    feedback: feedback.length > 0 ? feedback : ["Output passed all groundedness checks."],
  };
}
