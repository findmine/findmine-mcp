/**
 * Prompt dispatcher for the FindMine MCP server.
 * Routes prompt requests to their appropriate handlers.
 */

import { logger } from '../utils/logger.js';
import { getPromptDefinitions } from '../prompts/index.js';
import { handleOutfitCompletionPrompt } from '../prompts/outfit-completion.js';
import { handleStylingGuidePrompt } from '../prompts/styling-guide.js';
import { handleFindmineHelpPrompt } from '../prompts/findmine-help.js';

/**
 * Handler for listing available prompts
 * @returns List of available prompts or error
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function handleListPrompts() {
  try {
    logger.error('Listing available prompts');

    const prompts = getPromptDefinitions();

    logger.error(`Returning ${String(prompts.length)} available prompts`);
    return {
      success: true,
      prompts,
    };
  } catch (error) {
    logger.error(
      `Error listing prompts: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
    return {
      error: {
        message:
          error instanceof Error ? error.message : 'Unknown error occurred while listing prompts',
        code: 'PROMPT_LIST_ERROR',
      },
    };
  }
}

/**
 * Handler for getting a specific prompt - dispatches to appropriate handler
 * @param name - Prompt name
 * @returns Prompt result or error
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function handleGetPrompt(name: string) {
  try {
    logger.error(`Getting prompt: ${name}`);

    switch (name) {
      case 'outfit_completion':
        return handleOutfitCompletionPrompt();

      case 'styling_guide':
        return handleStylingGuidePrompt();

      case 'findmine_help':
        return handleFindmineHelpPrompt();

      default:
        logger.error(`Unknown prompt requested: ${name}`);
        return {
          error: {
            message: `Unknown prompt: ${name}`,
            code: 'UNKNOWN_PROMPT',
          },
        };
    }
  } catch (error) {
    logger.error(
      `Error retrieving prompt: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
    return {
      error: {
        message:
          error instanceof Error ? error.message : 'Unknown error occurred while retrieving prompt',
        code: 'PROMPT_ERROR',
      },
    };
  }
}
