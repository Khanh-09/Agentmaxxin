import { getAuthenticatedSession } from "@/agent/auth";
import { getTaskById } from "@/agent/tasks";

// GET /api/tasks/[id] -> Poll a specific task's real-time execution status
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getAuthenticatedSession(req);

    const { task, unauthorized } = getTaskById(id, session?.userId);

    if (unauthorized) {
      return Response.json(
        { error: "Access denied. You do not own this task." },
        { status: 403 }
      );
    }

    if (!task) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }

    return Response.json({ task });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
