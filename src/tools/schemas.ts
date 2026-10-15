/**
 * Zod schemas for every FindMine MCP tool — the single source of truth.
 *
 * The SDK derives the advertised JSON Schema, argument validation, and handler types
 * from the input schemas, and validates each tool's `structuredContent` against its
 * output schema before the result leaves the server.
 */

import { z } from 'zod';
import { STYLE_GUIDE_CATEGORIES } from '../content/style-guides.js';

/* ------------------------------------------------------------------ */
/* Shared fields                                                       */
/* ------------------------------------------------------------------ */

const ProductIdSchema = z.string().min(1, 'Product ID is required');
const CustomerGenderSchema = z.enum(['M', 'W', 'U']);

export const StyleGuideCategorySchema = z.enum(STYLE_GUIDE_CATEGORIES);
export const InteractionEventTypeSchema = z.enum(['view', 'click', 'add_to_cart', 'purchase']);

/* ------------------------------------------------------------------ */
/* Input schemas                                                       */
/* ------------------------------------------------------------------ */

export const GetStyleGuideInputSchema = z.object({
  category: StyleGuideCategorySchema.default('general').describe('Category of styling advice'),
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

export const GetCompleteTheLookInputSchema = z.object({
  product_id: ProductIdSchema.describe('ID of the product'),
  product_color_id: z.string().optional().describe('Color ID of the product (if applicable)'),
  in_stock: z.boolean().default(true).describe('Whether the product is in stock'),
  on_sale: z.boolean().default(false).describe('Whether the product is on sale'),
  customer_id: z.string().optional().describe('Customer ID for personalized recommendations'),
  customer_gender: CustomerGenderSchema.optional().describe(
    'Customer gender (M = Men, W = Women, U = Unknown)'
  ),
  return_pdp_item: z
    .boolean()
    .default(true)
    .describe('Whether to return the original product in the response'),
  session_id: z.string().optional().describe('Session ID for tracking and personalization'),
});

export const GetVisuallySimilarInputSchema = z.object({
  product_id: ProductIdSchema.describe('ID of the product'),
  product_color_id: z.string().optional().describe('Color ID of the product (if applicable)'),
  limit: z.number().int().positive().default(10).describe('Maximum number of products to return'),
  offset: z.number().int().nonnegative().default(0).describe('Offset for pagination'),
  customer_id: z.string().optional().describe('Customer ID for personalized recommendations'),
  customer_gender: CustomerGenderSchema.optional().describe(
    'Customer gender (M = Men, W = Women, U = Unknown)'
  ),
  session_id: z.string().optional().describe('Session ID for tracking and personalization'),
});

export const TrackInteractionInputSchema = z.object({
  event_type: InteractionEventTypeSchema.describe('Type of interaction'),
  product_id: ProductIdSchema.describe('ID of the product'),
  product_color_id: z.string().optional().describe('Color ID of the product (if applicable)'),
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
  customer_id: z.string().optional().describe('Customer ID for analytics'),
  session_id: z.string().optional().describe('Session ID for analytics'),
});

export const ItemDetailSchema = z.object({
  product_id: ProductIdSchema.describe('ID of the product'),
  product_color_id: z.string().optional().describe('Color ID of the product (if applicable)'),
  in_stock: z.boolean().describe('Whether the product is in stock'),
  on_sale: z.boolean().describe('Whether the product is on sale'),
});

export const UpdateItemDetailsInputSchema = z.object({
  items: z
    .array(ItemDetailSchema)
    .min(1, 'Items array must not be empty')
    .describe('List of items to update'),
  customer_id: z.string().optional().describe('Customer ID for analytics'),
  session_id: z.string().optional().describe('Session ID for analytics'),
});

/* ------------------------------------------------------------------ */
/* Output schemas                                                      */
/* ------------------------------------------------------------------ */

export const ProductRefSchema = z.object({
  product_id: z.string().describe('Retailer product ID'),
  product_color_id: z.string().optional().describe('Retailer color ID, when color-specific'),
  title: z.string().describe('Product title'),
  url: z.string().optional().describe('Product page URL'),
  image_url: z.string().optional().describe('Product image URL'),
  price: z.number().optional().describe('Raw regular price as returned by FindMine'),
  formatted_price: z
    .string()
    .optional()
    .describe('Display-ready regular price; show it when the product is not on sale'),
  sale_price: z.number().optional().describe('Raw sale price as returned by FindMine'),
  formatted_sale_price: z
    .string()
    .optional()
    .describe('Display-ready sale price; show it when on_sale is true'),
  on_sale: z.boolean().optional().describe('Whether the product is on sale'),
  uri: z.string().describe('product:/// resource URI; read it for full product details'),
});

export const LookSchema = z.object({
  look_id: z.string().describe('FindMine look ID'),
  uri: z.string().describe('look:/// resource URI; read it for full look details'),
  title: z.string().optional().describe('Look title'),
  description: z.string().optional().describe('Look description'),
  image_url: z.string().optional().describe('Look image URL'),
  items: z.array(ProductRefSchema).describe('Products that make up the look'),
});

export const GetCompleteTheLookOutputSchema = z.object({
  product: ProductRefSchema.optional().describe('The product the looks were built around'),
  looks: z.array(LookSchema),
  total_looks: z.number().int().nonnegative(),
});

export const SimilarProductSchema = ProductRefSchema.extend({
  rank: z.number().int().optional().describe('Similarity rank, 1 = most similar'),
  category: z.string().optional().describe('Product category'),
});

export const GetVisuallySimilarOutputSchema = z.object({
  source_product_id: z.string(),
  products: z.array(SimilarProductSchema),
  total: z.number().int().nonnegative(),
});

export const GetStyleGuideOutputSchema = z.object({
  category: StyleGuideCategorySchema,
  occasion: z.string().optional(),
  fashion_season: z.string().optional(),
  markdown: z.string().describe('The style guide as Markdown'),
});

export const TrackInteractionOutputSchema = z.object({
  accepted: z.boolean().describe('Whether FindMine accepted the event'),
  event_type: InteractionEventTypeSchema,
  product_id: z.string(),
});

export const UpdateItemDetailsOutputSchema = z.object({
  results: z.array(
    z.object({
      product_id: z.string(),
      product_color_id: z.string().optional(),
      ok: z.boolean(),
      reason: z.string().optional(),
    })
  ),
  updated_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
});

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type GetStyleGuideInput = z.infer<typeof GetStyleGuideInputSchema>;
export type GetCompleteTheLookInput = z.infer<typeof GetCompleteTheLookInputSchema>;
export type GetVisuallySimilarInput = z.infer<typeof GetVisuallySimilarInputSchema>;
export type TrackInteractionInput = z.infer<typeof TrackInteractionInputSchema>;
export type UpdateItemDetailsInput = z.infer<typeof UpdateItemDetailsInputSchema>;

export type ProductRef = z.infer<typeof ProductRefSchema>;
export type GetCompleteTheLookOutput = z.infer<typeof GetCompleteTheLookOutputSchema>;
export type GetVisuallySimilarOutput = z.infer<typeof GetVisuallySimilarOutputSchema>;
export type GetStyleGuideOutput = z.infer<typeof GetStyleGuideOutputSchema>;
export type TrackInteractionOutput = z.infer<typeof TrackInteractionOutputSchema>;
export type UpdateItemDetailsOutput = z.infer<typeof UpdateItemDetailsOutputSchema>;
