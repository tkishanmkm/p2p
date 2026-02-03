'use server';

/**
 * @fileOverview Analyzes trade chat messages for sentiment and flags potentially harmful content.
 *
 * - analyzeSentiment - A function that analyzes the sentiment of a trade chat message.
 * - AnalyzeSentimentInput - The input type for the analyzeSentiment function.
 * - AnalyzeSentimentOutput - The return type for the analyzeSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSentimentInputSchema = z.object({
  message: z
    .string()
    .describe('The trade chat message to analyze for potentially harmful sentiment.'),
});
export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

const AnalyzeSentimentOutputSchema = z.object({
  isHarmful: z
    .boolean()
    .describe(
      'Whether the message is potentially harmful (true) or not (false) based on sentiment analysis.'
    ),
  reasoning: z
    .string()
    .describe('The AI reasoning behind the sentiment analysis and harmfulness determination.'),
});
export type AnalyzeSentimentOutput = z.infer<typeof AnalyzeSentimentOutputSchema>;

export async function analyzeSentiment(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
  return analyzeSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tradeChatSentimentPrompt',
  input: {schema: AnalyzeSentimentInputSchema},
  output: {schema: AnalyzeSentimentOutputSchema},
  prompt: `You are an AI assistant specializing in identifying harmful content in trade chat messages.

  Analyze the following message and determine if it is potentially harmful (e.g., scam, abusive language, etc.). Provide a reasoning for your determination.

  Message: {{{message}}}

  Return a JSON object with 'isHarmful' (true/false) and 'reasoning' fields.
`,
});

const analyzeSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeSentimentFlow',
    inputSchema: AnalyzeSentimentInputSchema,
    outputSchema: AnalyzeSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
