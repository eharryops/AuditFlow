# Security Agent: Mastering Prompt Engineering

This document explains the Security Agent and teaches you **prompt engineering** — the art of getting Claude to do exactly what you want.

---

## The Big Picture

```
Terraform file (1000 lines)
    ↓
SecurityAgent.audit()
    ├─ Extract security sections (IAM, encryption, etc.)
    ├─ Craft system prompt (define role)
    ├─ Craft user prompt (specific task)
    ├─ Call Claude API
    ├─ Parse JSON response
    ├─ Validate findings (no hallucinations)
    └─ Sort by severity
    ↓
Structured findings:
[
  { severity: "CRITICAL", cwe: "CWE-639", issue: "Overly permissive IAM", ... },
  { severity: "HIGH", cwe: "CWE-295", issue: "SSL verification disabled", ... }
]
```

---

## Part 1: System Prompt (The Role Definition)

### What It Is

The system prompt defines **WHO Claude is** and **WHAT Claude should do**.

It's like telling someone: "You are a security expert. Your job is to find bugs. Return findings as JSON."

### The System Prompt (Line-by-Line)

```
You are a security auditor specializing in AWS infrastructure vulnerabilities.
Your expertise: Common Weakness Enumeration (CWE), CVE patterns, and OWASP Top 10.
```

**Why?**
- Gives Claude an identity (security expert, not a general assistant)
- Hints at relevant knowledge areas (CWE, CVE, OWASP)
- Primes Claude to think in security terms

### Defining the Goal

```
YOUR GOAL:
Identify security vulnerabilities in Terraform AWS configurations.
Return findings in a structured, actionable format.
```

**Why?**
- Clear objective prevents Claude from going off-topic
- "Structured, actionable" hints at JSON + practical fixes

### Critical Constraints

```
CRITICAL CONSTRAINTS:
1. Only include REAL vulnerabilities (no false positives)
2. Only use VALID CWE codes (CWE-79, CWE-89, CWE-306, etc.)
3. If uncertain, do NOT include the finding
4. Never hallucinate or speculate
5. Be specific and technical
```

**Why?**
- **No false positives:** Claude can "imagine" vulnerabilities that don't exist
- **Valid CWE codes:** Ensures findings are traceable and credible
- **"If uncertain, don't include":** Prevents hallucinations
- **"Be specific":** Forces Claude to reference actual code, not generic advice

### Output Format (The Critical Section)

```json
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "type": "Category name",
  "cwe": "CWE-XXX",
  "resource": "Resource name from Terraform",
  "issue": "Clear description",
  "vulnerable_code": "Exact snippet",
  "fix": "Specific remediation",
  "impact": "What an attacker could do"
}
```

**Why each field?**
- `severity`: Helps prioritize fixes
- `type`: Categorization (SQL_INJECTION, IAM, etc.)
- `cwe`: Traceable, searchable
- `resource`: Links to actual code
- `vulnerable_code`: Proof it exists
- `fix`: Actionable remediation
- `impact`: Business context

**Why JSON?**
- Machine-readable (not prose)
- Parseable in code
- Easy to structure, filter, sort

### Severity Levels (Structured Thinking)

```
CRITICAL: Immediate risk, can lead to complete system compromise
HIGH: Significant risk, could enable data theft
MEDIUM: Moderate risk, needs fixing before production
LOW: Minor risk, good to fix but not blocking
```

**Why define these?**
- Claude might have different severity definitions
- By being explicit, we ensure consistency
- Makes prioritization easier

### Common Patterns (Few-Shot Learning)

```
COMMON PATTERNS TO LOOK FOR:
- IAM policies with wildcard actions (Action: "*")
- IAM policies without resource restrictions (Resource: "*")
- Unencrypted storage
- Public access enabled
- ...
```

**Why?**
- Trains Claude on what to look for
- "Few-shot" = giving examples
- Each pattern is a cue: "If you see this, it's probably a vulnerability"

---

## Part 2: User Prompt (The Specific Task)

### Token Optimization First

```javascript
const securitySection = 
  terraformParser.extractSectionForAgent(terraformCode, 'security');
```

**Why?**

Full Terraform:
```
resource "aws_s3_bucket" "logs" { ... } // 500 tokens
resource "aws_s3_bucket" "data" { ... } // 500 tokens
resource "aws_lambda_function" "processor" { ... } // 1000 tokens
variable "environment" { default = "prod" } // 200 tokens
... (30+ more resources)

Total: 50,000 tokens → $0.15
```

