// @ts-check
const BASE_URL = "http://localhost:3000";

async function testAgentPrepareTransfer() {
  console.log("Testing Agent calling prepare_transfer tool through async task system...");

  // 1. Init session
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const session = await sessionRes.json();
  console.log("User session created:", session.userId);

  // 2. Post task to agent
  const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      objective: "Hãy chuẩn bị giao dịch chuyển 0.0001 ETH tới ví 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 trên Base Sepolia",
      messages: [
        {
          role: "user",
          text: "Hãy chuẩn bị giao dịch chuyển 0.0001 ETH tới ví 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 trên Base Sepolia",
        },
      ],
    }),
  });
  const taskJson = await taskRes.json();
  console.log("Task dispatched:", taskJson.taskId);

  // 3. Poll task until complete
  let finished = false;
  let attempts = 0;
  while (!finished && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
    const pollRes = await fetch(`${BASE_URL}/api/tasks/${taskJson.taskId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const pollJson = await pollRes.json();
    const t = pollJson.task;
    console.log(`[Attempt ${attempts}] Task status: ${t.status}`);

    if (t.status === "succeeded" || t.status === "failed") {
      finished = true;
      console.log("\nTask final result:");
      console.log(t.result);
      console.log("\nTools used in execution:");
      console.log(JSON.stringify(t.toolSteps, null, 2));

      // 4. Verify that proposal was recorded in proposals list
      const propsRes = await fetch(`${BASE_URL}/api/proposals`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const propsJson = await propsRes.json();
      console.log("\nActive proposals in state:", propsJson.proposals?.length);
      console.log(JSON.stringify(propsJson.proposals?.[0], null, 2));
    }
  }
}

testAgentPrepareTransfer().catch(console.error);
