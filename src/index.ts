#!/usr/bin/env node

/**
 * FindMine MCP Server
 * 
 * This server provides MCP access to FindMine's styling and outfitting recommendations.
 * It implements the following features:
 * 
 * Resources:
 * - Products as resources with product:/// URI scheme
 * - Looks (outfits) as resources with look:/// URI scheme
 * 
 * Tools:
 * - get_complete_the_look - Get outfit recommendations for a product
 * - get_visually_similar - Find visually similar products
 * - track_interaction - Track user interactions with products
 * 
 * Prompts:
 * - outfit_completion - Generate a complete outfit based on a product
 */

// Disable all logging to avoid interfering with MCP JSON protocol
// Important: The MCP protocol expects only valid JSON on stdout
const DEBUG_MODE = process.env.FINDMINE_DEBUG === 'true';

// Create a silent logger that only logs in debug mode
// We use process.stderr.write to avoid recursive calls
const logger = {
  log: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) {
      process.stderr.write(`[INFO] ${message} ${args.map(a => String(a)).join(' ')}\n`);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) {
      process.stderr.write(`[ERROR] ${message} ${args.map(a => String(a)).join(' ')}\n`);
    }
  }
};

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { findMineService } from './services/findmine-service.js';
import { 
  createProductUri, 
  createLookUri, 
  parseProductUri,
  parseLookUri,
  ProductResource,
  LookResource
} from './types/mcp.js';
import { 
  productToResourceMetadata, 
  lookToResourceMetadata,
  productToResourceContent,
  lookToResourceContent,
  getProductMimeType,
  getLookMimeType
} from './utils/resource-mapper.js';
import { config } from './config.js';
import { sampleProducts, sampleLooks } from './utils/mock-data.js';

// In development mode, we'll use sample data to populate the store
// In production, data comes from API calls
if (process.env.NODE_ENV === 'development') {
  // Map sample products
  for (const product of sampleProducts) {
    findMineService.getCompleteTheLook(
      product.product_id,
      product.in_stock,
      product.on_sale,
      { returnPdpItem: true }
    );
  }
}

/**
 * Create an MCP server with capabilities for resources, tools, and prompts
 */
const server = new Server(
  {
    name: "FindMine Shopping Stylist",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing available resources.
 * Exposes products and looks as resources.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    logger.error('Listing available resources');
    
    const products = findMineService.getAllProducts();
    const looks = findMineService.getAllLooks();
    
    logger.error(`Found ${products.length} products and ${looks.length} looks`);
    
    const resources = [
      ...products.map(product => productToResourceMetadata(product)),
      ...looks.map(look => lookToResourceMetadata(look))
    ];

    return { 
      success: true,
      resources 
    };
  } catch (error) {
    logger.error(`Error listing resources: ${error instanceof Error ? error.message : String(error)}`, error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred while listing resources',
        code: 'RESOURCE_LIST_ERROR'
      }
    };
  }
});

