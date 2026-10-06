import fs from "fs";
import { getStoragePath } from "@/lib/storage";

const MEMORY_FILE = getStoragePath(".agent-memory.json");

export type MemoryScope = "user" | "project";
export type MemoryStatus = "active" | "superseded" | "proposed";
export type MemoryExtractMethod = "explicit_instruction" | "inferred_proposal" | "manual_ui" | "handoff";

export interface ScopedMemoryItem {
  id: string;
  userId: string;
  projectId?: string;
  scope: MemoryScope;
  key: string;
  value: string;
  status: MemoryStatus;
  previousVersionId?: string;
  provenance: {
    sourceMessageId?: string;
    sourceTaskId?: string;
    extractedMethod: MemoryExtractMethod;
    previousVersionId?: string;
    createdAt: string;
    updatedAt: string;
    supersededAt?: string;
    supersededBy?: string;
  };
}

export interface UserInteractionRecord {
  id: string;
  timestamp: string;
  userMessage: string;
  agentSummary: string;
  toolsUsed?: string[];
  domain?: string;
  memoriesUsed?: string[];
  projectId?: string;
}

export interface StructuredHandoffSummary {
  objective: string;
  decisions: string[];
  completedWork: string[];
  pendingWork: string[];
  relevantTasks: Array<{
    taskId: string;
    objective: string;
    status: string;
    resultSummary?: string;
  }>;
  lastUpdated: string;
}

export interface UserProfileMemory {
  userId: string;
  walletAddress?: string;
  items: ScopedMemoryItem[];
  interactionHistory: UserInteractionRecord[];
  createdAt: string;
  lastActiveAt: string;
}

export interface MultiUserMemoryStore {
  profiles: Record<string, UserProfileMemory>;
  globalFacts?: Record<string, { value: string; updatedAt: string }>;
}

export function normalizeUserId(userId?: string): string {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return "guest_default";
  }
  return userId.trim().toLowerCase();
}

/**
 * Secret Stripping & Sanitization
 * Strictly prohibits storing private keys, seed phrases, or sensitive API keys.
 */
export function sanitizeMemoryValue(raw: string): { sanitized: string; hasSecret: boolean; warning?: string } {
  if (!raw || typeof raw !== "string") return { sanitized: "", hasSecret: false };

  let text = raw;
  let hasSecret = false;
  let warning: string | undefined;

  // 1. Check EVM Private Key (64-char hex)
  const pkRegex = /\b0x[a-fA-F0-9]{64}\b/g;
  if (pkRegex.test(text)) {
    hasSecret = true;
    warning = "Security Guard: Private key detected and stripped from memory.";
    text = text.replace(pkRegex, "[REDACTED_PRIVATE_KEY]");
  }

  // 2. Check Common API Keys
  const apiKeyRegex = /\b(?:sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35}|ghp_[a-zA-Z0-9]{36})\b/g;
  if (apiKeyRegex.test(text)) {
    hasSecret = true;
    warning = "Security Guard: API key detected and stripped from memory.";
    text = text.replace(apiKeyRegex, "[REDACTED_API_KEY]");
  }

  // 3. Check 12/24 Word Seed Phrases
  const words = text.trim().split(/\s+/);
  if (words.length >= 12 && words.length <= 24) {
    const bip39Sample = new Set(["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "access", "account", "acid", "acquire", "action", "actor", "admit", "adult", "advance", "advice", "afford", "afraid", "agent", "agree", "ahead", "aim", "air", "airport", "album", "alert", "alien", "all", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "baby", "bacon", "badge", "bag", "balance", "ball", "banana", "banner", "bar", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blue", "blur", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broken", "bronze", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "burn", "bus", "business", "busy", "butter", "buyer", "buzz"]);
    const matchCount = words.filter(w => bip39Sample.has(w.toLowerCase())).length;
    if (matchCount >= 8) {
      hasSecret = true;
      warning = "Security Guard: Seed phrase detected and stripped from memory.";
      text = "[REDACTED_SEED_PHRASE]";
    }
  }

  return { sanitized: text, hasSecret, warning };
}

function readStore(): MultiUserMemoryStore {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf8");
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        // Upgrade legacy facts to scoped memory items if needed
        const profiles: Record<string, UserProfileMemory> = {};

        if (parsed.profiles) {
          for (const [uid, prof] of Object.entries(parsed.profiles as Record<string, any>)) {
            const items: ScopedMemoryItem[] = Array.isArray(prof.items) ? prof.items : [];
            // If legacy facts exist, migrate them to scoped items
            if (prof.facts && typeof prof.facts === "object") {
              for (const [k, v] of Object.entries(prof.facts as Record<string, any>)) {
                if (!items.some(it => it.key === k && it.status === "active")) {
                  items.push({
                    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    userId: uid,
                    scope: "user",
                    key: k,
                    value: typeof v === "string" ? v : v.value || "",
                    status: "active",
                    provenance: {
                      extractedMethod: "manual_ui",
                      createdAt: v.updatedAt || new Date().toISOString(),
                      updatedAt: v.updatedAt || new Date().toISOString(),
                    },
                  });
                }
              }
            }
            profiles[uid] = {
              userId: uid,
              walletAddress: prof.walletAddress,
              items,
              interactionHistory: Array.isArray(prof.interactionHistory) ? prof.interactionHistory : [],
              createdAt: prof.createdAt || new Date().toISOString(),
              lastActiveAt: prof.lastActiveAt || new Date().toISOString(),
            };
          }
        }

        return { profiles };
      }
    }
  } catch (err) {
    console.warn("[Memory] Could not read memory file, starting clean store:", err);
  }
  return { profiles: {} };
}

