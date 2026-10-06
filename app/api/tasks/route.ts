import { getAuthenticatedSession } from "@/agent/auth";
import {
  createOrGetTask,
  listTasksByProject,
  getTaskById,
} from "@/agent/tasks";
import { executeBackgroundTask } from "@/agent/task-worker";

// GET /api/tasks?projectId=... | taskId=... -> List or poll task status
export async function GET(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");

    if (taskId) {
      const { task, unauthorized } = getTaskById(taskId, session?.userId);
      if (unauthorized) {
        return Response.json({ error: "Access denied. You do not own this task." }, { status: 403 });
      }
      if (!task) {
        return Response.json({ error: "Task not found." }, { status: 404 });
      }
      return Response.json({ task });
    }

    if (projectId) {
      const tasks = listTasksByProject(projectId, session?.userId || "guest_default");
      return Response.json({ tasks });
    }

    return Response.json({ error: "projectId or taskId is required." }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/tasks { projectId, objective, messages, idempotencyKey } -> Async non-blocking task creation
export async function POST(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const { projectId, objective, messages, idempotencyKey } = body;

    if (!objective && (!messages || messages.length === 0)) {
      return Response.json({ error: "Objective or messages array is required." }, { status: 400 });
    }

    const effectiveMessages = messages || [{ role: "user", text: objective }];
    const effectiveObjective = objective || effectiveMessages[effectiveMessages.length - 1].text;
    const effectiveProjId = projectId || `proj_${Date.now()}`;

    // Atomic creation with idempotency and payload conflict detection
    const result = createOrGetTask({
      projectId: effectiveProjId,
      userId: session?.userId || "guest_default",
      objective: effectiveObjective,
      idempotencyKey,
      payload: effectiveMessages,
    });

    if (result.conflict) {
      return Response.json(
        { error: result.error || "Idempotency key mismatch: payload differs from original request." },
        { status: 409 }
      );
    }

    const { task, isDuplicate } = result;
    if (!task) {
      return Response.json({ error: "Failed to initialize task." }, { status: 500 });
    }

    // If new task, dispatch background execution asynchronously (decoupled from HTTP request)
    if (!isDuplicate && task.status === "queued") {
      const baseUrl = new URL(req.url).origin;
      // Fire and forget - background worker executes independently
      executeBackgroundTask({
        taskId: task.id,
        projectId: effectiveProjId,
        userId: session?.userId || "guest_default",
        messages: effectiveMessages,
        baseUrl,
      }).catch((workerErr) => {
        console.error(`[Worker Error] Task ${task.id} failure:`, workerErr);
      });
    }

    return Response.json({
      success: true,
      taskId: task.id,
      task,
      status: task.status,
      isDuplicate,
      projectId: effectiveProjId,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
