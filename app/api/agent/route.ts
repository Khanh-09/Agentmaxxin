import { getAuthenticatedSession } from "@/agent/auth";
import { MODEL, runGraph } from "@/agent/graph";
import { createOrGetTask, updateTask } from "@/agent/tasks";
import { tools } from "@/agent/tools";

// GET /api/agent -> setup status + the list of tools (shown on the page)
export async function GET(req: Request) {
  const session = getAuthenticatedSession(req);
  return Response.json({
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: MODEL,
    session: {
      userId: session.userId,
      isWallet: session.isWallet,
      isAuthenticated: session.isAuthenticated,
    },
    tools: tools.map((t) => ({ name: t.name, description: t.description, category: t.category })),
  });
}

// POST /api/agent { messages, projectId?, idempotencyKey?, taskId? } -> the agent's answer + the tools it used
export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Add GEMINI_API_KEY to your .env file, then restart `npm run dev`." },
      { status: 500 }
    );
  }

  const session = getAuthenticatedSession(req);
  const body = await req.json();
  const { messages, projectId, idempotencyKey } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Valid messages array is required." }, { status: 400 });
  }

  const latestUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.text || "Tác vụ nghiên cứu";
  const effectiveProjId = projectId || `proj_${Date.now()}`;

  // Task creation & Deduplication
  const { task, isDuplicate } = createOrGetTask({
    projectId: effectiveProjId,
    userId: session.userId,
    objective: latestUserMsg,
    idempotencyKey,
  });

  // If duplicate and already succeeded or running, return without re-running duplicate work
  if (isDuplicate && task.status === "succeeded") {
    return Response.json({
      answer: task.result || "",
      steps: task.steps || [],
      task,
      projectId: task.projectId,
      isDuplicate: true,
    });
  }

  // Mark task running
  const runningTask = updateTask(
    task.id,
    {
      status: "running",
      startedAt: new Date().toISOString(),
    },
    session.userId
  );

  const startTime = Date.now();

  try {
    const result = await runGraph(messages, { baseUrl: new URL(req.url).origin });
    const durationMs = Date.now() - startTime;

    // Transition task to succeeded
    const succeededTask = updateTask(
      task.id,
      {
        status: "succeeded",
        result: result.answer,
        steps: result.steps,
        durationMs,
        completedAt: new Date().toISOString(),
      },
      session.userId
    );

    return Response.json({
      ...result,
      task: succeededTask || runningTask,
      projectId: effectiveProjId,
    });
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;

    // Transition task to failed
    const failedTask = updateTask(
      task.id,
      {
        status: "failed",
        error: errMsg,
        durationMs,
        completedAt: new Date().toISOString(),
      },
      session.userId
    );

    return Response.json({ error: errMsg, task: failedTask || runningTask }, { status: 500 });
  }
}
