# AgentMaxx — Autonomous Web3 AI Agent (Week 1, 2 & 3 Complete Pro Edition)

> **Agentmaxxing 3-Week Curriculum Implementation + Advanced Web3 Autonomous Agent Framework**
> - **Week 1**: Get Agentic (Starter architecture, Gemini SDK, wallet creation, initial tool loops).
> - **Week 2**: Build & Ship (LangGraph.js cognitive architecture, routing, evaluation, persistent memory, real APIs: Open-Meteo & DuckDuckGo / Wikipedia).
> - **Week 3 (Pro Edition)**: Give It A Wallet + AgentKit & GOAT SDK Features (On-chain Base Sepolia interaction, human-in-the-loop transfer proposals, ERC-20 token tracking, DEX swap simulation, EIP-1559 gas analysis, Basename / ENS resolving, smart contract inspection, live receipt verification, x402 micropayments & self-improvement benchmark loop).

Repository: [https://github.com/Khanh-09/Agentmaxxin](https://github.com/Khanh-09/Agentmaxxin)

---

## 🌟 Architecture & Features Overview

```
User Prompt ──► [agent/router.ts] (Intent Classification: Web3, Creative, Analytics, Research)
                      │
                      ▼
               [agent/graph.ts] (LangGraph Multi-Step Execution Engine)
                      │
   ┌──────────────────┼────────────────────────┬────────────────────────┐
   ▼                  ▼                        ▼                        ▼
[Web Search & Scrape] [Live Weather & Calc]    [Persistent Memory]      [Web3 On-Chain Pro Engine]
(DuckDuckGo / Wiki)   (Open-Meteo & Math)      (agent-memory.json)     (Base Sepolia RPC & viem)
   │                  │                        │                        │
   │                  │                        │                        ├─ ERC-20 Tokens (USDC/WETH)
   │                  │                        │                        ├─ DEX Swap Simulator
   │                  │                        │                        ├─ Gas & EIP-1559 Analyzer
   │                  │                        │                        ├─ Basename/ENS Resolver
   │                  │                        │                        └─ Smart Contract Inspector
   └──────────────────┴────────────────────────┴────────────────────────┘
                      │
                      ▼
             [agent/evaluate.ts] (Groundedness & Quality Verifier)
                      │
                      ▼
             [agent/logger.ts] ──► [.agent-runs.jsonl] ──► [agent/improve.ts]
```

### 1. Web3 Pro Wallet & On-Chain Engine (`agent/wallet.ts`)
Inspired by **`coinbase/agentkit`**, **`goat-sdk/goat`**, and **`elizaOS/eliza`**:
- **Real Base Sepolia Testnet RPC**: Powered by `viem` (`chainId: 84532`).
- **Human-in-the-Loop Transfer Proposals (`prepare_transfer`)**:
  - Validates recipient 0x address.
  - Verifies wallet balance.
  - Estimates gas and generates unique proposal ID.
  - Generates UI approval card before broadcasting.
- **On-Chain Execution & Confirmation (`confirm_transfer`)**:
  - Signs and broadcasts transactions to Base Sepolia L2.
  - Generates BaseScan block explorer links.
- **ERC-20 Token Tracking (`get_erc20_balance`)**:
  - Inspects balance of USDC (`0x036CbD...`), WETH (`0x4200...`), or any custom ERC-20 contract.
- **DEX Token Swap & Slippage Simulator (`simulate_token_swap`)**:
  - Computes exact swap exchange rates, 0.3% pool fees, slippage tolerances, and minimum received amounts.
- **EIP-1559 Gas & Health Analyzer (`estimate_gas_and_fees`)**:
  - Live Base fee, priority fee, transfer gas cost in USD, and block timestamps.
- **Web3 Name Resolver (`resolve_web3_name`)**:
  - Resolves Basenames (`khanh.base.eth`, `jesse.base.eth`) and ENS (`vitalik.eth`).
- **Smart Contract Inspector (`read_smart_contract`)**:
  - Reads contract bytecode and verification status on BaseScan.
- **Transaction Receipt Inspection (`get_transaction_status`)**:
  - Fetches block number, gas used, transaction receipt, and status (`CONFIRMED_SUCCESS` / `REVERTED`).
- **Autonomous x402 Micropayments (`payAndFetch`)**:
  - Handles HTTP 402 Payment Required handshakes with cryptographic signature verification.
- **Transaction History**: Automatically tracks all transfers and proposals.

### 2. Cognitive LangGraph Pipeline (`agent/graph.ts`)
- **Dynamic Intent Routing (`agent/router.ts`)**: Routes queries across `web3`, `creative`, `analytics`, `research`, or `general` to prune token overhead and prevent tool hallucination.
- **Persistent Conversational Memory (`agent/memory.ts`)**: Remembers user profile facts, preferences, and identity across sessions.
- **Automated Groundedness Evaluator (`agent/evaluate.ts`)**: Evaluates every model generation against retrieved tool outputs to detect hallucinations.
- **Execution Logger & Self-Improvement Optimizer (`agent/logger.ts` & `agent/improve.ts`)**: Tracks historical runs and produces actionable optimization proposals.

---

## 🛠️ Complete Tool Registry (19 Tools)

| Category | Tool | Description |
| :--- | :--- | :--- |
| **Web3 Pro** | `get_wallet_info` | Returns agent wallet address, ETH balance, Base Sepolia network status, and faucet URLs. |
| **Web3 Pro** | `prepare_transfer` | Prepares transfer proposal, checks balance & recipient address, estimates gas. |
| **Web3 Pro** | `confirm_transfer` | Human-authorized on-chain transfer execution on Base Sepolia with BaseScan hash. |
| **Web3 Pro** | `get_transaction_status` | Inspects transaction receipt, block number, gas used, and status. |
| **Web3 Pro** | `get_erc20_balance` | Checks balance of any ERC-20 token (USDC, WETH, etc.) on Base Sepolia. |
| **Web3 Pro** | `simulate_token_swap` | Simulates DEX swaps between tokens (ETH, BTC, SOL, USDC) with pool fees & slippage. |
| **Web3 Pro** | `estimate_gas_and_fees` | Analyzes Base Sepolia EIP-1559 base fee, priority fee, and estimated transfer cost in USD. |
| **Web3 Pro** | `resolve_web3_name` | Resolves Basenames (`khanh.base.eth`), ENS (`vitalik.eth`), or validates 0x addresses. |
| **Web3 Pro** | `read_smart_contract` | Inspects on-chain bytecode, contract status, and BaseScan code links. |
| **Web3 Pro** | `get_crypto_price` | Live CoinGecko crypto prices in USD (BTC, ETH, SOL, etc.). |
| **Web3 Pro** | `get_network_info` | Real-time Base Sepolia block height and gas price via RPC. |
| **Web3 / x402** | `get_paid_weather` | x402 autonomous pay-per-request weather API. |
| **Live APIs** | `get_weather` | Real-time worldwide weather via Open-Meteo live geocoding & forecast API. |
| **Web & Search** | `get_web_search` | Real-time web search and knowledge lookup with citations. |
| **Web & Scrape** | `extract_web_page` | Web scraper and markdown converter for arbitrary URLs. |
| **Memory** | `remember_user_fact` | Saves persistent facts to long-term memory. |
| **Memory** | `get_user_memories` | Retrieves stored facts and user context. |
| **Creative** | `generate_creative_brief` | Generates creative briefs, theme aesthetics, and tracklists. |
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

### 3. DEX Swap Simulation & Gas Analysis
Ask: `Simulate swapping 0.5 ETH to USDC and analyze Base Sepolia gas fees`
- Agent chains `simulate_token_swap` and `estimate_gas_and_fees`.
- Calculates exchange rate, slippage, pool fees, and EIP-1559 Base fees.

### 4. Self-Improvement & Benchmark Evaluation
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
