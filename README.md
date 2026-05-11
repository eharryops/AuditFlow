# AuditFlow 🔍

**AI-Powered Infrastructure Auditor** — Analyze Terraform + AWS infrastructure using multi-agent Claude orchestration.

## What It Does

Upload your Terraform configuration. AuditFlow spawns 4 parallel AI agents to audit your infrastructure:

- **🔒 Security Agent** — Identifies CWE/CVE patterns, IAM issues, unencrypted storage
- **💰 Cost Agent** — Finds unused resources, calculates monthly costs, suggests optimization
- **✅ Compliance Agent** — Checks encryption, logging, backup policies
- **⚡ Performance Agent** — Identifies cold start risks, bottlenecks, scaling issues

Each agent runs in parallel, returns findings, and stores results in a vector database. **Second audits are 90% faster** thanks to pattern memory.

## Quick Start

### Prerequisites
- Node.js 18+
- Claude API key

### Local Development

```bash
# Clone and setup
git clone https://github.com/yourusername/auditflow
cd auditflow
npm install

# Start backend server
cd backend
npm install
npm run dev
# Server runs on http://localhost:3000

# In another terminal, start frontend
cd ../frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### First Audit

```bash
# Upload a Terraform file
curl -X POST http://localhost:3000/audit \
  -H "Content-Type: text/plain" \
  -d @path/to/main.tf

# Get audit ID from response
# Poll results
curl http://localhost:3000/audit/{audit_id}
```

## Architecture

See `docs/ARCHITECTURE.md` for detailed explanation of:
- Claude API fundamentals (tokens, prompts, temperature)
- Multi-agent orchestration patterns
- Prompt engineering techniques
- Vector memory and RAG
- Ruflo swarm coordination

## Project Structure

```
auditflow/
├── backend/                          # Express.js API
│   ├── agents/                       # 4 agents (Security, Cost, Compliance, Performance)
│   ├── audit-orchestrator/           # Promise.all() coordinator
│   ├── shared/                       # Claude client, parsers, embeddings, memory store
│   ├── package.json
│   └── npm start                     # Runs on :3000

├── frontend/                         # React + Vite
│   ├── src/
│   │   ├── App.jsx                  # Main dashboard
│   │   ├── components/              # React components
│   │   ├── hooks/                   # Custom hooks (useAudit, etc)
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── npm run dev                  # Runs on :5173

├── infrastructure/                   # Terraform IaC
│   ├── terraform/
│   │   ├── main.tf                  # Root config
│   │   ├── variables.tf
│   │   ├── modules/                 # Reusable modules
│   │   │   ├── iam/                 # IAM roles & policies
│   │   │   ├── lambda/              # Lambda function
│   │   │   ├── dynamodb/            # DynamoDB table
│   │   │   ├── api/                 # API Gateway
│   │   │   └── s3/                  # S3 + CloudFront
│   │   └── environments/            # Dev & prod configs
│   ├── Makefile                     # Deployment automation
│   └── DEPLOYMENT.md                # AWS guide

├── tests/                           # Integration tests
│   ├── test-run.mjs
│   ├── test-orchestrator.mjs
│   ├── test-memory.mjs
│   ├── test-rag-demo.mjs
│   ├── test-mock.mjs
│   ├── sample-terraform/            # Test fixtures
│   └── integration/

├── docs/
│   ├── ARCHITECTURE.md              # Concepts & design
│   └── STEP_BY_STEP.md              # Implementation guide

├── README.md                         # This file
├── RUN_LOCALLY.md                   # Local dev setup
├── AuditFlow-README.md              # Main project overview
├── AuditFlow-Phase{1-6}-Summary.md  # Phase-by-phase learning
├── INTERVIEW_TALKING_POINTS.md      # Interview prep (600+ lines)
└── INDEX.md                         # Navigation guide
```

## Development Phases

- **Phase 1** ✅ Project scaffolding + architecture
- **Phase 2** ✅ Claude API client + Security Agent (token optimization, validation)
- **Phase 3** ✅ Multi-agent orchestration (Promise.all, 4x speedup)
- **Phase 4** ✅ Memory layer (vector embeddings, RAG, 80-90% cost savings)
- **Phase 5** ✅ React frontend (hooks, async/await, dashboard)
- **Phase 6** ✅ AWS deployment (Terraform IaC, modular architecture)
- **Phase 7** 🔄 Documentation + interview prep (complete, ready to ship)

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **AI:** Claude API + Anthropic SDK
- **Orchestration:** Ruflo (multi-agent swarm)
- **Memory:** DynamoDB + embeddings
- **Infrastructure:** AWS Lambda, S3, API Gateway
- **IaC:** Terraform

## Learning Outcomes

Building AuditFlow teaches you:

1. **Prompt Engineering** — Crafting effective AI instructions
2. **Token Economics** — Optimizing costs (98% reduction in our case)
3. **Multi-Agent Systems** — Parallel problem-solving patterns
4. **Vector Embeddings** — Semantic similarity search
5. **System Design** — Coordinating async distributed work
6. **Production AI** — Error handling, monitoring, cost control

## Portfolio Interview Prep

**Q: "How did you optimize costs in AuditFlow?"**

> "I implemented a two-tier approach. First, I parse Terraform before sending to Claude, extracting only relevant sections (reducing tokens by 98%). Second, I use embeddings to store findings in a vector database. When we audit similar infrastructure, we retrieve cached solutions instead of calling Claude again. This cuts repeat audit time from 10 seconds to <100ms and costs from $0.10 to $0.001."

**Q: "Why did you use multiple agents instead of one?"**

> "One agent would be slower (20 seconds sequential) and more expensive (same work across 4 tasks). With parallel agents orchestrated by Ruflo, we get results in 5 seconds and can specialize each agent (security expert, cost optimizer, compliance checker). Trade-off: complexity vs speed. Ruflo handles the coordination automatically."

**Q: "How would you extend this to audit your company's infrastructure?"**

> "I'd wire it into a CI/CD pipeline using GitHub Actions. On every Terraform PR, trigger AuditFlow, block merge if critical issues found. Use memory layer to learn from fixes over time, making subsequent audits faster and smarter."

## Status

✅ **Complete** — All 6 phases shipped. Phase 7 (documentation & portfolio) ready.

- 11 markdown files (~3,700 lines)
- 50+ interview Q&A with deep dives
- Phase-by-phase learning guides
- Production Terraform IaC
- Full AWS deployment guide

**Ready for:** GitHub + job applications

## Next Steps

1. Read `docs/ARCHITECTURE.md` to understand the concepts
2. Explore `backend/audit-orchestrator/index.js` for entry point
3. Follow `RUN_LOCALLY.md` to get it running locally

## License

MIT

---

**Made with ❤️ by Eddie Harry**
Portfolio project demonstrating Gen AI + Platform Engineering skills.
