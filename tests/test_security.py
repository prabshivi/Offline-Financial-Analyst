"""
tests/test_security.py
Verifies Canadian PIPEDA and OSFI B-13 compliance:
- PII scrubbing (SIN, PAN, Transit, Institution codes)
- Key derivation determinism & high-entropy salt requirements
- Magic-byte input validation and executable blocking
- Zero outbound network enforcement
"""

import pytest
import socket
from core.security import (
    PIISanitizer,
    KeyDerivationEngine,
    InputValidator,
    enforce_zero_outbound_network
)


def test_pii_sanitization_sin():
    """Verify Canadian SIN numbers (9 digits) are masked."""
    raw_sample = "Client SIN: 123-456-789 recorded on statement line."
    sanitized = PIISanitizer.sanitize_text(raw_sample)
    assert "123-456-789" not in sanitized
    assert "***-***-789" in sanitized


def test_pii_sanitization_pan():
    """Verify 16-digit Primary Account Numbers (Credit Cards) are masked."""
    raw_sample = "Payment made from Card 4500 1234 5678 9876."
    sanitized = PIISanitizer.sanitize_text(raw_sample)
    assert "4500 1234 5678 9876" not in sanitized
    assert "****-****-****-9876" in sanitized


def test_pii_sanitization_transit_and_institution():
    """Verify Canadian banking routing (Transit 5 digits + Institution 3 digits) is scrubbed."""
    raw_sample = "Direct Deposit Transit: 09124 Inst: 003 to Chequing"
    sanitized = PIISanitizer.sanitize_text(raw_sample)
    assert "09124" not in sanitized
    assert "Transit: ***** - Inst: ***" in sanitized


def test_key_derivation_entropy():
    """Verify key derivation generates 32-byte (256-bit) keys with unique salts."""
    salt1 = KeyDerivationEngine.generate_salt()
    salt2 = KeyDerivationEngine.generate_salt()
    assert salt1 != salt2
    assert len(salt1) == 32

    key1 = KeyDerivationEngine.derive_key("MySecurePassphrase!", salt1)
    key2 = KeyDerivationEngine.derive_key("MySecurePassphrase!", salt2)
    assert key1 != key2
    assert len(key1) == 32


def test_magic_byte_validation():
    """Verify that disguised executable files are rejected."""
    # Fake Windows EXE header
    bad_exe = b"MZ\x90\x00\x03\x00\x00\x00"
    valid, msg = InputValidator.validate_file_buffer(bad_exe, "statement.pdf")
    assert valid is False
    assert "Disallowed executable" in msg

    # Valid PDF header
    good_pdf = b"%PDF-1.4 header sample contents"
    valid_pdf, _ = InputValidator.validate_file_buffer(good_pdf, "statement.pdf")
    assert valid_pdf is True


def test_zero_outbound_network():
    """Verify outbound network hook blocks unauthorized external sockets."""
    enforce_zero_outbound_network()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    with pytest.raises(PermissionError) as exc_info:
        # Attempt external connection to an arbitrary public IP
        s.connect(("8.8.8.8", 53))
    assert "OSFI B-13 SECURITY VIOLATION" in str(exc_info.value)
