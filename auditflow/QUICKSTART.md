# AuditFlow Quick Start

Get up and running in 5 minutes.

---

## 1. Prerequisites (2 min)

```bash
# Check Node.js
node --version  # Must be >= 18.0.0

# Get Claude API key
# Sign up: console.anthropic.com
# Create key, copy it (starts with sk-ant-)
```

---

## 2. Install Dependencies (1 min)

```bash
cd auditflow/backend
npm install
```

---

## 3. Set API Key (30 sec)

### Mac/Linux
```bash
export CLAUDE_API_KEY="sk-ant-your-key"
```

### Windows PowerShell
```powershell
$env:CLAUDE_API_KEY="sk-ant-your-key"
```

---

## 4. Run Test (1 min)

```bash
cd auditflow
node tests/test-security-agent.js
```

You'll see:
- Terraform file loading
- Claude API call happening
- Security findings discovered
- Cost breakdown

**Expected output:**
```
✅ SUCCESS

Findings Summary:
  CRITICAL: 2
  HIGH:     4
  MEDIUM:   3
  LOW:      1
  TOTAL:    10

Cost: $0.0015
```

---

## 5. Read the Docs (5-10 min)

```bash
# Architecture fundamentals
cat docs/ARCHITECTURE.md

# How Claude client works
cat docs/CLAUDE_CLIENT_EXPLAINED.md

# Prompt engineering secrets
cat docs/SECURITY_AGENT_EXPLAINED.md
```

---

## Next Steps

- [ ] Run the test successfully
- [ ] Read ARCHITECTURE.md
- [ ] Try the learning exercises in TESTING_GUIDE.md
- [ ] Build Phase 3 (Cost, Compliance, Performance agents)

---

## Troubleshooting

**"CLAUDE_API_KEY not provided"**
- Set environment variable: `export CLAUDE_API_KEY="sk-ant-..."`

**"401 Unauthorized"**
- Check your API key is correct and active at console.anthropic.com

**"Failed to parse JSON"**
- Rare, try again (usually works on retry)

**"429 Too Many Requests"**
- Rate limited, wait a moment, try again

---

## Cost Estimate

- Test audit: ~$0.003
- 100 audits: ~$0.30
- 1000 audits: ~$3.00

Very cheap for learning!

---

**Ready?** `node tests/test-security-agent.js` 🚀
