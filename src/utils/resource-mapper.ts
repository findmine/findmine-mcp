/**
 * Utilities for mapping between FindMine API data and MCP resources
 */

import { FindMineProduct, FindMineLook } from '../types/findmine-api.js';
import { 
  ProductResource, 
  LookResource, 
  createProductUri, 
  createLookUri 
} from '../types/mcp.js';
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
  return {
    id: look.look_id,
    title: look.title || `Look ${look.look_id}`,
    description: look.description,
    url: look.url,
    imageUrl: look.image_url,
    productIds: look.products.map(product => product.product_id),
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
 * Convert a product resource to MCP resource metadata
 */
export function productToResourceMetadata(product: ProductResource) {
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
export function lookToResourceMetadata(look: LookResource) {
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
export function productToResourceContent(product: ProductResource, uri: string) {
  return {
    uri,
    mimeType: getProductMimeType(),
    text: JSON.stringify(product, null, 2),
  };
}

/**
 * Convert a look resource to MCP resource content
 */
export function lookToResourceContent(look: LookResource, uri: string) {
  return {
    uri,
    mimeType: getLookMimeType(),
    text: JSON.stringify(look, null, 2),
  };
}