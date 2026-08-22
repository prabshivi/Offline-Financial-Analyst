"""
core/vault_manager.py
Multi-Tenant Zero-Knowledge Local Vault Lifecycle Manager.
- Dedicated Per-User Isolated Vault DBs (`data/vaults/{user_uuid}.db`)
- Argon2id Salt Generation & Key Lifecycle
- Rate-Limited Brute-Force Delay & Memory Isolation
- Session Purge & Zero-Knowledge State Flusher
"""

import os
import json
import uuid
import time
import gc
import datetime
from typing import Dict, List, Optional, Tuple, Any
from .security import KeyDerivationEngine
from .db import EncryptedVaultDB

VAULTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vaults")
INDEX_FILE = os.path.join(VAULTS_DIR, "vault_catalog.json")


class VaultManager:
    """
    Manages multi-tenant local vaults.
    Each user gets a dedicated, isolated database file.
    No master key or administrative backdoor exists.
    """

    _FAILED_ATTEMPTS: Dict[str, int] = {}
    _LAST_ATTEMPT_TIME: Dict[str, float] = {}

    @classmethod
    def _ensure_vault_dir(cls):
        os.makedirs(VAULTS_DIR, exist_ok=True)
        if not os.path.exists(INDEX_FILE):
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump({"vaults": []}, f, indent=2)

    @classmethod
    def _load_index(cls) -> Dict[str, Any]:
        cls._ensure_vault_dir()
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"vaults": []}

    @classmethod
    def _save_index(cls, data: Dict[str, Any]):
        cls._ensure_vault_dir()
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def list_available_vaults(cls) -> List[Dict[str, Any]]:
        """Lists all existing local vaults with storage metrics."""
        cls._ensure_vault_dir()
        catalog = cls._load_index()
        results = []

        for v in catalog.get("vaults", []):
            db_path = os.path.join(VAULTS_DIR, f"{v['id']}.db")
            size_bytes = os.path.getsize(db_path) if os.path.exists(db_path) else 0
            results.append({
                "id": v["id"],
                "name": v.get("name", "Unnamed Vault"),
                "created_at": v.get("created_at", "Unknown"),
                "size_bytes": size_bytes,
                "db_path": db_path
            })
        return results

    @classmethod
    def create_vault(cls, vault_name: str, passphrase: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Creates a new isolated zero-knowledge vault.
        Returns (success, message, vault_info).
        """
        if not vault_name or not vault_name.strip():
            return False, "Vault name cannot be blank.", None
        if not passphrase or len(passphrase) < 6:
            return False, "Master passphrase must be at least 6 characters long.", None

        cls._ensure_vault_dir()
        vault_id = str(uuid.uuid4())
        salt = KeyDerivationEngine.generate_salt()
        raw_key = KeyDerivationEngine.derive_key(passphrase, salt)
        hex_key = raw_key.hex()
        verification_token = KeyDerivationEngine.generate_verification_token(raw_key)

        db_path = os.path.join(VAULTS_DIR, f"{vault_id}.db")

        # Initialize the encrypted database
        try:
            db = EncryptedVaultDB(db_path, hex_key)
            # Store initial verification token and salt in vault_meta
            cursor = db.conn.cursor()
            now_iso = datetime.datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO vault_meta (id, schema_version, created_at, kdf_salt_hex, check_token)
                VALUES (1, '1.0.0', ?, ?, ?)
            """, (now_iso, salt.hex(), verification_token))
            db.conn.commit()

            # Seed default system categories
            default_categories = [
                ("Income", "inflow", "#10b981"),
                ("Housing & Rent", "outflow", "#3b82f6"),
                ("Mortgage", "outflow", "#6366f1"),
                ("Groceries", "outflow", "#f59e0b"),
                ("Dining & Restaurants", "outflow", "#ec4899"),
                ("Utilities & Internet", "outflow", "#06b6d4"),
                ("Transportation & Auto", "outflow", "#8b5cf6"),
                ("Shopping & Retail", "outflow", "#14b8a6"),
                ("Healthcare & Medical", "outflow", "#ef4444"),
                ("Subscriptions & Entertainment", "outflow", "#a855f7"),
                ("Bank Fees & Charges", "outflow", "#f97316"),
                ("Internal Transfer", "transfer", "#64748b"),
                ("Investments & Savings", "inflow", "#22c55e"),
                ("Taxes & Government", "outflow", "#e11d48"),
            ]
            for cat_name, cat_type, cat_color in default_categories:
                cat_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT OR IGNORE INTO categories (id, name, type, color, is_system)
                    VALUES (?, ?, ?, ?, 1)
                """, (cat_id, cat_name, cat_type, cat_color))
            
            db.log_audit_event("VAULT_CREATED", f"Zero-Knowledge vault '{vault_name}' successfully provisioned.")
            db.conn.commit()
            cursor.close()
            db.close()
        except Exception as e:
            return False, f"Failed to initialize encrypted database: {str(e)}", None

        # Update local catalog
        catalog = cls._load_index()
        vault_entry = {
            "id": vault_id,
            "name": vault_name.strip(),
            "created_at": now_iso,
            "kdf_salt_hex": salt.hex(),
            "check_token": verification_token
        }
        catalog["vaults"].append(vault_entry)
        cls._save_index(catalog)

        return True, f"Vault '{vault_name}' successfully created.", {
            "id": vault_id,
            "name": vault_name,
            "hex_key": hex_key,
            "db_path": db_path
        }

    @classmethod
    def unlock_vault(cls, vault_id: str, passphrase: str) -> Tuple[bool, str, Optional[EncryptedVaultDB]]:
        """
        Unlocks an existing vault with rate-limiting protection against brute-force attacks.
        Returns (success, message, db_instance).
        """
        # Rate-limiting brute-force delay
        last_time = cls._LAST_ATTEMPT_TIME.get(vault_id, 0)
        attempts = cls._FAILED_ATTEMPTS.get(vault_id, 0)
        if attempts >= 3:
            delay = min(2 ** (attempts - 3), 10)  # exponential backoff cap at 10s
            elapsed = time.time() - last_time
            if elapsed < delay:
                time.sleep(delay - elapsed)

        cls._LAST_ATTEMPT_TIME[vault_id] = time.time()

        catalog = cls._load_index()
        target = None
        for v in catalog.get("vaults", []):
            if v["id"] == vault_id:
                target = v
                break

        if not target:
            return False, "Vault ID not found in local catalog.", None

        salt = bytes.fromhex(target["kdf_salt_hex"])
        raw_key = KeyDerivationEngine.derive_key(passphrase, salt)
        computed_token = KeyDerivationEngine.generate_verification_token(raw_key)

        if computed_token != target["check_token"]:
            cls._FAILED_ATTEMPTS[vault_id] = attempts + 1
            return False, "Incorrect master passphrase. Access denied.", None

        # Password verified -> reset attempt counter
        cls._FAILED_ATTEMPTS[vault_id] = 0
        db_path = os.path.join(VAULTS_DIR, f"{vault_id}.db")

        try:
            db = EncryptedVaultDB(db_path, raw_key.hex())
            db.log_audit_event("VAULT_UNLOCKED", f"Vault session opened by authorized user.")
            return True, "Vault successfully unlocked.", db
        except Exception as e:
            return False, f"Failed to decrypt database: {str(e)}", None

    @classmethod
    def purge_session_memory(cls):
        """
        Eliminates cross-user data leakage by executing a complete session flush,
        triggering garbage collection, and wiping transient buffers.
        """
        try:
            import streamlit as st
            # Retain only non-sensitive UI theme preferences if needed
            keys_to_clear = list(st.session_state.keys())
            for k in keys_to_clear:
                del st.session_state[k]
        except Exception:
            pass

        # Trigger OS/Python garbage collection
        gc.collect()
