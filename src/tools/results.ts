/**
 * Shared builders for tool results.
 *
 * Success: `structuredContent` (validated by the SDK against the tool's output schema)
 * plus `content` carrying a one-line summary and, per the MCP spec's backwards-compatibility
 * guidance, the same structured value serialized as JSON for clients that ignore
 * `structuredContent`.
 *
 * Failure: business failures (upstream errors, rejected requests) are returned as
 * `isError` results the model can read — never thrown.
 */

import type { CallToolResult } from '@modelcontextprotocol/server';
import { createProductUri } from '../resources/uris.js';
import type { ProductResource } from '../types/mcp.js';
import { logger } from '../utils/logger.js';
import type { ProductRef } from './schemas.js';

export function toolSuccess(summary: string, structured: Record<string, unknown>): CallToolResult {
  return {
    content: [
      { type: 'text', text: summary },
      { type: 'text', text: JSON.stringify(structured) },
    ],
    structuredContent: structured,
  };
}

export function toolFailure(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

/**
 * Convert an error thrown by the FindMine API layer into an `isError` tool result.
 */
export function upstreamFailure(toolName: string, error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`${toolName} failed: ${message}`);
  return toolFailure(`FindMine request failed: ${message}`);
}

/** Return the value when it is a non-empty string, else undefined. */
export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Return the value when it is a finite number, else undefined. */
export function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Map a stored product to the `ProductRef` output shape. Upstream payloads are not
 * validated yet, so every field is checked at runtime; products without an ID are
 * dropped (`undefined`) because they cannot be addressed by URI.
 */
export function toProductRef(product: ProductResource): ProductRef | undefined {
  const productId = optionalString(product.id);
  if (!productId) {
    return undefined;
  }
  const colorId = optionalString(product.colorId);
  return {
    product_id: productId,
    product_color_id: colorId,
    title: optionalString(product.name) ?? productId,
    url: optionalString(product.url),
    image_url: optionalString(product.imageUrl),
    price: optionalNumber(product.price),
    formatted_price: optionalString(product.formattedPrice),
    uri: createProductUri(productId, colorId),
  };
}
