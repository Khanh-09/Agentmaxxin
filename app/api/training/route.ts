import { calculateIntelligenceMetrics, getExemplars } from "@/agent/training";
import { getKnowledgeBase, getAgentLearnings, addKnowledgeItem } from "@/agent/knowledge";

// GET /api/training -> Retrieve learning intelligence metrics, knowledge items, and reflection rules
export async function GET() {
  const metrics = calculateIntelligenceMetrics();
  const knowledgeBase = getKnowledgeBase();
  const learnings = getAgentLearnings();
  const exemplars = getExemplars();

  return Response.json({
    metrics,
    knowledgeCount: knowledgeBase.length,
    knowledgeBase: knowledgeBase.slice(0, 10),
    learnings,
    exemplars: exemplars.slice(0, 5),
  });
}

// POST /api/training -> Ingest knowledge or train custom concept
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { domain = "general", title, content, tags = [] } = body;

    if (!title || !content) {
      return Response.json({ error: "Missing required fields: 'title' and 'content'." }, { status: 400 });
    }

    const item = addKnowledgeItem(domain, title, content, tags);
    return Response.json({ success: true, message: `Learned '${title}' into domain '${domain}'`, item });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
