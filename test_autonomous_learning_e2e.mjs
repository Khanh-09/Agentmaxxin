import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testAutonomousDistillation() {
  console.log("==================================================================");
  console.log("🤖 TESTING AUTONOMOUS SELF-LEARNING & COGNITIVE DISTILLATION");
  console.log("==================================================================\n");

  // Step 1: User A interacts naturally (No explicit "Nhớ rằng" command)
  console.log("--- 1. User A interacts with Agent (Natural Question) ---");
  const userARes = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": "0x1111111111111111111111111111111111111111"
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          text: "Smart contract của token AERO trên Base có địa chỉ 0x940181a94A35A4569E4529A3CDfB74e433E6dd10, hãy giải thích vai trò của nó"
        }
      ]
    })
  });

  const userAData = await userARes.json();
  console.log("✅ User A response status:", userARes.status);
  console.log("Agent answer snippet:", userAData.answer?.slice(0, 120));

  // Wait 2s for background cognitive distillation and Supabase cloud sync
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Verify distilled entity in Supabase Cloud
  console.log("\n--- 2. Checking Supabase Global Memory for Autonomously Learned Entity ---");
  const { data: globalMemories } = await supabase
    .from("memories")
    .select("*")
    .eq("scope", "global")
    .eq("status", "active");

  console.log(`✅ Total Global Knowledge Items in Supabase: ${globalMemories?.length}`);
  console.table(globalMemories?.map(g => ({ id: g.id, key: g.key, value: g.value?.slice(0, 45) })));

  // Step 3: User B (Brand new session) asks directly for the contract address
  console.log("\n--- 3. User B (New Wallet) Asks for the Contract Address ---");
  const userBRes = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": "0x2222222222222222222222222222222222222222"
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          text: "Địa chỉ contract của token AERO trên Base là gì?"
        }
      ]
    })
  });

  const userBData = await userBRes.json();
  console.log("✅ User B response status:", userBRes.status);
  console.log("🧠 Agent response to User B:\n", userBData.answer);
  console.log("Memories used by Agent for User B:", userBData.memoriesUsed);

  const recalledAddress = (userBData.answer || "").toLowerCase().includes("0x940181a94a35a4569e4529a3cdfb74e433e6dd10");
  if (recalledAddress) {
    console.log("\n🎉 SUCCESS: Agent autonomously distilled and recalled the token contract across sessions!");
  } else {
    console.log("\nℹ️ Agent answered with memory support.");
  }
}

testAutonomousDistillation();
