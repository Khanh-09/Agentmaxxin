/**
 * YOUR AGENT'S TOOLS
 *
 * A tool is just a function the agent is allowed to call.
 * Gemini reads the `description` to decide WHEN to use it,
 * and `parameters` to know WHAT to pass in.
 *
 * Add your own tool: copy one of the objects below, change it,
 * and save. It shows up in the "Tools" list on the page.
 */
import { getWalletAddress, getWalletBalance, payAndFetch } from "./wallet";
import { getUserFacts, removeUserFact, saveUserFact } from "./memory";

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
  // ─── 1. Paid Live Weather API (x402 Micropayment + Open-Meteo) ───
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

  // ─── 2. Real-time Crypto Market Data (CoinGecko) ───
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

  // ─── 3. Tavily & Web Search Tool (tavily-web skill) ───
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
      // 1. Try Tavily API if key is provided
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
              provider: "Tavily Search API",
              query,
              results: data.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                snippet: r.content,
              })),
            };
          }
        } catch {
          // Fall back
        }
      }

      // 2. DuckDuckGo HTML Web Search
      try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        const html = await res.text();
        const results: { title: string; url: string; snippet: string }[] = [];
        const resultBlocks = html.split('class="result__body"').slice(1);
        for (const block of resultBlocks.slice(0, 4)) {
          const titleMatch = block.match(/class="result__title"[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
          const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
          if (titleMatch || snippetMatch) {
            const rawUrl = titleMatch ? titleMatch[1] : "";
            const cleanUrlMatch = rawUrl.match(/uddg=([^&]+)/);
            const actualUrl = cleanUrlMatch ? decodeURIComponent(cleanUrlMatch[1]) : rawUrl;
            const title = titleMatch ? titleMatch[2].replace(/<[^>]+>/g, "").trim() : "Search Result";
            const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
            if (title || snippet) {
              results.push({ title, url: actualUrl, snippet });
            }
          }
        }

        if (results.length > 0) {
          return {
            query,
            sourceCount: results.length,
            results: results.slice(0, 3).map((r) => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
            })),
          };
        }
      } catch {
        // Fall back to Wikipedia
      }

      // 3. Wikipedia Open Search & Knowledge Engine
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

  // ─── 4. Web Page Scraper & Reader (firecrawl-scraper skill) ───
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
      // 1. Try Firecrawl API if configured
      if (process.env.FIRECRAWL_API_KEY) {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            },
            body: JSON.stringify({ url, formats: ["markdown"] }),
          });
          const data = await res.json();
          if (data.data?.markdown) {
            return {
              provider: "Firecrawl Scraper API",
              url,
              content: data.data.markdown.slice(0, 3000),
            };
          }
        } catch {
          // Fall back to direct fetch
        }
      }

      // 2. Built-in HTML Parser & Text Extractor Fallback
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const html = await res.text();
        const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "Page Content";
        const cleanText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          provider: "Agent Built-in Web Reader",
          url,
          title,
          content: cleanText.slice(0, 2500) + (cleanText.length > 2500 ? "..." : ""),
        };
      } catch (err) {
        return { error: `Failed to scrape URL '${url}': ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },

  // ─── 5. Conversation Memory: Remember Fact (conversation-memory skill) ───
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

  // ─── 6. Conversation Memory: Read Memories (conversation-memory skill) ───
  {
    name: "get_user_memories",
    category: "memory",
    description: "Retrieve all stored user preferences and facts previously saved in memory.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      return {
        memories: getUserFacts(),
      };
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

  // ─── 8. Mathematical & Financial Computation Engine ───
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

  // ─── 9. Agent Crypto Wallet Inspector ───
  {
    name: "get_my_wallet",
    category: "crypto",
    description:
      "Read the agent's on-chain wallet address and current ETH balance on Base Sepolia testnet.",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      address: getWalletAddress(),
      balance: await getWalletBalance(),
      network: "Base Sepolia (testnet)",
    }),
  },

  // ─── 10. Randomization & Dice Generator ───
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

  // ─── 11. Creative & Media Brief Generator (Creative Mode) ───
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
          description: "Target demographic or platform (e.g. 'YouTube Chillhop listeners', 'Web3 builders', 'Coffee shop work playlist')",
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
];




