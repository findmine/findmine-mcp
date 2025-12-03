/**
 * Handler for the styling_guide prompt.
 * Provides guidelines for effective fashion and styling advice.
 */

import { PromptResultSuccess } from './index.js';

/**
 * Handles the styling_guide prompt request
 * @returns Prompt messages for styling guide
 */
export function handleStylingGuidePrompt(): PromptResultSuccess {
  return {
    success: true,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'I need guidance on how to provide effective fashion and styling advice to customers. Please provide a comprehensive style guide.',
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please create a detailed style guide that covers:

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

Please format this guide in a way that would be helpful for someone providing fashion styling advice to customers.`,
        },
      },
    ],
  };
}
