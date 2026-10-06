import { getAuthenticatedSession } from "@/agent/auth";
import { cancelTask } from "@/agent/tasks";

// POST /api/tasks/[id]/cancel -> Cancel an in-flight task
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getAuthenticatedSession(req);

    const task = cancelTask(id, session.userId);
    if (!task) {
      return Response.json(
        { error: "Task not found or access denied." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, task });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
