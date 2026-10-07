import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkRecentData() {
  console.log("=== CHECKING RECENT SUPABASE DATA ===");
  const { data: pList } = await supabase.from("projects").select("*").order("updated_at", { ascending: false }).limit(10);
  console.log("📁 projects table (total:", pList?.length, "):");
  console.table(pList?.map(p => ({ id: p.id, user_id: p.user_id, title: p.title?.slice(0, 30), updated_at: p.updated_at })));

  const { data: mList } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(10);
  console.log("\n💬 messages table (total:", mList?.length, "):");
  console.table(mList?.map(m => ({ id: m.id, project_id: m.project_id, user_id: m.user_id, role: m.role, content: m.content?.slice(0, 35) })));

  const { data: memList } = await supabase.from("memories").select("*").order("created_at", { ascending: false }).limit(10);
  console.log("\n🧠 memories table (total:", memList?.length, "):");
  console.table(memList?.map(mem => ({ id: mem.id, user_id: mem.user_id, scope: mem.scope, key: mem.key, value: mem.value?.slice(0, 35) })));
}

checkRecentData();
