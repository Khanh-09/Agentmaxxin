import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testLiveChatAndMemory() {
  console.log("=== 1. Simulating UI Chat to Agent API ===");
  const res = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: "proj_live_demo_1",
      messages: [
        { role: "user", text: "Nhớ rằng tôi thích mạng Base Sepolia và token USDC nhé" }
      ]
    })
  });

  const data = await res.json();
  console.log("Agent response status:", res.status);
  console.log("Agent answer preview:", data.answer?.slice(0, 100));

  // Wait 1.5s for async background Supabase sync to finish
  await new Promise(r => setTimeout(r, 1500));

  console.log("\n=== 2. Checking Supabase Cloud Database Tables ===");
  const { data: pList } = await supabase.from("projects").select("*").limit(5);
  console.log("📊 Projects in Supabase:", pList?.length, pList?.map(p => ({ id: p.id, title: p.title })));

  const { data: mList } = await supabase.from("messages").select("*").limit(5);
  console.log("💬 Messages in Supabase:", mList?.length, mList?.map(m => ({ id: m.id, role: m.role, content: m.content?.slice(0, 40) })));

  const { data: memList } = await supabase.from("memories").select("*").limit(5);
  console.log("🧠 Memories in Supabase:", memList?.length, memList?.map(mem => ({ id: mem.id, key: mem.key, value: mem.value })));
}

testLiveChatAndMemory();
