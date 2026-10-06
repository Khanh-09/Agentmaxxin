import { getAuthenticatedSession } from "@/agent/auth";
import { getProjectById, updateProjectHandoffSummary } from "@/agent/projects";
import type { StructuredHandoffSummary } from "@/agent/memory";

// GET /api/projects/[id]/handoff -> Retrieve project handoff summary
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  const res = getProjectById(id, userId);
  if (res.status === "FORBIDDEN") {
    return Response.json({ error: "Access denied." }, { status: 403 });
  }
  if (res.status === "NOT_FOUND" || !res.project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  return Response.json({
    projectId: id,
    handoffSummary: res.project.handoffSummary || null,
  });
}

// POST /api/projects/[id]/handoff -> Update or generate handoff summary
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  try {
    const body = await req.json();
    const decisions = Array.isArray(body.decisions)
      ? body.decisions
      : Array.isArray(body.decidedItems)
      ? body.decidedItems
      : [];

    const summary: StructuredHandoffSummary = {
      objective: body.objective || "Mục tiêu dự án",
      decisions,
      completedWork: Array.isArray(body.completedWork) ? body.completedWork : [],
      pendingWork: Array.isArray(body.pendingWork) ? body.pendingWork : [],
      relevantTasks: Array.isArray(body.relevantTasks) ? body.relevantTasks : [],
      lastUpdated: new Date().toISOString(),
    };

    const res = updateProjectHandoffSummary(id, summary, userId);
    if (res.status === "FORBIDDEN") {
      return Response.json({ error: "Access denied." }, { status: 403 });
    }
    if (res.status === "NOT_FOUND") {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }

    return Response.json({ success: true, handoffSummary: summary });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
