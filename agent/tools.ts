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
  /** JSON Schema describing the inputs. */
  parameters: object;
  /** The code that runs when the agent calls this tool. */
  run: (args: any, ctx: { baseUrl: string }) => Promise<unknown>;
};

export const tools: Tool[] = [
  // ─── 1. A paid API: the agent's wallet signs a payment to unlock it ───
  {
    name: "get_weather",
    description: "Get the current weather for a city. Costs 0.01 USDC, paid automatically from the agent's wallet.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name, e.g. Tokyo, New York, London" },
      },
      required: ["city"],
    },
    run: async ({ city }, { baseUrl }) => {
      return payAndFetch(`${baseUrl}/api/weather?city=${encodeURIComponent(city)}`);
    },
  },

  // ─── 2. Real-time Crypto Price Tool (CoinGecko API) ───
  {
    name: "get_crypto_price",
    description: "Fetch live real-time price, 24h change, and market cap for cryptocurrencies like BTC, ETH, SOL, BASE, etc.",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Crypto symbol or ID, e.g. btc, eth, sol, bitcoin, ethereum, solana",
        },
        currency: {
          type: "string",
          description: "Target fiat currency, default is usd (e.g. usd, eur, vnd)",
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

  // ─── 3. Blockchain Network Info (Base Sepolia RPC) ───
  {
    name: "get_network_info",
    description: "Get real-time blockchain stats for Base Sepolia testnet (latest block number, chain ID, gas price).",
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

  // ─── 4. Mathematical & Financial Calculator ───
  {
    name: "calculate",
    description: "Perform accurate mathematical expressions and financial calculations (e.g. '0.05 * 2500', '100 * (1 + 0.08)^5', 'sqrt(144)').",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate, e.g. '1500 * 0.025' or '(350 + 120) * 1.1'",
        },
      },
      required: ["expression"],
    },
    run: async ({ expression }) => {
      try {
        // Safe arithmetic evaluator
        const sanitized = String(expression).replace(/[^0-9+\-*/().%^eE ]/g, "");
        if (!sanitized) throw new Error("Invalid expression");
        // replace power syntax ^ with **
        const evalExpr = sanitized.replace(/\^/g, "**");
        const fn = new Function(`"use strict"; return (${evalExpr})`);
        const result = fn();
        return { expression, result: Number(result) };
      } catch (err) {
        return { error: `Calculation failed for '${expression}'` };
      }
    },
  },

  // ─── 5. Wallet tool: read the agent's own wallet ───
  {
    name: "get_my_wallet",
    description: "Get the agent's own wallet address and its ETH balance on Base Sepolia (testnet).",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      address: getWalletAddress(),
      balance: await getWalletBalance(),
      network: "Base Sepolia (testnet)",
    }),
  },

  // ─── 6. Dice Roller & Random Generator ───
  {
    name: "roll_dice",
    description: "Roll one or multiple dice with any number of sides (e.g. 6-sided, 20-sided).",
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

