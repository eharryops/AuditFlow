/**
 * RAG Demo: Showing how semantic search finds relevant past findings
 *
 * Demonstrates the core concept:
 * - Finding A: "S3 bucket has public-read access"
 * - Finding B: "S3 bucket is publicly accessible"
 * - Semantic similarity: ~0.95 (nearly identical)
 * - Without RAG: Would call Claude twice, 2x API cost
 * - With RAG: Search finds B, returns cached solution, 0 API cost
 *
 * Run: node test-rag-demo.mjs
 */

import EmbeddingService from './backend/shared/embedding-service.js';
import MemoryStore from './backend/shared/memory-store.js';

async function demo() {
  console.log('\n========================================');
  console.log('RAG Demo: Semantic Finding Search');
  console.log('========================================\n');

  // Initialize
  const embeddings = new EmbeddingService({ type: 'mock' });
  const memory = new MemoryStore(embeddings);

  console.log('Step 1: Store past findings in memory\n');

  // Store some "past findings"
  const pastFindings = [
    {
      type: 'OVERLY_PERMISSIVE_IAM',
      issue: 'IAM role grants Action: * (wildcard)',
      resource: 'aws_iam_role.lambda_exec',
      fix: 'Replace with specific actions: logs:CreateLogGroup, logs:CreateLogStream',
      severity: 'CRITICAL',
    },
    {
      type: 'PUBLIC_S3_BUCKET',
      issue: 'S3 bucket has public-read access enabled',
      resource: 'aws_s3_bucket.uploads',
      fix: 'Set ACL to private and use bucket policy',
      severity: 'HIGH',
    },
    {
      type: 'UNENCRYPTED_DATABASE',
      issue: 'RDS database encryption at rest not enabled',
      resource: 'aws_db_instance.main',
      fix: 'Enable encryption_enabled = true',
      severity: 'HIGH',
    },
    {
      type: 'MISSING_VPC_ENDPOINT',
      issue: 'Lambda not using VPC endpoint for S3 access',
      resource: 'aws_lambda_function.processor',
      fix: 'Configure S3 VPC endpoint gateway',
      severity: 'MEDIUM',
    },
  ];

  for (const finding of pastFindings) {
    await memory.storeFinding(finding, 'security');
    console.log(`✅ Stored: ${finding.type}`);
  }

  console.log('\n\nStep 2: Search for similar findings\n');

  // Define new findings to search for
  const newFindings = [
    {
      query: 'S3 bucket accessible to public users',
      description: 'Semantically similar to "S3 bucket has public-read access"',
    },
    {
      query: 'Lambda IAM policy too permissive with wildcard actions',
      description: 'Semantically similar to "IAM role grants Action: *"',
    },
    {
      query: 'Database not protected with encryption',
      description: 'Semantically similar to "RDS encryption at rest not enabled"',
    },
    {
      query: 'CloudFront CDN configuration issues',
      description: 'Not stored before - should find no matches',
    },
  ];

  for (const newFinding of newFindings) {
    console.log(`\nSearching: "${newFinding.query}"`);
    console.log(`Expected: ${newFinding.description}\n`);

    const results = await memory.search(newFinding.query, 'security', 5, 0.3);

    if (results.length > 0) {
      console.log(`✅ Found ${results.length} match${results.length !== 1 ? 'es' : ''}:`);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const similarityPercent = (r.similarity * 100).toFixed(0);
        console.log(`   ${i + 1}. [${r.severity}] ${r.finding.type}`);
        console.log(`      Similarity: ${similarityPercent}%`);
        console.log(`      Original issue: ${r.finding.issue}`);
        console.log(`      Solution: ${r.finding.fix}`);
      }
    } else {
      console.log(`❌ No matches found`);
    }
  }

  console.log('\n\nStep 3: Cost Impact Analysis\n');

  const scenarioStats = [
    {
      name: 'No memory (every query → Claude)',
      audits: 100,
      findings_per_audit: 5,
      api_calls: 500,
      cost_per_call: 0.002,
    },
    {
      name: 'With memory (80% hit rate)',
      audits: 100,
      findings_per_audit: 5,
      api_calls: 100, // 20% of 500
      cost_per_call: 0.002,
    },
  ];

  console.log('Scenario: 100 audits × 5 findings each\n');
  for (const scenario of scenarioStats) {
    const totalCost = scenario.api_calls * scenario.cost_per_call;
    console.log(`${scenario.name}:`);
    console.log(`  API calls: ${scenario.api_calls}`);
    console.log(`  Total cost: $${totalCost.toFixed(2)}`);
  }

  const savingsPercent = (
    ((500 - 100) / 500) *
    100
  ).toFixed(0);
  const savings = (500 - 100) * 0.002;
  console.log(`\nSavings with memory: ${savingsPercent}% fewer API calls`);
  console.log(`Actual savings: $${savings.toFixed(2)} per 100 audits\n`);

  console.log('At Production Scale (100,000 audits):');
  console.log(`  Without memory: ${(100000 * 5).toLocaleString()} API calls`);
  console.log(`  With memory:    ${(100000 * 5 * 0.2).toLocaleString()} API calls`);
  console.log(`  Savings: $${((100000 * 5 * 0.8) * 0.002).toFixed(0)}\n`);

  console.log('========================================\n');
}

demo().catch(e => { console.error(e); process.exit(1); });
