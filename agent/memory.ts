import fs from "fs";
import { getStoragePath } from "@/lib/storage";

const MEMORY_FILE = getStoragePath(".agent-memory.json");


export type MemoryStore = Record<string, { value: string; updatedAt: string }>;

function readStore(): MemoryStore {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // Ignore read errors, start fresh
  }
  return {};
}

function writeStore(store: MemoryStore) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist memory store:", err);
  }
}

export function saveUserFact(key: string, value: string): { success: boolean; key: string; value: string } {
  const store = readStore();
  const cleanKey = key.toLowerCase().trim();
  store[cleanKey] = {
    value,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return { success: true, key: cleanKey, value };
}

export function getUserFacts(): Record<string, string> {
  const store = readStore();
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(store)) {
    result[k] = v.value;
  }
  return result;
}

export function getDetailedUserFacts(): Array<{ key: string; value: string; updatedAt: string }> {
  const store = readStore();
  return Object.entries(store).map(([key, item]) => ({
    key,
    value: item.value,
    updatedAt: item.updatedAt,
  }));
}

export function removeUserFact(key: string): { success: boolean; key: string } {
  const store = readStore();
  const cleanKey = key.toLowerCase().trim();
  delete store[cleanKey];
  writeStore(store);
  return { success: true, key: cleanKey };
}

/**
 * AUTOMATIC CONVERSATION MEMORY EXTRACTION & LEARNING:
 * Automatically parses user chat turns to extract long-term preferences,
 * project context, identity, and conversation state into persistent memory.
 */
export function autoExtractAndSaveConversationMemory(
  userMsg: string,
  agentReply: string
): Array<{ key: string; value: string }> {
  const extracted: Array<{ key: string; value: string }> = [];
  const text = userMsg.trim();
  const lower = text.toLowerCase();

  // 1. Name / Identity extraction
  const nameMatch =
    lower.match(/(?:tôi tên là|tên tôi là|gọi tôi là|my name is|i am)\s+([a-zA-Z0-9_\u00C0-\u1EF9\s]{2,25})/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    saveUserFact("user_name", name);
    extracted.push({ key: "user_name", value: name });
  }

  // 2. Preferences / Interests
  const prefMatch =
    lower.match(/(?:tôi thích|sở thích của tôi là|i like|i prefer)\s+([^\n.!?]{3,60})/i);
  if (prefMatch && prefMatch[1]) {
    const pref = prefMatch[1].trim();
    saveUserFact("user_preference", pref);
    extracted.push({ key: "user_preference", value: pref });
  }

  // 3. Location / City
  const locMatch =
    lower.match(/(?:tôi ở|tôi sống tại|tại|ở)\s+(hà nội|hồ chí minh|đà nẵng|sài gòn|hải phòng|cần thơ|tokyo|singapore|new york)/i);
  if (locMatch && locMatch[1]) {
    const loc = locMatch[1].trim();
    saveUserFact("user_location", loc);
    extracted.push({ key: "user_location", value: loc });
  }

  // 4. Wallet / Web3 Address
  const walletMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (walletMatch) {
    saveUserFact("user_evm_address", walletMatch[0]);
    extracted.push({ key: "user_evm_address", value: walletMatch[0] });
  }

  // 5. General active context / Last conversation theme
  if (text.length > 5 && !text.startsWith("/")) {
    const cleanTopic = text.slice(0, 80).replace(/[\r\n]+/g, " ");
    saveUserFact("last_interaction_topic", cleanTopic);
    saveUserFact("last_interaction_timestamp", new Date().toLocaleString("vi-VN"));
    extracted.push({ key: "last_interaction_topic", value: cleanTopic });
  }

  return extracted;
}


