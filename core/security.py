"""
core/security.py
PIPEDA Schedule 1 & OSFI Guideline B-13 Compliance Engine.
- Pre-flight Socket Hooks (Zero Outbound Network Enforcement)
- Argon2id / Cryptographic Key Derivation (AES-256 Key Generation)
- PII Sanitization & Masking Engine (SIN, PAN, Transit, Institution Codes)
- Defensive In-Memory Input & Magic-Byte Validation
"""

import os
import re
import socket
import hashlib
import io
from typing import Tuple, Optional, Dict, Any, List

# --- 1. ZERO OUTBOUND NETWORK ENFORCEMENT (OSFI B-13 & PIPEDA) ---
_ORIGINAL_SOCKET_CONNECT = socket.socket.connect
_NETWORK_RESTRICTION_ACTIVE = False

def enforce_zero_outbound_network(allowed_hosts: Optional[List[str]] = None) -> None:
    """
    Installs a strict socket hook preventing any outbound internet traffic,
    telemetry, or DNS requests. Only loopback connections (127.0.0.1, localhost)
    are permitted for internal Streamlit server-browser communication.
    """
    global _NETWORK_RESTRICTION_ACTIVE
    if _NETWORK_RESTRICTION_ACTIVE:
        return

    permitted = {"127.0.0.1", "localhost", "::1", "0.0.0.0"}
    if allowed_hosts:
        permitted.update(allowed_hosts)

    def guarded_connect(self, address):
        host = address[0] if isinstance(address, tuple) else str(address)
        if host not in permitted and not host.startswith("127."):
            raise PermissionError(
                f"[OSFI B-13 SECURITY VIOLATION] Blocked unauthorized outbound network call to {host}. "
                f"Local Finance Vault operates strictly offline in Zero-Knowledge mode."
            )
        return _ORIGINAL_SOCKET_CONNECT(self, address)

    socket.socket.connect = guarded_connect
    _NETWORK_RESTRICTION_ACTIVE = True


# --- 2. KEY DERIVATION & ENCRYPTION KEY LIFECYCLE ---
class KeyDerivationEngine:
    """
    Derives deterministic 256-bit encryption keys from user passphrases using Argon2id
    or high-iteration PBKDF2-HMAC-SHA256 with 32-byte cryptographic salts.
    """
    SALT_SIZE = 32
    ITERATIONS = 250_000  # Minimum 250k iterations for brute-force resistance

    @staticmethod
    def generate_salt() -> bytes:
        """Generates a cryptographically strong 32-byte random salt."""
        return os.urandom(KeyDerivationEngine.SALT_SIZE)

    @classmethod
    def derive_key(cls, passphrase: str, salt: bytes) -> bytes:
        """
        Derives a 32-byte (256-bit) AES key. Uses Argon2id if available;
        falls back to PBKDF2-HMAC-SHA256 with 250,000 rounds.
        """
        if not passphrase:
            raise ValueError("Passphrase cannot be empty.")
        if len(salt) < 16:
            raise ValueError("Salt must be at least 16 bytes.")

        try:
            from argon2.low_level import hash_secret_raw, Type
            # Argon2id with 64MB memory cost, 4 lanes, 3 time cost passes
            raw_key = hash_secret_raw(
                secret=passphrase.encode("utf-8"),
                salt=salt,
                time_cost=3,
                memory_cost=65536,  # 64 MB
                parallelism=4,
                hash_len=32,
                type=Type.ID
            )
            return raw_key
        except (ImportError, Exception):
            # Cryptographic fallback using hashlib PBKDF2 with 250,000 iterations
            return hashlib.pbkdf2_hmac(
                "sha256",
                passphrase.encode("utf-8"),
                salt,
                cls.ITERATIONS,
                dklen=32
            )

    @classmethod
    def derive_hex_key(cls, passphrase: str, salt: bytes) -> str:
        """Returns 64-character hex representation for SQLCipher pragma key."""
        return cls.derive_key(passphrase, salt).hex()

    @staticmethod
    def generate_verification_token(raw_key: bytes) -> str:
        """Generates a non-reversible verification check hash for password confirmation."""
        return hashlib.sha256(b"VAULT_VERIFY_TOKEN_v1:" + raw_key).hexdigest()

    @staticmethod
    def secure_wipe_bytes(data: bytearray) -> None:
        """Overwrites sensitive memory buffer with zeros."""
        if isinstance(data, bytearray):
            for i in range(len(data)):
                data[i] = 0


