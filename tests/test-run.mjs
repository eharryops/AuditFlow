import ClaudeClient from './backend/shared/claude-client.js';
import SecurityAgent from './backend/agents/security-agent.js';
import fs from 'fs';

async function test() {
  console.log('\n========================================');
  console.log('Testing Security Agent - Phase 2');
  console.log('========================================\n');

  const terraformCode = fs.readFileSync('./auditflow/tests/sample-terraform/vulnerable-config.tf', 'utf-8');
  console.log('✅ Loaded Terraform file (' + terraformCode.length + ' bytes)\n');

  const claude = new ClaudeClient(process.env.CLAUDE_API_KEY);
  console.log('✅ Claude client initialized\n');

  const agent = new SecurityAgent(claude);
  console.log('✅ Security Agent initialized\n');

  console.log('Running audit...\n');
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
    console.log('  Cost:          $' + result.cost.toFixed(4));

    console.log('\nSample Findings:');
    for (let i = 0; i < Math.min(3, result.findings.length); i++) {
      const f = result.findings[i];
      console.log('\n[' + f.severity + '] ' + f.cwe + ' - ' + f.type);
      console.log('  Issue: ' + f.issue);
    }

    const stats = claude.getStats();
    console.log('\n\nCumulative Statistics:');
    console.log('  Total API Calls: ' + stats.total_api_calls);
    console.log('  Total Cost: $' + stats.total_cost_dollars.toFixed(4));
  } else {
    console.log('❌ FAILED: ' + result.error);
  }

  console.log('\n========================================\n');
}

test().catch(e => { console.error(e); process.exit(1); });
