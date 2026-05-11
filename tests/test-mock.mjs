/**
 * Mock Test: Security Agent with Mock Client
 *
 * No API costs, no Ollama required.
 * Perfect for testing the code flow.
 *
 * Run: node test-mock.mjs
 */

import MockClient from './backend/shared/mock-client.js';
import SecurityAgent from './backend/agents/security-agent.js';
import fs from 'fs';

async function test() {
  console.log('\n========================================');
  console.log('Security Agent - Mock Test');
  console.log('========================================\n');

  try {
    const terraformCode = fs.readFileSync('./auditflow/tests/sample-terraform/vulnerable-config.tf', 'utf-8');
    console.log('✅ Loaded Terraform file (' + terraformCode.length + ' bytes)\n');

    const mock = new MockClient();
    console.log('✅ Mock client initialized\n');

    const agent = new SecurityAgent(mock);
    console.log('✅ Security Agent initialized\n');

    console.log('Running audit (with mock - instant)...\n');
    const startTime = Date.now();
    const result = await agent.audit(terraformCode);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n✅ Audit complete in ' + elapsed + 's\n');

    if (result.success) {
      console.log('Findings Summary:');
      console.log('  CRITICAL: ' + result.summary.critical);
      console.log('  HIGH:     ' + result.summary.high);
      console.log('  MEDIUM:   ' + result.summary.medium);
      console.log('  LOW:      ' + result.summary.low);
      console.log('  TOTAL:    ' + result.findings.length);

      console.log('\nCost Breakdown:');
      console.log('  Input Tokens:  ' + result.tokens.input);
      console.log('  Output Tokens: ' + result.tokens.output);
      console.log('  Total:         ' + result.tokens.total);
      console.log('  Cost:          $' + result.cost.toFixed(4) + ' (mock - free!)');

      console.log('\n\nDetailed Findings (sorted by severity):');
      console.log('========================================');
      for (const finding of result.findings) {
        console.log('\n[' + finding.severity + '] ' + finding.cwe + ' - ' + finding.type);
        console.log('Resource: ' + finding.resource);
        console.log('Issue: ' + finding.issue);
        console.log('Vulnerable Code: ' + finding.vulnerable_code);
        console.log('Fix: ' + finding.fix);
      }

      const stats = mock.getStats();
      console.log('\n\nCumulative Statistics:');
      console.log('========================================');
      console.log('Total API Calls: ' + stats.total_api_calls);
      console.log('Total Tokens: ' + (stats.total_input_tokens + stats.total_output_tokens));
      console.log('Total Cost: $' + stats.total_cost_dollars.toFixed(4) + ' (free!)');

    } else {
      console.log('❌ FAILED: ' + result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  console.log('\n========================================\n');
}

test().catch(e => { console.error(e); process.exit(1); });
