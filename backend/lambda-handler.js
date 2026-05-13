/**
 * AWS Lambda Handler for AuditFlow
 * Routes HTTP API Gateway v2 events directly to express handlers
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import MockClient from './shared/mock-client.js';
import AuditOrchestrator from './audit-orchestrator/orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const audits = {};

app.post('/api/audit', async (req, res) => {
  try {
    const { terraform } = req.body;

    if (!terraform || terraform.trim().length === 0) {
      return res.status(400).json({ error: 'Missing terraform content' });
    }

    console.log(`[API] Audit request: ${terraform.length} bytes`);

    const claude = new MockClient();
    const orchestrator = new AuditOrchestrator(claude);
    const result = await orchestrator.audit(terraform);

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

// Middleware to convert HTTP API Gateway v2 event to Express request
export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS requests
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  return new Promise((resolve) => {
    app(event, {
      statusCode: 200,
      headers,
      body: '',
      send: (data) => {
        resolve({
          statusCode: 200,
          headers,
          body: JSON.stringify(data),
        });
      },
      json: (data) => {
        resolve({
          statusCode: 200,
          headers,
          body: JSON.stringify(data),
        });
      },
      status: (code) => ({
        json: (data) => {
          resolve({
            statusCode: code,
            headers,
            body: JSON.stringify(data),
          });
        },
      }),
    });
  });
};
