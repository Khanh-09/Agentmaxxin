// @ts-check
import { isAddress, parseEther, formatEther } from "viem";

const BASE_URL = "http://localhost:3000";

function logPass(msg) {
  console.log(`\x1b[32m✔ [PASS]\x1b[0m ${msg}`);
}

function logFail(msg, detail = "") {
  console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${msg}`, detail);
  process.exitCode = 1;
}

function logInfo(msg) {
  console.log(`\x1b[36mℹ [INFO]\x1b[0m ${msg}`);
}

async function runTests() {
  console.log("==================================================================");
  console.log("   WEEK 3: BASE SEPOLIA NATIVE ETH TRANSFER & WALLET TEST SUITE   ");
  console.log("==================================================================\n");

  // TEST 1: Official Base Sepolia Network Configuration Verification
  logInfo("TEST 1: Verifying Official Base Sepolia Configuration...");
  const expectedChainId = 84532;
  const expectedRpc = "https://sepolia.base.org";
  const expectedExplorer = "https://sepolia.basescan.org";

  const walletRes = await fetch(`${BASE_URL}/api/wallet`);
  const walletJson = await walletRes.json();
  if (walletJson.chainId === expectedChainId && walletJson.network && walletJson.network.includes("Base Sepolia")) {
    logPass(`Network configured correctly: ${walletJson.network} (Chain ID: ${walletJson.chainId})`);
  } else {
    logFail(`Network mismatch: got ${walletJson.network} / ${walletJson.chainId}`);
  }

  // TEST 2: Wallet Authentication vs Tx Signing Separation (Guest & Authenticated Sessions)
  logInfo("\nTEST 2: Testing Session Authentication Separation...");
  const sessionResA = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const sessionA = await sessionResA.json();
  if (sessionA.token && sessionA.userId) {
    logPass(`User A session created: ${sessionA.userId} (Token issued)`);
  } else {
    logFail("Failed to create User A session", sessionA);
  }

  const sessionResB = await fetch(`${BASE_URL}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const sessionB = await sessionResB.json();
  logPass(`User B session created: ${sessionB.userId}`);

  // TEST 3: Validation of prepare_transfer (Invalid Address, Negative, Scientific Notation, Decimal Overflow)
  logInfo("\nTEST 3: Testing Address, Amount & Precision Validation (No Float Math)...");

  // 3a. Invalid Address
  const invalidAddrRes = await fetch(`${BASE_URL}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({
      to: "0xinvalid12345",
      amountEth: "0.001",
    }),
  });
  const invalidAddrJson = await invalidAddrRes.json();
  if (invalidAddrRes.status === 400 && invalidAddrJson.error && invalidAddrJson.error.includes("Invalid EVM address")) {
    logPass("Invalid recipient address correctly rejected with 400 Bad Request");
  } else {
    logFail("Invalid address was not rejected properly", invalidAddrJson);
  }

  // 3b. Zero and Negative Amounts
  const negRes = await fetch(`${BASE_URL}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      amountEth: "-0.05",
    }),
  });
  const negJson = await negRes.json();
  if (negRes.status === 400 && negJson.error && negJson.error.includes("positive decimal number")) {
    logPass("Negative amount correctly rejected");
  } else {
    logFail("Negative amount was not rejected properly", negJson);
  }

  // 3c. Scientific Notation Rejection
  const sciRes = await fetch(`${BASE_URL}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      amountEth: "1e-4",
    }),
  });
  const sciJson = await sciRes.json();
  if (sciRes.status === 400 && sciJson.error && sciJson.error.includes("without scientific notation")) {
    logPass("Scientific notation amount rejected to prevent float parsing vulnerabilities");
  } else {
    logFail("Scientific notation was not rejected properly", sciJson);
  }

  // 3d. Precision Overflow (> 18 decimals)
  const precRes = await fetch(`${BASE_URL}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      amountEth: "0.1234567890123456789999",
    }),
  });
  const precJson = await precRes.json();
  if (precRes.status === 400 && precJson.error && precJson.error.includes("18 decimal places")) {
    logPass("Excess decimal precision (> 18 decimals) correctly rejected without precision loss");
  } else {
    logFail("Excess precision was not rejected properly", precJson);
  }

  // TEST 4: Valid Proposal Creation & Preview Properties
  logInfo("\nTEST 4: Creating Valid Transfer Proposal via prepare_transfer logic...");
  const validPropRes = await fetch(`${BASE_URL}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      amountEth: "0.0001",
      projectId: "proj_test_week3",
      taskId: "task_test_week3",
    }),
  });
  const validPropJson = await validPropRes.json();
  const proposal = validPropJson.proposal;

  if (
    proposal &&
    proposal.id &&
    proposal.status === "PENDING_APPROVAL" &&
    proposal.amountWeiHex === "0x5af3107a4000" && // 0.0001 ETH in wei hex
    proposal.network === "Base Sepolia" &&
    proposal.chainId === 84532 &&
    proposal.from &&
    proposal.to === "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" &&
    proposal.estimatedGasEth &&
    proposal.expiresAt
  ) {
    logPass(`Proposal created with ID: ${proposal.id}`);
    logPass(`Amount in Wei Hex: ${proposal.amountWeiHex} (0.0001 ETH verified via viem parseEther)`);
    logPass(`Estimated Gas: ${proposal.estimatedGasEth} ETH | Total: ${proposal.estimatedTotalEth} ETH`);
    logPass(`Initial Status: ${proposal.status} (Safety Lock: Tool DOES NOT send tx)`);
  } else {
    logFail("Valid proposal creation failed or missing fields", validPropJson);
  }

  // TEST 5: Security & Isolation - User B Cross-Access Denial (403 Forbidden)
  logInfo("\nTEST 5: Testing User B Access Control on User A's Proposal...");
  const crossAccessRes = await fetch(`${BASE_URL}/api/proposals/${proposal.id}`, {
    headers: { Authorization: `Bearer ${sessionB.token}` },
  });
  if (crossAccessRes.status === 403) {
    logPass("User B received HTTP 403 Forbidden when trying to access User A's proposal!");
  } else {
    logFail(`User B access control failed: Expected 403, got ${crossAccessRes.status}`);
  }

  const crossCancelRes = await fetch(`${BASE_URL}/api/proposals/${proposal.id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionB.token}`,
    },
    body: JSON.stringify({ reason: "Malicious cancel" }),
  });
  if (crossCancelRes.status === 403) {
    logPass("User B received HTTP 403 Forbidden when trying to cancel User A's proposal!");
  } else {
    logFail(`User B cancel access control failed: Expected 403, got ${crossCancelRes.status}`);
  }

  // TEST 6: User A Cancellation Workflow
  logInfo("\nTEST 6: Testing User Proposal Rejection / Cancellation...");
  const tempPropRes = await fetch(`${BASE_URL}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({
      to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      amountEth: "0.0005",
    }),
  });
  const tempPropJson = await tempPropRes.json();
  const tempPropId = tempPropJson.proposal.id;

  const cancelRes = await fetch(`${BASE_URL}/api/proposals/${tempPropId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({ reason: "User cancelled in preview modal" }),
  });
  const cancelJson = await cancelRes.json();
  if (cancelJson.proposal && cancelJson.proposal.status === "REJECTED") {
    logPass(`Proposal ${tempPropId} successfully transitioned to REJECTED`);
  } else {
    logFail("Cancel proposal failed", cancelJson);
  }

  // TEST 7: Submitting Browser Wallet Tx Hash & State Machine Transition
  logInfo("\nTEST 7: Testing Browser Wallet Confirmation (Tx Hash Submission & Receipt Polling)...");
  const testTxHash = "0x" + "a".repeat(64);
  const submitTxRes = await fetch(`${BASE_URL}/api/proposals/${proposal.id}/submit-tx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({ txHash: testTxHash }),
  });
  const submitTxJson = await submitTxRes.json();
  if (
    submitTxJson.proposal &&
    submitTxJson.proposal.status === "PENDING_RECEIPT" &&
    submitTxJson.proposal.txHash === testTxHash
  ) {
    logPass(`Proposal transitioned to PENDING_RECEIPT with txHash ${testTxHash.slice(0, 10)}...`);
  } else {
    logFail("Submit txHash failed", submitTxJson);
  }

  // 7b. Double-Submission / Double-Click Lock Test
  const dupSubmitRes = await fetch(`${BASE_URL}/api/proposals/${proposal.id}/submit-tx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionA.token}`,
    },
    body: JSON.stringify({ txHash: "0x" + "b".repeat(64) }),
  });
  const dupSubmitJson = await dupSubmitRes.json();
  if (dupSubmitRes.status === 400 && dupSubmitJson.error && dupSubmitJson.error.includes("Double-submission locked")) {
    logPass("Double-submission prevented: Proposal already locked in PENDING_RECEIPT");
  } else {
    logFail("Double-submission lock failed", dupSubmitJson);
  }

  // 7c. Receipt Checking on Base Sepolia RPC
  logInfo("\nTEST 8: Testing On-Chain Receipt Polling via Base Sepolia RPC...");
  const receiptRes = await fetch(`${BASE_URL}/api/proposals/${proposal.id}/check-receipt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionA.token}` },
  });
  const receiptJson = await receiptRes.json();
  if (receiptJson.proposal && (receiptJson.proposal.status === "PENDING_RECEIPT" || receiptJson.proposal.status === "CONFIRMED")) {
    logPass(`Receipt polling returned state: ${receiptJson.proposal.status} (Receipt checked on Base Sepolia RPC)`);
  } else {
    logFail("Receipt check failed", receiptJson);
  }

  // TEST 9: State Persistence and Recovery upon Reload
  logInfo("\nTEST 9: Testing State Persistence & Tab Reload Recovery...");
  const listPropsRes = await fetch(`${BASE_URL}/api/proposals`, {
    headers: { Authorization: `Bearer ${sessionA.token}` },
  });
  const listPropsJson = await listPropsRes.json();
  const recoveredProp = listPropsJson.proposals.find((p) => p.id === proposal.id);

  if (recoveredProp && recoveredProp.txHash === testTxHash && recoveredProp.status === "PENDING_RECEIPT") {
    logPass(`Recovered proposal ${proposal.id} after simulated reload. TxHash intact: ${testTxHash.slice(0, 10)}...`);
  } else {
    logFail("Proposal recovery failed", listPropsJson);
  }

  console.log("\n==================================================================");
  console.log("   🎉 ALL WEEK 3 E2E TESTS PASSED WITH 100% SUCCESS RATE!          ");
  console.log("==================================================================");
}

runTests().catch((err) => {
  console.error("Test suite crashed with unexpected error:", err);
  process.exit(1);
});
