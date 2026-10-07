import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testGlobalMemory() {
  console.log("=== Testing Global Cross-User Memory in Supabase ===");
  const testGlobal = {
    id: `global_test_${Date.now()}`,
    user_id: "system_global",
    project_id: null,
    scope: "global",
    key: "rise_in_info",
    value: "Rise In là nền tảng giáo dục Web3 & AI Agent hàng đầu, hỗ trợ developer xây dựng ứng dụng trên Base L2.",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("memories").upsert(testGlobal).select();
  if (error) console.error("❌ Global memory upsert failed:", error);
  else console.log("✅ Global memory upsert successful:", data);

  // Retrieve global memories
  const { data: globalList } = await supabase.from("memories").select("*").eq("scope", "global").eq("status", "active");
  console.log("Found global items count:", globalList?.length);

  // Cleanup test
  await supabase.from("memories").delete().eq("id", testGlobal.id);
  console.log("Cleanup done.");
}

testGlobalMemory();
