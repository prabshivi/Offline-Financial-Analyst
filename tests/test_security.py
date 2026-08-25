"""
tests/test_security.py
Verifies Canadian PIPEDA and OSFI B-13 compliance:
- PII scrubbing (SIN, PAN, Transit, Institution codes)
- Key derivation determinism & high-entropy salt requirements
- Magic-byte input validation and executable blocking
- Zero outbound network enforcement
"""

import unittest
import socket
from core.security import (
    PIISanitizer,
    KeyDerivationEngine,
    InputValidator,
    enforce_zero_outbound_network
)


class TestSecurityCompliance(unittest.TestCase):

    def test_pii_sanitization_sin(self):
        """Verify Canadian SIN numbers (9 digits) are masked."""
        raw_sample = "Client SIN: 123-456-789 recorded on statement line."
        sanitized = PIISanitizer.sanitize_text(raw_sample)
        self.assertNotIn("123-456-789", sanitized)
        self.assertIn("***-***-789", sanitized)

    def test_pii_sanitization_pan(self):
        """Verify 16-digit Primary Account Numbers (Credit Cards) are masked."""
        raw_sample = "Payment made from Card 4500 1234 5678 9876."
        sanitized = PIISanitizer.sanitize_text(raw_sample)
        self.assertNotIn("4500 1234 5678 9876", sanitized)
        self.assertIn("****-****-****-9876", sanitized)

    def test_pii_sanitization_transit_and_institution(self):
        """Verify Canadian banking routing (Transit 5 digits + Institution 3 digits) is scrubbed."""
        raw_sample = "Direct Deposit Transit: 09124 Inst: 003 to Chequing"
        sanitized = PIISanitizer.sanitize_text(raw_sample)
        self.assertNotIn("09124", sanitized)
        self.assertIn("Transit: ***** - Inst: ***", sanitized)

    def test_key_derivation_entropy(self):
        """Verify key derivation generates 32-byte (256-bit) keys with unique salts."""
        salt1 = KeyDerivationEngine.generate_salt()
        salt2 = KeyDerivationEngine.generate_salt()
        self.assertNotEqual(salt1, salt2)
        self.assertEqual(len(salt1), 32)

        key1 = KeyDerivationEngine.derive_key("MySecurePassphrase!", salt1)
        key2 = KeyDerivationEngine.derive_key("MySecurePassphrase!", salt2)
        self.assertNotEqual(key1, key2)
        self.assertEqual(len(key1), 32)

    def test_magic_byte_validation(self):
        """Verify that disguised executable files are rejected."""
        # Fake Windows EXE header
        bad_exe = b"MZ\x90\x00\x03\x00\x00\x00"
        valid, msg = InputValidator.validate_file_buffer(bad_exe, "statement.pdf")
        self.assertFalse(valid)
        self.assertIn("Disallowed executable", msg)

        # Valid PDF header
        good_pdf = b"%PDF-1.4 header sample contents"
        valid_pdf, _ = InputValidator.validate_file_buffer(good_pdf, "statement.pdf")
        self.assertTrue(valid_pdf)

    def test_zero_outbound_network(self):
        """Verify outbound network hook blocks unauthorized external sockets."""
        enforce_zero_outbound_network()
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            with self.assertRaises(PermissionError) as context:
                # Attempt external connection to an arbitrary public IP
                s.connect(("8.8.8.8", 53))
            self.assertIn("OSFI B-13 SECURITY VIOLATION", str(context.exception))
        finally:
            s.close()


if __name__ == "__main__":
    unittest.main()

