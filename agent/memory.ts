import fs from "fs";
import { getStoragePath } from "@/lib/storage";

const MEMORY_FILE = getStoragePath(".agent-memory.json");

export interface UserInteractionRecord {
  id: string;
  timestamp: string;
  userMessage: string;
  agentSummary: string;
  toolsUsed?: string[];
  domain?: string;
}

export interface UserProfileMemory {
  userId: string;
  walletAddress?: string;
  facts: Record<string, { value: string; updatedAt: string }>;
  interactionHistory: UserInteractionRecord[];
  createdAt: string;
  lastActiveAt: string;
}

export interface MultiUserMemoryStore {
  globalFacts: Record<string, { value: string; updatedAt: string }>;
  profiles: Record<string, UserProfileMemory>;
}

export type MemoryStore = Record<string, { value: string; updatedAt: string }>;

function normalizeUserId(userId?: string): string {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return "guest_default";
  }
  return userId.trim().toLowerCase();
}

function readStore(): MultiUserMemoryStore {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf8");
      const parsed = JSON.parse(raw);

      // If already modern multi-user structure
      if (parsed && typeof parsed === "object" && (parsed.profiles || parsed.globalFacts)) {
        return {
          globalFacts: parsed.globalFacts || {},
          profiles: parsed.profiles || {},
        };
      }

      // Backward-compatibility: Convert flat legacy store to globalFacts
      if (parsed && typeof parsed === "object") {
        return {
          globalFacts: parsed as Record<string, { value: string; updatedAt: string }>,
          profiles: {},
        };
      }
    }
  } catch (err) {
    console.warn("[Memory] Could not read memory file, starting clean store:", err);
  }
  return { globalFacts: {}, profiles: {} };
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
      facts: {},
      interactionHistory: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
  }
  return store.profiles[cleanUserId];
}

/**
 * Save a single key-value fact for a specific user/wallet.
 * Strict per-wallet/user isolation prevents cross-account data leakage.
 */
export function saveUserFact(
  key: string,
  value: string,
  userId?: string
): { success: boolean; key: string; value: string; userId: string } {
  const store = readStore();
  const cleanKey = key.toLowerCase().trim();
  const cleanUserId = normalizeUserId(userId);
  const now = new Date().toISOString();

  // Save to specific user/wallet profile
  const profile = getOrCreateProfile(store, cleanUserId);
  profile.facts[cleanKey] = { value, updatedAt: now };
  profile.lastActiveAt = now;

  // Only update globalFacts if it's the guest fallback
  if (cleanUserId === "guest_default") {
    store.globalFacts[cleanKey] = { value, updatedAt: now };
  }

  writeStore(store);
  return { success: true, key: cleanKey, value, userId: cleanUserId };
}

/**
 * Retrieve all active facts for a specific user/wallet.
 */
export function getUserFacts(userId?: string): Record<string, string> {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const result: Record<string, string> = {};

  if (cleanUserId === "guest_default") {
    for (const [k, v] of Object.entries(store.globalFacts)) {
      result[k] = v.value;
    }
  }

  const profile = store.profiles[cleanUserId];
  if (profile && profile.facts) {
    for (const [k, v] of Object.entries(profile.facts)) {
      result[k] = v.value;
    }
  }

  return result;
}

/**
 * Retrieve detailed list of facts for a specific user/wallet.
 */
export function getDetailedUserFacts(userId?: string): Array<{ key: string; value: string; updatedAt: string }> {
  const store = readStore();
  const cleanUserId = normalizeUserId(userId);
  const map: Record<string, { value: string; updatedAt: string }> = {};

  if (cleanUserId === "guest_default") {
    Object.assign(map, store.globalFacts);
  }

  const profile = store.profiles[cleanUserId];
  if (profile && profile.facts) {
    Object.assign(map, profile.facts);
  }

  return Object.entries(map).map(([key, item]) => ({
    key,
    value: item.value,
    updatedAt: item.updatedAt,
  }));
}

/**
 * Remove a specific fact for a user.
 */
export function removeUserFact(key: string, userId?: string): { success: boolean; key: string } {
  const store = readStore();
  const cleanKey = key.toLowerCase().trim();
  const cleanUserId = normalizeUserId(userId);

  if (cleanUserId === "guest_default") {
    delete store.globalFacts[cleanKey];
  }
  if (store.profiles[cleanUserId]?.facts) {
    delete store.profiles[cleanUserId].facts[cleanKey];
  }

  writeStore(store);
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
  };

  profile.interactionHistory.push(record);
  // Keep last 60 interactions per profile to balance depth and memory footprint
  if (profile.interactionHistory.length > 60) {
    profile.interactionHistory = profile.interactionHistory.slice(-60);
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
  if (!profile || !profile.interactionHistory) {
    return [];
  }
  return [...profile.interactionHistory].reverse().slice(0, limit);
}

