# AuditFlow Integration Tests

Integration tests that verify the whole flow works **without hitting the real Claude API**.

All tests use mock data and run instantly at zero cost.

## Quick Start

```bash
# From auditflow root directory
node tests/test-mock.mjs           # Test Security Agent with mock data
node tests/test-orchestrator.mjs   # Test all 4 agents in parallel
node tests/test-memory.mjs         # Test vector embeddings & caching
node tests/test-rag-demo.mjs       # Demonstrate RAG layer
node tests/test-run.mjs            # Full end-to-end audit flow
```

## What Each Test Does

### `test-mock.mjs`
Tests the **Security Agent** with MockClient (fake Claude).
- Loads vulnerable Terraform from `sample-terraform/vulnerable-config.tf`
- Returns mock security findings (CWE codes, impact scoring)
- Shows token counts and cost calculations
- **Use:** Instant demo of agent output format

### `test-orchestrator.mjs`
Tests all **4 agents running in parallel** using `Promise.all()`.
- Spawns Security, Cost, Compliance, Performance agents simultaneously
- Aggregates findings by severity
- Measures execution time (should be ~5 seconds for mock)
- **Use:** Verify orchestration logic and parallelization

### `test-rag-demo.mjs`
Demonstrates the **memory/caching layer** (Retrieval-Augmented Generation).
- Stores findings as vector embeddings
- Searches for similar patterns
- Shows cost savings from cache hits
- **Use:** Understand how semantic caching works

### `test-memory.mjs`
Tests **vector embeddings and semantic search**.
- Converts findings to embeddings
- Searches by meaning (not keywords)
- Shows similarity scoring
- **Use:** Verify memory store functionality

### `test-run.mjs`
Full **end-to-end audit flow**.
- Loads Terraform
- Runs all 4 agents
- Aggregates results
- Returns final audit JSON
- **Use:** Validate complete audit pipeline

### `test-ollama.mjs` / `test-ollama-quick.mjs`
Tests with **local Ollama** (offline LLM, no API key required).
- Same flow as mock tests, but using Ollama backend
- Requires Ollama running locally
- **Use:** Test with real LLM without Claude API costs

## Test Fixtures

### `sample-terraform/vulnerable-config.tf`
Example Terraform with intentional security issues:
- S3 bucket without encryption
- IAM role with overly permissive permissions
- Missing compliance controls
- No cost optimizations

Used by all test files as demo input.

## How to Use in a Demo

```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run a quick test (no API key needed)
node tests/test-mock.mjs

# Show recruiter the instant results
# Then open http://localhost:5173 and upload Terraform manually
```

**No API key needed.** All tests run with mock data.

---

**Why These Tests?**
- Verify code works before deploying
- Demonstrate system without incurring Claude API costs
- Show architecture in action (agents, orchestration, memory)
- Provide reproducible examples for interviews

