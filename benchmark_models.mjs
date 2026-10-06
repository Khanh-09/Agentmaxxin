import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("API Key present:", Boolean(apiKey));
  const ai = new GoogleGenAI({ apiKey });
  const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.0-flash"];
  for (const m of models) {
    const t0 = Date.now();
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: [{ role: "user", parts: [{ text: "Hello, reply with 1 short sentence." }] }],
      });
      console.log(`Model: ${m} -> ${Date.now() - t0}ms | Response: ${res.text?.trim()}`);
    } catch (err) {
      console.log(`Model: ${m} -> FAILED (${Date.now() - t0}ms): ${err.message}`);
    }
  }
}

main();