/**
 * Handler for reading a specific resource.
 * Handles both product:/// and look:/// URI schemes.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const uri = request.params.uri;
    logger.error(`Reading resource: ${uri}`);
    
    if (uri.startsWith('product://')) {
      // Handle product resource
      const { productId, colorId } = parseProductUri(uri);
      const product = findMineService.getProduct(productId);
      
      if (!product) {
        logger.error(`Product not found: ${productId}`);
        return {
          error: {
            message: `Product ${productId} not found`,
            code: 'RESOURCE_NOT_FOUND'
          }
        };
      }

      return {
        success: true,
        contents: [productToResourceContent(product, uri)]
      };
    } else if (uri.startsWith('look://')) {
      // Handle look resource
      const { lookId } = parseLookUri(uri);
      const look = findMineService.getLook(lookId);
      
      if (!look) {
        logger.error(`Look not found: ${lookId}`);
        return {
          error: {
            message: `Look ${lookId} not found`,
            code: 'RESOURCE_NOT_FOUND'
          }
        };
      }

      return {
        success: true,
        contents: [lookToResourceContent(look, uri)]
      };
    } else {
      logger.error(`Unsupported URI scheme: ${uri}`);
      return {
        error: {
          message: `Unsupported resource URI scheme: ${uri}`,
          code: 'INVALID_URI_SCHEME'
        }
      };
    }
  } catch (error) {
    logger.error(`Error reading resource: ${error instanceof Error ? error.message : String(error)}`, error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred while reading resource',
        code: 'RESOURCE_READ_ERROR'
      }
    };
  }
});

/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    logger.error('Listing available tools');
    
    const tools = [
      {
        name: "get_style_guide",
        description: "Get styling advice and tips for creating effective fashion recommendations",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Category of styling advice (e.g., 'color_theory', 'body_types', 'casual_outfits', 'formal_outfits', 'seasonal')",
              default: "general"
            },
            occasion: {
              type: "string",
              description: "Specific occasion to get styling advice for (e.g., 'office', 'wedding', 'date_night', 'casual_friday')"
            },
            fashion_season: {
              type: "string",
              description: "Fashion season to get styling advice for (e.g., 'spring_summer', 'fall_winter', 'resort', 'transition')"
            }
          }
        }
      },
      {
        name: "get_complete_the_look",
        description: "Get outfit recommendations for a product",
        inputSchema: {
          type: "object",
          properties: {
            product_id: {
              type: "string",
              description: "ID of the product"
            },
            product_color_id: {
              type: "string",
              description: "Color ID of the product (if applicable)"
            },
            in_stock: {
              type: "boolean",
              description: "Whether the product is in stock",
              default: true
            },
            on_sale: {
              type: "boolean",
              description: "Whether the product is on sale",
              default: false
            },
            customer_id: {
              type: "string",
              description: "Customer ID for personalized recommendations"
            },
            customer_gender: {
              type: "string",
              enum: ["M", "W", "U"],
              description: "Customer gender (M = Men, W = Women, U = Unknown)"
            },
            return_pdp_item: {
              type: "boolean",
              description: "Whether to return the original product in the response",
              default: true
            },
            session_id: {
              type: "string",
              description: "Session ID for tracking and personalization"
            },
            api_version: {
              type: "string",
              description: "API version to use (overrides FINDMINE_API_VERSION env var)"
            }
          },
          required: ["product_id"]
        }
      },
      {
        name: "get_visually_similar",
        description: "Get visually similar products",
        inputSchema: {
          type: "object",
          properties: {
            product_id: {
              type: "string",
              description: "ID of the product"
            },
            product_color_id: {
              type: "string",
              description: "Color ID of the product (if applicable)"
            },
            limit: {
              type: "number",
              description: "Maximum number of products to return",
              default: 10
            },
            offset: {
              type: "number",
              description: "Offset for pagination",
              default: 0
            },
            customer_id: {
              type: "string",
              description: "Customer ID for personalized recommendations"
            },
            customer_gender: {
              type: "string",
              enum: ["M", "W", "U"],
              description: "Customer gender (M = Men, W = Women, U = Unknown)"
            },
            session_id: {
              type: "string",
              description: "Session ID for tracking and personalization"
            },
            api_version: {
              type: "string",
              description: "API version to use (overrides FINDMINE_API_VERSION env var)"
            }
          },
          required: ["product_id"]
        }
      }
    ];

    // Add tracking tool if enabled
    if (config.features.enableTracking) {
      logger.error('Adding tracking tool - tracking is enabled');
      tools.push({
        name: "track_interaction",
        description: "Track user interaction with a product (requires FINDMINE_ENABLE_TRACKING=true)",
        inputSchema: {
          type: "object",
          properties: {
            event_type: {
              type: "string",
              enum: ["view", "click", "add_to_cart", "purchase"],
              description: "Type of interaction"
            },
            product_id: {
              type: "string",
              description: "ID of the product"
            },
            product_color_id: {
              type: "string",
              description: "Color ID of the product (if applicable)"
            },
            look_id: {
              type: "string",
              description: "ID of the look (if applicable)"
            },
            source_product_id: {
              type: "string",
              description: "ID of the source product that led to this interaction"
            },
            price: {
              type: "number",
              description: "Price of the product (for purchase events)"
            },
            quantity: {
              type: "number",
              description: "Quantity of the product (for purchase events)",
              default: 1
            },
            customer_id: {
              type: "string",
              description: "Customer ID for analytics"
            },
            session_id: {
              type: "string",
              description: "Session ID for analytics"
            },
            force_enable: {
              type: "boolean",
              description: "Force enable tracking even if disabled by default",
              default: false
            },
            api_version: {
              type: "string",
              description: "API version to use (overrides FINDMINE_API_VERSION env var)"
            }
          },
          required: ["event_type", "product_id"]
        }
      } as any);
    } else {
      logger.error('Tracking tool not added - tracking is disabled');
    }

    // Add item details update tool if enabled
    if (config.features.enableItemDetailsUpdates) {
      logger.error('Adding item details update tool - updates are enabled');
      tools.push({
        name: "update_item_details",
        description: "Update item details such as stock status and sale status (requires FINDMINE_ENABLE_ITEM_UPDATES=true)",
        inputSchema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              description: "List of items to update",
              items: {
                type: "object",
                properties: {
                  product_id: {
                    type: "string",
                    description: "ID of the product"
                  },
                  product_color_id: {
                    type: "string",
                    description: "Color ID of the product (if applicable)"
                  },
                  in_stock: {
                    type: "boolean",
                    description: "Whether the product is in stock"
                  },
                  on_sale: {
                    type: "boolean",
                    description: "Whether the product is on sale"
                  }
                },
                required: ["product_id", "in_stock", "on_sale"]
              }
            },
            customer_id: {
              type: "string",
              description: "Customer ID for analytics"
            },
            session_id: {
              type: "string",
              description: "Session ID for analytics"
            },
            force_enable: {
              type: "boolean",
              description: "Force enable item updates even if disabled by default",
              default: false
            },
            api_version: {
              type: "string",
              description: "API version to use (overrides FINDMINE_API_VERSION env var)"
            }
          },
          required: ["items"]
        }
      } as any);
    } else {
      logger.error('Item details update tool not added - updates are disabled');
    }

    logger.error(`Returning ${tools.length} available tools`);
    return { 
      success: true,
      tools 
    };
  } catch (error) {
    logger.error(`Error listing tools: ${error instanceof Error ? error.message : String(error)}`, error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred while listing tools',
        code: 'TOOL_LIST_ERROR'
      }
    };
  }
});

/**
 * Handler for tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_style_guide": {
      try {
        const args = request.params.arguments as any;
        return handleGetStyleGuide(args);
      } catch (error) {
        logger.error(`Error getting style guide: ${error instanceof Error ? error.message : String(error)}`, error);
        return {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred while getting style guide',
            code: 'STYLE_GUIDE_ERROR'
          }
        };
      }
    }
    
    case "get_complete_the_look": {
      try {
        const args = request.params.arguments as any;
        
        // Extract and validate required parameters
        const productId = args.product_id;
        if (!productId) {
          logger.error('Missing required parameter: product_id');
          return {
            error: {
              message: "Product ID is required",
              code: "VALIDATION_ERROR"
            }
          };
        }
        
        // Set defaults for optional parameters with explicit declaration
        const inStock = args.in_stock ?? true; // Using nullish coalescing
        const onSale = args.on_sale ?? false;
        const returnPdpItem = args.return_pdp_item ?? true;
        const colorId = args.product_color_id;
        const sessionId = args.session_id;
        const customerId = args.customer_id;
        // Don't pass gender by default - this parameter should be explicitly set only when needed
        const gender = args.customer_gender !== undefined ? args.customer_gender : undefined;
        const apiVersion = args.api_version;
        
        logger.error(`Getting complete the look for product ${productId}${colorId ? ` (color: ${colorId})` : ''}`);
        
        // Get complete the look recommendations
        const result = await findMineService.getCompleteTheLook(
          productId,
          inStock,
          onSale,
          {
            colorId,
            sessionId,
            customerId,
            returnPdpItem,
            gender,
            apiVersion,
          }
        );

        // Safety check for result.looks
        if (!result.looks || !Array.isArray(result.looks)) {
          return {
            error: {
              message: "Received invalid response from FindMine service: looks array missing",
              code: "INVALID_RESPONSE"
            }
          };
        }
          
        // Process looks data with null safety
        const lookItems = result.looks.map(look => {
          if (!look || !look.id) {
            return null; // Skip invalid looks
          }
          
          const lookUri = createLookUri(look.id);
          
          return {
            look_id: look.id,
            title: look.title || "",
            description: look.description || "",
            image_url: look.imageUrl || "",
            products: Array.isArray(look.productIds) ? look.productIds.map(pid => {
              if (!pid) return null;
              const product = findMineService.getProduct(pid);
              const productUri = product ? createProductUri(product.id, product.colorId) : null;
              
              return {
                product_id: pid,
                name: product?.name || "",
                uri: productUri,
              };
            }).filter(Boolean) : [], // Remove null products and handle missing productIds
            uri: lookUri,
          };
        }).filter(Boolean); // Remove null looks

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

        // Return success response with structured data
        return {
          success: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              product: productInfo,
              looks: lookItems,
              total_looks: lookItems.length,
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error getting complete the look: ${error instanceof Error ? error.message : String(error)}`, error);
        return {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred while getting complete the look',
            code: 'COMPLETE_THE_LOOK_ERROR'
          }
        };
      }
    }

    case "get_visually_similar": {
      try {
        const args = request.params.arguments as any;
        
        // Extract and validate required parameters
        const productId = args.product_id;
        if (!productId) {
          logger.error('Missing required parameter: product_id');
          return {
            error: {
              message: "Product ID is required",
              code: "VALIDATION_ERROR"
            }
          };
        }
        
        // Set defaults for optional parameters
        const limit = args.limit ?? 10;
        const offset = args.offset ?? 0;
        const colorId = args.product_color_id;
        const sessionId = args.session_id;
        const customerId = args.customer_id;
        // Don't pass gender by default - this parameter should be explicitly set only when needed
        const gender = args.customer_gender !== undefined ? args.customer_gender : undefined;
        const apiVersion = args.api_version;
        
        logger.error(`Getting visually similar products for ${productId}, limit: ${limit}, offset: ${offset}`);

        // Get visually similar products
        const result = await findMineService.getVisuallySimilar(
          productId,
          {
            colorId,
            sessionId,
            customerId,
            limit,
            offset,
            gender,
            apiVersion,
          }
        );

        // Process products data
        const productItems = result.products.map(product => {
          const productUri = createProductUri(product.id, product.colorId);
          
          return {
            product_id: product.id,
            name: product.name,
            uri: productUri,
          };
        });

        // Return success response with structured data
        return {
          success: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              products: productItems,
              total: result.total,
              limit,
              offset,
              source_product_id: productId,
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error getting visually similar products: ${error instanceof Error ? error.message : String(error)}`, error);
        return {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred while getting visually similar products',
            code: 'VISUALLY_SIMILAR_ERROR'
          }
        };
      }
    }

    case "track_interaction": {
      try {
        const args = request.params.arguments as any;
        
        // Extract and validate parameters
        const forceEnable = args.force_enable === true;
        const eventType = args.event_type as 'view' | 'click' | 'add_to_cart' | 'purchase';
        const productId = args.product_id;
        
        // Check if tracking is enabled or forced
        if (!config.features.enableTracking && !forceEnable) {
          logger.error('Tracking is disabled and force_enable is not set');
          return {
            error: {
              message: "Tracking is disabled. Set FINDMINE_ENABLE_TRACKING=true or use force_enable=true to enable it.",
              code: "TRACKING_DISABLED"
            }
          };
        }
        
        // Validate required parameters
        if (!eventType) {
          logger.error('Missing required parameter: event_type');
          return {
            error: {
              message: "Event type is required",
              code: "VALIDATION_ERROR"
            }
          };
        }
        
        if (!productId) {
          logger.error('Missing required parameter: product_id');
          return {
            error: {
              message: "Product ID is required",
              code: "VALIDATION_ERROR"
            }
          };
        }
        
        // Set up optional parameters
        const colorId = args.product_color_id;
        const lookId = args.look_id;
        const sourceProductId = args.source_product_id;
        const price = args.price;
        const quantity = args.quantity ?? 1;
        const sessionId = args.session_id;
        const customerId = args.customer_id;
        const apiVersion = args.api_version;
        
        logger.error(`Tracking ${eventType} event for product ${productId}`);

        // Track the event
        const result = await findMineService.trackEvent(
          eventType,
          productId,
          {
            colorId,
            lookId,
            sourceProductId,
            price,
            quantity,
            sessionId,
            customerId,
            apiVersion,
          }
        );

        // Return success response
        return {
          success: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              success: result.success,
              event_id: result.event_id,
              event_type: eventType,
              product_id: productId,
              timestamp: new Date().toISOString(),
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error tracking interaction: ${error instanceof Error ? error.message : String(error)}`, error);
        return {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred while tracking interaction',
            code: 'TRACKING_ERROR'
          }
        };
      }
    }

    case "update_item_details": {
      try {
        const args = request.params.arguments as any;
        
        // Extract and validate parameters
        const forceEnable = args.force_enable === true;
        const items = args.items;
        
        // Check if item details updates are enabled or forced
        if (!config.features.enableItemDetailsUpdates && !forceEnable) {
          logger.error('Item details updates are disabled and force_enable is not set');
          return {
            error: {
              message: "Item details updates are disabled. Set FINDMINE_ENABLE_ITEM_UPDATES=true or use force_enable=true to enable it.",
              code: "UPDATES_DISABLED"
            }
          };
        }
        
        // Validate required parameters
        if (!items || !Array.isArray(items) || items.length === 0) {
          logger.error('Items array is required and must not be empty');
          return {
            error: {
              message: "Items array is required and must not be empty",
              code: "VALIDATION_ERROR"
            }
          };
        }
        
        // Set up optional parameters
        const sessionId = args.session_id;
        const customerId = args.customer_id;
        const apiVersion = args.api_version;
        
        logger.error(`Updating details for ${items.length} items`);
        
        // Validate each item has required fields
        const invalidItems = items.filter(item => 
          !item.product_id || 
          typeof item.in_stock !== 'boolean' || 
          typeof item.on_sale !== 'boolean'
        );
        
        if (invalidItems.length > 0) {
          logger.error(`Found ${invalidItems.length} invalid items in update request`);
          return {
            error: {
              message: "All items must have product_id, in_stock (boolean) and on_sale (boolean)",
              code: "VALIDATION_ERROR",
              invalid_items: invalidItems.map(item => item.product_id || 'unknown')
            }
          };
        }

        // Map the items to the format expected by the service
        const mappedItems = items.map(item => ({
          productId: item.product_id,
          colorId: item.product_color_id,
          inStock: item.in_stock,
          onSale: item.on_sale,
        }));

        // Update item details
        const result = await findMineService.updateItemDetails(
          mappedItems,
          {
            sessionId,
            customerId,
            apiVersion,
          }
        );

        // Return success response
        return {
          success: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              success: result.success,
              updated_count: result.updated_count,
              failed_count: result.failed_count,
              failures: result.failures,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error updating item details: ${error instanceof Error ? error.message : String(error)}`, error);
        return {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred while updating item details',
            code: 'UPDATE_ERROR'
          }
        };
      }
    }

    default:
      logger.error(`Unknown tool requested: ${request.params.name}`);
      return {
        error: {
          message: `Unknown tool: ${request.params.name}`,
          code: 'UNKNOWN_TOOL'
        }
      };
  }
});

/**
 * Handler that lists available prompts.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  try {
    logger.error('Listing available prompts');
    
    const prompts = [
      {
        name: "outfit_completion",
        description: "Get styling advice and complete outfit for a product",
      },
      {
        name: "styling_guide",
        description: "Get guidelines for providing effective fashion and styling advice",
      },
      {
        name: "findmine_help",
        description: "Learn how to use FindMine's tools and resources effectively",
      }
    ];
    
    logger.error(`Returning ${prompts.length} available prompts`);
    return {
      success: true,
      prompts
    };
  } catch (error) {
    logger.error(`Error listing prompts: ${error instanceof Error ? error.message : String(error)}`, error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred while listing prompts',
        code: 'PROMPT_LIST_ERROR'
      }
    };
  }
});

/**
 * Handler for prompts.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  try {
    logger.error(`Getting prompt: ${request.params.name}`);
    
    switch (request.params.name) {
      case "outfit_completion": {
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
              message: "Sample product or look not found",
              code: "RESOURCE_NOT_FOUND"
            }
          };
        }

        const productUri = createProductUri(productResource.id, productResource.colorId);
        const lookUri = createLookUri(lookResource.id);

        return {
          success: true,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "I'm looking for outfit ideas for this product:"
              }
            },
            {
              role: "user",
              content: {
                type: "resource",
                resource: {
                  uri: productUri,
                  mimeType: getProductMimeType(),
                  text: JSON.stringify(productResource, null, 2)
                }
              }
            },
            {
              role: "user",
              content: {
                type: "text",
                text: "Here's a recommended complete outfit:"
              }
            },
            {
              role: "user",
              content: {
                type: "resource",
                resource: {
                  uri: lookUri,
                  mimeType: getLookMimeType(),
                  text: JSON.stringify(lookResource, null, 2)
                }
              }
            },
            {
              role: "user",
              content: {
                type: "text",
                text: "Please explain why these items work well together and provide styling advice for this outfit. Include information about color coordination, occasion appropriateness, and pricing (use the formattedPrice or formattedSalePrice fields for accurate price display). Include any other relevant fashion tips for the customer."
              }
            }
          ]
        };
      }
      
      case "styling_guide": {
        return {
          success: true,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "I need guidance on how to provide effective fashion and styling advice to customers. Please provide a comprehensive style guide."
              }
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `Please create a detailed style guide that covers:

1. **Understanding Customer Needs**
   - How to analyze a customer's expressed preferences and style desires
   - Techniques for recommending items that match their personal style
   - How to tailor advice for different body types and skin tones

2. **Creating Cohesive Outfits**
   - Color theory and coordination principles
   - Pattern mixing guidelines
   - Balancing proportions and silhouettes
   - How to create versatile outfits for different occasions

3. **Describing Product Features Effectively**
   - Highlighting quality and craftsmanship
   - Explaining fabric properties and benefits
   - Describing fit and comfort factors

4. **Price Sensitivity Guidance**
   - How to discuss pricing in a helpful way
   - Value-based selling techniques
   - When to emphasize investment pieces vs. affordable options

5. **Seasonal Styling Tips**
   - Transitional dressing advice
   - Layering techniques
   - Weather-appropriate recommendations

6. **FindMine Specific Guidelines**
   - Discussing related products naturally
   - Explaining why items complement each other
   - Creating a cohesive brand voice in styling advice

Please format this guide in a way that would be helpful for someone providing fashion styling advice to customers.`
              }
            }
          ]
        };
      }
      
      case "findmine_help": {
        return {
          success: true,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "I need help understanding how to use FindMine's MCP tools and resources. Please provide a guide."
              }
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `# FindMine MCP Usage Guide

## Available Resources

FindMine exposes two types of resources:

1. **Products** (URI scheme: \`product:///\`)
   - Product details including name, description, price, and images
   - Access a product using its ID: \`product:///P12345\`
   - Products include formatted prices in the \`formattedPrice\` and \`formattedSalePrice\` fields

2. **Looks/Outfits** (URI scheme: \`look:///\`)
   - Complete outfit recommendations containing multiple products
   - Access a look using its ID: \`look:///L1001\`
   - Each look contains references to its component products

## Available Tools

1. **get_complete_the_look**
   - Purpose: Get outfit recommendations for a specific product
   - Required parameters: \`product_id\`
   - Optional parameters: \`in_stock\`, \`on_sale\`, \`product_color_id\`, \`api_version\`
   - Returns: A collection of looks/outfits containing the original product and complementary items

2. **get_visually_similar**
   - Purpose: Find products that are visually similar to a specified product
   - Required parameters: \`product_id\`
   - Optional parameters: \`limit\`, \`offset\`, \`product_color_id\`, \`api_version\`
   - Returns: A collection of products with similar visual characteristics

## Available Prompts

1. **outfit_completion**
   - Purpose: Get styling advice for a complete outfit based on a product
   - Provides context about the product and recommended outfits
   - Returns: Styling advice explaining why items work well together

2. **styling_guide**
   - Purpose: Get guidelines for providing effective fashion and styling advice
   - Offers a comprehensive guide to fashion styling principles
   - Returns: A detailed style guide for creating effective fashion recommendations

3. **findmine_help** (this prompt)
   - Purpose: Learn how to use FindMine's tools and resources
   - Provides documentation on available features and how to use them

## Tips for Effective Usage

1. When discussing prices, always use the \`formattedPrice\` or \`formattedSalePrice\` fields to ensure proper formatting
2. Combine \`get_complete_the_look\` with styling advice to create comprehensive outfit recommendations
3. Use \`get_visually_similar\` to offer alternatives when a product is out of stock
4. Reference the style guide when providing fashion advice to ensure consistency and quality`
              }
            }
          ]
        };
      }
      
      default:
        logger.error(`Unknown prompt requested: ${request.params.name}`);
        return {
          error: {
            message: `Unknown prompt: ${request.params.name}`,
            code: 'UNKNOWN_PROMPT'
          }
        };
    }
  } catch (error) {
    logger.error(`Error retrieving prompt: ${error instanceof Error ? error.message : String(error)}`, error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred while retrieving prompt',
        code: 'PROMPT_ERROR'
      }
    };
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  logger.error(`FindMine Shopping Stylist MCP server v0.1.0 starting in ${process.env.NODE_ENV || 'production'} mode`);
  
  // Log configuration and feature flags
  logger.error(`API URL: ${config.findmine.apiBaseUrl}`);
  logger.error(`Application ID: ${config.findmine.applicationId}`);
  logger.error(`API Version: ${config.findmine.apiVersion}`);
  logger.error(`Caching: ${config.cache.enabled ? 'Enabled' : 'Disabled'} (TTL: ${config.cache.ttlMs}ms)`);
  logger.error(`Tracking Enabled: ${config.features.enableTracking}`);
  logger.error(`Item Updates Enabled: ${config.features.enableItemDetailsUpdates}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  // Always log server startup errors to stderr regardless of debug mode
  console.error("Server error:", error);
  process.exit(1);
});

/**
 * Handles the get_style_guide tool request
 * @param args - Tool arguments
 * @returns Response with style guide content
 */
