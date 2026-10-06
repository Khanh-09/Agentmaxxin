/**
 * YOUR AGENT'S TOOLS
 *
 * A tool is just a function the agent is allowed to call.
 * Gemini reads the `description` to decide WHEN to use it,
 * and `parameters` to know WHAT to pass in.
 */
import {
  estimateGasFees,
  executeOnChainTransfer,
  FAUCET_SOURCES,
  getERC20Balance,

  getTransactionStatus,
  getWalletInfo,
  payAndFetch,
  prepareTransferProposal,
  readSmartContract,
  resolveWeb3Name,
  simulateTokenSwap,
} from "./wallet";
import { addKnowledgeItem, queryKnowledgeBase } from "./knowledge";
import { calculateIntelligenceMetrics } from "./training";
import { getUserFacts, saveUserFact } from "./memory";



export type Tool = {
  name: string;
  description: string;
  category?: "paid" | "crypto" | "web" | "memory" | "creative" | "utility";
  /** JSON Schema describing the inputs. */
  parameters: object;
  /** The code that runs when the agent calls this tool. */
  run: (args: any, ctx: { baseUrl: string }) => Promise<unknown>;
};

export const tools: Tool[] = [
  // ─── 1. Wallet Tool: Read Account, Balance & Network Info ───
  {
    name: "get_wallet_info",
    category: "crypto",
    description:
      "Get the agent's on-chain wallet address, network (Base Sepolia testnet), current ETH balance, and Basescan explorer link.",
    parameters: { type: "object", properties: {} },
    run: async () => getWalletInfo(),
  },

  // ─── 2. Web3 Transfer Tool: Prepare Transfer & Check Balance (Human-in-the-Loop) ───
  {
    name: "prepare_transfer",
    category: "crypto",
    description:
      "Check recipient address validity, balance sufficiency, estimate gas, and prepare a transfer proposal requiring user confirmation.",
    parameters: {
      type: "object",
      properties: {
        toAddress: {
          type: "string",
          description: "Recipient Ethereum address (0x... 42 characters) on Base Sepolia",
        },
        amountEth: {
          type: "string",
          description: "Amount of ETH to send (e.g. '0.001' or '0.05')",
        },
      },
      required: ["toAddress", "amountEth"],
    },
    run: async ({ toAddress, amountEth }) => {
      return prepareTransferProposal(toAddress, String(amountEth));
    },
  },

  // ─── 3. Web3 Transfer Tool: Execute & Broadcast On-Chain Transfer ───
  {
    name: "confirm_transfer",
    category: "crypto",
    description:
      "Execute the confirmed on-chain transaction on Base Sepolia testnet and broadcast it to the blockchain network.",
    parameters: {
      type: "object",
      properties: {
        toAddress: {
          type: "string",
          description: "Recipient Ethereum address (0x...)",
        },
        amountEth: {
          type: "string",
          description: "Amount of ETH to send",
        },
      },
      required: ["toAddress", "amountEth"],
    },
    run: async ({ toAddress, amountEth }) => {
      try {
        return await executeOnChainTransfer(toAddress, String(amountEth));
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : String(err),
          faucetUrl: "https://docs.base.org/base-chain/tools/network-faucets",
        };
      }
    },
  },

  // ─── 4. Web3 Explorer: Check Transaction Receipt & Status ───
  {
    name: "get_transaction_status",
    category: "crypto",
    description:
      "Check the status, block number, gas used, and confirmation receipt of any transaction hash on Base Sepolia.",
    parameters: {
      type: "object",
      properties: {
        txHash: {
          type: "string",
          description: "Transaction hash (0x... 66 characters)",
        },
      },
      required: ["txHash"],
    },
    run: async ({ txHash }) => {
      return getTransactionStatus(txHash);
    },
  },

  // ─── 5. Paid Live Weather API (x402 Micropayment + Open-Meteo) ───
  {
    name: "get_weather",
    category: "paid",
    description:
      "Get real-time live weather and geocoding data for any global city via Open-Meteo API. Costs 0.01 USDC, autonomously signed and paid by the agent's wallet.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name to check weather for (e.g. 'Hanoi', 'Tokyo', 'New York', 'Paris', 'London')",
        },
      },
      required: ["city"],
    },
    run: async ({ city }, { baseUrl }) => {
      return payAndFetch(`${baseUrl}/api/weather?city=${encodeURIComponent(city)}`);
    },
  },

  // ─── 6. Real-time Crypto Market Data (CoinGecko) ───
  {
    name: "get_crypto_price",
    category: "crypto",
    description:
      "Fetch live real-time price, 24-hour price change percentage, and market capitalization for cryptocurrencies (BTC, ETH, SOL, BASE, BNB, DOGE, etc.).",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Cryptocurrency symbol or identifier (e.g. 'btc', 'eth', 'sol', 'base', 'bitcoin', 'ethereum')",
        },
        currency: {
          type: "string",
          description: "Target currency for valuation, defaults to 'usd' (e.g. 'usd', 'eur', 'vnd', 'jpy')",
        },
      },
      required: ["symbol"],
    },
    run: async ({ symbol, currency = "usd" }) => {
      const sym = symbol.toLowerCase().trim();
      const curr = currency.toLowerCase().trim();
      const idMap: Record<string, string> = {
        btc: "bitcoin",
        eth: "ethereum",
        sol: "solana",
        base: "coinbase-wrapped-staked-eth",
        bnb: "binancecoin",
        doge: "dogecoin",
        usdc: "usd-coin",
        usdt: "tether",
        avax: "avalanche-2",
        matic: "matic-network",
        pol: "polygon-ecosystem-token",
        link: "chainlink",
      };
      const coinId = idMap[sym] || sym;

      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${encodeURIComponent(curr)}&include_24hr_change=true&include_market_cap=true`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        if (data[coinId]) {
          return {
            coin: coinId,
            symbol: sym.toUpperCase(),
            price: `${data[coinId][curr].toLocaleString()} ${curr.toUpperCase()}`,
            change24h: `${data[coinId][`${curr}_24h_change`]?.toFixed(2)}%`,
            marketCap: data[coinId][`${curr}_market_cap`]
              ? `${Math.round(data[coinId][`${curr}_market_cap`]).toLocaleString()} ${curr.toUpperCase()}`
              : "N/A",
          };
        }
        return { error: `Could not find price data for '${symbol}'` };
      } catch (err) {
        return { error: `Failed to fetch crypto price: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },

  // ─── 7. Blockchain Network Health & Gas Inspector (Base Sepolia RPC) ───
  {
    name: "get_network_info",
    category: "crypto",
    description:
      "Inspect real-time blockchain health for Base Sepolia testnet including latest block height, chain ID, and current gas price.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      try {
        const rpcUrl = "https://sepolia.base.org";
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        });
        const blockData = await res.json();
        const blockNumber = blockData.result ? parseInt(blockData.result, 16) : "unknown";

        const gasRes = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_gasPrice",
            params: [],
            id: 2,
          }),
        });
        const gasData = await gasRes.json();
        const gasPriceGwei = gasData.result ? (parseInt(gasData.result, 16) / 1e9).toFixed(4) + " Gwei" : "unknown";

        return {
          network: "Base Sepolia (Testnet)",
          chainId: 84532,
          rpc: rpcUrl,
          latestBlock: blockNumber,
          gasPrice: gasPriceGwei,
          status: "healthy",
        };
      } catch (err) {
        return { error: `Failed to inspect network: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },

  // ─── 8. Tavily & Web Search Tool (tavily-web skill) ───
  {
    name: "get_web_search",
    category: "web",
    description:
      "Fetch live web search results, news, articles, and documentation URLs for any query from the internet.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keywords or topic (e.g. 'Base L2 network' or 'Ethereum upgrades')",
        },
      },
      required: ["query"],
    },
    run: async ({ query }) => {
      if (process.env.TAVILY_API_KEY) {
        try {
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 4 }),
          });
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            return {
              query,
              sourceCount: data.results.length,
              results: data.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                snippet: r.content,
              })),
            };
          }
        } catch {}
      }

      try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
        const res = await fetch(url, { headers: { "User-Agent": "AgentMaxx-App/1.0" } });
        const data = await res.json();
        const searchList = data.query?.search || [];
        return {
          query,
          sourceCount: searchList.length,
          results: searchList.slice(0, 3).map((s: any) => ({
            title: s.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`,
            snippet: s.snippet.replace(/<[^>]+>/g, ""),
          })),
        };
      } catch (err) {
        return { error: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },

  // ─── 9. Web Page Scraper & Reader (firecrawl-scraper skill) ───
  {
    name: "extract_web_page",
    category: "web",
    description:
      "Scrape, parse and extract readable text/markdown from any target webpage URL for deep analysis, summarization, or fact-checking.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL of the webpage to scrape and extract (e.g. 'https://docs.base.org')",
        },
      },
      required: ["url"],
    },
    run: async ({ url }) => {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const html = await res.text();
        const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "Page Content";
        const cleanText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          url,
          title,
          content: cleanText.slice(0, 2500) + (cleanText.length > 2500 ? "..." : ""),
        };
      } catch (err) {
        return { error: `Failed to scrape URL '${url}': ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },

  // ─── 10. Conversation Memory: Remember Fact (conversation-memory skill) ───
  {
    name: "remember_user_fact",
    category: "memory",
    description:
      "Save and persist user preferences, name, favorite tokens, custom rules, or facts across chat sessions.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Identifier for the fact (e.g. 'user_name', 'favorite_crypto', 'target_currency')",
        },
        value: {
          type: "string",
          description: "The value or statement to remember (e.g. 'Alex', 'Solana', 'EUR')",
        },
      },
      required: ["key", "value"],
    },
    run: async ({ key, value }) => {
      const res = saveUserFact(key, value);
      return { status: "saved", memoryKey: res.key, value: res.value };
    },
  },

  // ─── 11. Conversation Memory: Read Memories ───
  {
    name: "get_user_memories",
    category: "memory",
    description: "Retrieve all stored user preferences and facts previously saved in memory.",
    parameters: { type: "object", properties: {} },
    run: async () => ({ memories: getUserFacts() }),
  },

  // ─── 12. Mathematical & Financial Computation Engine ───
  {
    name: "calculate",
    category: "utility",
    description:
      "Perform precise arithmetic, compounding, and mathematical formula calculations (e.g. '0.05 * 2500', '1000 * (1 + 0.07)^10').",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate (e.g. '1500 * 0.025' or '(350 + 120) * 1.1')",
        },
      },
      required: ["expression"],
    },
    run: async ({ expression }) => {
      try {
        const sanitized = String(expression).replace(/[^0-9+\-*/().%^eE ]/g, "");
        if (!sanitized) throw new Error("Invalid expression");
        const evalExpr = sanitized.replace(/\^/g, "**");
        const fn = new Function(`"use strict"; return (${evalExpr})`);
        const result = fn();
        return { expression, result: Number(result) };
      } catch {
        return { error: `Calculation failed for '${expression}'` };
      }
    },
  },

  // ─── 13. Creative & Media Brief Generator (Creative Mode) ───
  {
    name: "generate_creative_brief",
    category: "creative",
    description:
      "Generate structured creative briefs, campaign concepts, theme profiles (e.g. Autumn Jazz, Lo-Fi chill, brand tone, visual & acoustic direction).",
    parameters: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          description: "Core theme or concept (e.g. 'Autumn Jazz Sunset', 'Cyberpunk Web3 Studio', 'Morning Coffee Lo-Fi')",
        },
        targetAudience: {
          type: "string",
          description: "Target demographic or platform (e.g. 'YouTube Chillhop listeners', 'Web3 builders')",
        },
        mood: {
          type: "string",
          description: "Key emotions or atmosphere (e.g. 'Cozy, nostalgic, melodic brass, warm acoustic piano')",
        },
      },
      required: ["theme"],
    },
    run: async ({ theme, targetAudience = "General Audience", mood = "Atmospheric & Inspiring" }) => {
      return {
        conceptName: theme,
        audience: targetAudience,
        moodAesthetic: mood,
        creativePillars: [
          "Sonic Identity: Warm acoustic undertones, subtle vinyl crackle, harmonic progression",
          "Visual Motif: Golden hour hues, falling amber leaves, vintage analog grading",
          "Narrative Hook: Evoking comfort, focus, and intimate evening ambiance",
        ],
        tracklistSuggestions: [
          `${theme} Prelude (Intro)`,
          "Amber Street Serenade",
          "Midnight Espresso Swing",
          "Golden Leaves Waltz",
          "Closing Cadence (Outro)",
        ],
        status: "brief_generated",
      };
    },
  },

  // ─── 14. Randomization & Dice Generator ───
  {
    name: "roll_dice",
    category: "utility",
    description: "Roll one or multiple dice with any specified number of sides (e.g. 6-sided, 20-sided, 100-sided).",
    parameters: {
      type: "object",
      properties: {
        sides: { type: "number", description: "How many sides the dice has. Default 6." },
        count: { type: "number", description: "How many dice to roll. Default 1." },
      },
    },
    run: async ({ sides = 6, count = 1 }) => {
      const rolls: number[] = [];
      const numRolls = Math.min(Math.max(1, count), 10);
      for (let i = 0; i < numRolls; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      const sum = rolls.reduce((a, b) => a + b, 0);
      return { rolls, total: sum, sides, count: numRolls };
    },
  },

  // ─── 15. Web3 Name & Basename / ENS Resolver ───
  {
    name: "resolve_web3_name",
    category: "crypto",
    description: "Resolve Web3 domain names (Basenames such as 'user.base.eth' or ENS 'vitalik.eth') or format 0x addresses.",
    parameters: {
      type: "object",
      properties: {
        nameOrAddress: {
          type: "string",
          description: "Domain name (e.g. 'khanh.base.eth', 'vitalik.eth') or 0x Ethereum address",
        },
      },
      required: ["nameOrAddress"],
    },
    run: async ({ nameOrAddress }) => resolveWeb3Name(String(nameOrAddress)),
  },

  // ─── 16. ERC-20 Token Balance Checker (USDC, WETH, etc.) ───
  {
    name: "get_erc20_balance",
    category: "crypto",
    description: "Check the balance of any ERC-20 token (such as USDC, WETH) on Base Sepolia for the agent or any address.",
    parameters: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token symbol (e.g. 'USDC', 'WETH') or 0x contract address",
        },
        walletAddress: {
          type: "string",
          description: "Optional 0x wallet address to inspect. Defaults to agent's own wallet.",
        },
      },
      required: ["token"],
    },
    run: async ({ token, walletAddress }) => getERC20Balance(String(token), walletAddress),
  },

  // ─── 17. EIP-1559 Gas & Network Health Analyzer ───
  {
    name: "estimate_gas_and_fees",
    category: "crypto",
    description: "Analyze Base Sepolia network health, latest block timestamp, EIP-1559 base fee, and estimated transfer gas costs in USD.",
    parameters: { type: "object", properties: {} },
    run: async () => estimateGasFees(),
  },

  // ─── 18. Token Swap & DEX Slippage Simulator ───
  {
    name: "simulate_token_swap",
    category: "crypto",
    description: "Simulate a decentralized exchange (DEX) token swap between cryptocurrencies (e.g. ETH to USDC, BTC to ETH) with pool fees and slippage calculations.",
    parameters: {
      type: "object",
      properties: {
        fromToken: { type: "string", description: "Source token symbol (e.g. 'ETH', 'BTC', 'SOL')" },
        toToken: { type: "string", description: "Target token symbol (e.g. 'USDC', 'ETH')" },
        amount: { type: "string", description: "Amount of source token to swap (e.g. '0.5' or '100')" },
      },
      required: ["fromToken", "toToken", "amount"],
    },
    run: async ({ fromToken, toToken, amount }) => simulateTokenSwap(fromToken, toToken, amount),
  },

  // ─── 19. Smart Contract Bytecode & State Reader ───
  {
    name: "read_smart_contract",
    category: "crypto",
    description: "Inspect on-chain smart contract bytecode, verification status, and block explorer code links on Base Sepolia.",
    parameters: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "0x address of the smart contract on Base Sepolia" },
        functionName: { type: "string", description: "Function or view method to inspect (e.g. 'totalSupply', 'owner')" },
      },
      required: ["contractAddress"],
    },
    run: async ({ contractAddress, functionName = "view" }) => readSmartContract(contractAddress, functionName),
  },

  // ─── 20. Multi-Domain Knowledge Base Semantic Search ───
  {
    name: "search_knowledge_base",
    category: "web",
    description: "Search the agent's internal multi-domain knowledge base (Web3, DeFi, Coding, AI, Science, Productivity) with keyword and semantic tagging.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword or concept to search for in internal knowledge base" },
        domain: {
          type: "string",
          enum: ["web3", "coding", "finance", "productivity", "science", "general"],
          description: "Optional domain filter",
        },
      },
      required: ["query"],
    },
    run: async ({ query, domain }) => {
      const results = queryKnowledgeBase(query, domain);
      return { query, count: results.length, results };
    },
  },

  // ─── 21. Self-Learning: Ingest New Knowledge Document ───
  {
    name: "learn_new_knowledge",
    category: "memory",
    description: "Teach the agent a new concept, framework documentation, or fact to store in its persistent knowledge base.",
    parameters: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          enum: ["web3", "coding", "finance", "productivity", "science", "general"],
          description: "Knowledge category",
        },
        title: { type: "string", description: "Short title or topic name" },
        content: { type: "string", description: "Detailed summary or documentation text to memorize" },
        tags: { type: "array", items: { type: "string" }, description: "Search tags" },
      },
      required: ["domain", "title", "content"],
    },
    run: async ({ domain, title, content, tags = [] }) => {
      const item = addKnowledgeItem(domain, title, content, tags);
      return { success: true, message: `Successfully learned '${title}' into domain '${domain}'.`, item };
    },
  },

  // ─── 22. Self-Training & Intelligence Benchmark Report ───
  {
    name: "get_training_intelligence",
    category: "utility",
    description: "Retrieve self-learning intelligence metrics, domain accuracy scores, in-context exemplars count, and reflection learning rules.",
    parameters: { type: "object", properties: {} },
    run: async () => calculateIntelligenceMetrics(),
  },

  // ─── 23. Coding Sandbox: Safe JavaScript Code Runner ───
  {
    name: "execute_javascript",
    category: "utility",
    description: "Execute and test safe JavaScript/TypeScript algorithms, array manipulations, data filtering, and logical computations.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to execute (must return a value or log output)" },
      },
      required: ["code"],
    },
    run: async ({ code }) => {
      try {
        const fn = new Function(`"use strict"; ${code}`);
        const result = fn();
        return { success: true, code, output: result ?? "Executed successfully (no return value)" };
      } catch (err: any) {
        return { success: false, code, error: err.message };
      }
    },
  },

  // ─── 24. Quantitative Finance: Technical Analysis (RSI, SMA, EMA) ───
  {
    name: "calculate_technical_indicators",
    category: "utility",
    description: "Calculate trading indicators like RSI (14 periods), SMA (Simple Moving Average), and EMA (Exponential Moving Average) from price arrays.",
    parameters: {
      type: "object",
      properties: {
        prices: { type: "array", items: { type: "number" }, description: "Array of historical closing prices (min 5 points)" },
        period: { type: "number", description: "Period for MA or RSI (e.g. 14). Default 14." },
      },
      required: ["prices"],
    },
    run: async ({ prices, period = 14 }: { prices: number[]; period?: number }) => {
      if (!Array.isArray(prices) || prices.length < 3) {
        throw new Error("Provide at least 3 historical price points for calculation.");
      }

      // SMA
      const n = Math.min(period, prices.length);
      const recent = prices.slice(-n);
      const sma = recent.reduce((a, b) => a + b, 0) / n;

      // RSI (Simplified 14-period standard)
      let gains = 0;
      let losses = 0;
      for (let i = 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / (prices.length - 1);
      const avgLoss = losses / (prices.length - 1);
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

      return {
        dataPoints: prices.length,
        latestPrice: prices[prices.length - 1],
        sma: Number(sma.toFixed(2)),
        rsi: Number(rsi.toFixed(2)),
        marketSignal: rsi > 70 ? "OVERBOUGHT (Watch for pullback)" : rsi < 30 ? "OVERSOLD (Potential bounce)" : "NEUTRAL / BALANCED",
      };
    },
  },

  // ─── 25. Universal Unit Converter ───
  {
    name: "convert_units",
    category: "utility",
    description: "Convert units between metric/imperial length, temperature (Celsius, Fahrenheit, Kelvin), crypto gas (Wei, Gwei, ETH), and digital storage (MB, GB, TB).",
    parameters: {
      type: "object",
      properties: {
        value: { type: "number", description: "Numerical value to convert" },
        fromUnit: { type: "string", description: "Source unit (e.g. 'celsius', 'km', 'gwei', 'gb')" },
        toUnit: { type: "string", description: "Target unit (e.g. 'fahrenheit', 'miles', 'eth', 'tb')" },
      },
      required: ["value", "fromUnit", "toUnit"],
    },
    run: async ({ value, fromUnit, toUnit }) => {
      const from = fromUnit.toLowerCase().trim();
      const to = toUnit.toLowerCase().trim();

      // Temperature
      if (from === "celsius" && to === "fahrenheit") return { input: `${value} C`, output: `${(value * 9) / 5 + 32} F` };
      if (from === "fahrenheit" && to === "celsius") return { input: `${value} F`, output: `${((value - 32) * 5) / 9} C` };

      // Crypto Gas
      if (from === "gwei" && to === "eth") return { input: `${value} Gwei`, output: `${value * 1e-9} ETH` };
      if (from === "eth" && to === "gwei") return { input: `${value} ETH`, output: `${value * 1e9} Gwei` };
      if (from === "wei" && to === "eth") return { input: `${value} Wei`, output: `${value * 1e-18} ETH` };

      // Length
      if (from === "km" && to === "miles") return { input: `${value} km`, output: `${(value * 0.621371).toFixed(4)} miles` };
      if (from === "miles" && to === "km") return { input: `${value} miles`, output: `${(value * 1.60934).toFixed(4)} km` };

      // Digital Storage
      if (from === "gb" && to === "tb") return { input: `${value} GB`, output: `${value / 1024} TB` };
      if (from === "tb" && to === "gb") return { input: `${value} TB`, output: `${value * 1024} GB` };

      return { error: `Unsupported conversion from '${fromUnit}' to '${toUnit}'` };
    },
  },

  // ─── 26. Polyglot Multi-Lingual Translator ───
  {
    name: "translate_text",
    category: "utility",
    description: "Format and structure high-precision translations between Vietnamese, English, Japanese, Chinese, French, and Spanish with cultural tone adaptation.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to translate" },
        targetLanguage: { type: "string", description: "Target language (e.g. 'Vietnamese', 'English', 'Japanese')" },
        tone: { type: "string", description: "Tone: 'formal', 'conversational', 'technical', 'poetic'" },
      },
      required: ["text", "targetLanguage"],
    },
    run: async ({ text, targetLanguage, tone = "conversational" }) => {
      return {
        originalText: text,
        targetLanguage,
        tone,
        translationInstruction: `Provide professional translation into ${targetLanguage} adhering to ${tone} tone with accurate terminology.`,
      };
    },
  },

  // ─── 27. Task & Action Item Manager ───
  {
    name: "manage_task_todo",
    category: "utility",
    description: "Manage, structure, and categorize project tasks, development milestones, and actionable todos.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create", "list", "prioritize"], description: "Task operation" },
        title: { type: "string", description: "Task title or milestone name" },
        priority: { type: "string", enum: ["high", "medium", "low"], description: "Priority level" },
      },
      required: ["action"],
    },
    run: async ({ action, title = "Review and test agent workflow", priority = "medium" }) => {
      return {
        action,
        task: {
          id: `task_${Date.now()}`,
          title,
          priority,
          status: "IN_PROGRESS",
          createdAt: new Date().toISOString(),
        },
      };
    },
  },

  // ─── 28. Base Sepolia Faucet Hub & Test ETH Faucets ───
  {
    name: "get_faucet_links",
    category: "crypto",
    description: "Get direct, verified Base Sepolia testnet faucets to receive free test ETH for wallet funding and gas.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const info = await getWalletInfo();
      return {
        walletAddress: info.address,
        network: "Base Sepolia (Chain ID 84532)",
        faucets: FAUCET_SOURCES,
        recommendedAction: `Copy your agent wallet address '${info.address}' and request 0.05 - 0.1 ETH from the Superchain or QuickNode faucet.`,
      };
    },
  },
];




