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
 * - get_style_guide - Get styling advice and tips
 * - track_interaction - Track user interactions with products
 * - update_item_details - Update item stock/sale status
 *
 * Prompts:
 * - outfit_completion - Generate a complete outfit based on a product
 * - styling_guide - Get fashion styling guidelines
 * - findmine_help - Learn how to use FindMine tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type ServerResult,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from './utils/logger.js';
import { config } from './config.js';
import { findMineService } from './services/findmine-service.js';
import { sampleProducts } from './utils/mock-data.js';

// Handlers
import { handleListResources, handleReadResource } from './handlers/resources.js';
import { handleListTools, handleCallTool } from './handlers/tools.js';
import { handleListPrompts, handleGetPrompt } from './handlers/prompts.js';

// In development mode, use sample data to populate the store
if (process.env.NODE_ENV === 'development') {
  for (const product of sampleProducts) {
    void findMineService.getCompleteTheLook(product.product_id, product.in_stock, product.on_sale, {
      returnPdpItem: true,
    });
  }
}

/**
 * Create an MCP server with capabilities for resources, tools, and prompts
 * Note: Using low-level Server class for setRequestHandler pattern
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
const server = new Server(
  {
    name: 'FindMine Shopping Stylist',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, handleListResources as () => ServerResult);
server.setRequestHandler(ReadResourceRequestSchema, (request) =>
  handleReadResource(request.params.uri) as ServerResult
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, handleListTools as () => ServerResult);
server.setRequestHandler(CallToolRequestSchema, (request) =>
  handleCallTool(request.params.name, request.params.arguments ?? {}) as Promise<ServerResult>
);

// Register prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, handleListPrompts as () => ServerResult);
server.setRequestHandler(GetPromptRequestSchema, (request) =>
  handleGetPrompt(request.params.name) as ServerResult
);

/**
 * Start the server using stdio transport.
 */
async function main(): Promise<void> {
  logger.error(
    `FindMine Shopping Stylist MCP server v0.1.0 starting in ${process.env.NODE_ENV ?? 'production'} mode`
  );

  // Log configuration and feature flags
  logger.error(`API URL: ${config.findmine.apiBaseUrl}`);
  logger.error(`Application ID: ${config.findmine.applicationId}`);
  logger.error(`API Version: ${config.findmine.apiVersion ?? 'default'}`);
  logger.error(
    `Caching: ${config.cache.enabled ? 'Enabled' : 'Disabled'} (TTL: ${String(config.cache.ttlMs)}ms)`
  );
  logger.error(`Tracking Enabled: ${String(config.features.enableTracking)}`);
  logger.error(`Item Updates Enabled: ${String(config.features.enableItemDetailsUpdates)}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  // Always log server startup errors to stderr regardless of debug mode
  console.error('Server error:', error);
  process.exit(1);
});
