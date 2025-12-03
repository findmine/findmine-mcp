/**
 * Zod schemas for MCP tool input validation
 *
 * These schemas define the expected structure and types for all tool inputs,
 * providing runtime validation and TypeScript type inference.
 */

import { z } from 'zod';

/**
 * Common field schemas used across multiple tools
 */
const ProductIdSchema = z.string().min(1, 'Product ID is required');
const ColorIdSchema = z.string().optional();
const SessionIdSchema = z.string().optional();
const CustomerIdSchema = z.string().optional();
const ApiVersionSchema = z.string().optional();
const CustomerGenderSchema = z.enum(['M', 'W', 'U']).optional();

/**
 * Schema for get_style_guide tool
 *
 * Provides styling advice and tips for fashion recommendations.
 */
export const GetStyleGuideInputSchema = z.object({
  category: z
    .enum(['general', 'color_theory', 'body_types', 'casual_outfits', 'formal_outfits', 'seasonal'])
    .default('general')
    .describe('Category of styling advice'),

  occasion: z
    .string()
    .optional()
    .describe(
      'Specific occasion to get styling advice for (e.g., office, wedding, date_night, casual_friday)'
    ),

  fashion_season: z
    .string()
    .optional()
    .describe(
      'Fashion season to get styling advice for (e.g., spring_summer, fall_winter, resort, transition)'
    ),
});

/**
 * Schema for get_complete_the_look tool
 *
 * Gets outfit recommendations for a product.
 */
export const GetCompleteTheLookInputSchema = z.object({
  product_id: ProductIdSchema.describe('ID of the product'),

  product_color_id: ColorIdSchema.describe('Color ID of the product (if applicable)'),

  in_stock: z.boolean().default(true).describe('Whether the product is in stock'),

  on_sale: z.boolean().default(false).describe('Whether the product is on sale'),

  customer_id: CustomerIdSchema.describe('Customer ID for personalized recommendations'),

  customer_gender: CustomerGenderSchema.describe(
    'Customer gender (M = Men, W = Women, U = Unknown)'
  ),

  return_pdp_item: z
    .boolean()
    .default(true)
    .describe('Whether to return the original product in the response'),

  session_id: SessionIdSchema.describe('Session ID for tracking and personalization'),

  api_version: ApiVersionSchema.describe(
    'API version to use (overrides FINDMINE_API_VERSION env var)'
  ),
});

/**
 * Schema for get_visually_similar tool
 *
 * Finds visually similar products.
 */
export const GetVisuallySimilarInputSchema = z.object({
  product_id: ProductIdSchema.describe('ID of the product'),

  product_color_id: ColorIdSchema.describe('Color ID of the product (if applicable)'),

  limit: z.number().int().positive().default(10).describe('Maximum number of products to return'),

  offset: z.number().int().nonnegative().default(0).describe('Offset for pagination'),

  customer_id: CustomerIdSchema.describe('Customer ID for personalized recommendations'),

  customer_gender: CustomerGenderSchema.describe(
    'Customer gender (M = Men, W = Women, U = Unknown)'
  ),

  session_id: SessionIdSchema.describe('Session ID for tracking and personalization'),

  api_version: ApiVersionSchema.describe(
    'API version to use (overrides FINDMINE_API_VERSION env var)'
  ),
});

/**
 * Schema for track_interaction tool
 *
 * Tracks user interactions with products.
 */
export const TrackInteractionInputSchema = z.object({
  event_type: z.enum(['view', 'click', 'add_to_cart', 'purchase']).describe('Type of interaction'),

  product_id: ProductIdSchema.describe('ID of the product'),

  product_color_id: ColorIdSchema.describe('Color ID of the product (if applicable)'),

  look_id: z.string().optional().describe('ID of the look (if applicable)'),

  source_product_id: z
    .string()
    .optional()
    .describe('ID of the source product that led to this interaction'),

  price: z.number().positive().optional().describe('Price of the product (for purchase events)'),

  quantity: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe('Quantity of the product (for purchase events)'),

  customer_id: CustomerIdSchema.describe('Customer ID for analytics'),

  session_id: SessionIdSchema.describe('Session ID for analytics'),

  force_enable: z
    .boolean()
    .default(false)
    .describe('Force enable tracking even if disabled by default'),

  api_version: ApiVersionSchema.describe(
    'API version to use (overrides FINDMINE_API_VERSION env var)'
  ),
});

/**
 * Schema for individual item in update_item_details
 */
export const ItemDetailSchema = z.object({
  product_id: ProductIdSchema.describe('ID of the product'),

  product_color_id: ColorIdSchema.describe('Color ID of the product (if applicable)'),

  in_stock: z.boolean().describe('Whether the product is in stock'),

  on_sale: z.boolean().describe('Whether the product is on sale'),
});

/**
 * Schema for update_item_details tool
 *
 * Updates item details such as stock status and sale status.
 */
export const UpdateItemDetailsInputSchema = z.object({
  items: z
    .array(ItemDetailSchema)
    .min(1, 'Items array must not be empty')
    .describe('List of items to update'),

  customer_id: CustomerIdSchema.describe('Customer ID for analytics'),

  session_id: SessionIdSchema.describe('Session ID for analytics'),

  force_enable: z
    .boolean()
    .default(false)
    .describe('Force enable item updates even if disabled by default'),

  api_version: ApiVersionSchema.describe(
    'API version to use (overrides FINDMINE_API_VERSION env var)'
  ),
});

/**
 * TypeScript types inferred from Zod schemas
 *
 * These provide compile-time type safety based on the runtime schemas.
 */
export type GetStyleGuideInput = z.infer<typeof GetStyleGuideInputSchema>;
export type GetCompleteTheLookInput = z.infer<typeof GetCompleteTheLookInputSchema>;
export type GetVisuallySimilarInput = z.infer<typeof GetVisuallySimilarInputSchema>;
export type TrackInteractionInput = z.infer<typeof TrackInteractionInputSchema>;
export type ItemDetail = z.infer<typeof ItemDetailSchema>;
export type UpdateItemDetailsInput = z.infer<typeof UpdateItemDetailsInputSchema>;

/**
 * Union type for all tool inputs
 */
export type ToolInput =
  | GetStyleGuideInput
  | GetCompleteTheLookInput
  | GetVisuallySimilarInput
  | TrackInteractionInput
  | UpdateItemDetailsInput;

/**
 * Map of tool names to their corresponding schemas
 */
export const ToolSchemas = {
  get_style_guide: GetStyleGuideInputSchema,
  get_complete_the_look: GetCompleteTheLookInputSchema,
  get_visually_similar: GetVisuallySimilarInputSchema,
  track_interaction: TrackInteractionInputSchema,
  update_item_details: UpdateItemDetailsInputSchema,
} as const;

/**
 * Type for tool names
 */
export type ToolName = keyof typeof ToolSchemas;

/**
 * Helper function to validate tool input
 *
 * @param toolName - Name of the tool
 * @param input - Raw input to validate
 * @returns Validated and typed input
 * @throws ZodError if validation fails
 */
export function validateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown
): z.infer<(typeof ToolSchemas)[T]> {
  const schema = ToolSchemas[toolName];
  return schema.parse(input);
}

/**
 * Safe version of validateToolInput that returns a result object
 *
 * @param toolName - Name of the tool
 * @param input - Raw input to validate
 * @returns Object with success flag and either data or error
 */
export function safeValidateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown
): z.SafeParseReturnType<unknown, z.infer<(typeof ToolSchemas)[T]>> {
  const schema = ToolSchemas[toolName];
  return schema.safeParse(input);
}
