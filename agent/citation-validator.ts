import type { TaskSource, TaskReport, ClaimVerification } from "./tasks";

/**
 * Validates citation integrity and cross-source analysis.
 */
export function validateCitationsAndAnalyzeEvidence(params: {
  rawText: string;
  sources: TaskSource[];
}): {
  verifiedClaims: ClaimVerification[];
  sourceDiscrepancies: Array<{
    sourcesCompared: string[];
    differingAspect: "measurement_conditions" | "timestamp_drift" | "methodology" | "direct_contradiction" | "inconclusive";
    explanation: string;
  }>;
  citationIntegrityScore: number;
  unsupportedClaimsCount: number;
  outcome: "complete" | "partial" | "insufficient_evidence";
} {
  const { rawText, sources } = params;

  // Build source map
  const sourceMap = new Map<string, TaskSource>();
  for (const s of sources) {
    sourceMap.set(s.sourceId.toLowerCase(), s);
  }

  // 1. Extract citation patterns like [src_1], [src_2], [src_page_abc]
  const citationRegex = /\[(src_[a-zA-Z0-9_-]+)\]/g;
  const sentenceRegex = /([^.!?\n]+(?:\[src_[a-zA-Z0-9_-]+\])[^.!?\n]*[.!?]?)/g;

  const sentenceMatches = rawText.match(sentenceRegex) || [];
  const verifiedClaims: ClaimVerification[] = [];

  let validCitationsCount = 0;
  let totalCitationsCount = 0;

  for (const sentence of sentenceMatches) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const sourceIds: string[] = [];
    let match: RegExpExecArray | null;
    const localRegex = /\[(src_[a-zA-Z0-9_-]+)\]/g;
    while ((match = localRegex.exec(trimmed)) !== null) {
      sourceIds.push(match[1].toLowerCase());
    }

    totalCitationsCount += sourceIds.length;

    const validSourceIds: string[] = [];
    let matchedEvidenceText = "";
    let hasFailedSource = false;
    let hasNonExistentSource = false;

    for (const sid of sourceIds) {
      const src = sourceMap.get(sid);
      if (!src) {
        hasNonExistentSource = true;
        continue;
      }
      if (src.status === "failed") {
        hasFailedSource = true;
        continue;
      }

      validSourceIds.push(sid);
      validCitationsCount++;

      const srcText = (src.content || src.snippet || "").toLowerCase();
      if (srcText) {
        matchedEvidenceText += ` (${src.dataType === "snippet" ? "Snippet" : "Page Content"}: ${src.snippet || src.content?.slice(0, 200)}...)`;
      }
    }

    // Determine support level
    let supportLevel: "supported" | "partially_supported" | "unsupported" | "invalid_source" = "unsupported";
    let hasSupport = false;

    if (hasNonExistentSource || validSourceIds.length === 0) {
      supportLevel = "invalid_source";
      hasSupport = false;
    } else {
      // Check lexical / semantic relevance between claim and source text
      const cleanClaim = trimmed.toLowerCase().replace(/\[src_[^\]]+\]/g, "");
      const claimKeywords = cleanClaim
        .replace(/[^\w\s\u00C0-\u1EF9]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["này", "được", "trong", "theo", "rằng", "thông", "tin", "thực", "hiện"].includes(w));

      const combinedSourceText = validSourceIds
        .map((sid) => (sourceMap.get(sid)?.content || sourceMap.get(sid)?.snippet || "").toLowerCase())
        .join(" ");
      const matchedKw = claimKeywords.filter((kw) => combinedSourceText.includes(kw));
      const matchRatio = claimKeywords.length > 0 ? matchedKw.length / claimKeywords.length : 0;

      // Check numerical & date accuracy
      const claimNumbers = (trimmed.match(/\b\d+(?:[.,]\d+)?\b/g) || []).map((n) => n.replace(/,/g, ""));
      const sourceNumbers = (combinedSourceText.match(/\b\d+(?:[.,]\d+)?\b/g) || []).map((n) => n.replace(/,/g, ""));
      const hasMissingNumbers = claimNumbers.length > 0 && !claimNumbers.some((n) => sourceNumbers.includes(n));

      if (hasMissingNumbers) {
        supportLevel = "unsupported";
        hasSupport = false;
      } else if (matchRatio >= 0.4 || (claimKeywords.length <= 2 && matchRatio > 0)) {
        supportLevel = "supported";
        hasSupport = true;
      } else if (matchRatio > 0.15) {
        supportLevel = "partially_supported";
        hasSupport = true;
      } else {
        supportLevel = "unsupported";
        hasSupport = false;
      }
    }

    verifiedClaims.push({
      claim: trimmed,
      sourceIds,
      validSourceIds,
      hasSupport,
      supportLevel,
      evidenceSnippet: matchedEvidenceText.trim() || undefined,
      discrepancyNote:
        supportLevel === "invalid_source"
          ? "Nguồn trích dẫn không tồn tại trong danh sách nguồn của tác vụ hoặc là nguồn truy xuất thất bại."
          : supportLevel === "unsupported"
          ? "Nhận định này chưa tìm thấy đoạn văn bản cụ thể chứng thực trong nội dung nguồn."
          : undefined,
    });
  }

  // If no inline citations were found, check all task sources
  if (verifiedClaims.length === 0 && sources.length > 0) {
    for (const src of sources) {
      if (src.status === "retrieved") {
        verifiedClaims.push({
          claim: src.title,
          sourceIds: [src.sourceId],
          validSourceIds: [src.sourceId],
          hasSupport: true,
          supportLevel: "supported",
          evidenceSnippet: src.snippet || src.content?.slice(0, 150),
        });
        validCitationsCount++;
        totalCitationsCount++;
      }
    }
  }

  const unsupportedClaimsCount = verifiedClaims.filter((c) => !c.hasSupport).length;
  const citationIntegrityScore =
    totalCitationsCount > 0 ? Number((validCitationsCount / totalCitationsCount).toFixed(2)) : 0;

  // 2. Cross-Source Nuanced Discrepancy Analysis
  const sourceDiscrepancies: Array<{
    sourcesCompared: string[];
    differingAspect: "measurement_conditions" | "timestamp_drift" | "methodology" | "direct_contradiction" | "inconclusive";
    explanation: string;
  }> = [];

  const textLower = rawText.toLowerCase();

  // Detect differing conditions vs direct contradiction in the text
  if (
    textLower.includes("lý thuyết") &&
    (textLower.includes("thực tế") || textLower.includes("kiểm thử") || textLower.includes("benchmark"))
  ) {
    sourceDiscrepancies.push({
      sourcesCompared: sources.slice(0, 2).map((s) => s.sourceId),
      differingAspect: "measurement_conditions",
      explanation:
        "Sự khác biệt phát sinh do điều kiện đo lường: Một nguồn phản ánh hiệu năng tối ưu trong môi trường phòng thí nghiệm lý thuyết, nguồn còn lại phản ánh kiểm thử thực tế độc lập.",
    });
  } else if (
    textLower.includes("mâu thuẫn") ||
    textLower.includes("trái ngược") ||
    textLower.includes("bất đồng")
  ) {
    sourceDiscrepancies.push({
      sourcesCompared: sources.slice(0, 2).map((s) => s.sourceId),
      differingAspect: "direct_contradiction",
      explanation: "Phát hiện mâu thuẫn trực tiếp giữa các số liệu công bố từ các bên khác nhau.",
    });
  }

  // 3. Epistemic Outcome Classification
  const retrievedSourcesCount = sources.filter((s) => s.status === "retrieved").length;
  let outcome: "complete" | "partial" | "insufficient_evidence";

  if (retrievedSourcesCount === 0 || textLower.includes("chưa có đủ dữ liệu") || textLower.includes("không tìm thấy")) {
    outcome = "insufficient_evidence";
  } else if (unsupportedClaimsCount > 0 || sources.some((s) => s.status === "failed") || sources.every((s) => s.dataType === "snippet")) {
    outcome = "partial";
  } else {
    outcome = "complete";
  }

  return {
    verifiedClaims,
    sourceDiscrepancies,
    citationIntegrityScore,
    unsupportedClaimsCount,
    outcome,
  };
}
