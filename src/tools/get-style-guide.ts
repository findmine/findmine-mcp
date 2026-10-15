/**
 * get_style_guide — static styling advice, no network access.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import { composeStyleGuide } from '../content/style-guides.js';
import { GetStyleGuideInputSchema, GetStyleGuideOutputSchema } from './schemas.js';
import type { GetStyleGuideOutput } from './schemas.js';

export function registerGetStyleGuide(server: McpServer): void {
  server.registerTool(
    'get_style_guide',
    {
      title: 'Get Style Guide',
      description:
        'Get styling advice and tips for creating effective fashion recommendations, optionally tailored to an occasion and fashion season.',
      inputSchema: GetStyleGuideInputSchema,
      outputSchema: GetStyleGuideOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ category, occasion, fashion_season }) => {
      const output: GetStyleGuideOutput = {
        category,
        occasion,
        fashion_season,
        markdown: composeStyleGuide(category, occasion, fashion_season),
      };
      // The Markdown is itself the human-readable rendering; no JSON duplicate needed.
      return {
        content: [{ type: 'text', text: output.markdown }],
        structuredContent: output,
      };
    }
  );
}
