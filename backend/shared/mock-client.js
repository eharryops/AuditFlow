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
    "resource": "aws_iam_role.lambda_exec",
    "issue": "IAM role grants Effect: Allow on Action: * (all actions)",
    "vulnerable_code": "action = \\"*\\"",
    "fix": "Replace with specific actions",
    "impact": "Attacker can perform any AWS API call"
  },
  {
    "severity": "HIGH",
    "type": "PUBLIC_S3_BUCKET",
    "cwe": "CWE-732",
    "resource": "aws_s3_bucket.uploads",
    "issue": "S3 bucket is publicly readable",
    "vulnerable_code": "acl = \\"public-read-write\\"",
    "fix": "Set to private: acl = \\"private\\"",
    "impact": "Data breach risk"
  }
]`;
    } else if (systemPrompt.includes("cost optimization")) {
      mockResponse = `[
  {
    "severity": "CRITICAL",
    "type": "OVERSIZED_INSTANCE",
    "resource": "aws_instance.web",
    "issue": "t3.large instance for low-traffic website",
    "current_cost": "$50.00",
    "optimized_cost": "$15.00",
    "savings": "$35.00",
    "recommendation": "Downsize to t3.micro for development",
    "impact": "Significant monthly savings"
  },
  {
    "severity": "HIGH",
    "type": "UNUSED_RESOURCE",
    "resource": "aws_ebs_volume.backup",
    "issue": "Unattached EBS volume consuming storage",
    "current_cost": "$10.00",
    "optimized_cost": "$0.00",
    "savings": "$10.00",
    "recommendation": "Delete unused volume",
    "impact": "Remove unnecessary storage costs"
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
    "remediation": "Enable encryption_enabled = true",
    "impact": "Audit failure, compliance violation"
  },
  {
    "severity": "HIGH",
    "type": "NO_AUDIT_LOGGING",
    "standard": "HIPAA",
    "resource": "aws_s3_bucket.health_data",
    "issue": "S3 bucket lacks access logging",
    "requirement": "HIPAA requires audit trails for PHI access",
    "current_state": "logging not configured",
    "remediation": "Enable S3 access logging",
    "impact": "Cannot audit data access"
  }
]`;
    } else if (systemPrompt.includes("performance optimization")) {
      mockResponse = `[
  {
    "severity": "CRITICAL",
    "type": "NO_CACHING",
    "resource": "aws_lambda_function.api",
    "issue": "API Lambda has no caching layer",
    "current_metric": "p99 latency 2000ms",
    "optimized_metric": "p99 latency 200ms",
    "improvement": "90% latency reduction",
    "recommendation": "Add ElastiCache Redis for hot queries",
    "impact": "Dramatically improved user experience"
  },
  {
    "severity": "HIGH",
    "type": "COLD_START_RISK",
    "resource": "aws_lambda_function.processor",
    "issue": "Lambda cold starts causing delays",
    "current_metric": "Cold start time: 5s",
    "optimized_metric": "Cold start time: 0.1s",
    "improvement": "50x faster cold starts",
    "recommendation": "Use Lambda Provisioned Concurrency",
    "impact": "Eliminated cold start delays"
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
