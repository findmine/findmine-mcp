/**
 * Handler for the outfit_completion prompt.
 * Provides styling advice and complete outfit for a product.
 */

import { logger } from '../utils/logger.js';
import { findMineService } from '../services/findmine-service.js';
import { createProductUri, createLookUri } from '../types/mcp.js';
import { getProductMimeType, getLookMimeType } from '../utils/resource-mapper.js';
import { sampleProducts, sampleLooks } from '../utils/mock-data.js';
import { PromptResult } from './index.js';

/**
 * Handles the outfit_completion prompt request
 * @returns Prompt messages for outfit completion
 */
export function handleOutfitCompletionPrompt(): PromptResult {
  // For the outfit completion prompt, we'll use sample data products and looks
  const product = sampleProducts[0];
  const look = sampleLooks[0];

  // Create resource references for the prompt
  const productResource = findMineService.getProduct(product.product_id || '');
  const lookResource = findMineService.getLook(look.look_id || '');

  if (!productResource || !lookResource) {
    logger.error('Sample product or look not found for outfit_completion prompt');
    return {
      error: {
        message: 'Sample product or look not found',
        code: 'RESOURCE_NOT_FOUND',
      },
    };
  }

  const productUri = createProductUri(productResource.id, productResource.colorId);
  const lookUri = createLookUri(lookResource.id);

  return {
    success: true,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: "I'm looking for outfit ideas for this product:",
        },
      },
      {
        role: 'user',
        content: {
          type: 'resource',
          resource: {
            uri: productUri,
            mimeType: getProductMimeType(),
            text: JSON.stringify(productResource, null, 2),
          },
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: "Here's a recommended complete outfit:",
        },
      },
      {
        role: 'user',
        content: {
          type: 'resource',
          resource: {
            uri: lookUri,
            mimeType: getLookMimeType(),
            text: JSON.stringify(lookResource, null, 2),
          },
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Please explain why these items work well together and provide styling advice for this outfit. Include information about color coordination, occasion appropriateness, and pricing (use the formattedPrice or formattedSalePrice fields for accurate price display). Include any other relevant fashion tips for the customer.',
        },
      },
    ],
  };
}
