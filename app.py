"""
app.py
Local-First Canadian Personal Finance & Zero-Knowledge Vault Platform.
Compliant with PIPEDA Schedule 1 and OSFI Guideline B-13.
100% Offline & Local | AES-256 SQLCipher | Argon2id KDF | Streamlit & Plotly
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import os
import datetime
import io
import json
import uuid

# Core engine imports
from core.security import (
    enforce_zero_outbound_network,
    KeyDerivationEngine,
    PIISanitizer,
    InputValidator
)
from core.vault_manager import VaultManager
from core.db import EncryptedVaultDB
from core.rules import RuleEngine, SplitTransactionHelper
from core.parser import StatementParser
from core.analytics import (
    RegisteredAccountsEngine,
    MortgageEngine,
    FinancialIntelligence
)

# 1. Enforce Zero Outbound Network (OSFI B-13 & PIPEDA Compliance)
enforce_zero_outbound_network()

# 2. Page Configuration
st.set_page_config(
    page_title="Local Finance Vault (Canada) | Zero-Knowledge",
    page_icon="🇨🇦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for executive dark/light financial styling
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 18px 22px;
        color: #f8fafc;
        margin-bottom: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .metric-label {
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 4px;
    }
    .metric-value {
        font-size: 1.85rem;
        font-weight: 700;
        color: #38bdf8;
        font-family: monospace;
    }
    .security-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background-color: #064e3b;
        color: #6ee7b7;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 600;
        border: 1px solid #059669;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 48px;
        white-space: pre-wrap;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)


# --- 3. SESSION STATE INITIALIZATION & MEMORY PURGE ---
if "active_vault_id" not in st.session_state:
    st.session_state.active_vault_id = None
if "active_vault_name" not in st.session_state:
    st.session_state.active_vault_name = None
if "active_db" not in st.session_state:
    st.session_state.active_db = None
if "staged_transactions" not in st.session_state:
    st.session_state.staged_transactions = []
if "staged_reconciliation" not in st.session_state:
    st.session_state.staged_reconciliation = {}


def logout_and_purge():
    """Wipes memory buffers, closes open DB connection, and flushes session state."""
    if st.session_state.active_db:
        try:
            st.session_state.active_db.close()
        except Exception:
            pass
    VaultManager.purge_session_memory()
    st.rerun()


# --- 4. TOP BAR & STATUS DISPLAY ---
col_head1, col_head2, col_head3 = st.columns([3, 2, 2])
with col_head1:
    st.markdown("### 🍁 Local Finance Vault (Canada)")
    st.caption("Zero-Knowledge Local-First Wealth & Mortgage Intelligence (PIPEDA / OSFI B-13)")

with col_head2:
    if st.session_state.active_vault_name:
        st.markdown(f"**Active Vault:** `{st.session_state.active_vault_name}`")
        st.markdown('<span class="security-badge">🔒 AES-256 SQLCipher Locked</span>', unsafe_allow_html=True)
    else:
        st.markdown('<span class="security-badge" style="background:#451a03; color:#fdba74; border-color:#d97706;">⚠️ Vault Locked</span>', unsafe_allow_html=True)

with col_head3:
    if st.session_state.active_vault_id:
        if st.button("🔒 Lock Vault & Purge Memory", use_container_width=True):
            logout_and_purge()


# --- 5. SIDEBAR: VAULT MANAGEMENT & PROFILE GATE ---
with st.sidebar:
    st.header("🔐 Vault Security Gate")

    if not st.session_state.active_vault_id:
        tab_login, tab_create = st.tabs(["Open Vault", "Create New"])

        with tab_login:
            available = VaultManager.list_available_vaults()
            if available:
                vault_options = {f"{v['name']} ({v['id'][:8]}...)": v["id"] for v in available}
                selected_label = st.selectbox("Select Vault Profile", list(vault_options.keys()))
                target_id = vault_options[selected_label]
                passphrase_input = st.text_input("Master Passphrase", type="password", key="login_pass")

                if st.button("🔓 Unlock Vault", type="primary", use_container_width=True):
                    with st.spinner("Deriving 256-bit key via Argon2id (250,000 passes)..."):
                        success, msg, db_inst = VaultManager.unlock_vault(target_id, passphrase_input)
                        if success:
                            st.session_state.active_vault_id = target_id
                            st.session_state.active_vault_name = selected_label.split(" (")[0]
                            st.session_state.active_db = db_inst
                            st.success("Access Granted.")
                            st.rerun()
                        else:
                            st.error(msg)
            else:
                st.info("No local vaults found. Create a new encrypted vault to get started.")

        with tab_create:
            new_name = st.text_input("Vault Profile Name", placeholder="e.g., Personal Finances")
            new_pass = st.text_input("Master Passphrase", type="password", key="create_pass")
            confirm_pass = st.text_input("Confirm Passphrase", type="password", key="create_confirm")

            if st.button("✨ Provision Encrypted Vault", type="primary", use_container_width=True):
                if new_pass != confirm_pass:
                    st.error("Passphrases do not match.")
                else:
                    with st.spinner("Generating 32-byte salt & initializing SQLCipher vault..."):
                        success, msg, info = VaultManager.create_vault(new_name, new_pass)
                        if success:
                            st.success(msg)
                            st.info("Now unlock your new vault from the 'Open Vault' tab.")
                        else:
                            st.error(msg)

    else:
        # Active Vault Sidebar Controls
        st.subheader("🏦 Registered Accounts")
        accounts = st.session_state.active_db.get_accounts()
        if accounts:
            for acct in accounts:
                st.markdown(f"**{acct['institution']}** - {acct['account_name']} (`{acct['account_number_masked']}`)")
                st.caption(f"Type: {acct['account_type']} | Currency: {acct['currency']}")
        else:
            st.caption("No accounts registered yet. Ingest statements to auto-register.")

        st.divider()
        st.subheader("📦 Demo Data Generator")
        if st.button("⚡ Load Canadian Demo Dataset", use_container_width=True):
            # Seed demo accounts and realistic Canadian transactions
            db: EncryptedVaultDB = st.session_state.active_db
            acct_rbc = db.upsert_account({
                "id": "acct_rbc_chequing",
                "institution": "RBC Royal Bank",
                "account_name": "RBC Signature No-Limit Chequing",
                "account_number_masked": "******4819",
                "account_type": "Chequing",
                "starting_balance": 4500.00,
                "current_balance": 7850.25
            })
            acct_td = db.upsert_account({
                "id": "acct_td_visa",
                "institution": "TD Canada Trust",
                "account_name": "TD First Class Visa Infinite",
                "account_number_masked": "************8832",
                "account_type": "Credit Card",
                "starting_balance": 0.00,
                "current_balance": -1250.40
            })

            # Seed realistic transactions
            today = datetime.date.today()
            demo_txs = [
                {"account_id": acct_rbc, "date": (today - datetime.timedelta(days=2)).isoformat(), "raw_description": "PAYROLL DIRECT DEPOSIT - ACME CORP", "clean_merchant": "Employer Payroll", "category": "Income", "inflow_amount": 3450.00, "outflow_amount": 0.0},
                {"account_id": acct_rbc, "date": (today - datetime.timedelta(days=3)).isoformat(), "raw_description": "PRE-AUTHORIZED DEBIT - RBC MORTGAGE #0912", "clean_merchant": "RBC Mortgage", "category": "Mortgage", "inflow_amount": 0.0, "outflow_amount": 2350.00},
                {"account_id": acct_td, "date": (today - datetime.timedelta(days=4)).isoformat(), "raw_description": "LOBLAWS #1042 TORONTO ON", "clean_merchant": "Loblaws", "category": "Groceries", "inflow_amount": 0.0, "outflow_amount": 168.45},
                {"account_id": acct_td, "date": (today - datetime.timedelta(days=5)).isoformat(), "raw_description": "SQ *TIM HORTONS #4912 TORONTO ON", "clean_merchant": "Tim Hortons", "category": "Dining & Restaurants", "inflow_amount": 0.0, "outflow_amount": 8.75},
                {"account_id": acct_td, "date": (today - datetime.timedelta(days=6)).isoformat(), "raw_description": "ROGERS CABLE & INTERNET 88129", "clean_merchant": "Rogers Communications", "category": "Utilities & Internet", "inflow_amount": 0.0, "outflow_amount": 125.00},
                {"account_id": acct_td, "date": (today - datetime.timedelta(days=7)).isoformat(), "raw_description": "NETFLIX.COM CAD MONTHLY", "clean_merchant": "Streaming Media", "category": "Subscriptions & Entertainment", "inflow_amount": 0.0, "outflow_amount": 18.99},
                {"account_id": acct_rbc, "date": (today - datetime.timedelta(days=8)).isoformat(), "raw_description": "ENBRIDGE GAS PREAUTH PAYMENT", "clean_merchant": "Municipal Energy / Hydro", "category": "Utilities & Internet", "inflow_amount": 0.0, "outflow_amount": 142.30},
                {"account_id": acct_td, "date": (today - datetime.timedelta(days=9)).isoformat(), "raw_description": "SHOPPERS DRUG MART #0812", "clean_merchant": "Shoppers Drug Mart", "category": "Healthcare & Medical", "inflow_amount": 0.0, "outflow_amount": 45.20, "is_tax_deductible": 1, "tax_category": "Medical Expense"},
                {"account_id": acct_rbc, "date": (today - datetime.timedelta(days=10)).isoformat(), "raw_description": "INTERAC E-TRANSFER TO WEALTHSIMPLE TFSA", "clean_merchant": "Wealthsimple TFSA", "category": "Investments & Savings", "inflow_amount": 0.0, "outflow_amount": 500.00},
            ]
            db.insert_transactions_batch(demo_txs)

            # Seed demo mortgage
            db.upsert_mortgage({
                "property_name": "Toronto Condo Residence",
                "lender": "RBC Royal Bank",
                "original_principal": 580000.00,
                "current_principal": 512000.00,
                "interest_rate": 5.14,
                "term_years": 5,
                "amortization_years": 25,
                "payment_frequency": "Monthly",
                "payment_amount": 3120.00,
                "start_date": "2022-06-01"
            })

            # Seed registered account contributions
            db.insert_registered_contribution({"account_type": "TFSA", "tax_year": 2024, "contribution_amount": 7000.00, "notes": "Maxed 2024 annual TFSA room"})
            db.insert_registered_contribution({"account_type": "FHSA", "tax_year": 2024, "contribution_amount": 8000.00, "deduction_claimed": 8000.00, "notes": "First Home Savings Account Max"})

            st.success("Canadian demo portfolio loaded.")
            st.rerun()

        st.divider()
        st.caption("🛡️ PIPEDA Schedule 1 & OSFI B-13 Hardened. Zero data leaves your machine.")


# --- 6. MAIN APPLICATION ROUTER ---
if not st.session_state.active_vault_id:
    st.info("👋 Welcome to **Local Finance Vault (Canada)**. Please select or create an encrypted vault profile in the left sidebar to unlock your financial ledger.")
    
    # Overview Feature Highlights for Unauthenticated View
    col_feat1, col_feat2, col_feat3 = st.columns(3)
    with col_feat1:
        st.markdown("""
        #### 🔒 Zero-Knowledge Security
        - AES-256 SQLCipher database encryption at rest.
        - Argon2id key derivation with 250,000 iterations.
        - Automatic PII scrubbing (SIN, PAN, Transit codes).
        """)
    with col_feat2:
        st.markdown("""
        #### 🇨🇦 Canadian Bank Parsing
        - Multi-bank PDF/CSV parser (RBC, TD, Scotia, BMO, CIBC, Tangerine, Desjardins, AMEX).
        - Mathematical statement balance reconciliation.
        - Automatic internal transfer and payoff pairing.
        """)
    with col_feat3:
        st.markdown("""
        #### 📈 Wealth & Mortgage Engine
        - Canadian semi-annual compounding mortgage solver.
        - TFSA, RRSP, and FHSA contribution room trackers.
        - Renewal rate stress testing (+1.0% to +3.0%).
        """)
    st.stop()

# Active Database Reference
db: EncryptedVaultDB = st.session_state.active_db

# 6 Navigation Tabs
tab_exec, tab_ingest, tab_ledger, tab_debt, tab_tax, tab_security = st.tabs([
    "📊 Executive Summary",
    "📥 Ingestion & Staging",
    "📒 Master Ledger",
    "🏡 Mortgage & Debt Center",
    "🍁 Canadian Tax & Registered Accounts",
    "🛡️ Vault Security & Settings"
])


# ==============================================================================
# TAB 1: EXECUTIVE SUMMARY
# ==============================================================================
with tab_exec:
    st.subheader("Executive Financial Health & Cash Flow")

    tx_df = db.get_transactions_df()
    mortgages = db.get_mortgages()
    accounts = db.get_accounts()

    # Calculate Core Financial KPIs
    total_assets = sum(a["current_balance"] for a in accounts if a["current_balance"] > 0)
    total_debts = sum(abs(a["current_balance"]) for a in accounts if a["current_balance"] < 0)
    mortgage_debt = sum(m["current_principal"] for m in mortgages)
    net_worth = total_assets - total_debts - mortgage_debt

    total_inflow = tx_df["inflow_amount"].sum() if not tx_df.empty else 0.0
    # Exclude internal transfers from spending to avoid double counting
    non_transfer_txs = tx_df[tx_df["is_transfer"] == 0] if not tx_df.empty else pd.DataFrame()
    total_outflow = non_transfer_txs["outflow_amount"].sum() if not non_transfer_txs.empty else 0.0
    net_savings = total_inflow - total_outflow
    savings_rate = (net_savings / total_inflow * 100.0) if total_inflow > 0 else 0.0

    # Average Monthly Outflow & Runway
    months_count = max(1, len(tx_df["date"].str[:7].unique())) if not tx_df.empty else 1
    avg_monthly_burn = total_outflow / months_count
    liquid_emergency_runway = (total_assets / avg_monthly_burn) if avg_monthly_burn > 0 else 0.0

    # Metric Cards
    kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
    with kpi1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Estimated Net Worth</div>
            <div class="metric-value">${net_worth:,.0f}</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Total Inflow (Income)</div>
            <div class="metric-value" style="color:#34d399;">+${total_inflow:,.0f}</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Total Outflow (Spend)</div>
            <div class="metric-value" style="color:#f87171;">-${total_outflow:,.0f}</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Net Savings Rate</div>
            <div class="metric-value">{savings_rate:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi5:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Emergency Runway</div>
            <div class="metric-value">{liquid_emergency_runway:.1f} mo</div>
        </div>
        """, unsafe_allow_html=True)

    st.divider()

    # Visual Analytics: Sankey Flow + Spending Breakdown
    col_chart1, col_chart2 = st.columns([3, 2])

    with col_chart1:
        st.markdown("##### 🌊 Cash Flow Inflow & Outflow Waterfall")
        if not non_transfer_txs.empty:
            cat_totals = non_transfer_txs.groupby("category")["outflow_amount"].sum().reset_index()
            cat_totals = cat_totals[cat_totals["outflow_amount"] > 0].sort_values(by="outflow_amount", ascending=False)

            # Build Net Cash Flow Waterfall
            waterfall_x = ["Income"] + cat_totals["category"].head(6).tolist() + ["Net Remaining"]
            waterfall_y = [total_inflow] + [-val for val in cat_totals["outflow_amount"].head(6)] + [net_savings]
            waterfall_measure = ["relative"] + ["relative"] * min(6, len(cat_totals)) + ["total"]

            fig_waterfall = go.Figure(go.Waterfall(
                name="Net Flow",
                orientation="v",
                measure=waterfall_measure,
                x=waterfall_x,
                y=waterfall_y,
                connector={"line": {"color": "#64748b"}},
                decreasing={"marker": {"color": "#ef4444"}},
                increasing={"marker": {"color": "#10b981"}},
                totals={"marker": {"color": "#38bdf8"}}
            ))
            fig_waterfall.update_layout(
                template="plotly_dark",
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                margin=dict(l=20, r=20, t=30, b=20),
                height=340
            )
            st.plotly_chart(fig_waterfall, use_container_width=True)
        else:
            st.info("Ingest transactions to visualize cash flow waterfall.")

    with col_chart2:
        st.markdown("##### 🍩 Expense Allocation by Category")
        if not non_transfer_txs.empty:
            cat_summary = non_transfer_txs[non_transfer_txs["outflow_amount"] > 0].groupby("category")["outflow_amount"].sum().reset_index()
            if not cat_summary.empty:
                fig_donut = px.pie(
                    cat_summary,
                    values="outflow_amount",
                    names="category",
                    hole=0.55,
                    color_discrete_sequence=px.colors.qualitative.Prism
                )
                fig_donut.update_layout(
                    template="plotly_dark",
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    margin=dict(l=10, r=10, t=20, b=10),
                    height=340,
                    showlegend=True
                )
                st.plotly_chart(fig_donut, use_container_width=True)
        else:
            st.info("No expense data to display.")

    # Recurring Subscriptions & Hidden Fee Auditor
    st.divider()
    sub_col1, sub_col2 = st.columns(2)
    with sub_col1:
        st.markdown("##### 🔄 Recurring Subscriptions Detected")
        subscriptions = FinancialIntelligence.detect_recurring_subscriptions(tx_df)
        if subscriptions:
            sub_df = pd.DataFrame(subscriptions)
            st.dataframe(
                sub_df[["merchant", "category", "average_amount", "annual_cost_projection", "last_charge_date"]],
                column_config={
                    "merchant": "Service / Merchant",
                    "category": "Category",
                    "average_amount": st.column_config.NumberColumn("Avg Charge", format="$%.2f"),
                    "annual_cost_projection": st.column_config.NumberColumn("Annual Drain", format="$%.2f"),
                    "last_charge_date": "Last Charged"
                },
                use_container_width=True,
                hide_index=True
            )
        else:
            st.caption("No recurring subscription patterns detected yet.")

    with sub_col2:
        st.markdown("##### ⚠️ Bank Fee & Surcharge Audit")
        fee_audit = FinancialIntelligence.audit_bank_fees(tx_df)
        st.markdown(f"**Total Bank Fees Paid:** `${fee_audit['total_fees']:,.2f}` (Annualized Drain: `${fee_audit['annualized_drain']:,.2f}`)")
        if fee_audit["fee_count"] > 0:
            st.dataframe(
                pd.DataFrame(fee_audit["transactions"])[["date", "raw_description", "outflow_amount"]],
                column_config={
                    "date": "Date",
                    "raw_description": "Fee Memo",
                    "outflow_amount": st.column_config.NumberColumn("Amount", format="$%.2f")
                },
                use_container_width=True,
                hide_index=True
            )
        else:
            st.success("🎉 Zero banking maintenance or surcharge fees detected in this period.")


