import { getAuthenticatedSession } from "@/agent/auth";
import {
  getDetailedUserFacts,
  removeUserFact,
  saveUserFact,
  getUserTimeline,
} from "@/agent/memory";

// GET /api/memory -> List all stored memories, facts & interaction timeline for active user/wallet
export async function GET(req: Request) {
  const session = getAuthenticatedSession(req);
  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("userId");
  const userId = queryUserId || session?.userId || "guest_default";

  const memories = getDetailedUserFacts(userId);
  const timeline = getUserTimeline(userId, 20);

  return Response.json({
    userId,
    isWallet: session?.isWallet || /^0x[a-fA-F0-9]{40}$/i.test(userId),
    memories,
    timeline,
  });
}

// POST /api/memory { key, value, userId? } -> Save or update a memory/fact for user/wallet
export async function POST(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const { key, value, userId: bodyUserId } = body;

    if (!key || !value) {
      return Response.json({ error: "Key and value are required." }, { status: 400 });
    }

    const userId = bodyUserId || session?.userId || "guest_default";
    const result = saveUserFact(key, value, userId);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/memory { key, userId? } -> Delete a memory/fact
export async function DELETE(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const { key, userId: bodyUserId } = body;

    if (!key) {
      return Response.json({ error: "Key is required." }, { status: 400 });
    }

    const userId = bodyUserId || session?.userId || "guest_default";
    const result = removeUserFact(key, userId);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
