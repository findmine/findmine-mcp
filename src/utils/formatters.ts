/**
 * Utility functions for formatting data
 */

/**
 * Format a price value to a proper dollar amount with 2 decimal places
 * This handles prices that come in as cents (8999 = $89.99)
 * 
 * @param price The price to format (can be number or string)
 * @param currency The currency symbol to use (default: "$")
 * @param inCents Whether the price is provided in cents (default: true)
 * @returns A formatted price string with currency symbol and 2 decimal places
 */
export function formatPrice(
  price: number | string | undefined, 
  currency: string = "$", 
  inCents: boolean = true
): string | undefined {
  if (price === undefined || price === null) {
    return undefined;
  }
  
  // Convert to number if it's a string
  let numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Convert from cents to dollars if needed
  if (inCents) {
    numericPrice = numericPrice / 100;
  }
  
  // Format with 2 decimal places
  return `${currency}${numericPrice.toFixed(2)}`;
}

/**
 * Format a price range for display
 * 
 * @param minPrice The minimum price
 * @param maxPrice The maximum price
 * @param currency The currency symbol to use (default: "$")
 * @param inCents Whether the price is provided in cents (default: true)
 * @returns A formatted price range string
 */
export function formatPriceRange(
  minPrice: number | string | undefined, 
  maxPrice: number | string | undefined, 
  currency: string = "$",
  inCents: boolean = true
): string | undefined {
  if (minPrice === undefined && maxPrice === undefined) {
    return undefined;
  }
  
  if (minPrice !== undefined && maxPrice === undefined) {
    return formatPrice(minPrice, currency, inCents);
  }
  
  if (minPrice === undefined && maxPrice !== undefined) {
    return formatPrice(maxPrice, currency, inCents);
  }
  
  return `${formatPrice(minPrice, currency, inCents)} - ${formatPrice(maxPrice, currency, inCents)}`;
}