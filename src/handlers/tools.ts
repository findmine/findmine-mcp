/**
 * Tool call dispatcher for the FindMine MCP server.
 * Routes tool calls to their appropriate handlers with Zod validation.
 */

import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { getToolDefinitions } from '../tools/index.js';
import {
  safeValidateToolInput,
  GetStyleGuideInput,
  GetCompleteTheLookInput,
  GetVisuallySimilarInput,
  TrackInteractionInput,
  UpdateItemDetailsInput,
} from '../schemas/tool-inputs.js';
import { findMineService } from '../services/findmine-service.js';
import { createProductUri, createLookUri } from '../types/mcp.js';
import { styleGuides, getOccasionAdvice, getSeasonAdvice } from '../content/style-guides.js';

/**
 * Helper to format Zod validation errors for MCP error responses
 */
function formatValidationError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return `Validation failed: ${issues.join('; ')}`;
}

/** Text content in tool responses */
interface TextContent {
  type: 'text';
  text: string;
}

/** Tool response with content array */
interface ToolResult {
  isError?: boolean;
  success?: boolean;
  content: TextContent[];
}

/**
 * Creates an MCP-compliant error response for tool calls
 * Per MCP spec, isError: true enables model self-correction
 */
function createErrorResponse(message: string): ToolResult {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

/**
 * Handler for listing available tools
 * @returns List of available tools or error
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function handleListTools() {
  try {
    logger.error('Listing available tools');

    const tools = getToolDefinitions();

    logger.error(`Returning ${String(tools.length)} available tools`);
    return {
      success: true,
      tools,
    };
  } catch (error) {
    logger.error(
      `Error listing tools: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
    return {
      error: {
        message:
          error instanceof Error ? error.message : 'Unknown error occurred while listing tools',
        code: 'TOOL_LIST_ERROR',
      },
    };
  }
}

/**
 * Handles the get_style_guide tool request
 */
function handleGetStyleGuide(args: GetStyleGuideInput): ToolResult {
  const category = args.category;
  const occasion = args.occasion;
  const fashion_season = args.fashion_season;

  logger.error(
    `Getting style guide for category: ${category}${occasion ? `, occasion: ${occasion}` : ''}${fashion_season ? `, season: ${fashion_season}` : ''}`
  );

  // Get the appropriate style guide
  let styleGuideContent = styleGuides[category] || styleGuides.general;

  // Add occasion-specific advice if requested
  if (occasion) {
    styleGuideContent += getOccasionAdvice(occasion);
  }

  // Add seasonal advice if requested
  if (fashion_season) {
    styleGuideContent += getSeasonAdvice(fashion_season);
  }

  return {
    success: true,
    content: [
      {
        type: 'text',
        text: styleGuideContent,
      },
    ],
  };
}

/**
 * Handles the get_complete_the_look tool request
 */
async function handleGetCompleteTheLook(args: GetCompleteTheLookInput): Promise<ToolResult> {
  const productId = args.product_id;
  const inStock = args.in_stock;
  const onSale = args.on_sale;
  const returnPdpItem = args.return_pdp_item;
  const colorId = args.product_color_id;
  const sessionId = args.session_id;
  const customerId = args.customer_id;
  const gender = args.customer_gender;
  const apiVersion = args.api_version;

  logger.error(
    `Getting complete the look for product ${productId}${colorId ? ` (color: ${colorId})` : ''}`
  );

  // Get complete the look recommendations
  const result = await findMineService.getCompleteTheLook(productId, inStock, onSale, {
    colorId,
    sessionId,
    customerId,
    returnPdpItem,
    gender,
    apiVersion,
  });

  // Process looks data with null safety
  const lookItems = result.looks
    .map((look) => {
      if (!look.id) {
        return null;
      }

      const lookUri = createLookUri(look.id);

      return {
        look_id: look.id,
        title: look.title || '',
        description: look.description || '',
        image_url: look.imageUrl || '',
        products: Array.isArray(look.productIds)
          ? look.productIds
              .map((pid) => {
                if (!pid) return null;
                const product = findMineService.getProduct(pid);
                const productUri = product ? createProductUri(product.id, product.colorId) : null;

                return {
                  product_id: pid,
                  name: product?.name || '',
                  uri: productUri,
                };
              })
              .filter(Boolean)
          : [],
        uri: lookUri,
      };
    })
    .filter(Boolean);

  // Include the product if requested
  let productInfo = null;
  if (result.product) {
    const productUri = createProductUri(result.product.id, result.product.colorId);

    productInfo = {
      product_id: result.product.id,
      name: result.product.name,
      uri: productUri,
    };
  }

  return {
    success: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            product: productInfo,
            looks: lookItems,
            total_looks: lookItems.length,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Handles the get_visually_similar tool request
 */
async function handleGetVisuallySimilar(args: GetVisuallySimilarInput): Promise<ToolResult> {
  const productId = args.product_id;
  const limit = args.limit;
  const offset = args.offset;
  const colorId = args.product_color_id;
  const sessionId = args.session_id;
  const customerId = args.customer_id;
  const gender = args.customer_gender;
  const apiVersion = args.api_version;

  logger.error(
    `Getting visually similar products for ${productId}, limit: ${String(limit)}, offset: ${String(offset)}`
  );

  // Get visually similar products
  const result = await findMineService.getVisuallySimilar(productId, {
    colorId,
    sessionId,
    customerId,
    limit,
    offset,
    gender,
    apiVersion,
  });

  // Process products data
  const productItems = result.products.map((product) => {
    const productUri = createProductUri(product.id, product.colorId);

    return {
      product_id: product.id,
      name: product.name,
      uri: productUri,
    };
  });

  return {
    success: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            products: productItems,
            total: result.total,
            limit,
            offset,
            source_product_id: productId,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Handles the track_interaction tool request
 */
async function handleTrackInteraction(args: TrackInteractionInput): Promise<ToolResult> {
  const forceEnable = args.force_enable;
  const eventType = args.event_type;
  const productId = args.product_id;

  // Check if tracking is enabled or forced
  if (!config.features.enableTracking && !forceEnable) {
    logger.error('Tracking is disabled and force_enable is not set');
    return createErrorResponse(
      'Tracking is disabled. Set FINDMINE_ENABLE_TRACKING=true or use force_enable=true to enable it.'
    );
  }

  const colorId = args.product_color_id;
  const lookId = args.look_id;
  const sourceProductId = args.source_product_id;
  const price = args.price;
  const quantity = args.quantity;
  const sessionId = args.session_id;
  const customerId = args.customer_id;
  const apiVersion = args.api_version;

  logger.error(`Tracking ${eventType} event for product ${productId}`);

  // Track the event
  const result = await findMineService.trackEvent(eventType, productId, {
    colorId,
    lookId,
    sourceProductId,
    price,
    quantity,
    sessionId,
    customerId,
    apiVersion,
  });

  return {
    success: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: result.success,
            event_id: result.event_id,
            event_type: eventType,
            product_id: productId,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Handles the update_item_details tool request
 */
async function handleUpdateItemDetails(args: UpdateItemDetailsInput): Promise<ToolResult> {
  const forceEnable = args.force_enable;
  const items = args.items;

  // Check if item details updates are enabled or forced
  if (!config.features.enableItemDetailsUpdates && !forceEnable) {
    logger.error('Item details updates are disabled and force_enable is not set');
    return createErrorResponse(
      'Item details updates are disabled. Set FINDMINE_ENABLE_ITEM_UPDATES=true or use force_enable=true to enable it.'
    );
  }

  const sessionId = args.session_id;
  const customerId = args.customer_id;
  const apiVersion = args.api_version;

  logger.error(`Updating details for ${String(items.length)} items`);

  // Map the items to the format expected by the service
  const mappedItems = items.map((item) => ({
    productId: item.product_id,
    colorId: item.product_color_id,
    inStock: item.in_stock,
    onSale: item.on_sale,
  }));

  // Update item details
  const result = await findMineService.updateItemDetails(mappedItems, {
    sessionId,
    customerId,
    apiVersion,
  });

  return {
    success: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: result.success,
            updated_count: result.updated_count,
            failed_count: result.failed_count,
            failures: result.failures,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Handler for tool calls - dispatches to appropriate handler with Zod validation
 * @param name - Tool name
 * @param args - Tool arguments (raw, will be validated)
 * @returns Tool result
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function handleCallTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_style_guide': {
      try {
        const validation = safeValidateToolInput('get_style_guide', args);
        if (!validation.success) {
          logger.error(`Validation failed for get_style_guide: ${formatValidationError(validation.error)}`);
          return createErrorResponse(formatValidationError(validation.error));
        }
        return handleGetStyleGuide(validation.data);
      } catch (error) {
        logger.error(
          `Error getting style guide: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
        return createErrorResponse(
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while getting style guide'
        );
      }
    }

    case 'get_complete_the_look': {
      try {
        const validation = safeValidateToolInput('get_complete_the_look', args);
        if (!validation.success) {
          logger.error(`Validation failed for get_complete_the_look: ${formatValidationError(validation.error)}`);
          return createErrorResponse(formatValidationError(validation.error));
        }
        return await handleGetCompleteTheLook(validation.data);
      } catch (error) {
        logger.error(
          `Error getting complete the look: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
        return createErrorResponse(
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while getting complete the look'
        );
      }
    }

    case 'get_visually_similar': {
      try {
        const validation = safeValidateToolInput('get_visually_similar', args);
        if (!validation.success) {
          logger.error(`Validation failed for get_visually_similar: ${formatValidationError(validation.error)}`);
          return createErrorResponse(formatValidationError(validation.error));
        }
        return await handleGetVisuallySimilar(validation.data);
      } catch (error) {
        logger.error(
          `Error getting visually similar products: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
        return createErrorResponse(
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while getting visually similar products'
        );
      }
    }

    case 'track_interaction': {
      try {
        const validation = safeValidateToolInput('track_interaction', args);
        if (!validation.success) {
          logger.error(`Validation failed for track_interaction: ${formatValidationError(validation.error)}`);
          return createErrorResponse(formatValidationError(validation.error));
        }
        return await handleTrackInteraction(validation.data);
      } catch (error) {
        logger.error(
          `Error tracking interaction: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
        return createErrorResponse(
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while tracking interaction'
        );
      }
    }

    case 'update_item_details': {
      try {
        const validation = safeValidateToolInput('update_item_details', args);
        if (!validation.success) {
          logger.error(`Validation failed for update_item_details: ${formatValidationError(validation.error)}`);
          return createErrorResponse(formatValidationError(validation.error));
        }
        return await handleUpdateItemDetails(validation.data);
      } catch (error) {
        logger.error(
          `Error updating item details: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
        return createErrorResponse(
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while updating item details'
        );
      }
    }

    default:
      logger.error(`Unknown tool requested: ${name}`);
      return createErrorResponse(`Unknown tool: ${name}`);
  }
}
