import { createWallet, getWalletInfo, getTransactionHistory } from "@/agent/wallet";

// GET /api/wallet -> the agent's wallet details + balance + transaction history
export async function GET() {
  const info = await getWalletInfo();
  const history = getTransactionHistory();
  return Response.json({ ...info, history });
}

// POST /api/wallet -> create the agent's wallet
export async function POST() {
  return Response.json({ address: createWallet() });
}