Extracted (security only):
```
resource "aws_s3_bucket" "logs" {
  server_side_encryption_configuration { ... }
}
resource "aws_iam_role" "lambda_role" {
  assume_role_policy = "..."
}
resource "aws_security_group" "lambda_sg" { ... }

Total: 1,000 tokens → $0.003
```

**Savings: 98%**

### The Actual Prompt

```hcl
Audit this Terraform AWS configuration for security vulnerabilities:

```hcl
[extracted security section]
```

Focus on these areas:
1. IAM policies (overly permissive? wildcard actions?)
2. Encryption (at rest? in transit? KMS keys?)
3. Network access (public? restricted?)
4. Authentication/Authorization (required? enforced?)
5. Service-specific risks (Lambda, S3, RDS, etc.)

Return ONLY a JSON array of findings. No other text.
```

**Why each part?**

1. **"Audit this Terraform for security vulnerabilities"**
   - Repeats the goal (reinforces the task)

2. **[extracted code]**
   - Shows Claude exactly what to audit
   - Only relevant sections (token efficiency)

3. **"Focus on these areas"**
   - Guides Claude's attention
   - Prevents missing common issues

4. **"Return ONLY a JSON array"**
   - Forces specific format
   - "No other text" prevents rambling

---

## Part 3: Temperature = 0.2 (Deterministic Mode)

### Temperature Explained

```
Temperature = Randomness in response generation

0.0: Deterministic (always same answer)
     Claude follows the most likely path
     Great for: security audits, math, facts

0.5: Balanced (some variation)
     Claude explores multiple paths
     Great for: general assistance

1.0: Creative (very different each time)
     Claude explores many paths randomly
     Great for: brainstorming, creative writing
```

### Why 0.2 for Security?

```
Same Terraform
  ↓
Run at temp 1.0:
  Run 1: "Found 5 issues"
  Run 2: "Found 7 issues (different ones!)"
  ❌ Inconsistent results

Run at temp 0.2:
  Run 1: "Found 5 issues"
  Run 2: "Found 5 issues (same ones!)"
  ✅ Consistent, deterministic
```

**Why consistency matters:**
- Same audit should yield same results
- No "hallucinations" of vulnerabilities
- Security decisions based on facts, not luck

---

## Part 4: Validation (Preventing Hallucinations)

### The Problem

Claude can "imagine" vulnerabilities:

```
Claude thinks: "This looks like it could be a SQL injection..."
Claude generates: { cwe: "CWE-89", issue: "SQL injection", ... }
Reality: No SQL injection exists!
```

### The Solution: Validation

```javascript
validateFinding(finding) {
  // Check required fields exist
  if (!finding.cwe) return false;
  
  // Validate CWE format (must be "CWE-XXX")
  if (!/^CWE-\d+$/.test(finding.cwe)) return false;
  
  // Validate severity
  if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(finding.severity))
    return false;
  
  return true;
}
```

**What we validate:**
1. **Required fields:** Every finding needs CWE, severity, etc.
2. **Format:** CWE must be "CWE-" followed by numbers (CWE-89, CWE-639, etc.)
3. **Severity:** Only valid levels (CRITICAL, HIGH, MEDIUM, LOW)

**Why?**
- Catches malformed responses
- Prevents downstream crashes
- Ensures data quality

### Example: Filtering Bad Findings

```
Claude returns:
[
  {
    severity: "HIGH",
    cwe: "CWE-89",  ✅ Valid
    issue: "SQL injection"
  },
  {
    severity: "HIGH",
    cwe: "SQL_INJECTION",  ❌ Wrong format! (should be "CWE-89")
    issue: "SQL injection"
  },
  {
    severity: "EXTREME",  ❌ Invalid! (should be CRITICAL/HIGH/etc.)
    cwe: "CWE-295",
    issue: "SSL issue"
  }
]

After validation:
[
  {
    severity: "HIGH",
    cwe: "CWE-89",
    issue: "SQL injection"
  }
  // Other findings filtered out
]
```

---

## Part 5: Sorting by Severity

### Why Sort?

Users want to see **the most critical issues first**.

