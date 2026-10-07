import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectColumns() {
  console.log("=== Inspecting Supabase Tables ===");
  
  // Try empty select with * to see keys or error details
  const { data: pData, error: pErr } = await supabase.from("projects").select("*").limit(0);
  console.log("Projects table check:", { pData, pErr });

  const { data: mData, error: mErr } = await supabase.from("messages").select("*").limit(0);
  console.log("Messages table check:", { mData, mErr });

  const { data: memData, error: memErr } = await supabase.from("memories").select("*").limit(0);
  console.log("Memories table check:", { memData, memErr });
}

inspectColumns();
