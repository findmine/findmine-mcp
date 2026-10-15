/**
 * get_visually_similar — products that look like a given product.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import type { FindMineService } from '../services/findmine-service.js';
import {
  optionalNumber,
  optionalString,
  toProductRef,
  toolSuccess,
  upstreamFailure,
} from './results.js';
import { GetVisuallySimilarInputSchema, GetVisuallySimilarOutputSchema } from './schemas.js';
import type { GetVisuallySimilarOutput } from './schemas.js';

type VisuallySimilarResult = Awaited<ReturnType<FindMineService['getVisuallySimilar']>>;

export function registerGetVisuallySimilar(server: McpServer, deps: FindMineDeps): void {
  server.registerTool(
    'get_visually_similar',
    {
      title: 'Find Visually Similar Products',
      description:
        'Find products that look visually similar to the given product, e.g. alternatives when an item is out of stock.',
      inputSchema: GetVisuallySimilarInputSchema,
      outputSchema: GetVisuallySimilarOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      let result: VisuallySimilarResult;
      try {
        result = await deps.service.getVisuallySimilar(args.product_id, {
          colorId: args.product_color_id,
          sessionId: args.session_id,
          customerId: args.customer_id,
          limit: args.limit,
          offset: args.offset,
          gender: args.customer_gender,
        });
      } catch (error) {
        return upstreamFailure('get_visually_similar', error);
      }

      const output = toVisuallySimilarOutput(args.product_id, result);
      return toolSuccess(
        `Found ${String(output.products.length)} visually similar product(s) for ${args.product_id}.`,
        output
      );
    }
  );
}

/**
 * Map the service result to the tool's output shape.
 */
export function toVisuallySimilarOutput(
  sourceProductId: string,
  result: VisuallySimilarResult
): GetVisuallySimilarOutput {
  const products = result.products.flatMap((product) => {
    const ref = toProductRef(product);
    return ref ? [{ ...ref, category: optionalString(product.category) }] : [];
  });
  return {
    source_product_id: sourceProductId,
    products,
    total: optionalNumber(result.total) ?? products.length,
  };
}
