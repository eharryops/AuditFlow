/**
 * AuditFlow Dashboard
 *
 * React app showing:
 * - File upload (Terraform)
 * - Real-time audit progress
 * - Results dashboard with filtering
 */

import { useState, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-hcl';
import 'prismjs/themes/prism-tomorrow.css';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://7af699g5uc.execute-api.us-east-1.amazonaws.com';

const SAMPLE_TERRAFORM = `# Intentionally vulnerable Terraform for auditing demo

resource "aws_s3_bucket" "data_bucket" {
  bucket = "my-insecure-data-bucket"
  # ❌ No encryption
  # ❌ No versioning
}

resource "aws_iam_role" "lambda_role" {
  name = "audit-demo-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      # ❌ Overly permissive
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })
}

resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "mysql"
  engine_version = "5.7"
  instance_class = "db.t2.micro"

  # ❌ No encryption at rest
  storage_encrypted = false

  # ❌ No backups
  backup_retention_period = 0

  # ❌ Publicly accessible
  publicly_accessible = true

  # ❌ Default credentials
  username = "admin"
  password = "password123"
}

resource "aws_security_group" "web" {
  name = "web-sg"

  # ❌ Open to internet
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lambda_function" "processor" {
  filename      = "lambda.zip"
  function_name = "data-processor"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs.16"

  # ❌ Old runtime (EOL)
}`;

function App() {
  const [terraform, setTerraform] = useState('');
  const [auditId, setAuditId] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ agent: 'all', severity: 'all' });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  // Load sample Terraform
  const loadSample = () => {
    setTerraform(SAMPLE_TERRAFORM);
    setError(null);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setTerraform(e.target.result);
      setError(null);
    };
    reader.readAsText(file);
  };

  // Run audit
  const runAudit = async () => {
    if (!terraform.trim()) {
      setError('Please enter Terraform code');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_URL}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terraform }),
      });

      if (!res.ok) throw new Error('Audit failed');

      const data = await res.json();
      setAuditId(data.audit_id);
      setResults(data.results);
      
      setAuditSuccess(true);
      setTimeout(() => setAuditSuccess(false), 3000);
    } catch (err) {
      setError('Audit error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare all findings with consistent agent metadata
  const allFindings = results ? [
    ...results.security.findings.map(f => ({ ...f, agentId: 'security', displayAgent: 'Security' })),
    ...results.cost.findings.map(f => ({ ...f, agentId: 'cost', displayAgent: 'Cost' })),
    ...results.compliance.findings.map(f => ({ ...f, agentId: 'compliance', displayAgent: 'Compliance' })),
    ...results.performance.findings.map(f => ({ ...f, agentId: 'performance', displayAgent: 'Performance' }))
  ] : [];

  // Filter findings
  const filteredFindings = allFindings.filter((f) => {
    if (filter.agent !== 'all' && f.agentId !== filter.agent) return false;
    if (filter.severity !== 'all' && f.severity !== filter.severity) return false;
    return true;
  });

  // Export findings to CSV
  const downloadCSV = () => {
    if (!results) return;

    let csv = 'Agent,Severity,Type,Resource,Issue,Suggestion\n';

    allFindings.forEach(f => {
      const agent = f.displayAgent || '';
      const severity = f.severity || '';
      const type = f.type || '';
      const resource = f.resource || '';
      const issue = (f.issue || '').replace(/"/g, '""');
      const fix = (f.fix || f.recommendation || f.remediation || '').replace(/"/g, '""');
      
      csv += `"${agent}","${severity}","${type}","${resource}","${issue}","${fix}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditflow-results-${auditId?.slice(0, 8) || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy findings to clipboard
  const copyToClipboard = () => {
    if (!results) return;

    let text = "AuditFlow Findings:\n\n";

    allFindings.forEach(f => {
      text += `[${f.severity}] ${f.type} (${f.displayAgent})\n`;
      text += `Resource: ${f.resource}\n`;
      text += `Issue: ${f.issue}\n`;
      if (f.fix || f.recommendation || f.remediation) {
        text += `Suggestion: ${f.fix || f.recommendation || f.remediation}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="app">
      <div className="demo-banner">
        ⚠️ This portfolio project uses mock AI responses to prevent API abuse, but the upload and orchestration architecture is fully functional.
      </div>
      <header className="header">
        <h1>🔍 AuditFlow</h1>
        <p>AI-Powered Infrastructure Auditor</p>
      </header>

      <main className="container">
        {/* Info Section */}
        <section className="info-section">
          <h2>What is AuditFlow?</h2>
          <p>
            AuditFlow is a multi-agent orchestration platform that statically analyzes your Terraform code. By leveraging specialized AI agents (Security, Cost, Compliance, and Performance) running in parallel, it helps platform engineers identify vulnerabilities, optimize AWS costs, and enforce architectural best practices before infrastructure is ever provisioned.
          </p>
        </section>

        {/* Input Section */}
        <section className="input-section">
          <div className="controls">
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
              📁 Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tf,.json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button onClick={loadSample} className="btn-secondary">
              📋 Load Sample
            </button>
            <button
              onClick={runAudit}
              disabled={loading || !terraform.trim()}
              className={`btn-primary ${auditSuccess ? 'btn-success' : ''}`}
            >
              {loading ? '⏳ Auditing...' : auditSuccess ? '✅ Audit Complete!' : '▶ Run Audit'}
            </button>
          </div>

            <div className="terraform-input-container">
              <Editor
                value={terraform}
                onValueChange={code => setTerraform(code)}
                highlight={code => Prism.highlight(code, Prism.languages.hcl, 'hcl')}
                padding={16}
                placeholder="Paste Terraform code here or upload a file..."
                className="terraform-editor"
                style={{
                  fontFamily: '"Monaco", "Menlo", monospace',
                  fontSize: '0.9rem',
                  minHeight: '300px'
                }}
              />
            </div>
        </section>

        {/* Error Display */}
        {error && <div className="error-banner">{error}</div>}

        {/* Results Section */}
        {results && (
          <section className="results-section">
            <div className="results-header">
              <h2>📊 Audit Results</h2>
              <div className="audit-meta">
                <span>ID: {auditId?.slice(0, 8)}...</span>
                <span>Duration: {results.duration_seconds}s</span>
                <button onClick={copyToClipboard} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <button onClick={downloadCSV} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}>
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="card">
                <div className="card-value">{results.summary.total_findings}</div>
                <div className="card-label">Total Findings</div>
              </div>
              <div className="card critical">
                <div className="card-value">{results.summary.by_severity.critical}</div>
                <div className="card-label">CRITICAL</div>
              </div>
              <div className="card high">
                <div className="card-value">{results.summary.by_severity.high}</div>
                <div className="card-label">HIGH</div>
              </div>
              <div className="card medium">
                <div className="card-value">{results.summary.by_severity.medium}</div>
                <div className="card-label">MEDIUM</div>
              </div>
              <div className="card low">
                <div className="card-value">{results.summary.by_severity.low}</div>
                <div className="card-label">LOW</div>
              </div>
            </div>

            {/* Agent Results */}
            <div className="agents-grid">
              <div className="agent-card">
                <h3>🔒 Security</h3>
                <p className="count">{results.security.findings.length} findings</p>
              </div>
              <div className="agent-card">
                <h3>💰 Cost</h3>
                <p className="count">{results.cost.findings.length} findings</p>
              </div>
              <div className="agent-card">
                <h3>✅ Compliance</h3>
                <p className="count">{results.compliance.findings.length} findings</p>
              </div>
              <div className="agent-card">
                <h3>⚡ Performance</h3>
                <p className="count">{results.performance.findings.length} findings</p>
              </div>
            </div>

            {/* Filters */}
            <div className="filters">
              <select
                value={filter.severity}
                onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <select
                value={filter.agent}
                onChange={(e) => setFilter({ ...filter, agent: e.target.value })}
              >
                <option value="all">All Agents</option>
                <option value="security">Security</option>
                <option value="cost">Cost</option>
                <option value="compliance">Compliance</option>
                <option value="performance">Performance</option>
              </select>
            </div>

            {/* Findings List */}
            <div className="findings-list">
              {filteredFindings.length === 0 ? (
                <p className="no-results">No findings match your filters</p>
              ) : (
                filteredFindings.map((finding, idx) => (
                  <div key={idx} className={`finding-card ${finding.severity.toLowerCase()}`}>
                    <div className="finding-header">
                      <span className="badge">{finding.severity}</span>
                      <h4>{finding.type}</h4>
                      <span className="agent-badge">{finding.displayAgent}</span>
                    </div>
                    <p className="finding-issue">{finding.issue}</p>
                    {finding.fix && <p className="finding-fix">💡 Suggestion: {finding.fix}</p>}
                    {finding.recommendation && (
                      <p className="finding-fix">💡 Suggestion: {finding.recommendation}</p>
                    )}
                    {finding.remediation && (
                      <p className="finding-fix">💡 Suggestion: {finding.remediation}</p>
                    )}
                    {finding.savings && <p className="finding-savings">Savings: {finding.savings}</p>}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>AuditFlow - Multi-Agent Infrastructure Auditor | Powered by Claude</p>
      </footer>
    </div>
  );
}

export default App;
