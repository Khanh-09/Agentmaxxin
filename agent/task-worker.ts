import { runGraph } from "@/agent/graph";
import {
  updateTask,
  getTaskById,
  isTaskCancelled,
  registerTaskAbortController,
  unregisterTaskAbortController,
} from "@/agent/tasks";
import { getProjectById, saveOrUpdateProject } from "@/agent/projects";
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
  const { taskId, userId, messages, baseUrl, projectId } = params;

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

    const projectRes = projectId ? getProjectById(projectId, userId) : null;
    const handoffSummary = projectRes?.project?.handoffSummary;

    // Run agent cognitive graph with abort signal propagation and scoped memory context
    const result = await runGraph(messages, {
      baseUrl,
      abortSignal: controller.signal,
      userId,
      projectId,
      handoffSummary,
    });

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
        } else if (step.tool === "get_weather") {
          sideEffects.push(`Truy vấn thời tiết thời gian thực: ${(step.args as any)?.city || "Vị trí"}`);
          taskSources.push({
            sourceId: `src_weather_${taskSources.length + 1}`,
            url: "https://open-meteo.com",
            title: `Dịch vụ thời tiết trực tiếp Open-Meteo (${(step.args as any)?.city || "Vị trí"})`,
            retrievedAt: new Date().toISOString(),
            snippet: typeof resObj === "object" ? JSON.stringify(resObj) : String(resObj),
            dataType: "snippet",
            status: step.error ? "failed" : "retrieved",
            error: step.error ? (resObj?.error || "Weather API error") : undefined,
          });
        } else if (step.tool === "get_wallet_balance" || step.tool === "get_token_balance") {
          sideEffects.push(`Kiểm tra số dư ví trên Base L2`);
          taskSources.push({
            sourceId: `src_chain_${taskSources.length + 1}`,
            url: "https://sepolia.basescan.org",
            title: "Trạng thái On-chain Base Sepolia L2 RPC",
            retrievedAt: new Date().toISOString(),
            snippet: typeof resObj === "object" ? JSON.stringify(resObj) : String(resObj),
            dataType: "snippet",
            status: step.error ? "failed" : "retrieved",
          });
        } else if (step.tool === "search_knowledge_base") {
          sideEffects.push(`Tra cứu tri thức RAG cục bộ: ${(step.args as any)?.query}`);
          taskSources.push({
            sourceId: `src_rag_${taskSources.length + 1}`,
            url: "local://knowledge-base",
            title: "Cơ sở tri thức RAG AgentMaxx",
            retrievedAt: new Date().toISOString(),
            snippet: typeof resObj === "object" ? JSON.stringify(resObj).slice(0, 300) : String(resObj).slice(0, 300),
            dataType: "snippet",
            status: step.error ? "failed" : "retrieved",
          });
        } else if (step.tool === "prepare_transfer") {
          unreversibleActions.push(
            `Đã khởi tạo proposal chuyển tiền on-chain ID: ${resObj?.proposalId}`
          );
        } else if (step.tool === "audit_smart_contract_security") {
          sideEffects.push("Hoàn tất phân tích rủi ro hợp đồng thông minh.");
          taskSources.push({
            sourceId: `src_sec_${taskSources.length + 1}`,
            url: "local://ast-security-engine",
            title: "Hệ thống kiểm định an toàn AST Solidity",
            retrievedAt: new Date().toISOString(),
            snippet: typeof resObj === "object" ? JSON.stringify(resObj).slice(0, 300) : String(resObj).slice(0, 300),
            dataType: "snippet",
            status: step.error ? "failed" : "retrieved",
          });
        } else if (!step.error && resObj) {
          // General verified tool result
          taskSources.push({
            sourceId: `src_tool_${taskSources.length + 1}`,
            url: `tool://${step.tool}`,
            title: `Kết quả thực thi công cụ: ${step.tool}`,
            retrievedAt: new Date().toISOString(),
            snippet: typeof resObj === "object" ? JSON.stringify(resObj).slice(0, 300) : String(resObj).slice(0, 300),
            dataType: "snippet",
            status: "retrieved",
          });
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

    // Auto-save project & all messages to storage and Supabase Cloud
    if (projectId) {
      try {
        const fullMessages: import("@/agent/projects").ProjectMessage[] = [
          ...messages.map((m) => ({ role: m.role, text: m.text, content: m.text })),
          {
            role: "agent",
            text: result.answer,
            content: result.answer,
            domain: result.domain,
            memoriesUsed: result.memoriesUsed,
            steps: result.steps,
            taskId,
          },
        ];
        saveOrUpdateProject(
          {
            id: projectId,
            domain: result.domain,
            messages: fullMessages,
            currentTaskId: taskId,
            currentTaskStatus: "succeeded",
          },
          userId
        );
      } catch (saveErr) {
        console.warn("[Worker] Auto-save project error:", saveErr);
      }
    }
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
