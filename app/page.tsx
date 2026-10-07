"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Brain,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Code2,
  Coins,
  Copy,
  Download,
  Droplet,
  ExternalLink,
  FileText,
  FolderOpen,
  Fuel,
  Globe,
  GraduationCap,
  History,
  Layers,
  LineChart,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SendHorizontal,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Upload,
  User,
  Wallet,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Step = { tool: string; args: any; result: any; error?: boolean };
type Message = {
  id?: string;
  role: "user" | "agent";
  text: string;
  content?: string;
  createdAt?: string;
  taskId?: string;
  memoriesUsed?: string[];
  steps?: Step[];
  error?: boolean;
  domain?: string;
};
type Status = { hasApiKey: boolean; model: string; tools: { name: string; description: string; category?: string }[] };
type TxRecord = {
  id: string;
  type: string;
  hash?: string;
  from: string;
  to: string;
  amount: string;
  network: string;
  status: string;
  timestamp: string;
  explorerUrl?: string;
};
type FaucetSource = {
  name: string;
  url: string;
  amount: string;
  description: string;
  featured?: boolean;
};
type WalletInfo = {
  address: string | null;
  balance?: string;
  network?: string;
  chainId?: number;
  explorer?: string;
  faucetUrl?: string;
  faucets?: FaucetSource[];
  history?: TxRecord[];
};
type TrainingData = {
  metrics: {
    totalRuns: number;
    overallSuccessRate: string;
    avgGroundednessScore: number;
    domainBreakdown: Record<string, { runs: number; successRate: string; avgScore: number }>;
    learningsCount: number;
    exemplarsCount: number;
    status: string;
  };
  knowledgeCount: number;
  knowledgeBase: Array<{ id: string; domain: string; title: string; tags: string[]; source?: string }>;
  exemplars: Array<{ id: string; domain: string; userPrompt: string; score: number }>;
};
type UserMemory = {
  key: string;
  value: string;
  updatedAt: string;
};
type ScopedMemoryItem = {
  id: string;
  userId: string;
  scope: "user" | "project";
  projectId?: string;
  key: string;
  value: string;
  status: "active" | "superseded" | "proposed";
  confidence?: number;
  sourceMessageId?: string;
  sourceTaskId?: string;
  extractedMethod?: "explicit" | "inferred" | "manual";
  previousVersionId?: string;
  createdAt: string;
  updatedAt: string;
};
type StructuredHandoffSummary = {
  objective: string;
  decidedItems: string[];
  completedWork: string[];
  pendingWork: string[];
  relevantTasks: string[];
  lastUpdated: string;
};
type UserInteractionMemory = {
  id: string;
  timestamp: string;
  userMessage: string;
  agentSummary: string;
  toolsUsed?: string[];
  domain?: string;
};
type TransferProposal = {
  id: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  from: string;
  to: string;
  amountEth: string;
  amountWeiHex: string;
  amountWeiString: string;
  network: "Base Sepolia";
  chainId: 84532;
  estimatedGasEth: string;
  estimatedTotalEth: string;
  status: "PENDING_APPROVAL" | "REJECTED" | "PENDING_RECEIPT" | "CONFIRMED" | "FAILED" | "EXPIRED";
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
  error?: string;
  rejectionReason?: string;
};
type ProjectTask = {
  id: string;
  userId: string;
  title: string;
  objective: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  domain: string;
  messages: Message[];
  currentTaskId?: string;
  currentTaskStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  summary?: string;
  handoffSummary?: StructuredHandoffSummary;
  createdAt: string;
  updatedAt: string;
};

type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "interrupted";

type AgentTask = {
  id: string;
  projectId: string;
  userId: string;
  objective: string;
  status: TaskStatus;
  idempotencyKey?: string;
  payloadHash?: string;
  steps?: Array<{ name: string; status: "pending" | "running" | "completed" | "failed"; detail?: string }>;
  toolSteps?: Step[];
  sources?: any[];
  report?: any;
  usageMetrics?: {
    promptTokens?: number;
    candidateTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number | "chưa đo";
    costCalculationMethod?: string;
    toolCallsCount?: number;
    executionTimeMs?: number;
    searchProvider?: string;
    llmModel?: string;
    mode?: "live" | "mock";
  };
  result?: string;
  error?: string;
  sideEffects?: string[];
  unreversibleActions?: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  recoveredFromCrash?: boolean;
};

// 5 Core Standard Sample Tasks + Specialist Presets
const STANDARD_TASKS = [
  {
    num: "1",
    label: "🔎 1. Nghiên cứu & Dẫn nguồn",
    desc: "Tìm thông tin về Optimism OP Stack và dẫn nguồn mở được.",
    prompt: "Tìm thông tin về Optimism OP Stack và hệ sinh thái Superchain, tóm tắt cơ chế hoạt động và dẫn nguồn mở được.",
  },
  {
    num: "2",
    label: "⚖️ 2. So sánh hai phương án",
    desc: "So sánh Optimistic Rollups vs ZK-Rollups theo chi phí, tốc độ và bảo mật.",
    prompt: "So sánh hai phương án mở rộng Layer 2: Optimistic Rollups vs ZK-Rollups theo các tiêu chí: Chi phí giao dịch, Tốc độ hoàn tất (Finality) và Mức độ phức tạp bảo mật. Trình bày dạng bảng và dẫn nguồn.",
  },
  {
    num: "3",
    label: "📑 3. Đọc tài liệu & Kế hoạch",
    desc: "Đọc tài liệu và lập kế hoạch triển khai AI Agent Web3.",
    prompt: "Đọc tài liệu tri thức đã nạp và lập kế hoạch 4 bước triển khai tích hợp AI Agent tự hành có ví Base Sepolia và giao thức micropayments x402.",
  },
  {
    num: "4",
    label: "🧪 4. Kiểm tra điểm chưa chắc chắn",
    desc: "Kiểm tra rủi ro và các điểm chưa chắc chắn trong hợp đồng thông minh.",
    prompt: "Kiểm tra những điểm chưa chắc chắn và rủi ro bảo mật trong hợp đồng Solidity sau: function withdraw(uint amount) public { require(balances[msg.sender] >= amount); (bool success, ) = msg.sender.call{value: amount}(''); balances[msg.sender] -= amount; }",
  },
  {
    num: "5",
    label: "🔄 5. Tiếp tục từ kết quả trước",
    desc: "Tiếp tục công việc: phân tích phí gas EIP-1559 và tạo proposal chuyển tiền.",
    prompt: "Tiếp tục công việc từ kết quả trước: phân tích chi tiết phí gas EIP-1559 trên Base Sepolia và tạo proposal chuyển 0.0001 ETH an toàn.",
  },
];

