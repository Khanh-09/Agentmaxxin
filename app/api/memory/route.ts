import { getDetailedUserFacts, removeUserFact, saveUserFact } from "@/agent/memory";

// GET /api/memory -> List all stored memories & preferences
export async function GET() {
  const memories = getDetailedUserFacts();
  return Response.json({ memories });
}

// POST /api/memory { key, value } -> Save or update a memory/fact
export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();
    if (!key || !value) {
      return Response.json({ error: "Key and value are required." }, { status: 400 });
    }
    const result = saveUserFact(key, value);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/memory { key } -> Delete a memory/fact
export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();
    if (!key) {
      return Response.json({ error: "Key is required." }, { status: 400 });
    }
    const result = removeUserFact(key);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
