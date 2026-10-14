/**
 * FindMine MCP server factory.
 *
 * `createFindMineDeps()` builds the long-lived pieces (config, API client, service with
 * its caches and resource store) once per process. `createFindMineServer(deps)` builds a
 * fresh `McpServer` per connection on top of them, so every transport entry
 * (`serveStdio`, `createMcpHandler`) can share one factory.
 */

import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/server';
import { FindMineClient, type FindMineApi } from './api/findmine-client.js';
import { loadConfig, type ServerConfig } from './config.js';
import { registerPrompts } from './prompts/register.js';
import { registerResources } from './resources/register.js';
import { FindMineService } from './services/findmine-service.js';
import { registerTools } from './tools/register.js';

const packageJson = createRequire(import.meta.url)('../package.json') as { version: string };

/** The package version, reported as the server version. */
export const SERVER_VERSION = packageJson.version;

/**
 * Long-lived dependencies shared by every server instance.
 */
export interface FindMineDeps {
  config: ServerConfig;
  client: FindMineApi;
  service: FindMineService;
}

/**
 * Optional replacements for the default dependencies (tests, embedders).
 */
export interface FindMineDepsOverrides {
  /** Defaults to `loadConfig(process.env)`. */
  config?: ServerConfig;
  /** Defaults to a `FindMineClient` built from `config.findmine`. */
  client?: FindMineApi;
}

export interface CreateFindMineServerOptions {
  /**
   * Called after the built-in tools, resources, and prompts are registered, once per
   * server instance. Downstream builds use it to add their own registrations.
   */
  extend?: (server: McpServer, deps: FindMineDeps) => void;
}

/**
 * Build the shared dependencies. Call once per process.
 */
export function createFindMineDeps(overrides: FindMineDepsOverrides = {}): FindMineDeps {
  const config = overrides.config ?? loadConfig(process.env);
  const client =
    overrides.client ??
    new FindMineClient({
      apiBaseUrl: config.findmine.apiBaseUrl,
      applicationId: config.findmine.applicationId,
      apiVersion: config.findmine.apiVersion,
      defaultRegion: config.findmine.defaultRegion,
      defaultLanguage: config.findmine.defaultLanguage,
    });
  const service = new FindMineService(client, config);
  return { config, client, service };
}

/**
 * Build one MCP server instance. Call once per connection.
 */
export function createFindMineServer(
  deps: FindMineDeps,
  opts: CreateFindMineServerOptions = {}
): McpServer {
  const server = new McpServer(
    {
      name: 'findmine-mcp',
      title: 'FindMine',
      version: SERVER_VERSION,
      websiteUrl: 'https://www.findmine.com',
    },
    { instructions: buildInstructions(deps.config) }
  );

  registerTools(server, deps);
  registerResources(server, deps);
  registerPrompts(server, deps);
  opts.extend?.(server, deps);

  return server;
}

function buildInstructions(config: ServerConfig): string {
  const lines = [
    "FindMine returns outfit and product recommendations from a retailer's FindMine catalog.",
    '- get_complete_the_look: outfits ("looks") that include a product. Pass product_color_id when the product comes in several colors.',
    '- get_visually_similar: products that look like a given product, e.g. alternatives for an out-of-stock item.',
    '- get_style_guide: styling advice by category, optionally tailored to an occasion and fashion season.',
  ];
  if (config.features.enableTracking) {
    lines.push(
      '- track_interaction: record a shopper view, click, add_to_cart, or purchase event.'
    );
  }
  if (config.features.enableItemDetailsUpdates) {
    lines.push('- update_item_details: change the stock and sale status of catalog items.');
  }
  lines.push(
    'Results reference product:/// and look:/// resource URIs that can be read for full details. Use formatted_price when showing prices.'
  );
  return lines.join('\n');
}
