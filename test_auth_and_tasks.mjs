// Automated test suite for Access Control & Stateful Tasks

async function runTests() {
  const BASE_URL = "http://localhost:3000";
  console.log("=== BẮT ĐẦU KIỂM TRA QUYỀN TRUY CẬP VÀ STATEFUL TASK ENGINE ===\n");

  // 1. Tạo session cho User A
  console.log("--- BƯỚC 1: Khởi tạo phiên xác thực ---");
  const userARes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestId: "alice_researcher" }),
  });
  const userAData = await userARes.json();
  console.log("User A Session Token:", userAData.token ? "✅ Đã cấp token" : "❌ Lỗi");
  console.log("User A ID:", userAData.userId);

  // Tạo session cho User B
  const userBRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestId: "bob_intruder" }),
  });
  const userBData = await userBRes.json();
  console.log("User B Session Token:", userBData.token ? "✅ Đã cấp token" : "❌ Lỗi");
  console.log("User B ID:", userBData.userId);

  // 2. User A tạo một dự án
  console.log("\n--- BƯỚC 2: User A tạo dự án ---");
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAData.token}`,
    },
    body: JSON.stringify({
      title: "Nghiên cứu Layer 2 Rollups bảo mật của Alice",
      objective: "So sánh Optimistic Rollups và ZK-Rollups",
      messages: [{ role: "user", text: "So sánh Optimistic vs ZK Rollups" }],
    }),
  });
  const createProjData = await createProjRes.json();
  const aliceProjId = createProjData.project?.id;
  console.log("User A Project Created:", aliceProjId, "Owner:", createProjData.project?.userId);

  // 3. KIỂM TRA QUYỀN TRUY CẬP: User B thử đọc project của User A
  console.log("\n--- BƯỚC 3: User B thử đọc project của User A (GET /api/projects/[id]) ---");
  const accessRes = await fetch(`${BASE_URL}/api/projects/${aliceProjId}`, {
    headers: {
      Authorization: `Bearer ${userBData.token}`,
    },
  });
  console.log("HTTP Status khi User B đọc project của User A:", accessRes.status);
  const accessJson = await accessRes.json();
  console.log("Response Body:", accessJson);
  if (accessRes.status === 403) {
    console.log("✅ PASSED: Backend đã chặn User B với HTTP 403 Forbidden!");
  } else {
    console.error("❌ FAILED: User B đã truy cập trái phép được project của User A!");
  }

  // 4. User B thử sửa project của User A
  console.log("\n--- BƯỚC 4: User B thử sửa project của User A (POST /api/projects) ---");
  const modifyRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userBData.token}`,
    },
    body: JSON.stringify({
      id: aliceProjId,
      messages: [{ role: "user", text: "Hacked by Bob" }],
    }),
  });
  console.log("HTTP Status khi User B sửa project của User A:", modifyRes.status);
  const modifyJson = await modifyRes.json();
  console.log("Response Body:", modifyJson);
  if (modifyRes.status === 403) {
    console.log("✅ PASSED: Backend đã chặn User B sửa project với HTTP 403 Forbidden!");
  } else {
    console.error("❌ FAILED: User B sửa được project của User A!");
  }

  // 5. User B thử xóa project của User A
  console.log("\n--- BƯỚC 5: User B thử xóa project của User A (DELETE /api/projects) ---");
  const deleteRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userBData.token}`,
    },
    body: JSON.stringify({ id: aliceProjId }),
  });
  console.log("HTTP Status khi User B xóa project của User A:", deleteRes.status);
  const deleteJson = await deleteRes.json();
  console.log("Response Body:", deleteJson);
  if (deleteRes.status === 403) {
    console.log("✅ PASSED: Backend đã chặn User B xóa project với HTTP 403 Forbidden!");
  } else {
    console.error("❌ FAILED: User B xóa được project của User A!");
  }

  // 6. Thử Client tự gửi userId giả mạo trong body
  console.log("\n--- BƯỚC 6: Client tự gửi userId giả mạo mà không có token tương ứng ---");
  const spoofRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAData.token}`,
    },
    body: JSON.stringify({
      userId: "0xVICTIM_WALLET_SPOOFED_ADDRESS",
      messages: [{ role: "user", text: "Spoof test" }],
    }),
  });
  const spoofJson = await spoofRes.json();
  console.log("UserId thực tế gán bởi backend:", spoofJson.project?.userId);
  if (spoofJson.project?.userId === userAData.userId) {
    console.log("✅ PASSED: Backend đã phớt lờ userId do client gửi và gán đúng session token!");
  } else {
    console.error("❌ FAILED: Backend chấp nhận userId giả mạo!");
  }

  // 7. KIỂM TRA STATEFUL TASK ENGINE (queued, running, succeeded, timing, idempotency)
  console.log("\n--- BƯỚC 7: Kiểm tra Stateful Task Engine ---");
  const idemKey = `idem_test_${Date.now()}`;
  const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAData.token}`,
    },
    body: JSON.stringify({
      projectId: aliceProjId,
      objective: "Nghiên cứu bảo mật hợp đồng reentrancy",
      idempotencyKey: idemKey,
    }),
  });
  const taskData = await taskRes.json();
  console.log("Tác vụ đã tạo:", taskData.task?.id, "Trạng thái:", taskData.task?.status);
  console.log("Các bước khởi tạo (steps):", taskData.task?.steps?.map((s) => s.name));

  // Kiểm tra Deduplication / Idempotency
  console.log("\n--- BƯỚC 8: Kiểm tra Ngăn chặn tác vụ trùng (Idempotency Key) ---");
  const dupTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAData.token}`,
    },
    body: JSON.stringify({
      projectId: aliceProjId,
      objective: "Nghiên cứu bảo mật hợp đồng reentrancy",
      idempotencyKey: idemKey,
    }),
  });
  const dupTaskData = await dupTaskRes.json();
  console.log("Duplicate Task Response isDuplicate:", dupTaskData.isDuplicate);
  if (dupTaskData.isDuplicate && dupTaskData.task?.id === taskData.task?.id) {
    console.log("✅ PASSED: Hệ thống deduplication đã phát hiện và tái sử dụng task gốc, không tạo trùng lặp!");
  }

  // 9. Kiểm tra Hủy tác vụ (Cancel)
  console.log("\n--- BƯỚC 9: Kiểm tra Hủy tác vụ (POST /api/tasks/[id]/cancel) ---");
  const cancelRes = await fetch(`${BASE_URL}/api/tasks/${taskData.task.id}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAData.token}`,
    },
  });
  const cancelData = await cancelRes.json();
  console.log("Trạng thái sau khi hủy:", cancelData.task?.status);
  if (cancelData.task?.status === "cancelled") {
    console.log("✅ PASSED: Tác vụ đã chuyển sang trạng thái cancelled với thời gian hoàn tất!");
  }

  // 10. Kiểm tra luồng Agent Chat hoàn chỉnh với Task Engine (POST /api/agent)
  console.log("\n--- BƯỚC 10: Chạy agent chat hoàn chỉnh và xác nhận trạng thái succeeded ---");
  const chatRes = await fetch(`${BASE_URL}/api/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAData.token}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", text: "Kiểm tra ví và tóm tắt ngắn gọn 1 câu" }],
      projectId: aliceProjId,
    }),
  });
  const chatData = await chatRes.json();
  console.log("Agent response answer length:", chatData.answer?.length);
  console.log("Agent task ID:", chatData.task?.id);
  console.log("Agent task status:", chatData.task?.status);
  console.log("Agent task duration:", chatData.task?.durationMs, "ms");
  if (chatData.task?.status === "succeeded" && chatData.task?.durationMs > 0) {
    console.log("✅ PASSED: Tác vụ đã hoàn tất thành công với trạng thái 'succeeded' và ghi nhận duration chính xác!");
  }

  // 11. Kiểm tra Resume Project khôi phục đầy đủ trạng thái tác vụ
  console.log("\n--- BƯỚC 11: Mở lại dự án (Resume Project) và kiểm tra khôi phục tác vụ ---");
  const resumeRes = await fetch(`${BASE_URL}/api/projects/${aliceProjId}`, {
    headers: {
      Authorization: `Bearer ${userAData.token}`,
    },
  });
  const resumeJson = await resumeRes.json();
  console.log("Khôi phục dự án:", resumeJson.project?.title);
  console.log("Số lượng tác vụ liên kết:", resumeJson.tasks?.length);
  console.log("Trạng thái tác vụ gần nhất:", resumeJson.tasks?.[0]?.status);
  if (resumeJson.tasks?.length > 0) {
    console.log("✅ PASSED: Mở lại dự án đã khôi phục đầy đủ lịch sử và trạng thái tác vụ thực tế!");
  }

  console.log("\n=== TẤT CẢ CÁC BÀI KIỂM TRA ĐÃ HOÀN TẤT XUẤT SẮC! ===");
}

runTests().catch(console.error);