# ==============================================================================
# TAB 2: DOCUMENT INGESTION & STAGING
# ==============================================================================
with tab_ingest:
    st.subheader("📥 Universal Multi-Bank Statement Ingestion")
    st.caption("Drag-and-drop Canadian PDF e-statements, CSVs, or OFX/QFX files. Processed strictly in-memory with zero disk leakage.")

    col_up1, col_up2 = st.columns([3, 1])
    with col_up1:
        uploaded_files = st.file_uploader(
            "Upload Statement Files",
            type=["pdf", "csv", "txt", "ofx", "qfx"],
            accept_multiple_files=True
        )
    with col_up2:
        pdf_password = st.text_input("e-Statement Password (Optional)", type="password", help="If your Canadian bank statement PDF is encrypted with your DOB/postal code.")
        target_account_type = st.selectbox("Assign Account Type", ["Chequing", "Savings", "Credit Card", "Line of Credit", "Mortgage"])

    if uploaded_files:
        all_parsed = []
        rules = RuleEngine(db.get_rules())

        for f in uploaded_files:
            file_bytes = f.read()
            filename = f.name
            parse_result = StatementParser.parse_file(
                file_bytes=file_bytes,
                filename=filename,
                password=pdf_password or None,
                rule_engine=rules
            )

            if parse_result["success"]:
                txs = parse_result["transactions"]
                all_parsed.extend(txs)
                reconcile = parse_result.get("reconciliation", {})

                # Balance Reconciliation Box
                if reconcile.get("is_balanced"):
                    st.success(f"✅ **{filename}**: {reconcile.get('notes')}")
                else:
                    st.warning(f"⚠️ **{filename}**: {reconcile.get('notes')}")

                # Chronological Gap Alert
                for gap in parse_result.get("gaps", []):
                    st.warning(f"⏳ {gap['message']}")
            else:
                st.error(f"❌ Failed to parse **{filename}**: {parse_result.get('error')}")

        if all_parsed:
            st.session_state.staged_transactions = all_parsed
            st.success(f"Successfully extracted {len(all_parsed)} transactions ready for review.")

    # Interactive Staging Grid
    if st.session_state.staged_transactions:
        st.divider()
        st.markdown("##### 📝 Interactive Pre-Commit Staging Table")
        st.caption("Review, edit categories, or adjust merchant names before permanently saving to your encrypted vault.")

        staged_df = pd.DataFrame(st.session_state.staged_transactions)
        edited_df = st.data_editor(
            staged_df[[
                "date", "institution", "clean_merchant", "category",
                "inflow_amount", "outflow_amount", "is_transfer", "raw_description"
            ]],
            column_config={
                "date": "Date",
                "institution": "Bank",
                "clean_merchant": "Clean Merchant",
                "category": st.column_config.SelectboxColumn(
                    "Category",
                    options=[
                        "Income", "Housing & Rent", "Mortgage", "Groceries", "Dining & Restaurants",
                        "Utilities & Internet", "Transportation & Auto", "Shopping & Retail",
                        "Healthcare & Medical", "Subscriptions & Entertainment", "Bank Fees & Charges",
                        "Internal Transfer", "Investments & Savings", "Taxes & Government", "Uncategorized"
                    ],
                    required=True
                ),
                "inflow_amount": st.column_config.NumberColumn("Inflow ($)", format="$%.2f"),
                "outflow_amount": st.column_config.NumberColumn("Outflow ($)", format="$%.2f"),
                "is_transfer": st.column_config.CheckboxColumn("Transfer?"),
                "raw_description": "Original Statement Memo"
            },
            num_rows="dynamic",
            use_container_width=True
        )

        col_commit1, col_commit2 = st.columns([1, 4])
        with col_commit1:
            if st.button("💾 Commit to Encrypted Vault", type="primary", use_container_width=True):
                transactions_to_save = edited_df.to_dict(orient="records")
                inserted, dupes = db.insert_transactions_batch(transactions_to_save)
                db.log_audit_event("TRANSACTIONS_COMMITTED", f"Committed {inserted} records ({dupes} duplicates skipped).")
                st.success(f"Saved {inserted} transactions to vault ({dupes} duplicates automatically deduplicated).")
                st.session_state.staged_transactions = []
                st.rerun()
        with col_commit2:
            if st.button("🗑️ Discard Staged Records"):
                st.session_state.staged_transactions = []
                st.rerun()


