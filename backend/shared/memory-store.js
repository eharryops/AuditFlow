/**
 * Memory Store
 *
 * Stores findings with their embeddings for fast semantic retrieval.
 * Acts as a vector database (in-memory for testing, DynamoDB for prod).
 *
 * LEARNING OBJECTIVE:
 * Understand how to build a semantic search system:
 * 1. Store: (finding, embedding)
 * 2. Query: "Find findings similar to X"
 * 3. Return: Top K most similar findings
 *
 * Why this matters:
 * "RDS encryption not enabled" ≈ "Database lacks encryption"
 * Both map to same solution, but would be different API calls without RAG.
 */

class MemoryStore {
  constructor(embeddingService, options = {}) {
    this.embeddings = embeddingService;
    this.store = []; // In-memory storage: [{ id, finding, vector, agent, severity }, ...]
    this.index = {}; // { id → position in store }
    this.stats = {
      total_stored: 0,
      total_retrieved: 0,
      cache_hits: 0,
    };
  }

  /**
   * Store a finding with its embedding
   */
  async storeFinding(finding, agent) {
    // Generate unique ID
    const id =
      "finding-" +
      agent +
      "-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substr(2, 9);

    // Create searchable text (concatenate key fields)
    const searchText =
      [
        finding.type,
        finding.issue,
        finding.resource,
        finding.recommendation || finding.fix || "",
      ]
        .join(" ")
        .toLowerCase();

    // Generate embedding
    const vector = await this.embeddings.embed(searchText);

    // Store in memory
    const record = {
      id,
      finding,
      vector,
      agent,
      severity: finding.severity || "MEDIUM",
      timestamp: Date.now(),
      searchText,
    };

    this.store.push(record);
    this.index[id] = this.store.length - 1;
    this.stats.total_stored += 1;

    return id;
  }

  /**
   * Store multiple findings
   */
  async storeMany(findings, agent) {
    const ids = [];
    for (const finding of findings) {
      const id = await this.storeFinding(finding, agent);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Search for similar findings
   *
   * Returns: [{ id, finding, similarity }, ...] sorted by similarity
   */
  async search(query, agent = null, topK = 5, minSimilarity = 0.7) {
    if (this.store.length === 0) {
      return [];
    }

    // Generate embedding for query
    const queryVector = await this.embeddings.embed(query);

    // Find similar findings
    const candidates = this.store
      .filter((record) => (agent ? record.agent === agent : true))
      .map((record) => ({
        vector: record.vector,
        record,
      }));

    const results = this.embeddings.findSimilar(queryVector, candidates, topK);

    // Filter by minimum similarity
    const filtered = results
      .filter((result) => result.similarity >= minSimilarity)
      .map((result) => ({
        id: result.item.record.id,
        finding: result.item.record.finding,
        agent: result.item.record.agent,
        similarity: result.similarity,
        severity: result.item.record.severity,
      }));

    if (filtered.length > 0) {
      this.stats.cache_hits += 1;
    }
    this.stats.total_retrieved += 1;

    return filtered;
  }

  /**
   * Get finding by ID
   */
  get(id) {
    const pos = this.index[id];
    if (pos === undefined) return null;
    return this.store[pos];
  }

  /**
   * List all findings
   */
  list(agent = null) {
    if (agent) {
      return this.store.filter((record) => record.agent === agent);
    }
    return this.store;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      total_findings: this.store.length,
      cache_hit_rate:
        this.stats.total_retrieved > 0
          ? (
              (this.stats.cache_hits / this.stats.total_retrieved) *
              100
            ).toFixed(1) + "%"
          : "N/A",
    };
  }

  /**
   * Clear all findings
   */
  clear() {
    this.store = [];
    this.index = {};
  }
}

export default MemoryStore;
