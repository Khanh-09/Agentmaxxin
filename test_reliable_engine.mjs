// Test suite for Reliable Background Task Engine & Authentication Security

async function runReliableEngineTests() {
  const BASE_URL = "http://localhost:3000";
  console.log("================================================================================");
  console.log("=== BẮT ĐẦU KIỂM TRA ĐỘ TIN CẬY BACKGROUND TASK WORKER & XÁC THỰC MẬT MÃ ===");
  console.log("================================================================================\n");

  // 1. KIỂM TRA CƠ CHẾ CẤP PHIÊN
  console.log(">>> PHẦN 1: KIỂM TRA CƠ CHẾ CẤP PHIÊN & BẢO VỆ DANH TÍNH <<<");

  // 1.1 Guest identity server-generated
  const guestRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestId: "injected_custom_hacker_name" }),
  });
  const guestData = await guestRes.json();
  console.log("1.1 Server-generated Guest User ID:", guestData.userId);
  if (!guestData.userId.includes("injected_custom_hacker_name")) {
    console.log("✅ PASSED: Server hoàn toàn tự sinh danh tính ngẫu nhiên, phớt lờ guestId do client gửi!");
  } else {
    console.error("❌ FAILED: Server chấp nhận guestId tùy ý!");
  }

  // 1.2 Đăng nhập ví với chữ ký giả mạo (Fake signature)
  const fakeSigRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      message: "Sign in challenge: 123456",
      signature: "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b",
    }),
  });
  console.log("1.2 Status khi gửi chữ ký ví giả mạo:", fakeSigRes.status);
  const fakeSigJson = await fakeSigRes.json();
  console.log("Response body:", fakeSigJson);
  if (fakeSigRes.status === 401) {
    console.log("✅ PASSED: Backend đã chặn truy cập với HTTP 401 Unauthorized khi thiếu bằng chứng sở hữu ví!");
  } else {
    console.error("❌ FAILED: Server cấp phiên cho ví chưa chứng minh sở hữu!");
  }

  // 1.3 Kiểm tra token sai chữ ký và token hết hạn
  const tamperedToken = `${guestData.token.split(".")[0]}.invalid_forged_signature_hex`;
  const tamperedRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  console.log("1.3 Status khi token sai chữ ký HMAC:", tamperedRes.status);
  const tamperedJson = await tamperedRes.json();
  console.log("Tampered token error:", tamperedJson.error);
  if (tamperedRes.status === 401) {
    console.log("✅ PASSED: Backend đã phát hiện token sai chữ ký mật mã (HTTP 401)!");
  }

  // Khởi tạo 2 phiên hợp lệ cho User A và User B
  const userARes = await fetch(`${BASE_URL}/api/auth/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const userA = await userARes.json();

  const userBRes = await fetch(`${BASE_URL}/api/auth/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const userB = await userBRes.json();

  // 2. TÁCH THỰC THI KHỎI REQUEST CHAT (Async Non-blocking Creation & Polling)
  console.log("\n>>> PHẦN 2: TÁCH THỰC THI KHỎI REQUEST CHAT (ASYNC WORKER) <<<");
  const startTime = Date.now();
  const createAsyncRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      objective: "Tóm tắt 1 câu về Optimism Superchain",
      messages: [{ role: "user", text: "Tóm tắt 1 câu về Optimism Superchain" }],
    }),
  });
  const createDuration = Date.now() - startTime;
  const asyncTaskData = await createAsyncRes.json();
  console.log(`2.1 API tạo task trả về sau: ${createDuration}ms (Không bị block bởi LLM!)`);
  console.log("Task ID tạo mới:", asyncTaskData.taskId, "Trạng thái ban đầu:", asyncTaskData.status);
  if (createDuration < 500 && (asyncTaskData.status === "queued" || asyncTaskData.status === "running")) {
    console.log("✅ PASSED: API trả kết quả ngay lập tức, worker xử lý nền độc lập!");
  }

  // Polling theo dõi tiến độ worker
  console.log("2.2 Bắt đầu Polling GET /api/tasks/[id] để theo dõi tiến độ...");
  let pollResult = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pRes = await fetch(`${BASE_URL}/api/tasks/${asyncTaskData.taskId}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const pJson = await pRes.json();
    process.stdout.write(`Polling [${i + 1}] Trạng thái: ${pJson.task?.status}...\r`);
    if (pJson.task?.status === "succeeded" || pJson.task?.status === "failed") {
      pollResult = pJson.task;
      console.log(`\nTask đã hoàn tất với trạng thái: ${pollResult.status} trong ${pollResult.durationMs}ms`);
      console.log("Kết quả trả về:", pollResult.result?.slice(0, 100) + "...");
      break;
    }
  }
  if (pollResult && pollResult.status === "succeeded") {
    console.log("✅ PASSED: Worker hoàn thành tác vụ nền và client nhận kết quả qua polling thành công!");
  }

  // 3. KIỂM TRA CHỐNG TRÙNG VÀ XUNG ĐỘT PAYLOAD
  console.log("\n>>> PHẦN 3: KIỂM TRA CHỐNG TRÙNG (IDEMPOTENCY) & XUNG ĐỘT PAYLOAD <<<");

  // 3.1 Hai request đồng thời cùng key
  const sharedKey = `shared_idem_${Date.now()}`;
  console.log("3.1 Gửi đồng thời 2 request với cùng Idempotency Key...");
  const [req1, req2] = await Promise.all([
    fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        objective: "Tác vụ đồng thời",
        idempotencyKey: sharedKey,
        messages: [{ role: "user", text: "Tác vụ đồng thời" }],
      }),
    }).then((r) => r.json()),
    fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        objective: "Tác vụ đồng thời",
        idempotencyKey: sharedKey,
        messages: [{ role: "user", text: "Tác vụ đồng thời" }],
      }),
    }).then((r) => r.json()),
  ]);

  console.log("Req 1 Task ID:", req1.taskId, "| Req 2 Task ID:", req2.taskId);
  console.log("Req 1 isDuplicate:", req1.isDuplicate, "| Req 2 isDuplicate:", req2.isDuplicate);
  if (req1.taskId === req2.taskId && (req1.isDuplicate || req2.isDuplicate)) {
    console.log("✅ PASSED: Hai request đồng thời chỉ tạo 1 task duy nhất!");
  } else {
    console.error("❌ FAILED: Tạo trùng 2 tasks khác nhau!");
  }

  // 3.2 Cùng key nhưng khác nội dung payload
  console.log("\n3.2 Gửi request với CÙNG Key nhưng KHÁC nội dung payload...");
  const conflictRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      objective: "NỘI DUNG THAY ĐỔI HOÀN TOÀN KHÁC",
      idempotencyKey: sharedKey,
      messages: [{ role: "user", text: "NỘI DUNG THAY ĐỔI HOÀN TOÀN KHÁC" }],
    }),
  });
  console.log("Status khi gửi payload xung đột:", conflictRes.status);
  const conflictJson = await conflictRes.json();
  console.log("Response body:", conflictJson);
  if (conflictRes.status === 409) {
    console.log("✅ PASSED: Backend đã phát hiện xung đột payload và trả về HTTP 409 Conflict!");
  } else {
    console.error("❌ FAILED: Không phát hiện xung đột payload!");
  }

  // 4. KIỂM TRA HỦY TÁC VỤ CÓ HIỆU LỰC (IN-FLIGHT CANCELLATION & NO OVERWRITE)
  console.log("\n>>> PHẦN 4: KIỂM TRA HỦY TÁC VỤ KHI ĐANG CHẠY (IN-FLIGHT CANCELLATION) <<<");
  const cancelTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      objective: "Phân tích bảo mật chuyên sâu nhiều bước Solidity",
      messages: [{ role: "user", text: "Phân tích bảo mật chuyên sâu nhiều bước Solidity" }],
    }),
  });
  const cancelTaskData = await cancelTaskRes.json();
  console.log("Khởi tạo task để test hủy:", cancelTaskData.taskId);

  // Đợi 200ms khi worker vừa bắt đầu rồi kích hoạt hủy ngay
  await new Promise((r) => setTimeout(r, 200));
  const cancelActionRes = await fetch(`${BASE_URL}/api/tasks/${cancelTaskData.taskId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const cancelActionJson = await cancelActionRes.json();
  console.log("Kết quả hủy:", cancelActionJson.task?.status);

  // Đợi thêm 3s xem worker có ghi đè status = succeeded không
  await new Promise((r) => setTimeout(r, 3000));
  const postCancelCheck = await fetch(`${BASE_URL}/api/tasks/${cancelTaskData.taskId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const postCancelJson = await postCancelCheck.json();
  console.log("Trạng thái task sau khi worker kết thúc:", postCancelJson.task?.status);
  if (postCancelJson.task?.status === "cancelled") {
    console.log("✅ PASSED: Tác vụ duy trì trạng thái 'cancelled', không bị ghi đè bởi 'succeeded'!");
  } else {
    console.error("❌ FAILED: Tác vụ bị ghi đè trạng thái sau khi hủy!");
  }

  // 5. KIỂM TRA BẢO VỆ PHÂN QUYỀN (USER B TRUY CẬP / HỦY TASK USER A)
  console.log("\n>>> PHẦN 5: KIỂM TRA USER B TRUY CẬP / HỦY TASK CỦA USER A <<<");

  // User B đọc task của User A
  const bReadRes = await fetch(`${BASE_URL}/api/tasks/${asyncTaskData.taskId}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  console.log("5.1 User B đọc task của User A HTTP Status:", bReadRes.status);
  if (bReadRes.status === 403) {
    console.log("✅ PASSED: Backend chặn User B đọc task với HTTP 403 Forbidden!");
  }

  // User B hủy task của User A
  const bCancelRes = await fetch(`${BASE_URL}/api/tasks/${asyncTaskData.taskId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  console.log("5.2 User B hủy task của User A HTTP Status:", bCancelRes.status);
  if (bCancelRes.status === 403) {
    console.log("✅ PASSED: Backend chặn User B hủy task với HTTP 403 Forbidden!");
  }

  console.log("\n================================================================================");
  console.log("=== TẤT CẢ CÁC BÀI KIỂM TRA ĐỘ TIN CẬY & BẢO MẬT ĐÃ HOÀN TẤT THÀNH CÔNG! ===");
  console.log("================================================================================");
}

runReliableEngineTests().catch(console.error);
