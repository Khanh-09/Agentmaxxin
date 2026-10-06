# AgentMaxx — Multi-Domain Cognitive AI Agent & On-Chain Web3 Engine

> **Agentmaxxing 3-Week Curriculum Complete + Multi-Domain Intelligence & Active Self-Training Engine**
> - **Week 1 (Foundations & Core Loop)**: Gemini 3.5 Flash Lite engine, secure wallet generation, function calling loop, initial tools.
> - **Week 2 (Cognitive Pipeline & Real APIs)**: LangGraph.js 4-stage StateGraph architecture, intent router, persistent profile memory, automated groundedness evaluation, real-world Open-Meteo & Web Search/Scraping APIs.
> - **Week 3 (Autonomous Economy & Active Learning)**: Base Sepolia L2 on-chain execution, human-in-the-loop transfer proposals, x402 micropayments, AgentKit / GOAT SDK Web3 tools (ERC-20, DEX Swaps, EIP-1559 gas, Basenames), Multi-Domain Knowledge Base RAG, and In-Context Few-Shot Self-Training (DSPy pattern).

Repository: [https://github.com/Khanh-09/Agentmaxxin](https://github.com/Khanh-09/Agentmaxxin)

---

## 🌟 Architecture & Cognitive Pipeline

```
User Prompt ──► [agent/router.ts] (Multi-Domain Intent Classifier: Web3, Coding, Finance, Research, Creative, Utility)
                      │
                      ▼
               [agent/graph.ts] (LangGraph StateGraph Engine)
                      │
   ┌──────────────────┼────────────────────────┬────────────────────────┐
   ▼                  ▼                        ▼                        ▼
[Knowledge Base RAG]  [Few-Shot Exemplars]     [Persistent Memories]    [Tool Execution Registry (27 Tools)]
(.agent-knowledge.json)(.agent-exemplars.json) (.agent-memory.json)     ├─ Web3 & DeFi (Base Sepolia viem)
   │                  │                        │                        ├─ Coding Sandbox (JS Runner)
   │                  │                        │                        ├─ Quant Finance (RSI, SMA, EMA)
   │                  │                        │                        ├─ Web Search & Scraper
   │                  │                        │                        └─ Universal Converters & Tasks
   └──────────────────┴────────────────────────┴────────────────────────┘
                      │
                      ▼
             [agent/evaluate.ts] (Groundedness & Anti-Hallucination Scorer)
                      │
                      ├─ Score >= 90: Save High-Reward Trace to .agent-exemplars.json
                      └─ Score < 80:  Trigger Reflection & Save to .agent-learnings.json
                      │
                      ▼
             [agent/logger.ts] ──► [.agent-runs.jsonl] ──► [agent/training.ts] (Active Intelligence Benchmark)
```

---

## 🧠 Multi-Domain Capabilities & Knowledge Areas

### 1. Web3 & On-Chain Autonomous Engine (`agent/wallet.ts`)
- **Base Sepolia L2 Testnet**: Native RPC interaction via `viem` (`chainId: 84532`).
- **Human-in-the-Loop Transfer Proposals (`prepare_transfer`)**: Pre-checks balance, validates 0x addresses, estimates gas, and generates 1-click UI confirmation cards.
- **On-Chain Execution & Confirmation (`confirm_transfer`)**: Signs and broadcasts transactions with BaseScan hashes.
- **ERC-20 Token Balances (`get_erc20_balance`)**: Tracks USDC (`0x036CbD...`), WETH, or custom tokens.
- **DEX Token Swap Simulator (`simulate_token_swap`)**: Computes exchange rates, 0.3% pool fees, and slippage tolerances.
- **EIP-1559 Gas & Health Analyzer (`estimate_gas_and_fees`)**: Live Base fee, priority fee, transfer gas cost in USD.
- **Web3 Name Resolver (`resolve_web3_name`)**: Resolves Basenames (`khanh.base.eth`, `jesse.base.eth`) and ENS (`vitalik.eth`).
- **Smart Contract Inspector (`read_smart_contract`)**: Reads contract bytecode and verification status.
- **Autonomous x402 Micropayments (`payAndFetch`)**: Pay-per-request API micropayments with cryptographic signatures.

### 2. Active Self-Training & In-Context Learning (`agent/training.ts`)
- **DSPy-Style Dynamic Few-Shot Ingestion**: Automatically captures 100/100 scored execution traces and injects them as exemplars for similar queries.
- **Self-Correction & Reflection Loop**: Formulates learning rules upon low groundedness scores to prevent repeating mistakes.
- **Internal Knowledge Base RAG (`agent/knowledge.ts`)**: Ingests, indexes, and queries structured knowledge across Web3, Finance, Coding, and AI.

### 3. Quantitative Finance & Technical Analysis
- **Technical Indicators (`calculate_technical_indicators`)**: Computes 14-period RSI, Simple Moving Average (SMA), and Exponential Moving Average (EMA) with market sentiment signals (`OVERBOUGHT` / `OVERSOLD` / `NEUTRAL`).

### 4. Coding Sandbox & Algorithms
- **Safe JavaScript Runner (`execute_javascript`)**: Tests algorithms, data transformations, and mathematical proofs in an isolated environment.

### 5. Deep Web Intelligence & Polyglot Engine
- **Live Search & Scraper (`get_web_search` & `extract_web_page`)**: Live web research with citations.
- **Open-Meteo Worldwide Weather (`get_weather`)**: Live geocoding & forecast API.
- **Multi-Lingual Translator (`translate_text`)**: High-fidelity translation across Vietnamese, English, Japanese, Chinese, French, and Spanish.
- **Universal Unit Converter (`convert_units`)**: Temperature, crypto gas (Wei/Gwei/ETH), digital storage, and metric/imperial lengths.

---

## 🛠️ Complete 27 Active Tools Directory

| Domain | Tool Name | Description |
| :--- | :--- | :--- |
| **Web3** | `get_wallet_info` | Returns agent wallet address, ETH balance, Base Sepolia network status, and faucet URLs. |
| **Web3** | `prepare_transfer` | Prepares transfer proposal, checks balance & recipient address, estimates gas. |
| **Web3** | `confirm_transfer` | Human-authorized on-chain transfer execution on Base Sepolia with BaseScan hash. |
| **Web3** | `get_transaction_status` | Inspects transaction receipt, block number, gas used, and status. |
| **Web3** | `get_erc20_balance` | Checks balance of any ERC-20 token (USDC, WETH, etc.) on Base Sepolia. |
| **Web3** | `simulate_token_swap` | Simulates DEX swaps between tokens (ETH, BTC, SOL, USDC) with pool fees & slippage. |
| **Web3** | `estimate_gas_and_fees` | Analyzes Base Sepolia EIP-1559 base fee, priority fee, and estimated transfer cost in USD. |
| **Web3** | `resolve_web3_name` | Resolves Basenames (`khanh.base.eth`), ENS (`vitalik.eth`), or validates 0x addresses. |
| **Web3** | `read_smart_contract` | Inspects on-chain bytecode, contract status, and BaseScan code links. |
| **Web3** | `get_crypto_price` | Live CoinGecko crypto prices in USD (BTC, ETH, SOL, etc.). |
| **Web3** | `get_network_info` | Real-time Base Sepolia block height and gas price via RPC. |
| **Web3 / x402** | `get_paid_weather` | x402 autonomous pay-per-request weather API. |
| **Knowledge** | `search_knowledge_base` | Searches internal multi-domain knowledge base with semantic tags. |
| **Knowledge** | `learn_new_knowledge` | Teaches the agent new concepts/documentation to persist in memory. |
| **Training** | `get_training_intelligence` | Returns self-training metrics, accuracy scores, and reflection rules. |
| **Coding** | `execute_javascript` | Safe sandbox JavaScript/TypeScript code execution and test runner. |
| **Finance** | `calculate_technical_indicators` | Calculates RSI (14 periods), SMA, and EMA from historical prices. |
| **Utility** | `convert_units` | Universal converter: Celsius/Fahrenheit, Wei/Gwei/ETH, GB/TB, km/miles. |
| **Language** | `translate_text` | Polyglot multi-lingual translation with tone adaptation. |
| **Productivity** | `manage_task_todo` | Creates and organizes project development milestones and tasks. |
| **Live APIs** | `get_weather` | Real-time worldwide weather via Open-Meteo live geocoding & forecast API. |
| **Web** | `get_web_search` | Real-time web search and knowledge lookup with citations. |
| **Web** | `extract_web_page` | Web scraper and markdown converter for arbitrary URLs. |
| **Memory** | `remember_user_fact` | Saves persistent user facts to long-term memory. |
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

## 🧪 Multi-Domain Testing & Walkthrough Examples

1. **Web3 Transfer**: `Prepare transfer of 0.0001 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
2. **DeFi Swap & Gas**: `Simulate swapping 0.5 ETH to USDC and analyze Base Sepolia gas fees`
3. **Quant Finance**: `Calculate RSI and SMA for [2500, 2550, 2600, 2580, 2620, 2700, 2750, 2800] and search knowledge base for RSI rules`
4. **Coding Sandbox**: `Execute a JavaScript algorithm to filter primes from [1, 2, 3, 4, 5, 11, 13, 17, 20]`
5. **Teach Knowledge**: `Teach the agent a new knowledge fact: Base Sepolia Chain ID is 84532 and uses OP Stack`
6. **Polyglot Translation**: `Translate 'Autonomous Web3 AI agents will revolutionize decentralized finance' into Vietnamese and Japanese with formal tone`

---

## 🔒 Security Best Practices
- **Server-Side Key Isolation**: Private keys (`.agent-wallet.json`) and API keys (`.env`) are never exposed to the frontend client.
- **Git Ignore Safeguards**: `.env`, `.agent-wallet.json`, `.agent-memory.json`, `.agent-runs.jsonl`, `.agent-transactions.json`, `.agent-knowledge-base.json`, `.agent-exemplars.json`, `.agent-learnings.json` are strictly ignored.
- **Human Confirmation Gate**: No transfers are broadcast without prior proposal and user confirmation.

---

## 📄 License
MIT © 2026 Khanh-09 / Rise In Agentmaxxing
