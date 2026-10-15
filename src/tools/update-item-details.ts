/**
 * update_item_details — update stock and sale status for catalog items.
 * Registered only when FINDMINE_ENABLE_ITEM_UPDATES=true.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import type { ItemDetailsUpdateResponse } from '../types/findmine-api.js';
import { optionalString, toolSuccess, upstreamFailure } from './results.js';
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
      return toolSuccess(summarizeUpdate(output), output);
    }
  );
}

/**
 * The update response as received: typed fields may be absent, and a rejected batch
 * may carry a top-level `reason` or `message`.
 */
type ItemDetailsUpdateBody = Partial<ItemDetailsUpdateResponse> & {
  reason?: unknown;
  message?: unknown;
};

const BATCH_FAILED_REASON = 'FindMine reported the update failed';

/**
 * Map the update response to one result per requested item. The per-item results are
 * the only source of the counts; the body's own `updated_count`/`failed_count` are not
 * read, so the counts can never contradict the results.
 */
export function toUpdateItemDetailsOutput(
  items: UpdateItemDetailsInput['items'],
  response: ItemDetailsUpdateBody
): UpdateItemDetailsOutput {
  const results = toItemResults(items, response);
  const updatedCount = results.filter((result) => result.ok).length;
  return {
    results,
    updated_count: updatedCount,
    failed_count: results.length - updatedCount,
  };
}

/**
 * - `success: false` fails every item: nothing in the response says any item was applied.
 * - Otherwise an item fails when the response lists a failure for its product; colors
 *   must match only when both the failure and the item name one.
 */
function toItemResults(
  items: UpdateItemDetailsInput['items'],
  response: ItemDetailsUpdateBody
): UpdateItemDetailsOutput['results'] {
  if (response.success === false) {
    const reason =
      optionalString(response.reason) ?? optionalString(response.message) ?? BATCH_FAILED_REASON;
    return items.map((item) => ({
      product_id: item.product_id,
      product_color_id: item.product_color_id,
      ok: false,
      reason,
    }));
  }

  const failures = Array.isArray(response.failures) ? response.failures : [];
  return items.map((item) => {
    const failure = failures.find(
      (candidate) =>
        candidate.product_id === item.product_id &&
        (!candidate.product_color_id ||
          !item.product_color_id ||
          candidate.product_color_id === item.product_color_id)
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
}

function summarizeUpdate(output: UpdateItemDetailsOutput): string {
  if (output.updated_count === 0 && output.failed_count > 0) {
    const reason = output.results.find((result) => result.reason)?.reason;
    return `No items were updated; ${String(output.failed_count)} failed${reason ? ` (${reason})` : ''}.`;
  }
  return `Updated ${String(output.updated_count)} item(s); ${String(output.failed_count)} failed.`;
}
