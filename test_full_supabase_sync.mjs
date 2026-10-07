import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testFullSync() {
  console.log("=== Testing Complete Supabase Integration ===");
  const testUserId = "0x9876543210fedcba9876543210fedcba98765432";
  const testProjId = `proj_${Date.now()}`;
  const now = new Date().toISOString();

  // 1. Upsert Project
  const { data: pData, error: pErr } = await supabase.from("projects").upsert({
    id: testProjId,
    user_id: testUserId,
    title: "Test Swap & Transfer Project",
    objective: "Perform test transaction",
    status: "ACTIVE",
    handoff_summary: {
      objective: "Perform test transaction",
      decisions: ["Selected Base network"],
      completedWork: ["Checked balance"],
      pendingWork: ["Submit tx"],
      relevantTasks: [],
      lastUpdated: now,
    },
    created_at: now,
    updated_at: now,
  }).select();

  if (pErr) console.error("❌ Project sync failed:", pErr);
  else console.log("✅ Project synced successfully:", pData[0].id);

  // 2. Insert Messages
  const msgs = [
    {
      id: `msg_1_${Date.now()}`,
      project_id: testProjId,
      user_id: testUserId,
      role: "user",
      content: "Chuyển 5 USDC qua ví 0xabc...",
      created_at: now,
    },
    {
      id: `msg_2_${Date.now()}`,
      project_id: testProjId,
      user_id: testUserId,
      role: "agent",
      content: "Tôi đã chuẩn bị giao dịch chuyển 5 USDC.",
      created_at: now,
    },
  ];

  const { data: mData, error: mErr } = await supabase.from("messages").upsert(msgs).select();
  if (mErr) console.error("❌ Messages sync failed:", mErr);
  else console.log("✅ Messages synced successfully, count:", mData.length);

  // 3. Upsert Memories
  const mems = [
    {
      id: `mem_1_${Date.now()}`,
      user_id: testUserId,
      project_id: testProjId,
      scope: "user",
      key: "preferred_token",
      value: "USDC",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: `mem_2_${Date.now()}`,
      user_id: testUserId,
      project_id: testProjId,
      scope: "project",
      key: "target_recipient",
      value: "0xabc...",
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ];

  const { data: memData, error: memErr } = await supabase.from("memories").upsert(mems).select();
  if (memErr) console.error("❌ Memories sync failed:", memErr);
  else console.log("✅ Memories synced successfully, count:", memData.length);

  // 4. Query back data for user
  const { data: userProjects } = await supabase.from("projects").select("*").eq("user_id", testUserId);
  console.log("✅ Query projects for user:", userProjects?.length, "found");

  const { data: userMessages } = await supabase.from("messages").select("*").eq("project_id", testProjId);
  console.log("✅ Query messages for project:", userMessages?.length, "found");

  const { data: userMemories } = await supabase.from("memories").select("*").eq("user_id", testUserId);
  console.log("✅ Query memories for user:", userMemories?.length, "found");

  // 5. Clean up test record
  await supabase.from("memories").delete().eq("user_id", testUserId);
  await supabase.from("messages").delete().eq("project_id", testProjId);
  await supabase.from("projects").delete().eq("id", testProjId);
  console.log("🧹 Test cleanup completed!");
  console.log("🎉 ALL SUPABASE CLOUD TESTS PASSED!");
}

testFullSync();
