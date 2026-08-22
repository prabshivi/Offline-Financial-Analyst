"""
core/analytics.py
Canadian Financial Intelligence & Wealth Management Suite.
- Internal Transfer & Credit Card Payment Pairing (Double-Counting Elimination)
- Subscription & Hidden Bank Fee Audit Engine
- Canadian Registered Accounts (TFSA, RRSP, FHSA) Contribution Trackers & Tax Refund Estimator
- Canadian Mortgage Suite (Semi-Annual Compounding, Payment Dissection, Prepayment Accelerator, Renewal Stress Testing)
- Visual Analytics Aggregators (Sankey Flow, Net Cash Flow Waterfall, Spending Velocity)
"""

import math
import datetime
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd


# --- 1. CANADIAN TAX BRACKETS & LIMITS (2024-2026 CRA BENCHMARKS) ---
TFSA_ANNUAL_LIMITS = {
    2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
    2013: 5500, 2014: 5500,
    2015: 10000,
    2016: 5500, 2017: 5500, 2018: 5500,
    2019: 6000, 2020: 6000, 2021: 6000, 2022: 6000,
    2023: 6500,
    2024: 7000, 2025: 7000, 2026: 7000
}

# Federal Tax Brackets (2024/2025 CRA rates)
FEDERAL_BRACKETS = [
    (55867, 0.15),
    (111733, 0.205),
    (173205, 0.26),
    (246752, 0.29),
    (float('inf'), 0.33)
]

# Provincial Marginal Rates (Ontario baseline estimate)
PROVINCIAL_BRACKETS_ON = [
    (51446, 0.0505),
    (102894, 0.0915),
    (150000, 0.1116),
    (220000, 0.1216),
    (float('inf'), 0.1316)
]


