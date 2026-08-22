"""
core/rules.py
Canadian Merchant Normalization & Automated Regex Categorization Engine.
- High-Accuracy Canadian POS & Point-of-Sale Metadata Cleaning
- Categorization Rules & Transfer Detection
- Transaction Splitting Engine
"""

import re
from typing import List, Dict, Any, Tuple, Optional

# Canadian Merchant Normalization Patterns (Regex -> Clean Brand & Category)
DEFAULT_CANADIAN_RULES = [
    # --- GROCERIES & FOOD MARKETS ---
    (r'(?i)\b(?:LOBLAWS|REAL CDN SUPERSTORE|SUPERSTORE|ZEHRS|PROVIGO|FORTINO|NO FRILLS|MAXI|INDEPENDENT GROCER)\b', 'Loblaws', 'Groceries', 0),
    (r'(?i)\b(?:SOBEYS|SAFEWAY|IGA\b|FOODLAND|FRESHCO|THRIFTY FOODS)\b', 'Sobeys', 'Groceries', 0),
    (r'(?i)\b(?:METRO\s*(?:ONTARIO|QC|\#|\d)|FOOD BASICS|SUPER C)\b', 'Metro', 'Groceries', 0),
    (r'(?i)\b(?:COSTCO\s*WHOLESALE|COSTCO\s*ECOM|COSTCO\s*GAS)\b', 'Costco Wholesale', 'Groceries', 0),
    (r'(?i)\b(?:WAL-?MART|WALMART\.CA)\b', 'Walmart Canada', 'Groceries', 0),
    (r'(?i)\b(?:T&T\s*SUPERMARKET|FARM BOY|WHOLE FOODS|LONGOS|NATIONS FRESH)\b', 'Specialty Grocer', 'Groceries', 0),

    # --- DINING, COFFEE & RESTAURANTS ---
    (r'(?i)\b(?:TIM HORTONS|TIM HORTON|TIMS\s*\#)\b', 'Tim Hortons', 'Dining & Restaurants', 0),
    (r'(?i)\b(?:STARBUCKS|STARBUCKS\s*CARD)\b', 'Starbucks', 'Dining & Restaurants', 0),
    (r'(?i)\b(?:MCDONALD\'?S|MCDONALDS)\b', "McDonald's", 'Dining & Restaurants', 0),
    (r'(?i)\b(?:SUBWAY\s*\#|A&W\s*\#|HARVEY\'?S|WENDY\'?S|BURGER KING|CHIPOTLE|OSMOW\'?S|MARY BROWN\'?S)\b', 'Fast Food', 'Dining & Restaurants', 0),
    (r'(?i)\b(?:DOORDASH|UBER\s*EATS|SKIPTHEDISHES|SKIP THE DISHES|RITUAL)\b', 'Food Delivery', 'Dining & Restaurants', 0),
    (r'(?i)\b(?:LCBO|THE BEER STORE|SAQ\b|BCLC|ALBERTA LIQUOR)\b', 'Liquor & Spirits', 'Dining & Restaurants', 0),

    # --- PHARMACY & HEALTHCARE ---
    (r'(?i)\b(?:SHOPPERS DRUG MART|SDM\s*\#|PHARMAPRIX|REXALL|LONDON DRUGS|JEAN COUTU)\b', 'Shoppers Drug Mart / Rexall', 'Healthcare & Medical', 0),
    (r'(?i)\b(?:DENTAL|OPTOMETR|PHYSIO|MASSAGE|CHIROPRACT|PHARMACY|LIFELABS)\b', 'Medical / Healthcare', 'Healthcare & Medical', 0),

    # --- TELECOM & UTILITIES ---
    (r'(?i)\b(?:ROGERS|FIDO|CHATR)\b', 'Rogers Communications', 'Utilities & Internet', 0),
    (r'(?i)\b(?:BELL\s*(?:CANADA|MOBILITY|ALIANT)|VIRGIN\s*PLUS|LUCKY MOBILE)\b', 'Bell Canada', 'Utilities & Internet', 0),
    (r'(?i)\b(?:TELUS|KOODO|PUBLIC MOBILE)\b', 'Telus', 'Utilities & Internet', 0),
    (r'(?i)\b(?:FREEDOM MOBILE|SHAW CABLE|VIDEOTRON|COGECO|TEKSAVVY|BEANFIELD)\b', 'Internet / Mobile Service', 'Utilities & Internet', 0),
    (r'(?i)\b(?:HYDRO ONE|TORONTO HYDRO|BC HYDRO|HYDRO QUEBEC|ENMAX|EPCOR|ENBRIDGE|FORTISBC|ENERGIR)\b', 'Municipal Energy / Hydro', 'Utilities & Internet', 0),

    # --- TRANSPORTATION & AUTO ---
    (r'(?i)\b(?:PRESTO|METROLINX|TTC\b|TRANSLINK|STM\s*MONTREAL|GO TRANSIT|EXPRESS TOLL ROUTE|407\s*ETR)\b', 'Public Transit & Tolls', 'Transportation & Auto', 0),
    (r'(?i)\b(?:UBER\s*(?:TRIP|RIDE|\*)|LYFT\b)\b', 'Rideshare', 'Transportation & Auto', 0),
    (r'(?i)\b(?:ESSO|PETRO-?CANADA|SHELL|CANADIAN TIRE GAS|CHEVRON|PIONEER)\b', 'Gas Station', 'Transportation & Auto', 0),
    (r'(?i)\b(?:ICBC|CAA\b|CAR INSURANCE|TD INSURANCE|DESJARDINS INS)\b', 'Auto Insurance', 'Transportation & Auto', 0),

    # --- SHOPPING, HARDWARE & RETAIL ---
    (r'(?i)\b(?:CANADIAN TIRE|CTC\s*\#)\b', 'Canadian Tire', 'Shopping & Retail', 0),
    (r'(?i)\b(?:DOLLARAMA|DOLLAR TREE)\b', 'Dollarama', 'Shopping & Retail', 0),
    (r'(?i)\b(?:AMZN|AMAZON\.CA|AMAZON MKTP|AMAZON PAYMENTS)\b', 'Amazon Canada', 'Shopping & Retail', 0),
    (r'(?i)\b(?:HOME DEPOT|RONA|LOWE\'?S|HOME HARDWARE|IKEA)\b', 'Home Improvement & Hardware', 'Shopping & Retail', 0),
    (r'(?i)\b(?:APPLE\.COM|APPLE STORE|BEST BUY|WINNERS|HOMESENSE|MARSHALLS|INDIGO|SEPHORA)\b', 'Retail Store', 'Shopping & Retail', 0),

    # --- SUBSCRIPTIONS & ENTERTAINMENT ---
    (r'(?i)\b(?:NETFLIX|SPOTIFY|DISNEY\s*PLUS|YOUTUBE\s*MEMBER|PRIME VIDEO|CRAVE|PARAMOUNT\s*PLUS)\b', 'Streaming Media', 'Subscriptions & Entertainment', 0),
    (r'(?i)\b(?:CHATGPT|OPENAI|GITHUB|ICLOUD|GOOGLE\s*ONE|DROPBOX|ADOBE|MICROSOFT\*XBOX|PLAYSTATION|NINTENDO|STEAMGAMES)\b', 'Digital Subscriptions', 'Subscriptions & Entertainment', 0),
    (r'(?i)\b(?:CINEPLEX|GOODLIFE|FIT4LESS|PLANET FITNESS|ANYTIME FITNESS)\b', 'Fitness & Leisure', 'Subscriptions & Entertainment', 0),

    # --- BANK FEES & SERVICE CHARGES ---
    (r'(?i)\b(?:MONTHLY ACCOUNT FEE|MONTHLY PLAN FEE|OVERDRAFT FEE|NSF CHARGE|INTERAC E-TRANSFER FEE|WIRE TRANSFER FEE|NON-MBR ATM FEE)\b', 'Bank Maintenance Fee', 'Bank Fees & Charges', 0),

    # --- INTERNAL TRANSFERS & CREDIT CARD PAYMENTS ---
    (r'(?i)\b(?:PAYMENT - THANK YOU|ONLINE PAYMENT|MB-CREDIT CARD|TRANSFER TO|TRANSFER FROM|E-TRANSFER SENT|E-TRANSFER RECEIVED|PAYMENT RECEIVED|AUTOPAY)\b', 'Internal Transfer / Payment', 'Internal Transfer', 1),

    # --- TAXES & GOVERNMENT BENEFITS ---
    (r'(?i)\b(?:CANADA R&E|CRA\b|CANADA REVENUE|DIRECT DEPOSIT CANADA|PROVINCIAL REFUND|ONTARIO TRILLIUM|CCB\b|GST/HST CREDIT)\b', 'Government of Canada / CRA', 'Taxes & Government', 0),
]


