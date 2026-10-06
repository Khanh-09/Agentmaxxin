import { analyzeAndProposeImprovements } from "@/agent/improve";
import { getExecutionLogs } from "@/agent/logger";

// GET /api/improve -> runs the optimization loop & returns proposals + benchmark report
export async function GET() {
  const logs = getExecutionLogs(20);
  const analysis = analyzeAndProposeImprovements();
  return Response.json({
    recentRunsCount: logs.length,
    analysis,
    recentRuns: logs,
  });
}
