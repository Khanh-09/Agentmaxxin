import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

async function testSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log("Connecting to Supabase URL:", url);
  console.log("Using API Key:", key ? `${key.slice(0, 15)}...` : "NONE");

  const supabase = createClient(url, key);

  for (const table of ["projects", "messages", "memories"]) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        console.log(`⚠️ Table '${table}':`, error.message);
      } else {
        console.log(`✅ SUCCESS: Table '${table}' is ready! Rows found:`, data?.length);
      }
    } catch (err) {
      console.error(`❌ Table '${table}' check error:`, err);
    }
  }
}

testSupabase();
