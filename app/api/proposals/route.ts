import { getAuthenticatedSession } from "@/agent/auth";
import { createTransferProposal, listProposals } from "@/agent/proposals";

// GET /api/proposals -> List all proposals for the active user/wallet
export async function GET(req: Request) {
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";
  const proposals = listProposals(userId);
  return Response.json({ proposals, userId });
}

// POST /api/proposals -> Create a transfer proposal
export async function POST(req: Request) {
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  try {
    const body = await req.json();
    const { to, amountEth, from, projectId, taskId } = body;

    const result = await createTransferProposal({
      from: from || (session?.isWallet ? session.address : undefined),
      to,
      amountEth,
      userId,
      projectId,
      taskId,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ success: true, proposal: result.proposal });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to create proposal." }, { status: 500 });
  }
}
