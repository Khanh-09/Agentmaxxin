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

export type Tool = {
  name: string;
  description: string;
  category?: "paid" | "crypto" | "web" | "utility";
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

  // ─── 3. Knowledge & Information Lookup (Wikipedia REST API) ───
  {
    name: "search_knowledge",
    category: "web",
    description:
      "Look up verified summaries and definitions on Wikipedia for topics, technology concepts, people, places, or history.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic or entity to search (e.g. 'Ethereum', 'Smart contract', 'Quantum computing', 'Alan Turing')",
        },
      },
      required: ["topic"],
    },
    run: async ({ topic }) => {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.trim())}`;
        const res = await fetch(url, { headers: { "User-Agent": "AgentMaxx-App/1.0" } });
        if (!res.ok) {
          return { error: `No Wikipedia article summary found for '${topic}'. Try a different keyword.` };
        }
        const data = await res.json();
        return {
          title: data.title,
          description: data.description || "N/A",
          extract: data.extract,
          url: data.content_urls?.desktop?.page,
        };
      } catch (err) {
        return { error: `Knowledge lookup failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },

  // ─── 4. Blockchain Network Health & Gas Inspector (Base Sepolia RPC) ───
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

  // ─── 5. Mathematical & Financial Computation Engine ───
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

  // ─── 6. Agent Crypto Wallet Inspector ───
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

  // ─── 7. Randomization & Dice Generator ───
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
];


