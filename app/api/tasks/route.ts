import { getAuthenticatedSession } from "@/agent/auth";
import {
  createOrGetTask,
  updateTask,
  listTasksByProject,
  getTaskById,
} from "@/agent/tasks";

// GET /api/tasks?projectId=... -> List tasks for verified user session
export async function GET(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");

    if (taskId) {
      const { task, unauthorized } = getTaskById(taskId, session.userId);
      if (unauthorized) {
        return Response.json({ error: "Access denied." }, { status: 403 });
      }
      if (!task) {
        return Response.json({ error: "Task not found." }, { status: 404 });
      }
      return Response.json({ task });
    }

    if (projectId) {
      const tasks = listTasksByProject(projectId, session.userId);
      return Response.json({ tasks });
    }

    return Response.json({ error: "projectId or taskId is required." }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/tasks { projectId, objective, idempotencyKey } -> Create or dedup a task
export async function POST(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();

    if (!body.objective) {
      return Response.json({ error: "Objective is required." }, { status: 400 });
    }

    const projectId = body.projectId || `proj_${Date.now()}`;
    const { task, isDuplicate } = createOrGetTask({
      projectId,
      userId: session.userId,
      objective: body.objective,
      idempotencyKey: body.idempotencyKey,
    });

    return Response.json({ success: true, task, isDuplicate });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
