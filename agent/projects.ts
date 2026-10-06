import fs from "fs";
import { getStoragePath } from "@/lib/storage";

const PROJECTS_FILE = getStoragePath(".agent-projects.json");

export type ProjectTask = {
  id: string;
  userId: string;
  title: string;
  objective: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  domain: string;
  messages: Array<{ role: "user" | "agent"; text: string; steps?: any[]; error?: boolean; domain?: string }>;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

function readProjects(): ProjectTask[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const raw = fs.readFileSync(PROJECTS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Failed to read projects file:", err);
  }
  return [];
}

function writeProjects(projects: ProjectTask[]) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist projects file:", err);
  }
}

export function listProjects(userId = "default_user"): ProjectTask[] {
  const all = readProjects();
  return all
    .filter((p) => !p.userId || p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getProjectById(id: string, userId = "default_user"): ProjectTask | null {
  const all = readProjects();
  return all.find((p) => p.id === id && (!p.userId || p.userId === userId)) || null;
}

export function saveOrUpdateProject(
  data: {
    id?: string;
    title?: string;
    objective?: string;
    status?: "ACTIVE" | "COMPLETED" | "PAUSED";
    domain?: string;
    messages: Array<{ role: "user" | "agent"; text: string; steps?: any[]; error?: boolean; domain?: string }>;
    summary?: string;
  },
  userId = "default_user"
): ProjectTask {
  const all = readProjects();
  const existingIdx = data.id ? all.findIndex((p) => p.id === data.id) : -1;

  const firstUserMsg = data.messages.find((m) => m.role === "user")?.text || "Dự án mới";
  const title = data.title || (firstUserMsg.length > 45 ? firstUserMsg.slice(0, 45) + "..." : firstUserMsg);
  const objective = data.objective || firstUserMsg;
  const domain = data.domain || data.messages.find((m) => m.domain)?.domain || "general";

  if (existingIdx >= 0) {
    const updated: ProjectTask = {
      ...all[existingIdx],
      title,
      objective,
      status: data.status || all[existingIdx].status || "ACTIVE",
      domain,
      messages: data.messages,
      summary: data.summary || all[existingIdx].summary,
      updatedAt: new Date().toISOString(),
    };
    all[existingIdx] = updated;
    writeProjects(all);
    return updated;
  } else {
    const newProj: ProjectTask = {
      id: data.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title,
      objective,
      status: data.status || "ACTIVE",
      domain,
      messages: data.messages,
      summary: data.summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.unshift(newProj);
    writeProjects(all);
    return newProj;
  }
}

export function deleteProject(id: string, userId = "default_user"): boolean {
  const all = readProjects();
  const filtered = all.filter((p) => !(p.id === id && (!p.userId || p.userId === userId)));
  if (filtered.length !== all.length) {
    writeProjects(filtered);
    return true;
  }
  return false;
}
