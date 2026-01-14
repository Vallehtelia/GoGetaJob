import OpenAI from 'openai';
import { decryptString } from '../utils/crypto.js';
import type { CvOptimizeResponse } from '../ai/schemas/cvOptimize.schema.js';
import { cvOptimizeResponseSchema } from '../ai/schemas/cvOptimize.schema.js';

/**
 * Get OpenAI client instance using user's encrypted API key
 */
export async function getOpenAiClient(encryptedKey: {
  keyCiphertext: string;
  keyIv: string;
  keyTag: string;
}): Promise<OpenAI> {
  // Decrypt the API key
  const apiKey = decryptString(
    encryptedKey.keyCiphertext,
    encryptedKey.keyIv,
    encryptedKey.keyTag
  );

  return new OpenAI({
    apiKey,
  });
}

/**
 * Generate CV summary using OpenAI Structured Outputs
 */
export async function generateCvSummary(
  client: OpenAI,
  systemPrompt: string,
  userMessage: string
): Promise<CvOptimizeResponse> {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'cv_optimize_response',
        strict: true,
        schema: cvOptimizeResponseSchema as any,
      },
    },
    temperature: 0.3,
    max_tokens: 900,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse and validate response
  const parsed = JSON.parse(content);
  
  // Validate with Zod schema
  const { cvOptimizeResponseZodSchema } = await import('../ai/schemas/cvOptimize.schema.js');
  return cvOptimizeResponseZodSchema.parse(parsed);
}

/**
 * Chat with OpenAI using conversation history
 */
export async function chatWithAi(
  client: OpenAI,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return content;
}

/**
 * Generate CV suggestions (summary + library ID selections) using Structured Outputs.
 */
export async function generateCvSuggestion(
  client: OpenAI,
  systemPrompt: string,
  userMessage: string,
  jsonSchema: unknown
): Promise<unknown> {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'cv_suggest_response',
        strict: true,
        schema: jsonSchema as any,
      },
    },
    temperature: 0.3,
    max_tokens: 900,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return JSON.parse(content);
}
