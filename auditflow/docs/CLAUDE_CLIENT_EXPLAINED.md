# Claude Client: Line-by-Line Explanation

This document explains every concept in `backend/shared/claude-client.js` so you truly understand what's happening.

---

## The Big Picture

```
Your Code
    ↓
ClaudeClient (this file)
    ├─ Counts tokens (budget awareness)
    ├─ Calls Claude API
    ├─ Retries on failure
    ├─ Tracks costs
    └─ Returns structured response
    ↓
Claude API (Anthropic)
    ├─ Processes your prompt
    ├─ Generates response
    └─ Returns tokens used
    ↓
Your Code (now knows cost & result)
```

---

## Section 1: The Pricing Model

### Why Claude API Costs Money

Claude is a **large language model** running on powerful GPUs. Every API call:
1. Sends your text to Anthropic's servers
2. Processes it through billions of parameters
3. Generates response tokens one-by-one
4. Returns result

**This costs electricity, GPUs, infrastructure.**

### The Two-Tier Pricing

```
Input tokens:  $0.003 per 1,000 tokens
Output tokens: $0.015 per 1,000 tokens (5x more!)
```

**Why is output 5x more expensive?**

- **Input:** You create it, you control it → can optimize
- **Output:** Claude generates it → costs money to generate

**Analogy:**
- You write a question (input) ← cheap
- Claude thinks and writes answer (output) ← expensive

### Example Cost Calculation

```
Prompt:
System: "You are a security auditor" (8 tokens)
User: "Audit this [1000-line Terraform]" (250 tokens)
Total input: 258 tokens

Response:
"Found 5 issues: CWE-89 SQL injection..." (100 tokens)
Total output: 100 tokens

Cost:
- Input: (258 / 1000) × $0.003 = $0.000774
- Output: (100 / 1000) × $0.015 = $0.0015
- Total: $0.002274 per API call
```

**This is why we optimize:**
- Full Terraform (50K tokens): $0.15 per audit
- Parsed Terraform (1K tokens): $0.003 per audit
- Savings: 98%

---

## Section 2: Estimating Tokens

### Code
```javascript
estimateTokens(text) {
  const estimatedTokens = Math.ceil(text.length / 4);
  return estimatedTokens;
}
```

### What It Does
Converts text length to approximate token count.

### The Formula
```
1 token ≈ 4 characters
```

### Examples
```
"hello" = 5 characters ÷ 4 = 1.25 tokens → 2 tokens
"The quick brown fox" = 19 characters ÷ 4 = 4.75 tokens → 5 tokens
```

### Why 4 Characters?
Claude uses **BPE (Byte Pair Encoding) tokenization**. It's not character-by-character:
- Common words = 1 token ("hello")
- Rare words = 2+ tokens ("cryptography")
- Symbols = 1 token each (".", "!", "{")

The "4 characters per token" is a rough average that helps us estimate costs.

### Real vs Estimated
```
Our estimate: 258 tokens
Claude API response: "input_tokens": 247
Difference: ~4% error
```

**That's good enough for budgeting!**

---

## Section 3: Calculating Cost

### Code
```javascript
calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000) * 0.003;
  const outputCost = (outputTokens / 1000) * 0.015;
  return inputCost + outputCost;
}
```

### What It Does
Given token counts, returns dollar cost.

### Example
```
Input: 258 tokens
Output: 100 tokens

inputCost = (258 / 1000) × 0.003 = 0.000774
outputCost = (100 / 1000) × 0.015 = 0.0015
totalCost = 0.000774 + 0.0015 = 0.002274
```

### Why This Matters
- **Budget awareness:** Know cost before incurring it
- **Identify waste:** "Why is this agent so expensive?"
- **Optimization target:** "Can we reduce output tokens?"

---

## Section 4: The API Call with Retries

### Problem
Claude API sometimes fails:
- Temporary network issues
- Rate limiting (too many requests)
- Server hiccups
- Your internet connection drops

### Solution: Retry Logic

```javascript
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    // Try API call
    const response = await this.client.messages.create({...});
    return response;
  } catch (error) {
    if (error.status === 429) { // Rate limited
      // Wait and retry
      await sleep(2 ^ (attempt - 1) * 1000);
    }
  }
}
```

### Exponential Backoff

```
Attempt 1 fails → Wait 1 second (2^0 = 1)
Attempt 2 fails → Wait 2 seconds (2^1 = 2)
Attempt 3 fails → Wait 4 seconds (2^2 = 4)
All fail → Throw error
```

**Why exponential?**
- Don't hammer the API immediately
- Give it time to recover
- More time = higher chance of success

**Example:**
```
Try call... ERROR 429 (rate limited)
  Wait 1s
Try call... ERROR 429
  Wait 2s
Try call... ERROR 429
  Wait 4s
Try call... SUCCESS!

Total retry time: 7 seconds
Without retry: First error, game over
```

### Error Handling

```javascript
if (error.status === 429) {
  // Rate limit: API is busy, retry
} else if (error.status >= 500) {
  // Server error: API crashed, retry
} else {
  // Client error (4xx): Bad request, don't retry
  throw error;
}
```

**Why different handling?**
- 429, 5xx = not your fault, retry might work
- 4xx = bad request (you did something wrong), don't retry

---

## Section 5: The API Call Details

### Code
```javascript
const response = await this.client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 2048,
  temperature: temperature,
  system: systemPrompt,
  messages: [{
    role: "user",
    content: userPrompt,
  }],
});
```

### What Each Parameter Does

