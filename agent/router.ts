export type DomainType = "creative" | "analytics" | "web3" | "research" | "general";

export type RouteDecision = {
  domain: DomainType;
  recommendedTools: string[];
  systemInstructionAddendum: string;
};

export function routeRequest(userMessage: string): RouteDecision {
  const msg = userMessage.toLowerCase();

  // 1. Creative / Media Domain
  if (
    msg.includes("brief") ||
    msg.includes("jazz") ||
    msg.includes("lo-fi") ||
    msg.includes("lofi") ||
    msg.includes("concept") ||
    msg.includes("kịch bản") ||
    msg.includes("sáng tạo") ||
    msg.includes("âm nhạc") ||
    msg.includes("autumn") ||
    msg.includes("video")
  ) {
    return {
      domain: "creative",
      recommendedTools: ["generate_creative_brief", "get_web_search", "remember_user_fact"],
      systemInstructionAddendum:
        "MODE: Creative & Media Director. Format output with Visual Motif, Sonic Identity (Jazz/Lo-Fi acoustic nuances), Tracklist, and SEO Title suggestions.",
    };
  }

  // 2. Analytics & Math Computation
  if (
    msg.includes("tính") ||
    msg.includes("tính toán") ||
    msg.includes("calculate") ||
    msg.includes("phân tích") ||
    msg.includes("số liệu") ||
    msg.includes("engagement") ||
    msg.includes("tỷ lệ") ||
    msg.includes("views") ||
    msg.includes("likes") ||
    msg.includes("%") ||
    msg.includes("formula")
  ) {
    return {
      domain: "analytics",
      recommendedTools: ["calculate", "get_crypto_price", "get_network_info"],
      systemInstructionAddendum:
        "MODE: Analytics & Quantitative Engine. Always compute formulas using the `calculate` tool. Display exact numerical results, formula breakdown, and qualitative takeaways.",
    };
  }

  // 3. Web3, Crypto & Wallet
  if (
    msg.includes("crypto") ||
    msg.includes("btc") ||
    msg.includes("eth") ||
    msg.includes("sol") ||
    msg.includes("usdc") ||
    msg.includes("weth") ||
    msg.includes("token") ||
    msg.includes("swap") ||
    msg.includes("quy đổi") ||
    msg.includes("base") ||
    msg.includes("wallet") ||
    msg.includes("ví") ||
    msg.includes("transfer") ||
    msg.includes("chuyển") ||
    msg.includes("gửi tiền") ||
    msg.includes("gas") ||
    msg.includes("sepolia") ||
    msg.includes("blockchain") ||
    msg.includes("contract") ||
    msg.includes("hợp đồng") ||
    msg.includes("ens") ||
    msg.includes("basename") ||
    msg.includes("0x") ||
    msg.includes("weather")
  ) {
    return {
      domain: "web3",
      recommendedTools: [
        "get_wallet_info",
        "prepare_transfer",
        "confirm_transfer",
        "get_transaction_status",
        "get_erc20_balance",
        "estimate_gas_and_fees",
        "simulate_token_swap",
        "resolve_web3_name",
        "read_smart_contract",
        "get_crypto_price",
        "get_network_info",
        "get_weather",
      ],
      systemInstructionAddendum:
        "MODE: Web3 & On-Chain Autonomous Specialist (Base Sepolia L2). When user wants to transfer, ALWAYS call `prepare_transfer` first for safety proposal verification. For token swaps, use `simulate_token_swap`. For gas and network health, use `estimate_gas_and_fees`. For domains (Basename / ENS), use `resolve_web3_name`.",
    };
  }


  // 4. Research & URL Scraper
  if (
    msg.includes("http") ||
    msg.includes("scrape") ||
    msg.includes("đọc") ||
    msg.includes("tài liệu") ||
    msg.includes("search") ||
    msg.includes("tìm kiếm") ||
    msg.includes("nguồn") ||
    msg.includes("thư viện") ||
    msg.includes("wikipedia")
  ) {
    return {
      domain: "research",
      recommendedTools: ["extract_web_page", "get_web_search", "remember_user_fact"],
      systemInstructionAddendum:
        "MODE: Research & Fact-Checking. Extract live web pages or search engines. Always cite concrete facts with source URLs.",
    };
  }

  // 5. General & Utility
  return {
    domain: "general",
    recommendedTools: ["roll_dice", "remember_user_fact", "get_user_memories", "calculate"],
    systemInstructionAddendum:
      "MODE: General Assistant. Be concise, friendly, and leverage memory and utility tools.",
  };
}
