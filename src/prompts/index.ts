/**
 * Prompt definitions for the FindMine MCP server.
 * Contains metadata for all available prompts.
 */

/**
 * Prompt definition type matching MCP SDK expectations
 */
export interface PromptDefinition {
  name: string;
  description: string;
}

/**
 * Prompt message content type
 */
export interface PromptMessageContent {
  type: string;
  text?: string;
  resource?: {
    uri: string;
    mimeType: string;
    text: string;
  };
}

/**
 * Prompt message type
 */
export interface PromptMessage {
  role: string;
  content: PromptMessageContent;
}

/**
 * Successful prompt result type
 */
export interface PromptResultSuccess {
  success: true;
  messages: PromptMessage[];
}

/**
 * Error prompt result type
 */
export interface PromptResultError {
  error: {
    message: string;
    code: string;
  };
}

/**
 * Prompt result type (union of success and error)
 */
export type PromptResult = PromptResultSuccess | PromptResultError;

/**
 * All available prompt definitions
 */
export const promptDefinitions: PromptDefinition[] = [
  {
    name: 'outfit_completion',
    description: 'Get styling advice and complete outfit for a product',
  },
  {
    name: 'styling_guide',
    description: 'Get guidelines for providing effective fashion and styling advice',
  },
  {
    name: 'findmine_help',
    description: "Learn how to use FindMine's tools and resources effectively",
  },
];

/**
 * Get all available prompt definitions
 */
export function getPromptDefinitions(): PromptDefinition[] {
  return promptDefinitions;
}