**`model`**
- Which Claude model to use
- Newer = smarter, more expensive
- Sonnet = balance of speed & intelligence

**`max_tokens`**
- Maximum output tokens Claude can generate
- Set to 2048 (usually enough)
- Lower = cheaper but might cut off response
- Higher = more expensive but complete response

**`temperature`**
- Controls randomness
- 0.0 = deterministic (same input → same output)
- 0.5 = balanced
- 1.0 = creative (different outputs each time)

**`system`**
- Role definition ("You are a security auditor")
- Stays constant
- Shapes how Claude responds

**`messages`**
- Conversation history (we only send one message)
- Could be chat-like: [{role: "user", content: "..."}, {role: "assistant", content: "..."}, ...]

### What We Get Back

```javascript
{
  id: "msg_...",
  type: "message",
  role: "assistant",
  content: [{
    type: "text",
    text: "Found 5 security issues..."
  }],
  model: "claude-3-5-sonnet-20241022",
  usage: {
    input_tokens: 247,
    output_tokens: 87
  }
}
```

**`usage`** is the key:
- Tells us how many tokens were actually used
- Let's us calculate actual cost

---

## Section 6: Tracking Costs

### Code
```javascript
this.stats.total_input_tokens += inputTokens;
this.stats.total_output_tokens += outputTokens;
this.stats.total_api_calls += 1;
this.stats.total_cost_dollars += actualCost;

console.log(`Cumulative cost: $${this.stats.total_cost_dollars.toFixed(4)}`);
```

### Why Track?
- Know how much you're spending
- Identify expensive operations
- Alert if costs spike

### Example Output
```
API Call 1: $0.0015 (cumulative: $0.0015)
API Call 2: $0.0022 (cumulative: $0.0037)
API Call 3: $0.0018 (cumulative: $0.0055)
API Call 4: $0.0025 (cumulative: $0.0080)
```

---

## Section 7: Parsing JSON Response

### Problem
Claude often returns JSON wrapped in markdown:

```
Claude's response:
"```json
{
  "vulnerabilities": [...]
}
```"
```

Your code expects:
```javascript
const data = JSON.parse(response);
```

This fails because response contains ````markdown!

### Solution
```javascript
const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[1]);
}
```

**What this does:**
1. Look for ````json...` pattern
2. Extract content between the backticks
3. Parse extracted content as JSON

---

## Section 8: The High-Level API

### Code
```javascript
async audit(systemPrompt, userPrompt, parseAsJSON = true, options = {}) {
  const result = await this.callAPI(systemPrompt, userPrompt, options);
  if (parseAsJSON) {
    result.parsed = this.parseJSON(result.text);
  }
  return result;
}
```

### What Agents Actually Call
Agents don't call `callAPI` directly. They call `audit`:

```javascript
const result = await claudeClient.audit(
  "You are a security auditor",
  "Audit: [terraform]",
  true,  // Parse as JSON
  { temperature: 0.2 }
);

// result now has:
// - result.text (raw response)
// - result.parsed (JSON object)
// - result.tokens (token breakdown)
// - result.cost (dollar cost)
```

---

## Section 9: Statistics

### Code
```javascript
getStats() {
  return {
    ...this.stats,
    average_cost_per_call: (
      this.stats.total_cost_dollars / this.stats.total_api_calls
    ).toFixed(4),
  };
}
```

### Example Output
```javascript
{
  total_input_tokens: 2847,
  total_output_tokens: 342,
  total_api_calls: 12,
  total_cost_dollars: 0.047,
  average_cost_per_call: 0.0039
}
```

**Use this to:**
- Show progress to users
- Debug expensive operations
- Report spending to stakeholders

---

## How to Use This Client

### In a Security Agent
```javascript
import ClaudeClient from '../shared/claude-client.js';

const claude = new ClaudeClient(process.env.CLAUDE_API_KEY);

const result = await claude.audit(
  `You are a security auditor specializing in AWS.
   Identify CWE/CVE patterns in Terraform configurations.
   Return findings as JSON array.`,
  
  `Audit this Terraform:
   ${terraformCode}`,
  
  true,  // Parse as JSON
  { temperature: 0.2, maxRetries: 3 }
);

console.log('Findings:', result.parsed);
console.log('Cost:', result.cost);
```

---

## Interview Questions You Can Answer Now

**Q: "How do you manage costs with Claude API?"**

> "I implement token counting before sending requests. I estimate costs based on input/output token prices ($0.003 and $0.015 per 1K respectively). I track cumulative spending and identify expensive operations. I also parse Terraform before sending to Claude, reducing input tokens by 98%. This approach gives me budget awareness and keeps costs under $0.01 per audit."

**Q: "What happens if the Claude API fails?"**

> "I implement exponential backoff retry logic. On 429 (rate limited) or 5xx errors, I wait 1 second, then 2 seconds, then 4 seconds before retrying. On 4xx client errors, I fail immediately since retrying won't help. I log all failures and alert the team if error rate exceeds threshold."

**Q: "How do you handle Claude returning malformed JSON?"**

> "Claude often wraps JSON in markdown code blocks. I extract the JSON using a regex pattern, parse it, and throw a clear error if it fails. This makes debugging easier — I can see exactly what Claude returned."

---

## Next: Build the Security Agent

Now that you understand the Claude client, let's build the **Security Agent** that actually uses it.

The agent will:
1. Craft security audit prompts
2. Call claude.audit()
3. Parse findings
4. Validate results
5. Return structured data

Ready? Let's build it.
