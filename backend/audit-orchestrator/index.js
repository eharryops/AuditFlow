/**
 * AuditFlow Audit Orchestrator
 *
 * Entry point for the audit service.
 * This is where the Ruflo swarm gets initialized and coordinated.
 *
 * CONCEPT:
 * The orchestrator is the "queen" coordinator that:
 * 1. Receives Terraform files
 * 2. Parses them into sections
 * 3. Spawns 4 specialized agents (Security, Cost, Compliance, Performance)
 * 4. Aggregates results
 * 5. Returns consolidated report
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import terraformParser from '../shared/parsers/terraform-parser.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/x-terraform', limit: '10mb' }));

// Store audit states in memory (for local development)
const auditStates = new Map();

/**
 * STEP 1: Health check endpoint
 * This is where we verify the service is running.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AuditFlow Orchestrator',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * STEP 2: Audit endpoint - receives Terraform files
 *
 * FLOW:
 * POST /audit
 *   ├─ Receive Terraform file
 *   ├─ Parse into sections
 *   ├─ Create audit ID
 *   ├─ Trigger Ruflo swarm (non-blocking)
 *   └─ Return audit ID + status endpoint
 */
app.post('/audit', async (req, res) => {
  try {
    // Generate unique audit ID
    const auditId = uuidv4();
    const timestamp = new Date().toISOString();

    // Extract Terraform from request body
    // In real scenario, this would be multipart file upload
    let terraform;
    if (typeof req.body === 'string') {
      terraform = req.body;
    } else if (req.body.terraform) {
      terraform = req.body.terraform;
    } else {
      return res.status(400).json({
        error: 'Missing terraform configuration in request body'
      });
    }

    console.log(`[${auditId}] Audit started at ${timestamp}`);
    console.log(`[${auditId}] Terraform file size: ${terraform.length} bytes`);

    // STEP 1: Parse Terraform
    console.log(`[${auditId}] Parsing Terraform configuration...`);
    let parsed;
    try {
      parsed = terraformParser.parse(terraform);
      console.log(`[${auditId}] Parsed: ${parsed.resources.length} resources found`);
    } catch (error) {
      return res.status(400).json({
        error: 'Failed to parse Terraform',
        details: error.message
      });
    }

    // Initialize audit state
    auditStates.set(auditId, {
      id: auditId,
      status: 'running',
      progress: {
        parsing: 100,
        security: 0,
        cost: 0,
        compliance: 0,
        performance: 0
      },
      started_at: timestamp,
      results: null,
      error: null
    });

    // STEP 2: Trigger Ruflo swarm asynchronously
    // (We'll implement this in Phase 3)
    console.log(`[${auditId}] Would trigger Ruflo swarm here (Phase 3)`);

    // For now, simulate with mock results after short delay
    simulateAuditAsync(auditId, parsed);

    // Return immediately with audit ID
    res.status(202).json({
      audit_id: auditId,
      status: 'pending',
      status_url: `/audit/${auditId}`,
      message: 'Audit queued for processing'
    });

  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * STEP 3: Poll audit status
 *
 * FLOW:
 * GET /audit/{id}
 *   ├─ If status == "running": return progress
 *   ├─ If status == "completed": return full results
 *   └─ If status == "failed": return error
 */
app.get('/audit/:auditId', (req, res) => {
  const { auditId } = req.params;
  const audit = auditStates.get(auditId);

  if (!audit) {
    return res.status(404).json({ error: 'Audit not found' });
  }

  res.json({
    id: audit.id,
    status: audit.status,
    progress: audit.progress,
    started_at: audit.started_at,
    completed_at: audit.completed_at || null,
    results: audit.results,
    error: audit.error
  });
});

/**
 * STEP 4: Get audit history
 *
 * Returns recent audits (for the dashboard)
 */
app.get('/audits/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const audits = Array.from(auditStates.values())
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, limit)
    .map(audit => ({
      id: audit.id,
      status: audit.status,
      started_at: audit.started_at,
      completed_at: audit.completed_at || null,
      critical_count: audit.results?.findings?.filter(f => f.severity === 'CRITICAL').length || 0,
      total_findings: audit.results?.findings?.length || 0
    }));

  res.json({ audits, total: auditStates.size });
});

/**
 * MOCK: Simulate audit processing
 *
 * In Phase 3, this will be replaced with real Ruflo swarm execution
 */
function simulateAuditAsync(auditId, parsed) {
  // Simulate agents working in parallel
  const startTime = Date.now();

  // Update progress over time
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const audit = auditStates.get(auditId);

    if (!audit) {
      clearInterval(progressInterval);
      return;
    }

    if (elapsed < 2000) {
      audit.progress.security = Math.min(100, (elapsed / 2000) * 100);
      audit.progress.cost = Math.min(100, Math.max(0, (elapsed - 500) / 2000) * 100);
    } else if (elapsed < 4000) {
      audit.progress.security = 100;
      audit.progress.cost = 100;
      audit.progress.compliance = (elapsed - 2000) / 2000 * 100;
    } else if (elapsed < 5000) {
      audit.progress.security = 100;
      audit.progress.cost = 100;
      audit.progress.compliance = 100;
      audit.progress.performance = ((elapsed - 4000) / 1000) * 100;
    } else {
      clearInterval(progressInterval);

      // Mark as complete with mock results
      audit.status = 'completed';
      audit.completed_at = new Date().toISOString();
      audit.progress = {
        parsing: 100,
        security: 100,
        cost: 100,
        compliance: 100,
        performance: 100
      };

      // Generate mock findings
      audit.results = {
        resources_scanned: parsed.resources.length,
        analysis_time_ms: elapsed,
        findings: [
          {
            severity: 'HIGH',
            type: 'OVERLY_PERMISSIVE_IAM',
            resource: 'iam_role',
            issue: 'Effect: Allow on *',
            fix: 'Restrict to specific actions',
            agent: 'security'
          },
          {
            severity: 'MEDIUM',
            type: 'UNUSED_RESOURCE',
            resource: 'nat_gateway',
            monthly_cost: 45,
            fix: 'Delete unused resource',
            agent: 'cost'
          },
          {
            severity: 'INFO',
            type: 'ENCRYPTION_AT_REST',
            status: 'COMPLIANT',
            agent: 'compliance'
          }
        ],
        summary: {
          critical: 0,
          high: 1,
          medium: 1,
          info: 1
        }
      };

      console.log(`[${auditId}] ✅ Audit complete in ${elapsed}ms`);
    }
  }, 100);
}

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 AuditFlow Orchestrator listening on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Audit endpoint: POST http://localhost:${PORT}/audit`);
});

export default app;