const QUICK_EXAMPLES = [
  { label: "Web3 Faucet & Balance", prompt: "Check my wallet info and show Base Sepolia faucet links" },
  { label: "Transfer Proposal", prompt: "Prepare transfer of 0.0001 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  { label: "📊 DeFi Impermanent Loss", prompt: "Calculate DeFi Impermanent Loss and compounded APY for ETH starting at $3000 going to $4500 with 25% pool fee APR for 90 days holding $2000 deposit" },
  { label: "🔍 Decode EVM Calldata", prompt: "Decode this raw EVM calldata hex: 0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000de0b6b3a7640000" },
  { label: "Quant Finance & TA", prompt: "Calculate RSI and SMA for [2500, 2550, 2600, 2580, 2620, 2700, 2750, 2800] and search knowledge base for RSI rules" },
  { label: "🎨 UI/UX Contrast Audit", prompt: "Audit UI/UX accessibility contrast for component 'navbar' with text '#38bdf8' and background '#0b0f19' at 16px font size" },
  { label: "Coding & Sandbox", prompt: "Execute a JavaScript algorithm to filter primes from [1, 2, 3, 4, 5, 11, 13, 17, 20]" },
  { label: "Polyglot Translation", prompt: "Translate 'Autonomous AI agents with on-chain wallets will revolutionize decentralized finance' into Vietnamese and Japanese with formal tone" },
];

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [scopedMemories, setScopedMemories] = useState<ScopedMemoryItem[]>([]);
  const [memoryFilterScope, setMemoryFilterScope] = useState<"all" | "user" | "project">("all");
  const [memoryFilterStatus, setMemoryFilterStatus] = useState<"all" | "active" | "proposed" | "superseded">("all");
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [newMemoryScope, setNewMemoryScope] = useState<"user" | "project">("user");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryValue, setEditingMemoryValue] = useState("");
  const [memoryTimeline, setMemoryTimeline] = useState<UserInteractionMemory[]>([]);
  const [projects, setProjects] = useState<ProjectTask[]>([]);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectFilterStatus, setProjectFilterStatus] = useState("all");
  const [projectPage, setProjectPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>("Tác vụ nghiên cứu");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleVal, setEditingTitleVal] = useState("");
  const [currentProjectStatus, setCurrentProjectStatus] = useState<"ACTIVE" | "COMPLETED" | "PAUSED">("ACTIVE");
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [sessionUser, setSessionUser] = useState<string>("guest_default");
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [connectingUser, setConnectingUser] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "projects" | "memory" | "setup" | "faucet" | "tools" | "knowledge" | "security">("workspace");
  const [newMemoryKey, setNewMemoryKey] = useState("");
  const [newMemoryVal, setNewMemoryVal] = useState("");
  const [uploadFileText, setUploadFileText] = useState("");
  const [uploadFileName, setUploadFileName] = useState("my-notes.md");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [securityTestResult, setSecurityTestResult] = useState<any>(null);
  const [testingSecurity, setTestingSecurity] = useState(false);
  const [proposals, setProposals] = useState<TransferProposal[]>([]);
  const [isConfirmingProposalId, setIsConfirmingProposalId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [agentRuntimeConfig, setAgentRuntimeConfig] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showNewMessagesBtn, setShowNewMessagesBtn] = useState(false);

  const handleChatScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceToBottom < 80;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewMessagesBtn(false);
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      setShowNewMessagesBtn(false);
      isNearBottomRef.current = true;
    }
  };

  const getAuthHeaders = (tok = sessionToken) => ({
    "Content-Type": "application/json",
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  });

  const initSession = async (walletAddress?: string) => {
    try {
      if (typeof window !== "undefined" && !walletAddress) {
        const cached = localStorage.getItem("agentmaxx_session_token");
        if (cached) {
          try {
            const checkRes = await fetch("/api/auth/session", {
              headers: { Authorization: `Bearer ${cached}` },
            });
            const checkData = await checkRes.json();
            if (checkData.valid && checkData.token) {
              setSessionToken(checkData.token);
              setSessionUser(checkData.userId);
              if (checkData.isWallet && checkData.address) {
                setUserAccount(checkData.address);
                const eth = (window as any).ethereum;
                if (eth) {
                  eth.request({ method: "eth_getBalance", params: [checkData.address, "latest"] })
                    .then((rawBal: string) => {
                      const ethVal = (parseInt(rawBal, 16) / 1e18).toFixed(4);
                      setUserBalance(ethVal);
                    })
                    .catch(() => null);
                }
              }
              return checkData.token;
            }
          } catch {}
        }
      }

      const res = await fetch("/api/auth/session", {
        method: walletAddress ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: walletAddress ? JSON.stringify({ address: walletAddress }) : undefined,
      });
      const data = await res.json();
      if (data.token) {
        if (typeof window !== "undefined") {
          localStorage.setItem("agentmaxx_session_token", data.token);
        }
        setSessionToken(data.token);
        setSessionUser(data.userId);
        if (data.isWallet && data.address) {
          setUserAccount(data.address);
        }
        return data.token;
      }
    } catch (err) {
      console.error("Session init failed:", err);
    }
    return null;
  };

  const loadWallet = () =>
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setWallet)
      .catch(() => null);

  const loadTraining = () =>
    fetch("/api/training")
      .then((r) => r.json())
      .then(setTraining)
      .catch(() => null);

  const loadMemories = (
    tok = sessionToken,
    scope = memoryFilterScope,
    statusFilter = memoryFilterStatus,
    q = memorySearchQuery
  ) => {
    const params = new URLSearchParams();
    if (scope && scope !== "all") params.append("scope", scope);
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    if (currentProjectId) params.append("projectId", currentProjectId);
    if (q) params.append("search", q);

    fetch(`/api/memory?${params.toString()}`, { headers: getAuthHeaders(tok) })
      .then((r) => r.json())
      .then((d) => {
        if (d.memories) {
          setScopedMemories(d.memories);
          setMemories(
            d.memories
              .filter((m: ScopedMemoryItem) => m.status === "active")
              .map((m: ScopedMemoryItem) => ({ key: m.key, value: m.value, updatedAt: m.updatedAt }))
          );
        }
        if (d.timeline) setMemoryTimeline(d.timeline || []);
      })
      .catch(() => null);
  };

  const loadProjects = (
    tok = sessionToken,
    page = projectPage,
    search = projectSearchQuery,
    stat = projectFilterStatus
  ) => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", "10");
    if (search) params.append("search", search);
    if (stat && stat !== "all") params.append("status", stat);

    fetch(`/api/projects?${params.toString()}`, { headers: getAuthHeaders(tok) })
      .then((r) => r.json())
      .then((d) => {
        if (d.projects) {
          setProjects(d.projects);
          if (d.projects.length > 0) {
            const activeProj = d.projects.find((p: any) => p.status === "ACTIVE") || d.projects[0];
            if (activeProj) {
              setCurrentProjectId(activeProj.id);
              setCurrentProjectTitle(activeProj.title || "Tác vụ");
              setCurrentProjectStatus(activeProj.status || "ACTIVE");
              if (activeProj.messages && activeProj.messages.length > 0) {
                setMessages(activeProj.messages);
              }
              if (activeProj.currentTaskId) {
                setCurrentTask({
                  id: activeProj.currentTaskId,
                  projectId: activeProj.id,
                  userId: activeProj.userId,
                  objective: activeProj.objective,
                  status: activeProj.currentTaskStatus || "succeeded",
                  createdAt: activeProj.createdAt,
                });
              }
            }
          }
        }
        if (typeof d.total === "number") setTotalProjects(d.total);
      })
      .catch(() => null);
  };

  const loadProposals = (tok = sessionToken) => {
    fetch("/api/proposals", { headers: getAuthHeaders(tok) })
      .then((r) => r.json())
      .then((d) => {
        if (d.proposals) setProposals(d.proposals || []);
      })
      .catch(() => null);
  };

  const loadAgentConfig = () => {
    fetch("/api/agent/config")
      .then((r) => r.json())
      .then(setAgentRuntimeConfig)
      .catch(() => null);
  };

  const pollProposalReceipt = (proposalId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/proposals/${proposalId}/check-receipt`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.confirmed || data.proposal?.status === "CONFIRMED" || data.proposal?.status === "FAILED" || attempts > 20) {
          clearInterval(interval);
          loadProposals();
          loadWallet();
        }
      } catch {
        if (attempts > 20) clearInterval(interval);
      }
    }, 3000);
  };

  const handleCancelProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: "User cancelled proposal in preview UI" }),
      });
      const data = await res.json();
      if (data.success) {
        loadProposals();
      }
    } catch (err) {
      console.error("Cancel proposal error:", err);
    }
  };

  const handleConfirmProposalViaBrowserWallet = async (proposal: TransferProposal) => {
    if (isConfirmingProposalId) return; // Prevent double submit
    setIsConfirmingProposalId(proposal.id);
    setProposalError(null);

    try {
      // 1. Check TTL Expiration
      if (Date.now() > new Date(proposal.expiresAt).getTime()) {
        throw new Error("Proposal đã hết hạn 15 phút (TTL expired). Vui lòng yêu cầu Agent tạo proposal mới.");
      }

      // 2. Claim proposal at backend before opening browser wallet (anti-duplicate / tab-lock)
      const claimRes = await fetch(`/api/proposals/${proposal.id}/claim`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ claimSessionId: `${sessionUser}_${Date.now()}` }),
      });
      const claimData = await claimRes.json();
      if (!claimRes.ok) {
        throw new Error(claimData.error || "Proposal đang được xử lý hoặc bị khóa ở phiên khác.");
      }

      const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
      if (!eth) {
        throw new Error("Ví Web3 (MetaMask, Coinbase Wallet, Rabby, v.v.) là bắt buộc để ký và gửi giao dịch.");
      }

      // 3. Check current network
      const currentChainHex = await eth.request({ method: "eth_chainId" });
      const currentChainId = parseInt(currentChainHex, 16);
      if (currentChainId !== 84532) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x14a34" }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x14a34",
                  chainName: "Base Sepolia Testnet",
                  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://sepolia.base.org"],
                  blockExplorerUrls: ["https://sepolia.basescan.org"],
                },
              ],
            });
          } else {
            throw new Error("Vui lòng chuyển mạng ví sang Base Sepolia Testnet (Chain ID 84532) để tiếp tục.");
          }
        }
      }

      // 4. Get connected active account
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("Không tìm thấy tài khoản ví nào đang kết nối.");
      }
      const activeAccount = accounts[0];

      // Check balance
      const rawBal = await eth.request({ method: "eth_getBalance", params: [activeAccount, "latest"] });
      const currentBalWei = BigInt(rawBal);
      const sendWei = BigInt(proposal.amountWeiString);
      if (currentBalWei < sendWei) {
        throw new Error(`Số dư ví không đủ để chuyển ${proposal.amountEth} test ETH. Vui lòng nhận thêm test ETH từ vòi Faucet.`);
      }

      // Send on-chain native transfer
      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: activeAccount,
            to: proposal.to,
            value: proposal.amountWeiHex,
            chainId: "0x14a34",
          },
        ],
      });

      if (!txHash) {
        throw new Error("Giao dịch bị từ chối hoặc không thể phát sóng lên mạng Base Sepolia.");
      }

      // Submit txHash to backend proposal store immediately
      await fetch(`/api/proposals/${proposal.id}/submit-tx`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ txHash, from: activeAccount }),
      });

      loadProposals();
      pollProposalReceipt(proposal.id);
    } catch (err: any) {
      console.error("Confirmation error:", err);
      setProposalError(err?.message || String(err));
    } finally {
      setIsConfirmingProposalId(null);
    }
  };

  async function connectUserWallet() {
    setConnectingUser(true);
    try {
      const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
      if (!eth) {
        alert("Vui lòng cài đặt ví Web3 (MetaMask, Coinbase Wallet) trong trình duyệt!");
        setConnectingUser(false);
        return;
      }

      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        const acc = accounts[0];
        setUserAccount(acc);

        // 1. Authenticate with EIP-191 personal signature (kept strictly separate from tx signing)
        const challengeMessage = `Sign in to AgentMaxx with challenge: ${Date.now()} at timestamp: ${Date.now()}`;
        let signature = "";
        try {
          signature = await eth.request({
            method: "personal_sign",
            params: [challengeMessage, acc],
          });
        } catch (sigErr) {
          console.warn("User declined signature authentication:", sigErr);
        }

        if (signature) {
          const authRes = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: acc, message: challengeMessage, signature }),
          });
          const authData = await authRes.json();
          if (authData.token) {
            if (typeof window !== "undefined") {
              localStorage.setItem("agentmaxx_session_token", authData.token);
              localStorage.setItem("agentmaxx_user_account", acc);
            }
            setSessionToken(authData.token);
            setSessionUser(authData.userId);
            setUserAccount(acc);
            loadProjects(authData.token);
            loadMemories(authData.token);
            loadProposals(authData.token);
          }
        }

        // 2. Switch network to Base Sepolia
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x14a34" }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x14a34",
                  chainName: "Base Sepolia Testnet",
                  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://sepolia.base.org"],
                  blockExplorerUrls: ["https://sepolia.basescan.org"],
                },
              ],
            });
          }
        }

        // 3. Check balance
        try {
          const rawBal = await eth.request({ method: "eth_getBalance", params: [acc, "latest"] });
          const ethVal = (parseInt(rawBal, 16) / 1e18).toFixed(4);
          setUserBalance(ethVal);
        } catch {}
      }
    } catch (err) {
      console.error("Browser wallet connect failed:", err);
    }
    setConnectingUser(false);
  }

  async function disconnectWallet() {
    setUserAccount(null);
    setUserBalance(null);
    setMessages([]);
    setCurrentProjectId(null);
    setCurrentTask(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentmaxx_session_token");
      localStorage.removeItem("agentmaxx_user_account");
    }
    const guestTok = await initSession();
    if (guestTok) {
      loadProjects(guestTok);
      loadMemories(guestTok);
      loadProposals(guestTok);
    }
  }

  useEffect(() => {
    initSession().then((tok) => {
      fetch("/api/agent").then((r) => r.json()).then(setStatus);
      loadAgentConfig();
      loadWallet();
      loadTraining();
      loadMemories(tok || undefined);
      loadProposals(tok || undefined);
      if (tok) loadProjects(tok);
    });
  }, []);

  // Periodic polling for pending proposals to recover status after reload
  useEffect(() => {
    const pendingProps = proposals.filter((p) => p.status === "PENDING_RECEIPT" && p.txHash);
    if (pendingProps.length > 0) {
      for (const p of pendingProps) {
        pollProposalReceipt(p.id);
      }
    }
  }, [proposals.length]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      // Defer slightly to ensure DOM render has completed
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return () => clearTimeout(timer);
    } else if (messages.length > 0) {
      setShowNewMessagesBtn(true);
    }
  }, [messages.length, thinking]);

  /** Auto-save or update the active project session */
  async function autoSaveProject(
    msgs: Message[],
    projId: string | null = currentProjectId,
    stat: "ACTIVE" | "COMPLETED" | "PAUSED" = currentProjectStatus,
    activeTaskId?: string,
    activeTaskStat?: TaskStatus,
    customTitle?: string
  ) {
    if (msgs.length === 0 && !customTitle) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: projId || undefined,
          title: customTitle || currentProjectTitle || undefined,
          status: stat,
          messages: msgs.filter((m) => !m.error),
          currentTaskId: activeTaskId || currentTask?.id,
          currentTaskStatus: activeTaskStat || currentTask?.status,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setCurrentProjectId(data.project.id);
        setCurrentProjectTitle(data.project.title || "Tác vụ");
        loadProjects();
      }
    } catch (err) {
      console.error("Auto-save project failed:", err);
    }
  }

  function startNewTask(customTitle?: string | React.MouseEvent) {
    setMessages([]);
    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const titleStr = typeof customTitle === "string" && customTitle.trim() ? customTitle.trim() : "Tác vụ mới";
    setCurrentProjectId(newId);
    setCurrentProjectTitle(titleStr);
    setCurrentProjectStatus("ACTIVE");
    setCurrentTask(null);
    setInput("");
    setActiveTab("workspace");
  }

  async function handleSaveProjectTitle() {
    if (!editingTitleVal.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const newTitle = editingTitleVal.trim();
    setCurrentProjectTitle(newTitle);
    setIsEditingTitle(false);
    if (currentProjectId || messages.length > 0) {
      await autoSaveProject(messages, currentProjectId, currentProjectStatus, undefined, undefined, newTitle);
    }
  }

  async function resumeProject(p: ProjectTask) {
    try {
      const res = await fetch(`/api/projects/${p.id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.status === 403) {
        alert("⛔ Truy cập bị từ chối: Dự án này thuộc quyền sở hữu của người dùng khác.");
        return;
      }
      if (data.project) {
        setMessages(data.project.messages || []);
        setCurrentProjectId(data.project.id);
        setCurrentProjectTitle(data.project.title || "Tác vụ");
        setCurrentProjectStatus(data.project.status || "ACTIVE");
        setActiveTab("workspace"); // Jump directly to chat workspace with loaded history
        if (data.tasks && data.tasks.length > 0) {
          setCurrentTask(data.tasks[0]);
        } else if (data.project.currentTaskId) {
          setCurrentTask({
            id: data.project.currentTaskId,
            projectId: data.project.id,
            userId: data.project.userId,
            objective: data.project.objective,
            status: data.project.currentTaskStatus || "succeeded",
            createdAt: data.project.createdAt,
          });
        }
      }
    } catch (err) {
      console.error("Failed to resume project:", err);
    }
  }

  async function deleteProjectItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.status === 403) {
        alert("⛔ Truy cập bị từ chối: Không thể xóa dự án của người dùng khác.");
        return;
      }
      if (currentProjectId === id) {
        startNewTask();
      }
      loadProjects();
    } catch (err) {
      console.error("Delete project failed:", err);
    }
  }

  async function updateProjectStatus(newStatus: "ACTIVE" | "COMPLETED" | "PAUSED") {
    setCurrentProjectStatus(newStatus);
    if (messages.length > 0) {
      await autoSaveProject(messages, currentProjectId, newStatus);
    }
  }

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const history: Message[] = [...messages, { role: "user", text }];
    setMessages(history);
    setInput("");
    setThinking(true);

    const effectiveProjId = currentProjectId || (userAccount ? `proj_wallet_${userAccount.toLowerCase()}` : `proj_${Date.now()}`);
    let tok = sessionToken;
    if (!tok) {
      tok = (await initSession()) || "";
    }
    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. Post to async task endpoint (returns immediately < 150ms)
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: getAuthHeaders(tok),
        body: JSON.stringify({
          projectId: effectiveProjId,
          objective: text,
          messages: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      const taskId = data.taskId;
      setCurrentTask(data.task);
      if (!currentProjectId) {
        setCurrentProjectId(effectiveProjId);
      }

      // 2. Poll for real background task progress
      const pollInterval = 900;
      const maxPolls = 100;
      let polls = 0;

      const poll = async () => {
        polls++;
        try {
          const taskRes = await fetch(`/api/tasks/${taskId}`, { headers: getAuthHeaders(tok) });
          const taskJson = await taskRes.json();
          if (taskJson.task) {
            const t: AgentTask = taskJson.task;
            setCurrentTask(t);

            if (t.status === "succeeded") {
              const updatedMessages: Message[] = [
                ...history,
                { role: "agent", text: t.result || "", steps: t.toolSteps, domain: "research" },
              ];
              setMessages(updatedMessages);
              autoSaveProject(updatedMessages, effectiveProjId, currentProjectStatus, t.id, t.status);
              setThinking(false);
              loadWallet();
              loadTraining();
              loadMemories();
              return;
            }

            if (t.status === "failed" || t.status === "interrupted") {
              const updatedMessages: Message[] = [
                ...history,
                { role: "agent", text: t.error || "Tác vụ thất bại.", error: true },
              ];
              setMessages(updatedMessages);
              autoSaveProject(updatedMessages, effectiveProjId, currentProjectStatus, t.id, t.status);
              setThinking(false);
              return;
            }

            if (t.status === "cancelled") {
              const sideEffectsText =
                t.sideEffects && t.sideEffects.length > 0
                  ? `\n\n**Các thao tác đã thực hiện trước khi hủy:**\n${t.sideEffects.map((s: string) => `- ${s}`).join("\n")}`
                  : "";
              const updatedMessages: Message[] = [
                ...history,
                { role: "agent", text: `⏹️ Tác vụ đã được hủy bởi người dùng.${sideEffectsText}`, error: false },
              ];
              setMessages(updatedMessages);
              autoSaveProject(updatedMessages, effectiveProjId, currentProjectStatus, t.id, t.status);
              setThinking(false);
              return;
            }
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }

        if (polls < maxPolls) {
          setTimeout(poll, pollInterval);
        } else {
          setThinking(false);
        }
      };

      setTimeout(poll, pollInterval);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "agent", text: `Lỗi khởi tạo tác vụ: ${err.message}`, error: true },
      ]);
      setThinking(false);
    }
  }

  async function abortCurrentTask() {
    if (currentTask?.id) {
      try {
        await fetch(`/api/tasks/${currentTask.id}/cancel`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
      } catch {}
    }
    setThinking(false);
  }

  function retryLastMessage() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && !thinking) {
      send(lastUserMsg.text);
    }
  }

  async function handleAddMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryVal.trim()) return;
    await fetch("/api/memory", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        key: newMemoryKey,
        value: newMemoryVal,
        scope: newMemoryScope,
        projectId: newMemoryScope === "project" ? currentProjectId : undefined,
        method: "manual",
      }),
    });
    setNewMemoryKey("");
    setNewMemoryVal("");
    loadMemories();
  }

  async function handleApproveMemory(id: string) {
    await fetch("/api/memory", {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action: "approve" }),
    });
    loadMemories();
  }

  async function handleSaveMemoryEdit(id: string, value: string) {
    await fetch("/api/memory", {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, value }),
    });
    setEditingMemoryId(null);
    loadMemories();
  }

  async function handleDeleteMemory(idOrKey: string) {
    await fetch("/api/memory", {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: idOrKey, key: idOrKey }),
    });
    loadMemories();
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFileText.trim()) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("filename", uploadFileName);
      formData.append("text", uploadFileText);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadMsg(`✅ ${data.message}`);
        setUploadFileText("");
        loadTraining();
      } else {
        setUploadMsg(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setUploadMsg(`❌ Lỗi upload: ${err.message}`);
    }
    setUploading(false);
  }

  /** Run Access Control & Reliability Tests */
  async function runAccessControlTest(
    testType:
      | "user_b_cross_access"
      | "spoof_client_address"
      | "concurrent_same_key"
      | "payload_conflict"
      | "fake_wallet_sig"
  ) {
    setTestingSecurity(true);
    setSecurityTestResult(null);
    try {
      if (testType === "user_b_cross_access") {
        const targetProjId = currentProjectId || projects[0]?.id || "proj_sample_alpha";
        const userBRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const userBData = await userBRes.json();

        const attackRes = await fetch(`/api/projects/${targetProjId}`, {
          headers: { Authorization: `Bearer ${userBData.token}` },
        });
        const attackJson = await attackRes.json();

        setSecurityTestResult({
          title: "Kiểm tra 1: User B truy cập trái phép Dự án của User A",
          targetProjectId: targetProjId,
          userB: userBData.userId,
          httpStatus: attackRes.status,
          responseBody: attackJson,
          passed: attackRes.status === 403 || attackRes.status === 404,
          explanation:
            attackRes.status === 403
              ? "✅ Backend đã chặn thành công với mã HTTP 403 Forbidden! User B không thể đọc dự án của User A."
              : attackRes.status === 404
              ? "✅ Dự án không tồn tại hoặc đã được cách ly hoàn toàn (HTTP 404)."
              : "❌ LỖI: Server trả về trạng thái không mong muốn.",
        });
      } else if (testType === "concurrent_same_key") {
        const sharedKey = `shared_idem_${Date.now()}`;
        const p1 = fetch("/api/tasks", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            objective: "Tác vụ đồng thời A",
            idempotencyKey: sharedKey,
            messages: [{ role: "user", text: "Tác vụ đồng thời A" }],
          }),
        }).then((r) => r.json());

        const p2 = fetch("/api/tasks", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            objective: "Tác vụ đồng thời A",
            idempotencyKey: sharedKey,
            messages: [{ role: "user", text: "Tác vụ đồng thời A" }],
          }),
        }).then((r) => r.json());

        const [r1, r2] = await Promise.all([p1, p2]);
        const sameTask = r1.taskId === r2.taskId;

        setSecurityTestResult({
          title: "Kiểm tra 2: Hai request đồng thời cùng Idempotency Key",
          req1TaskId: r1.taskId,
          req2TaskId: r2.taskId,
          isDuplicateReported: r2.isDuplicate || r1.isDuplicate,
          passed: sameTask,
          explanation: sameTask
            ? `✅ Cả 2 request đồng thời đều nhận cùng Task ID (${r1.taskId}). Không có tác vụ trùng nào bị khởi tạo!`
            : "❌ LỖI: Tạo trùng 2 tác vụ khác nhau.",
          responseBody: { request1: r1, request2: r2 },
        });
      } else if (testType === "payload_conflict") {
        const conflictKey = `conflict_key_${Date.now()}`;
        // Step 1: Request with initial payload
        await fetch("/api/tasks", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            objective: "Nội dung gốc ban đầu",
            idempotencyKey: conflictKey,
            messages: [{ role: "user", text: "Nội dung gốc ban đầu" }],
          }),
        });

        // Step 2: Request with SAME key but DIFFERENT payload
        const res2 = await fetch("/api/tasks", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            objective: "NỘI DUNG HOÀN TOÀN KHÁC NHAU",
            idempotencyKey: conflictKey,
            messages: [{ role: "user", text: "NỘI DUNG HOÀN TOÀN KHÁC NHAU" }],
          }),
        });
        const json2 = await res2.json();

        setSecurityTestResult({
          title: "Kiểm tra 3: Cùng Idempotency Key nhưng khác nội dung payload",
          httpStatus: res2.status,
          passed: res2.status === 409,
          explanation:
            res2.status === 409
              ? "✅ Backend đã phát hiện xung đột và trả về HTTP 409 Conflict chính xác!"
              : "❌ LỖI: Backend không phát hiện được xung đột payload.",
          responseBody: json2,
        });
      } else if (testType === "fake_wallet_sig") {
        const fakeSigRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            message: "Sign in to AgentMaxx challenge: 12345",
            signature: "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b",
          }),
        });
        const fakeSigJson = await fakeSigRes.json();

        setSecurityTestResult({
          title: "Kiểm tra 4: Đăng nhập ví với chữ ký mật mã giả mạo",
          httpStatus: fakeSigRes.status,
          passed: fakeSigRes.status === 401,
          explanation:
            fakeSigRes.status === 401
              ? "✅ Backend đã kiểm tra viem.verifyMessage và chặn truy cập với HTTP 401 Unauthorized!"
              : "❌ LỖI: Server chấp nhận chữ ký giả.",
          responseBody: fakeSigJson,
        });
      }
    } catch (err: any) {
      setSecurityTestResult({ error: err.message });
    }
    setTestingSecurity(false);
  }

  const ready = Boolean(status?.hasApiKey);

  return (
    <main className="mx-auto flex h-[100dvh] max-h-[100dvh] max-w-[1600px] flex-col overflow-hidden px-3 py-2.5 md:px-6 md:py-3.5 gap-3">
      {/* Header */}
      <header className="shrink-0 flex flex-col gap-2.5 border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>
            <img src="/risein-logo.svg" alt="Rise In" className="mr-3 h-5 w-auto" />
            <span className="text-foreground">/ AgentMaxx</span>&nbsp;Research & Stateful Planning Cognitive Engine
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {agentRuntimeConfig?.isLive ? (
              <Badge
                variant="outline"
                className="font-mono text-xs uppercase border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex items-center gap-1.5"
                title={`Live Services: LLM (${agentRuntimeConfig.llm.model}) + Search (${agentRuntimeConfig.search.provider}) + Base RPC`}
              >
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 LIVE ENGINE ({agentRuntimeConfig.llm.model})
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="font-mono text-xs uppercase border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1.5"
              >
                <span className="size-2 rounded-full bg-amber-500" />
                🟡 DEMO / MOCK SANDBOX
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs uppercase hidden sm:inline-flex">
              Base Sepolia (84532)
            </Badge>

            {/* Session / Wallet Badge */}
            {!userAccount ? (
              <Button
                variant="outline"
                size="sm"
                onClick={connectUserWallet}
                disabled={connectingUser}
                className="font-mono text-xs border-primary/40 hover:bg-primary/10 gap-1.5"
              >
                <WalletCards className="size-3.5 text-primary" />
                {connectingUser ? "Connecting..." : "Connect Wallet"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">{userBalance ?? "0.00"} ETH</span>
                <span className="text-border hidden sm:inline">|</span>
                <code className="text-primary font-semibold text-[11px]">{userAccount.slice(0, 6)}...{userAccount.slice(-4)}</code>
                <button
                  onClick={disconnectWallet}
                  title="Disconnect Wallet"
                  className="text-muted-foreground hover:text-destructive text-[11px] ml-1 px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl leading-tight font-bold tracking-tight uppercase md:text-3xl lg:text-4xl">
              AgentMaxx <span className="text-primary">Cognitive Pro.</span>
            </h1>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground leading-relaxed">
              Agent Nghiên cứu & Lập kế hoạch có nguồn minh bạch, quản lý dự án & tác vụ theo trạng thái, bộ nhớ dài hạn đa phạm vi và thực thi an toàn trên Base Sepolia L2.
            </p>
          </div>
        </div>
      </header>

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[440px_1fr] overflow-hidden">
        {/* Left column: Navigation Tabs & Detail Cards */}
        <aside className="flex flex-col min-h-0 gap-2.5 overflow-hidden">
          {/* Tab Selection Bar */}
          <div className="shrink-0 grid grid-cols-8 gap-1 p-1 bg-muted/60 border font-mono text-[9px] uppercase">
            <button
              onClick={() => setActiveTab("workspace")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold", activeTab === "workspace" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Task
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold", activeTab === "projects" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Saved
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold flex items-center justify-center gap-0.5", activeTab === "security" ? "bg-background shadow text-rose-500" : "text-muted-foreground hover:text-foreground")}
            >
              <ShieldAlert className="size-2.5" /> Auth
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold", activeTab === "memory" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Memory
            </button>
            <button
              onClick={() => setActiveTab("setup")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold", activeTab === "setup" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Wallet
            </button>
            <button
              onClick={() => setActiveTab("faucet")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold flex items-center justify-center gap-0.5", activeTab === "faucet" ? "bg-background shadow text-amber-500" : "text-muted-foreground hover:text-foreground")}
            >
              <Droplet className="size-2.5" /> Faucet
            </button>
            <button
              onClick={() => setActiveTab("tools")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold", activeTab === "tools" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Tools
            </button>
            <button
              onClick={() => setActiveTab("knowledge")}
              className={cn("py-2 px-0.5 text-center transition-colors font-semibold", activeTab === "knowledge" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              RAG
            </button>
          </div>

          {/* TAB 1: WORKSPACE & DOCUMENT RAG */}
          {activeTab === "workspace" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between pb-2">
                <SectionTitle num="01" title="Workspace & 5 Tác Vụ Mẫu" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startNewTask}
                  className="h-7 text-xs font-mono border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Plus className="mr-1 size-3" /> Tác Vụ Mới
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 font-mono text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                {/* 5 Standard Sample Tasks */}
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Lộ trình 5 Yêu Cầu Mẫu Chuẩn:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {STANDARD_TASKS.map((t) => (
                      <button
                        key={t.num}
                        onClick={() => send(t.prompt)}
                        disabled={thinking || !ready}
                        className="p-2 border text-left bg-background hover:bg-muted/40 transition-colors flex flex-col gap-1 group"
                      >
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {t.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 font-sans">
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Document RAG Section */}
                <div className="flex flex-col gap-2 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Upload className="size-3.5" /> Nạp Tài Liệu RAG (.md / .txt)
                    </span>
                  </div>
                  <form onSubmit={handleUploadDocument} className="flex flex-col gap-2">
                    <Input
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      placeholder="Tên file (e.g. whitepaper.md)"
                      className="h-8 text-xs font-mono"
                    />
                    <textarea
                      value={uploadFileText}
                      onChange={(e) => setUploadFileText(e.target.value)}
                      placeholder="Dán nội dung tài liệu văn bản / markdown vào đây để agent phân đoạn và lập chỉ mục RAG..."
                      className="w-full h-20 p-2 text-xs font-mono bg-background border resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={uploading || !uploadFileText.trim()}
                      className="h-8 font-mono text-xs uppercase"
                    >
                      {uploading ? "Đang xử lý..." : "Nạp vào Knowledge Base"}
                    </Button>
                    {uploadMsg && <p className="text-[11px] text-primary">{uploadMsg}</p>}
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: SAVED PROJECTS, HANDOFF SUMMARIES & TASK HISTORY */}
          {activeTab === "projects" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="SAVED" title="Dự Án & Lịch Sử Tác Vụ" />
                <Button variant="ghost" size="icon-xs" onClick={() => loadProjects()} aria-label="Refresh projects">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                {/* Search & Filter Header */}
                <div className="flex flex-col gap-2 pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">
                      User ID: <code className="text-primary font-semibold">{sessionUser.slice(0, 10)}...</code>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startNewTask}
                      className="h-7 text-xs font-mono border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Plus className="mr-1 size-3" /> Tạo Mới
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 size-3 text-muted-foreground" />
                      <Input
                        value={projectSearchQuery}
                        onChange={(e) => {
                          setProjectSearchQuery(e.target.value);
                          loadProjects(sessionToken, 1, e.target.value, projectFilterStatus);
                        }}
                        placeholder="Tìm kiếm dự án, mục tiêu..."
                        className="h-7 pl-7 text-[11px] font-mono"
                      />
                    </div>
                    <select
                      value={projectFilterStatus}
                      onChange={(e) => {
                        setProjectFilterStatus(e.target.value);
                        loadProjects(sessionToken, 1, projectSearchQuery, e.target.value);
                      }}
                      className="h-7 px-2 text-[10px] font-mono bg-background border text-foreground outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="PAUSED">Paused</option>
                    </select>
                  </div>
                </div>

                {projects.length === 0 ? (
                  <p className="text-muted-foreground text-[11px] italic p-3 border text-center">
                    Không tìm thấy dự án nào phù hợp.
                  </p>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "p-3 border flex flex-col gap-2 transition-colors",
                        currentProjectId === p.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate text-xs flex items-center gap-1.5">
                          <FolderOpen className="size-3.5 text-primary" /> {p.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[9px] uppercase px-1.5 py-0",
                              p.status === "ACTIVE" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                              p.status === "COMPLETED" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                              p.status === "PAUSED" && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {p.status}
                          </Badge>
                          <button
                            onClick={(e) => deleteProjectItem(p.id, e)}
                            title="Xóa dự án"
                            className="text-muted-foreground hover:text-destructive p-0.5"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-[11px] font-sans line-clamp-2">{p.objective}</p>

                      {/* Structured Handoff Summary Card if available */}
                      {p.handoffSummary && (
                        <div className="p-2 border border-primary/20 bg-primary/5 text-[10px] flex flex-col gap-1.5 font-sans">
                          <span className="font-bold text-primary uppercase text-[10px] flex items-center gap-1">
                            <FileText className="size-3" /> Tóm Tắt Bàn Giao (Handoff Summary):
                          </span>
                          {p.handoffSummary.decidedItems?.length > 0 && (
                            <div>
                              <span className="font-semibold text-foreground">📌 Quyết định đã chốt:</span>
                              <ul className="list-disc list-inside text-muted-foreground pl-1">
                                {p.handoffSummary.decidedItems.map((d, idx) => (
                                  <li key={idx} className="truncate">{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {p.handoffSummary.completedWork?.length > 0 && (
                            <div>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">✅ Công việc hoàn thành:</span>
                              <ul className="list-disc list-inside text-muted-foreground pl-1">
                                {p.handoffSummary.completedWork.map((c, idx) => (
                                  <li key={idx} className="truncate">{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {p.handoffSummary.pendingWork?.length > 0 && (
                            <div>
                              <span className="font-semibold text-amber-600 dark:text-amber-400">⏳ Việc còn lại:</span>
                              <ul className="list-disc list-inside text-muted-foreground pl-1">
                                {p.handoffSummary.pendingWork.map((w, idx) => (
                                  <li key={idx} className="truncate">{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                        <span className="flex items-center gap-1">
                          <Clock className="size-2.5" /> {p.currentTaskStatus ? `Task: ${p.currentTaskStatus}` : `${p.messages?.length ?? 0} tin nhắn`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{new Date(p.updatedAt).toLocaleTimeString("vi-VN")}</span>
                          <Button
                            variant={currentProjectId === p.id ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => resumeProject(p)}
                            className="h-6 text-[10px] font-mono px-2"
                          >
                            <RotateCcw className="mr-1 size-2.5" />
                            {currentProjectId === p.id ? "Đang mở" : "Tiếp tục"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: SECURITY & ACCESS CONTROL TEST SUITE */}
          {activeTab === "security" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="SEC" title="Kiểm Tra Quyền Truy Cập (Auth Test)" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="p-2.5 border border-primary/30 bg-primary/5 text-muted-foreground leading-relaxed text-[11px]">
                  🛡️ <strong>Chính sách Bảo mật:</strong> Backend kiểm tra phiên mã hóa HMAC-SHA256. Mọi yêu cầu đọc/sửa/xóa đều bắt buộc xác thực quyền sở hữu; địa chỉ gửi từ client bị phớt lờ nếu không khớp chữ ký phiên.
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Chạy Thử Nghiệm Tấn Công & Độ Tin Cậy Worker:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAccessControlTest("user_b_cross_access")}
                    disabled={testingSecurity}
                    className="h-8 text-xs font-mono justify-start text-left border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                  >
                    1. User B truy cập trái phép Dự án User A (403 Forbidden)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAccessControlTest("concurrent_same_key")}
                    disabled={testingSecurity}
                    className="h-8 text-xs font-mono justify-start text-left border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
                  >
                    2. Hai request đồng thời cùng Key (Deduplication Test)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAccessControlTest("payload_conflict")}
                    disabled={testingSecurity}
                    className="h-8 text-xs font-mono justify-start text-left border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                  >
                    3. Cùng Key nhưng khác payload (409 Conflict Test)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAccessControlTest("fake_wallet_sig")}
                    disabled={testingSecurity}
                    className="h-8 text-xs font-mono justify-start text-left border-purple-500/40 text-purple-500 hover:bg-purple-500/10"
                  >
                    4. Đăng nhập ví với chữ ký giả mạo (401 Unauthorized)
                  </Button>
                </div>

                {securityTestResult && (
                  <div className="mt-3 p-3 border bg-background flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{securityTestResult.title}</span>
                      <Badge
                        variant={securityTestResult.passed ? "secondary" : "destructive"}
                        className={cn(
                          "text-[10px] uppercase font-mono",
                          securityTestResult.passed && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {securityTestResult.passed ? "PASSED (ĐẠT)" : "FAILED"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-primary font-sans">{securityTestResult.explanation}</p>
                    <div className="bg-muted/40 p-2 text-[10px] border overflow-x-auto leading-tight">
                      <div>HTTP Status: <strong>{securityTestResult.httpStatus}</strong></div>
                      <pre className="mt-1">{JSON.stringify(securityTestResult.responseBody, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: SCOPED LONG-TERM MEMORY & PERSONA MANAGER */}
          {activeTab === "memory" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="03" title="Bộ Nhớ Dài Hạn (Scoped Long-Term Memory)" />
                <Button variant="ghost" size="icon-xs" onClick={() => loadMemories()} aria-label="Refresh memory">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                {/* Scope & Status Filter Pills */}
                <div className="flex flex-col gap-2 p-2.5 border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Phạm vi (Scope):</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setMemoryFilterScope("all"); loadMemories(sessionToken, "all", memoryFilterStatus, memorySearchQuery); }}
                        className={cn("px-2 py-0.5 text-[10px] border", memoryFilterScope === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-background text-muted-foreground")}
                      >
                        Tất cả
                      </button>
                      <button
                        onClick={() => { setMemoryFilterScope("user"); loadMemories(sessionToken, "user", memoryFilterStatus, memorySearchQuery); }}
                        className={cn("px-2 py-0.5 text-[10px] border", memoryFilterScope === "user" ? "bg-primary text-primary-foreground font-bold" : "bg-background text-muted-foreground")}
                      >
                        👤 User
                      </button>
                      <button
                        onClick={() => { setMemoryFilterScope("project"); loadMemories(sessionToken, "project", memoryFilterStatus, memorySearchQuery); }}
                        className={cn("px-2 py-0.5 text-[10px] border", memoryFilterScope === "project" ? "bg-primary text-primary-foreground font-bold" : "bg-background text-muted-foreground")}
                      >
                        📁 Project
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Trạng thái:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setMemoryFilterStatus("all"); loadMemories(sessionToken, memoryFilterScope, "all", memorySearchQuery); }}
                        className={cn("px-1.5 py-0.5 text-[10px] border", memoryFilterStatus === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-background text-muted-foreground")}
                      >
                        Tất cả
                      </button>
                      <button
                        onClick={() => { setMemoryFilterStatus("active"); loadMemories(sessionToken, memoryFilterScope, "active", memorySearchQuery); }}
                        className={cn("px-1.5 py-0.5 text-[10px] border", memoryFilterStatus === "active" ? "bg-emerald-600 text-white font-bold" : "bg-background text-muted-foreground")}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => { setMemoryFilterStatus("proposed"); loadMemories(sessionToken, memoryFilterScope, "proposed", memorySearchQuery); }}
                        className={cn("px-1.5 py-0.5 text-[10px] border", memoryFilterStatus === "proposed" ? "bg-amber-600 text-white font-bold" : "bg-background text-muted-foreground")}
                      >
                        Đề xuất
                      </button>
                      <button
                        onClick={() => { setMemoryFilterStatus("superseded"); loadMemories(sessionToken, memoryFilterScope, "superseded", memorySearchQuery); }}
                        className={cn("px-1.5 py-0.5 text-[10px] border", memoryFilterStatus === "superseded" ? "bg-slate-600 text-white font-bold" : "bg-background text-muted-foreground")}
                      >
                        Cũ
                      </button>
                    </div>
                  </div>

                  {/* Search Memory Key/Value */}
                  <div className="relative pt-1">
                    <Search className="absolute left-2 top-3 size-3 text-muted-foreground" />
                    <Input
                      value={memorySearchQuery}
                      onChange={(e) => {
                        setMemorySearchQuery(e.target.value);
                        loadMemories(sessionToken, memoryFilterScope, memoryFilterStatus, e.target.value);
                      }}
                      placeholder="Tìm kiếm bộ nhớ theo khóa / nội dung..."
                      className="h-7 pl-7 text-[11px] font-mono bg-background"
                    />
                  </div>
                </div>

                {/* Add Explicit Memory Form */}
                <form onSubmit={handleAddMemory} className="flex flex-col gap-2 p-3 border bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase text-muted-foreground flex items-center gap-1">
                      <Plus className="size-3" /> Thêm Bộ Nhớ Mới:
                    </span>
                    <select
                      value={newMemoryScope}
                      onChange={(e) => setNewMemoryScope(e.target.value as any)}
                      className="h-6 px-1 text-[10px] font-mono bg-background border text-foreground outline-none"
                    >
                      <option value="user">👤 User Scope (Toàn cục)</option>
                      <option value="project">📁 Project Scope ({currentProjectId ? currentProjectId.slice(-6) : "Dự án hiện tại"})</option>
                    </select>
                  </div>
                  <Input
                    value={newMemoryKey}
                    onChange={(e) => setNewMemoryKey(e.target.value)}
                    placeholder="Khóa (e.g. user_name, target_currency, gas_limit_max)"
                    className="h-7 text-xs font-mono"
                  />
                  <Input
                    value={newMemoryVal}
                    onChange={(e) => setNewMemoryVal(e.target.value)}
                    placeholder="Nội dung giá trị (Secrets sẽ tự động bị loại bỏ an toàn)"
                    className="h-7 text-xs font-mono"
                  />
                  <Button type="submit" size="sm" className="h-7 font-mono text-xs uppercase">
                    Lưu vào Bộ Nhớ
                  </Button>
                </form>

                {/* Scoped Memory List */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Danh sách bộ nhớ ({scopedMemories.length}):
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      User: {sessionUser.slice(0, 10)}...
                    </span>
                  </div>

                  {scopedMemories.length === 0 ? (
                    <p className="text-muted-foreground text-[11px] italic p-2 border">Chưa có thông tin bộ nhớ nào khớp bộ lọc.</p>
                  ) : (
                    scopedMemories.map((m) => {
                      const isProposed = m.status === "proposed";
                      const isSuperseded = m.status === "superseded";
                      const isEditing = editingMemoryId === m.id;

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "p-2.5 border flex flex-col gap-1.5 transition-all bg-background",
                            isProposed && "border-amber-500/40 bg-amber-500/5",
                            isSuperseded && "opacity-60 border-dashed"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-primary text-xs uppercase">{m.key}</span>
                              <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 font-mono">
                                {m.scope}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[9px] uppercase px-1 py-0 font-mono",
                                  m.status === "active" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                  m.status === "proposed" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse",
                                  m.status === "superseded" && "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                                )}
                              >
                                {m.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isProposed && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproveMemory(m.id)}
                                  className="h-6 text-[10px] font-mono px-2 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                                  title="Phê duyệt đề xuất bộ nhớ này"
                                >
                                  <Check className="mr-1 size-2.5" /> Duyệt
                                </Button>
                              )}
                              {!isEditing ? (
                                <button
                                  onClick={() => {
                                    setEditingMemoryId(m.id);
                                    setEditingMemoryValue(m.value);
                                  }}
                                  className="text-muted-foreground hover:text-primary p-1 text-[10px]"
                                  title="Sửa nội dung"
                                >
                                  Sửa
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSaveMemoryEdit(m.id, editingMemoryValue)}
                                    className="text-emerald-600 hover:underline p-1 text-[10px] font-bold"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    onClick={() => setEditingMemoryId(null)}
                                    className="text-muted-foreground hover:underline p-1 text-[10px]"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteMemory(m.id)}
                                className="text-muted-foreground hover:text-destructive size-6"
                                title="Xóa bộ nhớ"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Value display or inline edit */}
                          {isEditing ? (
                            <Input
                              value={editingMemoryValue}
                              onChange={(e) => setEditingMemoryValue(e.target.value)}
                              className="h-7 text-xs font-mono mt-1"
                            />
                          ) : (
                            <p className="text-foreground text-xs select-all bg-muted/20 p-1 border font-mono break-all">
                              {m.value}
                            </p>
                          )}

                          {/* Provenance Metadata */}
                          <div className="flex flex-wrap items-center justify-between text-[9px] text-muted-foreground pt-1 border-t">
                            <span className="truncate">
                              Nguồn: {m.extractedMethod || "manual"}
                              {m.sourceTaskId ? ` (Task: ${m.sourceTaskId.slice(-6)})` : ""}
                            </span>
                            <span>{new Date(m.updatedAt).toLocaleString("vi-VN")}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Interaction Timeline */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    📜 Diễn Biến & Lịch Sử Tương Tác ({memoryTimeline.length}):
                  </p>
                  {memoryTimeline.length === 0 ? (
                    <p className="text-muted-foreground text-[11px] italic p-2 border">Chưa có nhật ký diễn biến nào cho hồ sơ này.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto">
                      {memoryTimeline.map((t) => (
                        <div key={t.id} className="p-2 border bg-background text-[11px] flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{new Date(t.timestamp).toLocaleString("vi-VN")}</span>
                            {t.domain && <span className="uppercase text-primary font-bold">[{t.domain}]</span>}
                          </div>
                          <div className="font-semibold text-foreground truncate">
                            👤 "{t.userMessage}"
                          </div>
                          <div className="text-muted-foreground line-clamp-2">
                            🤖 {t.agentSummary}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Setup, Browser Wallet & Transfer Proposals Hub */}
          {activeTab === "setup" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="04" title="Ví & Quản Lý Giao Dịch Base Sepolia" />
                <Button variant="ghost" size="icon-xs" onClick={() => { loadWallet(); loadProposals(); }} aria-label="Refresh wallet">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 font-mono text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                {/* 1. Browser Wallet Connection Card */}
                <div className="border p-3 bg-muted/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <WalletCards className="size-3.5 text-primary" /> Ví Trình Duyệt (User Browser Wallet)
                    </span>
                    <Badge variant={userAccount ? "secondary" : "outline"} className={cn("text-[10px]", userAccount ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                      {userAccount ? "Đã kết nối" : "Chưa kết nối"}
                    </Badge>
                  </div>

                  {userAccount ? (
                    <div className="flex flex-col gap-1.5 bg-background p-2.5 border">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Địa chỉ ví:</span>
                        <div className="flex items-center gap-1 font-bold text-foreground">
                          <code className="text-[11px] truncate max-w-[180px]">{userAccount}</code>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => navigator.clipboard.writeText(userAccount)}
                            title="Copy address"
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Mạng hiện tại:</span>
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                          Base Sepolia (84532)
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Số dư Test ETH:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {userBalance !== null ? `${userBalance} ETH` : "Đang tải..."}
                        </span>
                      </div>

                      {userBalance && parseFloat(userBalance) <= 0.0005 && (
                        <div className="p-2 border border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                          <CircleAlert className="size-3 shrink-0" />
                          <span>Số dư sắp hết. Vui lòng nhận thêm test ETH miễn phí từ tab Faucet.</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
                            if (eth) {
                              eth.request({
                                method: "wallet_switchEthereumChain",
                                params: [{ chainId: "0x14a34" }],
                              }).catch(() => null);
                            }
                          }}
                          className="h-7 text-[11px] font-mono"
                        >
                          <Zap className="mr-1 size-3 text-amber-500" /> Chuyển sang Base Sepolia
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={disconnectWallet}
                          className="h-7 text-[11px] font-mono"
                        >
                          Ngắt kết nối
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 p-2.5 bg-background border text-center">
                      <p className="text-[11px] text-muted-foreground">
                        Kết nối ví trình duyệt (MetaMask, Coinbase Wallet) để xác nhận và gửi giao dịch test ETH trên Base Sepolia.
                      </p>
                      <Button
                        onClick={() => connectUserWallet()}
                        disabled={connectingUser}
                        size="sm"
                        className="h-8 font-mono text-xs uppercase"
                      >
                        <Wallet className="mr-1.5 size-3.5" />
                        {connectingUser ? "Đang mở ví..." : "Kết nối Ví Trình Duyệt"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. Error Banner if any */}
                {proposalError && (
                  <div className="p-2.5 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] flex items-start gap-2">
                    <CircleAlert className="size-3.5 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Lỗi Xác Nhận Giao Dịch:</span>
                      <span className="text-[10px] break-all">{proposalError}</span>
                    </div>
                  </div>
                )}

                {/* 3. Transfer Proposals Section */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Fuel className="size-3.5 text-primary" /> Yêu Cầu Chuyển Tiền (Proposals) ({proposals.length})
                    </p>
                    <Button variant="ghost" size="icon-xs" onClick={() => loadProposals()} aria-label="Refresh proposals">
                      <RefreshCw className="size-3" />
                    </Button>
                  </div>

                  {proposals.length === 0 ? (
                    <p className="text-muted-foreground text-[11px] italic p-2.5 border bg-background">
                      Chưa có proposal chuyển tiền nào được tạo. Hãy yêu cầu Agent: "Chuyển 0.001 ETH tới ví 0x..."
                    </p>
                  ) : (
                    proposals.map((p) => {
                      const isPending = p.status === "PENDING_APPROVAL";
                      const isPendingReceipt = p.status === "PENDING_RECEIPT";
                      const isConfirmed = p.status === "CONFIRMED";
                      const isFailed = p.status === "FAILED";
                      const isRejected = p.status === "REJECTED";
                      const isExpired = p.status === "EXPIRED";

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "border p-3 flex flex-col gap-2.5 bg-background transition-all",
                            isPending && "border-amber-500/50 bg-amber-500/5 shadow-sm",
                            isPendingReceipt && "border-blue-500/50 bg-blue-500/5",
                            isConfirmed && "border-emerald-500/40 bg-emerald-500/5"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-foreground">ID: {p.id}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] uppercase font-mono px-2 py-0.5",
                                isPending && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                                isPendingReceipt && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse",
                                isConfirmed && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                                isFailed && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                                isRejected && "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
                                isExpired && "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
                              )}
                            >
                              {p.status}
                            </Badge>
                          </div>

                          {/* Proposal Details Grid */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 p-2 border">
                            <div>
                              <span className="text-muted-foreground text-[10px] block">Người nhận (To):</span>
                              <code className="text-foreground text-[10px] truncate block" title={p.to}>{p.to}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] block">Số tiền (Amount):</span>
                              <span className="font-bold text-primary">{p.amountEth} ETH</span>
                              <span className="text-muted-foreground text-[9px] block">({p.amountWeiString} Wei)</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] block">Mạng blockchain:</span>
                              <span className="text-foreground">{p.network} ({p.chainId})</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] block">Phí gas ước tính:</span>
                              <span className="text-foreground">~{p.estimatedGasEth} ETH</span>
                            </div>
                          </div>

                          {/* Tx Hash Link if available */}
                          {p.txHash && (
                            <div className="flex items-center justify-between text-[10px] bg-muted/40 p-1.5 border">
                              <span className="text-muted-foreground truncate">Tx: {p.txHash.slice(0, 16)}...</span>
                              <a
                                href={`https://sepolia.basescan.org/tx/${p.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                              >
                                Xem trên BaseScan <ExternalLink className="size-2.5" />
                              </a>
                            </div>
                          )}

                          {/* Interactive Action Buttons for Pending Approval */}
                          {isPending && (
                            <div className="flex items-center justify-end gap-2 pt-1 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelProposal(p.id)}
                                className="h-7 text-xs font-mono"
                              >
                                Hủy bỏ
                              </Button>
                              <Button
                                size="sm"
                                disabled={isConfirmingProposalId === p.id}
                                onClick={() => handleConfirmProposalViaBrowserWallet(p)}
                                className="h-7 text-xs font-mono uppercase bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isConfirmingProposalId === p.id ? "Đang gửi..." : "Xác nhận & Ký Giao Dịch"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: Faucet Center */}
          {activeTab === "faucet" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="FAUCET" title="Base Sepolia Testnet Faucets" />
                <Button variant="ghost" size="icon-xs" onClick={loadWallet} aria-label="Refresh balance">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs flex-1 min-h-0 overflow-y-auto pr-1">
                {wallet?.address && (
                  <div className="border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[11px]">
                        Agent Wallet to Fund
                      </span>
                      <Badge variant="outline" className="text-[10px] text-foreground">
                        {wallet.balance ?? "0 ETH"}
                      </Badge>
                    </div>
                    <code className="text-[11px] truncate text-foreground select-all bg-background p-1.5 border">
                      {wallet.address}
                    </code>
                    <p className="text-[11px] text-muted-foreground">
                      💡 Click any faucet below, paste the address above, and request free test ETH.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 pt-1">
                  {(wallet?.faucets ?? [
                    { name: "Superchain Faucet", url: "https://console.optimism.io/faucet", amount: "0.05 ETH", description: "Instant Base Sepolia test ETH (connect GitHub/ID)", featured: true },
                    { name: "Base Official Faucets", url: "https://docs.base.org/base-chain/tools/network-faucets", amount: "Free Test ETH", description: "Official Coinbase Developer Platform faucets aggregator", featured: true },
                    { name: "QuickNode Faucet", url: "https://faucet.quicknode.com/base/sepolia", amount: "0.05 ETH / day", description: "Instant multi-chain faucet for Base Sepolia" },
                    { name: "Alchemy Base Faucet", url: "https://www.alchemy.com/faucets/base-sepolia", amount: "0.1 ETH / day", description: "Direct testnet faucet from Alchemy" },
                    { name: "LearnWeb3 Faucet", url: "https://learnweb3.io/faucets/base_sepolia/", amount: "Instant drop", description: "Community testnet faucet without complex requirements" },
                  ]).map((f) => (
                    <div key={f.name} className={cn("border p-2.5 flex flex-col gap-1.5 bg-background", f.featured && "border-primary/40 bg-primary/5")}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{f.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          {f.amount}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{f.description}</p>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-semibold"
                        >
                          Open Faucet <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: Multi-Domain Tools Catalog */}
          {activeTab === "tools" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="06" title={`Multi-Domain Tools (${status?.tools.length ?? 0})`} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-1">
                {status?.tools.map((t) => (
                  <div key={t.name} className="border-b pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold">
                        <span className="text-primary">&gt;</span> {t.name}
                      </p>
                      {t.category && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-mono text-[10px] uppercase px-1.5 py-0",
                            t.category === "crypto" && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                            t.category === "web" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                            t.category === "memory" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                            t.category === "utility" && "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                          )}
                        >
                          {t.category}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 7: Knowledge Base & RAG Index */}
          {activeTab === "knowledge" && (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border">
              <CardHeader className="shrink-0 flex flex-row items-center justify-between">
                <SectionTitle num="07" title="RAG & Knowledge Base" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-1 font-mono text-xs">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span>Chỉ mục chunks đã lập:</span>
                  <Badge variant="secondary">{training?.knowledgeCount ?? 0} Chunks</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tài Liệu Tri Thức Sẵn Sàng Truy Vấn:
                  </p>
                  {training?.knowledgeBase.map((k) => (
                    <div key={k.id} className="border p-2 bg-background flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate">{k.title}</span>
                        <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">{k.domain}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {k.tags.map((t) => (
                          <span key={t} className="text-[9px] bg-muted px-1 py-0.2 text-muted-foreground">#{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Right column: Chat & Interactive Stateful Workbench */}
        <Card className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden border relative">
          <CardHeader className="shrink-0 border-b px-4 py-3 bg-muted/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <Terminal className="size-4 text-primary" />
              
              {/* Task Title & Inline Rename */}
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingTitleVal}
                    onChange={(e) => setEditingTitleVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveProjectTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="h-6 w-44 text-xs font-bold px-1.5 py-0 font-mono bg-background"
                  />
                  <Button size="icon" variant="ghost" className="size-6 text-emerald-500 hover:bg-emerald-500/10" onClick={handleSaveProjectTitle} title="Lưu tên tác vụ">
                    <Check className="size-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:bg-muted" onClick={() => setIsEditingTitle(false)} title="Hủy">
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors group"
                  onClick={() => {
                    setEditingTitleVal(currentProjectTitle);
                    setIsEditingTitle(true);
                  }}
                  title="Nhấp để đổi tên tác vụ"
                >
                  <span className="font-bold text-foreground uppercase max-w-[200px] sm:max-w-[260px] truncate">
                    {currentProjectTitle}
                  </span>
                  <Pencil className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary" />
                </div>
              )}

              {currentProjectId && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  ID: {currentProjectId.slice(-6)}
                </Badge>
              )}
              {currentTask && (
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] uppercase font-mono px-2 py-0.5 flex items-center gap-1",
                      currentTask.status === "running" && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse",
                      currentTask.status === "succeeded" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                      currentTask.status === "failed" && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                      currentTask.status === "queued" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                      currentTask.status === "cancelled" && "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30",
                      currentTask.status === "interrupted" && "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    Exec: {currentTask.status}
                    {currentTask.durationMs ? ` (${(currentTask.durationMs / 1000).toFixed(2)}s)` : ""}
                  </Badge>

                  {currentTask.report?.outcome && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-mono px-2 py-0.5",
                        currentTask.report.outcome === "complete" && "border-emerald-500/40 text-emerald-500 bg-emerald-500/10",
                        currentTask.report.outcome === "partial" && "border-amber-500/40 text-amber-500 bg-amber-500/10",
                        currentTask.report.outcome === "insufficient_evidence" && "border-rose-500/40 text-rose-500 bg-rose-500/10"
                      )}
                    >
                      Outcome: {currentTask.report.outcome}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Project Status Selector */}
              <div className="flex items-center gap-1 border bg-background px-2 py-0.5 font-mono text-xs">
                <span className="text-muted-foreground text-[10px]">Status:</span>
                <select
                  value={currentProjectStatus}
                  onChange={(e) => updateProjectStatus(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-primary outline-none cursor-pointer"
                >
                  <option value="ACTIVE" className="bg-background text-foreground">🟢 ACTIVE</option>
                  <option value="COMPLETED" className="bg-background text-foreground">🔵 COMPLETED</option>
                  <option value="PAUSED" className="bg-background text-foreground">🟡 PAUSED</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={startNewTask}
                title="Bắt đầu tác vụ mới"
              >
                <Plus className="mr-1 size-3" /> Tác Vụ Mới
              </Button>
            </div>
          </CardHeader>

          {/* Real-time Progress Bar & Cancellation */}
          {thinking && (
            <div className="shrink-0 flex flex-col gap-1.5 p-3 bg-primary/5 border-b border-primary/20 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-primary font-bold text-xs">
                  <span className="size-2 rounded-full bg-primary animate-ping" />
                  Đang thực thi tác vụ: {currentTask?.id ?? "task_running"}...
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abortCurrentTask}
                  className="h-6 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold"
                >
                  <Square className="mr-1 size-3 fill-current" /> Hủy tác vụ
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1 border-t border-primary/10">
                <span className="p-1 bg-primary/10 text-primary font-semibold">1. Hiểu mục tiêu</span>
                <span className="p-1 bg-primary/10 text-primary font-semibold">2. Tìm nguồn</span>
                <span className="p-1 bg-primary/10 text-primary font-semibold">3. Đối chiếu</span>
                <span className="p-1 bg-primary/10 text-primary font-semibold">4. Xuất kết quả</span>
              </div>
            </div>
          )}

          {/* WEEK 3: Human-In-The-Loop Transfer Proposal Preview Banner */}
          {proposals.filter((p) => p.status === "PENDING_APPROVAL" || p.status === "PENDING_RECEIPT").map((p) => {
            const isPendingApproval = p.status === "PENDING_APPROVAL";
            const isPendingReceipt = p.status === "PENDING_RECEIPT";

            return (
              <div
                key={p.id}
                className={cn(
                  "shrink-0 p-3.5 border-b font-mono text-xs flex flex-col gap-2.5 transition-all",
                  isPendingApproval && "bg-amber-500/10 border-amber-500/40",
                  isPendingReceipt && "bg-blue-500/10 border-blue-500/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground uppercase flex items-center gap-1.5 text-[11px]">
                    <Fuel className="size-4 text-primary" />
                    {isPendingApproval ? "⚠️ Xác nhận Giao Dịch Chuyển ETH (Human-In-The-Loop)" : "⏳ Đang Chờ Xác Nhận Trên Blockchain Base Sepolia"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] uppercase font-mono px-2 py-0.5",
                      isPendingApproval && "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40",
                      isPendingReceipt && "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40 animate-pulse"
                    )}
                  >
                    {p.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-background/80 p-2.5 border">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Người gửi (From):</span>
                    <code className="text-foreground text-[10px] truncate block font-bold">{userAccount || p.from}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Người nhận (To):</span>
                    <code className="text-foreground text-[10px] truncate block font-bold" title={p.to}>{p.to}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Số tiền chuyển:</span>
                    <span className="font-bold text-primary text-xs">{p.amountEth} ETH</span>
                    <span className="text-muted-foreground text-[9px] block">({p.amountWeiString} Wei)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Mạng & Phí ước tính:</span>
                    <span className="text-foreground">{p.network} (Gas: ~{p.estimatedGasEth} ETH)</span>
                  </div>
                </div>

                {p.txHash && (
                  <div className="flex items-center justify-between text-[11px] bg-background p-2 border">
                    <span className="text-muted-foreground truncate">Tx Hash: {p.txHash}</span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${p.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
                    >
                      BaseScan <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {isPendingApproval && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Hết hạn lúc: {new Date(p.expiresAt).toLocaleTimeString("vi-VN")}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelProposal(p.id)}
                        className="h-7 text-xs font-mono"
                      >
                        Hủy bỏ
                      </Button>
                      <Button
                        size="sm"
                        disabled={isConfirmingProposalId === p.id}
                        onClick={() => handleConfirmProposalViaBrowserWallet(p)}
                        className="h-7 text-xs font-mono uppercase bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isConfirmingProposalId === p.id ? "Đang mở ví..." : "Xác nhận & Ký Giao Dịch"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4"
            >
              {messages.length === 0 && (
                <div className="flex flex-col gap-4 py-4 font-mono text-xs">
                  <div className="border border-dashed p-4 bg-muted/20">
                    <p className="font-bold text-foreground uppercase text-xs">
                      🌟 AgentMaxx Research & Multi-Domain Stateful Engine
                    </p>
                    <p className="mt-1 text-muted-foreground leading-relaxed text-xs">
                      Chọn nhanh một trong các tác vụ nghiên cứu & kế hoạch mẫu bên dưới hoặc nhập câu hỏi trực tiếp:
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {QUICK_EXAMPLES.map((e) => (
                      <Button
                        key={e.label}
                        variant="outline"
                        onClick={() => send(e.prompt)}
                        disabled={!ready}
                        className="font-mono text-xs h-auto py-2 px-3 text-left justify-start flex flex-col items-start gap-0.5 border"
                      >
                        <span className="text-[10px] font-bold text-primary uppercase">[{e.label}]</span>
                        <span className="truncate w-full text-muted-foreground">{e.prompt}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div
                    key={i}
                    className="max-w-[85%] self-end bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm rounded-sm break-words [overflow-wrap:anywhere] min-w-0"
                  >
                    {m.text}
                  </div>
                ) : (
                  <div key={i} className="flex max-w-[92%] gap-3 self-start min-w-0 w-full">
                    <div className="flex size-8 shrink-0 items-center justify-center border bg-background">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                      {m.domain && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground shrink-0">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> Domain: <span className="font-bold text-foreground uppercase">{m.domain}</span>
                        </div>
                      )}
                      {m.steps?.map((s, j) => (
                        <div key={j} className="flex flex-col gap-2 min-w-0 max-w-full">
                          <ToolCall step={s} />
                          {s.tool === "get_web_search" && s.result?.results && (
                            <SearchResultsCard data={s.result} />
                          )}
                          {s.tool === "prepare_transfer" && s.result?.proposalId && (
                            <TransferProposalCard
                              proposal={s.result}
                              onConfirm={() =>
                                send(
                                  `confirm transfer of ${s.result.amount} to ${s.result.to} with proposal ID ${s.result.proposalId}`
                                )
                              }
                            />
                          )}
                        </div>
                      ))}
                      <div
                        className={cn(
                          "px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed break-words [overflow-wrap:anywhere] min-w-0 max-w-full overflow-x-auto",
                          m.error ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted"
                        )}
                      >
                        {m.error ? (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <CircleAlert className="size-4 shrink-0" />
                              <span>{m.text}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={retryLastMessage}
                              disabled={thinking}
                            >
                              <RefreshCw className="mr-1 size-3" /> Thử lại
                            </Button>
                          </div>
                        ) : (
                          <>
                            {m.text}
                            {m.memoriesUsed && m.memoriesUsed.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-border/40 font-mono text-[11px]">
                                <span className="flex items-center gap-1 text-primary font-semibold">
                                  <Brain className="size-3" /> Bộ nhớ đã dùng:
                                </span>
                                {m.memoriesUsed.map((memKey) => (
                                  <Badge
                                    key={memKey}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30"
                                  >
                                    {memKey}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {i === messages.length - 1 && currentTask?.report && (
                              <ReportAssessmentCard report={currentTask.report} usageMetrics={currentTask.usageMetrics} />
                            )}
                            <AgentMessageToolbar
                              text={m.text}
                              domain={m.domain}
                              sources={currentTask?.sources || m.steps?.flatMap((s) => s.result?.results || [])}
                              taskStatus={currentTask?.status}
                              reportOutcome={currentTask?.report?.outcome}
                              usageMetrics={currentTask?.usageMetrics}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
              <div />
            </div>

            {/* In-container Floating "Tin mới" Button */}
            {showNewMessagesBtn && (
              <button
                type="button"
                onClick={() => {
                  scrollToBottom(true);
                  setShowNewMessagesBtn(false);
                }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-mono shadow-lg hover:bg-primary/90 transition-all cursor-pointer animate-bounce"
              >
                <ArrowDown className="size-3.5" /> Tin mới
              </button>
            )}
          </div>

          <CardFooter className="shrink-0 border-t p-3 bg-background">
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <div className={cn("flex flex-1 items-center border border-input bg-background focus-within:border-primary", !ready && "opacity-50")}>
                <span className="pl-3 font-mono text-sm whitespace-nowrap text-muted-foreground">~/agent $</span>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ready ? "Ask any task: Research with sources, Compare options, Inspect Solidity security, or Base Sepolia transfer..." : "Add your Gemini API key to start"}
                  disabled={!ready}
                  className="h-11 border-0 bg-transparent font-mono text-sm focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100"
                />
              </div>
              <Button type="submit" className="h-11 px-5" disabled={!ready || thinking || !input.trim()} aria-label="Send">
                <SendHorizontal className="size-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center font-mono text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">{children}</p>;
}

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="font-mono text-xs">
        {num}
      </Badge>
      <h2 className="font-bold text-sm uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>;
}

function SetupStep({
  number,
  title,
  done,
  last,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold",
            done ? "bg-emerald-500 text-white" : "border text-muted-foreground"
          )}
        >
          {done ? "✓" : number}
        </div>
        {!last && <div className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pb-4">
        <p className="font-bold text-xs uppercase">{title}</p>
        {children}
      </div>
    </div>
  );
}

function WalletDetails({ wallet, onRefresh }: { wallet: WalletInfo; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const address = wallet.address ?? "";

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3 border p-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-semibold text-muted-foreground uppercase">Address</p>
        <span className="font-mono text-[10px] text-emerald-500 uppercase">Base Sepolia L2</span>
      </div>
      <div className="flex items-center justify-between gap-2 border bg-muted/40 p-2">
        <code className="truncate font-mono text-xs">{address}</code>
        <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="Copy address">
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase">
        <span>
          Balance: <span className="text-foreground font-semibold">{wallet.balance ?? "0 ETH"}</span>
        </span>
        <Button variant="ghost" size="icon-xs" onClick={onRefresh} aria-label="Refresh balance">
          <RefreshCw className="size-3" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2.5 font-mono text-xs uppercase">
        <a
          className="inline-flex items-center gap-1 hover:text-primary text-muted-foreground"
          href={wallet.explorer || `https://sepolia.basescan.org/address/${address}`}
          target="_blank"
          rel="noreferrer"
        >
          BaseScan Explorer <ExternalLink className="size-3" />
        </a>
        <a
          className="inline-flex items-center gap-1 hover:text-primary text-amber-500 font-semibold"
          href={wallet.faucetUrl || "https://console.optimism.io/faucet"}
          target="_blank"
          rel="noreferrer"
        >
          <Droplet className="size-3" /> Get Free Test ETH <ExternalLink className="size-3" />
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground">Base Sepolia L2 Testnet. Keys secured server-side.</p>
    </div>
  );
}

function TransferProposalCard({
  proposal,
  onConfirm,
}: {
  proposal: any;
  onConfirm: () => void;
}) {
  return (
    <div className="border border-amber-500/40 bg-amber-500/5 p-3.5 font-mono text-xs flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
          <ShieldCheck className="size-4" /> Transfer Proposal (Human-in-the-Loop)
        </div>
        <Badge variant="outline" className="border-amber-500/40 text-amber-500 uppercase text-[10px]">
          {proposal.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-amber-500/20">
        <div>
          <span className="text-muted-foreground">Recipient:</span>{" "}
          <span className="truncate block text-foreground font-semibold">{proposal.to}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Amount:</span>{" "}
          <span className="block text-primary font-bold">{proposal.amount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Network:</span>{" "}
          <span className="block text-foreground">{proposal.network}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Gas Est:</span>{" "}
          <span className="block text-foreground">{proposal.estimatedGas}</span>
        </div>
      </div>
      {proposal.warning && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-tight">
          ⚠️ {proposal.warning}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
        <Button
          size="sm"
          onClick={onConfirm}
          className="bg-amber-600 hover:bg-amber-700 text-white font-mono uppercase text-xs w-full"
        >
          Confirm & Execute On-Chain <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ToolCall({ step }: { step: Step }) {
  const payment = step.result?.payment;
  return (
    <Collapsible className="border font-mono text-xs bg-background">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50">
        <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]:rotate-90 text-muted-foreground" />
        <span className="text-muted-foreground uppercase text-[10px]">Tool</span>
        <span className="text-primary font-semibold">{step.tool}</span>
        {payment && (
          <Badge className="ml-auto bg-blue font-mono text-foreground uppercase text-[10px]">
            Paid {payment.amount}
          </Badge>
        )}
        {step.error && (
          <Badge variant="destructive" className="ml-auto font-mono uppercase text-[10px]">
            Failed
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 border-t px-3 py-2 bg-muted/20">
        <Json label="Input" value={step.args} />
        <Json label="Output" value={step.result} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-muted-foreground uppercase text-[10px]">{label}</p>
      <pre className="overflow-x-auto bg-background p-2 text-[11px] border leading-tight">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function SearchResultsCard({ data }: { data: any }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!data?.results || !Array.isArray(data.results) || data.results.length === 0) return null;

  return (
    <div className="border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col gap-2 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">
          <Globe className="size-3.5" /> Nguồn Nghiên Cứu Xác Thực ({data.sourceCount || data.results.length})
        </span>
        <Badge variant="outline" className="text-[9px] uppercase border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          {data.engine || "Verified Live Search"}
        </Badge>
      </div>
      <div className="flex flex-col gap-2 pt-1 border-t border-emerald-500/15">
        {data.results.map((r: any, idx: number) => {
          const sid = r.sourceId || `src_${idx + 1}`;
          const isExpanded = expandedId === sid;
          return (
            <div key={idx} className="bg-background/80 p-2.5 border border-border flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Badge variant="secondary" className="font-mono text-[9px] px-1 py-0 bg-primary/10 text-primary">
                    {sid}
                  </Badge>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-primary hover:underline truncate text-xs inline-flex items-center gap-1"
                  >
                    {r.title} <ExternalLink className="size-3 shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] uppercase font-mono px-1.5 py-0",
                      r.dataType === "page_content"
                        ? "border-purple-500/40 text-purple-500 bg-purple-500/10"
                        : "border-blue-500/40 text-blue-500 bg-blue-500/10"
                    )}
                  >
                    {r.dataType === "page_content" ? "Page Content" : "Snippet"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] uppercase font-mono px-1.5 py-0",
                      r.status === "failed"
                        ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
                        : "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                    )}
                  >
                    {r.status || "retrieved"}
                  </Badge>
                </div>
              </div>

              {r.snippet && (
                <p className="text-[11px] text-muted-foreground font-sans line-clamp-2 leading-relaxed">
                  {r.snippet}
                </p>
              )}

              {r.content && (
                <div className="mt-1">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sid)}
                    className="text-[10px] text-primary hover:underline font-mono"
                  >
                    {isExpanded ? "▲ Thu gọn nội dung" : "▼ Xem toàn bộ nội dung trích xuất"}
                  </button>
                  {isExpanded && (
                    <div className="mt-1 p-2 bg-muted/40 border text-[11px] font-sans leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {r.content}
                    </div>
                  )}
                </div>
              )}

              {r.retrievedAt && (
                <div className="text-[9px] text-muted-foreground pt-1 border-t flex items-center justify-between">
                  <span>Domain: <strong>{r.domain || new URL(r.url || "http://localhost").hostname}</strong></span>
                  <span>Truy xuất: {new Date(r.retrievedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportAssessmentCard({ report, usageMetrics }: { report: any; usageMetrics?: any }) {
  const [showClaims, setShowClaims] = useState(false);
  if (!report) return null;

  return (
    <div className="border border-primary/30 bg-primary/5 p-3 flex flex-col gap-2.5 font-mono text-xs mt-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-primary/20">
        <div className="flex items-center gap-1.5 font-bold text-foreground uppercase text-[11px]">
          <ShieldCheck className="size-3.5 text-primary" /> Thẩm Định Độ Tin Cậy & Trích Dẫn Báo Cáo
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] uppercase font-mono px-2 py-0.5",
              report.outcome === "complete" && "border-emerald-500/40 text-emerald-500 bg-emerald-500/10",
              report.outcome === "partial" && "border-amber-500/40 text-amber-500 bg-amber-500/10",
              report.outcome === "insufficient_evidence" && "border-rose-500/40 text-rose-500 bg-rose-500/10"
            )}
          >
            Outcome: {report.outcome || "complete"}
          </Badge>
          {report.citationIntegrityScore !== undefined && (
            <Badge variant="secondary" className="text-[9px] font-mono px-2 py-0.5 bg-primary/10 text-primary">
              Citation Score: {(report.citationIntegrityScore * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Epistemic Limitation Disclaimer */}
      <p className="text-[10px] text-muted-foreground font-sans leading-tight">
        ℹ️ <em>Giới hạn đo lường:</em> Chỉ số thể hiện mức độ khớp từ khóa/ngữ nghĩa giữa nhận định và nguồn trích dẫn. Không đảm bảo 100% tính đúng đắn logic đa tầng hoặc dữ liệu ngoài phạm vi nguồn.
      </p>

      {/* Detailed Itemized Cost Accounting Box */}
      {usageMetrics && (
        <div className="p-2.5 border bg-background flex flex-col gap-1.5 text-[10px] font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5 border-border/50">
            <span className="font-bold uppercase text-foreground flex items-center gap-1">
              📊 Bảng Ước Tính Chi Phí & Sử Dụng Tài Nguyên (Cost Accounting)
            </span>
            <Badge variant="outline" className="text-[9px] font-mono text-primary">
              {usageMetrics.costBreakdown?.pricingVersion || "Google AI Pricing v2025.1"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
            <div className="flex flex-col gap-0.5">
              <span>• <strong>Model LLM:</strong> {usageMetrics.llmModel || "gemini-2.5-flash"} ({usageMetrics.llmCallsCount || 1} lượt gọi)</span>
              <span>• <strong>Tokens:</strong> {usageMetrics.totalTokens ?? 0} (Prompt: {usageMetrics.promptTokens ?? 0}, Cached: {usageMetrics.cachedTokens ?? 0}, Candidates/Thinking: {usageMetrics.candidateTokens ?? 0})</span>
              <span>• <strong>Phí suy luận LLM (ước tính):</strong> <strong className="text-primary">{typeof usageMetrics.costBreakdown?.llmInferenceCostUsd === "number" ? `$${usageMetrics.costBreakdown.llmInferenceCostUsd.toFixed(6)}` : "chưa đo"}</strong></span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span>• <strong>Dịch vụ Tìm kiếm:</strong> {usageMetrics.searchProvider || "web_search"} ({usageMetrics.searchCallsCount || 0} queries)</span>
              <span>• <strong>Phí Search API (ước tính):</strong> <strong className="text-primary">{typeof usageMetrics.costBreakdown?.searchCostUsd === "number" ? `$${usageMetrics.costBreakdown.searchCostUsd.toFixed(6)}` : "$0.000000"}</strong></span>
              <span>• <strong>Tổng Chi Phí Ước Tính:</strong> <strong className="text-emerald-500 font-bold">{typeof usageMetrics.estimatedCostUsd === "number" ? `$${usageMetrics.estimatedCostUsd.toFixed(6)}` : (usageMetrics.estimatedCostUsd || "chưa đo")}</strong></span>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground font-sans italic border-t pt-1 border-border/40">
            ℹ️ {usageMetrics.costBreakdown?.disclaimer || "Ước tính mang tính tham khảo kỹ thuật dựa trên khối lượng token và số lượt gọi API, không đại diện cho hóa đơn thanh toán thực tế (invoicing) từ nhà cung cấp."}
          </p>
        </div>
      )}

      {/* Discrepancy Box */}
      {report.sourceDiscrepancies && report.sourceDiscrepancies.length > 0 && (
        <div className="p-2 border bg-amber-500/10 border-amber-500/30 flex flex-col gap-1">
          <span className="font-bold text-amber-600 dark:text-amber-400 text-[10px] uppercase">
            ⚖️ Phân tích sắc thái khác biệt giữa các nguồn:
          </span>
          {report.sourceDiscrepancies.map((d: any, idx: number) => (
            <p key={idx} className="text-[11px] text-muted-foreground font-sans leading-relaxed">
              • <strong>[{d.differingAspect}]:</strong> {d.explanation}
            </p>
          ))}
        </div>
      )}

      {/* Actionable Steps / Remediation when partial/insufficient */}
      {report.outcome !== "complete" && report.uncertaintiesAndConflicts?.length > 0 && (
        <div className="p-2 border bg-rose-500/10 border-rose-500/30 flex flex-col gap-1">
          <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] uppercase">
            ⚠️ Điểm thiếu hụt dữ liệu & Khuyến nghị bổ sung:
          </span>
          {report.uncertaintiesAndConflicts.map((u: string, idx: number) => (
            <p key={idx} className="text-[11px] text-muted-foreground font-sans">
              • {u}
            </p>
          ))}
        </div>
      )}

      {/* Collapsible Claims Breakdown */}
      {report.evidenceStatements && report.evidenceStatements.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowClaims(!showClaims)}
            className="text-[11px] text-primary hover:underline font-mono inline-flex items-center gap-1"
          >
            {showClaims ? "▲ Thu gọn thẩm định từng nhận định" : `▼ Xem chi tiết ${report.evidenceStatements.length} nhận định & bằng chứng`}
          </button>
          {showClaims && (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-primary/20">
              {report.evidenceStatements.map((c: any, idx: number) => (
                <div key={idx} className="p-2 border bg-background flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-foreground text-xs">{c.claim}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] uppercase font-mono shrink-0",
                        c.supportLevel === "supported" && "border-emerald-500/40 text-emerald-500 bg-emerald-500/10",
                        c.supportLevel === "partially_supported" && "border-amber-500/40 text-amber-500 bg-amber-500/10",
                        c.supportLevel === "unsupported" && "border-orange-500/40 text-orange-500 bg-orange-500/10",
                        c.supportLevel === "invalid_source" && "border-rose-500/40 text-rose-500 bg-rose-500/10"
                      )}
                    >
                      {c.supportLevel || "unsupported"}
                    </Badge>
                  </div>
                  {c.evidenceSnippet && (
                    <p className="text-[11px] text-muted-foreground font-sans italic">
                      Dữ kiện: {c.evidenceSnippet}
                    </p>
                  )}
                  {c.discrepancyNote && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                      ⚠️ {c.discrepancyNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentMessageToolbar({
  text,
  domain,
  sources,
  taskStatus,
  reportOutcome,
  usageMetrics,
}: {
  text: string;
  domain?: string;
  sources?: any[];
  taskStatus?: string;
  reportOutcome?: string;
  usageMetrics?: any;
}) {
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportMarkdown() {
    let reportDoc = `# Báo Cáo Nghiên Cứu & Lập Kế Hoạch (AgentMaxx Report)\n`;
    reportDoc += `**Chuyên mục (Domain):** ${domain || "General"}\n`;
    reportDoc += `**Vòng đời thực thi (Execution Status):** \`${taskStatus || "succeeded"}\`\n`;
    reportDoc += `**Chất lượng đầu ra (Report Outcome):** \`${reportOutcome || (sources?.length ? "complete" : "insufficient_evidence")}\`\n`;
    if (usageMetrics) {
      reportDoc += `**Mô hình LLM:** \`${usageMetrics.llmModel || "gemini-2.5-flash"}\` (${usageMetrics.llmCallsCount || 1} lượt suy luận)\n`;
      reportDoc += `**Tiêu thụ tài nguyên (Tokens):** ${usageMetrics.totalTokens ?? "N/A"} (Prompt: ${usageMetrics.promptTokens ?? 0}, Cached: ${usageMetrics.cachedTokens ?? 0}, Candidates/Thinking: ${usageMetrics.candidateTokens ?? 0})\n`;
      reportDoc += `**Chi phí LLM (Ước tính):** ${typeof usageMetrics.costBreakdown?.llmInferenceCostUsd === "number" ? `$${usageMetrics.costBreakdown.llmInferenceCostUsd.toFixed(6)}` : "chưa đo"}\n`;
      reportDoc += `**Chi phí Search API (Ước tính):** ${typeof usageMetrics.costBreakdown?.searchCostUsd === "number" ? `$${usageMetrics.costBreakdown.searchCostUsd.toFixed(6)}` : "$0.000000"}\n`;
      reportDoc += `**Tổng chi phí kỹ thuật (Ước tính):** ${typeof usageMetrics.estimatedCostUsd === "number" ? `$${usageMetrics.estimatedCostUsd.toFixed(6)}` : (usageMetrics.estimatedCostUsd || "chưa đo")}\n`;
      reportDoc += `**Lưu ý chi phí:** *Ước tính mang tính tham khảo kỹ thuật dựa trên khối lượng token và số lượt gọi API, không đại diện cho hóa đơn thanh toán thực tế (invoicing) từ nhà cung cấp.*\n`;
    }
    reportDoc += `**Thời gian khởi tạo:** ${new Date().toLocaleString()}\n`;
    reportDoc += `\n---\n\n## 📝 Nội Dung Báo Cáo\n\n${text}\n\n`;

    if (sources && sources.length > 0) {
      reportDoc += `---\n\n## 📚 Danh Sách Nguồn Kiểm Chứng (Verified Sources)\n\n`;
      sources.forEach((s: any, idx: number) => {
        reportDoc += `### [${s.sourceId || `src_${idx + 1}`}] ${s.title}\n`;
        reportDoc += `- **URL:** ${s.url}\n`;
        reportDoc += `- **Loại dữ liệu:** \`${s.dataType || "snippet"}\` | **Trạng thái:** \`${s.status || "retrieved"}\`\n`;
        reportDoc += `- **Thời gian truy xuất:** ${s.retrievedAt || new Date().toISOString()}\n`;
        if (s.snippet) reportDoc += `- **Trích đoạn:** ${s.snippet}\n`;
        if (s.content) reportDoc += `- **Nội dung trích xuất:** ${s.content.slice(0, 500)}...\n`;
        reportDoc += `\n`;
      });
    }

    const blob = new Blob([reportDoc], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentmaxx-research-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-border/50 font-mono text-xs">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        onClick={copyText}
      >
        {copied ? <Check className="mr-1 size-3 text-emerald-500" /> : <Copy className="mr-1 size-3" />}
        {copied ? "Đã chép" : "Sao chép"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        onClick={exportMarkdown}
      >
        <Download className="mr-1 size-3" /> Xuất Báo Cáo Markdown (.md)
      </Button>
    </div>
  );
}

