/**
 * Quick test: Security Agent with available Ollama model
 *
 * Tries mistral first, falls back to deepseek-v3.1
 */

import OllamaClient from './backend/shared/ollama-client.js';
import SecurityAgent from './backend/agents/security-agent.js';
import fs from 'fs';

async function getAvailableModel() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    const models = data.models || [];

    // Local models first
    const local = models.find(m => !m.name.includes(':cloud'));
    if (local) return local.name;

    // Fall back to cloud
    const cloud = models.find(m => m.name.includes(':cloud'));
    if (cloud) return cloud.name;

    return 'mistral'; // Default
  } catch (error) {
    console.error('Cannot connect to Ollama. Make sure it\'s running: ollama serve');
    throw error;
  }
}

async function test() {
  console.log('\n========================================');
  console.log('Security Agent - Ollama Test');
  console.log('========================================\n');

  try {
    const terraformCode = fs.readFileSync('./auditflow/tests/sample-terraform/vulnerable-config.tf', 'utf-8');
    console.log('✅ Loaded Terraform file (' + terraformCode.length + ' bytes)\n');

    const model = await getAvailableModel();
    console.log('Using model: ' + model + '\n');

    const ollama = new OllamaClient({
      baseURL: 'http://localhost:11434',
      model: model,
    });

    const agent = new SecurityAgent(ollama);
    console.log('✅ Security Agent initialized\n');

    console.log('Running audit (this may take 30-60s)...\n');
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

      console.log('\nCost: $0.0000 (free!)');

      if (result.findings.length > 0) {
        console.log('\nFirst Finding:');
        const f = result.findings[0];
        console.log('  [' + f.severity + '] ' + f.cwe + ' - ' + f.type);
        console.log('  Issue: ' + f.issue);
        console.log('  Fix: ' + f.fix);
      }
    } else {
      console.log('❌ FAILED: ' + result.error);
      console.log('\nTroubleshooting:');
      console.log('- Make sure Ollama is running: ollama serve');
      console.log('- Check if a model is available: ollama list');
      console.log('- If needed, pull mistral: ollama pull mistral');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nOllama is not running. Start it with: ollama serve');
    }
  }

  console.log('\n========================================\n');
}

test().catch(e => { console.error(e); process.exit(1); });
