// A more robust and scalable number-to-words conversion utility.

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

// Scales can be extended to handle even larger numbers if necessary.
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];

/**
 * Converts a number from 0 to 999 into words.
 * This is the building block for the main converter.
 * @param {number} num - The number chunk to convert.
 * @returns {string} The number chunk in words.
 */
function convertChunkToWords(num: number): string {
  if (num === 0) {
    return '';
  }

  if (num < 20) {
    return ONES[num];
  }

  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return TENS[ten] + (one > 0 ? ' ' + ONES[one] : '');
  }

  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  let words = ONES[hundred] + ' hundred';
  if (remainder > 0) {
    // Uses 'and' for consistency with British/Nigerian English style.
    words += ' and ' + convertChunkToWords(remainder);
  }
  return words;
}

/**
 * Converts a non-negative integer into its word representation by processing it in chunks.
 * @param {number} num - The integer to convert.
 * @returns {string} The number in words.
 */
function numberToWords(num: number): string {
  if (num === 0) {
    return 'zero';
  }

  let words = '';
  let scaleIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk !== 0) {
      const chunkWords = convertChunkToWords(chunk);
      const scaleWord = SCALES[scaleIndex] ? ' ' + SCALES[scaleIndex] : '';
      // Prepend the new chunk to the existing words.
      words = chunkWords + scaleWord + (words ? ' ' + words : '');
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }
  
  return words.trim();
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} s - The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalizeFirstLetter(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A generic function to convert a currency amount into its full word representation.
 * @param {number} amount - The numeric amount.
 * @param {string} currencyMajor - The name for the major unit (e.g., 'Naira').
 * @param {string} currencyMinor - The name for the minor unit (e.g., 'Kobo').
 * @returns {string} The full amount in words, e.g., "One thousand Naira and fifty Kobo only".
 */
function formatCurrencyAmountInWords(
  amount: number,
  currencyMajor: string,
  currencyMinor: string
): string {
  if (isNaN(amount) || amount < 0) {
    return 'Invalid Amount';
  }

  let majorUnit = Math.floor(amount);
  let minorUnit = Math.round((amount - majorUnit) * 100);
  
  // Handle edge case where rounding minor unit increments major unit (e.g., 1.999 -> 2.00)
  if (minorUnit === 100) {
      majorUnit += 1;
      minorUnit = 0;
  }

  const majorWords = capitalizeFirstLetter(numberToWords(majorUnit));
  let result = `${majorWords} ${currencyMajor}`;

  if (minorUnit > 0) {
    const minorWords = numberToWords(minorUnit);
    result += ` and ${minorWords} ${currencyMinor}`;
  }

  return `${result} only`;
}

/**
 * Public function to convert a given amount to words based on the specified currency.
 * @param {number} amount - The amount to convert.
 * @param {'NGN' | 'USD'} currency - The currency code.
 * @returns {string} The amount in words.
 */
export function convertAmountToWords(amount: number, currency: 'NGN' | 'USD'): string {
    if (currency === 'USD') {
        return formatCurrencyAmountInWords(amount, 'Dollars', 'Cents');
    }
    // Default to NGN
    return formatCurrencyAmountInWords(amount, 'Naira', 'Kobo');
}
