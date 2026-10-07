import fs from "fs";
import { getStoragePath } from "@/lib/storage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { StructuredHandoffSummary } from "./memory";

const PROJECTS_FILE = getStoragePath(".agent-projects.json");

export type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED";

// Asynchronous background sync to Supabase Cloud
async function syncProjectToSupabase(project: ProjectTask) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    // 1. Sync project
    await supabase.from("projects").upsert({
      id: project.id,
      user_id: project.userId,
      title: project.title,
      objective: project.objective,
      status: project.status,
      handoff_summary: project.handoffSummary || null,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    });

    // 2. Sync messages
    if (project.messages && project.messages.length > 0) {
      const msgRows = project.messages.map((m) => ({
        id: m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        project_id: project.id,
        user_id: project.userId,
        role: m.role,
        content: m.content || m.text || "",
        created_at: m.createdAt || new Date().toISOString(),
      }));
      await supabase.from("messages").upsert(msgRows);
    }
  } catch (err) {
    console.error("Supabase project sync error:", err);
  }
}

async function syncDeleteProjectFromSupabase(projectId: string) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("messages").delete().eq("project_id", projectId);
    await supabase.from("projects").delete().eq("id", projectId);
  } catch (err) {
    console.error("Supabase project delete sync error:", err);
  }
}

export type ProjectMessage = {
  id?: string;
  role: "user" | "agent";
  text: string;
  content?: string;
  createdAt?: string;
  taskId?: string;
  memoriesUsed?: string[];
  steps?: any[];
  error?: boolean;
  domain?: string;
};

