/**
 * Audit Orchestrator
 *
 * Coordinates all 4 agents (Security, Cost, Compliance, Performance) to run in parallel.
 *
 * LEARNING OBJECTIVE:
 * Understand how to parallelize work with Promise.all().
 * When one agent takes 5s, 4 agents in parallel still take ~5s.
 * Sequential would take 20s. That's the power of parallelization.
 */

import SecurityAgent from "../agents/security-agent.js";
import CostAgent from "../agents/cost-agent.js";
import ComplianceAgent from "../agents/compliance-agent.js";
import PerformanceAgent from "../agents/performance-agent.js";

class AuditOrchestrator {
  constructor(claudeClient) {
    this.claude = claudeClient;

    // Initialize all agents with same Claude client
    this.securityAgent = new SecurityAgent(claudeClient);
    this.costAgent = new CostAgent(claudeClient);
    this.complianceAgent = new ComplianceAgent(claudeClient);
    this.performanceAgent = new PerformanceAgent(claudeClient);

    this.stats = {
      start_time: null,
      end_time: null,
      total_findings: 0,
      total_cost: 0,
      total_tokens: 0,
    };
  }

  /**
   * Run all 4 audits in parallel
   *
   * Why parallel?
   * - Sequential: 4 agents × 5s each = 20s total
   * - Parallel: Promise.all() = ~5s total
   * - 4x faster!
   */
  async audit(terraformCode) {
    console.log("\n========================================");
    console.log("🔍 AuditFlow - Multi-Agent Orchestration");
    console.log("========================================\n");

    this.stats.start_time = Date.now();

    console.log("LAUNCHING 4 AGENTS IN PARALLEL:\n");
    console.log("[1/4] 🔒 Security Agent     (checking vulnerabilities)");
    console.log("[2/4] 💰 Cost Agent        (finding savings opportunities)");
    console.log("[3/4] ✅ Compliance Agent   (verifying standards)");
    console.log("[4/4] ⚡ Performance Agent  (identifying bottlenecks)\n");

    try {
      // Run all 4 audits in parallel
      // Promise.all waits for ALL promises to complete
      const [securityResult, costResult, complianceResult, performanceResult] =
        await Promise.all([
          this.securityAgent.audit(terraformCode),
          this.costAgent.audit(terraformCode),
          this.complianceAgent.audit(terraformCode),
          this.performanceAgent.audit(terraformCode),
        ]);

      this.stats.end_time = Date.now();

      // Aggregate results
      const results = {
        success: true,
        audit_id: this.generateAuditId(),
        timestamp: new Date().toISOString(),
        duration_seconds: (
          (this.stats.end_time - this.stats.start_time) /
          1000
        ).toFixed(1),

        // Individual agent results
        security: securityResult,
        cost: costResult,
        compliance: complianceResult,
        performance: performanceResult,

        // Aggregate summary
        summary: {
          total_findings:
            securityResult.findings.length +
            costResult.findings.length +
            complianceResult.findings.length +
            performanceResult.findings.length,
          by_agent: {
            security: securityResult.findings.length,
            cost: costResult.findings.length,
            compliance: complianceResult.findings.length,
            performance: performanceResult.findings.length,
          },
          by_severity: {
            critical:
              (securityResult.summary?.critical || 0) +
              (costResult.summary?.critical || 0) +
              (complianceResult.summary?.critical || 0) +
              (performanceResult.summary?.critical || 0),
            high:
              (securityResult.summary?.high || 0) +
              (costResult.summary?.high || 0) +
              (complianceResult.summary?.high || 0) +
              (performanceResult.summary?.high || 0),
            medium:
              (securityResult.summary?.medium || 0) +
              (costResult.summary?.medium || 0) +
              (complianceResult.summary?.medium || 0) +
              (performanceResult.summary?.medium || 0),
            low:
              (securityResult.summary?.low || 0) +
              (costResult.summary?.low || 0) +
              (complianceResult.summary?.low || 0) +
              (performanceResult.summary?.low || 0),
          },
        },

        // Cost tracking
        cost_breakdown: {
          security: securityResult.cost || 0,
          cost: costResult.cost || 0,
          compliance: complianceResult.cost || 0,
          performance: performanceResult.cost || 0,
          total:
            (securityResult.cost || 0) +
            (costResult.cost || 0) +
            (complianceResult.cost || 0) +
            (performanceResult.cost || 0),
        },

        // Token tracking
        token_breakdown: {
          security: securityResult.tokens || { total: 0 },
          cost: costResult.tokens || { total: 0 },
          compliance: complianceResult.tokens || { total: 0 },
          performance: performanceResult.tokens || { total: 0 },
          total_tokens:
            (securityResult.tokens?.total || 0) +
            (costResult.tokens?.total || 0) +
            (complianceResult.tokens?.total || 0) +
            (performanceResult.tokens?.total || 0),
        },
      };

      return results;
    } catch (error) {
      console.error("Orchestrator error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate unique audit ID
   */
  generateAuditId() {
    return "audit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get elapsed time
   */
  getElapsedTime() {
    if (!this.stats.start_time || !this.stats.end_time) {
      return 0;
    }
    return (this.stats.end_time - this.stats.start_time) / 1000;
  }
}

export default AuditOrchestrator;
