/**
 * Schema exports for FindMine MCP server
 *
 * Re-exports all schemas and types for convenient importing.
 */

// Tool input schemas
export {
  // Schemas
  GetStyleGuideInputSchema,
  GetCompleteTheLookInputSchema,
  GetVisuallySimilarInputSchema,
  TrackInteractionInputSchema,
  ItemDetailSchema,
  UpdateItemDetailsInputSchema,
  ToolSchemas,

  // Types
  type GetStyleGuideInput,
  type GetCompleteTheLookInput,
  type GetVisuallySimilarInput,
  type TrackInteractionInput,
  type ItemDetail,
  type UpdateItemDetailsInput,
  type ToolInput,
  type ToolName,

  // Helper functions
  validateToolInput,
  safeValidateToolInput,
} from './tool-inputs.js';
