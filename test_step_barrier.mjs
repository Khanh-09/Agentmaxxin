import fs from "fs";
import { runGraph } from "./agent/graph.ts";
import { tools } from "./agent/tools.ts";

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [k, ...v] = trimmed.split("=");
      process.env[k.trim()] = v.join("=").trim();
    }
  }
}

async function verifyMidStepCancellation() {
  console.log("=== EMPIRICAL VERIFICATION: MID-STEP TOOL EXECUTION BARRIER ===");

  const controller = new AbortController();
  let step1Executed = false;
  let step2Executed = false;

  // Let's inspect tools
  const originalGetWallet = tools.find((t) => t.name === "get_wallet_info");
  const originalWebSearch = tools.find((t) => t.name === "get_web_search");

  // Mock wrap to observe calls
  const origRun1 = originalGetWallet.run;
  const origRun2 = originalWebSearch.run;

  originalGetWallet.run = async (args, ctx) => {
    step1Executed = true;
    console.log("[EVIDENCE] Tool 1 (get_wallet_info) EXECUTED at timestamp:", Date.now());
    // Trigger cancellation immediately after tool 1 completes
    controller.abort();
    console.log("[EVIDENCE] AbortSignal.aborted triggered:", controller.signal.aborted);
    return origRun1(args, ctx);
  };

  originalWebSearch.run = async (args, ctx) => {
    step2Executed = true;
    console.log("[ERROR] Tool 2 (get_web_search) was executed! Barrier failed.");
    return origRun2(args, ctx);
  };

  try {
    const history = [
      {
        role: "user",
        text: "Thực hiện lần lượt 2 việc: 1. get_wallet_info để xem ví, sau đó 2. get_web_search để tìm hiểu giá ETH.",
      },
    ];

    console.log("-> Launching runGraph with AbortSignal...");
    await runGraph(history, {
      baseUrl: "http://localhost:3000",
      abortSignal: controller.signal,
    });
    console.log("[ERROR] runGraph completed without throwing Abort error!");
  } catch (err) {
    console.log("[EVIDENCE] runGraph successfully intercepted abort exception:", err.message);
  } finally {
    // Restore
    originalGetWallet.run = origRun1;
    originalWebSearch.run = origRun2;
  }

  console.log("\n--- KẾT QUẢ KIỂM CHỨNG BƯỚC CÔNG CỤ (TOOL STEP BARRIER PROOF) ---");
  console.log("1. Tool 1 (get_wallet_info) executed:", step1Executed);
  console.log("2. Tool 2 (get_web_search) executed:", step2Executed);
  console.log("3. Barrier working (Tool 2 was NOT called):", !step2Executed);

  if (step1Executed && !step2Executed) {
    console.log("✅ BẰNG CHỨNG XÁC THỰC: Hủy task giữa 2 bước công cụ ngăn chặn 100% bước tiếp theo được gọi!");
  } else {
    console.log("❌ KIỂM CHỨNG THẤT BẠI");
  }
}

verifyMidStepCancellation().catch(console.error);