/**
 * Formats a rich developments context block to inject into Agent Prompt.
 * Ensures the agent remembers all prior user interactions, decisions, and facts across sessions.
 */
export function getUserDevelopmentsContext(userId?: string): string {
  const cleanUserId = normalizeUserId(userId);
  const facts = getUserFacts(cleanUserId);
  const timeline = getUserTimeline(cleanUserId, 6);

  const lines: string[] = [];
  lines.push(`[USER PERSISTENT PROFILE & PRIOR DEVELOPMENTS]`);
  lines.push(`- Profile ID / Wallet: ${cleanUserId}`);

  const factKeys = Object.keys(facts);
  if (factKeys.length > 0) {
    lines.push(`- Confirmed User Facts & Preferences:`);
    for (const k of factKeys) {
      lines.push(`  • ${k}: ${facts[k]}`);
    }
  }

  if (timeline.length > 0) {
    lines.push(`- Recent Interaction History & Developments (Newest to Oldest):`);
    for (const item of timeline) {
      const timeStr = new Date(item.timestamp).toLocaleString("vi-VN");
      const toolsStr = item.toolsUsed && item.toolsUsed.length > 0 ? ` [Tools: ${item.toolsUsed.join(", ")}]` : "";
      lines.push(`  • [${timeStr}] User: "${item.userMessage.slice(0, 80)}" -> Summary: "${item.agentSummary.slice(0, 100)}"${toolsStr}`);
    }
  }

  return lines.join("\n");
}

/**
 * AUTOMATIC CONVERSATION MEMORY EXTRACTION & LEARNING:
 * Automatically parses user chat turns to extract long-term preferences,
 * project context, identity, and conversation state into persistent memory.
 */
export function autoExtractAndSaveConversationMemory(
  userMsg: string,
  agentReply: string,
  userId?: string,
  toolsUsed?: string[],
  domain?: string
): Array<{ key: string; value: string }> {
  const cleanUserId = normalizeUserId(userId);
  const extracted: Array<{ key: string; value: string }> = [];
  const text = userMsg.trim();
  const lower = text.toLowerCase();

  // 1. Name / Identity extraction
  const nameMatch =
    lower.match(/(?:tôi là|tôi tên là|tên tôi là|tên em là|tên mình là|gọi tôi là|my name is|i am|i'm)\s+([a-zA-Z0-9_\u00C0-\u1EF9\s]{2,25})/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    saveUserFact("user_name", name, cleanUserId);
    extracted.push({ key: "user_name", value: name });
  }

  // 2. Preferences / Interests
  const prefMatch =
    lower.match(/(?:tôi thích|sở thích(?: của tôi)? là|quan tâm đến|quan tâm|đam mê|yêu thích|i like|i prefer|interested in)\s+([^\n.!?]{3,60})/i);
  if (prefMatch && prefMatch[1]) {
    const pref = prefMatch[1].trim();
    saveUserFact("user_preference", pref, cleanUserId);
    extracted.push({ key: "user_preference", value: pref });
  }

  // 3. Location / City
  const locMatch =
    lower.match(/(?:tôi ở|tôi sống tại|tại|ở|nơi ở|sống ở)\s+(hà nội|hồ chí minh|đà nẵng|sài gòn|hải phòng|cần thơ|nha trang|huế|tokyo|singapore|new york|london)/i);
  if (locMatch && locMatch[1]) {
    const loc = locMatch[1].trim();
    saveUserFact("user_location", loc, cleanUserId);
    extracted.push({ key: "user_location", value: loc });
  }

  // 4. Wallet / Web3 Address
  const walletMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (walletMatch) {
    saveUserFact("user_evm_address", walletMatch[0], cleanUserId);
    extracted.push({ key: "user_evm_address", value: walletMatch[0] });
  }

  // 5. General active context / Last conversation theme
  if (text.length > 5 && !text.startsWith("/")) {
    const cleanTopic = text.slice(0, 80).replace(/[\r\n]+/g, " ");
    saveUserFact("last_interaction_topic", cleanTopic, cleanUserId);
    saveUserFact("last_interaction_timestamp", new Date().toLocaleString("vi-VN"), cleanUserId);
    extracted.push({ key: "last_interaction_topic", value: cleanTopic });
  }

  // 6. Record interaction in user's chronological developments timeline
  if (text.length > 0) {
    recordUserInteraction(cleanUserId, {
      userMessage: text,
      agentSummary: agentReply.slice(0, 200).replace(/[\r\n]+/g, " "),
      toolsUsed: toolsUsed || [],
      domain: domain || "general",
    });
  }

  return extracted;
}
