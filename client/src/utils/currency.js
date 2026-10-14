/**
 * CareConnect Currency & Reference Utility
 * Standardizes INR (₹) monetary presentation and non-sensitive reference generation.
 */

const DEFAULT_CURRENCY_OPTIONS = {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const COMPACT_CURRENCY_OPTIONS = {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

/**
 * Formats a major currency unit amount (e.g. 1500 -> ₹1,500.00) in INR.
 * @param {number|string|null|undefined} amount - Amount in major currency units (Rupees)
 * @param {Intl.NumberFormatOptions} [options={}] - Override Intl.NumberFormat options
 * @returns {string} Formatted INR currency string
 */
export function formatCurrency(amount, options = {}) {
  const num = Number(amount);
  if (amount === null || amount === undefined || isNaN(num)) {
    return '₹0.00';
  }
  const opts = {
    ...DEFAULT_CURRENCY_OPTIONS,
    ...options,
  };
  if (
    opts.maximumFractionDigits !== undefined &&
    opts.minimumFractionDigits !== undefined &&
    opts.minimumFractionDigits > opts.maximumFractionDigits
  ) {
    opts.minimumFractionDigits = opts.maximumFractionDigits;
  }
  return new Intl.NumberFormat('en-IN', opts).format(num);
}

/**
 * Formats an amount stored in integer cents / paise (e.g. 150000 -> ₹1,500.00).
 * Prevents double-conversion by explicitly dividing by 100 at the presentation boundary.
 * @param {number|string|null|undefined} cents - Amount in integer subunits (paise / cents)
 * @param {Intl.NumberFormatOptions} [options={}] - Override Intl.NumberFormat options
 * @returns {string} Formatted INR currency string
 */
export function formatCurrencyFromCents(cents, options = {}) {
  const num = Number(cents);
  if (cents === null || cents === undefined || isNaN(num)) {
    return '₹0.00';
  }
  return formatCurrency(num / 100, options);
}

/**
 * Formats a category pricing unit or rate with clean INR display.
 * @param {string} [unit] - 'HOURLY', 'FIXED', 'STARTING_FROM', 'QUOTE_REQUIRED'
 * @param {number|string} [price] - Amount in major currency units
 * @returns {string}
 */
export function formatPricingUnit(unit, price) {
  if (price === undefined || price === null || isNaN(Number(price))) {
    return unit === 'QUOTE_REQUIRED' ? 'Custom quote required' : 'N/A';
  }
  const formatted = formatCurrency(price, COMPACT_CURRENCY_OPTIONS);
  switch (unit) {
    case 'FIXED':
      return `${formatted} (Fixed price)`;
    case 'HOURLY':
      return `${formatted} / hour`;
    case 'STARTING_FROM':
      return `Starting at ${formatted}`;
    case 'QUOTE_REQUIRED':
      return 'Custom quote required';
    default:
      return formatted;
  }
}

/**
 * Generates a stable, non-sensitive booking reference for customer and public displays.
 * If an explicit human-readable bookingNumber exists, it is used.
 * Otherwise, generates a stable reference prefix (e.g. BK-C3B12345) from the database identifier.
 * @param {Object|string} booking - Booking object or ID string
 * @returns {string}
 */
export function getBookingReference(booking) {
  if (!booking) return 'BK-UNKNOWN';
  if (typeof booking === 'string') {
    const cleanId = booking.trim();
    if (cleanId.length >= 8) {
      return `BK-${cleanId.substring(cleanId.length - 8).toUpperCase()}`;
    }
    return `BK-${cleanId.toUpperCase()}`;
  }

  if (booking.bookingNumber) return booking.bookingNumber;
  if (booking.reference) return booking.reference;

  const rawId = String(booking._id || booking.id || '').trim();
  if (!rawId) return 'BK-UNKNOWN';

  if (rawId.length >= 8) {
    return `BK-${rawId.substring(rawId.length - 8).toUpperCase()}`;
  }
  return `BK-${rawId.toUpperCase()}`;
}
