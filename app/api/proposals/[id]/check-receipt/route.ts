import { getAuthenticatedSession } from "@/agent/auth";
import { checkAndUpdateProposalReceipt } from "@/agent/proposals";

// GET or POST /api/proposals/[id]/check-receipt -> Check on-chain receipt from Base Sepolia RPC
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  try {
    const result = await checkAndUpdateProposalReceipt(id, userId);
    if (!result.success && result.unauthorized) {
      return Response.json({ error: result.error }, { status: 403 });
    }
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = getAuthenticatedSession(req);
  const userId = session?.userId || "guest_default";

  try {
    const result = await checkAndUpdateProposalReceipt(id, userId);
    if (!result.success && result.unauthorized) {
      return Response.json({ error: result.error }, { status: 403 });
    }
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
