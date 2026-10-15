#!/usr/bin/env node

/**
 * FindMine MCP server — stdio entry point (the `findmine-mcp` bin).
 *
 * `serveStdio` owns the transport and negotiates the protocol era per connection
 * (2025-11-25 `initialize` or 2026-07-28 `server/discover`) from one factory.
 * stdout is the JSON-RPC channel: log to stderr only.
 */

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { SERVER_VERSION, createFindMineDeps, createFindMineServer } from './server.js';
import { logger } from './utils/logger.js';

const deps = createFindMineDeps();
const { config } = deps;

logger.error(`FindMine MCP server v${SERVER_VERSION} starting on stdio`);
logger.error(`API URL: ${config.findmine.apiBaseUrl}`);
logger.error(`Application ID: ${config.findmine.applicationId}`);
logger.error(`API Version: ${config.findmine.apiVersion ?? 'default'}`);
logger.error(
  `Caching: ${config.cache.enabled ? 'Enabled' : 'Disabled'} (TTL: ${String(config.cache.ttlMs)}ms)`
);
logger.error(`Tracking Enabled: ${String(config.features.enableTracking)}`);
logger.error(`Item Updates Enabled: ${String(config.features.enableItemDetailsUpdates)}`);

serveStdio(() => createFindMineServer(deps), {
  onerror: (error) => {
    // Always surface transport errors on stderr, regardless of debug mode.
    console.error('[findmine-mcp] stdio error:', error);
  },
});
