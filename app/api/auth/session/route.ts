import { createSessionToken, verifySessionToken, getAuthenticatedSession } from "@/agent/auth";

// GET /api/auth/session -> Checks existing session or returns a new guest token
export async function GET(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    return Response.json({
      success: true,
      userId: session.userId,
      isWallet: session.isWallet,
      isAuthenticated: session.isAuthenticated,
      token: session.token,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/auth/session -> Issues a verified session token for wallet or custom guest
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, guestId } = body;

    let targetUser = "";
    let isWallet = false;

    if (address && typeof address === "string" && address.startsWith("0x")) {
      targetUser = address.toLowerCase();
      isWallet = true;
    } else if (guestId && typeof guestId === "string") {
      targetUser = `guest_${guestId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}`;
      isWallet = false;
    } else {
      targetUser = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      isWallet = false;
    }

    const token = createSessionToken(targetUser, isWallet, isWallet ? targetUser : undefined);

    return Response.json({
      success: true,
      userId: targetUser,
      isWallet,
      token,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
