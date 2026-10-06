async function benchmarkSpeed() {
  console.log("=== BENCHMARKING AGENT EXECUTION SPEED & CACHE ACCELERATION ===");
  const baseUrl = "http://localhost:3000";

  // Test prompt triggering multiple tool calls (e.g. weather + crypto price + network info)
  const prompt = "Hãy kiểm tra giá ETH hiện tại và thời tiết tại Hà Nội.";

  console.log("\n1. First Run (Cold Run - Parallel Tool Execution):");
  const t0 = Date.now();
  const res1 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", text: prompt }]
    })
  });
  const data1 = await res1.json();
  const duration1 = Date.now() - t0;
  console.log(`- Response Time (Cold): ${duration1}ms`);
  console.log(`- Tools executed: ${data1.steps?.map(s => s.tool).join(", ")}`);

  console.log("\n2. Second Run (Warm Run - In-Memory TTL Cache Hit):");
  const t1 = Date.now();
  const res2 = await fetch(`${baseUrl}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", text: prompt }]
    })
  });
  const data2 = await res2.json();
  const duration2 = Date.now() - t1;
  console.log(`- Response Time (Warm / Cached): ${duration2}ms`);
  console.log(`- Tools executed: ${data2.steps?.map(s => s.tool).join(", ")}`);

  console.log("\nBenchmark Summary:");
  console.log(`- Cold Duration: ${duration1}ms`);
  console.log(`- Warm Duration: ${duration2}ms (Acceleration: ${(duration1 / duration2).toFixed(1)}x faster)`);
}

benchmarkSpeed().catch(console.error);
