/**
 * get_complete_the_look — outfit recommendations for a product.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import { createLookUri, createProductUri } from '../resources/uris.js';
import type { FindMineDeps } from '../server.js';
import type { FindMineService } from '../services/findmine-service.js';
import { optionalString, toProductRef, toolSuccess, upstreamFailure } from './results.js';
import { GetCompleteTheLookInputSchema, GetCompleteTheLookOutputSchema } from './schemas.js';
import type { GetCompleteTheLookOutput, ProductRef } from './schemas.js';

type CompleteTheLookResult = Awaited<ReturnType<FindMineService['getCompleteTheLook']>>;

export function registerGetCompleteTheLook(server: McpServer, deps: FindMineDeps): void {
  server.registerTool(
    'get_complete_the_look',
    {
      title: 'Complete the Look',
      description:
        'Get FindMine outfit recommendations ("looks") that include the given product. Each look lists its items with product:/// URIs.',
      inputSchema: GetCompleteTheLookInputSchema,
      outputSchema: GetCompleteTheLookOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      let result: CompleteTheLookResult;
      try {
        result = await deps.service.getCompleteTheLook(
          args.product_id,
          args.in_stock,
          args.on_sale,
          {
            colorId: args.product_color_id,
            sessionId: args.session_id,
            customerId: args.customer_id,
            returnPdpItem: args.return_pdp_item,
            gender: args.customer_gender,
          }
        );
      } catch (error) {
        return upstreamFailure('get_complete_the_look', error);
      }

      const output = toCompleteTheLookOutput(result, deps.service);
      return toolSuccess(
        `Found ${String(output.total_looks)} look(s) for product ${args.product_id}.`,
        output
      );
    }
  );
}

/**
 * Map the service result to the tool's output shape. Look items are resolved against
 * the service's resource store; an item whose product details were not returned keeps
 * its ID so the model can still reference it.
 */
export function toCompleteTheLookOutput(
  result: CompleteTheLookResult,
  store: Pick<FindMineService, 'getProduct'>
): GetCompleteTheLookOutput {
  const looks = result.looks.flatMap((look) => {
    const lookId = optionalString(look.id);
    if (!lookId) {
      return [];
    }
    const items = look.productIds.flatMap((productId): ProductRef[] => {
      if (!optionalString(productId)) {
        return [];
      }
      const stored = store.getProduct(productId);
      const ref = stored ? toProductRef(stored) : undefined;
      return [ref ?? { product_id: productId, title: productId, uri: createProductUri(productId) }];
    });
    return [{ look_id: lookId, uri: createLookUri(lookId), items }];
  });

  return {
    product: result.product ? toProductRef(result.product) : undefined,
    looks,
    total_looks: looks.length,
  };
}
