# Testing Guide: Running the Security Agent

This guide walks you through testing the Security Agent with real Claude API calls.

---

## Prerequisites

1. **Claude API Key**
   - Sign up at console.anthropic.com
   - Create an API key (keep it secret!)
   - Budget recommended: $5-10 for testing

2. **Node.js 18+**
   ```bash
   node --version  # Should be >= v18.0.0
   ```

3. **Project dependencies**
   ```bash
   cd auditflow/backend
   npm install
   ```

---

## Step 1: Set Environment Variable

### On Mac/Linux
```bash
export CLAUDE_API_KEY="sk-ant-your-key-here"
```

### On Windows (PowerShell)
```powershell
$env:CLAUDE_API_KEY="sk-ant-your-key-here"
```

### On Windows (Command Prompt)
```cmd
set CLAUDE_API_KEY=sk-ant-your-key-here
```

### Verify it's set
```bash
echo $CLAUDE_API_KEY  # Should print your key
```

---

## Step 2: Run the Test

```bash
cd auditflow
node tests/test-security-agent.js
```

---

## What to Expect

### Output: Loading
```
========================================
Testing Security Agent
========================================

STEP 1: Loading Terraform file...
✅ Loaded 3456 bytes of Terraform code

STEP 2: Initializing Claude client...
✅ Claude client initialized

STEP 3: Initializing Security Agent...
✅ Security Agent initialized

STEP 4: Running security audit...
(This will call Claude API - be patient)

[Claude API] Attempt 1/3: Calling claude-3-5-sonnet-20241022
[Claude API] Estimated input: 385 tokens (~$0.0012)
[Claude API] ✅ Success (attempt 1/3)
[Claude API] Tokens: 323 input, 156 output
[Claude API] Cost: $0.0015
[Claude API] Cumulative cost: $0.0015
```

### Output: Results
```
STEP 5: Audit Results
========================================

✅ SUCCESS

Findings Summary:
  CRITICAL: 2
  HIGH:     4
  MEDIUM:   3
  LOW:      1
  TOTAL:    10

Detailed Findings:
---

[CRITICAL] CWE-639 - OVERLY_PERMISSIVE_IAM
Resource: aws_iam_role.lambda_role
Issue: IAM role grants Effect: Allow on Action: * (all actions)
Vulnerable Code: action = "*"
Fix: Replace with specific actions: arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
Impact: Lambda function can perform any AWS API call...

[CRITICAL] CWE-306 - HARDCODED_CREDENTIALS
Resource: aws_db_instance.main
Issue: Database password is hardcoded in Terraform
Vulnerable Code: password = "password123"
Fix: Use AWS Secrets Manager or terraform variables with var.db_password
Impact: Anyone with access to code repository can access database...

[HIGH] CWE-434 - UNENCRYPTED_S3_BUCKET
Resource: aws_s3_bucket.data_bucket
Issue: S3 bucket does not have server-side encryption enabled
Vulnerable Code: (missing server_side_encryption_configuration)
Fix: Add server_side_encryption_configuration block with KMS key
Impact: Sensitive data stored unencrypted...

... (more findings)
```

### Cost Breakdown
```
Cost Breakdown:
---
Input Tokens:  323
Output Tokens: 156
Total Tokens:  479
Cost:          $0.0015

Cumulative Statistics:
---
Total API Calls:      1
Total Input Tokens:   323
Total Output Tokens:  156
Total Cost:           $0.0015
Average Cost/Call:    $0.0015
```

---

## Understanding the Output

### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **CRITICAL** | Immediate risk to system | Block deployment, fix NOW |
| **HIGH** | Significant risk | Fix before going to production |
| **MEDIUM** | Moderate risk | Schedule fix, document justification |
| **LOW** | Minor risk | Fix when time permits |

### What Each Field Means

**CWE Code** (e.g., CWE-639)
- Stands for "Common Weakness Enumeration"
- Traceable, searchable, industry-standard
- CWE-639 = Authorization Bypass
- CWE-89 = SQL Injection
- CWE-306 = Missing Authentication

**Resource**
- Where in your Terraform the issue is
- Links you to the exact place to fix

**Vulnerable Code**
- The exact line causing the issue
- Example: `action = "*"` or `publicly_accessible = true`

**Fix**
- Specific remediation
- Copy-paste this to resolve the issue

**Impact**
- What an attacker could do with this vulnerability
- Business context (data theft, service disruption, etc.)

---

## Cost Analysis

