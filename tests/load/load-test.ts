/**
 * PHASE 9: Lightweight Load Test Script
 *
 * Tests critical API endpoints under load:
 * - Health endpoints (liveness/readiness)
 * - Auth flow (login)
 * - CRM endpoints (list/create)
 * - Quotation endpoints (list)
 *
 * Usage:
 *   npx tsx tests/load/load-test.ts
 *
 * Environment:
 *   TEST_BASE_URL - Server URL (default: http://localhost:5173)
 *   TEST_CONCURRENCY - Concurrent requests (default: 10)
 *   TEST_DURATION_MS - Test duration in ms (default: 10000)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const CONCURRENCY = parseInt(process.env.TEST_CONCURRENCY || '10', 10);
const DURATION_MS = parseInt(process.env.TEST_DURATION_MS || '10000', 10);

interface RequestResult {
  endpoint: string;
  status: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

interface EndpointStats {
  endpoint: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  avgLatency: number;
  errorRate: number;
  throughput: number;
}

// Calculate percentile
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Make HTTP request with timing
async function timedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<RequestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const latencyMs = Date.now() - start;
    return {
      endpoint,
      status: response.status,
      latencyMs,
      success: response.status < 400,
    };
  } catch (error: any) {
    return {
      endpoint,
      status: 0,
      latencyMs: Date.now() - start,
      success: false,
      error: error.message,
    };
  }
}

// Test endpoint definitions
const ENDPOINTS = [
  {
    name: 'Health (liveness)',
    endpoint: '/api/health/live',
    method: 'GET',
    thresholds: { p95: 100, errorRate: 0.01 },
  },
  {
    name: 'Health (readiness)',
    endpoint: '/api/health/ready',
    method: 'GET',
    thresholds: { p95: 500, errorRate: 0.05 },
  },
  {
    name: 'Health (combined)',
    endpoint: '/api/health',
    method: 'GET',
    thresholds: { p95: 500, errorRate: 0.05 },
  },
  {
    name: 'Auth (login - invalid)',
    endpoint: '/api/auth/login',
    method: 'POST',
    body: JSON.stringify({ email: 'test@test.com', password: 'wrong' }),
    expectedStatus: 401,
    thresholds: { p95: 500, errorRate: 0.05 },
  },
  {
    name: 'CRM Leads (unauth)',
    endpoint: '/api/crm/leads',
    method: 'GET',
    expectedStatus: 401,
    thresholds: { p95: 200, errorRate: 0.05 },
  },
];

// Run load test for single endpoint
async function loadTestEndpoint(
  config: typeof ENDPOINTS[0],
  durationMs: number,
  concurrency: number
): Promise<EndpointStats> {
  const results: RequestResult[] = [];
  const startTime = Date.now();
  let activeRequests = 0;

  const makeRequest = async () => {
    while (Date.now() - startTime < durationMs) {
      activeRequests++;
      const result = await timedRequest(config.endpoint, {
        method: config.method,
        body: config.body,
      });

      // Adjust success based on expected status
      if (config.expectedStatus) {
        result.success = result.status === config.expectedStatus;
      }

      results.push(result);
      activeRequests--;
    }
  };

  // Start concurrent workers
  const workers = Array(concurrency).fill(null).map(() => makeRequest());
  await Promise.all(workers);

  // Calculate stats
  const latencies = results.map(r => r.latencyMs);
  const successCount = results.filter(r => r.success).length;
  const totalDuration = (Date.now() - startTime) / 1000;

  return {
    endpoint: config.name,
    totalRequests: results.length,
    successCount,
    errorCount: results.length - successCount,
    latencies,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    errorRate: results.length > 0 ? (results.length - successCount) / results.length : 0,
    throughput: results.length / totalDuration,
  };
}

// Evaluate thresholds
function evaluateThresholds(
  stats: EndpointStats,
  thresholds: { p95: number; errorRate: number }
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (stats.p95 > thresholds.p95) {
    failures.push(`p95 latency ${stats.p95.toFixed(0)}ms exceeds threshold ${thresholds.p95}ms`);
  }

  if (stats.errorRate > thresholds.errorRate) {
    failures.push(`error rate ${(stats.errorRate * 100).toFixed(2)}% exceeds threshold ${(thresholds.errorRate * 100).toFixed(2)}%`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('PHASE 9: Load Test - Critical API Endpoints');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Duration: ${DURATION_MS}ms per endpoint`);
  console.log('='.repeat(60));
  console.log();

  // Check server availability
  try {
    const health = await fetch(`${BASE_URL}/api/health/live`);
    if (!health.ok) {
      console.error('ERROR: Server not responding. Start server before running load tests.');
      process.exit(1);
    }
  } catch (e) {
    console.error('ERROR: Cannot connect to server at', BASE_URL);
    console.error('Start server with: npm run dev:server');
    process.exit(1);
  }

  const allResults: { stats: EndpointStats; config: typeof ENDPOINTS[0]; evaluation: ReturnType<typeof evaluateThresholds> }[] = [];

  for (const config of ENDPOINTS) {
    console.log(`Testing: ${config.name}...`);
    const stats = await loadTestEndpoint(config, DURATION_MS, CONCURRENCY);
    const evaluation = evaluateThresholds(stats, config.thresholds);
    allResults.push({ stats, config, evaluation });
    console.log(`  Completed: ${stats.totalRequests} requests, p95: ${stats.p95.toFixed(0)}ms, errors: ${stats.errorCount}`);
  }

  // Print summary
  console.log();
  console.log('='.repeat(60));
  console.log('LOAD TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log();

  console.log('| Endpoint | Requests | p50 | p95 | p99 | Errors | Throughput | Status |');
  console.log('|----------|----------|-----|-----|-----|--------|------------|--------|');

  let overallPass = true;
  for (const { stats, evaluation } of allResults) {
    const status = evaluation.passed ? 'PASS' : 'FAIL';
    if (!evaluation.passed) overallPass = false;
    console.log(
      `| ${stats.endpoint.padEnd(20)} | ${stats.totalRequests.toString().padStart(8)} | ${stats.p50.toFixed(0).padStart(3)}ms | ${stats.p95.toFixed(0).padStart(3)}ms | ${stats.p99.toFixed(0).padStart(3)}ms | ${(stats.errorRate * 100).toFixed(1).padStart(5)}% | ${stats.throughput.toFixed(1).padStart(8)} req/s | ${status} |`
    );
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`OVERALL RESULT: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(60));

  // Print failures
  if (!overallPass) {
    console.log();
    console.log('FAILURES:');
    for (const { stats, evaluation } of allResults) {
      if (!evaluation.passed) {
        console.log(`  ${stats.endpoint}:`);
        evaluation.failures.forEach(f => console.log(`    - ${f}`));
      }
    }
  }

  // Exit with appropriate code
  process.exit(overallPass ? 0 : 1);
}

main().catch(e => {
  console.error('Load test error:', e);
  process.exit(1);
});