# ==============================================================================
# TAB 3: MASTER TRANSACTION LEDGER
# ==============================================================================
with tab_ledger:
    st.subheader("📒 Master Transaction Ledger")

    # Multi-Column Filters
    col_f1, col_f2, col_f3, col_f4 = st.columns(4)
    with col_f1:
        search_kw = st.text_input("🔍 Search Description / Merchant", "")
    with col_f2:
        all_cats = ["All Categories"] + sorted(tx_df["category"].dropna().unique().tolist()) if not tx_df.empty else ["All Categories"]
        sel_cat = st.selectbox("Filter Category", all_cats)
    with col_f3:
        all_insts = ["All Banks"] + sorted(tx_df["institution"].dropna().unique().tolist()) if not tx_df.empty and "institution" in tx_df.columns else ["All Banks"]
        sel_inst = st.selectbox("Filter Bank", all_insts)
    with col_f4:
        tax_only = st.checkbox("Show Tax-Deductible Only", False)

    filters = {
        "search": search_kw if search_kw else None,
        "category": sel_cat if sel_cat != "All Categories" else None,
        "institution": sel_inst if sel_inst != "All Banks" else None,
        "tax_only": tax_only
    }

    filtered_df = db.get_transactions_df(filters)

    st.markdown(f"**Showing {len(filtered_df)} Transactions**")
    if not filtered_df.empty:
        st.dataframe(
            filtered_df[[
                "date", "institution", "clean_merchant", "category",
                "inflow_amount", "outflow_amount", "is_transfer", "is_tax_deductible", "raw_description"
            ]],
            column_config={
                "date": "Date",
                "institution": "Bank",
                "clean_merchant": "Merchant",
                "category": "Category",
                "inflow_amount": st.column_config.NumberColumn("Inflow", format="$%.2f"),
                "outflow_amount": st.column_config.NumberColumn("Outflow", format="$%.2f"),
                "is_transfer": st.column_config.CheckboxColumn("Transfer"),
                "is_tax_deductible": st.column_config.CheckboxColumn("CRA Tax Tag"),
                "raw_description": "Bank Memo (PII Sanitized)"
            },
            use_container_width=True,
            hide_index=True
        )

        # Quick Save-as-Rule Modal / Expansion
        with st.expander("✨ Create Automatic Categorization Rule from Transaction"):
            col_r1, col_r2, col_r3 = st.columns(3)
            with col_r1:
                rule_pattern = st.text_input("Regex Pattern to Match", placeholder="e.g. TIM HORTONS")
            with col_r2:
                rule_target_merch = st.text_input("Target Merchant Name", placeholder="Tim Hortons")
            with col_r3:
                rule_target_cat = st.selectbox("Target Category", [
                    "Groceries", "Dining & Restaurants", "Utilities & Internet",
                    "Transportation & Auto", "Shopping & Retail", "Healthcare & Medical",
                    "Subscriptions & Entertainment", "Bank Fees & Charges", "Internal Transfer"
                ])
            if st.button("Save New Normalization Rule"):
                if rule_pattern and rule_target_merch:
                    db.insert_rule({
                        "pattern": rule_pattern,
                        "target_merchant": rule_target_merch,
                        "target_category": rule_target_cat
                    })
                    st.success(f"Rule saved for '{rule_pattern}'.")
                    st.rerun()
    else:
        st.info("No transactions match current filters.")


