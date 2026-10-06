/**
 * MULTI-DOMAIN KNOWLEDGE BASE & RETRIEVAL ENGINE
 *
 * Stores and indexes multi-domain domain facts, documentation,
 * and user-ingested knowledge articles with keyword and semantic tagging.
 */
import fs from "fs";
import { getStoragePath } from "@/lib/storage";

const KNOWLEDGE_FILE = getStoragePath(".agent-knowledge-base.json");
const LEARNINGS_FILE = getStoragePath(".agent-learnings.json");


export type KnowledgeItem = {
  id: string;
  domain: "web3" | "coding" | "finance" | "productivity" | "science" | "general";
  title: string;
  content: string;
  tags: string[];
  source?: string;
  createdAt: string;
};

export type AgentLearning = {
  id: string;
  queryType: string;
  lessonLearned: string;
  recommendedAction: string;
  timestamp: string;
  appliedCount: number;
};

// Default seed knowledge across 5 major domains
const SEED_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: "kb_base_l2",
    domain: "web3",
    title: "Base L2 Rollup Architecture & OP Stack",
    content:
      "Base is an Ethereum Layer 2 rollup built using the OP Stack. It inherits Ethereum security, offers sub-cent transaction fees, uses EIP-1559 gas pricing with Base Fee + Priority Fee, and has chainId 8453 (Mainnet) / 84532 (Sepolia Testnet).",
    tags: ["base", "l2", "rollup", "ethereum", "op-stack", "gas"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_defi_amm",
    domain: "finance",
    title: "Uniswap Constant Product AMM (x * y = k)",
    content:
      "Automated Market Makers (AMMs) like Uniswap v2 utilize the formula x * y = k. Price is determined by the ratio of tokens in the liquidity pool. Slippage occurs when trade size is large relative to pool liquidity. Standard pool fee is 0.3%.",
    tags: ["amm", "uniswap", "defi", "liquidity", "slippage", "trading"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_rsi_indicator",
    domain: "finance",
    title: "Relative Strength Index (RSI) Technical Indicator",
    content:
      "RSI is a momentum oscillator measuring the speed and change of price movements on a scale of 0 to 100. RSI > 70 generally indicates an overbought condition (potential reversal or pullback), while RSI < 30 indicates an oversold condition.",
    tags: ["rsi", "technical-analysis", "crypto", "trading", "indicators"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_ts_generics",
    domain: "coding",
    title: "TypeScript Generics and Type Safety Patterns",
    content:
      "Generics allow writing flexible, reusable functions and classes while preserving full type information. Use 'extends' for constraints, 'keyof' for index types, and mapped types with 'Record<K, T>' for structured data lookups.",
    tags: ["typescript", "generics", "coding", "software-architecture"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_smart_contract_security",
    domain: "web3",
    title: "EVM Smart Contract Security & CEI Pattern",
    content:
      "To prevent reentrancy attacks, follow the Checks-Effects-Interactions (CEI) pattern: validate conditions first, update state variables next, and perform external calls/transfers last. Always use OpenZeppelin's ReentrancyGuard, avoid 'tx.origin' for access control, and capture boolean return values on low-level .call().",
    tags: ["solidity", "security", "reentrancy", "smart-contracts", "audit", "openzeppelin"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_defi_il",
    domain: "finance",
    title: "DeFi Impermanent Loss & Compounded APY",
    content:
      "Impermanent Loss (IL) occurs when the price ratio of deposited pool assets diverges from when they were deposited. Formula: IL = (2 * sqrt(k)) / (1 + k) - 1, where k = P_final / P_initial. A 1.5x price increase results in -2.02% IL; a 2x increase results in -5.72% IL. Compounded APY = (1 + APR/365)^365 - 1.",
    tags: ["defi", "impermanent-loss", "yield", "apy", "apr", "liquidity-pool"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_ui_accessibility",
    domain: "general",
    title: "WCAG 2.1 Accessibility & Glassmorphism Design",
    content:
      "Web Content Accessibility Guidelines (WCAG) 2.1 requires minimum 4.5:1 contrast for normal text and 3:1 for large text (Level AA), or 7:1 for Level AAA. Interactive mobile targets must be at least 44x44 CSS pixels. Glassmorphism cards require subtle backdrop blur (12-16px) with distinct borders (0.08-0.12 opacity) for optimal scannability.",
    tags: ["ui", "ux", "accessibility", "wcag", "contrast", "glassmorphism", "design"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb_agent_react",
    domain: "general",
    title: "ReAct (Reasoning + Acting) Agent Pattern",
    content:
      "The ReAct pattern interleaves reasoning traces (Thought) and task-specific actions (Action & Tool Calling) with execution observation (Observation). This dramatically reduces hallucination compared to raw generation.",
    tags: ["ai", "react", "agents", "langchain", "prompting", "reasoning"],
    createdAt: new Date().toISOString(),
  },
];

export function getKnowledgeBase(): KnowledgeItem[] {
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, "utf8"));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  // Initialize with seed knowledge
  saveKnowledgeBase(SEED_KNOWLEDGE);
  return SEED_KNOWLEDGE;
}

export function saveKnowledgeBase(items: KnowledgeItem[]) {
  try {
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(items, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save knowledge base:", err);
  }
}

export function addKnowledgeItem(domain: KnowledgeItem["domain"], title: string, content: string, tags: string[], source?: string) {
  const kb = getKnowledgeBase();
  const newItem: KnowledgeItem = {
    id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    domain,
    title,
    content,
    tags: tags.map((t) => t.toLowerCase().trim()),
    source,
    createdAt: new Date().toISOString(),
  };
  kb.unshift(newItem);
  saveKnowledgeBase(kb);
  return newItem;
}

export function indexUploadedDocument(filename: string, fileText: string): { filename: string; chunksCount: number; items: KnowledgeItem[] } {
  const clean = fileText.trim();
  const chunkSize = 600;
  const overlap = 100;
  const chunks: string[] = [];

  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.substring(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start += chunkSize - overlap;
  }

  const createdItems: KnowledgeItem[] = [];
  const baseName = filename.replace(/[^\w.-]/g, "_");

  chunks.forEach((chunkText, i) => {
    const item = addKnowledgeItem(
      "general",
      `Tài liệu: ${filename} [Đoạn ${i + 1}/${chunks.length}]`,
      chunkText,
      [baseName, "document", "rag", "user-upload", ...filename.toLowerCase().split(/[._-]/)],
      `file://${filename}#section-${i + 1}`
    );
    createdItems.push(item);
  });

  return {
    filename,
    chunksCount: createdItems.length,
    items: createdItems,
  };
}


export function queryKnowledgeBase(query: string, domain?: string, limit = 4): KnowledgeItem[] {
  const kb = getKnowledgeBase();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = kb.map((item) => {
    let score = 0;
    if (domain && item.domain === domain) score += 5;

    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();
    const tagsLower = item.tags.join(" ").toLowerCase();

    for (const token of tokens) {
      if (titleLower.includes(token)) score += 4;
      if (tagsLower.includes(token)) score += 3;
      if (contentLower.includes(token)) score += 1;
    }
    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}

/** ─── LESSONS LEARNED & SELF-IMPROVEMENT REFLECTIONS ─── */
export function getAgentLearnings(): AgentLearning[] {
  try {
    if (fs.existsSync(LEARNINGS_FILE)) {
      return JSON.parse(fs.readFileSync(LEARNINGS_FILE, "utf8"));
    }
  } catch {}
  return [];
}

export function saveAgentLearning(queryType: string, lessonLearned: string, recommendedAction: string) {
  const learnings = getAgentLearnings();
  const newLearning: AgentLearning = {
    id: `learn_${Date.now()}`,
    queryType,
    lessonLearned,
    recommendedAction,
    timestamp: new Date().toISOString(),
    appliedCount: 1,
  };
  learnings.unshift(newLearning);
  fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(learnings.slice(0, 30), null, 2), "utf8");
  return newLearning;
}
