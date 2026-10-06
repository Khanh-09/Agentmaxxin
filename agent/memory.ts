import fs from "fs";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), ".agent-memory.json");

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

export function removeUserFact(key: string): { success: boolean; key: string } {
  const store = readStore();
  const cleanKey = key.toLowerCase().trim();
  delete store[cleanKey];
  writeStore(store);
  return { success: true, key: cleanKey };
}
