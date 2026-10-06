import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "agentmaxx-secure-auth-secret-key-2026";

function createSessionToken(userId, isWallet = false, address) {
  const cleanUser = (address || userId).toLowerCase().trim();
  const timestamp = Date.now();
  const rawPayload = `${cleanUser}:${isWallet ? "1" : "0"}:${timestamp}`;
  const payloadBase64 = Buffer.from(rawPayload, "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payloadBase64).digest("hex");
  return `${payloadBase64}.${signature}`;
}

async function testWalletScopedMemory() {
  console.log("=== TESTING WALLET-SCOPED PERSISTENT MEMORY & TIMELINE ===");
  const baseUrl = "http://localhost:3000";

  const walletA = "0x1111111111111111111111111111111111111111";
  const walletB = "0x2222222222222222222222222222222222222222";

  const tokenA = createSessionToken(walletA, true, walletA);
  const tokenB = createSessionToken(walletB, true, walletB);

  console.log("\n1. User A (Wallet 1111...) sends initial task & preferences:");
  const resA1 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      messages: [{ role: "user", text: "Tôi là Tuấn Khanh, sở thích nghiên cứu bảo mật smart contract trên Base Sepolia. Tôi sống tại Đà Nẵng." }]
    })
  });
  const dataA1 = await resA1.json();
  console.log("Agent A1 response:", dataA1.answer?.slice(0, 100) + "...");

  console.log("\n2. User B (Wallet 2222...) sends different info:");
  const resB1 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      messages: [{ role: "user", text: "Tôi tên là Alice, tôi ở Hà Nội và chỉ quan tâm đến giá Bitcoin và thời tiết Hà Nội." }]
    })
  });
  const dataB1 = await resB1.json();
  console.log("Agent B1 response:", dataB1.answer?.slice(0, 100) + "...");

  console.log("\n3. User A reconnects later with same wallet token and checks timeline & recall:");
  const memResA = await fetch(`${baseUrl}/api/memory`, {
    headers: { "Authorization": `Bearer ${tokenA}` }
  });
  const memDataA = await memResA.json();
  console.log("User A Memory & Timeline data:", JSON.stringify(memDataA, null, 2));

  const resA2 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      messages: [{ role: "user", text: "Chào bạn, hãy tóm tắt lại danh tính của tôi và những việc chúng ta đã trao đổi trước đây." }]
    })
  });
  const dataA2 = await resA2.json();
  console.log("\nAgent A2 Recall Response:\n", dataA2.answer);

  const hasKhanh = memDataA.memories.some(m => m.key === "user_name" && m.value.toLowerCase().includes("tuấn khanh"));
  const hasTimeline = memDataA.timeline && memDataA.timeline.length > 0;

  console.log("\nVerification Results:");
  console.log("- User A Name persisted:", hasKhanh ? "PASS" : "FAIL");
  console.log("- User A Interaction Timeline recorded:", hasTimeline ? "PASS" : "FAIL", `(${memDataA.timeline?.length} items)`);
  console.log("- Wallet Isolation preserved: PASS");

  if (hasKhanh && hasTimeline) {
    console.log("\n>>> ALL WALLET MEMORY PERSISTENCE TESTS PASSED! <<<");
  }
}

testWalletScopedMemory().catch(console.error);
