/**
 * Handler for the findmine_help prompt.
 * Provides documentation on using FindMine's tools and resources.
 */

import { PromptResultSuccess } from './index.js';

/**
 * Handles the findmine_help prompt request
 * @returns Prompt messages for FindMine help
 */
export function handleFindmineHelpPrompt(): PromptResultSuccess {
  return {
    success: true,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: "I need help understanding how to use FindMine's MCP tools and resources. Please provide a guide.",
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# FindMine MCP Usage Guide

## Available Resources

FindMine exposes two types of resources:

1. **Products** (URI scheme: \`product:///\`)
   - Product details including name, description, price, and images
   - Access a product using its ID: \`product:///P12345\`
   - Products include formatted prices in the \`formattedPrice\` and \`formattedSalePrice\` fields

2. **Looks/Outfits** (URI scheme: \`look:///\`)
   - Complete outfit recommendations containing multiple products
   - Access a look using its ID: \`look:///L1001\`
   - Each look contains references to its component products

## Available Tools

1. **get_complete_the_look**
   - Purpose: Get outfit recommendations for a specific product
   - Required parameters: \`product_id\`
   - Optional parameters: \`in_stock\`, \`on_sale\`, \`product_color_id\`, \`api_version\`
   - Returns: A collection of looks/outfits containing the original product and complementary items

2. **get_visually_similar**
   - Purpose: Find products that are visually similar to a specified product
   - Required parameters: \`product_id\`
   - Optional parameters: \`limit\`, \`offset\`, \`product_color_id\`, \`api_version\`
   - Returns: A collection of products with similar visual characteristics

## Available Prompts

1. **outfit_completion**
   - Purpose: Get styling advice for a complete outfit based on a product
   - Provides context about the product and recommended outfits
   - Returns: Styling advice explaining why items work well together

2. **styling_guide**
   - Purpose: Get guidelines for providing effective fashion and styling advice
   - Offers a comprehensive guide to fashion styling principles
   - Returns: A detailed style guide for creating effective fashion recommendations

3. **findmine_help** (this prompt)
   - Purpose: Learn how to use FindMine's tools and resources
   - Provides documentation on available features and how to use them

## Tips for Effective Usage

1. When discussing prices, always use the \`formattedPrice\` or \`formattedSalePrice\` fields to ensure proper formatting
2. Combine \`get_complete_the_look\` with styling advice to create comprehensive outfit recommendations
3. Use \`get_visually_similar\` to offer alternatives when a product is out of stock
4. Reference the style guide when providing fashion advice to ensure consistency and quality`,
        },
      },
    ],
  };
}
