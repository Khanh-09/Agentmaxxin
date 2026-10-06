import { runGraph } from "@/agent/graph";
import {
  updateTask,
  getTaskById,
  isTaskCancelled,
  registerTaskAbortController,
  unregisterTaskAbortController,
} from "@/agent/tasks";

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

    // Inspect tool steps for recorded side-effects and unreversible operations
    if (result.steps && Array.isArray(result.steps)) {
      for (const step of result.steps) {
        if (step.tool === "get_web_search") {
          sideEffects.push(`Thu thập ${step.result?.sourceCount || 1} nguồn web.`);
        } else if (step.tool === "prepare_transfer") {
          unreversibleActions.push(
            `Đã khởi tạo proposal chuyển tiền on-chain ID: ${step.result?.proposalId}`
          );
        } else if (step.tool === "audit_smart_contract_security") {
          sideEffects.push("Hoàn tất phân tích rủi ro hợp đồng thông minh.");
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Transition task to succeeded (guarded against cancelled state)
    updateTask(
      taskId,
      {
        status: "succeeded",
        result: result.answer,
        steps: result.steps,
        sideEffects,
        unreversibleActions,
        durationMs,
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
        completedAt: new Date().toISOString(),
      },
      userId
    );
  } finally {
    unregisterTaskAbortController(taskId);
  }
}
