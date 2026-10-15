/**
 * track_interaction — record a shopper interaction in FindMine analytics.
 * Registered only when FINDMINE_ENABLE_TRACKING=true.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import type { AnalyticsResponse } from '../types/findmine-api.js';
import { toolSuccess, upstreamFailure } from './results.js';
import { TrackInteractionInputSchema, TrackInteractionOutputSchema } from './schemas.js';
import type { TrackInteractionInput, TrackInteractionOutput } from './schemas.js';

export function registerTrackInteraction(server: McpServer, deps: FindMineDeps): void {
  server.registerTool(
    'track_interaction',
    {
      title: 'Track Product Interaction',
      description:
        'Record a shopper interaction (view, click, add_to_cart, purchase) with a product in FindMine analytics.',
      inputSchema: TrackInteractionInputSchema,
      outputSchema: TrackInteractionOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      let response: AnalyticsResponse;
      try {
        response = await deps.service.trackEvent(args.event_type, args.product_id, {
          colorId: args.product_color_id,
          lookId: args.look_id,
          sourceProductId: args.source_product_id,
          price: args.price,
          quantity: args.quantity,
          sessionId: args.session_id,
          customerId: args.customer_id,
        });
      } catch (error) {
        return upstreamFailure('track_interaction', error);
      }

      const output = toTrackInteractionOutput(args, response);
      return toolSuccess(
        output.accepted
          ? `Recorded ${output.event_type} event for product ${output.product_id}.`
          : `FindMine did not accept the ${output.event_type} event for product ${output.product_id}.`,
        output
      );
    }
  );
}

/**
 * Map the analytics response to the tool's output shape. The analytics response body is
 * not contract-verified yet, so a successful HTTP response counts as accepted unless the
 * body explicitly says `success: false`.
 */
export function toTrackInteractionOutput(
  args: Pick<TrackInteractionInput, 'event_type' | 'product_id'>,
  response: Partial<AnalyticsResponse>
): TrackInteractionOutput {
  return {
    accepted: response.success !== false,
    event_type: args.event_type,
    product_id: args.product_id,
  };
}
