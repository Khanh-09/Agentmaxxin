import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function probeColumns() {
  const candidateProjCols = ["id", "user_id", "userId", "title", "objective", "status", "domain", "summary", "handoff_summary", "handoffSummary", "created_at", "createdAt", "updated_at", "updatedAt"];
  for (const col of candidateProjCols) {
    const { error } = await supabase.from("projects").select(col).limit(1);
    console.log(`projects.${col}:`, error ? `❌ (${error.message})` : "✅");
  }

  console.log("---");
  const candidateMsgCols = ["id", "project_id", "projectId", "user_id", "userId", "role", "text", "content", "task_id", "taskId", "created_at", "createdAt", "memories_used", "memoriesUsed", "steps", "error"];
  for (const col of candidateMsgCols) {
    const { error } = await supabase.from("messages").select(col).limit(1);
    console.log(`messages.${col}:`, error ? `❌ (${error.message})` : "✅");
  }

  console.log("---");
  const candidateMemCols = ["id", "user_id", "userId", "project_id", "projectId", "scope", "key", "value", "status", "previous_version_id", "provenance", "embedding", "created_at", "updated_at"];
  for (const col of candidateMemCols) {
    const { error } = await supabase.from("memories").select(col).limit(1);
    console.log(`memories.${col}:`, error ? `❌ (${error.message})` : "✅");
  }
}

probeColumns();
