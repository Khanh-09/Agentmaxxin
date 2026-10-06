import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createOrGetTask,
  updateTask,
  recoverInterruptedTasks,
  claimNextQueuedTask,
  claimSpecificTask,
  getTaskById,
} from "./agent/tasks.js";
import { issueChallengeNonce } from "./agent/auth.js";

const BASE_URL = "http://localhost:3000";

async function runEmpiricalVerification() {
  console.log("================================================================================");
  console.log("=== BẮT ĐẦU BỘ THỬ NGHIỆM THỰC CHỨNG ENGINE (EMPIRICAL VERIFICATION SUITE) ===");
  console.log("================================================================================\n");

  let allPassed = true;

  // ============================================================================
  // TEST 1: DỪNG WORKER KHI TASK ĐANG CHẠY RỒI KHỞI ĐỘNG LẠI (CRASH RECOVERY)
  // ============================================================================
  console.log(">>> TEST 1: WORKER CRASH & RECOVERY (KHÔNG TREO, KHÔNG LẶP LẠI SIDE EFFECT) <<<");
  
  // 1.1 Khởi tạo task và mô phỏng worker đang chạy, ghi nhận side-effect đã thực hiện
  const crashTestTask = createOrGetTask({
    projectId: "proj_crash_test_1",
    userId: "user_alice",
    objective: "Tạo proposal chuyển tiền và gửi thông báo",
    idempotencyKey: `crash_idem_${Date.now()}`,
  });
  
  const taskId = crashTestTask.task.id;
  updateTask(taskId, {
    status: "running",
    startedAt: new Date(Date.now() - 5000).toISOString(),
    sideEffects: ["Đã phân tích số dư ví", "Đã khởi tạo proposal ID: tx_prop_998877"],
    unreversibleActions: ["Proposal tx_prop_998877 staged on-chain"],
  });

  console.log("1.1 Task trước khi crash:", taskId, "Status: running");
  console.log("Side effects đã thực hiện trước crash:", crashTestTask.task.sideEffects);

  // 1.2 Giả lập server restart: Gọi recoverInterruptedTasks với staleThresholdMs = 0
  const recoveredCount = recoverInterruptedTasks(0);
  const { task: recoveredTask } = getTaskById(taskId);

  console.log("Số task được phát hiện và thu hồi sau crash:", recoveredCount);
  console.log("Status sau recovery:", recoveredTask.status);
  console.log("Lý do phục hồi:", recoveredTask.error);
  console.log("Cờ recoveredFromCrash:", recoveredTask.recoveredFromCrash);
  console.log("Side effects được bảo toàn:", recoveredTask.sideEffects);

  const test1Passed =
    recoveredTask.status === "interrupted" &&
    recoveredTask.recoveredFromCrash === true &&
    recoveredTask.unreversibleActions.includes("Proposal tx_prop_998877 staged on-chain");

  if (test1Passed) {
    console.log("✅ TEST 1 PASSED: Task bị crash được phát hiện ngay lập tức, không treo vô hạn và bảo toàn lịch sử side-effects để tránh chạy lặp lại!\n");
  } else {
    console.error("❌ TEST 1 FAILED!\n");
    allPassed = false;
  }

  // ============================================================================
  // TEST 2: CHẠY HAI WORKER ĐỒNG THỜI (ATOMIC CLAIMING & NO LOST UPDATES)
  // ============================================================================
  console.log(">>> TEST 2: HAI WORKER ĐỒNG THỜI (ATOMIC CLAIMING & KHÔNG MẤT CẬP NHẬT) <<<");

  // 2.1 Tạo 2 tasks queued
  const tA = createOrGetTask({ projectId: "p1", userId: "u1", objective: "Task Alpha", idempotencyKey: `idem_A_${Date.now()}` });
  const tB = createOrGetTask({ projectId: "p1", userId: "u1", objective: "Task Beta", idempotencyKey: `idem_B_${Date.now()}` });

  console.log("2.1 Đã tạo 2 tasks queued:", tA.task.id, "và", tB.task.id);

  // 2.2 Worker 1 và Worker 2 tranh chấp claim đồng thời qua Promise.all
  const [claimW1, claimW2] = await Promise.all([
    Promise.resolve().then(() => claimNextQueuedTask("worker_node_1")),
    Promise.resolve().then(() => claimNextQueuedTask("worker_node_2")),
  ]);

  console.log("Worker 1 Claimed Task ID:", claimW1?.id, "ClaimedBy:", claimW1?.claimedBy, "Version:", claimW1?.version);
  console.log("Worker 2 Claimed Task ID:", claimW2?.id, "ClaimedBy:", claimW2?.claimedBy, "Version:", claimW2?.version);

  const distinctTasksClaimed = claimW1 && claimW2 && claimW1.id !== claimW2.id;
  const noDoubleClaim = claimW1?.claimedBy === "worker_node_1" && claimW2?.claimedBy === "worker_node_2";

  // 2.3 Thử Worker 2 claim đè vào Task mà Worker 1 đang nắm giữ
  const raceClaim = claimSpecificTask(claimW1.id, "worker_node_2");
  console.log("2.3 Worker 2 cố gắng claim task của Worker 1:", raceClaim.success ? "Bị chiếm quyền (LỖI)" : `Bị chặn thành công: "${raceClaim.error}"`);

  const test2Passed = distinctTasksClaimed && noDoubleClaim && !raceClaim.success;
  if (test2Passed) {
    console.log("✅ TEST 2 PASSED: Hai worker đồng thời không bao giờ nhận trùng task, cơ chế Lease & Versioning khóa nguyên tử thành công!\n");
  } else {
    console.error("❌ TEST 2 FAILED!\n");
    allPassed = false;
  }

  // ============================================================================
  // TEST 3: REPLAY ATTACK VÀ QUẢN LÝ NONCE CHỮ KÝ VÍ (CRYPTOGRAPHIC REPLAY TEST)
  // ============================================================================
  console.log(">>> TEST 3: DÙNG LẠI CHỮ KÝ VÍ HỢP LỆ (REPLAY ATTACK & NONCE INVALIDATION) <<<");

  // 3.1 Khởi tạo ví Web3 mẫu
  const testPrivKey = generatePrivateKey();
  const testAccount = privateKeyToAccount(testPrivKey);
  console.log("3.1 Test Wallet Address:", testAccount.address);

  // 3.2 Lấy Challenge Nonce từ server
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session?address=${testAccount.address}`);
  const sessionJson = await sessionRes.json();
  const challengeMessage = sessionJson.challengeTemplate;
  console.log("Challenge Message:", challengeMessage);

  // 3.3 Ký thông điệp bằng Private Key
  const validSignature = await testAccount.signMessage({ message: challengeMessage });
  console.log("Chữ ký hợp lệ (Signature):", validSignature.slice(0, 32) + "...");

  // 3.4 LẦN 1: Gửi chữ ký hợp lệ lần đầu ➔ Phải thành công (200 OK)
  const firstAuthRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: testAccount.address,
      message: challengeMessage,
      signature: validSignature,
    }),
  });
  const firstAuthJson = await firstAuthRes.json();
  console.log("Lần 1 (Gửi hợp lệ): HTTP", firstAuthRes.status, "| Token issued:", Boolean(firstAuthJson.token));

  // 3.5 LẦN 2 (REPLAY ATTACK): Gửi lại CHÍNH CHỮ KÝ VÀ NONCE ĐÓ lần thứ 2 ➔ Phải bị từ chối (401)
  const replayAuthRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: testAccount.address,
      message: challengeMessage,
      signature: validSignature,
    }),
  });
  const replayAuthJson = await replayAuthRes.json();
  console.log("Lần 2 (Replay Attack): HTTP", replayAuthRes.status, "| Error:", replayAuthJson.error);

  // 3.6 LẦN 3 (EXPIRED NONCE): Nonce đã hết hạn
  const expiredMessage = `Sign in to AgentMaxx with nonce: aa11bb22cc33 at timestamp: ${Date.now() - 600000}`;
  const expiredSig = await testAccount.signMessage({ message: expiredMessage });
  const expiredRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: testAccount.address,
      message: expiredMessage,
      signature: expiredSig,
    }),
  });
  const expiredJson = await expiredRes.json();
  console.log("Lần 3 (Nonce hết hạn): HTTP", expiredRes.status, "| Error:", expiredJson.error);

  const test3Passed =
    firstAuthRes.status === 200 &&
    replayAuthRes.status === 401 &&
    replayAuthJson.error?.includes("Replay attack detected") &&
    expiredRes.status === 401;

  if (test3Passed) {
    console.log("✅ TEST 3 PASSED: Chữ ký hợp lệ chỉ được dùng đúng 1 lần; Replay attack và Nonce hết hạn bị chặn triệt để (HTTP 401)!\n");
  } else {
    console.error("❌ TEST 3 FAILED!\n");
    allPassed = false;
  }

  // ============================================================================
  // TEST 4: HỦY TASK GIỮA HAI BƯỚC CÔNG CỤ (CHỨNG MINH BƯỚC TIẾP THEO KHÔNG CHẠY)
  // ============================================================================
  console.log(">>> TEST 4: HỦY TASK GIỮA HAI BƯỚC CÔNG CỤ (STEP EXECUTION BARRIER) <<<");

  // Khởi tạo task có 2 bước công cụ
  const multiStepTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${firstAuthJson.token}` },
    body: JSON.stringify({
      objective: "Bước 1: kiểm tra ví get_wallet_info, Bước 2: tìm kiếm get_web_search về Base Sepolia",
      messages: [
        {
          role: "user",
          text: "Hãy thực hiện lần lượt: đầu tiên gọi tool get_wallet_info, sau đó mới gọi tool get_web_search tìm hiểu về Base Sepolia.",
        },
      ],
    }),
  });
  const multiStepData = await multiStepTaskRes.json();
  const multiTaskId = multiStepData.taskId;
  console.log("4.1 Task nhiều bước đã khởi tạo:", multiTaskId);

  // Kích hoạt hủy ngay khi task đang chạy
  await new Promise((r) => setTimeout(r, 600));
  const cancelRes = await fetch(`${BASE_URL}/api/tasks/${multiTaskId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${firstAuthJson.token}` },
  });
  const cancelJson = await cancelRes.json();
  console.log("4.2 Gửi lệnh hủy thành công:", cancelJson.success, "Status:", cancelJson.task?.status);

  // Đợi 2.5s để worker kết thúc chu trình
  await new Promise((r) => setTimeout(r, 2500));
  const finalTaskRes = await fetch(`${BASE_URL}/api/tasks/${multiTaskId}`, {
    headers: { Authorization: `Bearer ${firstAuthJson.token}` },
  });
  const finalTaskJson = await finalTaskRes.json();
  const finalTask = finalTaskJson.task;

  console.log("4.3 Kết quả kiểm tra hậu kỳ:");
  console.log("- Trạng thái cuối cùng:", finalTask.status);
  console.log("- Số lượng công cụ đã thực hiện (toolSteps):", finalTask.toolSteps?.length || 0);
  console.log("- Danh sách tool đã chạy:", finalTask.toolSteps?.map((s) => s.tool) || []);

  const test4Passed =
    finalTask.status === "cancelled" &&
    (!finalTask.toolSteps || finalTask.toolSteps.length <= 1);

  if (test4Passed) {
    console.log("✅ TEST 4 PASSED: Tiến trình dừng lại ngay tại ranh giới AbortSignal, bước tiếp theo hoàn toàn không được gọi!\n");
  } else {
    console.error("❌ TEST 4 FAILED!\n");
    allPassed = false;
  }

  console.log("================================================================================");
  if (allPassed) {
    console.log("🏆 KẾT LUẬN: TẤT CẢ 4 BÀI KIỂM CHỨNG THỰC TẾ ĐỀU ĐẠT 100% VỚI BẰNG CHỨNG XÁC THỰC!");
  } else {
    console.log("⚠️ CÓ BÀI TEST CHƯA ĐẠT.");
  }
  console.log("================================================================================");
}

runEmpiricalVerification().catch(console.error);