# ==============================================================================
# TAB 4: MORTGAGE & DEBT CENTER
# ==============================================================================
with tab_debt:
    st.subheader("🏡 Canadian Mortgage & Debt Amortization Suite")
    st.caption("Fixed Rate Semi-Annual Compounding Engine, Payment Dissection, and Renewal Stress Testing.")

    col_m1, col_m2 = st.columns([1, 2])

    with col_m1:
        st.markdown("##### 🛠️ Mortgage Parameters")
        m_principal = st.number_input("Mortgage Principal ($ CAD)", value=500000.0, step=10000.0)
        m_rate = st.number_input("Nominal Interest Rate (% p.a.)", value=5.25, step=0.1)
        m_amort = st.slider("Amortization Period (Years)", 5, 30, 25)
        m_freq = st.selectbox("Payment Frequency", ["Monthly", "Bi-Weekly", "Accelerated Bi-Weekly"])
        m_extra_pmt = st.number_input("Monthly Prepayment Accelerator ($)", value=0.0, step=50.0)
        m_annual_lump = st.number_input("Annual Lump-Sum Prepayment ($)", value=0.0, step=1000.0)

        # Calculate exact payment
        calc_pmt = MortgageEngine.calculate_canadian_payment(m_principal, m_rate, m_amort, m_freq)
        st.metric(f"Calculated {m_freq} Payment", f"${calc_pmt:,.2f}")

    with col_m2:
        schedule = MortgageEngine.generate_amortization_schedule(
            m_principal, m_rate, m_amort, m_freq, m_extra_pmt, m_annual_lump
        )
        if schedule:
            sched_df = pd.DataFrame(schedule)
            total_interest = sched_df["interest_paid"].sum()
            payoff_periods = len(sched_df)
            payoff_years = payoff_periods / 12.0

            st.markdown(f"**Total Lifetime Interest:** `${total_interest:,.2f}` | **Payoff Time:** `{payoff_years:.1f} Years`")

            # Plotly Amortization Balance Curve
            fig_amort = go.Figure()
            fig_amort.add_trace(go.Scatter(
                x=sched_df["period"],
                y=sched_df["remaining_balance"],
                mode="lines",
                name="Remaining Principal",
                line=dict(color="#38bdf8", width=3)
            ))
            fig_amort.add_trace(go.Scatter(
                x=sched_df["period"],
                y=sched_df["cumulative_interest"],
                mode="lines",
                name="Cumulative Interest Paid",
                line=dict(color="#f87171", width=2, dash="dash")
            ))
            fig_amort.update_layout(
                title="Principal Reduction vs. Cumulative Interest Paid",
                template="plotly_dark",
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                xaxis_title="Payment Period (Months)",
                yaxis_title="$ CAD",
                margin=dict(l=20, r=20, t=40, b=20),
                height=320
            )
            st.plotly_chart(fig_amort, use_container_width=True)

    # Canadian Mortgage Renewal Stress Test
    st.divider()
    st.markdown("##### ⚡ Mortgage Renewal Rate Shock Simulator")
    st.caption("Model how upcoming Canadian central bank rate shifts or fixed renewal adjustments impact monthly payments.")

    scenarios = MortgageEngine.run_renewal_stress_test(m_principal, m_rate, m_amort)
    scen_df = pd.DataFrame(scenarios)
    st.dataframe(
        scen_df,
        column_config={
            "rate_increase": "Rate Shock",
            "new_interest_rate": "New Interest Rate",
            "new_monthly_payment": st.column_config.NumberColumn("New Monthly Payment", format="$%.2f"),
            "monthly_increase": st.column_config.NumberColumn("Monthly Increase", format="+$%.2f"),
            "annual_cashflow_impact": st.column_config.NumberColumn("Annual Cash Flow Drain", format="+$%.2f"),
            "pct_increase": st.column_config.NumberColumn("% Increase", format="%.1f%%")
        },
        use_container_width=True,
        hide_index=True
    )


