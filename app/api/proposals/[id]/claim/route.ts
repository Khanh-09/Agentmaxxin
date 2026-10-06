import { getAuthenticatedSession } from "@/agent/auth";
import { claimProposalForSigning } from "@/agent/proposals";

// POST /api/proposals/[id]/claim -> Claim/Lock proposal before opening browser wallet for signing
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  try {
    const body = await req.json().catch(() => ({}));
    const claimSessionId = body.claimSessionId;

    const result = claimProposalForSigning(id, userId, claimSessionId);
    if (!result.success) {
      if (result.unauthorized) {
        return Response.json({ error: result.error }, { status: 403 });
      }
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ success: true, proposal: result.proposal });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
