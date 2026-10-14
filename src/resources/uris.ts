/**
 * URI scheme and MIME type helpers for FindMine MCP resources.
 *
 * - Products: `product:///{product_id}` with an optional `?color={product_color_id}`
 * - Looks:    `look:///{look_id}`
 *
 * IDs are percent-encoded so any catalog ID (spaces, slashes, `?`) round-trips and
 * still matches the single-segment `{id}` resource templates.
 */

export const PRODUCT_URI_TEMPLATE = 'product:///{id}';
export const LOOK_URI_TEMPLATE = 'look:///{id}';

export const PRODUCT_MIME_TYPE = 'application/vnd.findmine.product+json';
export const LOOK_MIME_TYPE = 'application/vnd.findmine.look+json';

/**
 * Create a product URI from a product ID and optional color ID
 */
export function createProductUri(productId: string, colorId?: string): string {
  const uri = `product:///${encodeURIComponent(productId)}`;
  return colorId ? `${uri}?color=${encodeURIComponent(colorId)}` : uri;
}

/**
 * Parse a product URI to extract product ID and color ID.
 * @throws TypeError / URIError when the URI is malformed
 */
export function parseProductUri(uri: string): { productId: string; colorId?: string } {
  const url = new URL(uri);
  const productId = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const colorId = url.searchParams.get('color') || undefined;
  return { productId, colorId };
}

/**
 * Create a look URI from a look ID
 */
export function createLookUri(lookId: string): string {
  return `look:///${encodeURIComponent(lookId)}`;
}

/**
 * Parse a look URI to extract the look ID.
 * @throws TypeError / URIError when the URI is malformed
 */
export function parseLookUri(uri: string): { lookId: string } {
  const url = new URL(uri);
  return { lookId: decodeURIComponent(url.pathname.replace(/^\//, '')) };
}
