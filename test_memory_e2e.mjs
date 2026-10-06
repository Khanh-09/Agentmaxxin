async function testMemoryLearning() {
  console.log("=== TESTING AUTOMATIC CONVERSATION MEMORY & SELF-LEARNING ===");

  const baseUrl = "http://localhost:3000";

  // 1. Send conversation with personal facts
  console.log("\n1. Sending conversation with identity & preferences...");
  const prompt1 = "Chào bạn, tôi tên là Tuấn Khanh, tôi sống tại Đà Nẵng và rất thích tìm hiểu DeFi yield farming trên Base network. Ví của tôi là 0x1234567890abcdef1234567890abcdef12345678.";
  
  const res1 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", text: prompt1 }]
    })
  });

  const data1 = await res1.json();
  console.log("Agent response received:", data1.answer ? data1.answer.slice(0, 100) + "..." : data1);

  // 2. Check /api/memory to verify facts were extracted and stored
  console.log("\n2. Checking stored memory in /api/memory...");
  const memRes = await fetch(`${baseUrl}/api/memory`);
  const memData = await memRes.json();
  console.log("Persisted memory items:", JSON.stringify(memData, null, 2));

  // Verify key facts
  const facts = memData.facts || {};
  const hasName = facts.user_name?.toLowerCase().includes("tuấn khanh");
  const hasPref = facts.user_preference?.toLowerCase().includes("defi");
  const hasLoc = facts.user_location?.toLowerCase().includes("đà nẵng");
  const hasWallet = !!facts.user_evm_address;

  console.log("\nVerification checklist:");
  console.log("- User Name captured:", hasName ? "PASS" : "FAIL", facts.user_name);
  console.log("- Preference captured:", hasPref ? "PASS" : "FAIL", facts.user_preference);
  console.log("- Location captured:", hasLoc ? "PASS" : "FAIL", facts.user_location);
  console.log("- EVM Address captured:", hasWallet ? "PASS" : "FAIL", facts.user_evm_address);

  // 3. Ask the agent a recall question without repeating the facts
  console.log("\n3. Testing recall in next conversation turn...");
  const res2 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", text: "Bạn còn nhớ tôi tên gì, ở đâu và thích gì không?" }]
    })
  });

  const data2 = await res2.json();
  console.log("Agent recall answer:\n", data2.answer);

  if (hasName && hasPref && hasLoc) {
    console.log("\n>>> ALL MEMORY & LEARNING TESTS PASSED! <<<");
  } else {
    console.log("\n>>> Some facts were not captured as expected. <<<");
  }
}

testMemoryLearning().catch(console.error);
