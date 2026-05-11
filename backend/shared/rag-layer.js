/**
 * RAG (Retrieval Augmented Generation) Layer
 *
 * Before calling Claude for a finding, search memory for similar findings.
 * If found with high confidence, return cached result instead.
 *
 * LEARNING OBJECTIVE:
 * RAG is THE pattern for LLM applications:
 * 1. Query: User/system asks question
 * 2. Retrieve: Search knowledge base for relevant context
 * 3. Augment: Add retrieved context to prompt
 * 4. Generate: Ask Claude with augmented context
 *
 * Why it matters:
 * - 90% faster: Memory search (instant) vs Claude API (5s)
 * - Cheaper: No API call if cache hit
 * - More consistent: Same findings get same solutions
 * - Smarter: Claude sees similar past findings for context
 */

class RAGLayer {
  constructor(memoryStore, claudeClient, options = {}) {
    this.memory = memoryStore;
    this.claude = claudeClient;
    this.minSimilarity = options.minSimilarity || 0.85; // High confidence threshold
    this.enableCaching = options.enableCaching !== false; // Default: enabled
    this.stats = {
      cache_hits: 0,
      cache_misses: 0,
      total_time_saved: 0,
    };
  }

  /**
   * Augment agent prompt with similar findings from memory
   *
   * Returns: { augmentedPrompt, context, fromCache }
   */
  async augmentPrompt(originalPrompt, terraformCode, agent, topK = 3) {
    if (!this.enableCaching || !this.memory) {
      return {
        augmentedPrompt: originalPrompt,
        context: [],
        fromCache: false,
      };
    }

    // Search memory for similar findings
    // Extract key terms from terraform for better search
    const searchTerms = this._extractSearchTerms(terraformCode);
    const similarFindings = await this.memory.search(
      searchTerms,
      agent,
      topK,
      this.minSimilarity
    );

    if (similarFindings.length === 0) {
      return {
        augmentedPrompt: originalPrompt,
        context: [],
        fromCache: false,
      };
    }

    // Build augmentation
    let augmentation = `\n\nREFERENCE: Similar findings from past audits (for context):`;
    for (let i = 0; i < similarFindings.length; i++) {
      const similar = similarFindings[i];
      augmentation += `\n${i + 1}. [${similar.severity}] ${similar.finding.type}`;
      augmentation += `\n   Issue: ${similar.finding.issue}`;
      if (similar.finding.fix) {
        augmentation += `\n   Solution: ${similar.finding.fix}`;
      } else if (similar.finding.recommendation) {
        augmentation += `\n   Solution: ${similar.finding.recommendation}`;
      }
      augmentation += `\n   Similarity: ${(similar.similarity * 100).toFixed(0)}%`;
    }

    const augmentedPrompt = originalPrompt + augmentation;

    return {
      augmentedPrompt,
      context: similarFindings,
      fromCache: false,
    };
  }

  /**
   * Check if exact finding exists in memory
   *
   * If similar finding with high confidence exists, can return immediately
   */
  async checkCache(finding, agent, threshold = 0.95) {
    if (!this.enableCaching || !this.memory) {
      return null;
    }

    // Search for nearly identical findings
    const searchText = [
      finding.type,
      finding.issue,
      finding.resource,
    ]
      .join(" ")
      .toLowerCase();

    const cached = await this.memory.search(
      searchText,
      agent,
      1,
      threshold
    );

    if (cached.length > 0) {
      this.stats.cache_hits += 1;
      return cached[0];
    }

    this.stats.cache_misses += 1;
    return null;
  }

  /**
   * After getting result from Claude, store in memory
   */
  async memorizeResult(finding, agent) {
    if (!this.enableCaching || !this.memory) {
      return;
    }

    await this.memory.storeFinding(finding, agent);
  }

  /**
   * Extract search terms from Terraform
   *
   * Focus on resource types and configurations
   */
  _extractSearchTerms(terraformCode) {
    // Extract resource types (aws_*, google_*, etc.)
    const resourcePattern = /resource\s+"([^"]+)"/g;
    const resources = [];
    let match;
    while ((match = resourcePattern.exec(terraformCode)) !== null) {
      resources.push(match[1]);
    }

    // Extract common security keywords
    const keywords = [
      "encryption",
      "logging",
      "monitoring",
      "backup",
      "public",
      "private",
      "security",
      "auth",
      "permission",
      "policy",
      "vpc",
      "subnet",
      "route",
    ];

    let terms = resources.join(" ");
    for (const keyword of keywords) {
      if (terraformCode.toLowerCase().includes(keyword)) {
        terms += " " + keyword;
      }
    }

    return terms;
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalCalls = this.stats.cache_hits + this.stats.cache_misses;
    return {
      ...this.stats,
      cache_hit_rate:
        totalCalls > 0
          ? ((this.stats.cache_hits / totalCalls) * 100).toFixed(1) + "%"
          : "N/A",
      estimated_api_calls_saved: this.stats.cache_hits,
    };
  }

  /**
   * Enable/disable caching
   */
  setCaching(enabled) {
    this.enableCaching = enabled;
  }
}

export default RAGLayer;
