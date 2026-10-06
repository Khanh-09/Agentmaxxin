import { getAuthenticatedSession } from "@/agent/auth";
import {
  listScopedMemories,
  saveExplicitMemory,
  saveProposedMemory,
  approveProposedMemory,
  updateMemoryItem,
  deleteMemoryItem,
  getUserTimeline,
  type MemoryScope,
  type MemoryStatus,
} from "@/agent/memory";

// GET /api/memory -> List scoped memories, proposals & timeline for authenticated user
export async function GET(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get("userId");
    const userId = queryUserId || session?.userId || "guest_default";

    const rawScope = url.searchParams.get("scope");
    const scope = rawScope && rawScope !== "all" ? (rawScope as MemoryScope) : undefined;
    const projectId = url.searchParams.get("projectId") || undefined;
    const rawStatus = url.searchParams.get("status");
    const status = rawStatus && rawStatus !== "all" ? (rawStatus as MemoryStatus) : undefined;
    const search = url.searchParams.get("q") || url.searchParams.get("search") || undefined;

    const memories = listScopedMemories(userId, { scope, projectId, status, search });
    const timeline = getUserTimeline(userId, 20);

    return Response.json({
      userId,
      isWallet: session?.isWallet || /^0x[a-fA-F0-9]{40}$/i.test(userId),
      memories,
      timeline,
      counts: {
        total: memories.length,
        active: memories.filter((m) => m.status === "active").length,
        proposed: memories.filter((m) => m.status === "proposed").length,
        superseded: memories.filter((m) => m.status === "superseded").length,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/memory -> Create explicit or proposed scoped memory
export async function POST(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const body = await req.json();
    const { key, value, scope, projectId, isProposed, method, sourceMessageId, userId: bodyUserId } = body;

    if (!key || !value) {
      return Response.json({ error: "Key and value are required." }, { status: 400 });
    }

    const userId = bodyUserId || session?.userId || "guest_default";

    if (isProposed || method === "inferred" || method === "inferred_proposal") {
      const result = saveProposedMemory({
        key,
        value,
        userId,
        scope,
        projectId,
        sourceMessageId,
      });
      return Response.json(result);
    } else {
      const result = saveExplicitMemory({
        key,
        value,
        userId,
        scope,
        projectId,
        sourceMessageId,
        extractedMethod: method || "manual_ui",
      });
      return Response.json(result);
    }
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/memory -> Edit memory value or approve proposed memory
export async function PUT(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const userId = session?.userId || "guest_default";
    const body = await req.json();
    const { id, value, action } = body;

    if (!id) {
      return Response.json({ error: "Memory ID is required." }, { status: 400 });
    }

    if (action === "approve") {
      const result = approveProposedMemory(id, userId);
      if (!result.success) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      return Response.json(result);
    }

    if (!value) {
      return Response.json({ error: "New value is required for editing." }, { status: 400 });
    }

    const result = updateMemoryItem(id, value, userId);
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/memory { id } or ?id=... -> Delete a memory item
export async function DELETE(req: Request) {
  try {
    const session = getAuthenticatedSession(req);
    const userId = session?.userId || "guest_default";
    const url = new URL(req.url);
    let id = url.searchParams.get("id") || undefined;
    let key = url.searchParams.get("key") || undefined;

    try {
      const body = await req.json();
      if (body?.id) id = body.id;
      if (body?.key) key = body.key;
    } catch {}

    if (id) {
      const result = deleteMemoryItem(id, userId);
      if (!result.success) {
        return Response.json({ error: result.error }, { status: 404 });
      }
      return Response.json({ success: true, id });
    }

    if (key) {
      // Legacy fallback
      const memories = listScopedMemories(userId);
      const target = memories.find((m) => m.key === key.toLowerCase().trim());
      if (target) {
        deleteMemoryItem(target.id, userId);
      }
      return Response.json({ success: true, key });
    }

    return Response.json({ error: "Memory ID or Key is required." }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
