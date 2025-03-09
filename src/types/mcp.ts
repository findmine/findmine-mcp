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
  attributes?: Record<string, any>;
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
  attributes?: Record<string, any>;
}

/**
 * Type for the in-memory storage of resources
 */
export interface ResourceStore {
  products: Record<string, ProductResource>;
  looks: Record<string, LookResource>;
}

/**
 * Helper functions for URI creation and parsing
 */

/**
 * Create a product URI from a product ID and optional color ID
 */
export function createProductUri(productId: string, colorId?: string): string {
  const uri = `product:///${productId}`;
  if (colorId) {
    return `${uri}?color=${colorId}`;
  }
  return uri;
}

/**
 * Parse a product URI to extract product ID and color ID
 */
export function parseProductUri(uri: string): { productId: string; colorId?: string } {
  const url = new URL(uri);
  const productId = url.pathname.replace(/^\//, '');
  const colorId = url.searchParams.get('color') || undefined;
  return { productId, colorId };
}

/**
 * Create a look URI from a look ID
 */
export function createLookUri(lookId: string): string {
  return `look:///${lookId}`;
}

/**
 * Parse a look URI to extract the look ID
 */
export function parseLookUri(uri: string): { lookId: string } {
  const url = new URL(uri);
  const lookId = url.pathname.replace(/^\//, '');
  return { lookId };
}