import { getAuthenticatedSession } from "@/agent/auth";
import { submitProposalTxHash } from "@/agent/proposals";

// POST /api/proposals/[id]/submit-tx -> Submit txHash from browser wallet
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  try {
    const body = await req.json();
    const { txHash, from } = body;

    if (!txHash) {
      return Response.json({ error: "Transaction hash is required." }, { status: 400 });
    }

    const result = submitProposalTxHash(id, txHash, from, userId);
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
