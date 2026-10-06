/**
 * WEEK 3: ON-CHAIN TRANSACTION PROPOSAL & VERIFICATION ENGINE (BASE SEPOLIA)
 *
 * Implements a secure Human-In-The-Loop transaction architecture:
 * 1. Agent prepares structured proposal (validation, precision, gas estimation).
 * 2. Proposal is stored persistently with user/project/task isolation and 15-minute TTL.
 * 3. User reviews preview and signs with browser wallet (no private key exposure).
 * 4. Tracks on-chain txHash and polls verified receipts from Base Sepolia RPC.
 * 5. Strictly testnet only (Base Sepolia Chain ID 84532). Mainnet strictly prohibited.
 */
import fs from "fs";
import {
  createPublicClient,
  formatEther,
  getAddress,
  http,
  isAddress,
  parseEther,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { getStoragePath } from "@/lib/storage";

const PROPOSALS_FILE = getStoragePath(".agent-proposals.json");
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";
export const PROPOSAL_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

export type ProposalStatus =
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "PENDING_RECEIPT"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED";

export interface TransferProposal {
  id: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  from: string; // Checksum address
  to: string;   // Checksum address
  amountEth: string;
  amountWeiHex: string;
  amountWeiString: string;
  network: "Base Sepolia";
  chainId: 84532;
  estimatedGasEth: string;
  estimatedTotalEth: string;
  status: ProposalStatus;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
  error?: string;
  rejectionReason?: string;
}

function readProposals(): TransferProposal[] {
  try {
    if (fs.existsSync(PROPOSALS_FILE)) {
      const raw = fs.readFileSync(PROPOSALS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[Proposals] Error reading proposals store:", err);
  }
  return [];
}

function writeProposals(proposals: TransferProposal[]) {
  try {
    const temp = `${PROPOSALS_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(proposals, null, 2), "utf8");
    fs.renameSync(temp, PROPOSALS_FILE);
  } catch (err) {
    console.error("[Proposals] Error writing proposals store:", err);
  }
}

/**
 * Validates an Ethereum address and formats it to standard checksum.
 */
export function validateAndChecksumAddress(address: string): { valid: boolean; checksumAddress?: string; error?: string } {
  if (!address || typeof address !== "string" || !address.trim()) {
    return { valid: false, error: "Address cannot be empty." };
  }
  const clean = address.trim();
  if (!isAddress(clean)) {
    return { valid: false, error: `Invalid EVM address format '${clean}'. Must be a 42-character 0x hex string.` };
  }
  try {
    return { valid: true, checksumAddress: getAddress(clean) };
  } catch {
    return { valid: false, error: `Failed to format address checksum for '${clean}'.` };
  }
}

/**
 * Validates amount string to prevent floating-point precision issues, negative values, or exponential notations.
 */
export function validateAmountEth(amountEth: string): { valid: boolean; wei?: bigint; error?: string } {
  if (!amountEth || typeof amountEth !== "string" || !amountEth.trim()) {
    return { valid: false, error: "Amount string cannot be empty." };
  }
  const clean = amountEth.trim();

  // Strict regex: positive integer or decimal with up to 18 decimal places
  if (!/^[0-9]+(\.[0-9]{1,18})?$/.test(clean)) {
    return {
      valid: false,
      error: `Invalid amount format '${clean}'. Must be a positive decimal number with up to 18 decimal places without scientific notation.`,
    };
  }

  try {
    const wei = parseEther(clean);
    if (wei <= BigInt(0)) {
      return { valid: false, error: "Transfer amount must be strictly greater than 0 ETH." };
    }
    return { valid: true, wei };
  } catch (err: any) {
    return { valid: false, error: `Could not parse ETH amount: ${err.message}` };
  }
}

/**
 * Create a new verifiable transfer proposal.
 * NEVER sends transaction on-chain automatically.
 */
export async function createTransferProposal(params: {
  from?: string;
  to: string;
  amountEth: string;
  userId: string;
  projectId?: string;
  taskId?: string;
}): Promise<{ success: boolean; proposal?: TransferProposal; error?: string }> {
  const { to, amountEth, userId, projectId, taskId } = params;

  // 1. Validate Recipient Address
  const toCheck = validateAndChecksumAddress(to);
  if (!toCheck.valid || !toCheck.checksumAddress) {
    return { success: false, error: toCheck.error };
  }

  // 2. Validate Amount
  const amountCheck = validateAmountEth(amountEth);
  if (!amountCheck.valid || amountCheck.wei === undefined) {
    return { success: false, error: amountCheck.error };
  }

  // 3. Sender address
  let fromAddress = params.from ? getAddress(params.from) : undefined;
  if (!fromAddress && isAddress(userId)) {
    fromAddress = getAddress(userId);
  }

  // 4. Estimate gas price via Base Sepolia RPC
  let estimatedGasEth = "0.000021"; // Standard 21,000 gas for native transfer
  try {
    const gasPrice = await publicClient.getGasPrice();
    const gasWei = gasPrice * BigInt(21000);
    estimatedGasEth = formatEther(gasWei);
  } catch (gasErr) {
    console.warn("[Proposals] Gas price fetch fallback:", gasErr);
  }

  const wei = amountCheck.wei;
  const gasWeiEst = parseEther(estimatedGasEth);
  const totalWeiEst = wei + gasWeiEst;
  const estimatedTotalEth = formatEther(totalWeiEst);

  const now = Date.now();
  const proposalId = `prop_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + PROPOSAL_TTL_MS).toISOString();

  const proposal: TransferProposal = {
    id: proposalId,
    userId: userId.toLowerCase().trim(),
    projectId,
    taskId,
    from: fromAddress || "0x0000000000000000000000000000000000000000",
    to: toCheck.checksumAddress,
    amountEth: amountEth.trim(),
    amountWeiHex: toHex(wei),
    amountWeiString: wei.toString(),
    network: "Base Sepolia",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    estimatedGasEth,
    estimatedTotalEth,
    status: "PENDING_APPROVAL",
    createdAt,
    expiresAt,
  };

  const proposals = readProposals();
  proposals.unshift(proposal);
  writeProposals(proposals);

  return { success: true, proposal };
}

/**
 * Retrieve a proposal by ID with optional user authorization check.
 */
export function getProposalById(
  proposalId: string,
  userId?: string
): { success: boolean; proposal?: TransferProposal; error?: string; notFound?: boolean; unauthorized?: boolean } {
  const proposals = readProposals();
  const p = proposals.find((item) => item.id === proposalId);

  if (!p) {
    return { success: false, notFound: true, error: `Proposal with ID '${proposalId}' not found.` };
  }

  if (userId) {
    const cleanUser = userId.toLowerCase().trim();
    if (p.userId !== cleanUser && p.from.toLowerCase() !== cleanUser) {
      return { success: false, unauthorized: true, error: "Access denied: Proposal belongs to a different user/wallet." };
    }
  }

  // Check TTL expiration
  if (p.status === "PENDING_APPROVAL" && Date.now() > new Date(p.expiresAt).getTime()) {
    p.status = "EXPIRED";
    writeProposals(proposals);
  }

  return { success: true, proposal: p };
}

/**
 * List all proposals for a user/wallet.
 */
export function listProposals(userId?: string): TransferProposal[] {
  const proposals = readProposals();
  const now = Date.now();

  let modified = false;
  for (const p of proposals) {
    if (p.status === "PENDING_APPROVAL" && now > new Date(p.expiresAt).getTime()) {
      p.status = "EXPIRED";
      modified = true;
    }
  }
  if (modified) writeProposals(proposals);

  if (!userId || userId === "guest_default") {
    return proposals.slice(0, 30);
  }

  const cleanUser = userId.toLowerCase().trim();
  return proposals
    .filter((p) => p.userId === cleanUser || p.from.toLowerCase() === cleanUser)
    .slice(0, 30);
}

/**
 * User rejects/cancels a transfer proposal.
 */
export function cancelProposal(
  proposalId: string,
  userId?: string,
  reason = "User cancelled the transfer request"
): { success: boolean; proposal?: TransferProposal; error?: string; unauthorized?: boolean } {
  const check = getProposalById(proposalId, userId);
  if (!check.success || !check.proposal) {
    return { success: false, unauthorized: check.unauthorized, error: check.error };
  }

  const p = check.proposal;
  if (p.status !== "PENDING_APPROVAL") {
    return { success: false, error: `Cannot cancel proposal in '${p.status}' status.` };
  }

  const proposals = readProposals();
  const idx = proposals.findIndex((item) => item.id === proposalId);
  if (idx !== -1) {
    proposals[idx].status = "REJECTED";
    proposals[idx].rejectionReason = reason;
    writeProposals(proposals);
    return { success: true, proposal: proposals[idx] };
  }

  return { success: false, error: "Proposal not found during cancel." };
}

/**
 * Submits the transaction hash returned by the browser wallet.
 * Transitions proposal into PENDING_RECEIPT immediately.
 * Locks proposal against double-submission / duplicate signing.
 */
export function submitProposalTxHash(
  proposalId: string,
  txHash: string,
  fromAddress?: string,
  userId?: string
): { success: boolean; proposal?: TransferProposal; error?: string; unauthorized?: boolean } {
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { success: false, error: "Invalid transaction hash format. Must be a 66-character 0x hex string." };
  }

  const check = getProposalById(proposalId, userId);
  if (!check.success || !check.proposal) {
    return { success: false, unauthorized: check.unauthorized, error: check.error };
  }

  const p = check.proposal;
  if (p.status !== "PENDING_APPROVAL") {
    return { success: false, error: `Cannot submit txHash: Proposal is already in status '${p.status}' (Double-submission locked).` };
  }

  const proposals = readProposals();
  const idx = proposals.findIndex((item) => item.id === proposalId);
  if (idx !== -1) {
    proposals[idx].txHash = txHash;
    proposals[idx].status = "PENDING_RECEIPT";
    if (fromAddress && isAddress(fromAddress)) {
      proposals[idx].from = getAddress(fromAddress);
    }
    writeProposals(proposals);
    return { success: true, proposal: proposals[idx] };
  }

  return { success: false, error: "Proposal not found during update." };
}

/**
 * Checks on-chain transaction receipt from Base Sepolia RPC and updates status.
 */
export async function checkAndUpdateProposalReceipt(
  proposalId: string,
  userId?: string
): Promise<{ success: boolean; proposal?: TransferProposal; confirmed: boolean; error?: string; unauthorized?: boolean; notFound?: boolean }> {
  const check = getProposalById(proposalId, userId);
  if (!check.success || !check.proposal) {
    return { success: false, confirmed: false, unauthorized: check.unauthorized, notFound: check.notFound, error: check.error };
  }

  const p = check.proposal;
  if (!p.txHash) {
    return { success: true, proposal: p, confirmed: false };
  }

  if (p.status === "CONFIRMED" || p.status === "FAILED") {
    return { success: true, proposal: p, confirmed: p.status === "CONFIRMED" };
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: p.txHash as Hex });
    if (receipt) {
      const proposals = readProposals();
      const idx = proposals.findIndex((item) => item.id === proposalId);
      if (idx !== -1) {
        if (receipt.status === "success") {
          proposals[idx].status = "CONFIRMED";
          proposals[idx].blockNumber = Number(receipt.blockNumber);
          proposals[idx].gasUsed = receipt.gasUsed.toString();
          proposals[idx].confirmedAt = new Date().toISOString();
        } else {
          proposals[idx].status = "FAILED";
          proposals[idx].error = "Transaction reverted on Base Sepolia blockchain.";
        }
        writeProposals(proposals);
        return { success: true, proposal: proposals[idx], confirmed: proposals[idx].status === "CONFIRMED" };
      }
    }
  } catch (rpcErr: any) {
    // Receipt not found yet (still pending) or network issue
    return { success: true, proposal: p, confirmed: false, error: rpcErr.message };
  }

  return { success: true, proposal: p, confirmed: false };
}
