import { getAuthenticatedSession } from "@/agent/auth";
import { cancelTask, getTaskById } from "@/agent/tasks";

// POST /api/tasks/[id]/cancel -> Cancel an in-flight task with authorization check
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getAuthenticatedSession(req);

    const { task: existingTask, unauthorized } = getTaskById(id, session?.userId);
    if (unauthorized) {
      return Response.json(
        { error: "Access denied. You do not own this task." },
        { status: 403 }
      );
    }
    if (!existingTask) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }

    const task = cancelTask(id, session?.userId || "guest_default");

    return Response.json({
      success: true,
      task,
      sideEffects: task?.sideEffects || [],
      unreversibleActions: task?.unreversibleActions || [],
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
