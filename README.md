# AgentMaxx — Autonomous Web3 AI Agent (Week 1, 2 & 3 Complete)

> **Agentmaxxing 3-Week Curriculum Implementation**
> - **Week 1**: Get Agentic (Starter architecture, Gemini SDK, wallet creation, initial tool loops).
> - **Week 2**: Build & Ship (LangGraph.js cognitive architecture, routing, evaluation, persistent memory, real APIs: Open-Meteo & DuckDuckGo / Wikipedia).
> - **Week 3**: Give It A Wallet (On-chain Base Sepolia interaction, human-in-the-loop transfer proposals, live receipt verification, x402 micropayments & self-improvement benchmark loop).

Repository: [https://github.com/Khanh-09/Agentmaxxin](https://github.com/Khanh-09/Agentmaxxin)

---

## 🌟 Architecture & Features Overview

```
User Prompt ──► [agent/router.ts] (Intent Classification)
                      │
                      ▼
               [agent/graph.ts] (LangGraph Execution Engine)
                      │
   ┌──────────────────┼────────────────────────┬──────────────────────┐
   ▼                  ▼                        ▼                      ▼
[Web Search & Scrape] [Live Weather & Calc]    [Persistent Memory]    [Web3 On-Chain Wallet]
(DuckDuckGo / Wiki)   (Open-Meteo & Math)      (agent-memory.json)   (Base Sepolia RPC & viem)
   │                  │                        │                      │
   └──────────────────┴────────────────────────┴──────────────────────┘
                      │
                      ▼
             [agent/evaluate.ts] (Groundedness & Quality Verifier)
                      │
                      ▼
             [agent/logger.ts] ──► [.agent-runs.jsonl] ──► [agent/improve.ts]
```

### 1. Web3 Wallet & On-Chain Engine (`agent/wallet.ts`)
- **Real Base Sepolia Testnet RPC**: Powered by `viem` (`chainId: 84532`).
- **Human-in-the-Loop Transfer Proposals (`prepare_transfer`)**:
  - Validates recipient 0x address.
  - Verifies wallet balance.
  - Estimates gas and generates unique proposal ID.
  - Generates UI approval card before broadcasting.
- **On-Chain Execution & Confirmation (`confirm_transfer`)**:
  - Signs and broadcasts transactions to Base Sepolia L2.
  - Generates BaseScan block explorer links.
- **Transaction Receipt Inspection (`get_transaction_status`)**:
  - Fetches block number, gas used, transaction receipt, and status (`CONFIRMED_SUCCESS` / `REVERTED`).
- **Autonomous x402 Micropayments (`payAndFetch`)**:
  - Handles HTTP 402 Payment Required handshakes with cryptographic signature verification.
- **Transaction History**: Automatically tracks all transfers and proposals.

### 2. Cognitive LangGraph Pipeline (`agent/graph.ts`)
- **Dynamic Intent Routing (`agent/router.ts`)**: Routes queries across `web3`, `web_search`, `weather`, `memory`, or `general` to prune token overhead and prevent tool hallucination.
- **Persistent Conversational Memory (`agent/memory.ts`)**: Remembers user profile facts, preferences, and identity across sessions.
- **Automated Groundedness Evaluator (`agent/evaluate.ts`)**: Evaluates every model generation against retrieved tool outputs to detect hallucinations.
- **Execution Logger & Self-Improvement Optimizer (`agent/logger.ts` & `agent/improve.ts`)**: Tracks historical runs and produces actionable optimization proposals.

---

## 🛠️ Complete Tool Registry (14 Tools)

| Category | Tool | Description |
| :--- | :--- | :--- |
| **Web3 / On-Chain** | `get_wallet_info` | Returns agent wallet address, ETH balance, Base Sepolia network status, and faucet URLs. |
| **Web3 / On-Chain** | `prepare_transfer` | Prepares transfer proposal, checks balance & recipient address, estimates gas. |
| **Web3 / On-Chain** | `confirm_transfer` | Human-authorized on-chain transfer execution on Base Sepolia with BaseScan hash. |
| **Web3 / On-Chain** | `get_transaction_status` | Inspects transaction receipt, block number, gas used, and status. |
| **Web3 / On-Chain** | `get_crypto_price` | Live CoinGecko crypto prices in USD (BTC, ETH, SOL, etc.). |
| **Web3 / On-Chain** | `get_network_info` | Real-time Base Sepolia block height and gas price via RPC. |
| **Web3 / x402** | `get_paid_weather` | x402 autonomous pay-per-request weather API. |
| **Live APIs** | `get_weather` | Real-time worldwide weather via Open-Meteo live geocoding & forecast API. |
| **Web & Intelligence**| `get_web_search` | Real-time web search and knowledge lookup with citations. |
| **Web & Intelligence**| `extract_web_page` | Web scraper and markdown converter for arbitrary URLs. |
| **Memory** | `remember_user_fact` | Saves persistent facts to long-term memory. |
| **Memory** | `get_user_memories` | Retrieves stored facts and user context. |
| **Utility** | `calculate` | Mathematical expression evaluator. |
| **Utility** | `roll_dice` | Generates random dice rolls. |

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Khanh-09/Agentmaxxin.git
cd Agentmaxxin/my-agent
npm install
```

### 2. Environment Configuration
Create a `.env` file in `my-agent/`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verification & Demo Walkthrough

### 1. Check Wallet & Balance
Ask: `Check my wallet info and current Base Sepolia balance`
- Agent executes `get_wallet_info`.
- Returns address `0x7824...`, balance, and faucet link.

### 2. Prepare & Confirm Transfer (Human-in-the-Loop)
Ask: `Prepare transfer of 0.0001 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
- Agent executes `prepare_transfer`.
- Generates transfer proposal with estimated gas and verification status.
- UI renders an interactive **Transfer Proposal Card** with 1-click execution.

### 3. Self-Improvement & Benchmark Evaluation
Run optimization analysis:
```bash
curl http://localhost:3000/api/improve
```

---

## 🔒 Security Best Practices
- **Server-Side Key Isolation**: Private keys (`.agent-wallet.json`) and API keys (`.env`) are never exposed to the frontend client.
- **Git Ignore Safeguards**: `.env`, `.agent-wallet.json`, `.agent-memory.json`, `.agent-runs.jsonl`, `.agent-transactions.json` are strictly ignored.
- **Human Confirmation Gate**: No transfers are broadcast without prior proposal and user confirmation.

---

## 📄 License
MIT © 2026 Khanh-09 / Rise In Agentmaxxing
