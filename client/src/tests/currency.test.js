import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyFromCents,
  formatPricingUnit,
  getBookingReference,
} from '../utils/currency';

describe('CareConnect Currency & Reference Utilities', () => {
  describe('formatCurrency', () => {
    it('formats normal major-unit amounts into standard INR currency strings', () => {
      const result = formatCurrency(1500);
      expect(result).toBe('₹1,500.00');
    });

    it('formats zero correctly with standard decimals', () => {
      expect(formatCurrency(0)).toBe('₹0.00');
    });

    it('formats decimal amounts accurately', () => {
      expect(formatCurrency(1250.5)).toBe('₹1,250.50');
      expect(formatCurrency(99.99)).toBe('₹99.99');
    });

    it('formats large amounts using Indian number grouping (lakhs / crores)', () => {
      // 10 lakhs = 1,000,000
      expect(formatCurrency(1000000)).toBe('₹10,00,000.00');
      // 1 crore = 10,000,000
      expect(formatCurrency(12500000)).toBe('₹1,25,00,000.00');
    });

    it('gracefully handles null, undefined, and non-numeric inputs', () => {
      expect(formatCurrency(null)).toBe('₹0.00');
      expect(formatCurrency(undefined)).toBe('₹0.00');
      expect(formatCurrency('invalid')).toBe('₹0.00');
    });

    it('respects custom override options such as maximumFractionDigits without throwing RangeError', () => {
      expect(formatCurrency(85, { maximumFractionDigits: 0, minimumFractionDigits: 0 })).toBe('₹85');
      expect(formatCurrency(12500, { maximumFractionDigits: 0 })).toBe('₹12,500');
    });
  });

  describe('formatCurrencyFromCents', () => {
    it('converts integer subunits (cents/paise) to major INR units at the presentation boundary', () => {
      // 5000 cents/paise = ₹50.00
      expect(formatCurrencyFromCents(5000)).toBe('₹50.00');
      // 1250000 cents/paise = ₹12,500.00
      expect(formatCurrencyFromCents(1250000)).toBe('₹12,500.00');
    });

    it('handles zero and null integer subunit values safely', () => {
      expect(formatCurrencyFromCents(0)).toBe('₹0.00');
      expect(formatCurrencyFromCents(null)).toBe('₹0.00');
      expect(formatCurrencyFromCents(undefined)).toBe('₹0.00');
    });
  });

  describe('formatPricingUnit', () => {
    it('formats FIXED category pricing', () => {
      expect(formatPricingUnit('FIXED', 450)).toBe('₹450 (Fixed price)');
    });

    it('formats HOURLY category pricing', () => {
      expect(formatPricingUnit('HOURLY', 85)).toBe('₹85 / hour');
    });

    it('formats STARTING_FROM category pricing', () => {
      expect(formatPricingUnit('STARTING_FROM', 65)).toBe('Starting at ₹65');
    });

    it('formats QUOTE_REQUIRED category pricing', () => {
      expect(formatPricingUnit('QUOTE_REQUIRED', null)).toBe('Custom quote required');
      expect(formatPricingUnit('QUOTE_REQUIRED', 0)).toBe('Custom quote required');
    });

    it('handles missing or undefined prices gracefully', () => {
      expect(formatPricingUnit('HOURLY', null)).toBe('N/A');
      expect(formatPricingUnit('FIXED', undefined)).toBe('N/A');
    });
  });

  describe('getBookingReference', () => {
    it('generates non-sensitive references with BK prefix from MongoDB ObjectId', () => {
      const booking = { _id: '6529f7b1c3b123456789abcd' };
      expect(getBookingReference(booking)).toBe('BK-6789ABCD');
    });

    it('works directly with ID strings', () => {
      expect(getBookingReference('6529f7b1c3b123456789abcd')).toBe('BK-6789ABCD');
    });

    it('handles short ID fixtures in test environments', () => {
      expect(getBookingReference({ _id: 'book1' })).toBe('BK-BOOK1');
      expect(getBookingReference('book1')).toBe('BK-BOOK1');
    });

    it('prioritizes explicit human-readable booking numbers when available', () => {
      expect(getBookingReference({ bookingNumber: 'CC-BK-2026-00042', _id: '6529f7b1c3b123456789abcd' })).toBe(
        'CC-BK-2026-00042'
      );
      expect(getBookingReference({ reference: 'REF-998877', _id: '6529f7b1c3b123456789abcd' })).toBe(
        'REF-998877'
      );
    });

    it('returns a fallback for null or missing inputs', () => {
      expect(getBookingReference(null)).toBe('BK-UNKNOWN');
      expect(getBookingReference({})).toBe('BK-UNKNOWN');
    });
  });
});
