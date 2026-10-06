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
      userId: session?.userId || "guest_default",
      isWallet: session?.isWallet || false,
      isAuthenticated: session?.isAuthenticated || false,
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
  const userId = session?.userId || "guest_default";
  const body = await req.json();
  const { messages, projectId, idempotencyKey } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Valid messages array is required." }, { status: 400 });
  }

  const latestUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.text || "Tác vụ nghiên cứu";
  const effectiveProjId = projectId || `proj_${Date.now()}`;

  // Task creation & Deduplication
  const taskResult = createOrGetTask({
    projectId: effectiveProjId,
    userId,
    objective: latestUserMsg,
    idempotencyKey,
    payload: messages,
  });

  if (taskResult.conflict) {
    return Response.json(
      { error: taskResult.error || "Idempotency key mismatch: payload differs from original request." },
      { status: 409 }
    );
  }

  const { task, isDuplicate } = taskResult;
  if (!task) {
    return Response.json({ error: "Failed to create task." }, { status: 500 });
  }

  // If duplicate and already succeeded or running, return without re-running duplicate work
  if (isDuplicate && task.status === "succeeded") {
    return Response.json({
      answer: task.result || "",
      steps: task.toolSteps || task.steps || [],
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
    userId
  );

  const startTime = Date.now();

  try {
    const result = await runGraph(messages, { baseUrl: new URL(req.url).origin, userId });
    const durationMs = Date.now() - startTime;

    // Transition task to succeeded
    const succeededTask = updateTask(
      task.id,
      {
        status: "succeeded",
        result: result.answer,
        toolSteps: result.steps,
        steps: [
          { name: "Phân tích yêu cầu & Lập kế hoạch", status: "completed" },
          { name: "Truy vấn Tools & Thu thập dữ liệu", status: "completed" },
          { name: "Tổng hợp thông tin & Kiểm chứng nguồn", status: "completed" },
          { name: "Đánh giá chất lượng & Trả kết quả", status: "completed" },
        ],
        durationMs,
        completedAt: new Date().toISOString(),
      },
      userId
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
      userId
    );

    return Response.json({ error: errMsg, task: failedTask || runningTask }, { status: 500 });
  }
}
