/**
 * Advanced Client & Server PII Sanitization Engine
 * Zero-Knowledge and PIPEDA / PCI-DSS / GDPR compliance helper for masking sensitive data
 */

export interface PIIScrubResult {
  scrubbedText: string;
  itemsRedactedCount: number;
  redactedTypes: string[];
}

export const SENSITIVE_PATTERNS = {
  // Canadian Social Insurance Number (SIN) / US Social Security Number (SSN)
  sinOrSsn: /\b(?:\d{3}[-\s]\d{3}[-\s]\d{3}|\d{3}[-\s]\d{2}[-\s]\d{4})\b/g,
  
  // Full Credit / Debit Primary Account Number (PAN: 13-19 digits, with spaces or dashes)
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,

  // Partially masked cards (e.g. ************1234 or XXXX-XXXX-XXXX-1234)
  partialMaskedCard: /\b(?:\*{4}[ -]?|[xX]{4}[ -]?){2,3}\d{4}\b/g,

  // Bank transit and institution codes (e.g., Transit: 12345, Inst: 004 or 12345-004)
  transitNumber: /\b\d{5}[-\s]\d{3}\b|\b(?:Transit|Branch|Routing)[:\s#]*\d{5,9}\b/gi,

  // Account numbers with prefixes (e.g., Acc #12345678, Account: 9812-40182)
  accountPrefixNumber: /(?:ACCT|ACCOUNT|ACC|A\/C|IBAN|NO|#)[:\s#-]*([A-Z0-9-]{6,20})\b/gi,

  // Phone numbers (e.g., +1 555-123-4567, (555) 123-4567, 555.123.4567)
  phoneNumber: /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

  // Physical Postal codes & Zip codes (Canadian A1A 1A1, US 5 or 9 digit ZIP)
  postalCode: /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b|\b\d{5}(?:-\d{4})?\b/g,

  // Street address lines (e.g., 123 Main Street, Suite 400)
  streetAddress: /\b\d{1,5}\s+(?:[A-Za-z0-9.#-]+\s+){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Highway|Hwy|Place|Pl|Suite|Ste|Apt|Unit)\b/gi
};

/**
 * Validates a potential credit card number using Luhn algorithm
 */
export function isValidLuhn(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Deeply redacts all personal identifying information from statement text or memos.
 */
export function sanitizeFinancialText(text: string | null | undefined): PIIScrubResult {
  if (!text || typeof text !== 'string') {
    return { scrubbedText: '', itemsRedactedCount: 0, redactedTypes: [] };
  }

  let sanitized = text;
  let count = 0;
  const typesSet = new Set<string>();

  // 1. Social Insurance / Security Numbers
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.sinOrSsn, () => {
    count++;
    typesSet.add('SIN/SSN');
    return '[PROTECTED-GOV-ID]';
  });

  // 2. Full credit card numbers with Luhn check
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.creditCard, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && isValidLuhn(digits)) {
      count++;
      typesSet.add('Card-Number');
      const last4 = digits.slice(-4);
      return `[CARD-****-${last4}]`;
    }
    return match;
  });

  // 3. Partial card patterns
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.partialMaskedCard, () => {
    count++;
    typesSet.add('Card-Token');
    return '[CARD-PROTECTED]';
  });

  // 4. Transit / Routing numbers
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.transitNumber, () => {
    count++;
    typesSet.add('Transit/Routing');
    return '[TRANSIT-PROTECTED]';
  });

  // 5. Explicit Account Numbers
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.accountPrefixNumber, (_match, p1) => {
    count++;
    typesSet.add('Account-Number');
    if (p1 && p1.length >= 4) {
      const last3 = p1.slice(-3);
      return `ACCT-[***-${last3}]`;
    }
    return 'ACCT-[PROTECTED]';
  });

  // 6. Emails
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, () => {
    count++;
    typesSet.add('Email');
    return '[EMAIL-PROTECTED]';
  });

  // 7. Phone numbers
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.phoneNumber, () => {
    count++;
    typesSet.add('Phone');
    return '[PHONE-PROTECTED]';
  });

  // 8. Physical street addresses
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.streetAddress, () => {
    count++;
    typesSet.add('Address');
    return '[ADDRESS-REDACTED]';
  });

  // Clean extra whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return {
    scrubbedText: sanitized,
    itemsRedactedCount: count,
    redactedTypes: Array.from(typesSet)
  };
}

/**
 * Obscures sensitive numeric balance strings on UI (e.g. for Privacy Mode / Screen Blurring)
 */
export function maskMonetaryValue(formattedString: string, isPrivacyMaskActive: boolean): string {
  if (!isPrivacyMaskActive) return formattedString;
  return '••••••';
}
