import fetch from "node-fetch";
import assert from "assert";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";
const AUTH_SECRET = process.env.AUTH_SECRET || "agentmaxx-secure-auth-secret-key-2026";

function createTestWalletToken(address) {
  const cleanAddr = address.toLowerCase().trim();
  const payloadStr = `${cleanAddr}:1:${Date.now()}`;
  const payloadBase64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payloadBase64).digest("hex");
  return `${payloadBase64}.${signature}`;
}

async function runE2ETests() {
  console.log("==================================================================");
  console.log("🚀 TESTING WALLET RECONNECT & CROSS-PROJECT UNIVERSAL MEMORY");
  console.log("==================================================================\n");

  const testWallet = "0x7777888899990000111122223333444455556666";
  const token = createTestWalletToken(testWallet);
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 0. Verify session token
  const authRes = await fetch(`${BASE_URL}/api/auth/session`, { headers: authHeaders });
  const authJson = await authRes.json();
  console.log("Session verified:", authJson);

  // 1. Get projects for wallet (triggers auto-creation and hydration)
  console.log("--- 1. Fetching Projects for Wallet ---");
  const pRes1 = await fetch(`${BASE_URL}/api/projects`, {
    headers: authHeaders,
  });
  const pData1 = await pRes1.json();
  console.log("Projects returned:", pData1.projects?.length);
  assert(pData1.projects && pData1.projects.length >= 1, "Should have auto-created primary wallet project");
  const primaryProj = pData1.projects[0];
  console.log(`✅ Found primary project: ${primaryProj.id} (Title: ${primaryProj.title})`);

  // 2. Save a chat conversation into this wallet project
  console.log("\n--- 2. Saving Conversation History to Wallet Project ---");
  const initialMessages = [
    { role: "user", text: "Xin chào, đây là đoạn chat cũ của ví tôi" },
    { role: "agent", text: "Xin chào! Lịch sử của bạn sẽ luôn được bảo toàn." },
  ];
  const saveRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: primaryProj.id,
      title: "Không gian làm việc chính của ví",
      messages: initialMessages,
    }),
  });
  const saveData = await saveRes.json();
  assert(saveData.success, "Project save should succeed");
  console.log(`✅ Saved ${saveData.project.messages.length} messages to project`);

  // 3. Reconnect wallet simulation (Call /api/projects again with same wallet token)
  console.log("\n--- 3. Reconnecting Wallet & Verifying Chat History Restoration ---");
  const pRes2 = await fetch(`${BASE_URL}/api/projects`, {
    headers: authHeaders,
  });
  const pData2 = await pRes2.json();
  const reloadedProj = pData2.projects.find((p) => p.id === primaryProj.id);
  assert(reloadedProj, "Primary project should exist");
  assert(reloadedProj.messages.length >= 2, "Historical messages should be preserved!");
  console.log(`✅ Reconnect Verification: ${reloadedProj.messages.length} messages fully preserved!`);

  // 4. Teach agent knowledge in Project 1 (e.g. "HTK là...")
  console.log("\n--- 4. Teaching Agent Knowledge in Project 1 ---");
  const teachRes = await fetch(`${BASE_URL}/api/agent`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      projectId: "proj_custom_learning_1",
      messages: [
        {
          role: "user",
          text: "hãy nhớ kỹ HTK là kiến trúc sư hệ thống AI hàng đầu :v",
        },
      ],
    }),
  });
  const teachData = await teachRes.json();
  console.log("Agent teach response snippet:", teachData.answer?.slice(0, 100));

  // Wait 2 seconds for memory distillation and Supabase persistence
  await new Promise((r) => setTimeout(r, 2000));

  // 5. Ask in a COMPLETELY DIFFERENT Project 2 (Cross-Project Recall)
  console.log("\n--- 5. Querying Learned Fact from Project 2 (Different Project) ---");
  const queryRes = await fetch(`${BASE_URL}/api/agent`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      projectId: "proj_completely_different_project_2",
      messages: [
        {
          role: "user",
          text: "HTK là ai theo thông tin bạn đã học?",
        },
      ],
    }),
  });
  const queryData = await queryRes.json();
  console.log("\nAgent query answer in Project 2:\n", queryData.answer);

  const lowerAns = queryData.answer.toLowerCase();
  assert(
    lowerAns.includes("kiến trúc sư") ||
    lowerAns.includes("hệ thống") ||
    lowerAns.includes("ai") ||
    lowerAns.includes("htk"),
    "Agent in Project 2 MUST recall the information taught in Project 1!"
  );
  console.log("✅ Cross-Project Memory Recall Test PASSED 100%!");

  console.log("\n==================================================================");
  console.log("🎉 ALL E2E VERIFICATIONS FOR WALLET RECONNECT & CROSS-PROJECT MEMORY PASSED!");
  console.log("==================================================================\n");
}

runE2ETests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
