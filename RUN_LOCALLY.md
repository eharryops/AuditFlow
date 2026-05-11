# AuditFlow - Run Locally

Complete guide to run the full stack locally.

## Quick Start (3 terminals)

### Terminal 1: Backend API
```bash
cd backend
npm start
# Runs on http://localhost:3000
```

### Terminal 2: Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Terminal 3: (Optional) Check API
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","version":"0.1.0"}
```

Then open: **http://localhost:5173**

---

## What You'll See

### Dashboard Features
- **Upload/Paste Terraform** — Drag & drop or paste code
- **Load Sample** — Try with pre-built vulnerable config
- **Run Audit** — Triggers 4-agent orchestrator
- **Results** — Interactive dashboard with findings

### Real-time Results
- **Security findings** (CWE codes, impact)
- **Cost opportunities** (monthly savings)
- **Compliance gaps** (SOC 2, HIPAA, PCI-DSS)
- **Performance issues** (latency, cold starts)

### Filters
- By severity (CRITICAL, HIGH, MEDIUM, LOW)
- By agent (Security, Cost, Compliance, Performance)

---

## Architecture

```
Frontend (React + Vite)
    ↓ HTTP
Backend API (Express)
    ↓
Orchestrator (4 agents in parallel)
    ├→ SecurityAgent (Mock)
    ├→ CostAgent (Mock)
    ├→ ComplianceAgent (Mock)
    └→ PerformanceAgent (Mock)
    ↓
Results (JSON)
    ↑ HTTP
Frontend (displays dashboard)
```

---

## Tech Stack

**Frontend:**
- React 18 + Hooks
- Vite (fast dev server)
- Tailwind-inspired CSS (custom)

**Backend:**
- Express.js
- Multi-agent orchestrator
- Mock Claude client (free)

**Agents:**
- All using mock responses (no API costs)
- Realistic findings based on Terraform content
- Can swap MockClient → OllamaClient or Claude when ready

---

## Environment

No env files needed for local development!

- Backend: Runs on port 3000
- Frontend: Runs on port 5173
- API is proxied automatically in dev

---

## Troubleshooting

### Backend won't start
```bash
cd backend
npm install
npm start
```

### Frontend won't start
```bash
cd frontend
npm install
npm run dev
```

### CORS errors
Ensure backend is running and frontend is hitting http://localhost:3000/api

### Port conflicts
Change in `frontend/vite.config.js`:
```js
server: { port: 5174 }
```

---

## Next Steps

1. **Swap Mock → Real Claude**
   - Set `CLAUDE_API_KEY` env var
   - Change MockClient → ClaudeClient in backend

2. **Deploy to AWS**
   - Lambda + API Gateway (backend)
   - S3 + CloudFront (frontend)
   - See Phase 6 docs

3. **Add Memory Layer**
   - Wire up vector embeddings
   - Connect DynamoDB for persistence
   - See Phase 4 implementation

---

## Production Ready?

This stack is **NOT production-ready** yet because:
- ✅ Architecture is solid
- ✅ Code is clean and well-documented
- ❌ No error recovery
- ❌ No rate limiting
- ❌ No auth/RBAC
- ❌ No persistent storage

Phase 6 (AWS deployment) will address these.

---

**Ready to audit infrastructure?** 🚀

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm install && npm run dev

# Then: http://localhost:5173
```
