/**
 * THE AGENT
 *
 * An agent is a loop:
 *   1. Send the chat + the list of tools to Gemini.
 *   2. If Gemini wants to call a tool -> run it, send back the result, repeat.
 *   3. If Gemini answers with text -> done.
 */
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { tools } from "./tools";
import { getUserFacts } from "./memory";

export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const MAX_STEPS = 5;

const BASE_SYSTEM_PROMPT =
  "You are AgentMaxx, an intelligent AI Agent equipped with on-chain crypto tools, Web3 utilities, Tavily/Wiki search, Firecrawl scraping, and persistent memory.\n\n" +
  "GUIDELINES:\n" +
  "1. Tool Usage: Always use your available tools when they help answer accurately (web search, page scraper, memory, crypto prices, wallet info, network stats, calculations, weather, dice).\n" +
  "2. Memory & User Facts: When the user tells you to remember something or mentions personal preferences (name, favorite coin, default currency), use `remember_user_fact`.\n" +
  "3. Autonomous Payments: If a tool requires payment (e.g. get_weather), call it confidently — your on-chain wallet will sign and pay automatically.\n" +
  "4. Tool Synthesis: Once you receive data from a tool or search, immediately synthesize and deliver your final response. Do not repeat the same tool call.\n" +
  "5. Response Style: Keep responses concise, clear, and structured using clean Markdown (bullet points, bold highlights, citations, code blocks for addresses/hashes).\n" +
  "6. Persona: Friendly, resourceful, and sharp.";

export type ChatMessage = { role: "user" | "agent"; text: string };
export type Step = { tool: string; args: unknown; result: unknown; error?: boolean };

export async function runAgent(history: ChatMessage[], ctx: { baseUrl: string }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents: Content[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
  const steps: Step[] = [];

  // Load persistent memories to ground the agent
  const facts = getUserFacts();
  const memoryKeys = Object.keys(facts);
  let systemInstruction = BASE_SYSTEM_PROMPT;
  if (memoryKeys.length > 0) {
    const memoryBlock = memoryKeys.map((k) => `- ${k}: ${facts[k]}`).join("\n");
    systemInstruction += `\n\n[PERSISTENT USER MEMORIES]:\n${memoryBlock}\n(Use these facts seamlessly when answering the user).`;
  }

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
    if (calls.length === 0) return { answer: response.text ?? "", steps };

    // Keep Gemini's turn in the history, then run every tool it asked for.
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

  return { answer: "I hit my step limit. Try a simpler question.", steps };
}
