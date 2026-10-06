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

