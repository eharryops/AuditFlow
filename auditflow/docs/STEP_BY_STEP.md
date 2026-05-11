# AuditFlow: Step-by-Step Implementation Guide

This guide explains HOW to implement each component and WHY each design decision matters.

---

## Phase 1: Completed ✅

Project scaffolding, documentation, and basic orchestrator setup.

**Files created:**
- `docs/ARCHITECTURE.md` — Conceptual overview
- `backend/audit-orchestrator/index.js` — Express server + state management
- `backend/shared/parsers/terraform-parser.js` — Token optimization
- `README.md` — Portfolio documentation

**What works:**
- API endpoints defined (health, audit, status, history)
- Mock audit processing with progress tracking
- Terraform parser (extracts resources by type)

**Next: Phase 2**

---

## Phase 2: Claude API Client + Security Agent (NEXT)

### Objective
Build a working Claude API client and implement the first real agent (Security Agent).

### Files to Create

#### 1. `backend/shared/claude-client.js`
**Purpose:** Wrapper around Anthropic SDK

**What it does:**
```javascript
class ClaudeClient {
  async callAPI(systemPrompt, userPrompt, options = {}) {
    // 1. Get Claude API key from environment
    // 2. Count tokens before sending (save money)
    // 3. Call Claude API
    // 4. Parse response
    // 5. Track costs
    // 6. Return structured result
  }

  countTokens(text) {
    // Estimate tokens: ~1 token per 4 characters
    // More accurate: use tokenizer
  }
}
```

**Key Concepts:**
- **Why separate this?** Reusable across all agents
- **Why count tokens?** Budget awareness — know costs before incurring them
- **Why error handling?** API calls fail — need retries, backoff
- **Why caching?** Same prompt → same response, skip API call

**Dependencies:**
```json
{
  "@anthropic-ai/sdk": "^0.24.0"
}
```

**Test it:**
```javascript
const claude = new ClaudeClient(apiKey);
const result = await claude.callAPI(
  "You are a security auditor",
  "Find vulnerabilities in: [terraform code]",
  { temperature: 0.2 }
);
console.log(result);
// { finding: "S3 bucket unencrypted", cwe: "CWE-327", ... }
```

---

#### 2. `backend/agents/security-agent.js`
**Purpose:** First specialized agent

**What it does:**
```javascript
class SecurityAgent {
  async audit(terraformCode) {
    // 1. Extract security-relevant sections
    const section = terraformParser.extractSectionForAgent(terraformCode, 'security');
    
    // 2. Craft system + user prompts
    const systemPrompt = `You are a security auditor...`;
    const userPrompt = `Audit: ${section}`;
    
    // 3. Call Claude
    const findings = await claudeClient.callAPI(systemPrompt, userPrompt);
    
    // 4. Parse response into structured format
    // 5. Validate findings (no hallucinations)
    // 6. Return JSON array
    
    return findings;
  }
}
```

**Prompt Engineering Deep Dive:**

**Bad prompt:**
```
"Find security issues in this Terraform"
```

**Good prompt:**
```
You are a security auditor specializing in AWS infrastructure.
Your goal: Identify CWE/CVE patterns in Terraform configurations.

For each finding:
1. Specify CWE code (e.g., CWE-89 for SQL injection)
2. Explain risk in one sentence
3. Show vulnerable code snippet
4. Provide fix (executable code)
5. Rate severity: CRITICAL | HIGH | MEDIUM | LOW

Return as JSON array:
[
  {
    "cwe": "CWE-89",
    "severity": "CRITICAL",
    "vulnerability": "SQL injection via string interpolation",
    "vulnerable_code": "query = `SELECT * FROM users WHERE id = ${id}`;",
    "fix": "query = `SELECT * FROM users WHERE id = $1`; // Use parameterized queries"
  }
]

Terraform to audit:
[actual code here]
```

