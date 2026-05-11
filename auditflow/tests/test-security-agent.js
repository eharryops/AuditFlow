/**
 * Test Script: Security Agent
 *
 * INSTRUCTIONS:
 * 1. Set your CLAUDE_API_KEY environment variable
 * 2. Run: node tests/test-security-agent.js
 * 3. Watch the agent audit Terraform
 * 4. See real findings from Claude API
 *
 * LEARNING:
 * - How SecurityAgent.audit() works
 * - What Claude returns for security vulnerabilities
 * - How many tokens were used (cost tracking)
 * - How the validation works
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ClaudeClient from "../backend/shared/claude-client.js";
import SecurityAgent from "../backend/agents/security-agent.js";
import TerraformParser from "../backend/shared/parsers/terraform-parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log("\n========================================");
  console.log("Testing Security Agent");
  console.log("========================================\n");

  // Check API key
  if (!process.env.CLAUDE_API_KEY) {
    console.error("❌ ERROR: CLAUDE_API_KEY environment variable not set");
    console.error("Set it: export CLAUDE_API_KEY=sk-ant-...");
    process.exit(1);
  }

  try {
    // Step 1: Load Terraform file
    console.log("STEP 1: Loading Terraform file...");
    const terraformPath = path.join(
      __dirname,
      "sample-terraform",
      "vulnerable-config.tf"
    );
    const terraformCode = fs.readFileSync(terraformPath, "utf-8");
    console.log(`✅ Loaded ${terraformCode.length} bytes of Terraform code\n`);

    // Step 2: Initialize Claude client
    console.log("STEP 2: Initializing Claude client...");
    const claude = new ClaudeClient(process.env.CLAUDE_API_KEY);
    console.log("✅ Claude client initialized\n");

    // Step 3: Initialize Security Agent
    console.log("STEP 3: Initializing Security Agent...");
    const securityAgent = new SecurityAgent(claude);
    console.log("✅ Security Agent initialized\n");

    // Step 4: Run audit
    console.log("STEP 4: Running security audit...");
    console.log("(This will call Claude API - be patient)\n");
    const startTime = Date.now();

    const auditResult = await securityAgent.audit(terraformCode);

    const elapsedTime = Date.now() - startTime;

    console.log(`✅ Audit complete in ${(elapsedTime / 1000).toFixed(1)}s\n`);

    // Step 5: Display results
    console.log("STEP 5: Audit Results");
    console.log("========================================");

    if (auditResult.success) {
      console.log(`\n✅ SUCCESS`);
      console.log(`\nFindings Summary:`);
      console.log(`  CRITICAL: ${auditResult.summary.critical}`);
      console.log(`  HIGH:     ${auditResult.summary.high}`);
      console.log(`  MEDIUM:   ${auditResult.summary.medium}`);
      console.log(`  LOW:      ${auditResult.summary.low}`);
      console.log(`  TOTAL:    ${auditResult.findings.length}\n`);

      // Display each finding
      console.log("Detailed Findings:");
      console.log("---");
      for (const finding of auditResult.findings) {
        console.log(`\n[${finding.severity}] ${finding.cwe} - ${finding.type}`);
        console.log(`Resource: ${finding.resource}`);
        console.log(`Issue: ${finding.issue}`);
        console.log(`Vulnerable Code: ${finding.vulnerable_code}`);
        console.log(`Fix: ${finding.fix}`);
        if (finding.impact) {
          console.log(`Impact: ${finding.impact}`);
        }
      }

      // Cost breakdown
      console.log("\n\nCost Breakdown:");
      console.log("---");
      console.log(`Input Tokens:  ${auditResult.tokens.input}`);
      console.log(`Output Tokens: ${auditResult.tokens.output}`);
      console.log(`Total Tokens:  ${auditResult.tokens.total}`);
      console.log(`Cost:          $${auditResult.cost.toFixed(4)}`);

      // Client stats
      console.log("\n\nCumulative Statistics:");
      console.log("---");
      const stats = claude.getStats();
      console.log(`Total API Calls:      ${stats.total_api_calls}`);
      console.log(`Total Input Tokens:   ${stats.total_input_tokens}`);
      console.log(`Total Output Tokens:  ${stats.total_output_tokens}`);
      console.log(`Total Cost:           $${stats.total_cost_dollars.toFixed(4)}`);
      console.log(
        `Average Cost/Call:    $${stats.average_cost_per_call.toFixed(4)}`
      );

      // Learning points
      console.log("\n\nLearning Points:");
      console.log("---");
      console.log("1. Token Counting:");
      console.log(
        `   - Terraform file size: ${terraformCode.length} bytes`
      );
      console.log(`   - Input tokens sent: ${auditResult.tokens.input}`);
      console.log(`   - Ratio: ~${(terraformCode.length / auditResult.tokens.input).toFixed(1)} bytes per token`);

      console.log("\n2. Temperature 0.2 (Deterministic):");
      console.log(`   - All findings should be deterministic`);
      console.log(`   - Run again and you'll see the same findings`);
      console.log(`   - This prevents hallucinations in security audits`);

      console.log("\n3. Validation:");
      console.log(
        `   - All findings passed validation (CWE format, required fields)`
      );
      console.log(`   - Any invalid finding was filtered out`);

      console.log("\n4. Severity Sorting:");
      console.log(`   - Findings sorted by severity (CRITICAL → LOW)`);
      console.log(`   - Users see most critical issues first`);
    } else {
      console.log(`❌ FAILED: ${auditResult.error}`);
    }

    console.log("\n========================================\n");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run test
runTest().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
