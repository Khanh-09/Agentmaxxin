import { getAuthenticatedSession } from "@/agent/auth";
import { getProjectById } from "@/agent/projects";
import { listTasksByProject } from "@/agent/tasks";

// GET /api/projects/[id] -> Get specific project + its task execution history
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getAuthenticatedSession(req);
    const userId = session?.userId || "guest_default";

    const { project, status } = getProjectById(id, userId);

    if (status === "FORBIDDEN") {
      return Response.json(
        { error: "Access denied. You do not own this project." },
        { status: 403 }
      );
    }
    if (status === "NOT_FOUND" || !project) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }

    const tasks = listTasksByProject(id, userId);

    return Response.json({ project, tasks });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