```
Raw findings:
[
  { severity: "LOW", cwe: "CWE-639", issue: "..." },
  { severity: "CRITICAL", cwe: "CWE-89", issue: "..." },
  { severity: "MEDIUM", cwe: "CWE-295", issue: "..." },
  { severity: "HIGH", cwe: "CWE-306", issue: "..." }
]

After sorting:
[
  { severity: "CRITICAL", cwe: "CWE-89", issue: "..." },
  { severity: "HIGH", cwe: "CWE-306", issue: "..." },
  { severity: "MEDIUM", cwe: "CWE-295", issue: "..." },
  { severity: "LOW", cwe: "CWE-639", issue: "..." }
]
```

### The Code

```javascript
scoreFindings(findings) {
  const severityOrder = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };
  
  return findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}
```

**How it works:**
1. Assign numbers to severities (1 = highest priority)
2. Sort findings by those numbers
3. Critical findings come first

---

## Part 6: The Return Value

### Example Output

```javascript
{
  success: true,
  findings: [
    {
      severity: "CRITICAL",
      type: "OVERLY_PERMISSIVE_IAM",
      cwe: "CWE-639",
      resource: "aws_iam_role.lambda_role",
      issue: "IAM role grants Effect: Allow on Action: *",
      vulnerable_code: "action = \"*\"",
      fix: "Replace with specific actions or use AWS managed policy",
      impact: "Lambda function can perform any AWS API call"
    },
    // ... more findings
  ],
  summary: {
    critical: 1,
    high: 3,
    medium: 5,
    low: 2
  },
  cost: 0.0047,  // Dollar cost
  tokens: {
    input: 247,
    output: 87,
    total: 334
  },
  agent: "security"
}
```

### Summary Stats

```
critical: 1   → "Block deployment"
high: 3       → "Must fix before prod"
medium: 5     → "Fix soon"
low: 2        → "Nice to have"
```

---

## How Claude Returns Data

### What Claude Actually Sends

```
[
  {
    "severity": "CRITICAL",
    "type": "OVERLY_PERMISSIVE_IAM",
    "cwe": "CWE-639",
    ...
  }
]
```

### But Claude Often Wraps It

```
Here are the security findings:

```json
[
  {
    "severity": "CRITICAL",
    "type": "OVERLY_PERMISSIVE_IAM",
    ...
  }
]
```

Additional notes about the vulnerability...
```

### That's Why We Extract and Validate

```javascript
// Extract JSON from markdown code blocks
const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[1]);  // Parse extracted JSON
}

// Validate each finding
for (const finding of findings) {
  if (this.validateFinding(finding)) {
    validFindings.push(finding);  // Only keep valid ones
  }
}
```

---

## Interview Questions You Can Answer Now

**Q: "Explain your prompt engineering approach for the Security Agent"**

> "I use a two-part prompt: system and user. The system prompt defines Claude's role (security auditor), goal (find vulnerabilities), constraints (no hallucinations), output format (JSON), severity levels, and common patterns to look for. The user prompt repeats the goal and provides the actual Terraform to audit. I set temperature to 0.2 for deterministic results. After Claude responds, I validate each finding (required fields, valid CWE format, allowed severity levels) to catch hallucinations. Finally, I sort findings by severity (critical first) for user prioritization."

**Q: "Why do you validate Claude's response?"**

> "Claude can hallucinate — imagine vulnerabilities that don't exist. Validation catches this by checking: (1) Required fields present, (2) CWE codes valid format (CWE-XXX), (3) Severity in allowed set. Any finding that fails validation is discarded. This ensures we only return real vulnerabilities backed by actual code."

**Q: "How do you optimize tokens in the Security Agent?"**

> "I parse Terraform BEFORE sending to Claude, extracting only security-relevant sections (IAM policies, encryption settings, security groups). This reduces tokens from 50K to 1K (98% savings), cutting cost from $0.15 to $0.003 per audit. I do this for each agent — send only the data that agent needs to analyze."

**Q: "Why temperature 0.2?"**

> "Security audits should be deterministic — same Terraform should always yield the same findings. At temperature 1.0, we might find different issues on repeat runs. At 0.2, Claude takes the 'most confident path' through its reasoning, giving consistent results. This is critical for security where false negatives (missing a real vulnerability) are unacceptable."

---

## Next: Testing the Security Agent

Now that you understand it, let's test it with a real Terraform file and Claude API.

Ready? Let's test it.
