import { getAuthenticatedSession } from "@/agent/auth";
import { listProjects, saveOrUpdateProject, deleteProject, type ProjectStatus } from "@/agent/projects";

// GET /api/projects -> List all projects for authenticated session user with search, filter, and pagination
export async function GET(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const userId = session?.userId || "guest_default";
    const url = new URL(req.url);

    const search = url.searchParams.get("search") || url.searchParams.get("q") || undefined;
    const status = (url.searchParams.get("status") as ProjectStatus) || undefined;
    const domain = url.searchParams.get("domain") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const result = listProjects(userId, { search, status, domain, page, limit });

    return Response.json({
      projects: result.projects,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit,
      },
      session: {
        userId,
        isWallet: session?.isWallet || false,
        isAuthenticated: session?.isAuthenticated || false,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/projects { id?, title?, objective?, status?, messages, currentTaskId?, currentTaskStatus?, summary?, handoffSummary? }
export async function POST(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const userId = session?.userId || "guest_default";
    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return Response.json({ error: "Messages array is required." }, { status: 400 });
    }

    const res = saveOrUpdateProject(body, userId);
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
    const userId = session?.userId || "guest_default";
    const body = await req.json();

    if (!body.id) {
      return Response.json({ error: "Project ID is required." }, { status: 400 });
    }

    const res = deleteProject(body.id, userId);
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