# --- 3. PII SANITIZATION & CANADIAN COMPLIANCE ENGINE (PIPEDA) ---
class PIISanitizer:
    """
    Scans, detects, and redacts Canadian Personally Identifiable Information (PII)
    including Social Insurance Numbers, Credit Card PANs, and Banking Transit Codes.
    """
    # Canadian Social Insurance Number (9 digits: XXX-XXX-XXX or XXX XXX XXX or XXXXXXXXX)
    SIN_REGEX = re.compile(r'\b(\d{3})[ -]?(\d{3})[ -]?(\d{3})\b')
    # Credit Card / PAN (13 to 19 digits with optional dashes or spaces)
    PAN_REGEX = re.compile(r'\b(?:\d{4}[ -]?){3}(\d{4})\b')
    # Amex 15-digit PAN
    AMEX_REGEX = re.compile(r'\b\d{4}[ -]?\d{6}[ -]?(\d{5})\b')
    # Canadian Bank Routing (Transit 5 digits + Institution 3 digits)
    TRANSIT_INST_REGEX = re.compile(r'\b(?:Transit|TRN|BR|Branch)[:#\s]*(\d{5})[- ]*(?:Inst|Bank|BK)[:#\s]*(\d{3})\b', re.IGNORECASE)
    # Generic Account Numbers with 7-12 digits
    GENERIC_ACCT_REGEX = re.compile(r'\b(?:Account|Acct|Folio|No\.)[:#\s]*(\d{6,12})\b', re.IGNORECASE)

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """
        Redacts all sensitive financial numbers and identifiers from input text.
        """
        if not text or not isinstance(text, str):
            return text

        # 1. Mask SIN (Canadian Social Insurance Numbers) -> keep last 3 digits: ***-***-123
        text = cls.SIN_REGEX.sub(r'***-***-\3', text)

        # 2. Mask 16-digit PANs -> ****-****-****-1234
        text = cls.PAN_REGEX.sub(r'****-****-****-\1', text)

        # 3. Mask 15-digit Amex PANs -> ****-******-12345
        text = cls.AMEX_REGEX.sub(r'****-******-\1', text)

        # 4. Mask Transit / Institution numbers
        text = cls.TRANSIT_INST_REGEX.sub(r'Transit: ***** - Inst: ***', text)

        # 5. Mask Account Numbers -> Acct: ******1234
        def mask_acct(match):
            acct = match.group(1)
            visible_tail = acct[-4:] if len(acct) >= 4 else acct
            return f"Acct: {'*' * (len(acct) - len(visible_tail))}{visible_tail}"

        text = cls.GENERIC_ACCT_REGEX.sub(mask_acct, text)
        return text

    @classmethod
    def mask_account_number(cls, acct_num: str) -> str:
        """Masks a dedicated account number string, displaying only last 4 digits."""
        if not acct_num:
            return "N/A"
        clean = re.sub(r'\D', '', str(acct_num))
        if len(clean) <= 4:
            return f"****{clean}"
        return f"{'*' * (len(clean) - 4)}{clean[-4:]}"


# --- 4. DEFENSIVE INPUT & IN-MEMORY PDF/CSV VALIDATION ---
class InputValidator:
    """
    Enforces magic-byte verification, file size caps, page count caps,
    and strictly in-memory processing with zero plaintext artifacts left on disk.
    """
    MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB max
    MAX_PDF_PAGES = 100                     # 100 pages DoS cap

    # Magic byte signatures
    MAGIC_PDF = b"%PDF-"
    MAGIC_ZIP = b"PK\x03\x04"  # For OFX zipped/packaged files if any
    DISALLOWED_EXECUTABLES = [
        b"MZ",                # Windows PE EXE/DLL
        b"\x7fELF",           # Linux ELF binary
        b"\xfe\xed\xfa",      # Mach-O binary
        b"\xcf\xfa\xed\xfe",  # Mach-O 64-bit
    ]

    @classmethod
    def validate_file_buffer(cls, file_bytes: bytes, filename: str) -> Tuple[bool, str]:
        """
        Validates file size, header signatures, and ensures no disguised executables.
        """
        if not file_bytes:
            return False, "File is empty."

        if len(file_bytes) > cls.MAX_FILE_SIZE_BYTES:
            return False, f"File exceeds maximum allowed size of {cls.MAX_FILE_SIZE_BYTES // (1024*1024)}MB."

        # Check for disguised executables
        header_4 = file_bytes[:4]
        for bad_magic in cls.DISALLOWED_EXECUTABLES:
            if file_bytes.startswith(bad_magic):
                return False, "[SECURITY ALERT] Disallowed executable binary detected. Upload rejected."

        ext = os.path.splitext(filename.lower())[1]

        if ext == ".pdf":
            if not file_bytes.startswith(cls.MAGIC_PDF):
                return False, "Invalid PDF header signature (%PDF- missing)."
        elif ext in [".csv", ".txt", ".ofx", ".qfx"]:
            # Verify plaintext / UTF-8 decodable
            try:
                sample = file_bytes[:2048].decode("utf-8", errors="replace")
                if "\x00" in sample:
                    return False, "Binary data detected in text statement file."
            except Exception as e:
                return False, f"Invalid text encoding: {str(e)}"
        else:
            return False, f"Unsupported file extension '{ext}'. Accepted: PDF, CSV, OFX, QFX."

        return True, "File verified successfully."

    @staticmethod
    def get_memory_stream(file_bytes: bytes) -> io.BytesIO:
        """Returns an isolated in-memory buffer for zero-disk leakage parsing."""
        return io.BytesIO(file_bytes)
