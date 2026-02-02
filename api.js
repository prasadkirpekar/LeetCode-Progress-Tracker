// OpenAI API integration for LeetCode Progress Tracker

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Pricing per 1M tokens (as of January 2025)
const INPUT_PRICE_PER_1M = 0.15;
const OUTPUT_PRICE_PER_1M = 0.60;

// Estimate tokens (rough approximation: ~4 chars per token)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Calculate cost based on tokens
function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000000) * INPUT_PRICE_PER_1M;
  const outputCost = (outputTokens / 1000000) * OUTPUT_PRICE_PER_1M;
  return inputCost + outputCost;
}

// Test if an API key is valid
async function testApiKey(apiKey) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true, message: 'API key is valid' };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid API key' };
    } else if (response.status === 429) {
      return { success: false, error: 'Rate limited. Please try again later.' };
    } else {
      const data = await response.json();
      return { success: false, error: data.error?.message || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error: 'Network error: ' + error.message };
  }
}

// Make a call to OpenAI API
async function callOpenAI(apiKey, prompt, maxTokens = 1500) {
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert programming coach and LeetCode mentor. Provide helpful, encouraging, and specific advice to help users improve their algorithmic problem-solving skills. Format your responses clearly with sections and bullet points where appropriate.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const inputTokens = estimateTokens(JSON.stringify(messages));

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid API key. Please check your settings.' };
      } else if (response.status === 429) {
        return { success: false, error: 'Rate limited. Please try again in a few minutes.' };
      } else if (response.status === 503) {
        return { success: false, error: 'OpenAI service is temporarily unavailable. Please try again later.' };
      }

      const errorData = await response.json();
      return { success: false, error: errorData.error?.message || 'API request failed' };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return { success: false, error: 'No response from AI' };
    }

    const outputTokens = data.usage?.completion_tokens || estimateTokens(data.choices[0].message.content);
    const actualInputTokens = data.usage?.prompt_tokens || inputTokens;
    const totalTokens = actualInputTokens + outputTokens;
    const cost = calculateCost(actualInputTokens, outputTokens);

    return {
      success: true,
      content: data.choices[0].message.content,
      tokens: totalTokens,
      cost: cost,
      inputTokens: actualInputTokens,
      outputTokens: outputTokens
    };

  } catch (error) {
    console.error('[LeetCode Tracker] OpenAI API error:', error);
    return { success: false, error: 'Network error: ' + error.message };
  }
}

// Get estimated cost for a prompt
function getEstimatedCost(prompt, maxOutputTokens = 1500) {
  const inputTokens = estimateTokens(prompt);
  return calculateCost(inputTokens, maxOutputTokens);
}

// Export for use in background script
export {
  testApiKey,
  callOpenAI,
  getEstimatedCost,
  estimateTokens,
  calculateCost
};
