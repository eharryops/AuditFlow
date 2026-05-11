/**
 * Cost Agent
 *
 * Specializes in finding cost optimization opportunities in Terraform.
 * Same interface as SecurityAgent, different focus.
 */

import TerraformParser from "../shared/parsers/terraform-parser.js";

class CostAgent {
  constructor(claudeClient) {
    this.claude = claudeClient;
  }

  getSystemPrompt() {
    return `You are a cloud cost optimization expert specializing in AWS infrastructure.
Your expertise: identifying unused resources, oversized instances, cost optimization patterns.

YOUR GOAL:
Identify cost optimization opportunities in Terraform AWS configurations.
Estimate monthly cost savings with concrete numbers.

CRITICAL CONSTRAINTS:
1. Only include REAL cost issues (not speculative)
2. Provide cost estimates (be specific: $X/month)
3. If uncertain about cost, do NOT include
4. Never hallucinate cost savings
5. Be practical and actionable

OUTPUT FORMAT:
Return a JSON array of findings. Each finding MUST have:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "type": "Category name" (e.g., "OVERSIZED_INSTANCE", "UNUSED_RESOURCE"),
  "resource": "Resource name from Terraform",
  "issue": "Clear description of the cost issue",
  "current_cost": "Monthly cost in USD (e.g., '$125.50')",
  "optimized_cost": "Estimated cost after optimization",
  "savings": "Monthly savings in USD",
  "recommendation": "Specific action to take",
  "impact": "Business impact of optimization"
}

SEVERITY LEVELS:
- CRITICAL: >$500/month savings, easy to fix
- HIGH: $100-500/month savings
- MEDIUM: $10-100/month savings
- LOW: <$10/month savings

COMMON PATTERNS TO LOOK FOR:
- Oversized instances (t3.large for low traffic)
- Multi-AZ for non-critical workloads
- Unnecessary read replicas
- Unattached EBS volumes
- Unused RDS backups or snapshots
- NAT Gateway over NAT Instance
- Inefficient scaling groups
- CloudFront when not needed
- Data transfer costs
- Reserved instances opportunity`;
  }

  getUserPrompt(terraformCode) {
    const costSection = TerraformParser.extractSectionForAgent(
      terraformCode,
      "cost"
    );

    return `Analyze this Terraform AWS configuration for cost optimization opportunities:

\`\`\`hcl
${costSection}
\`\`\`

Focus on:
1. Instance sizing (oversized for workload?)
2. Resource count (unused or redundant?)
3. Multi-AZ/replication (necessary?)
4. Storage optimization (size, retention?)
5. Data transfer (egress costs?)
6. Reserved instance opportunities

Calculate realistic monthly savings for each finding.
Return ONLY a JSON array of findings. No other text.`;
  }

  validateFinding(finding) {
    const required = [
      "severity",
      "type",
      "resource",
      "issue",
      "current_cost",
      "optimized_cost",
      "savings",
      "recommendation",
    ];

    for (const field of required) {
      if (!finding[field]) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(finding.severity)) {
      console.warn(`Invalid severity: ${finding.severity}`);
      return false;
    }

    return true;
  }

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

  async audit(terraformCode) {
    console.log("[CostAgent] Starting cost audit...");

    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt(terraformCode);

      console.log(
        `[CostAgent] System prompt size: ${systemPrompt.length} chars`
      );
      console.log(`[CostAgent] User prompt size: ${userPrompt.length} chars`);

      console.log("[CostAgent] Calling Claude API...");
      const result = await this.claude.audit(
        systemPrompt,
        userPrompt,
        true,
        {
          temperature: 0.2,
          maxRetries: 3,
        }
      );

      if (!result.parsed) {
        console.error("[CostAgent] Failed to parse Claude response as JSON");
        return {
          success: false,
          findings: [],
          error: result.parse_error,
        };
      }

      console.log(
        `[CostAgent] Validating ${result.parsed.length} findings...`
      );
      let validFindings = [];
      for (const finding of result.parsed) {
        if (this.validateFinding(finding)) {
          validFindings.push(finding);
        } else {
          console.warn(
            `[CostAgent] Skipped invalid finding: ${JSON.stringify(finding)}`
          );
        }
      }

      validFindings = this.scoreFindings(validFindings);

      console.log(
        `[CostAgent] ✅ Audit complete: ${validFindings.length} valid findings`
      );

      // Calculate total monthly savings
      let totalSavings = 0;
      for (const finding of validFindings) {
        // Extract number from savings string (e.g., "$125.50" -> 125.50)
        const match = finding.savings.match(/\$?([\d.]+)/);
        if (match) {
          totalSavings += parseFloat(match[1]);
        }
      }

      const summary = {
        critical: validFindings.filter((f) => f.severity === "CRITICAL").length,
        high: validFindings.filter((f) => f.severity === "HIGH").length,
        medium: validFindings.filter((f) => f.severity === "MEDIUM").length,
        low: validFindings.filter((f) => f.severity === "LOW").length,
        total_monthly_savings: "$" + totalSavings.toFixed(2),
      };

      return {
        success: true,
        findings: validFindings,
        summary,
        cost: result.cost,
        tokens: result.tokens,
        agent: "cost",
      };
    } catch (error) {
      console.error("[CostAgent] Error:", error.message);
      return {
        success: false,
        findings: [],
        error: error.message,
        agent: "cost",
      };
    }
  }
}

export default CostAgent;
