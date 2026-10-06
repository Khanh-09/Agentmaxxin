import fs from "fs";
import { getStoragePath } from "@/lib/storage";
import { Step } from "./agent";
import { EvaluationResult } from "./evaluate";

const RUNS_LOG_FILE = getStoragePath(".agent-runs.jsonl");


export type ExecutionLog = {
  id: string;
  timestamp: string;
  userMessage: string;
  domain: string;
  toolsCalled: string[];
  steps: Step[];
  answer: string;
  evaluation: EvaluationResult;
  userFeedback?: {
    approved: boolean;
    correction?: string;
  };
};

export function logExecution(
  userMessage: string,
  domain: string,
  steps: Step[],
  answer: string,
  evaluation: EvaluationResult
): string {
  const id = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: ExecutionLog = {
    id,
    timestamp: new Date().toISOString(),
    userMessage,
    domain,
    toolsCalled: steps.map((s) => s.tool),
    steps,
    answer,
    evaluation,
  };

  try {
    fs.appendFileSync(RUNS_LOG_FILE, JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    console.error("Failed to write run log:", err);
  }

  return id;
}

export function getExecutionLogs(limit = 50): ExecutionLog[] {
  try {
    if (!fs.existsSync(RUNS_LOG_FILE)) return [];
    const lines = fs.readFileSync(RUNS_LOG_FILE, "utf8").trim().split("\n");
    return lines
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
}

export const getRuns = getExecutionLogs;

