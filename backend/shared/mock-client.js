/**
 * Mock Claude Client
 *
 * Returns realistic but fake findings for testing without API costs.
 * Same interface as ClaudeClient and OllamaClient.
 *
 * Perfect for:
 * - Testing the validation logic
 * - Testing the scoring/sorting
 * - Testing the report generation
 * - Learning the code flow
 */

class MockClient {
  constructor(options = {}) {
    this.stats = {
      total_input_tokens: 1500,
      total_output_tokens: 800,
      total_api_calls: 1,
      total_cost_dollars: 0,
    };
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  calculateCost(inputTokens, outputTokens) {
    return 0; // Mock is free
  }

  async callAPI(systemPrompt, userPrompt, options = {}) {
    console.log("[Mock] Simulating Claude API call...");

    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Detect which agent is calling based on prompts
    let mockResponse;

    if (systemPrompt.includes("security auditor")) {
      mockResponse = `[
  {
    "severity": "CRITICAL",
    "type": "OVERLY_PERMISSIVE_IAM",
    "cwe": "CWE-639",
    "resource": "aws_iam_role_policy.lambda_policy",
    "issue": "IAM role grants Effect: Allow on Action: * (all actions)",
    "vulnerable_code": "Action = \\"*\\"",
    "fix": "Replace with specific actions",
    "impact": "Attacker can perform any AWS API call"
  },
  {
    "severity": "HIGH",
    "type": "OPEN_SECURITY_GROUP",
    "cwe": "CWE-732",
    "resource": "aws_security_group.web",
    "issue": "Security group is open to the entire internet (0.0.0.0/0)",
    "vulnerable_code": "cidr_blocks = [\\"0.0.0.0/0\\"]",
    "fix": "Restrict ingress to specific IP ranges",
    "impact": "Resource exposed to public network"
  }
]`;
    } else if (systemPrompt.includes("cost optimization")) {
      mockResponse = `[
  {
    "severity": "HIGH",
    "type": "LEGACY_INSTANCE_TYPE",
    "resource": "aws_db_instance.main",
    "issue": "Using older generation db.t2.micro instance",
    "current_cost": "$15.00",
    "optimized_cost": "$12.00",
    "savings": "$3.00",
    "recommendation": "Upgrade to db.t3.micro or db.t4g.micro for better performance at lower cost",
    "impact": "Save money while improving performance"
  },
  {
    "severity": "MEDIUM",
    "type": "MISSING_LIFECYCLE_POLICY",
    "resource": "aws_s3_bucket.data_bucket",
    "issue": "S3 bucket lacks data lifecycle transition rules",
    "current_cost": "Variable",
    "optimized_cost": "Variable",
    "savings": "Up to 50%",
    "recommendation": "Move older data to standard-IA or Glacier",
    "impact": "Reduce long-term storage costs"
  }
]`;
    } else if (systemPrompt.includes("compliance auditor")) {
      mockResponse = `[
  {
    "severity": "CRITICAL",
    "type": "MISSING_ENCRYPTION",
    "standard": "SOC 2",
    "resource": "aws_db_instance.main",
    "issue": "RDS database not encrypted at rest",
    "requirement": "SOC 2 requires encryption of sensitive data at rest",
    "current_state": "storage_encrypted = false",
    "remediation": "Set storage_encrypted = true",
    "impact": "Audit failure, compliance violation"
  },
  {
    "severity": "HIGH",
    "type": "MISSING_BACKUPS",
    "standard": "ISO 27001",
    "resource": "aws_db_instance.main",
    "issue": "Database backups are disabled",
    "requirement": "Business continuity requires automated backups",
    "current_state": "backup_retention_period = 0",
    "remediation": "Set backup_retention_period to 7 or higher",
    "impact": "Data loss risk in disaster scenario"
  }
]`;
    } else if (systemPrompt.includes("performance optimization")) {
      mockResponse = `[
  {
    "severity": "HIGH",
    "type": "EOL_RUNTIME",
    "resource": "aws_lambda_function.processor",
    "issue": "Using nodejs.16 which is End of Life",
    "current_metric": "Runtime: nodejs.16",
    "optimized_metric": "Runtime: nodejs.20.x",
    "improvement": "Faster execution, newer V8 engine",
    "recommendation": "Upgrade to nodejs.20.x",
    "impact": "Security risks and degraded performance"
  },
  {
    "severity": "MEDIUM",
    "type": "COLD_START_RISK",
    "resource": "aws_lambda_function.processor",
    "issue": "No provisioned concurrency for data processor",
    "current_metric": "Cold start time: ~2s",
    "optimized_metric": "Cold start time: 0.1s",
    "improvement": "20x faster initial invocations",
    "recommendation": "Add Provisioned Concurrency if latency is critical",
    "impact": "Consistent low-latency responses"
  }
]`;
    } else {
      mockResponse = `[]`;
    }

    return {
      success: true,
      text: mockResponse,
      tokens: {
        input: 1200,
        output: 600,
        total: 1800,
      },
      cost: 0,
      model: "mock",
      attempt: 1,
    };
  }

  parseJSON(responseText) {
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse mock response as JSON:", error);
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }

  async audit(systemPrompt, userPrompt, parseAsJSON = true, options = {}) {
    const result = await this.callAPI(systemPrompt, userPrompt, options);

    if (parseAsJSON) {
      try {
        result.parsed = this.parseJSON(result.text);
      } catch (error) {
        console.error("Failed to parse response:", error);
        result.parsed = null;
        result.parse_error = error.message;
      }
    }

    return result;
  }

  getStats() {
    return {
      ...this.stats,
      average_cost_per_call: "0.0000",
    };
  }

  resetStats() {
    this.stats = {
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_api_calls: 0,
      total_cost_dollars: 0,
    };
  }
}

export default MockClient;
