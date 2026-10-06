/**
 * THE AGENT'S WEB3 WALLET & ON-CHAIN ENGINE
 *
 * Provides:
 * 1. Autonomous micropayments (x402 protocol) for paid APIs.
 * 2. Real on-chain transfers & receipt verification on Base Sepolia testnet.
 * 3. Human-in-the-loop Transfer Proposal & Confirmation flow.
 */
import fs from "fs";
import path from "path";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
  verifyMessage,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const WALLET_FILE = path.join(process.cwd(), ".agent-wallet.json");
const TX_HISTORY_FILE = path.join(process.cwd(), ".agent-transactions.json");

export const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

export type Payment = {
  from: Address;
  to: Address;
  amount: string;
  asset: string;
  resource: string;
  nonce: string;
};

export type TxRecord = {
  id: string;
  type: "TRANSFER" | "PAYMENT_X402";
  hash?: string;
  from: string;
  to: string;
  amount: string;
  network: string;
  status: "SUBMITTED" | "SUCCESS" | "FAILED" | "PENDING_CONFIRMATION";
  timestamp: string;
  explorerUrl?: string;
};

/** Load the wallet account from .env or .agent-wallet.json */
export function loadAccount() {
  const key =
    process.env.WALLET_PRIVATE_KEY ||
    (fs.existsSync(WALLET_FILE) && JSON.parse(fs.readFileSync(WALLET_FILE, "utf8")).privateKey);
  return key ? privateKeyToAccount(key as Hex) : null;
}

export function requireAccount() {
  const account = loadAccount();
  if (!account) throw new Error("The agent has no wallet yet. Click 'Create wallet' first.");
  return account;
}

/** Make a brand new wallet and save it. */
export function createWallet() {
  if (loadAccount()) return getWalletAddress();
  const privateKey = generatePrivateKey();
  fs.writeFileSync(WALLET_FILE, JSON.stringify({ privateKey }, null, 2));
  return privateKeyToAccount(privateKey).address;
}

export function getWalletAddress(): string | null {
  return loadAccount()?.address ?? null;
}

export async function getWalletBalance(): Promise<string> {
  const account = requireAccount();
  const wei = await publicClient.getBalance({ address: account.address });
  return `${formatEther(wei)} ETH`;
}

export async function getWalletInfo() {
  const address = getWalletAddress();
  if (!address) return { address: null, balance: "0 ETH", network: "Base Sepolia" };
  const balance = await getWalletBalance().catch(() => "0 ETH");
  return {
    address,
    balance,
    network: "Base Sepolia (Testnet)",
    chainId: 84532,
    explorer: `https://sepolia.basescan.org/address/${address}`,
    faucetUrl: "https://docs.base.org/base-chain/tools/network-faucets",
  };
}

/** ─── TRANSACTION LOGGING & HISTORY ─── */
function readTxHistory(): TxRecord[] {
  try {
    if (fs.existsSync(TX_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(TX_HISTORY_FILE, "utf8"));
    }
  } catch {}
  return [];
}

