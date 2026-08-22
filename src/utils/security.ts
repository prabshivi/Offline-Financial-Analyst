/**
 * Security & PII Sanitization Utility
 * Zero-Knowledge and PIPEDA / PCI-DSS compliance helper for masking and scrubbing sensitive data
 */

export interface ScrubbingMetrics {
  originalLength: number;
  scrubbedLength: number;
  creditCardMatches: number;
  transitMatches: number;
  sinMatches: number;
  phoneMatches: number;
  emailMatches: number;
  accountMatches: number;
}

/**
 * Common Regex patterns for detecting financial and personal identifiers
 */
export const PII_PATTERNS = {
  // Credit / Debit Card Numbers (13 to 19 digits, with optional spaces or dashes)
  // E.g., 4532 1234 5678 9010, 3782-822463-10005
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,

  // Masked/Partial Card representations with last 4 exposed (e.g., **** **** **** 1234 or XXXX-XXXX-XXXX-5678)
  partialCard: /\b(?:\*{4}[ -]?|\bX{4}[ -]?){3}\d{4}\b/gi,

  // Canadian Bank Transit & Routing Numbers: 5 digits transit + 3 digits institution (e.g., 12345-004 or 12345 004)
  transitNumber: /\b\d{5}[-\s]\d{3}\b/g,

  // Canadian Social Insurance Numbers (SIN) or US SSN: 9 digits (XXX-XXX-XXX or XXX XX XXXX)
  sinOrSsn: /\b\d{3}[-\s]\d{3}[-\s]\d{3}\b|\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,

  // Standard Bank Account numbers with prefixes (e.g., ACCT #102-992-1, ACC: 981240182, A/C: 12345678)
  accountPrefixNumber: /(?:ACCT|ACCOUNT|ACC|A\/C|IBAN|NO|#)[:\s#-]*([A-Z0-9-]{6,20})\b/gi,

  // Standalone long digit strings that represent raw internal account IDs (7 to 12 contiguous digits)
  rawAccountId: /\b\d{7,12}\b/g,

  // Phone numbers (North American & International)
  phoneNumber: /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
};

/**
 * Scrubs and masks Personally Identifiable Information (PII) from a raw transaction description or text string.
 * Replaces sensitive identifiers (credit cards, transit numbers, SINs, raw account IDs, emails, phone numbers)
 * with privacy-safe tokens like [REDACTED-CARD], [REDACTED-TRANSIT], [REDACTED-SIN], or [REDACTED-ACCT].
 *
 * @param text The input string to scrub
 * @returns The sanitized, masked string
 */
export function scrubPII(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Mask Canadian Social Insurance Numbers (SIN) & US SSNs
  sanitized = sanitized.replace(PII_PATTERNS.sinOrSsn, '[REDACTED-SIN]');

  // 2. Mask Canadian Transit & Institution Numbers (e.g., 12345-004)
  sanitized = sanitized.replace(PII_PATTERNS.transitNumber, '[REDACTED-TRANSIT]');

  // 3. Mask Full Credit/Debit Card Numbers
  sanitized = sanitized.replace(PII_PATTERNS.creditCard, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      const last4 = digitsOnly.slice(-4);
      return `[CARD-****-${last4}]`;
    }
    return match;
  });

  // 4. Mask Partial Card strings
  sanitized = sanitized.replace(PII_PATTERNS.partialCard, '[CARD-PROTECTED]');

  // 5. Mask Account Numbers with explicit prefixes (e.g. ACCT #102-992-1)
  sanitized = sanitized.replace(PII_PATTERNS.accountPrefixNumber, (match, p1) => {
    if (p1 && p1.length >= 5) {
      const last3 = p1.slice(-3);
      return `ACCT-[REDACTED-***-${last3}]`;
    }
    return match;
  });

  // 6. Mask Phone Numbers
  sanitized = sanitized.replace(PII_PATTERNS.phoneNumber, '[REDACTED-PHONE]');

  // 7. Mask Email Addresses
  sanitized = sanitized.replace(PII_PATTERNS.email, '[REDACTED-EMAIL]');

  // 8. Mask Standalone long account numbers (7 to 12 digits, but avoiding common merchant store IDs with #)
  sanitized = sanitized.replace(/(^|\s)(\d{7,12})(\s|$)/g, '$1[REDACTED-ACCT]$3');

  // Collapse consecutive redaction tokens and spaces cleanly
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Returns true if the input text contains any detectible PII patterns
 */
export function containsPII(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  return (
    Boolean(text.match(PII_PATTERNS.creditCard)) ||
    Boolean(text.match(PII_PATTERNS.transitNumber)) ||
    Boolean(text.match(PII_PATTERNS.sinOrSsn)) ||
    Boolean(text.match(PII_PATTERNS.accountPrefixNumber)) ||
    Boolean(text.match(PII_PATTERNS.phoneNumber)) ||
    Boolean(text.match(PII_PATTERNS.email))
  );
}

/**
 * Audits a text string and returns metrics on PII patterns detected and scrubbed
 */
export function auditAndScrubPII(text: string): { scrubbed: string; metrics: ScrubbingMetrics } {
  if (!text) {
    return {
      scrubbed: '',
      metrics: {
        originalLength: 0,
        scrubbedLength: 0,
        creditCardMatches: 0,
        transitMatches: 0,
        sinMatches: 0,
        phoneMatches: 0,
        emailMatches: 0,
        accountMatches: 0
      }
    };
  }

  const sinMatches = (text.match(PII_PATTERNS.sinOrSsn) || []).length;
  const transitMatches = (text.match(PII_PATTERNS.transitNumber) || []).length;
  const creditCardMatches = (text.match(PII_PATTERNS.creditCard) || []).length;
  const phoneMatches = (text.match(PII_PATTERNS.phoneNumber) || []).length;
  const emailMatches = (text.match(PII_PATTERNS.email) || []).length;
  const accountMatches = (text.match(PII_PATTERNS.accountPrefixNumber) || []).length;

  const scrubbed = scrubPII(text);

  return {
    scrubbed,
    metrics: {
      originalLength: text.length,
      scrubbedLength: scrubbed.length,
      creditCardMatches,
      transitMatches,
      sinMatches,
      phoneMatches,
      emailMatches,
      accountMatches
    }
  };
}
