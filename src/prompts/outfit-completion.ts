/**
 * outfit_completion prompt — styling advice and a complete outfit for a product.
 */

import type { GetPromptResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { PRODUCT_MIME_TYPE, createProductUri } from '../resources/uris.js';
import type { ProductResource } from '../types/mcp.js';

export const OutfitCompletionArgsSchema = z.object({
  product_id: z.string().min(1).describe('ID of the product to build outfits around'),
  product_color_id: z.string().optional().describe('Color ID of the product (if applicable)'),
  occasion: z
    .string()
    .optional()
    .describe('Occasion to style for (e.g., office, wedding, date_night)'),
});

export type OutfitCompletionArgs = z.infer<typeof OutfitCompletionArgsSchema>;

/**
 * Build the prompt messages. When the product has already been returned by a tool
 * call, its details are embedded so the model does not need a separate read.
 */
export function buildOutfitCompletionPrompt(
  args: OutfitCompletionArgs,
  knownProduct?: ProductResource
): GetPromptResult {
  const { product_id, product_color_id, occasion } = args;
  const colorClause = product_color_id ? ` in color ${product_color_id}` : '';
  const occasionClause = occasion ? ` for ${occasion.replace(/_/g, ' ')}` : '';
  const toolArgs = JSON.stringify(
    product_color_id ? { product_id, product_color_id } : { product_id }
  );

  const messages: GetPromptResult['messages'] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `I'm looking for outfit ideas${occasionClause} for product ${product_id}${colorClause}.`,
      },
    },
  ];

  if (knownProduct) {
    messages.push({
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: createProductUri(knownProduct.id, knownProduct.colorId),
          mimeType: PRODUCT_MIME_TYPE,
          text: JSON.stringify(knownProduct, null, 2),
        },
      },
    });
  }

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: `Call the get_complete_the_look tool with ${toolArgs} to get FindMine's recommended looks. Then explain why the items in each look work well together and give styling advice${occasionClause}: color coordination, occasion appropriateness, and pricing (use formatted_price for display). Include any other relevant fashion tips for the customer.`,
    },
  });

  return { messages };
}
