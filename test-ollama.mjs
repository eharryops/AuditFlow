/**
 * Test Security Agent with Ollama (Local LLM)
 *
 * Make sure Ollama is running:
 *   ollama serve
 * And pull a model:
 *   ollama pull mistral
 *
 * Then run this test:
 *   node test-ollama.mjs
 */

import OllamaClient from './backend/shared/ollama-client.js';
import SecurityAgent from './backend/agents/security-agent.js';
import fs from 'fs';

async function test() {
  console.log('\n========================================');
  console.log('Testing Security Agent with Ollama');
  console.log('(Free, local LLM - no API costs!)');
  console.log('========================================\n');

  try {
    const terraformCode = fs.readFileSync('./auditflow/tests/sample-terraform/vulnerable-config.tf', 'utf-8');
    console.log('✅ Loaded Terraform file (' + terraformCode.length + ' bytes)\n');

    // Use Ollama instead of Claude
    const ollama = new OllamaClient({
      baseURL: 'http://localhost:11434',
      model: 'mistral',  // Fast model suitable for coding
    });

    console.log('Connecting to Ollama (http://localhost:11434)...\n');

    const agent = new SecurityAgent(ollama);
    console.log('✅ Security Agent initialized with Ollama\n');

    console.log('Running audit (this may take 30-60s on first run)...\n');
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
      console.log('  Cost:          $0.0000 (free!)');

      if (result.findings.length > 0) {
        console.log('\nSample Findings:');
        for (let i = 0; i < Math.min(2, result.findings.length); i++) {
          const f = result.findings[i];
          console.log('\n[' + f.severity + '] ' + f.cwe + ' - ' + f.type);
          console.log('  Issue: ' + f.issue);
        }
      }

      const stats = ollama.getStats();
      console.log('\n\nCumulative Statistics:');
      console.log('  Total API Calls: ' + stats.total_api_calls);
      console.log('  Total Cost: $' + stats.total_cost_dollars.toFixed(4) + ' (free!)');
    } else {
      console.log('❌ FAILED: ' + result.error);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ ERROR: Cannot connect to Ollama');
      console.error('Make sure Ollama is running:');
      console.error('  1. ollama serve');
      console.error('  2. ollama pull mistral');
      console.error('\nThen try again: node test-ollama.mjs');
    } else {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n========================================\n');
}

test().catch(e => { console.error(e); process.exit(1); });
