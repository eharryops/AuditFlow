/**
 * AWS Lambda Handler for AuditFlow
 * Wraps Express app for Lambda
 */

import app from './audit-orchestrator/index.js';

export const handler = async (event, context) => {
  // Convert HTTP API Gateway v2 event to Express-like format
  const method = event.requestContext.http.method;
  const path = event.rawPath || event.requestContext.http.path;
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf-8') : (event.body || '');

  console.log(`[Lambda] ${method} ${path}`);

  // Create a mock request/response for Express
  const req = {
    method,
    path,
    url: path,
    headers: event.headers || {},
    body: body ? JSON.parse(body) : {},
    query: event.queryStringParameters || {},
  };

  const responses = [];
  const res = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Content-Type': 'application/json',
    },
    body: '',
    json: (data) => {
      res.body = JSON.stringify(data);
      responses.push({
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
      });
    },
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    send: (data) => {
      res.body = typeof data === 'string' ? data : JSON.stringify(data);
      responses.push({
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
      });
    },
  };

  // Route to handlers
  try {
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers: res.headers, body: '' };
    }

    if (method === 'POST' && path === '/api/audit') {
      const { terraform } = req.body;
      if (!terraform || terraform.trim().length === 0) {
        res.status(400).json({ error: 'Missing terraform content' });
      } else {
        const MockClient = (await import('./shared/mock-client.js')).default;
        const AuditOrchestrator = (await import('./audit-orchestrator/orchestrator.js')).default;

        const claude = new MockClient();
        const orchestrator = new AuditOrchestrator(claude);
        const result = await orchestrator.audit(terraform);

        res.json({
          success: true,
          audit_id: result.audit_id,
          results: result,
        });
      }
    } else if (method === 'GET' && path === '/api/health') {
      res.json({ status: 'ok', version: '0.1.0' });
    } else {
      res.status(404).json({ error: 'Not found' });
    }

    return responses[0] || { statusCode: 500, headers: res.headers, body: '' };
  } catch (error) {
    console.error('[Lambda] Error:', error);
    return {
      statusCode: 500,
      headers: res.headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