function writeStore(store: MultiUserMemoryStore) {
  try {
    const tempFile = `${MEMORY_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tempFile, MEMORY_FILE);
  } catch (err) {
    console.error("[Memory] Failed to persist memory store:", err);
  }
}

function getOrCreateProfile(store: MultiUserMemoryStore, cleanUserId: string): UserProfileMemory {
  if (!store.profiles[cleanUserId]) {
    const isEVM = /^0x[a-fA-F0-9]{40}$/i.test(cleanUserId);
    store.profiles[cleanUserId] = {
      userId: cleanUserId,
      walletAddress: isEVM ? cleanUserId : undefined,
      items: [],
      interactionHistory: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
  }
  return store.profiles[cleanUserId];
}

/**
 * Save an Explicit Memory (e.g. User said "Nhớ rằng...", "Remember that...", or manually added via UI).
 * Automatically marks previous active memory with the same key and scope as 'superseded'.
 */
export function saveExplicitMemory(params: {
  key: string;
  value: string;
  userId?: string;
  scope?: MemoryScope;
  projectId?: string;
  sourceMessageId?: string;
  sourceTaskId?: string;
  extractedMethod?: MemoryExtractMethod;
}): { success: boolean; memory: ScopedMemoryItem; warning?: string } {
  const store = readStore();
  const cleanKey = params.key.toLowerCase().trim();
  const cleanUserId = normalizeUserId(params.userId);
  const scope: MemoryScope = params.scope || (params.projectId ? "project" : "user");
  const now = new Date().toISOString();

  const { sanitized, warning } = sanitizeMemoryValue(params.value);
  if (!sanitized) {
    throw new Error("Memory value cannot be empty or solely contain sensitive secrets.");
  }

  const profile = getOrCreateProfile(store, cleanUserId);
  const newId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let prevVerId: string | undefined;

  // Supersede existing active item with the same key and scope
  for (const item of profile.items) {
    if (
      item.key === cleanKey &&
      item.scope === scope &&
      item.status === "active" &&
      (scope === "user" || item.projectId === params.projectId)
    ) {
      item.status = "superseded";
      item.provenance.supersededAt = now;
      item.provenance.supersededBy = newId;
      if (!prevVerId) {
        prevVerId = item.id;
      }
    }
  }

  const newItem: ScopedMemoryItem = {
    id: newId,
    userId: cleanUserId,
    projectId: scope === "project" ? params.projectId : undefined,
    scope,
    key: cleanKey,
    value: sanitized,
    status: "active",
    previousVersionId: prevVerId,
    provenance: {
      sourceMessageId: params.sourceMessageId,
      sourceTaskId: params.sourceTaskId,
      extractedMethod: params.extractedMethod || "explicit_instruction",
      previousVersionId: prevVerId,
      createdAt: now,
      updatedAt: now,
    },
  };

  profile.items.unshift(newItem);
  profile.lastActiveAt = now;
  writeStore(store);

  return { success: true, memory: newItem, warning };
}

/**
 * Save an Inferred Memory Proposal (Agent deduced a pattern/preference).
 * Stored as 'proposed' until user approves or rejects it in the UI.
 */
export function saveProposedMemory(params: {
  key: string;
  value: string;
  userId?: string;
  scope?: MemoryScope;
  projectId?: string;
  sourceMessageId?: string;
  sourceTaskId?: string;
}): { success: boolean; memory: ScopedMemoryItem } {
  const store = readStore();
  const cleanKey = params.key.toLowerCase().trim();
  const cleanUserId = normalizeUserId(params.userId);
  const scope: MemoryScope = params.scope || (params.projectId ? "project" : "user");
  const now = new Date().toISOString();

  const { sanitized } = sanitizeMemoryValue(params.value);
  if (!sanitized) {
    return { success: false } as any;
  }

  const profile = getOrCreateProfile(store, cleanUserId);

  // Avoid duplicate pending proposals
  const existingProposal = profile.items.find(
    it => it.key === cleanKey && it.scope === scope && it.status === "proposed" && (scope === "user" || it.projectId === params.projectId)
  );
  if (existingProposal) {
    existingProposal.value = sanitized;
    existingProposal.provenance.updatedAt = now;
    writeStore(store);
    return { success: true, memory: existingProposal };
  }

  const newId = `mem_prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newItem: ScopedMemoryItem = {
    id: newId,
    userId: cleanUserId,
    projectId: scope === "project" ? params.projectId : undefined,
    scope,
    key: cleanKey,
    value: sanitized,
    status: "proposed",
    provenance: {
      sourceMessageId: params.sourceMessageId,
      sourceTaskId: params.sourceTaskId,
      extractedMethod: "inferred_proposal",
      createdAt: now,
      updatedAt: now,
    },
  };

  profile.items.unshift(newItem);
  profile.lastActiveAt = now;
  writeStore(store);

  return { success: true, memory: newItem };
}

/**
 * User approves a proposed memory item.
 * Transitions to 'active' and supersedes any previous active memory for that key.
 */
export function approveProposedMemory(
  memoryId: string,
  userId?: string
): { success: boolean; memory?: ScopedMemoryItem; error?: string } {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const profile = store.profiles[cleanUserId];

  if (!profile) {
    return { success: false, error: "User profile not found." };
  }

  const item = profile.items.find(it => it.id === memoryId);
  if (!item) {
    return { success: false, error: "Memory item not found." };
  }

  const now = new Date().toISOString();

  // Supersede existing active item
  for (const other of profile.items) {
    if (
      other.id !== item.id &&
      other.key === item.key &&
      other.scope === item.scope &&
      other.status === "active" &&
      (item.scope === "user" || other.projectId === item.projectId)
    ) {
      other.status = "superseded";
      other.provenance.supersededAt = now;
      other.provenance.supersededBy = item.id;
    }
  }

  item.status = "active";
  item.provenance.updatedAt = now;
  writeStore(store);

  return { success: true, memory: item };
}

/**
 * User edits an existing memory item.
 */
export function updateMemoryItem(
  memoryId: string,
  newValue: string,
  userId?: string
): { success: boolean; memory?: ScopedMemoryItem; error?: string; warning?: string } {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const profile = store.profiles[cleanUserId];

  if (!profile) return { success: false, error: "User profile not found." };
  const item = profile.items.find(it => it.id === memoryId);
  if (!item) return { success: false, error: "Memory item not found." };

  const { sanitized, warning } = sanitizeMemoryValue(newValue);
  if (!sanitized) {
    return { success: false, error: "Updated memory value cannot be empty or sensitive secrets." };
  }

  item.value = sanitized;
  item.provenance.updatedAt = new Date().toISOString();
  writeStore(store);

  return { success: true, memory: item, warning };
}

/**
 * Delete a memory item.
 */
export function deleteMemoryItem(
  memoryId: string,
  userId?: string
): { success: boolean; error?: string } {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const profile = store.profiles[cleanUserId];

  if (!profile) return { success: false, error: "User profile not found." };
  const initialLen = profile.items.length;
  profile.items = profile.items.filter(it => it.id !== memoryId);

  if (profile.items.length === initialLen) {
    return { success: false, error: "Memory item not found." };
  }

  writeStore(store);
  return { success: true };
}

/**
 * List scoped memories for a user with optional filtering by scope, projectId, and status.
 */
export function listScopedMemories(
  userId?: string,
  filter?: {
    scope?: MemoryScope;
    projectId?: string;
    status?: MemoryStatus;
    search?: string;
  }
): ScopedMemoryItem[] {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const profile = store.profiles[cleanUserId];
  if (!profile || !profile.items) return [];

  let items = [...profile.items];

  if (filter?.status && filter.status !== ("all" as any)) {
    items = items.filter(it => it.status === filter.status);
  }
  if (filter?.scope && filter.scope !== ("all" as any)) {
    items = items.filter(it => it.scope === filter.scope);
  }
  if (filter?.projectId) {
    items = items.filter(it => it.scope === "user" || it.projectId === filter.projectId);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    items = items.filter(it => it.key.includes(q) || it.value.toLowerCase().includes(q));
  }

  return items;
}

/**
 * Retrieve active facts for quick tool lookup (backward compatibility).
 */
export function getUserFacts(userId?: string): Record<string, string> {
  const activeItems = listScopedMemories(userId, { status: "active", scope: "user" });
  const result: Record<string, string> = {};
  for (const item of activeItems) {
    result[item.key] = item.value;
  }
  return result;
}

/**
 * Backward compatibility: saveUserFact.
 */
export function saveUserFact(
  key: string,
  value: string,
  userId?: string
): { success: boolean; key: string; value: string; userId: string } {
  const res = saveExplicitMemory({ key, value, userId, scope: "user", extractedMethod: "manual_ui" });
  return { success: true, key: res.memory.key, value: res.memory.value, userId: normalizeUserId(userId) };
}

/**
 * Backward compatibility: removeUserFact.
 */
export function removeUserFact(key: string, userId?: string): { success: boolean; key: string } {
  const store = readStore();
  const cleanKey = key.toLowerCase().trim();
  const cleanUserId = normalizeUserId(userId);
  const profile = store.profiles[cleanUserId];
  if (profile) {
    profile.items = profile.items.filter(it => it.key !== cleanKey);
    writeStore(store);
  }
  return { success: true, key: cleanKey };
}

/**
 * Record a user development / conversation interaction in their chronological timeline.
 */
export function recordUserInteraction(
  userId: string,
  interaction: {
    userMessage: string;
    agentSummary: string;
    toolsUsed?: string[];
    domain?: string;
    memoriesUsed?: string[];
    projectId?: string;
  }
): UserInteractionRecord {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const profile = getOrCreateProfile(store, cleanUserId);

  const record: UserInteractionRecord = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    userMessage: interaction.userMessage.trim().slice(0, 300),
    agentSummary: interaction.agentSummary.trim().slice(0, 300),
    toolsUsed: interaction.toolsUsed || [],
    domain: interaction.domain,
    memoriesUsed: interaction.memoriesUsed || [],
    projectId: interaction.projectId,
  };

  profile.interactionHistory.push(record);
  if (profile.interactionHistory.length > 80) {
    profile.interactionHistory = profile.interactionHistory.slice(-80);
  }
  profile.lastActiveAt = record.timestamp;

  writeStore(store);
  return record;
}

