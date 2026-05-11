/**
 * Security Agent
 *
 * This agent specializes in finding security vulnerabilities in Terraform.
 *
 * LEARNING OBJECTIVE:
 * Understand prompt engineering: how to craft instructions that make Claude
 * return high-quality security findings in a consistent, parseable format.
 *
 * FLOW:
 * 1. Parse Terraform for security-relevant sections
 * 2. Craft system + user prompts
 * 3. Call Claude with specific instructions
 * 4. Parse response JSON
 * 5. Validate findings (no hallucinations)
 * 6. Return structured data
 */

import terraformParser from "../shared/parsers/terraform-parser.js";

class SecurityAgent {
  constructor(claudeClient) {
    this.claude = claudeClient;
  }

  /**
   * CONCEPT: System Prompt
   *
   * This defines the agent's ROLE and GOAL.
   * It's like telling someone: "You are a security expert. Your job is to find vulnerabilities."
   *
   * Why separate from user prompt?
   * - System: Define identity (stays constant)
   * - User: Specific task (changes each time)
   *
   * This system prompt is carefully crafted to:
   * - Give Claude a specific role (security auditor)
   * - Define the output format (JSON)
   * - Provide constraints (only valid CWE codes)
   * - Give examples (few-shot learning)
   */
  getSystemPrompt() {
    return `You are a security auditor specializing in AWS infrastructure vulnerabilities.
Your expertise: Common Weakness Enumeration (CWE), CVE patterns, and OWASP Top 10.

YOUR GOAL:
Identify security vulnerabilities in Terraform AWS configurations.
Return findings in a structured, actionable format.

CRITICAL CONSTRAINTS:
1. Only include REAL vulnerabilities (no false positives)
2. Only use VALID CWE codes (CWE-79, CWE-89, CWE-306, etc.)
3. If uncertain, do NOT include the finding
4. Never hallucinate or speculate
5. Be specific and technical

OUTPUT FORMAT:
Return a JSON array of findings. Each finding MUST have:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "type": "Category name" (e.g., "SQL_INJECTION", "OVERLY_PERMISSIVE_IAM"),
  "cwe": "CWE-XXX" (e.g., "CWE-89"),
  "resource": "Resource name from Terraform" (e.g., "aws_iam_role.lambda_exec"),
  "issue": "Clear description of the vulnerability (1-2 sentences)",
  "vulnerable_code": "Exact Terraform code snippet showing the issue",
  "fix": "Specific remediation code or configuration change",
  "impact": "What an attacker could do with this vulnerability"
}

SEVERITY LEVELS:
- CRITICAL: Immediate risk, can lead to complete system compromise
- HIGH: Significant risk, could enable data theft or privilege escalation
- MEDIUM: Moderate risk, needs fixing before production
- LOW: Minor risk, good to fix but not blocking

EXAMPLE FINDINGS:
[
  {
    "severity": "CRITICAL",
    "type": "OVERLY_PERMISSIVE_IAM",
    "cwe": "CWE-639",
    "resource": "aws_iam_role.lambda_role",
    "issue": "IAM role grants Effect: Allow on Action: * (all actions)",
    "vulnerable_code": "action = \"*\"",
    "fix": "Replace with specific actions: arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "impact": "Lambda function can perform any AWS API call: create users, delete databases, exfiltrate data"
  }
]

COMMON PATTERNS TO LOOK FOR:
- IAM policies with wildcard actions (Action: "*")
- IAM policies without resource restrictions (Resource: "*")
- Unencrypted storage (S3 without encryption, RDS without encryption)
- Public access enabled (publicly_accessible = true, cidr_blocks = ["0.0.0.0/0"])
- Missing authentication/authorization checks
- Hardcoded secrets or API keys
- Disabled SSL/TLS verification
- Missing VPC endpoints
- Unrestricted security groups`;
  }

  /**
   * CONCEPT: User Prompt
   *
   * This is the SPECIFIC TASK.
   * "Audit this Terraform configuration: [code]"
   *
   * We ONLY send relevant sections (token optimization):
   * - IAM policies
   * - Security groups
   * - Encryption settings
   * - Public access settings
   *
   * NOT sent (waste of tokens):
   * - Comments
   * - Variable definitions
   * - Metadata tags
   * - Unrelated configurations
   */
  getUserPrompt(terraformCode) {
    // Extract only security-relevant sections
    const securitySection =
      terraformParser.extractSectionForAgent(terraformCode, "security");

    return `Audit this Terraform AWS configuration for security vulnerabilities:

\`\`\`hcl
${securitySection}
\`\`\`

Focus on these areas:
1. IAM policies (overly permissive? wildcard actions?)
2. Encryption (at rest? in transit? KMS keys?)
3. Network access (public? restricted?)
4. Authentication/Authorization (required? enforced?)
5. Service-specific risks (Lambda, S3, RDS, etc.)

Return ONLY a JSON array of findings. No other text.`;
  }

