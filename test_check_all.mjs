import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkAll() {
  console.log("=== CHECKING ALL SUPABASE TABLES CURRENT STATE ===");
  const { data: pList } = await supabase.from("projects").select("*");
  console.log("📁 projects table (total rows:", pList?.length, "):");
  console.table(pList?.map(p => ({ id: p.id, user_id: p.user_id, title: p.title?.slice(0, 30), status: p.status })));

  const { data: mList } = await supabase.from("messages").select("*");
  console.log("\n💬 messages table (total rows:", mList?.length, "):");
  console.table(mList?.map(m => ({ id: m.id, project_id: m.project_id, role: m.role, content: m.content?.slice(0, 30) })));

  const { data: memList } = await supabase.from("memories").select("*");
  console.log("\n🧠 memories table (total rows:", memList?.length, "):");
  console.table(memList?.map(mem => ({ id: mem.id, key: mem.key, value: mem.value?.slice(0, 30), status: mem.status })));
}

checkAll();