/**
 * Retrieve the full interaction timeline for a user/wallet profile.
 */
export function getUserTimeline(userId?: string, limit = 20): UserInteractionRecord[] {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const profile = store.profiles[cleanUserId];
  if (!profile || !profile.interactionHistory) return [];
  return [...profile.interactionHistory].reverse().slice(0, limit);
}

/**
 * ASSEMBLE RICH COGNITIVE CONTEXT FOR AGENT:
 * Gathers:
 * 1. User-scoped active memories (Global preferences).
 * 2. Project-scoped active memories (Current project specific constraints, without leaking to other projects).
 * 3. Handoff summary (Decisions, completed work, pending tasks).
 * 4. Recent chronological developments.
 * 
 * Strict isolation guarantees: User A never sees User B's context. Project A never leaks to Project B.
 */
export function assembleCognitiveContext(params: {
  userId?: string;
  projectId?: string;
  handoffSummary?: StructuredHandoffSummary;
  isContinuingTask?: boolean;
}): { contextPrompt: string; memoriesUsed: string[] } {
  const cleanUserId = normalizeUserId(params.userId);
  const memoriesUsed: string[] = [];
  const lines: string[] = [];

  lines.push(`[COGNITIVE MEMORY & INTERACTION CONTEXT]`);
  lines.push(`- Session Profile / Wallet: ${cleanUserId}`);
  if (params.projectId) {
    lines.push(`- Active Project Context ID: ${params.projectId}`);
  }

  // 1. User-level Active Memories
  const userMemories = listScopedMemories(cleanUserId, { scope: "user", status: "active" });
  if (userMemories.length > 0) {
    lines.push(`- User Preferences & Global Facts:`);
    for (const mem of userMemories.slice(0, 10)) {
      lines.push(`  • [User] ${mem.key}: ${mem.value}`);
      memoriesUsed.push(`user:${mem.key}`);
    }
  }

  // 2. Project-level Active Memories (Strictly scoped to current projectId)
  if (params.projectId) {
    const projMemories = listScopedMemories(cleanUserId, {
      scope: "project",
      projectId: params.projectId,
      status: "active",
    });
    if (projMemories.length > 0) {
      lines.push(`- Project-Specific Rules & Constraints (${params.projectId}):`);
      for (const mem of projMemories.slice(0, 10)) {
        lines.push(`  • [Project] ${mem.key}: ${mem.value}`);
        memoriesUsed.push(`project:${mem.key}`);
      }
    }
  }

  // 3. Structured Handoff Summary
  if (params.handoffSummary) {
    const s = params.handoffSummary;
    lines.push(`- Project Handoff & State Summary:`);
    lines.push(`  • Mục tiêu cốt lõi: ${s.objective}`);
    if (s.decisions && s.decisions.length > 0) {
      lines.push(`  • Quyết định đã chốt: ${s.decisions.join("; ")}`);
    }
    if (s.completedWork && s.completedWork.length > 0) {
      lines.push(`  • Công việc đã hoàn thành: ${s.completedWork.join("; ")}`);
    }
    if (s.pendingWork && s.pendingWork.length > 0) {
      lines.push(`  • Việc còn lại / Bước tiếp theo: ${s.pendingWork.join("; ")}`);
    }
  }

  // 4. Recent Developments
  const timeline = getUserTimeline(cleanUserId, 4);
  if (timeline.length > 0) {
    lines.push(`- Recent Interaction Developments:`);
    for (const act of timeline) {
      lines.push(`  • User: "${act.userMessage.slice(0, 60)}" -> Agent: "${act.agentSummary.slice(0, 80)}"`);
    }
  }

  return { contextPrompt: lines.join("\n"), memoriesUsed };
}

