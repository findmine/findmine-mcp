/**
 * Registers the product:/// and look:/// resource templates.
 *
 * Resources are backed by the service's in-memory store, which fills as tool calls
 * return products and looks. Listing enumerates what has been seen so far; reading an
 * unknown or malformed URI fails with the SDK's resource-not-found protocol error.
 */

import { ResourceNotFoundError, ResourceTemplate } from '@modelcontextprotocol/server';
import type {
  ListResourcesResult,
  McpServer,
  ReadResourceResult,
} from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import {
  LOOK_MIME_TYPE,
  LOOK_URI_TEMPLATE,
  PRODUCT_MIME_TYPE,
  PRODUCT_URI_TEMPLATE,
  createLookUri,
  createProductUri,
  parseLookUri,
  parseProductUri,
} from './uris.js';

export function registerResources(server: McpServer, deps: FindMineDeps): void {
  const { service } = deps;

  server.registerResource(
    'product',
    new ResourceTemplate(PRODUCT_URI_TEMPLATE, {
      list: (): ListResourcesResult => ({
        resources: service.getAllProducts().map((product) => ({
          uri: createProductUri(product.id, product.colorId),
          name: product.name,
          description: product.description || `Product: ${product.name}`,
          mimeType: PRODUCT_MIME_TYPE,
        })),
      }),
    }),
    {
      title: 'FindMine product',
      description: 'Product details returned by FindMine tool calls',
      mimeType: PRODUCT_MIME_TYPE,
    },
    (uri) => {
      const productId = parseOrUndefined(() => parseProductUri(uri.href).productId);
      const product = productId === undefined ? undefined : service.getProduct(productId);
      if (!product) {
        throw new ResourceNotFoundError(uri.href);
      }
      return jsonContents(uri.href, PRODUCT_MIME_TYPE, product);
    }
  );

  server.registerResource(
    'look',
    new ResourceTemplate(LOOK_URI_TEMPLATE, {
      list: (): ListResourcesResult => ({
        resources: service.getAllLooks().map((look) => ({
          uri: createLookUri(look.id),
          name: look.title || `Look ${look.id}`,
          description: look.description || `Complete the look outfit ${look.id}`,
          mimeType: LOOK_MIME_TYPE,
        })),
      }),
    }),
    {
      title: 'FindMine look',
      description: 'Outfit (look) details returned by FindMine tool calls',
      mimeType: LOOK_MIME_TYPE,
    },
    (uri) => {
      const lookId = parseOrUndefined(() => parseLookUri(uri.href).lookId);
      const look = lookId === undefined ? undefined : service.getLook(lookId);
      if (!look) {
        throw new ResourceNotFoundError(uri.href);
      }
      return jsonContents(uri.href, LOOK_MIME_TYPE, look);
    }
  );
}

function parseOrUndefined(parse: () => string): string | undefined {
  try {
    return parse();
  } catch {
    return undefined;
  }
}

function jsonContents(uri: string, mimeType: string, value: unknown): ReadResourceResult {
  return { contents: [{ uri, mimeType, text: JSON.stringify(value, null, 2) }] };
}
