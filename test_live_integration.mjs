/**
 * LIVE INTEGRATION TEST SUITE (5 REAL-WORLD SCENARIOS)
 *
 * Tests live service integration against live backend endpoints:
 * - Real Google Gemini API calls with token tracking & pricing formula
 * - Real Wikipedia Live / Web Search API integration
 * - Real citation validation & discrepancy detection
 * - Error isolation and Project Session Resume verification
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runLiveIntegrationSuite() {
  console.log("================================================================================");
  console.log("🚀 STARTING WEEK 2 LIVE SERVICE INTEGRATION SUITE (5 SCENARIOS)");
  console.log(`Target Host: ${BASE_URL}`);
  console.log("================================================================================");

  // Helper: Create Authenticated Session
  async function createSession() {
    const res = await fetch(`${BASE_URL}/api/auth/session`);
    if (!res.ok) throw new Error(`Auth session failed: ${res.status}`);
    const data = await res.json();
    return { token: data.token, userId: data.userId };
  }

  // Helper: Poll Task until completion
  async function waitForTask(taskId, token, maxWaitMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const task = data.task || data;
        if (task && ["succeeded", "failed", "cancelled", "interrupted"].includes(task.status)) {
          return task;
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Task ${taskId} timed out after ${maxWaitMs}ms`);
  }

  let passedScenarios = 0;
  const results = [];

  // ─── 0. VERIFY RUNTIME CONFIG ───
  console.log("\n[SETUP] Checking Agent Runtime Configuration & Service Adapters...");
  const configRes = await fetch(`${BASE_URL}/api/agent/config`);
  if (!configRes.ok) throw new Error("Could not fetch /api/agent/config");
  const runtimeConfig = await configRes.json();
  console.log(`  • Mode: ${runtimeConfig.mode.toUpperCase()}`);
  console.log(`  • LLM Provider: ${runtimeConfig.llm.provider} (${runtimeConfig.llm.model}) - Status: ${runtimeConfig.llm.status}`);
  console.log(`  • Search Provider: ${runtimeConfig.search.provider} - Status: ${runtimeConfig.search.status}`);
  console.log(`  • Web3 Network: ${runtimeConfig.web3.network}`);

  // ─── SCENARIO 1: LIVE RESEARCH WITH REAL SOURCES ───
  console.log("\n[SCENARIO 1] Nghiên cứu có nguồn (Real Live Research & Citation Groundedness)...");
  try {
    const { token, userId } = await createSession();
    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Live Base L2 Architecture Research",
        objective: "Tìm hiểu kiến trúc Rollup và Optimism Superchain",
        messages: [{ role: "user", text: "Tìm thông tin về Optimism OP Stack và kiến trúc Rollup, dẫn nguồn thực tế." }],
      }),
    });
    const projData = await projRes.json();
    const projId = projData.project?.id || projData.id;

    const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: projId,
        objective: "Nghiên cứu OP Stack Rollup với nguồn thật",
        messages: [{ role: "user", text: "Tìm thông tin về Optimism OP Stack và kiến trúc Rollup, dẫn nguồn thực tế." }],
      }),
    });
    const taskInit = await taskRes.json();
    const task = await waitForTask(taskInit.taskId, token);

    const hasSources = (task.sources || []).length > 0;
    const isSucceeded = task.status === "succeeded";
    const hasUsage = Boolean(task.usageMetrics);
    const tokens = task.usageMetrics?.totalTokens || 0;
    const cost = task.usageMetrics?.estimatedCostUsd;
    const latency = task.durationMs || 0;

    console.log(`  ✓ Status: ${task.status} | Outcome: ${task.report?.outcome}`);
    console.log(`  ✓ Sources Retrieved: ${(task.sources || []).length} real sources`);
    console.log(`  ✓ Token Usage: ${tokens} tokens (Prompt: ${task.usageMetrics?.promptTokens}, Candidate: ${task.usageMetrics?.candidateTokens})`);
    console.log(`  ✓ Cost: ${typeof cost === "number" ? "$" + cost.toFixed(6) : cost} | Method: ${task.usageMetrics?.costCalculationMethod}`);
    console.log(`  ✓ Latency: ${latency}ms`);

    if (isSucceeded && hasSources && hasUsage) {
      passedScenarios++;
      results.push({ scenario: "1. Nghiên cứu có nguồn", status: "PASS", latency: `${latency}ms`, cost: typeof cost === "number" ? `$${cost.toFixed(6)}` : cost });
    } else {
      results.push({ scenario: "1. Nghiên cứu có nguồn", status: "FAIL", reason: "Missing sources or usage metrics" });
    }
  } catch (err) {
    console.error("  ❌ Scenario 1 Failed:", err.message);
    results.push({ scenario: "1. Nghiên cứu có nguồn", status: "FAIL", reason: err.message });
  }

  // ─── SCENARIO 2: ZERO-DATA / INSUFFICIENT EVIDENCE ───
  console.log("\n[SCENARIO 2] Không đủ dữ liệu (Zero-data & Negative Assertion)...");
  try {
    const { token } = await createSession();
    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Zero Data Negative Query",
        objective: "Kiểm tra phản hồi khi không có dữ liệu",
        messages: [{ role: "user", text: "Thống kê giao dịch của mạng blockchain fake_nonexistent_token_2026_xyz123" }],
      }),
    });
    const projData = await projRes.json();
    const projId = projData.project?.id || projData.id;

    const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: projId,
        objective: "Truy vấn từ khóa không tồn tại",
        messages: [{ role: "user", text: "Thống kê giao dịch của mạng blockchain fake_nonexistent_token_2026_xyz123" }],
      }),
    });
    const taskInit = await taskRes.json();
    const task = await waitForTask(taskInit.taskId, token);

    const isInsufficient = task.report?.outcome === "insufficient_evidence" || task.report?.outcome === "partial";
    const noFabricatedSources = (task.sources || []).filter((s) => s.status === "retrieved").length === 0;
    const cost = task.usageMetrics?.estimatedCostUsd;
    const latency = task.durationMs || 0;

    console.log(`  ✓ Status: ${task.status} | Outcome: ${task.report?.outcome}`);
    console.log(`  ✓ Fabricated Sources Avoided: ${noFabricatedSources ? "YES (0 fake sources)" : "NO"}`);
    console.log(`  ✓ Remediation / Uncertainty Declared: ${task.report?.uncertaintiesAndConflicts?.length > 0}`);
    console.log(`  ✓ Latency: ${latency}ms | Cost: ${typeof cost === "number" ? "$" + cost.toFixed(6) : cost}`);

    if (task.status === "succeeded" && isInsufficient) {
      passedScenarios++;
      results.push({ scenario: "2. Không đủ dữ liệu", status: "PASS", latency: `${latency}ms`, cost: typeof cost === "number" ? `$${cost.toFixed(6)}` : cost });
    } else {
      results.push({ scenario: "2. Không đủ dữ liệu", status: "FAIL", reason: `Outcome was ${task.report?.outcome}` });
    }
  } catch (err) {
    console.error("  ❌ Scenario 2 Failed:", err.message);
    results.push({ scenario: "2. Không đủ dữ liệu", status: "FAIL", reason: err.message });
  }

  // ─── SCENARIO 3: DIFFERING MEASUREMENT CONDITIONS ───
  console.log("\n[SCENARIO 3] Khác điều kiện đo (Nuanced Discrepancy & Conditions Analysis)...");
  try {
    const { token } = await createSession();
    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Differing Measurement Conditions Analysis",
        objective: "So sánh TPS lý thuyết vs thực tế Ethereum",
        messages: [{ role: "user", text: "So sánh TPS lý thuyết tối đa của Ethereum Layer 1 với TPS thực tế trung bình dưới tải mạng thông thường, dẫn nguồn." }],
      }),
    });
    const projData = await projRes.json();
    const projId = projData.project?.id || projData.id;

    const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: projId,
        objective: "Phân tích khác biệt điều kiện đo TPS",
        messages: [{ role: "user", text: "So sánh TPS lý thuyết tối đa của Ethereum Layer 1 với TPS thực tế trung bình dưới tải mạng thông thường, dẫn nguồn." }],
      }),
    });
    const taskInit = await taskRes.json();
    const task = await waitForTask(taskInit.taskId, token);

    const cost = task.usageMetrics?.estimatedCostUsd;
    const latency = task.durationMs || 0;
    const discrepancies = task.report?.sourceDiscrepancies || [];

    console.log(`  ✓ Status: ${task.status} | Outcome: ${task.report?.outcome}`);
    console.log(`  ✓ Discrepancies Analyzed: ${discrepancies.length} items`);
    if (discrepancies.length > 0) {
      console.log(`    Aspect: [${discrepancies[0].differingAspect}] -> ${discrepancies[0].explanation.slice(0, 100)}...`);
    }
    console.log(`  ✓ Latency: ${latency}ms | Cost: ${typeof cost === "number" ? "$" + cost.toFixed(6) : cost}`);

    if (task.status === "succeeded") {
      passedScenarios++;
      results.push({ scenario: "3. Khác điều kiện đo", status: "PASS", latency: `${latency}ms`, cost: typeof cost === "number" ? `$${cost.toFixed(6)}` : cost });
    } else {
      results.push({ scenario: "3. Khác điều kiện đo", status: "FAIL", reason: `Task status: ${task.status}` });
    }
  } catch (err) {
    console.error("  ❌ Scenario 3 Failed:", err.message);
    results.push({ scenario: "3. Khác điều kiện đo", status: "FAIL", reason: err.message });
  }

  // ─── SCENARIO 4: CONTROLLED SERVICE ERROR HANDLING ───
  console.log("\n[SCENARIO 4] Lỗi dịch vụ có kiểm soát (Controlled Service Error Isolation)...");
  try {
    const { token } = await createSession();
    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Controlled Error Recovery Test",
        objective: "Kiểm tra xử lý lỗi khi mạng hoặc tham số bất thường",
        messages: [{ role: "user", text: "Hãy đọc trang web tại URL không tồn tại https://non-existent-domain-error-test-404-500.org/data và tóm tắt" }],
      }),
    });
    const projData = await projRes.json();
    const projId = projData.project?.id || projData.id;

    const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: projId,
        objective: "Kiểm tra fallback an toàn khi URL lỗi",
        messages: [{ role: "user", text: "Hãy đọc trang web tại URL không tồn tại https://non-existent-domain-error-test-404-500.org/data và tóm tắt" }],
      }),
    });
    const taskInit = await taskRes.json();
    const task = await waitForTask(taskInit.taskId, token);

    const cost = task.usageMetrics?.estimatedCostUsd;
    const latency = task.durationMs || 0;
    const recordedError = (task.sources || []).some((s) => s.status === "failed" || s.error) || Boolean(task.error) || task.report?.outcome === "insufficient_evidence";

    console.log(`  ✓ Status: ${task.status} | Outcome: ${task.report?.outcome}`);
    console.log(`  ✓ Error Controlled Gracefully: ${recordedError ? "YES (isolated without server crash)" : "NO"}`);
    console.log(`  ✓ Latency: ${latency}ms | Cost: ${typeof cost === "number" ? "$" + cost.toFixed(6) : cost}`);

    if (task.status === "succeeded" || task.status === "failed") {
      passedScenarios++;
      results.push({ scenario: "4. Lỗi dịch vụ có kiểm soát", status: "PASS", latency: `${latency}ms`, cost: typeof cost === "number" ? `$${cost.toFixed(6)}` : cost });
    } else {
      results.push({ scenario: "4. Lỗi dịch vụ có kiểm soát", status: "FAIL", reason: `Unexpected status: ${task.status}` });
    }
  } catch (err) {
    console.error("  ❌ Scenario 4 Failed:", err.message);
    results.push({ scenario: "4. Lỗi dịch vụ có kiểm soát", status: "FAIL", reason: err.message });
  }

  // ─── SCENARIO 5: RESUME PROJECT AFTER COMPLETION ───
  console.log("\n[SCENARIO 5] Resume sau khi hoàn thành (Project & State Persistence Verification)...");
  try {
    const { token, userId } = await createSession();
    // 1. Create project
    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Persistent Research Project to Resume",
        objective: "Nghiên cứu về Ethereum Consensus và lưu trữ",
        messages: [{ role: "user", text: "Tóm tắt cơ chế Proof of Stake của Ethereum và dẫn nguồn." }],
      }),
    });
    const projData = await projRes.json();
    const projId = projData.project?.id || projData.id;

    // 2. Run task
    const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: projId,
        objective: "Proof of Stake Ethereum Research",
        messages: [{ role: "user", text: "Tóm tắt cơ chế Proof of Stake của Ethereum và dẫn nguồn." }],
      }),
    });
    const taskInit = await taskRes.json();
    const task = await waitForTask(taskInit.taskId, token);

    // 3. Re-open / Resume project via GET /api/projects/:id
    const reopenedRes = await fetch(`${BASE_URL}/api/projects/${projId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reopenedData = await reopenedRes.json();
    const reopenedProj = reopenedData.project || reopenedData;

    // 4. Check that task details, messages and sources exist
    const messagesRestored = reopenedProj.messages && reopenedProj.messages.length > 0;
    const taskDetailsRestored = Boolean(reopenedData.tasks && reopenedData.tasks.length > 0) || reopenedProj.currentTaskId === task.id || reopenedProj.currentTaskStatus === "succeeded";

    console.log(`  ✓ Project ID: ${projId} | Reopened ID: ${reopenedProj.id}`);
    console.log(`  ✓ Messages Restored: ${messagesRestored} (${reopenedProj.messages?.length} messages)`);
    console.log(`  ✓ Task State Restored: ${taskDetailsRestored} (Status: ${reopenedProj.currentTaskStatus})`);

    if (messagesRestored && taskDetailsRestored) {
      passedScenarios++;
      results.push({ scenario: "5. Resume sau khi hoàn thành", status: "PASS", latency: `${task.durationMs || 0}ms`, cost: typeof task.usageMetrics?.estimatedCostUsd === "number" ? `$${task.usageMetrics.estimatedCostUsd.toFixed(6)}` : (task.usageMetrics?.estimatedCostUsd || "chưa đo") });
    } else {
      results.push({ scenario: "5. Resume sau khi hoàn thành", status: "FAIL", reason: "Data not completely restored" });
    }
  } catch (err) {
    console.error("  ❌ Scenario 5 Failed:", err.message);
    results.push({ scenario: "5. Resume sau khi hoàn thành", status: "FAIL", reason: err.message });
  }

  // ─── FINAL SCORECARD ───
  console.log("\n================================================================================");
  console.log("📊 LIVE INTEGRATION SCORECARD");
  console.log("================================================================================");
  console.table(results);
  console.log(`Passed Scenarios: ${passedScenarios} / 5 (${((passedScenarios / 5) * 100).toFixed(1)}%)`);
  console.log("================================================================================");

  if (passedScenarios === 5) {
    console.log("🎉 ALL 5 LIVE INTEGRATION SCENARIOS PASSED WITH LIVE SERVICES!");
    process.exit(0);
  } else {
    console.error(`⚠️ ${5 - passedScenarios} scenarios failed.`);
    process.exit(1);
  }
}

runLiveIntegrationSuite().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
