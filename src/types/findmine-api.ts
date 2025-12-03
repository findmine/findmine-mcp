/**
 * FindMine API Types
 * Based on the FindMine API swagger documentation
 */

/**
 * Base interface for all FindMine API requests
 * Uses index signature to allow iteration over properties
 */
export interface FindMineBaseRequest {
  [key: string]: unknown;
  application: string;
  customer_session_id: string;
  customer_id?: string;
  customer_gender?: 'M' | 'W' | 'U';
  region?: string;
  language?: string;
  fake_result?: boolean;
}

/**
 * Request parameters for the Complete The Look API
 */
export interface CompleteTheLookRequest extends FindMineBaseRequest {
  [key: string]: unknown;
  product_id: string;
  product_color_id?: string;
  product_in_stock: boolean;
  product_on_sale: boolean;
  return_pdp_item?: boolean;
}

/**
 * Request parameters for the Visually Similar API
 */
export interface VisuallySimilarRequest extends FindMineBaseRequest {
  [key: string]: unknown;
  product_id: string;
  product_color_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Request parameters for the Item Details API
 */
export interface ItemDetailsUpdateRequest extends FindMineBaseRequest {
  [key: string]: unknown;
  items: {
    product_id: string;
    product_color_id?: string;
    in_stock: boolean;
    on_sale: boolean;
  }[];
}

/**
 * Request parameters for the Analytics API
 */
export interface AnalyticsRequest extends FindMineBaseRequest {
  [key: string]: unknown;
  event_type: 'view' | 'click' | 'add_to_cart' | 'purchase';
  product_id: string;
  product_color_id?: string;
  look_id?: string;
  source_product_id?: string;
  price?: number;
  quantity?: number;
}

/**
 * Product information returned by the FindMine API
 *
 * Note: Different API versions may use different field names.
 * Some versions might use "item_id" instead of "product_id".
 */
export interface FindMineProduct {
  product_id: string;
  item_id?: string; // Alternative name for product_id
  product_color_id?: string;
  name: string;
  description?: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  url: string;
  image_url: string;
  in_stock: boolean;
  on_sale: boolean;
  category?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Look information returned by the Complete The Look API
 *
 * Note: The actual API response may include variation on fields. For example:
 * - It could have a "look_id" field instead of "id"
 * - It could have "items" array instead of "products"
 * - It could have "order" array with item_ids
 */
export interface FindMineLook {
  // Support both naming conventions in API responses
  look_id?: string;
  id?: string;
  title?: string;
  description?: string;
  url?: string;
  image_url?: string;
  // Support both "products" array and "items" + "order" pattern
  products?: FindMineProduct[];
  items?: FindMineProduct[]; // Alternative name for products
  order?: string[]; // Array of item_ids in order
  featured?: number;
  attributes?: Record<string, unknown>;
}

/**
 * Response from the Complete The Look API
 */
export interface CompleteTheLookResponse {
  pdp_item?: FindMineProduct;
  looks: FindMineLook[];
}

/**
 * Response from the Visually Similar API
 */
export interface VisuallySimilarResponse {
  products: FindMineProduct[];
  total: number;
}

/**
 * Response from the Item Details Update API
 */
export interface ItemDetailsUpdateResponse {
  success: boolean;
  updated_count: number;
  failed_count: number;
  failures?: {
    product_id: string;
    product_color_id?: string;
    reason: string;
  }[];
}

/**
 * Response from the Analytics API
 */
export interface AnalyticsResponse {
  success: boolean;
  event_id: string;
}

/**
 * Error response from the FindMine API
 */
export interface FindMineErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
