/**
 * Embedding Service
 *
 * Converts findings (text) into vector embeddings for semantic search.
 *
 * LEARNING OBJECTIVE:
 * Understand embeddings: text → high-dimensional vectors where similar text = nearby vectors.
 *
 * Why embeddings?
 * - "S3 bucket public" and "S3 bucket publicly readable" are semantically similar
 * - Embeddings capture that similarity
 * - We can search: "Give me all findings similar to this one"
 * - Perfect for RAG (Retrieval Augmented Generation)
 *
 * Implementation options:
 * 1. Mock: Simple hash-based "embeddings" (for testing)
 * 2. Ollama: Local embeddings model (free, no API costs)
 * 3. Claude API: Official embeddings (paid, but high quality)
 */

class EmbeddingService {
  constructor(options = {}) {
    this.type = options.type || "mock"; // "mock", "ollama", or "claude"
    this.model = options.model || "nomic-embed-text"; // For Ollama
    this.baseURL = options.baseURL || "http://localhost:11434";
    this.dimension = options.dimension || 384; // Vector dimension
  }

  /**
   * Generate embedding for text
   *
   * Returns: [float, float, ..., float] — 384-dimensional vector
   */
  async embed(text) {
    if (this.type === "mock") {
      return this._mockEmbed(text);
    } else if (this.type === "ollama") {
      return this._ollamaEmbed(text);
    } else if (this.type === "claude") {
      return this._claudeEmbed(text);
    }
  }

  /**
   * Mock embedding: Simple hash-based approach
   *
   * For testing without Ollama/Claude
   * Each word contributes to the vector
   */
  _mockEmbed(text) {
    // Create a simple vector based on text hash
    const vector = new Array(this.dimension).fill(0);

    // Split text into words and create pseudo-embeddings
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Use word hash to deterministically map to vector positions
      for (let j = 0; j < word.length; j++) {
        const pos = (word.charCodeAt(j) * (i + 1)) % this.dimension;
        vector[pos] += 1 / (j + 1);
      }
    }

    // Normalize vector to unit length
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sum);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * Ollama embedding
   *
   * Uses local embedding model (e.g., nomic-embed-text)
   * Run: ollama pull nomic-embed-text
   */
  async _ollamaEmbed(text) {
    try {
      const response = await fetch(`${this.baseURL}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });

      if (!response.ok) {
        console.warn(
          `[EmbeddingService] Ollama returned ${response.status}, falling back to mock`
        );
        return this._mockEmbed(text);
      }

      const data = await response.json();
      return data.embeddings?.[0] || this._mockEmbed(text);
    } catch (error) {
      console.warn(
        `[EmbeddingService] Ollama error: ${error.message}, using mock`
      );
      return this._mockEmbed(text);
    }
  }

  /**
   * Claude embedding (placeholder)
   *
   * Would use Anthropic's embedding API
   */
  async _claudeEmbed(text) {
    // Placeholder: Would call Anthropic embeddings API
    // For now, fall back to mock
    console.warn(
      "[EmbeddingService] Claude embeddings not yet implemented, using mock"
    );
    return this._mockEmbed(text);
  }

  /**
   * Calculate cosine similarity between two vectors
   *
   * Returns: [0, 1] where 1 = identical, 0 = orthogonal
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Find most similar vectors
   *
   * Returns: [{ vector, similarity, item }, ...] sorted by similarity
   */
  findSimilar(queryVector, candidates, topK = 5) {
    const similarities = candidates.map((candidate) => ({
      item: candidate,
      vector: candidate.vector,
      similarity: this.cosineSimilarity(queryVector, candidate.vector),
    }));

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top K results
    return similarities.slice(0, topK);
  }
}

export default EmbeddingService;
