/**
 * Utilities for mapping between FindMine API data and MCP resources
 */

import { FindMineProduct, FindMineLook } from '../types/findmine-api.js';
import { ProductResource, LookResource, createProductUri, createLookUri } from '../types/mcp.js';
import { formatPrice } from './formatters.js';

/**
 * Convert a FindMine product to an MCP product resource
 */
export function mapProductToResource(product: FindMineProduct): ProductResource {
  return {
    id: product.product_id,
    colorId: product.product_color_id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    price: product.price,
    salePrice: product.sale_price,
    formattedPrice: formatPrice(product.price),
    formattedSalePrice: product.sale_price ? formatPrice(product.sale_price) : undefined,
    url: product.url,
    imageUrl: product.image_url,
    inStock: product.in_stock,
    onSale: product.on_sale,
    category: product.category,
    attributes: product.attributes,
  };
}

/**
 * Convert a FindMine look to an MCP look resource
 */
export function mapLookToResource(look: FindMineLook): LookResource {
  // Get the look ID (different API versions might use different field names)
  const lookId = look.look_id || look.id || `unknown-${Math.random().toString().slice(2, 8)}`;

  // Extract product IDs from the look - handle different API response formats
  let productIds: string[] = [];

  if (look.products && Array.isArray(look.products)) {
    // If we have a products array, extract IDs
    productIds = look.products.map((product) => product.product_id || '').filter(Boolean);
  } else if (look.items && Array.isArray(look.items)) {
    // If we have an items array, extract IDs
    productIds = look.items.map((item) => item.product_id || item.item_id || '').filter(Boolean);
  } else if (look.order && Array.isArray(look.order)) {
    // If we have an order array, use those IDs directly
    productIds = look.order.filter(Boolean);
  }

  return {
    id: lookId,
    title: look.title || `Look ${lookId}`,
    description: look.description,
    url: look.url,
    imageUrl: look.image_url,
    productIds: productIds,
    attributes: look.attributes,
  };
}

/**
 * Get the MIME type for a product resource
 */
export function getProductMimeType(): string {
  return 'application/vnd.findmine.product+json';
}

/**
 * Get the MIME type for a look resource
 */
export function getLookMimeType(): string {
  return 'application/vnd.findmine.look+json';
}

/**
 * Resource metadata for MCP
 */
export interface ResourceMetadata {
  uri: string;
  mimeType: string;
  name: string;
  description: string;
}

/**
 * Resource content for MCP
 */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * Convert a product resource to MCP resource metadata
 */
export function productToResourceMetadata(product: ProductResource): ResourceMetadata {
  return {
    uri: createProductUri(product.id, product.colorId),
    mimeType: getProductMimeType(),
    name: product.name,
    description: product.description || `Product: ${product.name}`,
  };
}

/**
 * Convert a look resource to MCP resource metadata
 */
export function lookToResourceMetadata(look: LookResource): ResourceMetadata {
  return {
    uri: createLookUri(look.id),
    mimeType: getLookMimeType(),
    name: look.title || `Look ${look.id}`,
    description: look.description || `Complete the look outfit ${look.id}`,
  };
}

/**
 * Convert a product resource to MCP resource content
 */
export function productToResourceContent(product: ProductResource, uri: string): ResourceContent {
  return {
    uri,
    mimeType: getProductMimeType(),
    text: JSON.stringify(product, null, 2),
  };
}

/**
 * Convert a look resource to MCP resource content
 */
export function lookToResourceContent(look: LookResource, uri: string): ResourceContent {
  return {
    uri,
    mimeType: getLookMimeType(),
    text: JSON.stringify(look, null, 2),
  };
}
