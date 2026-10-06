import { getAuthenticatedSession } from "@/agent/auth";
import { getProposalById } from "@/agent/proposals";

// GET /api/proposals/[id] -> Get proposal details with authorization check
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  const result = getProposalById(id, userId);
  if (result.notFound) {
    return Response.json({ error: result.error }, { status: 404 });
  }
  if (result.unauthorized) {
    return Response.json({ error: result.error }, { status: 403 });
  }

  return Response.json({ proposal: result.proposal });
}
