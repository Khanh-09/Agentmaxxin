import { getAuthenticatedSession } from "@/agent/auth";
import { listProjects, saveOrUpdateProject, deleteProject } from "@/agent/projects";

// GET /api/projects -> List all projects for authenticated session user
export async function GET(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const projects = listProjects(session.userId);
    return Response.json({
      projects,
      session: { userId: session.userId, isWallet: session.isWallet, isAuthenticated: session.isAuthenticated },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/projects { id?, title?, objective?, status?, messages, currentTaskId?, currentTaskStatus?, summary? }
export async function POST(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return Response.json({ error: "Messages array is required." }, { status: 400 });
    }

    const res = saveOrUpdateProject(body, session.userId);
    if (res.status === "FORBIDDEN") {
      return Response.json(
        { error: "Access denied. You cannot modify a project owned by another user." },
        { status: 403 }
      );
    }

    return Response.json({ success: true, project: res.project });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/projects { id }
export async function DELETE(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();

    if (!body.id) {
      return Response.json({ error: "Project ID is required." }, { status: 400 });
    }

    const res = deleteProject(body.id, session.userId);
    if (res.status === "FORBIDDEN") {
      return Response.json(
        { error: "Access denied. You cannot delete a project owned by another user." },
        { status: 403 }
      );
    }
    if (res.status === "NOT_FOUND") {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