### Pricing Breakdown

```
Input tokens:  $0.003 per 1,000 tokens
Output tokens: $0.015 per 1,000 tokens

Example audit:
- Input: 323 tokens → $0.003 × (323/1000) = $0.000969
- Output: 156 tokens → $0.015 × (156/1000) = $0.00234
- Total: $0.00331 (rounds to $0.0034)
```

### Budget Estimation

```
Cost per audit: $0.001 - $0.005
Audits per $1: 200 - 1000
$5 budget: 1000 - 5000 audits

With memory optimization (Phase 4):
Repeat audits: $0.0001 - $0.0005 each
Savings: 90%
```

---

## Troubleshooting

### Error: "CLAUDE_API_KEY not provided"

**Problem:** Environment variable not set

**Solution:**
```bash
export CLAUDE_API_KEY="sk-ant-..."
node tests/test-security-agent.js
```

### Error: "401 Unauthorized"

**Problem:** Invalid or expired API key

**Solution:**
1. Check your key at console.anthropic.com
2. Generate a new key if necessary
3. Copy the full key (starting with "sk-ant-")

### Error: "429 Too Many Requests"

**Problem:** Rate limited (too many API calls)

**Solution:**
- Wait a few seconds
- The client will retry automatically (exponential backoff)
- Reduce request frequency

### Error: "Failed to parse Claude response as JSON"

**Problem:** Claude returned invalid JSON

**Solution:**
- This is rare but can happen if Claude is confused
- The client logs what it received (for debugging)
- Try again — it usually works on retry

---

## Learning Exercises

### Exercise 1: Change Temperature

In `tests/test-security-agent.js`, change temperature:

```javascript
// Current (deterministic):
const auditResult = await securityAgent.audit(terraformCode);

// Change to 0.8 (creative):
const auditResult = await securityAgent.audit(terraformCode, {
  temperature: 0.8  // More variation
});

// Run it 3 times:
node tests/test-security-agent.js
node tests/test-security-agent.js
node tests/test-security-agent.js

// Compare results
// At 0.2: Same findings each time
// At 0.8: Different findings each run
```

**Learning:** Why temperature 0.2 matters for security.

### Exercise 2: Test with Different Terraform

Create `tests/sample-terraform/good-config.tf`:

```hcl
# Secure Terraform

resource "aws_iam_role" "lambda_role" {
  name = "lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name   = "lambda-policy"
  role   = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:*"]  # Specific action
      Resource = "arn:aws:logs:*:*:*"  # Specific resource
    }]
  })
}

resource "aws_s3_bucket" "secure_bucket" {
  bucket = "my-secure-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.secure_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

Then modify test:
```javascript
const terraformPath = path.join(
  __dirname,
  "sample-terraform",
  "good-config.tf"  // Change this
);
```

**Learning:** How Claude distinguishes secure vs insecure code.

### Exercise 3: Calculate Costs

Modify test to log more details:

```javascript
console.log(`\nToken Efficiency:`);
console.log(`Terraform size: ${terraformCode.length} bytes`);
console.log(`Input tokens: ${auditResult.tokens.input}`);
console.log(`Ratio: ${(terraformCode.length / auditResult.tokens.input).toFixed(1)} bytes/token`);
console.log(`\nIf we sent full Terraform (50KB):`);
console.log(`  Estimated tokens: ${Math.ceil(50000 / 4)}`);
console.log(`  Estimated cost: $${(50000 / 4 * 0.003 / 1000).toFixed(4)}`);
console.log(`Our parsing saves: 98%`);
```

**Learning:** Token optimization impact on costs.

---

## Next Steps

### If Test Succeeds ✅

Great! You've successfully:
1. Called Claude API from Node.js
2. Parsed security findings
3. Validated responses
4. Tracked costs

**Next:** Build the remaining 3 agents (Cost, Compliance, Performance)

### If Test Fails ❌

1. Check the error message (usually clear)
2. Verify your API key is set
3. Ensure you have budget on your account
4. Check internet connection

If stuck, let me know the exact error and we'll debug it.

---

## Running Full Orchestrator

Once security agent works, we can wire it into the orchestrator:

```bash
cd auditflow/backend
npm install
npm run dev  # Starts server on localhost:3000

# In another terminal:
curl -X POST http://localhost:3000/audit \
  -H "Content-Type: application/json" \
  -d '{"terraform":"resource \"aws_s3_bucket\" \"test\" { ... }"}'
```

But first: **Test the security agent** to build confidence.