  /**
   * STEP 1: Validate findings
   *
   * Claude might return malformed data:
   * - Missing required fields
   * - Invalid CWE codes
   * - Non-existent resources
   *
   * We validate BEFORE returning to prevent downstream errors.
   */
  validateFinding(finding) {
    // Check required fields
    const required = [
      "severity",
      "type",
      "cwe",
      "resource",
      "issue",
      "vulnerable_code",
      "fix",
    ];
    for (const field of required) {
      if (!finding[field]) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate severity
    if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(finding.severity)) {
      console.warn(`Invalid severity: ${finding.severity}`);
      return false;
    }

    // Validate CWE format
    if (!/^CWE-\d+$/.test(finding.cwe)) {
      console.warn(`Invalid CWE format: ${finding.cwe}`);
      return false;
    }

    return true;
  }

  /**
   * STEP 2: Score findings by severity
   *
   * Organize findings by severity for the report.
   * Makes it easier for users to prioritize fixes.
   */
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

  /**
   * STEP 3: Audit Terraform
   *
   * Main entry point.
   * Called by orchestrator.
   * Returns structured security findings.
   */
  async audit(terraformCode) {
    console.log("[SecurityAgent] Starting security audit...");

    try {
      // Craft prompts
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt(terraformCode);

      console.log(
        `[SecurityAgent] System prompt size: ${systemPrompt.length} chars`
      );
      console.log(`[SecurityAgent] User prompt size: ${userPrompt.length} chars`);

      // Call Claude
      console.log("[SecurityAgent] Calling Claude API...");
      const result = await this.claude.audit(
        systemPrompt,
        userPrompt,
        true, // Parse as JSON
        {
          temperature: 0.2, // Deterministic for security (no hallucinations)
          maxRetries: 3,
        }
      );

      if (!result.parsed) {
        console.error(
          "[SecurityAgent] Failed to parse Claude response as JSON"
        );
        return {
          success: false,
          findings: [],
          error: result.parse_error,
        };
      }

      // Validate each finding
      console.log(
        `[SecurityAgent] Validating ${result.parsed.length} findings...`
      );
      let validFindings = [];
      for (const finding of result.parsed) {
        if (this.validateFinding(finding)) {
          validFindings.push(finding);
        } else {
          console.warn(
            `[SecurityAgent] Skipped invalid finding: ${JSON.stringify(finding)}`
          );
        }
      }

      // Score/sort findings by severity
      validFindings = this.scoreFindings(validFindings);

      console.log(
        `[SecurityAgent] ✅ Audit complete: ${validFindings.length} valid findings`
      );

      // Return summary
      const summary = {
        critical: validFindings.filter((f) => f.severity === "CRITICAL").length,
        high: validFindings.filter((f) => f.severity === "HIGH").length,
        medium: validFindings.filter((f) => f.severity === "MEDIUM").length,
        low: validFindings.filter((f) => f.severity === "LOW").length,
      };

      return {
        success: true,
        findings: validFindings,
        summary,
        cost: result.cost,
        tokens: result.tokens,
        agent: "security",
      };
    } catch (error) {
      console.error("[SecurityAgent] Error:", error.message);
      return {
        success: false,
        findings: [],
        error: error.message,
        agent: "security",
      };
    }
  }

  /**
   * OPTIONAL: Explain a specific finding
   *
   * Useful for generating detailed remediation guide.
   */
  async explainFinding(finding) {
    console.log(`[SecurityAgent] Generating detailed explanation for ${finding.cwe}...`);

    const result = await this.claude.audit(
      `You are a security expert explaining a vulnerability to a developer.
       Be technical but clear. Explain the risk and remediation.`,
      `Explain this vulnerability in detail:
       CWE: ${finding.cwe}
       Type: ${finding.type}
       Issue: ${finding.issue}

       Provide:
       1. What an attacker could do
       2. Step-by-step exploitation
       3. Detailed remediation
       4. How to test the fix
       5. Additional hardening recommendations`,
      false // Don't parse as JSON (we want prose)
    );

    return {
      finding: finding.cwe,
      explanation: result.text,
      cost: result.cost,
    };
  }
}

export default SecurityAgent;
