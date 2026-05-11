/**
 * Terraform Parser
 *
 * Extracts security-relevant sections from Terraform for token optimization.
 * Instead of sending all Terraform, we extract only what matters for each agent.
 *
 * LEARNING OBJECTIVE:
 * Understand prompt optimization: sending less code = fewer tokens = lower cost.
 */

class TerraformParser {
  /**
   * Extract security-relevant sections
   *
   * Security agent cares about:
   * - IAM policies (action, resource)
   * - Security groups (ingress, egress)
   * - Encryption settings (kms_key_id, enabled)
   * - Public access (publicly_accessible, cidr_blocks)
   * - Authentication (password, tls_required)
   */
  static extractSectionForAgent(terraformCode, agentType) {
    if (agentType === "security") {
      return this._extractSecuritySection(terraformCode);
    } else if (agentType === "cost") {
      return this._extractCostSection(terraformCode);
    } else if (agentType === "compliance") {
      return this._extractComplianceSection(terraformCode);
    } else if (agentType === "performance") {
      return this._extractPerformanceSection(terraformCode);
    }
    return terraformCode; // Default: return all
  }

  /**
   * Security-relevant lines:
   * - IAM (policy, role, assume_role)
   * - Network (security_group, nacl, route_table)
   * - Encryption (kms, encryption, tls)
   * - Access (public, cidr_blocks, publicly_accessible)
   * - Secrets (password, key, token, secret)
   */
  static _extractSecuritySection(code) {
    const securityKeywords = [
      "iam_",
      "security_group",
      "network_acl",
      "route_table",
      "encryption",
      "kms",
      "tls",
      "ssl",
      "public",
      "cidr",
      "password",
      "secret",
      "key",
      "token",
      "auth",
    ];

    const lines = code.split("\n");
    let result = [];
    let inRelevantBlock = false;
    let blockDepth = 0;

    for (const line of lines) {
      // Check if line contains security keywords
      const isRelevant = securityKeywords.some((keyword) =>
        line.toLowerCase().includes(keyword)
      );

      if (isRelevant) {
        inRelevantBlock = true;
        result.push(line);
      } else if (inRelevantBlock && line.includes("}")) {
        result.push(line);
        blockDepth--;
        if (blockDepth === 0) {
          inRelevantBlock = false;
        }
      } else if (inRelevantBlock) {
        result.push(line);
        if (line.includes("{")) blockDepth++;
      }

      // Also include resource definitions (context)
      if (line.includes("resource") || line.includes("variable")) {
        result.push(line);
      }
    }

    return result.length > 0 ? result.join("\n") : code; // Fallback to full code if nothing extracted
  }

  /**
   * Cost-relevant lines:
   * - Instance types (instance_type, machine_type)
   * - Storage (allocated_storage, size)
   * - Replication (multi_az, regional)
   * - Unused resources
   */
  static _extractCostSection(code) {
    const costKeywords = [
      "instance_type",
      "allocated_storage",
      "size",
      "count",
      "for_each",
      "multi_az",
      "regional",
      "tier",
      "class",
      "replicas",
    ];

    const lines = code.split("\n");
    return lines
      .filter((line) =>
        costKeywords.some((keyword) => line.toLowerCase().includes(keyword))
      )
      .join("\n");
  }

  /**
   * Compliance-relevant lines:
   * - Logging (enabled, log_group)
   * - Retention (retention_days)
   * - Backup (backup_retention, backup_window)
   * - Monitoring (cloudwatch)
   */
  static _extractComplianceSection(code) {
    const complianceKeywords = [
      "logging",
      "log_group",
      "retention",
      "backup",
      "monitor",
      "cloudwatch",
      "enabled",
      "versioning",
      "mfa",
    ];

    const lines = code.split("\n");
    return lines
      .filter((line) =>
        complianceKeywords.some((keyword) =>
          line.toLowerCase().includes(keyword)
        )
      )
      .join("\n");
  }

  /**
   * Performance-relevant lines:
   * - Scaling (scaling_group, auto_scaling)
   * - Compute (cpu, memory)
   * - Cache (cache, redis, memcached)
   * - Database (connection_pool, read_replicas)
   */
  static _extractPerformanceSection(code) {
    const performanceKeywords = [
      "auto_scaling",
      "scaling",
      "instance_class",
      "cpu",
      "memory",
      "cache",
      "redis",
      "memcached",
      "connection_pool",
      "read_replica",
    ];

    const lines = code.split("\n");
    return lines
      .filter((line) =>
        performanceKeywords.some((keyword) =>
          line.toLowerCase().includes(keyword)
        )
      )
      .join("\n");
  }

  /**
   * Count resources by type
   * Useful for understanding infrastructure scale
   */
  static countResourceTypes(code) {
    const resourcePattern = /resource\s+"([^"]+)"\s+"([^"]+)"/g;
    const counts = {};

    let match;
    while ((match = resourcePattern.exec(code)) !== null) {
      const resourceType = match[1];
      counts[resourceType] = (counts[resourceType] || 0) + 1;
    }

    return counts;
  }

  /**
   * Extract resource names
   * Useful for traceability in findings
   */
  static extractResourceNames(code) {
    const resourcePattern = /resource\s+"[^"]+"\s+"([^"]+)"/g;
    const names = [];

    let match;
    while ((match = resourcePattern.exec(code)) !== null) {
      names.push(match[1]);
    }

    return names;
  }
}

export default TerraformParser;
