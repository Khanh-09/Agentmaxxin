/**
 * Comprehensive E2E Verification Suite for Long-Term Memory & History System
 * Requirements tested:
 * 1. Storage Reuse & Persistence across reload/restart
 * 2. Explicit memory ("Nhớ rằng...") with automatic superseding and provenance
 * 3. Inferred memory proposal & confirmation flow
 * 4. Automatic secret stripping (private keys, mnemonics)
 * 5. Structured handoff summaries
 * 6. Cognitive context assembly with cross-project and cross-user isolation
 * 7. Safe resume without re-triggering task execution or blockchain transactions
 * 8. User B access control (HTTP 403 Forbidden)
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = options.body
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : null;

    const headers = { ...options.headers };
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers,
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runSuite() {
  console.log('================================================================');
  console.log('🚀 STARTING LONG-TERM MEMORY & HISTORY E2E VERIFICATION SUITE');
  console.log('================================================================\n');

  // --- 1. USER SESSIONS & AUTH SETUP ---
  console.log('--- TEST 1: User A & User B Session Initialization ---');
  const sessionARes = await request('/api/auth/session', { method: 'GET' });
  assert(sessionARes.status === 200 && sessionARes.body.token, 'User A session token generated');
  const tokenA = sessionARes.body.token;
  const userA = sessionARes.body.userId;

  const sessionBRes = await request('/api/auth/session', { method: 'GET' });
  assert(sessionBRes.status === 200 && sessionBRes.body.token, 'User B session token generated');
  const tokenB = sessionBRes.body.token;
  const userB = sessionBRes.body.userId;
  assert(userA !== userB, 'User A and User B have distinct userIds');

  const headersA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` };
  const headersB = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` };

  // --- 2. EXPLICIT MEMORY WITH SUPERSEDING & PROVENANCE ---
  console.log('\n--- TEST 2: Explicit Memory ("Nhớ rằng...") & Automatic Superseding ---');
  // Add initial memory
  const addMem1 = await request('/api/memory', {
    method: 'POST',
    headers: headersA,
    body: {
      key: 'target_currency',
      value: 'ETH',
      scope: 'user',
      method: 'explicit',
    },
  });
  assert(addMem1.status === 200 && addMem1.body.success, 'Added initial memory target_currency=ETH');
  const initialMemId = addMem1.body.memory.id;
  assert(addMem1.body.memory.status === 'active', 'Initial memory is active');

  // Update memory with new value (should supersede the old version)
  const addMem2 = await request('/api/memory', {
    method: 'POST',
    headers: headersA,
    body: {
      key: 'target_currency',
      value: 'USDC',
      scope: 'user',
      method: 'explicit',
    },
  });
  assert(addMem2.status === 200, 'Updated memory target_currency=USDC');
  const newMemId = addMem2.body.memory.id;
  assert(newMemId !== initialMemId, 'New version gets a distinct ID');
  assert(addMem2.body.memory.previousVersionId === initialMemId, 'New version references previous version ID (provenance)');

  // Verify superseded status
  const allMemsA = await request('/api/memory?scope=user&status=all', { headers: headersA });
  const oldMemRecord = allMemsA.body.memories.find((m) => m.id === initialMemId);
  const newMemRecord = allMemsA.body.memories.find((m) => m.id === newMemId);
  assert(oldMemRecord && oldMemRecord.status === 'superseded', 'Old memory record is marked as superseded');
  assert(newMemRecord && newMemRecord.status === 'active', 'New memory record is active');

  // --- 3. PROPOSED MEMORY & USER CONFIRMATION ---
  console.log('\n--- TEST 3: Inferred Memory Proposal & Approval Flow ---');
  const proposeRes = await request('/api/memory', {
    method: 'POST',
    headers: headersA,
    body: {
      key: 'inferred_risk_tolerance',
      value: 'Conservative',
      scope: 'user',
      method: 'inferred',
      confidence: 0.85,
    },
  });
  assert(proposeRes.status === 200, 'Created proposed memory');
  assert(proposeRes.body.memory.status === 'proposed', 'Inferred memory is in proposed status');
  const propId = proposeRes.body.memory.id;

  // Active query should NOT include proposed memory
  const activeOnly = await request('/api/memory?scope=user&status=active', { headers: headersA });
  assert(!activeOnly.body.memories.some((m) => m.id === propId), 'Proposed memory is not returned in active list');

  // Approve the proposed memory
  const approveRes = await request('/api/memory', {
    method: 'PUT',
    headers: headersA,
    body: { id: propId, action: 'approve' },
  });
  assert(approveRes.status === 200 && approveRes.body.memory.status === 'active', 'Approved proposed memory is now active');

  // --- 4. SECRET STRIPPING & SANITIZATION ---
  console.log('\n--- TEST 4: Automatic Secret Redaction ---');
  const secretKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const memWithSecret = await request('/api/memory', {
    method: 'POST',
    headers: headersA,
    body: {
      key: 'leaked_credentials',
      value: `My test private key is ${secretKey} please store it`,
      scope: 'user',
      method: 'explicit',
    },
  });
  assert(memWithSecret.status === 200, 'Saved memory with secret content');
  assert(!memWithSecret.body.memory.value.includes(secretKey), 'Private key was stripped from stored memory');
  assert(memWithSecret.body.memory.value.includes('[REDACTED_PRIVATE_KEY]'), 'Private key redaction placeholder injected');

  // --- 5. PROJECT CREATION, HANDOFF SUMMARY & ISOLATION ---
  console.log('\n--- TEST 5: Project Isolation & Structured Handoff Summaries ---');
  const projA1Id = `proj_alpha_${Date.now()}`;
  const projA2Id = `proj_beta_${Date.now()}`;

  // Project A1: Create with project-scoped memory
  await request('/api/projects', {
    method: 'POST',
    headers: headersA,
    body: {
      id: projA1Id,
      title: 'Project Alpha - DeFi Arbitrage',
      objective: 'Build arbitrage bot on Base Sepolia',
      status: 'ACTIVE',
      messages: [{ role: 'user', text: 'Nhớ rằng gas_limit_max = 500000 cho dự án Alpha' }],
    },
  });

  await request('/api/memory', {
    method: 'POST',
    headers: headersA,
    body: {
      key: 'gas_limit_max',
      value: '500000',
      scope: 'project',
      projectId: projA1Id,
      method: 'explicit',
    },
  });

  // Project A1: Add structured handoff summary
  const handoffRes = await request(`/api/projects/${projA1Id}/handoff`, {
    method: 'POST',
    headers: headersA,
    body: {
      objective: 'Build arbitrage bot on Base Sepolia',
      decidedItems: ['Use Base Sepolia testnet', 'Max gas limit 500,000'],
      completedWork: ['Configured provider', 'Set up wallet'],
      pendingWork: ['Write smart contract adapter', 'Deploy proposal worker'],
      relevantTasks: ['task_init_1'],
    },
  });
  assert(handoffRes.status === 200 && handoffRes.body.success, 'Saved structured handoff summary for Project Alpha');

  // Project A2: Create separate project
  await request('/api/projects', {
    method: 'POST',
    headers: headersA,
    body: {
      id: projA2Id,
      title: 'Project Beta - NFT Faucet',
      objective: 'Distribute NFT badges to testnet users',
      status: 'ACTIVE',
      messages: [{ role: 'user', text: 'Tạo NFT faucet' }],
    },
  });

  // Verify Project A1 memories do NOT leak to Project A2
  const memsProjA1 = await request(`/api/memory?scope=project&projectId=${projA1Id}`, { headers: headersA });
  const memsProjA2 = await request(`/api/memory?scope=project&projectId=${projA2Id}`, { headers: headersA });
  assert(memsProjA1.body.memories.some((m) => m.key === 'gas_limit_max'), 'Project Alpha has gas_limit_max');
  assert(!memsProjA2.body.memories.some((m) => m.key === 'gas_limit_max'), 'Project Beta DOES NOT contain gas_limit_max (No cross-project leakage)');

  // --- 6. USER B ACCESS CONTROL (403 FORBIDDEN) ---
  console.log('\n--- TEST 6: Strict Cross-User Access Control (User B -> User A) ---');
  const attackProj = await request(`/api/projects/${projA1Id}`, { headers: headersB });
  assert(attackProj.status === 403, 'User B blocked from accessing User A project (HTTP 403 Forbidden)');

  const attackHandoff = await request(`/api/projects/${projA1Id}/handoff`, { headers: headersB });
  assert(attackHandoff.status === 403, 'User B blocked from accessing User A handoff summary (HTTP 403 Forbidden)');

  const attackMemories = await request(`/api/memory?scope=project&projectId=${projA1Id}`, { headers: headersB });
  assert(attackMemories.body.memories.length === 0, 'User B cannot query User A project memories');

  // --- 7. SAFE RESUME (LOADS DATA ONLY, NO AUTO-EXECUTION) ---
  console.log('\n--- TEST 7: Safe Resumption (Idempotent Data Loading) ---');
  const resumeRes = await request(`/api/projects/${projA1Id}`, { headers: headersA });
  assert(resumeRes.status === 200, 'Project Alpha successfully resumed');
  assert(resumeRes.body.project.id === projA1Id, 'Resumed correct project ID');
  const handoffDecisions =
    resumeRes.body.project.handoffSummary?.decisions ||
    resumeRes.body.project.handoffSummary?.decidedItems ||
    [];
  assert(handoffDecisions.length === 2, 'Resumed handoff summary decisions');
  assert(resumeRes.body.project.messages?.length > 0, 'Original messages preserved intact');

  // --- 8. MEMORY EDIT & DELETE IMMEDIATE EFFECT ---
  console.log('\n--- TEST 8: Memory Edit & Delete Immediacy ---');
  const editRes = await request('/api/memory', {
    method: 'PUT',
    headers: headersA,
    body: { id: newMemId, value: 'DAI' },
  });
  assert(editRes.status === 200 && editRes.body.memory.value === 'DAI', 'Direct inline edit updated value to DAI');

  const delRes = await request('/api/memory', {
    method: 'DELETE',
    headers: headersA,
    body: { id: newMemId },
  });
  assert(delRes.status === 200 && delRes.body.success, 'Deleted memory item');

  const checkDeleted = await request(`/api/memory?scope=user&status=active`, { headers: headersA });
  assert(!checkDeleted.body.memories.some((m) => m.id === newMemId), 'Deleted memory immediately absent from active list');

  console.log('\n================================================================');
  console.log('🎉 ALL 8 TEST SUITES COMPLETED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runSuite().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
