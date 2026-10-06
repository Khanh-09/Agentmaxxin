/**
 * HIGH-PERFORMANCE IN-MEMORY TTL CACHE FOR AGENT TOOLS
 * Provides sub-millisecond retrieval for repetitive tool queries (weather, crypto prices, search, network stats).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const toolCache = new Map<string, CacheEntry<unknown>>();

// Tool-specific TTL configurations in milliseconds
const TOOL_TTL_MAP: Record<string, number> = {
  get_crypto_price: 30 * 1000,          // 30 seconds
  get_weather: 60 * 1000,               // 60 seconds
  get_network_info: 15 * 1000,          // 15 seconds
  get_web_search: 60 * 1000,            // 60 seconds
  extract_web_page: 120 * 1000,         // 2 minutes
  query_vector_knowledge: 300 * 1000,   // 5 minutes
  audit_smart_contract_security: 300 * 1000, // 5 minutes
};

const DEFAULT_CACHE_TTL = 30 * 1000; // 30 seconds

function createCacheKey(toolName: string, args: unknown): string {
  try {
    const sortedArgs = typeof args === "object" && args !== null
      ? Object.keys(args as Record<string, unknown>).sort().reduce((acc, k) => {
          acc[k] = (args as Record<string, unknown>)[k];
          return acc;
        }, {} as Record<string, unknown>)
      : args;
    return `${toolName}:${JSON.stringify(sortedArgs)}`;
  } catch {
    return `${toolName}:${String(args)}`;
  }
}

export function getCachedToolResult<T = unknown>(toolName: string, args: unknown): T | null {
  const key = createCacheKey(toolName, args);
  const entry = toolCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    toolCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCachedToolResult(toolName: string, args: unknown, value: unknown, customTtlMs?: number): void {
  // Do not cache errors or empty failures
  if (!value || (typeof value === "object" && (value as any).error)) {
    return;
  }

  const key = createCacheKey(toolName, args);
  const ttl = customTtlMs ?? TOOL_TTL_MAP[toolName] ?? DEFAULT_CACHE_TTL;
  
  toolCache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });

  // Keep cache bounded to 500 entries
  if (toolCache.size > 500) {
    const oldestKey = toolCache.keys().next().value;
    if (oldestKey) toolCache.delete(oldestKey);
  }
}

export function clearToolCache(): void {
  toolCache.clear();
}
