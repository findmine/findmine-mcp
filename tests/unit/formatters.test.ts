import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceRange } from '../../src/utils/formatters.js';

describe('formatters', () => {
  describe('formatPrice', () => {
    describe('with cents (default)', () => {
      it('should format a price in cents to dollars', () => {
        expect(formatPrice(8999)).toBe('$89.99');
      });

      it('should format zero cents', () => {
        expect(formatPrice(0)).toBe('$0.00');
      });

      it('should format small amounts correctly', () => {
        expect(formatPrice(99)).toBe('$0.99');
        expect(formatPrice(1)).toBe('$0.01');
      });

      it('should format large amounts correctly', () => {
        expect(formatPrice(100000)).toBe('$1000.00');
        expect(formatPrice(999999)).toBe('$9999.99');
      });

      it('should format string prices', () => {
        expect(formatPrice('8999')).toBe('$89.99');
        expect(formatPrice('4599')).toBe('$45.99');
      });
    });

    describe('with dollars (inCents: false)', () => {
      it('should format dollar amounts directly', () => {
        expect(formatPrice(89.99, '$', false)).toBe('$89.99');
      });

      it('should format whole dollar amounts', () => {
        expect(formatPrice(100, '$', false)).toBe('$100.00');
      });

      it('should format string dollar amounts', () => {
        expect(formatPrice('45.50', '$', false)).toBe('$45.50');
      });
    });

    describe('with custom currency', () => {
      it('should use custom currency symbol', () => {
        expect(formatPrice(8999, '€')).toBe('€89.99');
        expect(formatPrice(8999, '£')).toBe('£89.99');
        expect(formatPrice(8999, '¥')).toBe('¥89.99');
      });
    });

    describe('edge cases', () => {
      it('should return undefined for undefined input', () => {
        expect(formatPrice(undefined)).toBeUndefined();
      });

      it('should return undefined for null input', () => {
        expect(formatPrice(null)).toBeUndefined();
      });

      it('should handle floating point precision', () => {
        // 33.33 in cents should still format correctly
        expect(formatPrice(3333)).toBe('$33.33');
      });

      it('should handle negative amounts', () => {
        expect(formatPrice(-1000)).toBe('$-10.00');
      });
    });
  });

  describe('formatPriceRange', () => {
    describe('basic range formatting', () => {
      it('should format a price range with both min and max', () => {
        expect(formatPriceRange(2999, 5999)).toBe('$29.99 - $59.99');
      });

      it('should format with custom currency', () => {
        expect(formatPriceRange(2999, 5999, '€')).toBe('€29.99 - €59.99');
      });

      it('should format in dollars (inCents: false)', () => {
        expect(formatPriceRange(29.99, 59.99, '$', false)).toBe('$29.99 - $59.99');
      });
    });

    describe('single value ranges', () => {
      it('should return single price when only min is provided', () => {
        expect(formatPriceRange(2999, undefined)).toBe('$29.99');
      });

      it('should return single price when only max is provided', () => {
        expect(formatPriceRange(undefined, 5999)).toBe('$59.99');
      });
    });

    describe('edge cases', () => {
      it('should return undefined when both min and max are undefined', () => {
        expect(formatPriceRange(undefined, undefined)).toBeUndefined();
      });

      it('should handle same min and max values', () => {
        expect(formatPriceRange(2999, 2999)).toBe('$29.99 - $29.99');
      });

      it('should handle string values', () => {
        expect(formatPriceRange('2999', '5999')).toBe('$29.99 - $59.99');
      });
    });
  });
});
