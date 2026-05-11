/**
 * Ollama Client
 *
 * Local LLM wrapper that mimics ClaudeClient interface
 * Uses Ollama's REST API (default: http://localhost:11434)
 *
 * Usage: Same as ClaudeClient but calls local Ollama instead of Claude API
 * Cost: Free (runs on your machine)
 */

import axios from "axios";

class OllamaClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || "http://localhost:11434";
    this.model = options.model || "mistral"; // Default to Mistral, falls back to available model
    this.timeout = options.timeout || 120000; // 120s timeout (local/cloud models can be slower)

    // Track stats (same interface as ClaudeClient)
    this.stats = {
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_api_calls: 0,
      total_cost_dollars: 0, // Always 0 for local
    };

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
    });
  }

  /**
   * Estimate tokens (same as Claude client)
   */
  estimateTokens(text) {
    // Rough estimation: 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost (always 0 for local)
   */
  calculateCost(inputTokens, outputTokens) {
    return 0; // Free!
  }

  /**
   * Call Ollama API
   * Compatible with ClaudeClient.callAPI signature
   */
  async callAPI(systemPrompt, userPrompt, options = {}) {
    const {
      temperature = 0.2,
      maxRetries = 3,
      model = this.model,
    } = options;

    const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Ollama] Attempt ${attempt}/${maxRetries}: Calling ${model}`
        );

        // Estimate tokens
        const estimatedInputTokens = this.estimateTokens(fullPrompt);
        console.log(
          `[Ollama] Estimated input: ${estimatedInputTokens} tokens (free!)`
        );

        // Call Ollama API
        const response = await this.client.post("/api/generate", {
          model: model,
          prompt: fullPrompt,
          temperature: temperature,
          stream: false, // Wait for full response
          num_predict: 2048, // Max output tokens
        });

        // Parse Ollama response
        const responseText = response.data.response || "";

        // Estimate output tokens (Ollama doesn't return token counts)
        const estimatedOutputTokens = this.estimateTokens(responseText);

        // Update stats
        this.stats.total_input_tokens += estimatedInputTokens;
        this.stats.total_output_tokens += estimatedOutputTokens;
        this.stats.total_api_calls += 1;
        this.stats.total_cost_dollars += 0; // Free!

        console.log(
          `[Ollama] ✅ Success (attempt ${attempt}/${maxRetries})`
        );
        console.log(
          `[Ollama] Tokens: ~${estimatedInputTokens} input, ~${estimatedOutputTokens} output`
        );
        console.log(`[Ollama] Cost: $0.0000 (local model)`);

        return {
          success: true,
          text: responseText,
          tokens: {
            input: estimatedInputTokens,
            output: estimatedOutputTokens,
            total: estimatedInputTokens + estimatedOutputTokens,
          },
          cost: 0,
          model: model,
          attempt: attempt,
        };
      } catch (error) {
        lastError = error;

        if (error.code === "ECONNREFUSED") {
          console.log(
            `[Ollama] ⚠️  Cannot connect to Ollama. Is it running on ${this.baseURL}?`
          );
          console.log(`[Ollama] Start Ollama with: ollama serve`);
          throw error;
        } else if (error.response?.status >= 500) {
          console.log(
            `[Ollama] ⚠️  Server error (${error.response.status}). Retrying...`
          );
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          throw error;
        }
      }
    }

    throw new Error(
      `Ollama failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Parse JSON response (same as Claude client)
   */
  parseJSON(responseText) {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct parsing
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse Ollama response as JSON:", error);
      console.error("Raw response:", responseText);
      throw new Error(`Invalid JSON response from Ollama: ${error.message}`);
    }
  }

  /**
   * High-level API (same as ClaudeClient)
   */
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

  /**
   * Get stats (same as ClaudeClient)
   */
  getStats() {
    return {
      ...this.stats,
      average_cost_per_call: "0.0000",
    };
  }

  /**
   * Reset stats (same as ClaudeClient)
   */
  resetStats() {
    this.stats = {
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_api_calls: 0,
      total_cost_dollars: 0,
    };
  }
}

export default OllamaClient;