export type ProjectTask = {
  id: string;
  userId: string;
  title: string;
  objective: string;
  status: ProjectStatus;
  domain: string;
  messages: ProjectMessage[];
  currentTaskId?: string;
  currentTaskStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  summary?: string;
  handoffSummary?: StructuredHandoffSummary;
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
    const tempFile = `${PROJECTS_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(projects, null, 2), "utf8");
    fs.renameSync(tempFile, PROJECTS_FILE);
  } catch (err) {
    console.error("Failed to persist projects file:", err);
  }
}

export function listProjects(
  userId: string,
  filter?: {
    search?: string;
    status?: ProjectStatus;
    domain?: string;
    page?: number;
    limit?: number;
  }
): { projects: ProjectTask[]; total: number; page: number; totalPages: number } {
  const all = readProjects();
  const cleanUser = userId.toLowerCase().trim();

  let userProjects = all
    .filter((p) => p.userId && p.userId.toLowerCase().trim() === cleanUser)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (filter?.status) {
    userProjects = userProjects.filter((p) => p.status === filter.status);
  }
  if (filter?.domain) {
    userProjects = userProjects.filter((p) => p.domain === filter.domain);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    userProjects = userProjects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.objective.toLowerCase().includes(q) ||
        p.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }

  const total = userProjects.length;
  const page = filter?.page && filter.page > 0 ? filter.page : 1;
  const limit = filter?.limit && filter.limit > 0 ? filter.limit : 50;
  const totalPages = Math.ceil(total / limit) || 1;

  const paginated = userProjects.slice((page - 1) * limit, page * limit);
  return { projects: paginated, total, page, totalPages };
}

export function getProjectById(
  id: string,
  userId: string
): { project: ProjectTask | null; status: "OK" | "NOT_FOUND" | "FORBIDDEN" } {
  const all = readProjects();
  const project = all.find((p) => p.id === id);
  if (!project) {
    return { project: null, status: "NOT_FOUND" };
  }

  const cleanUser = userId.toLowerCase().trim();
  if (project.userId.toLowerCase().trim() !== cleanUser) {
    return { project: null, status: "FORBIDDEN" };
  }

  return { project, status: "OK" };
}

export function saveOrUpdateProject(
  data: {
    id?: string;
    title?: string;
    objective?: string;
    status?: ProjectStatus;
    domain?: string;
    messages: ProjectMessage[];
    currentTaskId?: string;
    currentTaskStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    summary?: string;
    handoffSummary?: StructuredHandoffSummary;
  },
  userId: string
): { project: ProjectTask | null; status: "OK" | "FORBIDDEN" } {
  const all = readProjects();
  const cleanUser = userId.toLowerCase().trim();
  const existingIdx = data.id ? all.findIndex((p) => p.id === data.id) : -1;
  const now = new Date().toISOString();

  // Normalize messages to ensure id, createdAt and content exist
  const formattedMessages: ProjectMessage[] = data.messages.map((m, idx) => ({
    id: m.id || `msg_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    role: m.role,
    text: m.text || m.content || "",
    content: m.text || m.content || "",
    createdAt: m.createdAt || now,
    taskId: m.taskId,
    memoriesUsed: m.memoriesUsed,
    steps: m.steps,
    error: m.error,
    domain: m.domain,
  }));

  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    if (existing.userId.toLowerCase().trim() !== cleanUser) {
      return { project: null, status: "FORBIDDEN" };
    }

    const firstUserMsg = formattedMessages.find((m) => m.role === "user")?.text || existing.title;
    const title = data.title || existing.title || (firstUserMsg.length > 45 ? firstUserMsg.slice(0, 45) + "..." : firstUserMsg);
    const objective = data.objective || existing.objective || firstUserMsg;
    const domain = data.domain || formattedMessages.find((m) => m.domain)?.domain || existing.domain || "general";

    const updated: ProjectTask = {
      ...existing,
      title,
      objective,
      status: data.status || existing.status || "ACTIVE",
      domain,
      messages: formattedMessages,
      currentTaskId: data.currentTaskId || existing.currentTaskId,
      currentTaskStatus: data.currentTaskStatus || existing.currentTaskStatus,
      summary: data.summary || existing.summary,
      handoffSummary: data.handoffSummary || existing.handoffSummary,
      updatedAt: now,
    };
    all[existingIdx] = updated;
    writeProjects(all);
    syncProjectToSupabase(updated).catch(() => {});
    return { project: updated, status: "OK" };
  } else {
    const firstUserMsg = formattedMessages.find((m) => m.role === "user")?.text || "Dự án mới";
    const title = data.title || (firstUserMsg.length > 45 ? firstUserMsg.slice(0, 45) + "..." : firstUserMsg);
    const objective = data.objective || firstUserMsg;
    const domain = data.domain || formattedMessages.find((m) => m.domain)?.domain || "general";

    const newProj: ProjectTask = {
      id: data.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: cleanUser,
      title,
      objective,
      status: data.status || "ACTIVE",
      domain,
      messages: formattedMessages,
      currentTaskId: data.currentTaskId,
      currentTaskStatus: data.currentTaskStatus || "queued",
      summary: data.summary,
      handoffSummary: data.handoffSummary,
      createdAt: now,
      updatedAt: now,
    };
    all.unshift(newProj);
    writeProjects(all);
    syncProjectToSupabase(newProj).catch(() => {});
    return { project: newProj, status: "OK" };
  }
}

export function updateProjectHandoffSummary(
  projectId: string,
  summary: StructuredHandoffSummary,
  userId: string
): { success: boolean; status: "OK" | "NOT_FOUND" | "FORBIDDEN" } {
  const all = readProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project) return { success: false, status: "NOT_FOUND" };

  const cleanUser = userId.toLowerCase().trim();
  if (project.userId.toLowerCase().trim() !== cleanUser) {
    return { success: false, status: "FORBIDDEN" };
  }

  project.handoffSummary = summary;
  project.updatedAt = new Date().toISOString();
  writeProjects(all);
  syncProjectToSupabase(project).catch(() => {});
  return { success: true, status: "OK" };
}

export function deleteProject(
  id: string,
  userId: string
): { success: boolean; status: "OK" | "NOT_FOUND" | "FORBIDDEN" } {
  const all = readProjects();
  const project = all.find((p) => p.id === id);
  if (!project) {
    return { success: false, status: "NOT_FOUND" };
  }

  const cleanUser = userId.toLowerCase().trim();
  if (project.userId.toLowerCase().trim() !== cleanUser) {
    return { success: false, status: "FORBIDDEN" };
  }

  const filtered = all.filter((p) => p.id !== id);
  writeProjects(filtered);
  syncDeleteProjectFromSupabase(id).catch(() => {});
  return { success: true, status: "OK" };
}