export function saveTxRecord(record: TxRecord) {
  try {
    const list = readTxHistory();
    list.unshift(record);
    fs.writeFileSync(TX_HISTORY_FILE, JSON.stringify(list.slice(0, 50), null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist transaction:", err);
  }
}

export function getTransactionHistory(): TxRecord[] {
  return readTxHistory();
}

/** ─── HUMAN-IN-THE-LOOP TRANSFER PROPOSAL ─── */
export async function prepareTransferProposal(toAddress: string, amountEth: string) {
  const account = requireAccount();
  if (!isAddress(toAddress)) {
    return {
      error: `Invalid Ethereum address: '${toAddress}'. Must be a valid 0x hex address (42 characters).`,
    };
  }

  const currentBalanceWei = await publicClient.getBalance({ address: account.address });
  const sendAmountWei = parseEther(amountEth);

  const proposalId = `tx_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const hasSufficientBalance = currentBalanceWei >= sendAmountWei;

  const proposal = {
    proposalId,
    status: hasSufficientBalance ? "WAITING_CONFIRMATION" : "INSUFFICIENT_BALANCE",
    from: account.address,
    to: toAddress,
    amount: `${amountEth} ETH`,
    currentBalance: `${formatEther(currentBalanceWei)} ETH`,
    network: "Base Sepolia (Testnet)",
    estimatedGas: "0.000021 ETH (~$0.05)",
    requiresUserApproval: true,
    warning: !hasSufficientBalance
      ? "Agent wallet does not have enough test ETH. Get free test ETH from Base Sepolia faucet."
      : "Please review and confirm this transfer before execution.",
    faucet: "https://docs.base.org/base-chain/tools/network-faucets",
  };

  saveTxRecord({
    id: proposalId,
    type: "TRANSFER",
    from: account.address,
    to: toAddress,
    amount: `${amountEth} ETH`,
    network: "Base Sepolia",
    status: "PENDING_CONFIRMATION",
    timestamp: new Date().toISOString(),
  });

  return proposal;
}

/** ─── ON-CHAIN TRANSACTION EXECUTION (BASE SEPOLIA) ─── */
export async function executeOnChainTransfer(toAddress: string, amountEth: string) {
  const account = requireAccount();
  if (!isAddress(toAddress)) {
    throw new Error(`Invalid recipient address: ${toAddress}`);
  }

  const currentBalanceWei = await publicClient.getBalance({ address: account.address });
  const sendAmountWei = parseEther(amountEth);

  if (currentBalanceWei < sendAmountWei) {
    throw new Error(
      `Insufficient balance (${formatEther(currentBalanceWei)} ETH) to send ${amountEth} ETH on Base Sepolia. Please fund the agent wallet first.`
    );
  }

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const txHash = await walletClient.sendTransaction({
    to: toAddress as Address,
    value: sendAmountWei,
  });

  const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;
  const recordId = `tx_${Date.now()}`;

  saveTxRecord({
    id: recordId,
    type: "TRANSFER",
    hash: txHash,
    from: account.address,
    to: toAddress,
    amount: `${amountEth} ETH`,
    network: "Base Sepolia",
    status: "SUBMITTED",
    timestamp: new Date().toISOString(),
    explorerUrl,
  });

  return {
    success: true,
    status: "TRANSACTION_SUBMITTED",
    transactionHash: txHash,
    explorerUrl,
    from: account.address,
    to: toAddress,
    amount: `${amountEth} ETH`,
    network: "Base Sepolia",
    blockConfirmation: "View on BaseScan Explorer",
  };
}

/** ─── TRANSACTION RECEIPT & STATUS INSPECTION ─── */
export async function getTransactionStatus(txHash: string) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
    return {
      transactionHash: txHash,
      status: receipt.status === "success" ? "CONFIRMED_SUCCESS" : "REVERTED",
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      from: receipt.from,
      to: receipt.to,
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    };
  } catch {
    return {
      transactionHash: txHash,
      status: "PENDING_OR_INDEXING",
      message: "Transaction is being mined on Base Sepolia or recently submitted.",
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    };
  }
}

/** ─── X402 AUTONOMOUS PAYMENTS ─── */
export async function payAndFetch(url: string) {
  const first = await fetch(url);
  if (first.status !== 402) return { data: await first.json() };

  const account = requireAccount();
  const { price, asset, payTo } = await first.json();
  const payment: Payment = {
    from: account.address,
    to: payTo,
    amount: price,
    asset,
    resource: new URL(url).pathname,
    nonce: crypto.randomUUID(),
  };
  const signature = await account.signMessage({ message: JSON.stringify(payment) });
  const header = Buffer.from(JSON.stringify({ payment, signature })).toString("base64");

  const paid = await fetch(url, { headers: { "X-PAYMENT": header } });
  const paidResult = await paid.json();

  saveTxRecord({
    id: `x402_${Date.now()}`,
    type: "PAYMENT_X402",
    from: account.address,
    to: payTo,
    amount: `${price} ${asset}`,
    network: "Base Sepolia (x402 Micropayment)",
    status: "SUCCESS",
    timestamp: new Date().toISOString(),
  });

  return {
    data: paidResult,
    payment: {
      status: paid.status,
      amount: `${price} ${asset}`,
      to: payTo,
      signature: `${signature.slice(0, 18)}...`,
    },
  };
}

export async function verifyPayment(header: string | null) {
  if (!header) return null;
  try {
    const { payment, signature } = JSON.parse(Buffer.from(header, "base64").toString()) as {
      payment: Payment;
      signature: Hex;
    };
    const valid = await verifyMessage({ address: payment.from, message: JSON.stringify(payment), signature });
    return valid ? payment : null;
  } catch {
    return null;
  }
}