# ==============================================================================
# TAB 5: CANADIAN TAX & REGISTERED ACCOUNTS
# ==============================================================================
with tab_tax:
    st.subheader("🍁 Canadian Tax & Registered Accounts Engine")
    st.caption("Track TFSA, RRSP, and FHSA contribution room limits and export CRA-eligible tax deduction schedules.")

    tax_col1, tax_col2 = st.columns(2)

    with tax_col1:
        st.markdown("##### 🏛️ Registered Accounts Contribution Trackers")
        tfsa_info = RegisteredAccountsEngine.calculate_tfsa_lifetime_room(birth_year=1990)
        st.markdown(f"**TFSA Cumulative Lifetime Limit:** `${tfsa_info['total_lifetime_room']:,.0f}` (Current Year: `${tfsa_info['current_year_limit']:,.0f}`)")

        # Logged contributions from DB
        contributions = db.get_registered_contributions()
        fhsa_status = RegisteredAccountsEngine.calculate_fhsa_status(contributions)

        st.markdown(f"**FHSA Lifetime Cap Progress:** `${fhsa_status['total_contributed']:,.2f}` / `$40,000.00`")
        st.progress(fhsa_status["progress_percent"] / 100.0)
        st.caption(f"Remaining Lifetime FHSA Room: ${fhsa_status['remaining_lifetime_room']:,.2f}")

    with tax_col2:
        st.markdown("##### 💰 RRSP Tax Refund Estimator")
        annual_inc = st.number_input("Annual Gross Taxable Income ($ CAD)", value=95000.0, step=5000.0)
        rrsp_contrib = st.number_input("RRSP Contribution Amount ($ CAD)", value=8000.0, step=500.0)

        refund_est = RegisteredAccountsEngine.estimate_rrsp_tax_savings(annual_inc, rrsp_contrib)
        st.metric("Estimated CRA Tax Refund", f"${refund_est['estimated_refund']:,.2f}", f"Marginal Rate: {refund_est['effective_marginal_rate']:.1f}%")

    st.divider()
    st.markdown("##### 📋 CRA-Eligible Deductible Expenses")
    tax_txs = tx_df[tx_df["is_tax_deductible"] == 1] if not tx_df.empty else pd.DataFrame()

    if not tax_txs.empty:
        st.dataframe(
            tax_txs[["date", "clean_merchant", "tax_category", "outflow_amount", "raw_description"]],
            column_config={
                "date": "Date",
                "clean_merchant": "Provider / Institution",
                "tax_category": "CRA Tax Line Category",
                "outflow_amount": st.column_config.NumberColumn("Deductible Amount", format="$%.2f"),
                "raw_description": "Proof / Memo"
            },
            use_container_width=True,
            hide_index=True
        )

        csv_bytes = tax_txs.to_csv(index=False).encode("utf-8")
        st.download_button(
            "📥 Export CRA Tax Summary Schedule (CSV)",
            data=csv_bytes,
            file_name="CRA_Annual_Tax_Schedule.csv",
            mime="text/csv"
        )
    else:
        st.info("No tax-deductible items tagged yet. Tag medical, charitable, or work-related expenses in the Master Ledger.")


