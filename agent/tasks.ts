import fs from "fs";
import crypto from "crypto";
import { getStoragePath } from "@/lib/storage";

const TASKS_FILE = getStoragePath(".agent-tasks.json");

export type TaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "interrupted";

export type AgentTask = {
  id: string;
  projectId: string;
  userId: string;
  objective: string;
  status: TaskStatus;
  idempotencyKey?: string;
  payloadHash?: string;
  steps?: Array<{
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    detail?: string;
  }>;
  toolSteps?: Array<{ tool: string; args: any; result: any; error?: boolean }>;
  result?: string;
  error?: string;
  sideEffects?: string[];
  unreversibleActions?: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  recoveredFromCrash?: boolean;
};

// In-memory active abort controllers for live worker tasks
const activeAbortControllers = new Map<string, AbortController>();

function readTasks(): AgentTask[] {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const raw = fs.readFileSync(TASKS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Failed to read tasks file:", err);
  }
  return [];
}

function writeTasks(tasks: AgentTask[]) {
  try {
    // Atomic file write using temp file
    const tempFile = `${TASKS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(tasks, null, 2), "utf8");
    fs.renameSync(tempFile, TASKS_FILE);
  } catch (err) {
    console.error("Failed to persist tasks file:", err);
  }
}

/**
 * Recovers interrupted tasks if the server was restarted while tasks were queued or running.
 * Only targets stale tasks older than staleThresholdMs (default 2 minutes) to prevent interfering with active tasks.
 */
export function recoverInterruptedTasks(staleThresholdMs = 2 * 60 * 1000): number {
  const all = readTasks();
  let recoveredCount = 0;
  const now = Date.now();

  const updated = all.map((t) => {
    const taskAge = now - new Date(t.createdAt).getTime();
    if ((t.status === "running" || t.status === "queued") && taskAge > staleThresholdMs) {
      recoveredCount++;
      return {
        ...t,
        status: "interrupted" as TaskStatus,
        error: "Tác vụ bị gián đoạn do server restart. Sẵn sàng thử lại.",
        completedAt: new Date(now).toISOString(),
        recoveredFromCrash: true,
      };
    }
    return t;
  });

  if (recoveredCount > 0) {
    writeTasks(updated);
  }
  return recoveredCount;
}


/**
 * Computes deterministic hash of a request payload.
 */
export function hashPayload(payload: any): string {
  const normalized = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Creates or retrieves an existing deduplicated task using idempotencyKey and payloadHash.
 * Returns conflict if same idempotencyKey is used with different payload.
 */
export function createOrGetTask(data: {
  projectId: string;
  userId: string;
  objective: string;
  idempotencyKey?: string;
  payload?: any;
}): { task: AgentTask | null; isDuplicate: boolean; conflict?: boolean; error?: string } {
  const all = readTasks();
  const payloadHash = data.payload ? hashPayload(data.payload) : undefined;

  // Deduplication & Conflict check
  if (data.idempotencyKey) {
    const existing = all.find(
      (t) => t.userId === data.userId && t.idempotencyKey === data.idempotencyKey
    );
    if (existing) {
      if (payloadHash && existing.payloadHash && existing.payloadHash !== payloadHash) {
        return {
          task: null,
          isDuplicate: false,
          conflict: true,
          error: "Idempotency key mismatch: payload differs from original request.",
        };
      }
      return { task: existing, isDuplicate: true };
    }
  }

  const newTask: AgentTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    projectId: data.projectId,
    userId: data.userId,
    objective: data.objective,
    status: "queued",
    idempotencyKey: data.idempotencyKey,
    payloadHash,
    steps: [
      { name: "Phân tích yêu cầu & Lập kế hoạch", status: "pending" },
      { name: "Truy vấn Tools & Thu thập dữ liệu", status: "pending" },
      { name: "Tổng hợp thông tin & Kiểm chứng nguồn", status: "pending" },
      { name: "Đánh giá chất lượng & Trả kết quả", status: "pending" },
    ],
    sideEffects: [],
    unreversibleActions: [],
    createdAt: new Date().toISOString(),
  };

  all.unshift(newTask);
  writeTasks(all);
  return { task: newTask, isDuplicate: false };
}

/**
 * Updates a task with step status, completion, duration, or error.
 * Enforces cancellation safeguard: cancelled task CANNOT be overwritten by succeeded.
 */
export function updateTask(
  taskId: string,
  updates: Partial<AgentTask>,
  userId?: string
): AgentTask | null {
  const all = readTasks();
  const index = all.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  // Verify ownership if userId is supplied
  if (userId && all[index].userId !== userId) {
    return null;
  }

  const prev = all[index];

  // CRITICAL RULE: If task is already cancelled, DO NOT overwrite with succeeded or running
  if (prev.status === "cancelled" && updates.status !== "cancelled") {
    // Preserve side-effects if any occurred before abort
    if (updates.sideEffects || updates.unreversibleActions) {
      const mergedSideEffects = Array.from(
        new Set([...(prev.sideEffects || []), ...(updates.sideEffects || [])])
      );
      const mergedUnreversibles = Array.from(
        new Set([...(prev.unreversibleActions || []), ...(updates.unreversibleActions || [])])
      );
      all[index] = {
        ...prev,
        sideEffects: mergedSideEffects,
        unreversibleActions: mergedUnreversibles,
      };
      writeTasks(all);
    }
    return all[index];
  }

  const now = new Date();
  let startedAt = updates.startedAt || prev.startedAt;
  let completedAt = updates.completedAt || prev.completedAt;
  let durationMs = updates.durationMs || prev.durationMs;

  if (updates.status === "running" && !startedAt) {
    startedAt = now.toISOString();
  }

  if (
    (updates.status === "succeeded" ||
      updates.status === "failed" ||
      updates.status === "cancelled" ||
      updates.status === "interrupted") &&
    !completedAt
  ) {
    completedAt = now.toISOString();
    if (startedAt) {
      durationMs = now.getTime() - new Date(startedAt).getTime();
    }
  }

  const updated: AgentTask = {
    ...prev,
    ...updates,
    startedAt,
    completedAt,
    durationMs,
    sideEffects: updates.sideEffects || prev.sideEffects || [],
    unreversibleActions: updates.unreversibleActions || prev.unreversibleActions || [],
  };

  all[index] = updated;
  writeTasks(all);
  return updated;
}

/**
 * Retrieve task by ID with ownership enforcement.
 */
export function getTaskById(
  taskId: string,
  userId?: string
): { task: AgentTask | null; unauthorized?: boolean } {
  const all = readTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return { task: null };

  if (userId && task.userId !== userId) {
    return { task: null, unauthorized: true };
  }

  return { task };
}

/**
 * List all tasks for a specific project and verified user.
 */
export function listTasksByProject(projectId: string, userId: string): AgentTask[] {
  const all = readTasks();
  return all
    .filter((t) => t.projectId === projectId && t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Register AbortController for a running task in memory.
 */
export function registerTaskAbortController(taskId: string, controller: AbortController) {
  activeAbortControllers.set(taskId, controller);
}

/**
 * Remove AbortController for a completed or terminated task.
 */
export function unregisterTaskAbortController(taskId: string) {
  activeAbortControllers.delete(taskId);
}

/**
 * Checks if a task is cancelled in store or memory.
 */
export function isTaskCancelled(taskId: string): boolean {
  const { task } = getTaskById(taskId);
  return task?.status === "cancelled";
}

/**
 * Cancel an in-flight task immediately, aborting workers and recording unreversible side-effects.
 */
export function cancelTask(taskId: string, userId: string): AgentTask | null {
  const { task, unauthorized } = getTaskById(taskId, userId);
  if (unauthorized || !task) {
    return null;
  }

  // Trigger in-memory AbortSignal if actively executing
  const controller = activeAbortControllers.get(taskId);
  if (controller) {
    try {
      controller.abort();
    } catch {}
    activeAbortControllers.delete(taskId);
  }

  // Collect side-effects executed so far
  const sideEffects = [...(task.sideEffects || [])];
  const unreversibles = [...(task.unreversibleActions || [])];

  return updateTask(
    taskId,
    {
      status: "cancelled",
      error: "Tác vụ đã được hủy bởi người dùng.",
      completedAt: new Date().toISOString(),
      sideEffects,
      unreversibleActions: unreversibles,
    },
    userId
  );
}
