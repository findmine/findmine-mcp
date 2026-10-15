/**
 * Type definitions for MCP resources
 */

/**
 * Product resource type for MCP
 */
export interface ProductResource {
  id: string;
  colorId?: string;
  name: string;
  description?: string;
  brand?: string;
  price?: number;
  salePrice?: number;
  formattedPrice?: string;
  formattedSalePrice?: string;
  url: string;
  imageUrl: string;
  inStock: boolean;
  onSale: boolean;
  category?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Look resource type for MCP
 */
export interface LookResource {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  productIds: string[];
  attributes?: Record<string, unknown>;
}

/**
 * Type for the in-memory storage of resources
 */
export interface ResourceStore {
  products: Record<string, ProductResource>;
  looks: Record<string, LookResource>;
}
