import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testCrossUserLearning() {
  console.log("==================================================================");
  console.log("🚀 TESTING CROSS-USER CONTINUOUS LEARNING & GLOBAL KNOWLEDGE BASE");
  console.log("==================================================================\n");

  // Step 1: User A teaches the Agent a brand new knowledge fact
  console.log("--- 1. USER A (0xAAAA...) Teaches Agent New Collective Knowledge ---");
  const userARes = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          text: "Kiến thức chung: AgentMaxx Pro sử dụng mô hình hybrid execution kết hợp Supabase Cloud và Base Sepolia L2."
        }
      ]
    })
  });

  const userAData = await userARes.json();
  console.log("✅ User A interaction status:", userARes.status);
  console.log("Agent response to User A:", userAData.answer?.slice(0, 100));

  // Wait 1.5s for async background Supabase sync
  await new Promise(r => setTimeout(r, 1500));

  // Step 2: Check Supabase Cloud memories table for global scope item
  console.log("\n--- 2. Verifying Global Knowledge in Supabase Cloud ---");
  const { data: globalItems, error } = await supabase
    .from("memories")
    .select("*")
    .eq("scope", "global")
    .eq("status", "active");

  if (error) {
    console.error("❌ Supabase query error:", error);
  } else {
    console.log("✅ Supabase Global items found count:", globalItems?.length);
    console.table(globalItems?.map(g => ({ id: g.id, scope: g.scope, key: g.key, value: g.value?.slice(0, 40) })));
  }

  // Step 3: User B (Completely different user / wallet with 0 prior history) asks about the knowledge
  console.log("\n--- 3. USER B (0xBBBB... - Brand New User) Asks about the Taught Knowledge ---");
  const userBRes = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          text: "AgentMaxx Pro sử dụng mô hình execution gì và kết hợp những công nghệ nào?"
        }
      ]
    })
  });

  const userBData = await userBRes.json();
  console.log("✅ User B interaction status:", userBRes.status);
  console.log("🧠 Agent response to User B:\n", userBData.answer);
  console.log("Memories used by Agent for User B:", userBData.memoriesUsed);

  const answerLower = (userBData.answer || "").toLowerCase();
  const hasLearnedFact =
    answerLower.includes("hybrid") ||
    answerLower.includes("supabase") ||
    answerLower.includes("base sepolia");

  if (hasLearnedFact) {
    console.log("\n🎉 SUCCESS: Agent retained and recalled knowledge learned from User A to answer User B!");
  } else {
    console.log("\n⚠️ Agent answered, checking recall accuracy...");
  }
}

testCrossUserLearning();
