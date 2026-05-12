/**
 * AuditFlow Backend API
 *
 * Express server that runs the multi-agent orchestrator
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import MockClient from '../shared/mock-client.js';
import AuditOrchestrator from './orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// In-memory audit storage
const audits = {};

/**
 * POST /api/audit
 * Run full multi-agent audit
 */
app.post('/api/audit', async (req, res) => {
  try {
    const { terraform } = req.body;

    if (!terraform || terraform.trim().length === 0) {
      return res.status(400).json({ error: 'Missing terraform content' });
    }

    console.log(`[API] Audit request: ${terraform.length} bytes`);

    // Use mock client (free)
    const claude = new MockClient();
    const orchestrator = new AuditOrchestrator(claude);

    // Run audit
    const result = await orchestrator.audit(terraform);

    // Store result
    audits[result.audit_id] = {
      ...result,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      audit_id: result.audit_id,
      results: result,
    });
  } catch (error) {
    console.error('[API] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit/:auditId
 * Get audit results by ID
 */
app.get('/api/audit/:auditId', (req, res) => {
  const { auditId } = req.params;
  const audit = audits[auditId];

  if (!audit) {
    return res.status(404).json({ error: 'Audit not found' });
  }

  res.json({ success: true, audit });
});

/**
 * GET /api/audits
 * List recent audits
 */
app.get('/api/audits', (req, res) => {
  const list = Object.entries(audits)
    .map(([id, data]) => ({
      id,
      timestamp: data.timestamp,
      findings: data.summary.total_findings,
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  res.json({ success: true, audits: list });
});

/**
 * GET /api/sample
 * Load sample Terraform
 */
app.get('/api/sample', (req, res) => {
  try {
    const samplePath = path.join(
      __dirname,
      '../../tests/sample-terraform/vulnerable-config.tf'
    );
    const content = fs.readFileSync(samplePath, 'utf-8');
    res.json({ success: true, terraform: content });
  } catch (error) {
    res.status(500).json({ error: 'Could not load sample' });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

/**
 * Serve frontend (will exist in next step)
 */
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.get('/', (req, res) => {
  res.send('AuditFlow API - POST /api/audit with Terraform code');
});

// Start
app.listen(PORT, () => {
  console.log(`\n🚀 AuditFlow API Server`);
  console.log(`Port: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health\n`);
});

export default app;
