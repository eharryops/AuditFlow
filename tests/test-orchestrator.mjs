/**
 * Test: Multi-Agent Orchestrator
 *
 * Runs all 4 agents (Security, Cost, Compliance, Performance) in parallel.
 *
 * Run: node test-orchestrator.mjs
 */

import MockClient from './backend/shared/mock-client.js';
import AuditOrchestrator from './backend/audit-orchestrator/orchestrator.js';
import fs from 'fs';

async function test() {
  console.log('\n========================================');
  console.log('Multi-Agent Orchestrator Test');
  console.log('(Running 4 agents in parallel)');
  console.log('========================================\n');

  try {
    const terraformCode = fs.readFileSync('./auditflow/tests/sample-terraform/vulnerable-config.tf', 'utf-8');
    console.log('✅ Loaded Terraform file (' + terraformCode.length + ' bytes)\n');

    const mock = new MockClient();
    const orchestrator = new AuditOrchestrator(mock);

    console.log('Starting parallel audit...\n');
    const startTime = Date.now();
    const results = await orchestrator.audit(terraformCode);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('✅ All agents complete in ' + elapsed + 's\n');

    if (results.success) {
      console.log('AUDIT RESULTS');
      console.log('========================================\n');

      console.log('Audit ID: ' + results.audit_id);
      console.log('Duration: ' + results.duration_seconds + 's\n');

      console.log('Total Findings: ' + results.summary.total_findings);
      console.log('\nFindings by Agent:');
      console.log('  🔒 Security:     ' + results.summary.by_agent.security);
      console.log('  💰 Cost:         ' + results.summary.by_agent.cost);
      console.log('  ✅ Compliance:   ' + results.summary.by_agent.compliance);
      console.log('  ⚡ Performance:  ' + results.summary.by_agent.performance);

      console.log('\nFindings by Severity:');
      console.log('  CRITICAL: ' + results.summary.by_severity.critical);
      console.log('  HIGH:     ' + results.summary.by_severity.high);
      console.log('  MEDIUM:   ' + results.summary.by_severity.medium);
      console.log('  LOW:      ' + results.summary.by_severity.low);

      console.log('\nCost Breakdown:');
      console.log('  Security:     $' + results.cost_breakdown.security.toFixed(4));
      console.log('  Cost:         $' + results.cost_breakdown.cost.toFixed(4));
      console.log('  Compliance:   $' + results.cost_breakdown.compliance.toFixed(4));
      console.log('  Performance:  $' + results.cost_breakdown.performance.toFixed(4));
      console.log('  TOTAL:        $' + results.cost_breakdown.total.toFixed(4));

      console.log('\nToken Usage:');
      console.log('  Security:     ' + results.token_breakdown.security.total + ' tokens');
      console.log('  Cost:         ' + results.token_breakdown.cost.total + ' tokens');
      console.log('  Compliance:   ' + results.token_breakdown.compliance.total + ' tokens');
      console.log('  Performance:  ' + results.token_breakdown.performance.total + ' tokens');
      console.log('  TOTAL:        ' + results.token_breakdown.total_tokens + ' tokens');

      console.log('\n\nDETAILED FINDINGS');
      console.log('========================================\n');

      if (results.security.findings.length > 0) {
        console.log('🔒 SECURITY FINDINGS:');
        for (const f of results.security.findings) {
          console.log('  [' + f.severity + '] ' + f.type);
        }
        console.log('');
      }

      if (results.cost.findings.length > 0) {
        console.log('💰 COST FINDINGS:');
        for (const f of results.cost.findings) {
          console.log('  [' + f.severity + '] ' + f.type + ' - ' + f.savings);
        }
        console.log('');
      }

      if (results.compliance.findings.length > 0) {
        console.log('✅ COMPLIANCE FINDINGS:');
        for (const f of results.compliance.findings) {
          console.log('  [' + f.severity + '] ' + f.type + ' (' + f.standard + ')');
        }
        console.log('');
      }

      if (results.performance.findings.length > 0) {
        console.log('⚡ PERFORMANCE FINDINGS:');
        for (const f of results.performance.findings) {
          console.log('  [' + f.severity + '] ' + f.type + ' - ' + f.improvement);
        }
        console.log('');
      }

    } else {
      console.log('❌ FAILED: ' + results.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  console.log('\n========================================\n');
}

test().catch(e => { console.error(e); process.exit(1); });
