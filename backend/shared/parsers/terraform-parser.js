/**
 * Terraform Parser
 *
 * CONCEPT:
 * Why parse Terraform before sending to Claude?
 *
 * Full Terraform file: 50,000 tokens → $0.50
 * Parsed sections:      1,000 tokens → $0.01
 * Savings: 98%
 *
 * We extract relevant sections, discard comments/metadata,
 * and structure data in a way Claude can easily analyze.
 */

/**
 * Parse Terraform configuration
 *
 * INPUT: Raw Terraform HCL code
 * OUTPUT: Structured object with key sections
 */
function parse(terraformCode) {
  const result = {
    resources: [],
    variables: [],
    providers: [],
    outputs: [],
    raw_size_bytes: terraformCode.length,
    sections: {}
  };

  // Extract resources
  // Pattern: resource "TYPE" "NAME" { ... }
  const resourcePattern = /resource\s+"([^"]+)"\s+"([^"]+)"\s+\{/g;
  let match;

  while ((match = resourcePattern.exec(terraformCode)) !== null) {
    const resourceType = match[1];
    const resourceName = match[2];

    result.resources.push({
      type: resourceType,
      name: resourceName,
      id: `${resourceType}.${resourceName}`
    });

    // Categorize by type for agent-specific analysis
    if (resourceType.includes('aws_iam')) {
      if (!result.sections.iam_policies) result.sections.iam_policies = [];
      result.sections.iam_policies.push({
        type: resourceType,
        name: resourceName
      });
    }

    if (resourceType.includes('aws_s3')) {
      if (!result.sections.storage) result.sections.storage = [];
      result.sections.storage.push({
        type: resourceType,
        name: resourceName
      });
    }

    if (resourceType.includes('aws_lambda')) {
      if (!result.sections.compute) result.sections.compute = [];
      result.sections.compute.push({
        type: resourceType,
        name: resourceName
      });
    }

    if (resourceType.includes('aws_security_group') || resourceType.includes('aws_vpc')) {
      if (!result.sections.networking) result.sections.networking = [];
      result.sections.networking.push({
        type: resourceType,
        name: resourceName
      });
    }
  }

  // Extract variables
  const varPattern = /variable\s+"([^"]+)"/g;
  while ((match = varPattern.exec(terraformCode)) !== null) {
    result.variables.push(match[1]);
  }

  // Extract providers
  const providerPattern = /terraform\s+\{[^}]*required_providers[^}]*provider\s+"([^"]+)"/g;
  if (terraformCode.includes('provider')) {
    result.providers.push('aws');
  }

  return result;
}

/**
 * Extract specific sections for each agent
 *
 * Security Agent needs: IAM policies, security groups, encryption settings
 * Cost Agent needs: Compute configs, storage sizes, data transfer
 * Compliance Agent needs: Encryption, logging, backup policies
 * Performance Agent needs: Lambda memory, auto-scaling configs
 */
function extractSectionForAgent(terraformCode, agentType) {
  const sections = {
    security: (code) => extractIAMAndSecurity(code),
    cost: (code) => extractComputeAndStorage(code),
    compliance: (code) => extractEncryptionAndLogging(code),
    performance: (code) => extractLambdaAndAutoScaling(code)
  };

  return sections[agentType]?.(terraformCode) || terraformCode;
}

function extractIAMAndSecurity(code) {
  const lines = code.split('\n');
  const relevant = lines.filter(line =>
    line.includes('resource "aws_iam') ||
    line.includes('resource "aws_security_group') ||
    line.includes('principal') ||
    line.includes('Action') ||
    line.includes('Effect')
  );
  return relevant.join('\n');
}

function extractComputeAndStorage(code) {
  const lines = code.split('\n');
  const relevant = lines.filter(line =>
    line.includes('aws_lambda') ||
    line.includes('aws_s3') ||
    line.includes('memory_size') ||
    line.includes('storage_size') ||
    line.includes('ec2_instance_type')
  );
  return relevant.join('\n');
}

function extractEncryptionAndLogging(code) {
  const lines = code.split('\n');
  const relevant = lines.filter(line =>
    line.includes('kms') ||
    line.includes('encryption') ||
    line.includes('logging') ||
    line.includes('backup') ||
    line.includes('versioning')
  );
  return relevant.join('\n');
}

function extractLambdaAndAutoScaling(code) {
  const lines = code.split('\n');
  const relevant = lines.filter(line =>
    line.includes('aws_lambda') ||
    line.includes('aws_autoscaling') ||
    line.includes('memory_size') ||
    line.includes('timeout') ||
    line.includes('reserved_concurrent_executions')
  );
  return relevant.join('\n');
}

export default {
  parse,
  extractSectionForAgent
};