/**
 * AUTOMATIC PARSER FOR "NHỚ RẰNG...", EXPLICIT COMMANDS & INFERRED PROPOSALS
 */
export function autoExtractAndSaveConversationMemory(
  userMsg: string,
  agentReply: string,
  userId?: string,
  toolsUsed?: string[],
  domain?: string,
  projectId?: string,
  messageId?: string
): Array<{ key: string; value: string; method: string }> {
  const cleanUserId = normalizeUserId(userId);
  const extracted: Array<{ key: string; value: string; method: string }> = [];
  const text = userMsg.trim();
  const lower = text.toLowerCase();

  // 1. Explicit Memory Triggers: "Nhớ rằng...", "Hãy nhớ là...", "Remember that...", "Lưu ý rằng..."
  const explicitMatch = text.match(/(?:nhớ rằng|hãy nhớ là|hãy nhớ rằng|nhớ là|remember that|please remember that|lưu ý rằng)\s*[:,\-]?\s*([^.!?\n]{4,150})/i);
  if (explicitMatch && explicitMatch[1]) {
    const rawFact = explicitMatch[1].trim();
    // Derive a clean key
    const cleanKey = rawFact.length > 25 ? rawFact.slice(0, 25).replace(/\s+/g, "_") : rawFact.replace(/\s+/g, "_");
    const scope: MemoryScope = projectId ? "project" : "user";
    const res = saveExplicitMemory({
      key: cleanKey,
      value: rawFact,
      userId: cleanUserId,
      scope,
      projectId,
      sourceMessageId: messageId,
      extractedMethod: "explicit_instruction",
    });
    extracted.push({ key: res.memory.key, value: res.memory.value, method: "explicit" });
  }

  // 2. Identity Extraction (Explicit/Direct)
  const nameMatch = lower.match(/(?:tôi là|tôi tên là|tên tôi là|tên em là|tên mình là|gọi tôi là|my name is|i am|i'm)\s+([a-zA-Z0-9_\u00C0-\u1EF9\s]{2,25})/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    saveExplicitMemory({
      key: "user_name",
      value: name,
      userId: cleanUserId,
      scope: "user",
      sourceMessageId: messageId,
      extractedMethod: "explicit_instruction",
    });
    extracted.push({ key: "user_name", value: name, method: "explicit" });
  }

  // 3. User Preferences (Inferred Proposals for user review)
  const prefMatch = lower.match(/(?:tôi thích|sở thích(?: của tôi)? là|quan tâm đến|quan tâm|đam mê|yêu thích|i like|i prefer|interested in)\s+([^\n.!?]{3,60})/i);
  if (prefMatch && prefMatch[1]) {
    const pref = prefMatch[1].trim();
    saveProposedMemory({
      key: "user_preference",
      value: pref,
      userId: cleanUserId,
      scope: "user",
      sourceMessageId: messageId,
    });
    extracted.push({ key: "user_preference", value: pref, method: "inferred_proposal" });
  }

  // 4. Record Interaction Timeline
  if (text.length > 0) {
    recordUserInteraction(cleanUserId, {
      userMessage: text,
      agentSummary: agentReply.slice(0, 200).replace(/[\r\n]+/g, " "),
      toolsUsed: toolsUsed || [],
      domain: domain || "general",
      projectId,
    });
  }

  return extracted;
}
