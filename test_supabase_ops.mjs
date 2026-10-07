import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testOperations() {
  console.log("=== Testing Supabase Operations ===");
  
  // 1. Test Project insert/select/delete
  const testProj = {
    id: "test_proj_123",
    user_id: "0x1234567890abcdef1234567890abcdef12345678",
    title: "Test Cloud Project",
    objective: "Verify Supabase Integration",
    status: "ACTIVE",
    domain: "web3",
    summary: "Cloud sync test project",
    updated_at: new Date().toISOString()
  };

  const { data: pData, error: pErr } = await supabase.from("projects").upsert(testProj).select();
  if (pErr) {
    console.log("❌ Project upsert error:", pErr.message);
  } else {
    console.log("✅ Project upsert success:", pData);
  }

  // 2. Test Message insert/select
  const testMsg = {
    id: "test_msg_123",
    project_id: "test_proj_123",
    user_id: "0x1234567890abcdef1234567890abcdef12345678",
    role: "user",
    text: "Hello Supabase",
    content: "Hello Supabase",
    created_at: new Date().toISOString()
  };

  const { data: mData, error: mErr } = await supabase.from("messages").upsert(testMsg).select();
  if (mErr) {
    console.log("❌ Message upsert error:", mErr.message);
  } else {
    console.log("✅ Message upsert success:", mData);
  }

  // 3. Test Memory insert/select
  const testMem = {
    id: "test_mem_123",
    user_id: "0x1234567890abcdef1234567890abcdef12345678",
    project_id: "test_proj_123",
    scope: "user",
    key: "preferred_chain",
    value: "Base",
    status: "active",
    updated_at: new Date().toISOString()
  };

  const { data: memData, error: memErr } = await supabase.from("memories").upsert(testMem).select();
  if (memErr) {
    console.log("❌ Memory upsert error:", memErr.message);
  } else {
    console.log("✅ Memory upsert success:", memData);
  }

  // Clean up test data
  console.log("Cleaning up test data...");
  await supabase.from("memories").delete().eq("id", "test_mem_123");
  await supabase.from("messages").delete().eq("id", "test_msg_123");
  await supabase.from("projects").delete().eq("id", "test_proj_123");
  console.log("✅ Cleanup complete!");
}

testOperations();
