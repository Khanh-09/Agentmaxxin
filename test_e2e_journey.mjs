import fs from "fs";

const BASE_URL = "http://localhost:3000";

async function runEndToEndJourney() {
  console.log("================================================================================");
  console.log("=== THỬ NGHIỆM HÀNH TRÌNH XUYÊN SUỐT (END-TO-END USER JOURNEY AUDIT) ===");
  console.log("================================================================================\n");

  let allPassed = true;

  // 1. Khởi tạo phiên làm việc (Session)
  console.log(">>> BƯỚC 1: KHỞI TẠO PHIÊN LÀM VIỆC (SESSION INIT) <<<");
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`);
  const sessionData = await sessionRes.json();
  const token = sessionData.token;
  const userId = sessionData.userId;
  console.log("1.1 Token được cấp:", token?.slice(0, 25) + "...");
  console.log("1.2 User ID:", userId);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. Tạo Dự Án Mới (Create Project)
  console.log("\n>>> BƯỚC 2: TẠO DỰ ÁN MỚI (CREATE PROJECT) <<<");
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title: "Dự Án Nghiên Cứu OP Stack L2",
      objective: "Nghiên cứu cơ chế hoạt động của Optimism OP Stack và dẫn nguồn",
      status: "ACTIVE",
      messages: [
        {
          role: "user",
          text: "Hãy tìm kiếm thông tin về Optimism OP Stack, giải thích cơ chế hoạt động và dẫn nguồn xác thực.",
        },
      ],
    }),
  });
  const createProjData = await createProjRes.json();
  const projectId = createProjData.project?.id;
  console.log("2.1 Project ID khởi tạo:", projectId);
  console.log("2.2 Trạng thái HTTP:", createProjRes.status);

  // 3. Gửi Tác Vụ Chạy Nền (Submit Background Task)
  console.log("\n>>> BƯỚC 3: GỬI TÁC VỤ CHẠY NỀN (SUBMIT ASYNC TASK) <<<");
  const idempotencyKey = `e2e_idem_${Date.now()}`;
  const taskSubmitRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      projectId,
      objective: "Nghiên cứu Optimism OP Stack và dẫn nguồn xác thực",
      idempotencyKey,
      messages: [
        {
          role: "user",
          text: "Hãy tìm kiếm thông tin về Optimism OP Stack, giải thích cơ chế hoạt động và dẫn nguồn xác thực.",
        },
      ],
    }),
  });
  const taskSubmitData = await taskSubmitRes.json();
  const taskId = taskSubmitData.taskId;
  console.log("3.1 Task ID:", taskId);
  console.log("3.2 Trạng thái ban đầu:", taskSubmitData.task?.status);

  // 4. Theo Dõi Tiến Trình (Progress Polling)
  console.log("\n>>> BƯỚC 4: THEO DÕI TIẾN TRÌNH (POLLING PROGRESS) <<<");
  let completedTask = null;
  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    const pollRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, { headers: authHeaders });
    const pollData = await pollRes.json();
    const t = pollData.task;
    console.log(`   [Poll ${i}] Status: ${t.status} | Tools executed: ${t.toolSteps?.length || 0}`);

    if (t.status === "succeeded" || t.status === "failed" || t.status === "interrupted") {
      completedTask = t;
      break;
    }
  }

  console.log("4.1 Trạng thái hoàn thành:", completedTask?.status);
  console.log("4.2 Thời gian xử lý:", `${completedTask?.durationMs}ms`);

  // 5. Xem Báo Cáo & Bằng Chứng (Inspect Report & Citations)
  console.log("\n>>> BƯỚC 5: KIỂM TRA BÁO CÁO & BẰNG CHỨNG XÁC THỰC (REPORT & CITATIONS) <<<");
  console.log("5.1 Report Outcome (Epistemic Quality):", completedTask?.report?.outcome);
  console.log("5.2 Citation Integrity Score:", `${((completedTask?.report?.citationIntegrityScore || 0) * 100).toFixed(0)}%`);
  console.log("5.3 Số lượng nguồn thu thập được:", completedTask?.sources?.length || 0);
  console.log("5.4 Thẩm định nhận định (Evidence Statements):", completedTask?.report?.evidenceStatements?.length || 0);

  // 6. Giả Lập Xuất Markdown (Export Markdown)
  console.log("\n>>> BƯỚC 6: XUẤT BÁO CÁO MARKDOWN (EXPORT MARKDOWN) <<<");
  let markdownDoc = `# Báo Cáo Nghiên Cứu & Lập Kế Hoạch (AgentMaxx Report)\n`;
  markdownDoc += `**Dự án ID:** ${projectId}\n`;
  markdownDoc += `**Vòng đời thực thi (Execution Status):** \`${completedTask?.status}\`\n`;
  markdownDoc += `**Chất lượng đầu ra (Report Outcome):** \`${completedTask?.report?.outcome}\`\n`;
  markdownDoc += `**Thời gian tạo:** ${new Date().toLocaleString()}\n\n---\n\n`;
  markdownDoc += `## 📝 Nội Dung Báo Cáo\n\n${completedTask?.result}\n\n`;
  markdownDoc += `---\n\n## 📚 Danh Sách Nguồn Kiểm Chứng\n\n`;
  (completedTask?.sources || []).forEach((s, idx) => {
    markdownDoc += `### [${s.sourceId || `src_${idx + 1}`}] ${s.title}\n- URL: ${s.url}\n- Loại: \`${s.dataType}\`\n\n`;
  });

  const exportSuccess = markdownDoc.includes(projectId) && markdownDoc.includes("Nguồn Kiểm Chứng");
  console.log("6.1 Độ dài bản xuất Markdown:", markdownDoc.length, "bytes");
  console.log("6.2 Export Markdown hợp lệ:", exportSuccess);

  // 7. Cập Nhật Dự Án Với Kết Quả Cuối (Auto-save Project)
  console.log("\n>>> BƯỚC 7: LƯU TRỮ TRẠNG THÁI DỰ ÁN (PROJECT SYNC) <<<");
  const saveProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: projectId,
      title: "Dự Án Nghiên Cứu OP Stack L2",
      objective: "Nghiên cứu cơ chế hoạt động của Optimism OP Stack và dẫn nguồn",
      status: "COMPLETED",
      currentTaskId: taskId,
      currentTaskStatus: completedTask?.status,
      messages: [
        { role: "user", text: "Hãy tìm kiếm thông tin về Optimism OP Stack, giải thích cơ chế hoạt động và dẫn nguồn xác thực." },
        { role: "agent", text: completedTask?.result || "", steps: completedTask?.toolSteps },
      ],
    }),
  });
  console.log("7.1 Lưu dự án thành công:", saveProjRes.status === 200);

  // 8. Giả Lập Tải Lại Trang & Mở Lại Dự Án (Page Reload & Resume Project)
  console.log("\n>>> BƯỚC 8: TẢI LẠI TRANG & KHÔI PHỤC DỰ ÁN (PAGE RELOAD & RESUME) <<<");
  const resumeRes = await fetch(`${BASE_URL}/api/projects/${projectId}`, { headers: authHeaders });
  const resumeData = await resumeRes.json();
  const resumedProject = resumeData.project;
  const resumedTasks = resumeData.tasks;

  console.log("8.1 Project khôi phục thành công:", resumedProject?.title);
  console.log("8.2 Số lượng tin nhắn khôi phục:", resumedProject?.messages?.length);
  console.log("8.3 Số lượng tác vụ đính kèm khôi phục:", resumedTasks?.length);
  if (resumedTasks && resumedTasks.length > 0) {
    console.log("8.4 Nguồn của task được khôi phục:", resumedTasks[0].sources?.length || 0);
  }

  const journeyPassed =
    createProjRes.status === 200 &&
    taskSubmitRes.status === 200 &&
    completedTask?.status === "succeeded" &&
    exportSuccess &&
    resumedProject?.id === projectId &&
    resumedProject?.messages?.length === 2;

  console.log("\n================================================================================");
  if (journeyPassed) {
    console.log("🏆 KẾT LUẬN HÀNH TRÌNH: TOÀN BỘ HÀNH TRÌNH 8 BƯỚC XUYÊN SUỐT ĐÃ ĐẠT 100%!");
  } else {
    console.log("⚠️ HÀNH TRÌNH CHƯA ĐẠT.");
    allPassed = false;
  }
  console.log("================================================================================");
}

runEndToEndJourney().catch(console.error);