**Why each part matters:**
- **Role:** "You are a security auditor" → Claude assumes that identity
- **Goal:** Clear objective → better focus
- **Format:** Specific structure → easy parsing
- **Examples:** Few-shot learning → better quality
- **Constraints:** "CWE code, not generic" → traceable findings

**Temperature = 0.2:**
- No hallucinations ("I found XSS" when there's no user input)
- Consistent results (run twice, get same findings)
- Why not 0.0? Need some variation to catch edge cases

**Key Concepts to Learn:**
- Tokens per finding (~150)
- Cost calculation ($0.003 per 1K input)
- Response parsing (validate JSON before use)
- Retry logic (API sometimes fails)

---

#### 3. Update `backend/shared/parsers/terraform-parser.js`
**Purpose:** Enhance with security-specific extraction

**Add method:**
```javascript
function extractIAMPolicies(terraformCode) {
  // Extract only lines containing:
  // - aws_iam_role
  // - aws_iam_policy
  // - Principal
  // - Action
  // - Effect
  // - Resource
  
  // Remove comments, metadata
  // Return just the security-relevant parts
}
```

**Why?** Reduce tokens sent to security agent by 80%

---

### How to Implement Phase 2

#### Step 1: Create Claude Client
```bash
cd backend/shared
touch claude-client.js
```

**Implement:**
- Initialize Anthropic client
- `callAPI(systemPrompt, userPrompt, options)` method
- `countTokens(text)` method
- Error handling with exponential backoff
- Cost tracking (log dollars spent)

**Test:**
```javascript
const client = new ClaudeClient(process.env.CLAUDE_API_KEY);
const result = await client.callAPI(
  "You are a helpful assistant",
  "What is 2+2?"
);
console.log(result); // Should return something like "2 + 2 = 4"
```

#### Step 2: Create Security Agent
```bash
cd backend/agents
touch security-agent.js
```

**Implement:**
- Craft security audit prompt
- Parse Terraform for IAM/encryption/public access
- Call Claude
- Validate response JSON
- Structure findings

**Test:**
```javascript
const agent = new SecurityAgent(claudeClient);
const findings = await agent.audit(terraformCode);
console.log(findings);
// [
//   { cwe: "CWE-295", severity: "HIGH", issue: "SSL verification disabled", ... },
//   { cwe: "CWE-306", severity: "MEDIUM", issue: "No authentication check", ... }
// ]
```

#### Step 3: Wire into Orchestrator
**Update `backend/audit-orchestrator/index.js`:**

```javascript
import SecurityAgent from '../agents/security-agent.js';

app.post('/audit', async (req, res) => {
  // ...existing code...
  
  // PHASE 2: Call security agent (replace mock)
  const securityAgent = new SecurityAgent(claudeClient);
  const securityFindings = await securityAgent.audit(parsed.toString());
  
  // Store findings
  auditStates.set(auditId, {
    // ...
    security_findings: securityFindings
  });
  
  // ...
});
```

#### Step 4: Test with Real Claude API
```bash
# Create .env file
echo "CLAUDE_API_KEY=sk-ant-..." > backend/.env

# Run server
npm run dev

# Trigger audit
curl -X POST http://localhost:3000/audit \
  -H "Content-Type: application/json" \
  -d '{"terraform":"resource \"aws_s3_bucket\" \"test\" { ...}"}'
```

---

### Learning Objectives (Phase 2)

After completing Phase 2, you'll understand:

1. **Claude API Integration**
   - How to authenticate with API key
   - Token counting before sending (budgeting)
   - Handling different response formats (JSON mode)
   - Error handling and retries

2. **Prompt Engineering**
   - System vs user prompt
   - Temperature settings (0.2 for security)
   - Few-shot examples
   - Output formatting (JSON mode)
   - Constraint definition

3. **Cost Optimization**
   - Calculate cost per audit ($0.10-0.20)
   - Track token usage
   - Identify wasteful patterns

4. **Code Quality**
   - Error handling
   - Testing strategy
   - Logging (what to log, what to hide)
   - Performance metrics

---

### Interview Prep (Phase 2)

**Q: "Explain your approach to prompt engineering"**

> "I start with a clear role definition: 'You are a security auditor...' This tells Claude what identity to assume. Then I specify the goal explicitly. I provide examples (few-shot learning) so Claude understands the desired output format. Finally, I constrain the response: 'Only include valid CWE codes, never make up vulnerabilities.' I use temperature 0.2 for security (deterministic, no hallucinations) vs 0.8 for creative tasks (varied responses)."

**Q: "How do you manage Claude API costs?"**

> "Three strategies: First, I count tokens before sending (budget awareness). Second, I parse data before sending — extract only relevant sections, reducing input tokens by 98%. Third, I implement a memory layer using vector embeddings — similar patterns cached, repeat audits cost ~$0.001 vs $0.10. This scales the cost per analysis dramatically."

**Q: "What happens if the Claude API fails?"**

> "I implement exponential backoff: wait 1s, retry. Wait 2s, retry. Wait 4s, retry. Max 3 attempts. If all fail, I return a cached response (if available) or a generic error. I log all failures for monitoring and alert the team if error rate exceeds threshold."

---

### Estimated Time

- **Implementation:** 3-4 hours
- **Testing & Debugging:** 1-2 hours
- **Documentation:** 1 hour
- **Total:** 5-7 hours

### Cost Budget

- API calls during testing: ~$3-5
- Helps you understand real costs at scale
- Worth it for the learning

---

## Phase 3: Multi-Agent Orchestration (After Phase 2)

### Overview
Implement the remaining 3 agents (Cost, Compliance, Performance) and wire them into parallel execution via Ruflo.

### Files to Create
- `backend/agents/cost-agent.js`
- `backend/agents/compliance-agent.js`
- `backend/agents/performance-agent.js`
- `backend/shared/ruflo-swarm.js` (coordinator)

### Concept
All 4 agents execute **simultaneously** (5-10 seconds total vs 20+ sequential).

---

## Phase 4: Memory Layer

### Files to Create
- `backend/shared/vector-store.js` (in-memory embeddings)
- `backend/shared/memory.js` (retrieval logic)

### Concept
- Store findings as embeddings (1536-dimensional vectors)
- On next audit, compare: "Have we seen this before?"
- Similarity > 0.85 → use cached fix
- Reduces repeat audit cost by 90%

---

## Phase 5: Frontend

### Files to Create
- `frontend/src/App.jsx` (main component)
- `frontend/src/components/FileUpload.jsx` (drag-and-drop)
- `frontend/src/components/Dashboard.jsx` (results display)
- `frontend/src/api/auditClient.js` (API integration)

### Concept
- Upload Terraform file
- Show progress (agents running)
- Display findings organized by severity
- Historical trends

---

## Phase 6: AWS Deployment

### Files to Create
- `infrastructure/main.tf` (Lambda, API Gateway, DynamoDB)
- `infrastructure/variables.tf`
- `infrastructure/outputs.tf`

### Concept
- Deploy backend to Lambda (cold start < 2s)
- Store findings in DynamoDB (vector database)
- Frontend on Vercel
- S3 for file uploads

---

## Phase 7: Portfolio Documentation

### Files to Create
- `docs/DEMO.md` (screenshots + video guide)
- `docs/DEPLOYMENT.md` (how to deploy)
- LinkedIn post draft
- Interview preparation guide

---

## Summary

This guide will be updated after each phase with implementation details.

**Current Status:** Phase 1 Complete ✅  
**Next:** Phase 2 (Claude API + Security Agent) — ~6 hours

**Key Learning Path:**
1. Phase 1: Understand the architecture
2. Phase 2: Learn prompt engineering + Claude API
3. Phase 3: Learn multi-agent orchestration
4. Phase 4: Learn vector embeddings + RAG
5. Phase 5: Learn frontend integration
6. Phase 6: Learn AWS deployment
7. Phase 7: Portfolio storytelling

Each phase builds on the previous one. Don't skip ahead.
