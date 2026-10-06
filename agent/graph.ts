/**
 * LANGGRAPH-STYLE AGENT STATE ORCHESTRATOR
 *
 * Implements a 4-stage StateGraph execution pipeline:
 * [1. Route] -> [2. Execute Tools & LLM] -> [3. Evaluate Groundedness] -> [4. Log Run]
 */
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { tools } from "./tools";
import { getUserFacts } from "./memory";
import { routeRequest, type RouteDecision } from "./router";
import { evaluateResponse, type EvaluationResult } from "./evaluate";
import { logExecution } from "./logger";
import { queryKnowledgeBase, getAgentLearnings } from "./knowledge";
import { getRelevantExemplars, recordHighRewardExemplar, reflectAndLearnFromRun } from "./training";

export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const MAX_STEPS = 5;

export type ChatMessage = { role: "user" | "agent"; text: string };
export type Step = { tool: string; args: unknown; result: unknown; error?: boolean };

export type GraphState = {
  history: ChatMessage[];
  route: RouteDecision;
  steps: Step[];
  answer: string;
  evaluation?: EvaluationResult;
  runId?: string;
};

export async function runGraph(
  history: ChatMessage[],
  ctx: { baseUrl: string }
): Promise<{
  answer: string;
  steps: Step[];
  domain: string;
  evaluation: EvaluationResult;
  runId: string;
}> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === "user")?.text || "";

  // ─── STAGE 1: ROUTE NODE ───
  const route = routeRequest(lastUserMsg);

  // ─── STAGE 1.5: RETRIEVE KNOWLEDGE & IN-CONTEXT EXEMPLARS (DSPy & RAG Pattern) ───
  const relevantKnowledge = queryKnowledgeBase(lastUserMsg, route.domain, 2);
  const fewShotExemplars = getRelevantExemplars(lastUserMsg, route.domain, 2);
  const learnings = getAgentLearnings().slice(0, 3);

  // ─── STAGE 2: EXECUTE NODE (Gemini Function Calling Loop) ───
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents: Content[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
  const steps: Step[] = [];

  // Ground with persistent memories
  const facts = getUserFacts();
  const memoryKeys = Object.keys(facts);
  let systemInstruction = `You are AgentMaxx Pro, an autonomous multi-domain AI Agent expert in Web3, Finance, Coding, Science, and Creative Architecture.\n${route.systemInstructionAddendum}`;

  if (memoryKeys.length > 0) {
    const memoryBlock = memoryKeys.map((k) => `- ${k}: ${facts[k]}`).join("\n");
    systemInstruction += `\n\n[PERSISTENT USER PROFILE & MEMORIES]:\n${memoryBlock}`;
  }

  if (relevantKnowledge.length > 0) {
    const kbBlock = relevantKnowledge.map((k) => `[Topic: ${k.title}]\n${k.content}`).join("\n\n");
    systemInstruction += `\n\n[RETRIEVED DOMAIN KNOWLEDGE BASE]:\n${kbBlock}`;
  }

  if (fewShotExemplars.length > 0) {
    const exBlock = fewShotExemplars
      .map((e) => `User: "${e.userPrompt}"\nTools: [${e.toolsCalled.join(", ")}]\nReasoning: ${e.reasoningSnippet}`)
      .join("\n\n");
    systemInstruction += `\n\n[FEW-SHOT HIGH-REWARD DEMONSTRATIONS]:\n${exBlock}`;
  }

  if (learnings.length > 0) {
    const learnBlock = learnings.map((l) => `- Action Rule: ${l.recommendedAction}`).join("\n");
    systemInstruction += `\n\n[ACTIVE LEARNING REFLECTION RULES]:\n${learnBlock}`;
  }


  let finalAnswer = "";

  for (let i = 0; i < MAX_STEPS; i++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: tools.map((t) => ({
              name: t.name,
              description: t.description,
              parametersJsonSchema: t.parameters,
            })),
          },
        ],
      },
    });

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) {
      finalAnswer = response.text ?? "";
      break;
    }

    contents.push(response.candidates![0].content!);
    const results: Part[] = [];

    for (const call of calls) {
      const tool = tools.find((t) => t.name === call.name);
      let result: unknown;
      let error = false;
      try {
        if (!tool) throw new Error(`No tool named ${call.name}`);
        result = await tool.run(call.args ?? {}, ctx);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
        error = true;
      }
      steps.push({ tool: call.name!, args: call.args, result, error });
      results.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }

    contents.push({ role: "user", parts: results });
  }

  if (!finalAnswer) {
    finalAnswer = "Execution completed. Please let me know if you need more details!";
  }

  // ─── STAGE 3: EVALUATE NODE (Groundedness & Criteria Scoring) ───
  const evaluation = evaluateResponse(lastUserMsg, finalAnswer, steps, route.domain);

  // ─── STAGE 3.5: ACTIVE LEARNING & IN-CONTEXT ADAPTATION ───
  if (evaluation.verdict === "PASS" && evaluation.score >= 90 && steps.length > 0) {
    recordHighRewardExemplar(
      route.domain,
      lastUserMsg,
      steps.map((s) => s.tool),
      finalAnswer.slice(0, 150),
      evaluation.score
    );
  } else if (evaluation.verdict === "FAIL" || evaluation.score < 80) {
    reflectAndLearnFromRun({
      domain: route.domain,
      userPrompt: lastUserMsg,
      toolsCalled: steps.map((s) => s.tool),
      evaluation,
    });
  }

  // ─── STAGE 4: LOG NODE (Persistent Run Record) ───
  const runId = logExecution(lastUserMsg, route.domain, steps, finalAnswer, evaluation);

  return {
    answer: finalAnswer,
    steps,
    domain: route.domain,
    evaluation,
    runId,
  };
}

