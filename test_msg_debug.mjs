import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testMsgInsert() {
  const msgRow = {
    id: `msg_${Date.now()}`,
    project_id: "proj_live_demo_1",
    user_id: "guest_default",
    role: "user",
    content: "Test single message",
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("messages").upsert([msgRow]).select();
  console.log("Upsert result:", { data, error });
}

testMsgInsert();
