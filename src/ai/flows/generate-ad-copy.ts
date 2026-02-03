'use server';

/**
 * @fileOverview AI-powered P2P ad copy generator.
 *
 * - generateAdCopy - A function that generates professional terms and conditions for P2P ads.
 * - GenerateAdCopyInput - The input type for the generateAdCopy function.
 * - GenerateAdCopyOutput - The return type for the generateAdCopy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdCopyInputSchema = z.object({
  crypto: z.string().describe('The cryptocurrency being traded (e.g., USDT, BTC, ETH, LTC).'),
  paymentMethod: z.string().describe('The payment method being used for the trade (e.g., Bank Transfer, PayPal).'),
  pricingDetails: z.string().describe('Details about the pricing, including whether it is a fixed rate or market rate with a percentage adjustment.'),
  termsRequested: z.string().describe('A request for what kind of terms to generate.  Should contain a verb like legal, friendly, etc.'),
});
export type GenerateAdCopyInput = z.infer<typeof GenerateAdCopyInputSchema>;

const GenerateAdCopyOutputSchema = z.object({
  termsAndConditions: z.string().describe('The generated terms and conditions for the P2P ad.'),
});
export type GenerateAdCopyOutput = z.infer<typeof GenerateAdCopyOutputSchema>;

export async function generateAdCopy(input: GenerateAdCopyInput): Promise<GenerateAdCopyOutput> {
  return generateAdCopyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdCopyPrompt',
  input: {schema: GenerateAdCopyInputSchema},
  output: {schema: GenerateAdCopyOutputSchema},
  prompt: `You are an expert copywriter specializing in creating terms and conditions for P2P cryptocurrency ads.

  Based on the following information, generate compelling and {{termsRequested}} terms and conditions for the ad.

  Cryptocurrency: {{{crypto}}}
  Payment Method: {{{paymentMethod}}}
  Pricing Details: {{{pricingDetails}}}
  
  Terms and Conditions:
  `,
});

const generateAdCopyFlow = ai.defineFlow(
  {
    name: 'generateAdCopyFlow',
    inputSchema: GenerateAdCopyInputSchema,
    outputSchema: GenerateAdCopyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
