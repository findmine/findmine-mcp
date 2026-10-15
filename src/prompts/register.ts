/**
 * Registers the FindMine prompts. Arguments are declared with Zod `argsSchema`, so
 * clients see them in prompts/list and the SDK validates them on prompts/get.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import { buildFindmineHelpPrompt } from './findmine-help.js';
import { OutfitCompletionArgsSchema, buildOutfitCompletionPrompt } from './outfit-completion.js';
import { StylingGuideArgsSchema, buildStylingGuidePrompt } from './styling-guide.js';

export function registerPrompts(server: McpServer, deps: FindMineDeps): void {
  server.registerPrompt(
    'outfit_completion',
    {
      title: 'Outfit Completion',
      description: 'Get styling advice and complete outfits for a product',
      argsSchema: OutfitCompletionArgsSchema,
    },
    (args) => buildOutfitCompletionPrompt(args, deps.service.getProduct(args.product_id))
  );

  server.registerPrompt(
    'styling_guide',
    {
      title: 'Styling Guide',
      description: 'Get guidelines for providing effective fashion and styling advice',
      argsSchema: StylingGuideArgsSchema,
    },
    (args) => buildStylingGuidePrompt(args)
  );

  server.registerPrompt(
    'findmine_help',
    {
      title: 'FindMine Help',
      description: "Learn how to use FindMine's tools and resources effectively",
    },
    () => buildFindmineHelpPrompt(deps.config.features)
  );
}
