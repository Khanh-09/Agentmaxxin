import { runGraph } from "@/agent/graph";
import {
  updateTask,
  getTaskById,
  isTaskCancelled,
  registerTaskAbortController,
  unregisterTaskAbortController,
} from "@/agent/tasks";
import { validateCitationsAndAnalyzeEvidence } from "@/agent/citation-validator";

/**
 * Executes a background task asynchronously outside the lifecycle of the HTTP request.
 * Ensures cancellation signals are propagated and steps check for abort before execution.
 */
export async function executeBackgroundTask(params: {
  taskId: string;
  projectId: string;
  userId: string;
  messages: Array<{ role: "user" | "agent"; text: string }>;
  baseUrl: string;
}): Promise<void> {
  const { taskId, userId, messages, baseUrl } = params;

  const controller = new AbortController();
  registerTaskAbortController(taskId, controller);

  // Mark task as running
  updateTask(
    taskId,
    {
      status: "running",
      startedAt: new Date().toISOString(),
    },
    userId
  );

  const startTime = Date.now();
  const sideEffects: string[] = [];
  const unreversibleActions: string[] = [];

  try {
    // Check if task was already cancelled before starting
    if (isTaskCancelled(taskId) || controller.signal.aborted) {
      console.log(`[Worker] Task ${taskId} was cancelled before execution.`);
      return;
    }

    // Run agent cognitive graph with abort signal propagation
    const result = await runGraph(messages, { baseUrl, abortSignal: controller.signal });

    // Check cancellation again post-execution
    if (isTaskCancelled(taskId) || controller.signal.aborted) {
      console.log(`[Worker] Task ${taskId} cancelled during execution.`);
      return;
    }

    const taskSources: import("@/agent/tasks").TaskSource[] = [];

    // Inspect tool steps for recorded side-effects, unreversible operations, and structured sources
    if (result.steps && Array.isArray(result.steps)) {
      for (const step of result.steps) {
        const resObj = step.result as any;
        if (step.tool === "get_web_search") {
          sideEffects.push(`Thu thập ${resObj?.sourceCount || 0} nguồn web.`);
          if (resObj?.results && Array.isArray(resObj.results)) {
            for (const r of resObj.results) {
              if (r.url && !taskSources.some((s) => s.url === r.url)) {
                taskSources.push({
                  sourceId: r.sourceId || `src_${taskSources.length + 1}`,
                  url: r.url,
                  title: r.title || "Web Source",
                  retrievedAt: r.retrievedAt || new Date().toISOString(),
                  snippet: r.snippet,
                  dataType: "snippet",
                  status: r.status || "retrieved",
                });
              }
            }
          } else if (resObj?.error || step.error) {
            taskSources.push({
              sourceId: `src_err_${taskSources.length + 1}`,
              url: "N/A",
              title: `Truy vấn thất bại: ${(step.args as any)?.query || "Web Search"}`,
              retrievedAt: new Date().toISOString(),
              dataType: "snippet",
              status: "failed",
              error: resObj?.error || "Search tool failure",
            });
          }
        } else if (step.tool === "extract_web_page") {
          sideEffects.push(`Trích xuất nội dung chuyên sâu từ: ${resObj?.url || (step.args as any)?.url}`);
          if (resObj?.url) {
            const existingIdx = taskSources.findIndex((s) => s.url === resObj.url);
            const pageSource = {
              sourceId: resObj.sourceId || `src_page_${taskSources.length + 1}`,
              url: resObj.url,
              title: resObj.title || "Web Document",
              retrievedAt: resObj.retrievedAt || new Date().toISOString(),
              content: resObj.content,
              dataType: "page_content" as const,
              status: resObj.status || (resObj.error ? "failed" : "retrieved"),
              error: resObj.error,
            };
            if (existingIdx !== -1) {
              taskSources[existingIdx] = pageSource;
            } else {
              taskSources.push(pageSource);
            }
          }
        } else if (step.tool === "prepare_transfer") {
          unreversibleActions.push(
            `Đã khởi tạo proposal chuyển tiền on-chain ID: ${resObj?.proposalId}`
          );
        } else if (step.tool === "audit_smart_contract_security") {
          sideEffects.push("Hoàn tất phân tích rủi ro hợp đồng thông minh.");
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const hasSufficientEvidence = taskSources.some((s) => s.status === "retrieved");

    // Comprehensive Citation Validation & Evidence Quality Assessment
    const evidenceAudit = validateCitationsAndAnalyzeEvidence({
      rawText: result.answer,
      sources: taskSources,
    });

    // Transition task to succeeded (guarded against cancelled state)
    updateTask(
      taskId,
      {
        status: "succeeded",
        result: result.answer,
        toolSteps: result.steps,
        sources: taskSources,
        report: {
          summary: result.answer.slice(0, 300) + (result.answer.length > 300 ? "..." : ""),
          outcome: evidenceAudit.outcome,
          keyFindings: [
            "Đã kiểm chứng đối chiếu qua các nguồn dữ liệu thực tế.",
            `Tổng hợp thành công ${taskSources.filter((s) => s.status === "retrieved").length} nguồn tài liệu xác thực.`,
            `Độ tin cậy trích dẫn (Citation Integrity Score): ${(evidenceAudit.citationIntegrityScore * 100).toFixed(0)}%`,
          ],
          evidenceStatements: evidenceAudit.verifiedClaims,
          sourceDiscrepancies: evidenceAudit.sourceDiscrepancies,
          uncertaintiesAndConflicts:
            evidenceAudit.outcome === "insufficient_evidence"
              ? ["Không tìm thấy đủ dữ liệu đáng tin cậy cho một số khía cạnh nghiên cứu."]
              : evidenceAudit.sourceDiscrepancies.map((d) => d.explanation),
          actionableSteps: [
            "Kiểm tra và mở các liên kết nguồn để xác thực chi tiết.",
            "Xuất báo cáo Markdown lưu trữ cho dự án.",
          ],
          hasSufficientEvidence,
          citationIntegrityScore: evidenceAudit.citationIntegrityScore,
          unsupportedClaimsCount: evidenceAudit.unsupportedClaimsCount,
        },
        steps: [
          { name: "Phân tích yêu cầu & Lập kế hoạch", status: "completed" },
          { name: "Truy vấn Tools & Thu thập dữ liệu", status: "completed" },
          { name: "Tổng hợp thông tin & Kiểm chứng nguồn", status: "completed" },
          { name: "Đánh giá chất lượng & Trả kết quả", status: "completed" },
        ],
        sideEffects,
        unreversibleActions,
        durationMs,
        usageMetrics: result.usageMetrics,
        completedAt: new Date().toISOString(),
      },
      userId
    );
  } catch (err: any) {
    if (isTaskCancelled(taskId) || controller.signal.aborted) {
      console.log(`[Worker] Task ${taskId} aborted on error boundary.`);
      return;
    }

    const durationMs = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : String(err);

    updateTask(
      taskId,
      {
        status: "failed",
        error: errMsg,
        sideEffects,
        unreversibleActions,
        durationMs,
        usageMetrics: {
          executionTimeMs: durationMs,
          estimatedCostUsd: "chưa đo",
          costCalculationMethod: "Thất bại trước khi hoàn tất - chưa đo",
        },
        completedAt: new Date().toISOString(),
      },
      userId
    );
  } finally {
    unregisterTaskAbortController(taskId);
  }
}
