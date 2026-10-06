import fs from "fs";
import { getStoragePath } from "@/lib/storage";

const TASKS_FILE = getStoragePath(".agent-tasks.json");

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type AgentTask = {
  id: string;
  projectId: string;
  userId: string;
  objective: string;
  status: TaskStatus;
  idempotencyKey?: string;
  steps?: Array<{ name: string; status: "pending" | "running" | "completed" | "failed"; detail?: string }>;
  result?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
};

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
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist tasks file:", err);
  }
}

/**
 * Creates or retrieves an existing deduplicated task using idempotencyKey.
 */
export function createOrGetTask(data: {
  projectId: string;
  userId: string;
  objective: string;
  idempotencyKey?: string;
}): { task: AgentTask; isDuplicate: boolean } {
  const all = readTasks();

  // Deduplication check
  if (data.idempotencyKey) {
    const existing = all.find(
      (t) => t.userId === data.userId && t.idempotencyKey === data.idempotencyKey
    );
    if (existing) {
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
    steps: [
      { name: "Phân tích yêu cầu & Lập kế hoạch", status: "pending" },
      { name: "Truy vấn Tools & Thu thập dữ liệu", status: "pending" },
      { name: "Tổng hợp thông tin & Kiểm chứng nguồn", status: "pending" },
      { name: "Đánh giá chất lượng & Trả kết quả", status: "pending" },
    ],
    createdAt: new Date().toISOString(),
  };

  all.unshift(newTask);
  writeTasks(all);
  return { task: newTask, isDuplicate: false };
}

/**
 * Updates a task with step status, completion, duration, or error.
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
      updates.status === "cancelled") &&
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
  };

  all[index] = updated;
  writeTasks(all);
  return updated;
}

/**
 * Retrieve task by ID with ownership enforcement.
 */
export function getTaskById(taskId: string, userId?: string): { task: AgentTask | null; unauthorized?: boolean } {
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
 * Cancel an in-flight task.
 */
export function cancelTask(taskId: string, userId: string): AgentTask | null {
  return updateTask(
    taskId,
    {
      status: "cancelled",
      error: "Tác vụ đã được hủy bởi người dùng.",
      completedAt: new Date().toISOString(),
    },
    userId
  );
}