function handleGetStyleGuide(args: any) {
  // Extract and validate parameters with defaults
  const category = args.category ?? 'general';
  const occasion = args.occasion;
  const fashion_season = args.fashion_season;
  
  logger.error(`Getting style guide for category: ${category}${occasion ? `, occasion: ${occasion}` : ''}${fashion_season ? `, season: ${fashion_season}` : ''}`);
  
  let styleGuidePrompt = `Provide detailed styling advice`;
  
  if (category !== 'general') {
    styleGuidePrompt += ` about ${category.replace(/_/g, ' ')}`;
  }
  
  if (occasion) {
    styleGuidePrompt += ` for ${occasion.replace(/_/g, ' ')} occasions`;
  }
  
  if (fashion_season) {
    styleGuidePrompt += ` during ${fashion_season.replace(/_/g, ' ')}`;
  }
  
  // Create style guides for different categories
  const styleGuides: Record<string, string> = {
    general: `# General Style Guide
    
## Understanding Customer Needs
- Listen carefully to what the customer is looking for
- Consider their personal style, body type, and preferences
- Ask about specific occasions they're shopping for
- Look for cues about their comfort level with different styles

## Creating Cohesive Outfits
- Balance proportions (fitted with loose)
- Create visual interest with textures and layers
- Ensure color harmony across the outfit
- Consider the visual weight of different pieces

## Color Theory Basics
- Complementary colors create vibrant looks (opposites on the color wheel)
- Analogous colors create harmonious looks (neighbors on the color wheel)
- Neutrals (black, white, gray, beige) work with almost everything
- Consider the customer's skin tone when recommending colors

## Accessorizing
- Use accessories to add personal style to basic outfits
- Consider scale - smaller accessories for petite frames, bolder pieces for larger frames
- Balance statement pieces with simpler items
- Ensure metals coordinate (gold, silver, rose gold)

## Seasonal Considerations
- Layer pieces for transitional seasons
- Consider fabric weight and texture for different weather conditions
- Adapt color palettes to seasonal trends
- Recommend versatile pieces that work across seasons when possible`,

    color_theory: `# Color Theory Style Guide

## Color Wheel Basics
- Primary colors: Red, blue, yellow
- Secondary colors: Green, purple, orange
- Tertiary colors: Combinations of primary and secondary

## Color Combinations
- Complementary: Opposite on the color wheel (blue/orange, red/green)
- Analogous: Next to each other on the wheel (blue/teal/green)
- Triadic: Equally spaced around the wheel (red/yellow/blue)
- Monochromatic: Different shades of the same color

## Skin Tone Considerations
- Warm undertones: Gold jewelry looks better, colors like coral, olive, cream
- Cool undertones: Silver jewelry looks better, colors like blue, purple, true white
- Neutral undertones: Can wear most colors successfully

## Color Psychology
- Red: Energy, passion, attention-grabbing
- Blue: Calm, trust, professionalism
- Green: Growth, freshness, wealth
- Black: Sophistication, formality, slimming
- White: Purity, simplicity, cleanliness

## Practical Applications
- Use color blocking for bold, modern looks
- Create focal points with bright accent colors
- Use neutrals as a base for versatile wardrobes
- Create depth with different shades of the same color family`,

    body_types: `# Body Types Style Guide

## Common Body Types

### Apple Shape
- Carries weight around the middle
- Often has slender legs and arms
- Style goals: Define waistline, elongate the torso

#### Recommendations:
- V-neck tops to draw the eye up and down
- Empire waist dresses and tops
- Straight or bootcut pants
- A-line skirts and dresses
- Structured jackets that hit at the hip

### Pear Shape
- Narrower shoulders and upper body
- Wider hips and thighs
- Style goals: Balance upper and lower body

#### Recommendations:
- Boat neck and off-shoulder tops to broaden shoulders
- A-line skirts that skim over hips
- Dark colors on bottom, brighter on top
- Statement necklaces to draw attention up
- Fit and flare dresses

### Hourglass Shape
- Balanced shoulders and hips with defined waist
- Style goals: Highlight natural curves

#### Recommendations:
- Wrap dresses and tops
- Belt to accentuate waist
- Fitted clothing that follows natural curves
- High-waisted bottoms
- Pencil skirts

### Rectangle Shape
- Similar measurements at shoulders, waist, and hips
- Style goals: Create curves and definition

#### Recommendations:
- Peplum tops to create waist definition
- Layered looks to add dimension
- Tops with embellishments or details
- Belt at the waist to create definition
- Full or A-line skirts to create curves

### Inverted Triangle Shape
- Broader shoulders and narrower hips
- Style goals: Balance upper and lower body

#### Recommendations:
- A-line and full skirts to add volume to lower body
- Avoid boat necks and halter tops
- Draw attention to the waist and lower body
- V-necks and scoop necks to soften shoulders
- Darker colors on top, lighter on bottom

## General Tips
- Focus on fit above all else
- Use color and pattern strategically to highlight or minimize areas
- Consider scale of prints based on body size
- Tailoring can transform fit issues
- Dress for your current size, not aspirational sizes`,

    casual_outfits: `# Casual Outfit Style Guide

## Everyday Casual
- Jeans + T-shirt + sneakers: The classic casual foundation
- Elevated with: Quality materials, proper fit, thoughtful accessories
- Key pieces: Well-fitting jeans, solid and striped tees, clean sneakers

## Smart Casual
- Blending casual and dressier elements
- Women: Dark jeans + blouse + ankle boots or flats
- Men: Chinos + button-down or polo + loafers or clean sneakers
- Key accessories: Watch, simple jewelry, leather belt

## Athleisure
- Athletic wear styled for everyday wear
- Leggings or joggers + fitted tee or tank + structured jacket
- Focus on: High-quality fabrics, monochromatic color schemes
- Avoid: Worn workout shoes, actual gym clothes

## Weekend Casual
- Comfort-focused but still put-together
- Boyfriend jeans + oversized sweater + ankle boots
- Cargo pants + hoodie + sneakers
- Layer with: Denim jacket, field jacket, or cardigan

## Casual for Different Settings

### Coffee Shop
- Jeans + sweater + ankle boots
- Add a scarf or statement bag for personality

### Shopping
- Comfortable shoes (white sneakers, loafers)
- Easy-to-remove layers for trying on clothes
- Crossbody bag to keep hands free

### Casual Lunch
- Elevated jeans outfit
- Casual dress with sneakers
- Button-down with sleeves rolled up

## Casual Don'ts
- Avoid clothing that's too large or baggy
- No stained or visibly worn items
- Avoid overly revealing clothing in public settings
- Don't mix too many bold patterns in one casual look`,

    formal_outfits: `# Formal Outfit Style Guide

## Black Tie Events
- Women: Floor-length gown, elegant cocktail dress
- Men: Tuxedo, formal black suit with bow tie
- Accessories: Fine jewelry, formal watch, cufflinks
- Shoes: Formal heels, patent leather shoes

## White Tie Events
- Women: Ball gown, opera-length gloves
- Men: Tailcoat, white bow tie, white waistcoat
- Extremely formal and traditional

## Cocktail Attire
- Women: Knee-length cocktail dress, dressy separates
- Men: Dark suit with tie, dress shirt with slacks
- More flexible than black tie but still elegant

## Business Formal
- Women: Tailored suit, conservative dress with jacket
- Men: Business suit with tie, polished dress shoes
- Colors: Navy, charcoal, black, subtle patterns
- Accessories: Minimal, high-quality, not distracting

## Semi-Formal
- Women: Cocktail dress, dressy skirt and top
- Men: Dark suit, no tie required, dress shirt
- More relaxed than formal but still sophisticated

## Formal Do's & Don'ts

### Do's
- Invest in proper tailoring
- Choose high-quality fabrics
- Keep accessories elegant and understated
- Consider the venue and time of day (lighter colors for day events)

### Don'ts
- Avoid casual fabrics (denim, cotton t-shirts)
- Don't wear overly revealing styles for business or traditional events
- Avoid wrinkled or ill-fitting garments
- Don't over-accessorize formal looks`,

    seasonal: `# Seasonal Style Guide

## Spring/Summer

### Spring Transition
- Lightweight layers: cardigans, light jackets, scarves
- Begin incorporating brighter colors
- Mix winter pieces with lighter items
- Fabrics: Light wool, cotton, lighter denim

### Summer
- Breathable fabrics: Linen, cotton, rayon
- Lighter colors and pastels
- Protection pieces: Wide-brimmed hats, lightweight long sleeves
- Proper fit: Allow for airflow in hot weather

## Fall/Winter

### Fall Transition
- Begin layering: Light jackets, cardigans, light scarves
- Rich, warm colors: Burgundy, mustard, olive
- Mix summer pieces with warmer layers
- Ankle boots, closed-toe shoes

### Winter
- Focus on warmth and layering
- Base layers, insulating middle layers, protective outer layers
- Fabrics: Wool, cashmere, down, heavy cotton, corduroy
- Accessories: Scarves, gloves, hats, warm socks

## Resort Wear
- Lightweight, packable pieces
- Wrinkle-resistant fabrics
- Multi-purpose items that dress up or down
- Sun protection pieces: Hats, cover-ups, light layers

## Transitional Dressing Tips
- Invest in layering pieces that work across seasons
- Use accessories to transition outfits between seasons
- Consider fabric weight rather than just style
- Keep a few season-spanning neutral pieces in rotation

## Seasonal Color Palettes
- Spring: Pastels, soft colors, light neutrals
- Summer: Bright colors, white, nautical themes
- Fall: Earth tones, jewel tones, warm neutrals
- Winter: Deep colors, rich jewel tones, black and white`,
  };
  
  // Get the appropriate style guide
  let styleGuideContent = styleGuides[category] || styleGuides.general;
  
  // Add occasion-specific advice if requested
  if (occasion) {
    const occasionFormatted = occasion.replace(/_/g, ' ');
    styleGuideContent += `\n\n## ${occasionFormatted.charAt(0).toUpperCase() + occasionFormatted.slice(1)} Specific Advice
- Consider the venue and time of day
- Think about appropriate level of formality
- Choose colors that suit the occasion
- Accessorize appropriately
- Consider practical concerns (comfort, weather, activities)`;
  }
  
  // Add seasonal advice if requested
  if (fashion_season) {
    const seasonFormatted = fashion_season.replace(/_/g, ' ');
    styleGuideContent += `\n\n## ${seasonFormatted.charAt(0).toUpperCase() + seasonFormatted.slice(1)} Fashion Tips
- Focus on seasonal appropriate fabrics
- Incorporate seasonal color trends
- Layer appropriately for the weather
- Consider seasonal occasions and activities
- Adapt basic style principles to seasonal needs`;
  }

  return {
    success: true,
    content: [{
      type: "text",
      text: styleGuideContent
    }]
  };
}
