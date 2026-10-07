/**
 * AUTONOMOUS COGNITIVE DISTILLATION & CONTINUOUS SELF-LEARNING ENGINE
 *
 * Implements autonomous pattern extraction, implicit intent discovery,
 * and cross-user collective knowledge consolidation.
 */
import { saveGlobalKnowledgeFact, saveExplicitMemory, saveProposedMemory, normalizeUserId, type MemoryScope } from "./memory";
import { saveAgentLearning } from "./knowledge";
import { recordHighRewardExemplar } from "./training";

export interface DistillationResult {
  factsExtracted: Array<{ key: string; value: string; scope: MemoryScope }>;
  insightsCount: number;
  heuristicsCount: number;
}

/**
 * Autonomous Reflection & Distillation:
 * Analyzes conversation turns, research results, and tool traces to extract:
 * 1. Global Technical Facts (smart contracts, chain info, APIs, core concepts)
 * 2. Problem-solving heuristics & lessons learned
 * 3. Implicit user preferences
 */
export function distillKnowledgeAndLearn(params: {
  userPrompt: string;
  agentReply: string;
  toolsUsed?: string[];
  domain?: string;
  userId?: string;
  projectId?: string;
  evaluationScore?: number;
}): DistillationResult {
  const cleanUserId = normalizeUserId(params.userId);
  const prompt = params.userPrompt.trim();
  const reply = params.agentReply.trim();
  const factsExtracted: Array<{ key: string; value: string; scope: MemoryScope }> = [];
  let insightsCount = 0;
  let heuristicsCount = 0;

  if (prompt.length < 3 || reply.length < 5) {
    return { factsExtracted, insightsCount, heuristicsCount };
  }

  // ─── 1. EXTRACT WEB3 ENTITIES & CONTRACT ADDRESSES (Global Scope) ───
  const contractMatch = reply.match(/(?:contract|địa chỉ|smart contract|address|token)\s*(?:của|of)?\s*([a-zA-Z0-9_\-\s]{2,25})?[:\s]+(0x[a-fA-F0-9]{40})/i);
  if (contractMatch && contractMatch[2]) {
    const entityName = (contractMatch[1] || "token_contract").trim().toLowerCase().replace(/\s+/g, "_");
    const address = contractMatch[2];
    const key = `contract_${entityName}`;
    const value = `Smart contract address for ${entityName} is ${address}`;
    try {
      saveGlobalKnowledgeFact({
        key,
        value,
        extractedMethod: "collective_learning",
      });
      factsExtracted.push({ key, value, scope: "global" });
      insightsCount++;
    } catch {}
  }

  // ─── 2. EXTRACT UNIVERSAL DEFINITIONS & DOMAIN CONCEPTS (Global Scope) ───
  // Pattern: "X là khái niệm/giao thức/mô hình/nền tảng..."
  const definitionMatch = reply.match(/(?:^|\n)(?:[-•*]\s*)?([A-Z][a-zA-Z0-9_\s]{2,30})\s+là\s+([^.\n]{15,150})/i);
  if (definitionMatch && definitionMatch[1] && definitionMatch[2]) {
    const concept = definitionMatch[1].trim().toLowerCase().replace(/\s+/g, "_");
    const explanation = definitionMatch[2].trim();
    if (!["tôi", "bạn", "chúng_tôi", "đây"].includes(concept)) {
      const key = `concept_${concept}`;
      const value = `${definitionMatch[1].trim()} là ${explanation}`;
      try {
        saveGlobalKnowledgeFact({
          key,
          value,
          extractedMethod: "collective_learning",
        });
        factsExtracted.push({ key, value, scope: "global" });
        insightsCount++;
      } catch {}
    }
  }

  // ─── 3. EXTRACT TROUBLESHOOTING & PROBLEM-SOLVING HEURISTICS ───
  if (prompt.toLowerCase().includes("lỗi") || prompt.toLowerCase().includes("error") || prompt.toLowerCase().includes("sửa") || prompt.toLowerCase().includes("fix")) {
    if (reply.length > 50 && (params.evaluationScore || 90) >= 80) {
      const lesson = `Khi gặp vấn đề liên quan đến "${prompt.slice(0, 60)}": áp dụng giải pháp ${reply.slice(0, 100)}...`;
      saveAgentLearning(params.domain || "general", lesson, "Áp dụng phương pháp phân tích và kiểm tra từng bước theo kinh nghiệm đã học.");
      heuristicsCount++;
    }
  }

  // ─── 4. AUTONOMOUS IMPLICIT USER PREFERENCE DISCOVERY (User Scope) ───
  const pLower = prompt.toLowerCase();
  if (pLower.includes("typescript") || pLower.includes("next.js") || pLower.includes("python") || pLower.includes("rust") || pLower.includes("solidity")) {
    const tech = pLower.includes("typescript") ? "TypeScript" : pLower.includes("next.js") ? "Next.js" : pLower.includes("python") ? "Python" : pLower.includes("rust") ? "Rust" : "Solidity";
    saveProposedMemory({
      key: `preferred_tech_${tech.toLowerCase()}`,
      value: `Người dùng thường xuyên làm việc với công nghệ ${tech}`,
      userId: cleanUserId,
      scope: "user",
    });
  }

  if (pLower.includes("tiếng việt") || pLower.includes("ngắn gọn") || pLower.includes("chi tiết") || pLower.includes("bullet point")) {
    const style = pLower.includes("ngắn gọn") ? "Ngắn gọn, súc tích" : pLower.includes("chi tiết") ? "Chi tiết, đầy đủ dẫn chứng" : "Định dạng danh sách gạch đầu dòng";
    saveProposedMemory({
      key: "preferred_response_style",
      value: `Phong cách trả lời ưu thích: ${style}`,
      userId: cleanUserId,
      scope: "user",
    });
  }

  // ─── 5. HIGH-REWARD CONTINUOUS EXEMPLAR CONSOLIDATION ───
  if ((params.evaluationScore || 0) >= 90 && params.toolsUsed && params.toolsUsed.length > 0) {
    recordHighRewardExemplar(
      params.domain || "general",
      prompt,
      params.toolsUsed,
      reply.slice(0, 180),
      params.evaluationScore
    );
  }

  return { factsExtracted, insightsCount, heuristicsCount };
}
