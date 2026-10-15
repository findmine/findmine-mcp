/**
 * styling_guide prompt — guidelines for effective fashion and styling advice.
 */

import type { GetPromptResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { composeStyleGuide } from '../content/style-guides.js';
import { StyleGuideCategorySchema } from '../tools/schemas.js';

export const StylingGuideArgsSchema = z.object({
  category: StyleGuideCategorySchema.optional().describe('Category of styling advice to focus on'),
  occasion: z.string().optional().describe('Occasion to focus on (e.g., office, wedding)'),
  fashion_season: z
    .string()
    .optional()
    .describe('Fashion season to focus on (e.g., spring_summer, fall_winter)'),
});

export type StylingGuideArgs = z.infer<typeof StylingGuideArgsSchema>;

const GUIDE_OUTLINE = `Please create a detailed style guide that covers:

1. **Understanding Customer Needs**
   - How to analyze a customer's expressed preferences and style desires
   - Techniques for recommending items that match their personal style
   - How to tailor advice for different body types and skin tones

2. **Creating Cohesive Outfits**
   - Color theory and coordination principles
   - Pattern mixing guidelines
   - Balancing proportions and silhouettes
   - How to create versatile outfits for different occasions

3. **Describing Product Features Effectively**
   - Highlighting quality and craftsmanship
   - Explaining fabric properties and benefits
   - Describing fit and comfort factors

4. **Price Sensitivity Guidance**
   - How to discuss pricing in a helpful way
   - Value-based selling techniques
   - When to emphasize investment pieces vs. affordable options

5. **Seasonal Styling Tips**
   - Transitional dressing advice
   - Layering techniques
   - Weather-appropriate recommendations

6. **FindMine Specific Guidelines**
   - Discussing related products naturally
   - Explaining why items complement each other
   - Creating a cohesive brand voice in styling advice

Please format this guide in a way that would be helpful for someone providing fashion styling advice to customers.`;

/**
 * Build the prompt messages. With no arguments this is the general guide request; any
 * argument narrows the focus and attaches FindMine's matching reference guide.
 */
export function buildStylingGuidePrompt(args: StylingGuideArgs): GetPromptResult {
  const { category, occasion, fashion_season } = args;
  const focus = [
    category && `category: ${category.replace(/_/g, ' ')}`,
    occasion && `occasion: ${occasion.replace(/_/g, ' ')}`,
    fashion_season && `season: ${fashion_season.replace(/_/g, ' ')}`,
  ].filter((part): part is string => Boolean(part));

  const messages: GetPromptResult['messages'] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `I need guidance on how to provide effective fashion and styling advice to customers. Please provide a comprehensive style guide${focus.length > 0 ? ` focused on ${focus.join('; ')}` : ''}.`,
      },
    },
    { role: 'user', content: { type: 'text', text: GUIDE_OUTLINE } },
  ];

  if (focus.length > 0) {
    messages.push({
      role: 'user',
      content: {
        type: 'text',
        text: `Use FindMine's reference guide as a starting point:\n\n${composeStyleGuide(category ?? 'general', occasion, fashion_season)}`,
      },
    });
  }

  return { messages };
}
