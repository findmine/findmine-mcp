/**
 * findmine_help prompt — documentation on using FindMine's tools and resources.
 */

import type { GetPromptResult } from '@modelcontextprotocol/server';
import type { ServerConfig } from '../config.js';

/**
 * Build the help prompt. Feature-flagged tools are documented only when enabled.
 */
export function buildFindmineHelpPrompt(features: ServerConfig['features']): GetPromptResult {
  const optionalTools: string[] = [];
  if (features.enableTracking) {
    optionalTools.push(`- **track_interaction** — record a shopper \`view\`, \`click\`, \`add_to_cart\`, or \`purchase\` event
  - Required: \`event_type\`, \`product_id\``);
  }
  if (features.enableItemDetailsUpdates) {
    optionalTools.push(`- **update_item_details** — update stock and sale status for catalog items
  - Required: \`items\` (each with \`product_id\`, \`in_stock\`, \`on_sale\`)`);
  }

  const guide = `# FindMine MCP Usage Guide

## Available Tools

- **get_complete_the_look** — outfit recommendations ("looks") that include a product
  - Required: \`product_id\`
  - Optional: \`product_color_id\`, \`in_stock\`, \`on_sale\`, \`return_pdp_item\`, \`customer_id\`, \`customer_gender\`, \`session_id\`
  - Returns: the source product and each look's items, with \`product:///\` and \`look:///\` URIs
- **get_visually_similar** — products that look like a given product
  - Required: \`product_id\`
  - Optional: \`product_color_id\`, \`limit\`, \`offset\`, \`customer_id\`, \`customer_gender\`, \`session_id\`
  - Returns: similar products with \`product:///\` URIs
- **get_style_guide** — styling advice by \`category\`, optionally tailored to an \`occasion\` and \`fashion_season\`
${optionalTools.join('\n')}

## Available Resources

- **Products** (\`product:///{product_id}\`, optionally \`?color={product_color_id}\`): full product details, including \`formattedPrice\` and \`formattedSalePrice\`
- **Looks** (\`look:///{look_id}\`): an outfit and the IDs of its products

Resources become readable once a tool call has returned them.

## Available Prompts

- **outfit_completion** (\`product_id\`, optional \`product_color_id\`, \`occasion\`) — styling advice for outfits built around a product
- **styling_guide** (optional \`category\`, \`occasion\`, \`fashion_season\`) — guidelines for effective styling advice
- **findmine_help** — this guide

## Tips for Effective Usage

1. When discussing prices, use the formatted price fields (\`formatted_price\` in tool results) for correct display
2. Combine \`get_complete_the_look\` with styling advice to create comprehensive outfit recommendations
3. Use \`get_visually_similar\` to offer alternatives when a product is out of stock
4. Reference the style guide when providing fashion advice to ensure consistency and quality`;

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: "I need help understanding how to use FindMine's MCP tools and resources. Please provide a guide.",
        },
      },
      { role: 'user', content: { type: 'text', text: guide } },
    ],
  };
}
