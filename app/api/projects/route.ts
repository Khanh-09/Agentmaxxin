import { listProjects, saveOrUpdateProject, deleteProject } from "@/agent/projects";

// GET /api/projects?userId=... -> List all projects for user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "default_user";
    const projects = listProjects(userId);
    return Response.json({ projects });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/projects { id?, title?, objective?, status?, messages, summary?, userId? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId || "default_user";
    if (!body.messages || !Array.isArray(body.messages)) {
      return Response.json({ error: "Messages array is required." }, { status: 400 });
    }
    const project = saveOrUpdateProject(body, userId);
    return Response.json({ success: true, project });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/projects { id, userId? }
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId || "default_user";
    if (!body.id) {
      return Response.json({ error: "Project ID is required." }, { status: 400 });
    }
    const success = deleteProject(body.id, userId);
    return Response.json({ success });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
