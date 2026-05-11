/**
 * Performance Agent
 *
 * Specializes in identifying performance bottlenecks and optimization opportunities.
 * Checks: scaling, caching, database optimization, connection pools.
 */

import TerraformParser from "../shared/parsers/terraform-parser.js";

class PerformanceAgent {
  constructor(claudeClient) {
    this.claude = claudeClient;
  }

  getSystemPrompt() {
    return `You are a performance optimization expert specializing in AWS infrastructure.
Your expertise: scaling patterns, caching strategies, database optimization, latency reduction.

YOUR GOAL:
Identify performance bottlenecks and optimization opportunities in Terraform configurations.
Estimate performance improvements with concrete metrics (latency reduction %, throughput increase).

CRITICAL CONSTRAINTS:
1. Only include REAL performance issues (not speculative)
2. Provide performance metrics (be specific: latency, throughput)
3. If uncertain about impact, do NOT include
4. Never hallucinate performance gains
5. Be practical and measurable

OUTPUT FORMAT:
Return a JSON array of findings. Each finding MUST have:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "type": "Category name" (e.g., "NO_CACHING", "COLD_START_RISK"),
  "resource": "Resource name from Terraform",
  "issue": "Performance bottleneck identified",
  "current_metric": "Current performance (e.g., 'p99 latency 2s', 'throughput 100 req/s')",
  "optimized_metric": "Expected performance after optimization",
  "improvement": "Estimated improvement (e.g., '60% latency reduction')",
  "recommendation": "Specific optimization action",
  "impact": "Business impact of optimization"
}

SEVERITY LEVELS:
- CRITICAL: >50% latency improvement possible, affects user experience
- HIGH: 20-50% improvement, noticeable to users
- MEDIUM: 5-20% improvement, good to fix
- LOW: <5% improvement, nice to have

COMMON PATTERNS TO LOOK FOR:
SCALING & AUTO-SCALING:
- No auto-scaling configured
- Scaling groups too small (min/max/desired)
- Scaling policies missing (target tracking, step scaling)
- Cold start risks

CACHING:
- No ElastiCache/Redis for hot data
- Missing CloudFront for static assets
- No DAX for DynamoDB
- Missing query result caching

DATABASE:
- No read replicas for read-heavy workloads
- Connection pool too small
- No query optimization indicated
- Inefficient indexing

CONNECTION POOLING:
- No RDS Proxy for Lambda
- Too many direct DB connections
- No connection reuse

MONITORING:
- No performance metrics
- Missing CloudWatch alarms
- No APM (Application Performance Monitoring)`;
  }

  getUserPrompt(terraformCode) {
    const performanceSection = TerraformParser.extractSectionForAgent(
      terraformCode,
      "performance"
    );

    return `Analyze this Terraform AWS configuration for performance optimization opportunities:

\`\`\`hcl
${performanceSection}
\`\`\`

Focus on:
1. Scaling configuration (sufficient capacity?)
2. Caching strategy (missing cache layers?)
3. Database optimization (read replicas, connection pools?)
4. Lambda cold start risks
5. Content delivery (CloudFront usage?)
6. Connection pooling (RDS Proxy?)

Estimate concrete performance improvements for each finding.
Return ONLY a JSON array of findings. No other text.`;
  }

  validateFinding(finding) {
    const required = [
      "severity",
      "type",
      "resource",
      "issue",
      "current_metric",
      "optimized_metric",
      "improvement",
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
    console.log("[PerformanceAgent] Starting performance audit...");

    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt(terraformCode);

      console.log(
        `[PerformanceAgent] System prompt size: ${systemPrompt.length} chars`
      );
      console.log(
        `[PerformanceAgent] User prompt size: ${userPrompt.length} chars`
      );

      console.log("[PerformanceAgent] Calling Claude API...");
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
        console.error(
          "[PerformanceAgent] Failed to parse Claude response as JSON"
        );
        return {
          success: false,
          findings: [],
          error: result.parse_error,
        };
      }

      console.log(
        `[PerformanceAgent] Validating ${result.parsed.length} findings...`
      );
      let validFindings = [];
      for (const finding of result.parsed) {
        if (this.validateFinding(finding)) {
          validFindings.push(finding);
        } else {
          console.warn(
            `[PerformanceAgent] Skipped invalid finding: ${JSON.stringify(finding)}`
          );
        }
      }

      validFindings = this.scoreFindings(validFindings);

      console.log(
        `[PerformanceAgent] ✅ Audit complete: ${validFindings.length} valid findings`
      );

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
        agent: "performance",
      };
    } catch (error) {
      console.error("[PerformanceAgent] Error:", error.message);
      return {
        success: false,
        findings: [],
        error: error.message,
        agent: "performance",
      };
    }
  }
}

export default PerformanceAgent;
