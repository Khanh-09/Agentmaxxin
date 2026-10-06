"use client";

import { useEffect, useRef, useState } from "react";
import {
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
type Message = { role: "user" | "agent"; text: string; steps?: Step[]; error?: boolean; domain?: string };
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
  createdAt: string;
  updatedAt: string;
};

type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

type AgentTask = {
  id: string;
  projectId: string;
  userId: string;
  objective: string;
  status: TaskStatus;
  idempotencyKey?: string;
  steps?: Array<{ name: string; status: "pending" | "running" | "completed" | "failed"; detail?: string }>;
  result?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
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
  const [projects, setProjects] = useState<ProjectTask[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = (tok = sessionToken) => ({
    "Content-Type": "application/json",
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  });

  const initSession = async (walletAddress?: string) => {
    try {
      const res = await fetch("/api/auth/session", {
        method: walletAddress ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: walletAddress ? JSON.stringify({ address: walletAddress }) : undefined,
      });
      const data = await res.json();
      if (data.token) {
        setSessionToken(data.token);
        setSessionUser(data.userId);
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

  const loadMemories = () =>
    fetch("/api/memory")
      .then((r) => r.json())
      .then((d) => setMemories(d.memories || []))
      .catch(() => null);

  const loadProjects = (tok = sessionToken) => {
    fetch("/api/projects", { headers: getAuthHeaders(tok) })
      .then((r) => r.json())
      .then((d) => {
        if (d.projects) setProjects(d.projects);
      })
      .catch(() => null);
  };

  useEffect(() => {
    initSession().then((tok) => {
      fetch("/api/agent").then((r) => r.json()).then(setStatus);
      loadWallet();
      loadTraining();
      loadMemories();
      if (tok) loadProjects(tok);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  /** Auto-save or update the active project session */
  async function autoSaveProject(
    msgs: Message[],
    projId: string | null = currentProjectId,
    stat: "ACTIVE" | "COMPLETED" | "PAUSED" = currentProjectStatus,
    activeTaskId?: string,
    activeTaskStat?: TaskStatus
  ) {
    if (msgs.length === 0) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: projId || undefined,
          status: stat,
          messages: msgs.filter((m) => !m.error),
          currentTaskId: activeTaskId || currentTask?.id,
          currentTaskStatus: activeTaskStat || currentTask?.status,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setCurrentProjectId(data.project.id);
        loadProjects();
      }
    } catch (err) {
      console.error("Auto-save project failed:", err);
    }
  }

  function startNewTask() {
    setMessages([]);
    setCurrentProjectId(null);
    setCurrentProjectStatus("ACTIVE");
    setCurrentTask(null);
    setInput("");
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
        setCurrentProjectStatus(data.project.status || "ACTIVE");
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

  /** Connect User's Browser Web3 Wallet (MetaMask / Coinbase / Rabby) */
  async function connectBrowserWallet() {
    const eth = (window as any)?.ethereum;
    if (!eth) {
      alert("No Web3 browser wallet (MetaMask, Rabby, Coinbase Wallet) detected. Please install an extension.");
      return;
    }
    setConnectingUser(true);
    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts && accounts[0]) {
        const acc = accounts[0];
        setUserAccount(acc);
        const newTok = await initSession(acc);
        if (newTok) {
          loadProjects(newTok);
        }

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

        try {
          const rawBal = await eth.request({
            method: "eth_getBalance",
            params: [acc, "latest"],
          });
          const ethVal = (parseInt(rawBal, 16) / 1e18).toFixed(4);
          setUserBalance(ethVal);
        } catch {}
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
    }
    setConnectingUser(false);
  }

  async function disconnectWallet() {
    setUserAccount(null);
    setUserBalance(null);
    const guestTok = await initSession();
    if (guestTok) {
      loadProjects(guestTok);
    }
  }

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const history: Message[] = [...messages, { role: "user", text }];
    setMessages(history);
    setInput("");
    setThinking(true);

    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveProjId = currentProjectId || `proj_${Date.now()}`;

    const initialTask: AgentTask = {
      id: `task_${Date.now()}`,
      projectId: effectiveProjId,
      userId: sessionUser,
      objective: text,
      status: "running",
      idempotencyKey,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setCurrentTask(initialTask);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messages: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
          projectId: effectiveProjId,
          idempotencyKey,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      const updatedMessages: Message[] = [
        ...history,
        data.error
          ? { role: "agent", text: data.error, error: true }
          : { role: "agent", text: data.answer, steps: data.steps, domain: data.domain },
      ];
      setMessages(updatedMessages);

      if (data.task) {
        setCurrentTask(data.task);
        autoSaveProject(updatedMessages, data.projectId || effectiveProjId, currentProjectStatus, data.task.id, data.task.status);
      } else {
        autoSaveProject(updatedMessages, effectiveProjId, currentProjectStatus);
      }

      loadWallet();
      loadTraining();
      loadMemories();
    } catch (err: any) {
      if (err.name === "AbortError") {
        const updatedMessages: Message[] = [
          ...history,
          { role: "agent", text: "⏹️ Tác vụ đã được hủy bởi người dùng.", error: false },
        ];
        setMessages(updatedMessages);
        if (currentTask) {
          const cancelledTask: AgentTask = { ...currentTask, status: "cancelled", completedAt: new Date().toISOString() };
          setCurrentTask(cancelledTask);
          autoSaveProject(updatedMessages, effectiveProjId, currentProjectStatus, cancelledTask.id, "cancelled");
        }
      } else {
        setMessages((m) => [
          ...m,
          { role: "agent", text: "Could not reach the server. Is `npm run dev` still running?", error: true },
        ]);
        if (currentTask) {
          setCurrentTask({ ...currentTask, status: "failed", error: String(err) });
        }
      }
    }
    setThinking(false);
    abortControllerRef.current = null;
  }

  async function abortCurrentTask() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
      body: JSON.stringify({ key: newMemoryKey, value: newMemoryVal }),
    });
    setNewMemoryKey("");
    setNewMemoryVal("");
    loadMemories();
  }

  async function handleDeleteMemory(key: string) {
    await fetch("/api/memory", {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ key }),
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

  /** Run Access Control & Security Tests */
  async function runAccessControlTest(testType: "user_b_cross_access" | "spoof_client_address") {
    setTestingSecurity(true);
    setSecurityTestResult(null);
    try {
      if (testType === "user_b_cross_access") {
        const targetProjId = currentProjectId || projects[0]?.id || "proj_sample_alpha";
        // Create an untrusted/different user token for User B
        const userBRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId: "attacker_user_b" }),
        });
        const userBData = await userBRes.json();

        // Attempt to fetch User A's project using User B's token
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
      } else if (testType === "spoof_client_address") {
        // Attempt to pass arbitrary spoofed userId in POST body without valid signed session
        const spoofedRes = await fetch("/api/projects", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId: "0xSPOOFED_VICTIM_ADDRESS_000000000000000000",
            messages: [{ role: "user", text: "Spoofed attack payload" }],
          }),
        });
        const spoofedJson = await spoofedRes.json();

        setSecurityTestResult({
          title: "Kiểm tra 2: Client tự gửi User Address giả mạo",
          clientSentUserId: "0xSPOOFED_VICTIM_ADDRESS_000000000000000000",
          actualAssignedUserId: spoofedJson.project?.userId,
          httpStatus: spoofedRes.status,
          responseBody: spoofedJson,
          passed: spoofedJson.project?.userId === sessionUser,
          explanation:
            spoofedJson.project?.userId === sessionUser
              ? `✅ Backend đã phớt lờ userId do client gửi và gán chính xác theo phiên xác thực HMAC (${sessionUser}).`
              : "❌ LỖI: Server chấp nhận userId từ client.",
        });
      }
    } catch (err: any) {
      setSecurityTestResult({ error: err.message });
    }
    setTestingSecurity(false);
  }

  const ready = Boolean(status?.hasApiKey);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>
            <img src="/risein-logo.svg" alt="Rise In" className="mr-3 h-5 w-auto" />
            <span className="text-foreground">/ AgentMaxx</span>&nbsp;Research & Stateful Planning Cognitive Engine
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs uppercase hidden sm:inline-flex">
              Base Sepolia (84532)
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs uppercase">
              {status?.model ?? "gemini-3.5-flash-lite"}
            </Badge>

            {/* Session / Wallet Badge */}
            {!userAccount ? (
              <Button
                variant="outline"
                size="sm"
                onClick={connectBrowserWallet}
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl leading-tight font-bold tracking-tight uppercase md:text-5xl">
              AgentMaxx <span className="text-primary">Cognitive Pro.</span>
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground leading-relaxed">
              Agent Nghiên cứu & Lập kế hoạch có nguồn minh bạch, quản lý dự án & tác vụ theo trạng thái (queued, running, succeeded, failed, cancelled), kiểm tra quyền sở hữu backend, và thực thi an toàn trên Base Sepolia L2.
            </p>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[460px_1fr]">
        {/* Left column: Navigation Tabs & Detail Cards */}
        <aside className="flex flex-col gap-4">
          {/* Tab Selection Bar */}
          <div className="grid grid-cols-8 gap-1 p-1 bg-muted/60 border font-mono text-[9px] uppercase">
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
            <Card className="flex flex-col gap-4">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
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
              <CardContent className="flex flex-col gap-4 font-mono text-xs">
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

          {/* TAB 2: SAVED PROJECTS & TASK HISTORY */}
          {activeTab === "projects" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="SAVED" title="Dự Án & Lịch Sử Tác Vụ" />
                <Button variant="ghost" size="icon-xs" onClick={() => loadProjects()} aria-label="Refresh projects">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs max-h-[520px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between pb-1 border-b">
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

                {projects.length === 0 ? (
                  <p className="text-muted-foreground text-[11px] italic p-3 border text-center">
                    Chưa có dự án nào được lưu cho tài khoản này.
                  </p>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => resumeProject(p)}
                      className={cn(
                        "p-3 border flex flex-col gap-1.5 cursor-pointer transition-colors",
                        currentProjectId === p.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/30"
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
                      <p className="text-muted-foreground text-[11px] font-sans line-clamp-1">{p.objective}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                        <span className="flex items-center gap-1">
                          <Clock className="size-2.5" /> {p.currentTaskStatus ? `Task: ${p.currentTaskStatus}` : `${p.messages?.length ?? 0} tin nhắn`}
                        </span>
                        <span>{new Date(p.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: SECURITY & ACCESS CONTROL TEST SUITE */}
          {activeTab === "security" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="SEC" title="Kiểm Tra Quyền Truy Cập (Auth Test)" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs max-h-[520px] overflow-y-auto pr-1">
                <div className="p-2.5 border border-primary/30 bg-primary/5 text-muted-foreground leading-relaxed text-[11px]">
                  🛡️ <strong>Chính sách Bảo mật:</strong> Backend kiểm tra phiên mã hóa HMAC-SHA256. Mọi yêu cầu đọc/sửa/xóa đều bắt buộc xác thực quyền sở hữu; địa chỉ gửi từ client bị phớt lờ nếu không khớp chữ ký phiên.
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Chạy Thử Nghiệm Tấn Công & Xác Thực:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAccessControlTest("user_b_cross_access")}
                    disabled={testingSecurity}
                    className="h-8 text-xs font-mono justify-start text-left border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                  >
                    1. Thử User B truy cập Dự án User A (Test 403 Forbidden)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAccessControlTest("spoof_client_address")}
                    disabled={testingSecurity}
                    className="h-8 text-xs font-mono justify-start text-left border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                  >
                    2. Thử Client tự gửi User Address giả mạo
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

          {/* TAB 3: MEMORY & PERSONA MANAGER */}
          {activeTab === "memory" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="03" title="Quản Lý Bộ Nhớ Dài Hạn" />
                <Button variant="ghost" size="icon-xs" onClick={loadMemories} aria-label="Refresh memory">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 font-mono text-xs max-h-[520px] overflow-y-auto pr-1">
                <form onSubmit={handleAddMemory} className="flex flex-col gap-2 p-3 border bg-muted/20">
                  <span className="font-bold text-[11px] uppercase text-muted-foreground flex items-center gap-1">
                    <Plus className="size-3" /> Thêm Tùy Chọn / Profile Mới:
                  </span>
                  <Input
                    value={newMemoryKey}
                    onChange={(e) => setNewMemoryKey(e.target.value)}
                    placeholder="Khóa (e.g. user_name, target_currency, preferred_tone)"
                    className="h-8 text-xs font-mono"
                  />
                  <Input
                    value={newMemoryVal}
                    onChange={(e) => setNewMemoryVal(e.target.value)}
                    placeholder="Giá trị (e.g. Khanh, Base Sepolia, Academic)"
                    className="h-8 text-xs font-mono"
                  />
                  <Button type="submit" size="sm" className="h-8 font-mono text-xs uppercase">
                    Lưu vào Bộ Nhớ
                  </Button>
                </form>

                <div className="flex flex-col gap-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Bộ nhớ đã lưu ({memories.length}):
                  </p>
                  {memories.length === 0 ? (
                    <p className="text-muted-foreground text-[11px] italic p-2 border">Chưa có thông tin cá nhân hóa nào được lưu.</p>
                  ) : (
                    memories.map((m) => (
                      <div key={m.key} className="p-2.5 border bg-background flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5 truncate">
                          <span className="font-bold text-primary text-xs uppercase">{m.key}</span>
                          <span className="text-foreground text-xs truncate">{m.value}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(m.updatedAt).toLocaleString()}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteMemory(m.key)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Xóa bộ nhớ"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Setup & Agent Wallet */}
          {activeTab === "setup" && (
            <Card>
              <CardHeader>
                <SectionTitle num="04" title="Gemini & Agent Autonomous Wallet" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <SetupStep number={1} title="Gemini AI Engine" done={ready}>
                  {status && !ready && (
                    <p className="text-muted-foreground text-xs">
                      Paste key into <Code>.env</Code> as <Code>GEMINI_API_KEY</Code>, then restart dev server.
                    </p>
                  )}
                  {ready && <p className="font-mono text-xs text-emerald-500">✓ Connected & Active (gemini-3.5-flash-lite)</p>}
                </SetupStep>

                <SetupStep number={2} title="Agent Autonomous Web3 Wallet" done={Boolean(wallet?.address)} last>
                  {wallet?.address ? (
                    <WalletDetails wallet={wallet} onRefresh={loadWallet} />
                  ) : (
                    <div className="flex items-center gap-2 p-3 border font-mono text-xs text-muted-foreground animate-pulse">
                      <Wallet className="size-4 text-primary" /> Initializing Agent Base Sepolia Wallet...
                    </div>
                  )}
                </SetupStep>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: Faucet Center */}
          {activeTab === "faucet" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="FAUCET" title="Base Sepolia Testnet Faucets" />
                <Button variant="ghost" size="icon-xs" onClick={loadWallet} aria-label="Refresh balance">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 font-mono text-xs max-h-[520px] overflow-y-auto pr-1">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="06" title={`Multi-Domain Tools (${status?.tools.length ?? 0})`} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="07" title="RAG & Knowledge Base" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1 font-mono text-xs">
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
        <Card className="flex flex-col overflow-hidden border">
          <CardHeader className="border-b px-4 py-3 bg-muted/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <Terminal className="size-4 text-primary" />
              <span className="font-bold text-foreground uppercase">AgentMaxx Stateful Terminal</span>
              {currentProjectId && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Proj: {currentProjectId.slice(-6)}
                </Badge>
              )}
              {currentTask && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] uppercase font-mono px-2 py-0.5 flex items-center gap-1",
                    currentTask.status === "running" && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse",
                    currentTask.status === "succeeded" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                    currentTask.status === "failed" && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                    currentTask.status === "queued" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                    currentTask.status === "cancelled" && "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  Task: {currentTask.status}
                  {currentTask.durationMs ? ` (${(currentTask.durationMs / 1000).toFixed(2)}s)` : ""}
                </Badge>
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
            <div className="flex flex-col gap-1.5 p-3 bg-primary/5 border-b border-primary/20 text-xs font-mono">
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

          <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-4">
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
                  <div key={i} className="max-w-[85%] self-end bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm">
                    {m.text}
                  </div>
                ) : (
                  <div key={i} className="flex max-w-[92%] gap-3 self-start">
                    <div className="flex size-8 shrink-0 items-center justify-center border bg-background">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                      {m.domain && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> Domain: <span className="font-bold text-foreground uppercase">{m.domain}</span>
                        </div>
                      )}
                      {m.steps?.map((s, j) => (
                        <div key={j} className="flex flex-col gap-2">
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
                          "px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed",
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
                            <AgentMessageToolbar text={m.text} domain={m.domain} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <CardFooter className="border-t p-3 bg-background">
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
  if (!data?.results || !Array.isArray(data.results) || data.results.length === 0) return null;
  return (
    <div className="border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col gap-2 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">
          <Globe className="size-3.5" /> Verified Research Sources ({data.sourceCount || data.results.length})
        </span>
        <Badge variant="outline" className="text-[9px] uppercase border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          {data.engine || "Live Web Search"}
        </Badge>
      </div>
      <div className="flex flex-col gap-2 pt-1 border-t border-emerald-500/15">
        {data.results.map((r: any, idx: number) => (
          <div key={idx} className="bg-background/80 p-2 border border-border flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-primary hover:underline truncate text-xs inline-flex items-center gap-1"
              >
                [{idx + 1}] {r.title} <ExternalLink className="size-3" />
              </a>
              {r.domain && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {r.domain}
                </span>
              )}
            </div>
            {r.snippet && (
              <p className="text-[11px] text-muted-foreground font-sans line-clamp-2 leading-relaxed">
                {r.snippet}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentMessageToolbar({ text, domain }: { text: string; domain?: string }) {
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportMarkdown() {
    const header = `# AgentMaxx Research & Planning Report\n**Domain:** ${domain || "General"}\n**Generated:** ${new Date().toLocaleString()}\n\n---\n\n`;
    const blob = new Blob([header + text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentmaxx-report-${Date.now()}.md`;
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
        <Download className="mr-1 size-3" /> Xuất Markdown (.md)
      </Button>
    </div>
  );
}
