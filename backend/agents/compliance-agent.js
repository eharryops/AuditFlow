/**
 * Compliance Agent
 *
 * Specializes in verifying compliance with security standards.
 * Checks: encryption, logging, backup policies, audit trails.
 */

import TerraformParser from "../shared/parsers/terraform-parser.js";

class ComplianceAgent {
  constructor(claudeClient) {
    this.claude = claudeClient;
  }

  getSystemPrompt() {
    return `You are a compliance auditor specializing in AWS infrastructure governance.
Your expertise: HIPAA, SOC 2, PCI-DSS, CIS benchmarks, encryption, logging, audit trails.

YOUR GOAL:
Verify compliance with security and governance standards in Terraform configurations.
Identify gaps against common compliance frameworks.

CRITICAL CONSTRAINTS:
1. Only flag REAL compliance gaps (not over-cautious)
2. Reference actual compliance standards (HIPAA, SOC 2, etc.)
3. If uncertain, do NOT include
4. Be specific about what standard requires it
5. Never hallucinate compliance requirements

OUTPUT FORMAT:
Return a JSON array of findings. Each finding MUST have:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "type": "Category name" (e.g., "MISSING_ENCRYPTION", "NO_AUDIT_LOGGING"),
  "standard": "Compliance standard (e.g., SOC 2, HIPAA, PCI-DSS)",
  "resource": "Resource name from Terraform",
  "issue": "What's not compliant and why",
  "requirement": "What the standard requires",
  "current_state": "Current configuration",
  "remediation": "Specific fix to achieve compliance",
  "impact": "Risk of non-compliance"
}

SEVERITY LEVELS:
- CRITICAL: Fails major compliance requirement, audit failure
- HIGH: Significant compliance gap, likely audit finding
- MEDIUM: Minor compliance gap, should be fixed
- LOW: Best practice, not strictly required

COMMON COMPLIANCE REQUIREMENTS:
ENCRYPTION:
- Data at rest (KMS)
- Data in transit (TLS/HTTPS)
- EBS volume encryption
- RDS encryption
- S3 server-side encryption

LOGGING & MONITORING:
- CloudTrail enabled for all APIs
- CloudWatch Logs for applications
- S3 access logs
- RDS audit logs
- VPC Flow Logs

BACKUP & DISASTER RECOVERY:
- Automated backups enabled
- Multi-region replication
- Backup retention policies
- Disaster recovery plan

ACCESS CONTROL:
- IAM policies follow least privilege
- MFA enforcement
- Root account protection
- Service control policies`;
  }

  getUserPrompt(terraformCode) {
    const complianceSection = TerraformParser.extractSectionForAgent(
      terraformCode,
      "compliance"
    );

    return `Audit this Terraform AWS configuration for compliance gaps:

\`\`\`hcl
${complianceSection}
\`\`\`

Check against these standards:
1. SOC 2 Type II (logging, encryption, access control)
2. HIPAA (data protection, audit trails)
3. PCI-DSS (encryption, network security)
4. CIS AWS Foundations Benchmark

Focus on:
1. Encryption at rest and in transit
2. Logging and monitoring
3. Backup and disaster recovery
4. Access control and audit trails
5. Data retention policies

Return ONLY a JSON array of findings. No other text.`;
  }

  validateFinding(finding) {
    const required = [
      "severity",
      "type",
      "standard",
      "resource",
      "issue",
      "requirement",
      "remediation",
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
    console.log("[ComplianceAgent] Starting compliance audit...");

    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt(terraformCode);

      console.log(
        `[ComplianceAgent] System prompt size: ${systemPrompt.length} chars`
      );
      console.log(
        `[ComplianceAgent] User prompt size: ${userPrompt.length} chars`
      );

      console.log("[ComplianceAgent] Calling Claude API...");
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
          "[ComplianceAgent] Failed to parse Claude response as JSON"
        );
        return {
          success: false,
          findings: [],
          error: result.parse_error,
        };
      }

      console.log(
        `[ComplianceAgent] Validating ${result.parsed.length} findings...`
      );
      let validFindings = [];
      for (const finding of result.parsed) {
        if (this.validateFinding(finding)) {
          validFindings.push(finding);
        } else {
          console.warn(
            `[ComplianceAgent] Skipped invalid finding: ${JSON.stringify(finding)}`
          );
        }
      }

      validFindings = this.scoreFindings(validFindings);

      console.log(
        `[ComplianceAgent] ✅ Audit complete: ${validFindings.length} valid findings`
      );

      // Count by standard
      const standards = {};
      for (const finding of validFindings) {
        standards[finding.standard] =
          (standards[finding.standard] || 0) + 1;
      }

      const summary = {
        critical: validFindings.filter((f) => f.severity === "CRITICAL").length,
        high: validFindings.filter((f) => f.severity === "HIGH").length,
        medium: validFindings.filter((f) => f.severity === "MEDIUM").length,
        low: validFindings.filter((f) => f.severity === "LOW").length,
        standards_affected: standards,
      };

      return {
        success: true,
        findings: validFindings,
        summary,
        cost: result.cost,
        tokens: result.tokens,
        agent: "compliance",
      };
    } catch (error) {
      console.error("[ComplianceAgent] Error:", error.message);
      return {
        success: false,
        findings: [],
        error: error.message,
        agent: "compliance",
      };
    }
  }
}

export default ComplianceAgent;
