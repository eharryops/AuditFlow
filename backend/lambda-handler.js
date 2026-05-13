/**
 * AWS Lambda Handler for AuditFlow
 * Direct handler for HTTP API Gateway v2 events with CORS
 */

import MockClient from './shared/mock-client.js';
import AuditOrchestrator from './audit-orchestrator/orchestrator.js';

const audits = {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  console.log('[Lambda] Event:', JSON.stringify(event, null, 2));

  // Handle preflight OPTIONS
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Handle POST /api/audit
  if (event.requestContext.http.method === 'POST' && event.rawPath === '/api/audit') {
    try {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;

      const { terraform } = JSON.parse(body);

      if (!terraform || terraform.trim().length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing terraform content' }),
        };
      }

      console.log(`[Lambda] Audit request: ${terraform.length} bytes`);

      const claude = new MockClient();
      const orchestrator = new AuditOrchestrator(claude);
      const result = await orchestrator.audit(terraform);

      audits[result.audit_id] = {
        ...result,
        timestamp: new Date().toISOString(),
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          audit_id: result.audit_id,
          results: result,
        }),
      };
    } catch (error) {
      console.error('[Lambda] Error:', error.message);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  // Handle GET /api/health
  if (event.requestContext.http.method === 'GET' && event.rawPath === '/api/health') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ status: 'ok', version: '0.1.0' }),
    };
  }

  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
