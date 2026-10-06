import { getProjectById } from "@/agent/projects";

// GET /api/projects/[id]?userId=... -> Get specific project
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "default_user";
    const project = getProjectById(id, userId);
    if (!project) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    return Response.json({ project });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