class RuleEngine:
    """
    Applies regex patterns to clean point-of-sale metadata and assign standard categories.
    """

    def __init__(self, custom_rules: Optional[List[Dict[str, Any]]] = None):
        self.rules = []
        # Add custom rules first (higher priority)
        if custom_rules:
            for r in custom_rules:
                try:
                    compiled = re.compile(r["pattern"], re.IGNORECASE)
                    self.rules.append({
                        "regex": compiled,
                        "merchant": r["target_merchant"],
                        "category": r["target_category"],
                        "is_transfer": bool(r.get("is_transfer", False))
                    })
                except Exception:
                    pass

        # Add built-in Canadian standard rules
        for pattern, merchant, category, is_transfer in DEFAULT_CANADIAN_RULES:
            try:
                compiled = re.compile(pattern)
                self.rules.append({
                    "regex": compiled,
                    "merchant": merchant,
                    "category": category,
                    "is_transfer": bool(is_transfer)
                })
            except Exception:
                pass

    def clean_and_categorize(self, raw_description: str) -> Tuple[str, str, bool]:
        """
        Takes raw bank statement description and returns (Clean_Merchant, Category, Is_Transfer).
        """
        if not raw_description:
            return "Unknown", "Uncategorized", False

        text = raw_description.strip()

        # Run through rule chain
        for rule in self.rules:
            if rule["regex"].search(text):
                return rule["merchant"], rule["category"], rule["is_transfer"]

        # Default fallback: clean standard noise (dates, SQ *, POS *, etc.)
        cleaned = text
        cleaned = re.sub(r'^(?:POS\s*PURCHASE|PURCHASE|DEBIT|INTERAC|SQ\s*\*|TST\*|VMM\*|PAYPAL\s*\*|SP\s*\*)\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'[\#\*]\d+.*$', '', cleaned)
        cleaned = re.sub(r'\b(?:TORONTO|VANCOUVER|MONTREAL|CALGARY|EDMONTON|OTTAWA|ON|BC|AB|QC|MB|SK|CA)\b.*$', '', cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip() or text

        return cleaned, "Uncategorized", False


class SplitTransactionHelper:
    """
    Validates and executes multi-category transaction splitting.
    """

    @staticmethod
    def validate_split(parent_amount: float, splits: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Verifies that total of split items equals the parent transaction amount.
        """
        if not splits or len(splits) < 2:
            return False, "At least two split components are required."

        total_splits = sum(float(s.get("amount", 0.0)) for s in splits)
        diff = abs(total_splits - parent_amount)

        if diff > 0.01:  # Allow 1 cent rounding tolerance
            return False, f"Sum of splits (${total_splits:.2f}) does not match transaction amount (${parent_amount:.2f}). Discrepancy: ${diff:.2f}"

        return True, "Split structure validated successfully."
