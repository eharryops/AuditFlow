/**
 * Claude API Client
 *
 * This is the wrapper around Anthropic SDK that all agents use.
 * It handles:
 * 1. Token counting (budget awareness)
 * 2. API calls with retries
 * 3. Cost tracking
 * 4. Response parsing
 *
 * LEARNING OBJECTIVE:
 * Understand how to build a reusable API client that optimizes for cost.
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * CONCEPT: Pricing Structure
 *
 * Input tokens:  $0.003 per 1K tokens
 * Output tokens: $0.015 per 1K tokens (5x more expensive!)
 *
 * Why is output more expensive?
 * - Input: You control it (can optimize)
 * - Output: Claude generates it (costs money)
 *
 * Example:
 * - Send 1,000 input tokens → $0.003
 * - Get 100 output tokens → $0.0015
 * - Total: $0.0045 per API call
 */

class ClaudeClient {
  constructor(apiKey = null) {
    // Use provided API key or fall back to environment variable
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY;

    if (!this.apiKey) {
      throw new Error(
        "CLAUDE_API_KEY not provided. Set environment variable or pass to constructor."
      );
    }

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.apiKey,
    });

    // Track cumulative costs
    this.stats = {
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_api_calls: 0,
      total_cost_dollars: 0,
    };
  }

  /**
   * STEP 1: Count tokens
   *
   * Why?
   * - Know cost before paying
   * - Budget management
   * - Identify inefficient prompts
   *
   * Formula:
   * 1 token ≈ 4 characters
   * More accurate: use BPE tokenizer, but estimation works for now
   */
  estimateTokens(text) {
    // Rough estimation: 1 token per 4 characters
    // Claude actually uses BPE tokenization, but this is close enough for budgeting
    const estimatedTokens = Math.ceil(text.length / 4);
    return estimatedTokens;
  }

  /**
   * STEP 2: Calculate cost
   *
   * Input pricing:  $0.003 per 1K input tokens
   * Output pricing: $0.015 per 1K output tokens
   *
   * Why separate?
   * - Output generation is more resource-intensive
   * - Encourages concise prompts
   */
  calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * 0.003;
    const outputCost = (outputTokens / 1000) * 0.015;
    return inputCost + outputCost;
  }

  /**
   * STEP 3: Make API call with retries
   *
   * Why retry?
   * - API can be temporarily unavailable
   * - Rate limits (too many requests)
   * - Network flakes
   *
   * Strategy: Exponential backoff
   * Attempt 1: Wait 1s
   * Attempt 2: Wait 2s
   * Attempt 3: Wait 4s
   */
  async callAPI(systemPrompt, userPrompt, options = {}) {
    const {
      temperature = 0.2, // Default: deterministic (0 = always same, 1 = creative)
      maxRetries = 3, // How many times to retry if API fails
      model = "claude-3-5-sonnet-20241022", // Which Claude model to use
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Claude API] Attempt ${attempt}/${maxRetries}: Calling ${model}`
        );

        // Count tokens BEFORE sending (budget awareness)
        const estimatedInputTokens =
          this.estimateTokens(systemPrompt) + this.estimateTokens(userPrompt);
        const estimatedInputCost = this.calculateCost(estimatedInputTokens, 0);

        console.log(
          `[Claude API] Estimated input: ${estimatedInputTokens} tokens (~$${estimatedInputCost.toFixed(4)})`
        );

        // Make the actual API call
        const response = await this.client.messages.create({
          model: model,
          max_tokens: 2048, // Max output tokens (controls cost + length)
          temperature: temperature,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });

        // Extract actual token usage from response
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const actualCost = this.calculateCost(inputTokens, outputTokens);

        // Update cumulative stats
        this.stats.total_input_tokens += inputTokens;
        this.stats.total_output_tokens += outputTokens;
        this.stats.total_api_calls += 1;
        this.stats.total_cost_dollars += actualCost;

        console.log(
          `[Claude API] ✅ Success (attempt ${attempt}/${maxRetries})`
        );
        console.log(`[Claude API] Tokens: ${inputTokens} input, ${outputTokens} output`);
        console.log(`[Claude API] Cost: $${actualCost.toFixed(4)}`);
        console.log(
          `[Claude API] Cumulative cost: $${this.stats.total_cost_dollars.toFixed(4)}`
        );

        // Extract the response text
        const responseText =
          response.content[0].type === "text" ? response.content[0].text : "";

        return {
          success: true,
          text: responseText,
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          },
          cost: actualCost,
          model: model,
          attempt: attempt,
        };
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error
        if (error.status === 429) {
          console.log(
            `[Claude API] ⚠️  Rate limited. Waiting before retry...`
          );
          // Exponential backoff: wait 2^(attempt-1) seconds
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else if (error.status >= 500) {
          // Server error, retry
          console.log(
            `[Claude API] ⚠️  Server error (${error.status}). Retrying...`
          );
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          // Client error (4xx), don't retry
          throw error;
        }
      }
    }

    // All retries failed
    throw new Error(
      `Claude API failed after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * STEP 4: Parse JSON response
   *
   * Why separate?
   * - Claude might return malformed JSON
   * - Need to validate before using
   * - Handle errors gracefully
   */
  parseJSON(responseText) {
    try {
      // Try to extract JSON from markdown code blocks
      // Claude often returns: ```json\n{...}\n```
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct parsing
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse Claude response as JSON:", error);
      console.error("Raw response:", responseText);
      throw new Error(`Invalid JSON response from Claude: ${error.message}`);
    }
  }

  /**
   * STEP 5: High-level API
   *
   * This is what agents actually call.
   * Handles all the complexity under the hood.
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
   * Get stats on spending
   */
  getStats() {
    return {
      ...this.stats,
      average_cost_per_call: (
        this.stats.total_cost_dollars / this.stats.total_api_calls
      ).toFixed(4),
    };
  }

  /**
   * Reset stats (for testing)
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

export default ClaudeClient;
