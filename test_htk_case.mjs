import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testUserHTKCase() {
  console.log("=== Testing User Screenshot Input Case ===");
  const testWallet = "0xca001234567890abcdef1234567890abcde5b5";

  const res = await fetch("http://localhost:3000/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": testWallet
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          text: "Vậy tôi chỉ bạn nhé, hãy nhớ kỹ htk là một người con gái xinh đẹp :v"
        }
      ]
    })
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Agent response:", data.answer?.slice(0, 100));

  // Wait 1.5s for async background sync
  await new Promise(r => setTimeout(r, 1500));

  // Query Supabase memories table for htk
  console.log("\n=== Checking Supabase Memories ===");
  const { data: memList } = await supabase
    .from("memories")
    .select("*")
    .ilike("key", "%htk%")
    .limit(5);

  console.log("Found memories in Supabase matching 'htk':", memList?.length);
  console.table(memList?.map(m => ({ id: m.id, user_id: m.user_id, scope: m.scope, key: m.key, value: m.value })));
}

testUserHTKCase();