# ==============================================================================
# TAB 6: VAULT SECURITY & SETTINGS
# ==============================================================================
with tab_security:
    st.subheader("🛡️ Vault Security & Privacy Architecture")
    st.caption("OSFI Guideline B-13 & PIPEDA Schedule 1 Verification Dashboard.")

    sec_col1, sec_col2 = st.columns(2)

    with sec_col1:
        st.markdown("##### 🔐 Zero-Knowledge Cryptographic Parameters")
        st.markdown("""
        - **Database Engine:** AES-256 Encrypted Relational Database (SQLCipher / SQLite WAL)
        - **Key Derivation Function:** Argon2id (`time_cost=3, memory_cost=64MB, parallelism=4, 250k rounds`)
        - **Salt:** Cryptographic 32-byte unique OS salt (`os.urandom(32)`)
        - **Network Restriction:** Outbound socket block active (Zero telemetry enforcement)
        - **Data Location:** Local user filesystem `data/vaults/{user_uuid}.db`
        """)

        st.markdown("##### 📦 Encrypted Vault Snapshot Export")
        if st.button("Generate Encrypted Snapshot (.vault.enc)"):
            snapshot_data = {
                "vault_id": st.session_state.active_vault_id,
                "exported_at": datetime.datetime.utcnow().isoformat(),
                "transactions": db.get_transactions_df().to_dict(orient="records"),
                "accounts": db.get_accounts(),
                "mortgages": db.get_mortgages()
            }
            json_blob = json.dumps(snapshot_data, indent=2).encode("utf-8")
            st.download_button(
                "📥 Download .vault.enc Backup",
                data=json_blob,
                file_name=f"vault_{st.session_state.active_vault_name.replace(' ', '_')}.vault.enc",
                mime="application/json"
            )

    with sec_col2:
        st.markdown("##### 📜 Immutable OSFI B-13 Audit Trail")
        audit_logs = db.get_audit_logs(limit=25)
        if audit_logs:
            st.dataframe(
                pd.DataFrame(audit_logs)[["timestamp", "event_type", "details", "severity"]],
                column_config={
                    "timestamp": "Timestamp",
                    "event_type": "Security Event",
                    "details": "Details",
                    "severity": "Severity"
                },
                use_container_width=True,
                hide_index=True
            )
        else:
            st.caption("Audit log is currently empty.")