class RegisteredAccountsEngine:
    """
    Tracks CRA contribution room, deduction limits, and estimated tax refunds.
    """

    @staticmethod
    def calculate_tfsa_lifetime_room(birth_year: int = 1990) -> Dict[str, Any]:
        """Calculates cumulative TFSA room since user turned 18 (or 2009 inception)."""
        current_year = datetime.date.today().year
        total_eligible = 0
        yearly_breakdown = []

        for yr, limit in sorted(TFSA_ANNUAL_LIMITS.items()):
            if yr <= current_year and (yr - birth_year) >= 18:
                total_eligible += limit
                yearly_breakdown.append({"year": yr, "limit": limit})

        return {
            "total_lifetime_room": total_eligible,
            "current_year_limit": TFSA_ANNUAL_LIMITS.get(current_year, 7000),
            "breakdown": yearly_breakdown
        }

    @staticmethod
    def calculate_fhsa_status(contributions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        FHSA: $8,000 annual limit, $40,000 lifetime cap.
        Contributions are 100% tax-deductible and qualifying home withdrawals are tax-free.
        """
        total_contributed = sum(c.get("contribution_amount", 0.0) for c in contributions)
        annual_limit = 8000.0
        lifetime_cap = 40000.0
        remaining_lifetime = max(0.0, lifetime_cap - total_contributed)

        current_year = datetime.date.today().year
        current_yr_contrib = sum(
            c.get("contribution_amount", 0.0)
            for c in contributions if c.get("tax_year") == current_year
        )
        remaining_annual = max(0.0, annual_limit - current_yr_contrib)

        return {
            "total_contributed": total_contributed,
            "lifetime_cap": lifetime_cap,
            "remaining_lifetime_room": remaining_lifetime,
            "current_year_contributions": current_yr_contrib,
            "remaining_annual_room": remaining_annual,
            "progress_percent": min(100.0, (total_contributed / lifetime_cap) * 100.0)
        }

    @staticmethod
    def estimate_rrsp_tax_savings(annual_income: float, rrsp_contribution: float) -> Dict[str, Any]:
        """
        Calculates estimated tax refund by applying marginal Federal + Ontario tax brackets.
        """
        if annual_income <= 0 or rrsp_contribution <= 0:
            return {"estimated_refund": 0.0, "effective_marginal_rate": 0.0}

        def compute_tax(inc: float) -> float:
            tax = 0.0
            # Federal
            prev_b = 0.0
            for bracket, rate in FEDERAL_BRACKETS:
                if inc > prev_b:
                    taxable_in_b = min(inc - prev_b, bracket - prev_b)
                    tax += taxable_in_b * rate
                    prev_b = bracket
                else:
                    break
            # Provincial (ON)
            prev_b = 0.0
            for bracket, rate in PROVINCIAL_BRACKETS_ON:
                if inc > prev_b:
                    taxable_in_b = min(inc - prev_b, bracket - prev_b)
                    tax += taxable_in_b * rate
                    prev_b = bracket
                else:
                    break
            return tax

        tax_before = compute_tax(annual_income)
        tax_after = compute_tax(max(0.0, annual_income - rrsp_contribution))
        refund = max(0.0, tax_before - tax_after)
        effective_rate = (refund / rrsp_contribution) * 100.0 if rrsp_contribution > 0 else 0.0

        return {
            "estimated_refund": round(refund, 2),
            "effective_marginal_rate": round(effective_rate, 2),
            "taxable_income_before": annual_income,
            "taxable_income_after": annual_income - rrsp_contribution
        }


# --- 2. CANADIAN MORTGAGE & DEBT SUITE ---
class MortgageEngine:
    """
    Calculates Canadian mortgages (Semi-Annual Compounding for Fixed Rates),
    payment dissections, prepayment accelerators, and renewal stress testing.
    """

    @staticmethod
    def calculate_canadian_payment(
        principal: float,
        nominal_annual_rate_pct: float,
        amortization_years: int,
        frequency: str = "Monthly"
    ) -> float:
        """
        Canadian Standard: Fixed mortgages compound semi-annually (2x/year), not monthly.
        Effective Monthly Rate = (1 + r/2)^(2/12) - 1.
        """
        if principal <= 0 or amortization_years <= 0:
            return 0.0

        r = nominal_annual_rate_pct / 100.0
        # Semi-annual compounding effective annual rate
        effective_monthly_rate = math.pow((1.0 + r / 2.0), (2.0 / 12.0)) - 1.0
        n_months = amortization_years * 12

        if effective_monthly_rate == 0:
            monthly_pmt = principal / n_months
        else:
            monthly_pmt = principal * (
                effective_monthly_rate * math.pow(1.0 + effective_monthly_rate, n_months)
            ) / (math.pow(1.0 + effective_monthly_rate, n_months) - 1.0)

        freq_lower = frequency.lower()
        if "bi-weekly" in freq_lower or "biweekly" in freq_lower:
            if "accelerated" in freq_lower:
                return monthly_pmt / 2.0  # 26 payments of monthly/2 (accelerates principal reduction)
            else:
                return (monthly_pmt * 12.0) / 26.0
        elif "weekly" in freq_lower:
            if "accelerated" in freq_lower:
                return monthly_pmt / 4.0
            else:
                return (monthly_pmt * 12.0) / 52.0

        return monthly_pmt

    @classmethod
    def generate_amortization_schedule(
        cls,
        principal: float,
        rate_pct: float,
        amortization_years: int,
        frequency: str = "Monthly",
        extra_monthly_prepayment: float = 0.0,
        annual_lump_sum: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Generates full period-by-period amortization schedule with interest vs principal breakdown.
        """
        payment = cls.calculate_canadian_payment(principal, rate_pct, amortization_years, frequency)
        r = rate_pct / 100.0
        eff_period_rate = math.pow((1.0 + r / 2.0), (2.0 / 12.0)) - 1.0

        balance = principal
        schedule = []
        period = 1
        total_interest = 0.0
        total_principal = 0.0
        max_periods = amortization_years * 12

        while balance > 0.01 and period <= max_periods:
            interest_charge = balance * eff_period_rate
            scheduled_principal = max(0.0, payment - interest_charge)

            prepayment = extra_monthly_prepayment
            if period % 12 == 0 and annual_lump_sum > 0:
                prepayment += annual_lump_sum

            actual_principal = min(balance, scheduled_principal + prepayment)
            actual_payment = interest_charge + actual_principal
            balance -= actual_principal

            total_interest += interest_charge
            total_principal += actual_principal

            schedule.append({
                "period": period,
                "year": math.ceil(period / 12),
                "payment": round(actual_payment, 2),
                "principal_paid": round(actual_principal, 2),
                "interest_paid": round(interest_charge, 2),
                "remaining_balance": max(0.0, round(balance, 2)),
                "cumulative_interest": round(total_interest, 2)
            })
            period += 1

        return schedule

    @classmethod
    def run_renewal_stress_test(
        cls,
        current_balance: float,
        current_rate_pct: float,
        remaining_amort_years: int,
        rate_deltas: List[float] = [1.0, 1.5, 2.0, 3.0]
    ) -> List[Dict[str, Any]]:
        """
        Projects monthly cash flow impact under mortgage renewal rate shock scenarios.
        """
        base_pmt = cls.calculate_canadian_payment(current_balance, current_rate_pct, remaining_amort_years, "Monthly")
        scenarios = []

        for delta in rate_deltas:
            new_rate = current_rate_pct + delta
            new_pmt = cls.calculate_canadian_payment(current_balance, new_rate, remaining_amort_years, "Monthly")
            monthly_diff = new_pmt - base_pmt
            annual_diff = monthly_diff * 12.0

            scenarios.append({
                "rate_increase": f"+{delta:.1f}%",
                "new_interest_rate": f"{new_rate:.2f}%",
                "new_monthly_payment": round(new_pmt, 2),
                "monthly_increase": round(monthly_diff, 2),
                "annual_cashflow_impact": round(annual_diff, 2),
                "pct_increase": round((monthly_diff / base_pmt) * 100.0, 1) if base_pmt > 0 else 0.0
            })

        return scenarios


# --- 3. INTERNAL TRANSFERS & SUBSCRIPTIONS AUDITOR ---
class FinancialIntelligence:
    """
    Auto-detects internal transfers, credit card payoffs, subscriptions, and bank fees.
    """

    @staticmethod
    def pair_internal_transfers(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scans for matching outflows and inflows of identical amounts within +/- 3 days.
        Flags them as internal transfers to prevent double-counting.
        """
        outflows = [tx for tx in transactions if tx.get("outflow_amount", 0) > 0]
        inflows = [tx for tx in transactions if tx.get("inflow_amount", 0) > 0]
        paired_ids = set()

        for out_tx in outflows:
            if out_tx.get("id") in paired_ids:
                continue
            out_amt = out_tx["outflow_amount"]
            out_date_str = out_tx.get("date")
            if not out_date_str:
                continue

            try:
                out_date = datetime.datetime.strptime(out_date_str, "%Y-%m-%d")
            except Exception:
                continue

            for in_tx in inflows:
                if in_tx.get("id") in paired_ids or in_tx.get("account_id") == out_tx.get("account_id"):
                    continue

                if abs(in_tx["inflow_amount"] - out_amt) < 0.01:
                    in_date_str = in_tx.get("date")
                    if not in_date_str:
                        continue
                    try:
                        in_date = datetime.datetime.strptime(in_date_str, "%Y-%m-%d")
                        diff_days = abs((in_date - out_date).days)
                        if diff_days <= 3:
                            # Match found!
                            out_tx["is_transfer"] = 1
                            out_tx["category"] = "Internal Transfer"
                            out_tx["paired_tx_id"] = in_tx.get("id")

                            in_tx["is_transfer"] = 1
                            in_tx["category"] = "Internal Transfer"
                            in_tx["paired_tx_id"] = out_tx.get("id")

                            paired_ids.add(out_tx.get("id"))
                            paired_ids.add(in_tx.get("id"))
                            break
                    except Exception:
                        continue

        return transactions

    @staticmethod
    def detect_recurring_subscriptions(transactions_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Finds repeating merchants with consistent outflow charges across months.
        """
        if transactions_df.empty or "clean_merchant" not in transactions_df.columns:
            return []

        df_out = transactions_df[transactions_df["outflow_amount"] > 0].copy()
        if df_out.empty:
            return []

        recurring = []
        for merchant, group in df_out.groupby("clean_merchant"):
            if len(group) >= 2:
                amounts = group["outflow_amount"].tolist()
                avg_amt = sum(amounts) / len(amounts)
                # Check if standard deviation of amount is small (fixed recurring amount)
                variance = sum((x - avg_amt) ** 2 for x in amounts) / len(amounts)
                std_dev = math.sqrt(variance)

                if std_dev < 1.0 or (std_dev / avg_amt < 0.05):
                    recurring.append({
                        "merchant": merchant,
                        "category": group["category"].iloc[0],
                        "frequency_count": len(group),
                        "average_amount": round(avg_amt, 2),
                        "annual_cost_projection": round(avg_amt * 12, 2),
                        "last_charge_date": group["date"].max()
                    })

        recurring.sort(key=lambda x: x["annual_cost_projection"], reverse=True)
        return recurring

    @staticmethod
    def audit_bank_fees(transactions_df: pd.DataFrame) -> Dict[str, Any]:
        """Audits bank maintenance fees, NSF charges, and FX fees."""
        if transactions_df.empty:
            return {"total_fees": 0.0, "fee_transactions": []}

        fee_df = transactions_df[
            (transactions_df["category"] == "Bank Fees & Charges") |
            (transactions_df["raw_description"].str.contains(r'fee|charge|nsf|overdraft|service', case=False, na=False))
        ]

        total = fee_df["outflow_amount"].sum() if not fee_df.empty else 0.0
        return {
            "total_fees": round(float(total), 2),
            "fee_count": len(fee_df),
            "annualized_drain": round(float(total) * 12 / max(1, len(transactions_df["date"].str[:7].unique())), 2),
            "transactions": fee_df.to_dict(orient="records") if not fee_df.empty else []
        }
