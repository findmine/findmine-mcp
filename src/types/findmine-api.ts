/**
 * FindMine API Types
 * Based on the FindMine API swagger documentation
 */

/**
 * Base interface for all FindMine API requests
 */
export interface FindMineBaseRequest {
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
  product_id: string;
  product_color_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Request parameters for the Item Details API
 */
export interface ItemDetailsUpdateRequest extends FindMineBaseRequest {
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
 */
export interface FindMineProduct {
  product_id: string;
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
  attributes?: Record<string, any>;
}

/**
 * Look information returned by the Complete The Look API
 */
export interface FindMineLook {
  look_id: string;
  title?: string;
  description?: string;
  url?: string;
  image_url?: string;
  products: FindMineProduct[];
  attributes?: Record<string, any>;
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
    details?: any;
  };
}