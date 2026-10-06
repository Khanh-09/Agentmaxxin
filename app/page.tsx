"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Coins,
  Copy,
  ExternalLink,
  History,
  RefreshCw,
  RotateCcw,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Step = { tool: string; args: any; result: any; error?: boolean };
type Message = { role: "user" | "agent"; text: string; steps?: Step[]; error?: boolean };
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
type WalletInfo = {
  address: string | null;
  balance?: string;
  network?: string;
  chainId?: number;
  explorer?: string;
  faucetUrl?: string;
  history?: TxRecord[];
};

const EXAMPLES = [
  "Check my wallet info and current Base Sepolia balance",
  "Prepare transfer of 0.0001 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "Check real-time weather in Hanoi and Tokyo",
  "Search the web for latest AI Agent trends with sources",
  "Compare current BTC, ETH and SOL prices in USD",
  "Scrape and summarize https://docs.base.org",
];

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadWallet = () =>
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setWallet)
      .catch(() => null);

  useEffect(() => {
    fetch("/api/agent").then((r) => r.json()).then(setStatus);
    loadWallet();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function createWallet() {
    setCreating(true);
    await fetch("/api/wallet", { method: "POST" });
    await loadWallet();
    setCreating(false);
  }

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    const history: Message[] = [...messages, { role: "user", text }];
    setMessages(history);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        data.error
          ? { role: "agent", text: data.error, error: true }
          : { role: "agent", text: data.answer, steps: data.steps },
      ]);
      // Reload wallet info if any on-chain tool or payment was triggered
      if (data.steps?.some((s: Step) => s.tool.includes("transfer") || s.result?.payment || s.tool.includes("wallet"))) {
        loadWallet();
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Could not reach the server. Is `npm run dev` still running?", error: true },
      ]);
    }
    setThinking(false);
  }

  const ready = Boolean(status?.hasApiKey);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1560px] flex-col gap-8 px-4 py-8 md:px-10 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-5 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>
            <img src="/risein-logo.svg" alt="Rise In" className="mr-3 h-5 w-auto" />
            <span className="text-foreground">/ Agentmaxxing</span>&nbsp;Week 1-3 Complete Build
          </Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs uppercase">
              {status?.tools.length ?? 0} Tools active
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs uppercase bg-primary/10 text-primary border-primary/20">
              Base Sepolia L2
            </Badge>
            {status && <Label>Model: {status.model}</Label>}
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl leading-[0.95] font-bold tracking-[-0.04em] uppercase md:text-6xl">
              AgentMaxx <span className="text-primary">Studio.</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              Autonomous Web3 AI Agent with LangGraph routing, live Open-Meteo weather, Base Sepolia blockchain RPC, human-in-the-loop transfer confirmation & x402 micropayments.
            </p>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[420px_1fr]">
        {/* Left column: Setup, Wallet, Tools, History */}
        <aside className="flex flex-col gap-6">
          {/* Card 01: Setup & Wallet */}
          <Card>
            <CardHeader>
              <SectionTitle num="01" title="Setup & Agent Wallet" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SetupStep number={1} title="Gemini AI Connection" done={ready}>
                {status && !ready && (
                  <p className="text-muted-foreground text-xs">
                    Paste key into <Code>.env</Code> as <Code>GEMINI_API_KEY</Code>, then restart dev server.
                  </p>
                )}
                {ready && <p className="font-mono text-xs text-emerald-500">✓ Connected & Active (gemini-3.5-flash-lite)</p>}
              </SetupStep>

              <SetupStep number={2} title="Base Sepolia On-Chain Wallet" done={Boolean(wallet?.address)} last>
                {wallet && !wallet.address && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">
                      The agent signs transactions and pays for APIs directly on Base Sepolia testnet.
                    </p>
                    <Button onClick={createWallet} disabled={creating} className="w-fit font-mono tracking-wider uppercase">
                      <Wallet className="mr-1.5 size-4" /> {creating ? "Creating..." : "Create Wallet"}
                    </Button>
                  </div>
                )}
                {wallet?.address && <WalletDetails wallet={wallet} onRefresh={loadWallet} />}
              </SetupStep>
            </CardContent>
          </Card>

          {/* Card 02: Transaction History */}
          {wallet?.history && wallet.history.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <SectionTitle num="02" title={`Tx History (${wallet.history.length})`} />
                <Button variant="ghost" size="icon-xs" onClick={loadWallet} aria-label="Refresh txs">
                  <RefreshCw className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {wallet.history.map((tx) => (
                  <div key={tx.id} className="border p-2.5 font-mono text-xs flex flex-col gap-1.5 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{tx.type}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-mono px-1.5 py-0",
                          tx.status === "CONFIRMED_SUCCESS" || tx.status === "SUCCESS"
                            ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                            : tx.status === "SUBMITTED"
                            ? "border-blue-500/40 text-blue-500 bg-blue-500/10"
                            : "border-amber-500/40 text-amber-500 bg-amber-500/10"
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground truncate text-[11px]">
                      To: {tx.to}
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t">
                      <span className="font-semibold text-foreground">{tx.amount}</span>
                      {tx.explorerUrl ? (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          BaseScan <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Local Proposal</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Card 03: Tools List */}
          <Card>
            <CardHeader>
              <SectionTitle num={wallet?.history?.length ? "03" : "02"} title={`Available Tools (${status?.tools.length ?? 0})`} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3.5 max-h-[360px] overflow-y-auto pr-1">
              {status?.tools.map((t) => (
                <div key={t.name} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold">
                      <span className="text-primary">&gt;</span> {t.name}
                    </p>
                    {t.category && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-mono text-[10px] uppercase px-1.5 py-0",
                          t.category === "paid" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                          t.category === "crypto" && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                          t.category === "web" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
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
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Configured in <Code>agent/tools.ts</Code> & <Code>agent/wallet.ts</Code>.
              </p>
            </CardContent>
          </Card>
        </aside>

        {/* Right column: Interactive Chat */}
        <Card className="flex h-[calc(100vh-6rem)] min-h-[620px] flex-col lg:sticky lg:top-8">
          <CardHeader className="border-b flex flex-row items-center justify-between py-3">
            <SectionTitle num="CHAT" title="Autonomous Agent Workspace" />
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono uppercase text-xs"
                onClick={() => setMessages([])}
                disabled={messages.length === 0 || thinking}
              >
                <RotateCcw className="size-3.5 mr-1" /> Clear
              </Button>
            </CardAction>
          </CardHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-5 px-5 py-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-5 py-14 text-center">
                  <div className="flex size-14 items-center justify-center bg-primary text-primary-foreground shadow-lg">
                    <Bot className="size-7" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight uppercase">AgentMaxx Ready</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-md">
                      {!ready
                        ? "Add your Gemini API key to start."
                        : wallet && !wallet.address
                        ? "Create an agent wallet to unlock real on-chain Base Sepolia transfers and x402 micropayments."
                        : "Ask your agent anything or try one of the instant Web3 & intelligence actions below."}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                    {EXAMPLES.map((e) => (
                      <Button
                        key={e}
                        variant="outline"
                        onClick={() => send(e)}
                        disabled={!ready}
                        className="font-mono text-xs h-auto py-2 text-left justify-start"
                      >
                        <span className="text-primary mr-1">&gt;</span> {e}
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
                  <div key={i} className="flex max-w-[90%] gap-3 self-start">
                    <div className="flex size-8 shrink-0 items-center justify-center border bg-background">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                      {m.steps?.map((s, j) => (
                        <div key={j} className="flex flex-col gap-2">
                          <ToolCall step={s} />
                          {/* If proposal requires confirmation, render Action Card */}
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
                          m.error ? "flex gap-2 bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted"
                        )}
                      >
                        {m.error && <CircleAlert className="mt-0.5 size-4 shrink-0" />}
                        {m.text}
                      </div>
                    </div>
                  </div>
                )
              )}

              {thinking && (
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground pl-11">
                  <span className="inline-block size-2 rounded-full bg-primary animate-ping" />
                  agent is reasoning & executing tools...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <CardFooter className="border-t p-4 bg-background">
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
                  placeholder={ready ? "Ask agent or command on-chain transfer..." : "Add your Gemini API key to start"}
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
    <p className="font-mono text-xs font-medium tracking-[0.06em] uppercase">
      <span className="text-primary">{num}</span>
      <span className="ml-2 text-muted-foreground">{title}</span>
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
}

function SetupStep(props: { number: number; title: string; done: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center border font-mono text-[11px] font-bold",
            props.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"
          )}
        >
          {props.done ? <Check className="size-3" strokeWidth={3} /> : props.number}
        </span>
        {!props.last && <span className={cn("w-0.5 flex-1 my-1", props.done ? "bg-primary" : "bg-border")} />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", !props.last && "pb-4")}>
        <p className="font-bold text-xs uppercase tracking-tight">{props.title}</p>
        {props.children}
      </div>
    </div>
  );
}

function WalletDetails({ wallet, onRefresh }: { wallet: WalletInfo; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const address = wallet.address!;

  function copy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2.5 border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <code className="truncate font-mono text-xs text-primary">{address}</code>
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
          className="inline-flex items-center gap-1 hover:text-primary text-muted-foreground"
          href={wallet.faucetUrl || "https://docs.base.org/base-chain/tools/network-faucets"}
          target="_blank"
          rel="noreferrer"
        >
          Get Free Test ETH <ExternalLink className="size-3" />
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
