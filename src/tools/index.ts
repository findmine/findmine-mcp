/**
 * Tool definitions for the FindMine MCP server.
 * Contains schemas, metadata, and annotations for all available tools.
 *
 * Tool annotations per MCP spec 2025-11-25:
 * - readOnlyHint: true if tool only reads data, false if it modifies state
 * - destructiveHint: true if tool can delete/destroy data, false otherwise
 * - openWorldHint: true if tool interacts with external services, false if local only
 */

import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Tool annotation type matching MCP SDK expectations
 */
export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
}

/**
 * Tool input schema property type
 */
export interface ToolSchemaProperty {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: ToolSchemaProperty;
  properties?: Record<string, ToolSchemaProperty>;
  required?: string[];
}

/**
 * Tool definition type matching MCP SDK expectations
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, ToolSchemaProperty>;
    required?: string[];
  };
  annotations: ToolAnnotations;
}

/**
 * Style guide tool definition
 */
export const getStyleGuideTool: ToolDefinition = {
  name: 'get_style_guide',
  description: 'Get styling advice and tips for creating effective fashion recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description:
          "Category of styling advice (e.g., 'color_theory', 'body_types', 'casual_outfits', 'formal_outfits', 'seasonal')",
        default: 'general',
      },
      occasion: {
        type: 'string',
        description:
          "Specific occasion to get styling advice for (e.g., 'office', 'wedding', 'date_night', 'casual_friday')",
      },
      fashion_season: {
        type: 'string',
        description:
          "Fashion season to get styling advice for (e.g., 'spring_summer', 'fall_winter', 'resort', 'transition')",
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
};

/**
 * Complete the look tool definition
 */
export const getCompleteTheLookTool: ToolDefinition = {
  name: 'get_complete_the_look',
  description: 'Get outfit recommendations for a product',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'ID of the product',
      },
      product_color_id: {
        type: 'string',
        description: 'Color ID of the product (if applicable)',
      },
      in_stock: {
        type: 'boolean',
        description: 'Whether the product is in stock',
        default: true,
      },
      on_sale: {
        type: 'boolean',
        description: 'Whether the product is on sale',
        default: false,
      },
      customer_id: {
        type: 'string',
        description: 'Customer ID for personalized recommendations',
      },
      customer_gender: {
        type: 'string',
        enum: ['M', 'W', 'U'],
        description: 'Customer gender (M = Men, W = Women, U = Unknown)',
      },
      return_pdp_item: {
        type: 'boolean',
        description: 'Whether to return the original product in the response',
        default: true,
      },
      session_id: {
        type: 'string',
        description: 'Session ID for tracking and personalization',
      },
      api_version: {
        type: 'string',
        description: 'API version to use (overrides FINDMINE_API_VERSION env var)',
      },
    },
    required: ['product_id'],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

/**
 * Visually similar tool definition
 */
export const getVisuallySimilarTool: ToolDefinition = {
  name: 'get_visually_similar',
  description: 'Get visually similar products',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'ID of the product',
      },
      product_color_id: {
        type: 'string',
        description: 'Color ID of the product (if applicable)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of products to return',
        default: 10,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
        default: 0,
      },
      customer_id: {
        type: 'string',
        description: 'Customer ID for personalized recommendations',
      },
      customer_gender: {
        type: 'string',
        enum: ['M', 'W', 'U'],
        description: 'Customer gender (M = Men, W = Women, U = Unknown)',
      },
      session_id: {
        type: 'string',
        description: 'Session ID for tracking and personalization',
      },
      api_version: {
        type: 'string',
        description: 'API version to use (overrides FINDMINE_API_VERSION env var)',
      },
    },
    required: ['product_id'],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
};

/**
 * Track interaction tool definition
 */
export const trackInteractionTool: ToolDefinition = {
  name: 'track_interaction',
  description: 'Track user interaction with a product (requires FINDMINE_ENABLE_TRACKING=true)',
  inputSchema: {
    type: 'object',
    properties: {
      event_type: {
        type: 'string',
        enum: ['view', 'click', 'add_to_cart', 'purchase'],
        description: 'Type of interaction',
      },
      product_id: {
        type: 'string',
        description: 'ID of the product',
      },
      product_color_id: {
        type: 'string',
        description: 'Color ID of the product (if applicable)',
      },
      look_id: {
        type: 'string',
        description: 'ID of the look (if applicable)',
      },
      source_product_id: {
        type: 'string',
        description: 'ID of the source product that led to this interaction',
      },
      price: {
        type: 'number',
        description: 'Price of the product (for purchase events)',
      },
      quantity: {
        type: 'number',
        description: 'Quantity of the product (for purchase events)',
        default: 1,
      },
      customer_id: {
        type: 'string',
        description: 'Customer ID for analytics',
      },
      session_id: {
        type: 'string',
        description: 'Session ID for analytics',
      },
      force_enable: {
        type: 'boolean',
        description: 'Force enable tracking even if disabled by default',
        default: false,
      },
      api_version: {
        type: 'string',
        description: 'API version to use (overrides FINDMINE_API_VERSION env var)',
      },
    },
    required: ['event_type', 'product_id'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
};

/**
 * Update item details tool definition
 */
export const updateItemDetailsTool: ToolDefinition = {
  name: 'update_item_details',
  description:
    'Update item details such as stock status and sale status (requires FINDMINE_ENABLE_ITEM_UPDATES=true)',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'List of items to update',
        items: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'ID of the product',
            },
            product_color_id: {
              type: 'string',
              description: 'Color ID of the product (if applicable)',
            },
            in_stock: {
              type: 'boolean',
              description: 'Whether the product is in stock',
            },
            on_sale: {
              type: 'boolean',
              description: 'Whether the product is on sale',
            },
          },
          required: ['product_id', 'in_stock', 'on_sale'],
        },
      },
      customer_id: {
        type: 'string',
        description: 'Customer ID for analytics',
      },
      session_id: {
        type: 'string',
        description: 'Session ID for analytics',
      },
      force_enable: {
        type: 'boolean',
        description: 'Force enable item updates even if disabled by default',
        default: false,
      },
      api_version: {
        type: 'string',
        description: 'API version to use (overrides FINDMINE_API_VERSION env var)',
      },
    },
    required: ['items'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: true,
  },
};

/**
 * Get all available tool definitions based on feature flags
 */
export function getToolDefinitions(): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    getStyleGuideTool,
    getCompleteTheLookTool,
    getVisuallySimilarTool,
  ];

  // Add tracking tool if enabled
  if (config.features.enableTracking) {
    logger.error('Adding tracking tool - tracking is enabled');
    tools.push(trackInteractionTool);
  } else {
    logger.error('Tracking tool not added - tracking is disabled');
  }

  // Add item details update tool if enabled
  if (config.features.enableItemDetailsUpdates) {
    logger.error('Adding item details update tool - updates are enabled');
    tools.push(updateItemDetailsTool);
  } else {
    logger.error('Item details update tool not added - updates are disabled');
  }

  return tools;
}
