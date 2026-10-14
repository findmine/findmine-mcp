/**
 * update_item_details — update stock and sale status for catalog items.
 * Registered only when FINDMINE_ENABLE_ITEM_UPDATES=true.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import type { ItemDetailsUpdateResponse } from '../types/findmine-api.js';
import { optionalNumber, optionalString, toolSuccess, upstreamFailure } from './results.js';
import { UpdateItemDetailsInputSchema, UpdateItemDetailsOutputSchema } from './schemas.js';
import type { UpdateItemDetailsInput, UpdateItemDetailsOutput } from './schemas.js';

export function registerUpdateItemDetails(server: McpServer, deps: FindMineDeps): void {
  server.registerTool(
    'update_item_details',
    {
      title: 'Update Item Stock and Sale Status',
      description: 'Update the stock and sale status of one or more items in the FindMine catalog.',
      inputSchema: UpdateItemDetailsInputSchema,
      outputSchema: UpdateItemDetailsOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      let response: ItemDetailsUpdateResponse;
      try {
        response = await deps.service.updateItemDetails(
          args.items.map((item) => ({
            productId: item.product_id,
            colorId: item.product_color_id,
            inStock: item.in_stock,
            onSale: item.on_sale,
          })),
          { sessionId: args.session_id, customerId: args.customer_id }
        );
      } catch (error) {
        return upstreamFailure('update_item_details', error);
      }

      const output = toUpdateItemDetailsOutput(args.items, response);
      return toolSuccess(
        `Updated ${String(output.updated_count)} item(s); ${String(output.failed_count)} failed.`,
        output
      );
    }
  );
}

/**
 * Map the update response to one result per requested item. An item is reported as
 * failed when the response lists a failure for its product (and color, when given).
 */
export function toUpdateItemDetailsOutput(
  items: UpdateItemDetailsInput['items'],
  response: Partial<ItemDetailsUpdateResponse>
): UpdateItemDetailsOutput {
  const failures = Array.isArray(response.failures) ? response.failures : [];
  const results = items.map((item) => {
    const failure = failures.find(
      (candidate) =>
        candidate.product_id === item.product_id &&
        (!candidate.product_color_id || candidate.product_color_id === item.product_color_id)
    );
    return failure
      ? {
          product_id: item.product_id,
          product_color_id: item.product_color_id,
          ok: false,
          reason: optionalString(failure.reason),
        }
      : { product_id: item.product_id, product_color_id: item.product_color_id, ok: true };
  });
  const failedCount = results.filter((result) => !result.ok).length;

  return {
    results,
    updated_count: optionalNumber(response.updated_count) ?? results.length - failedCount,
    failed_count: optionalNumber(response.failed_count) ?? failedCount,
  };
}
