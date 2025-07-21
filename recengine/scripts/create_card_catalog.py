#!/usr/bin/env python3
"""
Create card catalog from hardcoded data (based on CrediBot seeds).
"""

import json
from datetime import datetime
from pathlib import Path

import pandas as pd

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"

# Card data from CrediBot seeds (converted to RecEngine format)
CARD_DATA = [
    {
        "card_id": "chase_sapphire_preferred",
        "issuer": "Chase",
        "network": "Visa",
        "reward_type": "points",
        "base_rate_pct": 1.0,
        "bonus_categories": {"travel": 2.0, "dining": 2.0},
        "bonus_cap_amt": 0.0,
        "annual_fee": 95.0,
        "signup_bonus_value": 750.0,
        "signup_req_spend": 4000.0,
        "foreign_tx_fee_pct": 0.0,
        "point_value_cent": 1.5,
        "credit_score_min": 700,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "citi_double_cash_card",
        "issuer": "Citi",
        "network": "Mastercard",
        "reward_type": "cashback",
        "base_rate_pct": 2.0,
        "bonus_categories": {},
        "bonus_cap_amt": 0.0,
        "annual_fee": 0.0,
        "signup_bonus_value": 200.0,
        "signup_req_spend": 1500.0,
        "foreign_tx_fee_pct": 3.0,
        "point_value_cent": 1.0,
        "credit_score_min": 650,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "american_express_gold_card",
        "issuer": "American Express",
        "network": "American Express",
        "reward_type": "points",
        "base_rate_pct": 1.0,
        "bonus_categories": {"dining": 4.0, "groceries": 4.0},
        "bonus_cap_amt": 25000.0,
        "annual_fee": 250.0,
        "signup_bonus_value": 1000.0,
        "signup_req_spend": 4000.0,
        "foreign_tx_fee_pct": 0.0,
        "point_value_cent": 1.8,
        "credit_score_min": 700,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "discover_it_cash_back",
        "issuer": "Discover",
        "network": "Discover",
        "reward_type": "cashback",
        "base_rate_pct": 1.0,
        "bonus_categories": {"rotating": 5.0},  # Quarterly categories
        "bonus_cap_amt": 1500.0,  # $1500 per quarter
        "annual_fee": 0.0,
        "signup_bonus_value": 200.0,
        "signup_req_spend": 1000.0,
        "foreign_tx_fee_pct": 2.5,
        "point_value_cent": 1.0,
        "credit_score_min": 600,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "capital_one_venture_rewards",
        "issuer": "Capital One",
        "network": "Visa",
        "reward_type": "miles",
        "base_rate_pct": 2.0,
        "bonus_categories": {},
        "bonus_cap_amt": 0.0,
        "annual_fee": 95.0,
        "signup_bonus_value": 600.0,
        "signup_req_spend": 3000.0,
        "foreign_tx_fee_pct": 0.0,
        "point_value_cent": 1.0,
        "credit_score_min": 660,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "chase_freedom_unlimited",
        "issuer": "Chase",
        "network": "Visa",
        "reward_type": "cashback",
        "base_rate_pct": 1.5,
        "bonus_categories": {},
        "bonus_cap_amt": 0.0,
        "annual_fee": 0.0,
        "signup_bonus_value": 200.0,
        "signup_req_spend": 500.0,
        "foreign_tx_fee_pct": 3.0,
        "point_value_cent": 1.0,
        "credit_score_min": 650,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "blue_cash_preferred_card",
        "issuer": "American Express",
        "network": "American Express",
        "reward_type": "cashback",
        "base_rate_pct": 1.0,
        "bonus_categories": {"groceries": 6.0, "entertainment": 3.0, "gas": 3.0},
        "bonus_cap_amt": 6000.0,
        "annual_fee": 95.0,
        "signup_bonus_value": 350.0,
        "signup_req_spend": 3000.0,
        "foreign_tx_fee_pct": 2.7,
        "point_value_cent": 1.0,
        "credit_score_min": 670,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "wells_fargo_active_cash_card",
        "issuer": "Wells Fargo",
        "network": "Visa",
        "reward_type": "cashback",
        "base_rate_pct": 2.0,
        "bonus_categories": {},
        "bonus_cap_amt": 0.0,
        "annual_fee": 0.0,
        "signup_bonus_value": 200.0,
        "signup_req_spend": 1000.0,
        "foreign_tx_fee_pct": 3.0,
        "point_value_cent": 1.0,
        "credit_score_min": 600,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "chase_sapphire_reserve",
        "issuer": "Chase",
        "network": "Visa",
        "reward_type": "points",
        "base_rate_pct": 1.0,
        "bonus_categories": {"travel": 3.0, "dining": 3.0},
        "bonus_cap_amt": 0.0,
        "annual_fee": 550.0,
        "signup_bonus_value": 1000.0,
        "signup_req_spend": 4000.0,
        "foreign_tx_fee_pct": 0.0,
        "point_value_cent": 1.5,
        "credit_score_min": 750,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "capital_one_quicksilver",
        "issuer": "Capital One",
        "network": "Visa",
        "reward_type": "cashback",
        "base_rate_pct": 1.5,
        "bonus_categories": {},
        "bonus_cap_amt": 0.0,
        "annual_fee": 0.0,
        "signup_bonus_value": 200.0,
        "signup_req_spend": 500.0,
        "foreign_tx_fee_pct": 0.0,
        "point_value_cent": 1.0,
        "credit_score_min": 650,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "chase_ink_business_preferred",
        "issuer": "Chase",
        "network": "Visa",
        "reward_type": "points",
        "base_rate_pct": 1.0,
        "bonus_categories": {"travel": 3.0, "shopping": 3.0},
        "bonus_cap_amt": 150000.0,
        "annual_fee": 95.0,
        "signup_bonus_value": 1000.0,
        "signup_req_spend": 5000.0,
        "foreign_tx_fee_pct": 0.0,
        "point_value_cent": 1.5,
        "credit_score_min": 680,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
    {
        "card_id": "discover_it_student_cash_back",
        "issuer": "Discover",
        "network": "Discover",
        "reward_type": "cashback",
        "base_rate_pct": 1.0,
        "bonus_categories": {"rotating": 5.0},
        "bonus_cap_amt": 1500.0,
        "annual_fee": 0.0,
        "signup_bonus_value": 100.0,
        "signup_req_spend": 500.0,
        "foreign_tx_fee_pct": 2.5,
        "point_value_cent": 1.0,
        "credit_score_min": 580,
        "eligibility_region": "US",
        "updated_at": datetime.now().isoformat(),
    },
]


def create_card_catalog():
    """Create card catalog files."""
    print("Creating card catalog...")
    
    # Ensure data directory exists
    DATA_DIR.mkdir(exist_ok=True)
    
    # Convert bonus_categories to JSON strings for CSV compatibility
    processed_data = []
    for card in CARD_DATA:
        card_copy = card.copy()
        card_copy["bonus_categories"] = json.dumps(card["bonus_categories"])
        processed_data.append(card_copy)
    
    # Create DataFrame
    df = pd.DataFrame(processed_data)
    
    # Save as parquet (primary format)
    parquet_file = DATA_DIR / "card_catalog.parquet"
    df.to_parquet(parquet_file, index=False)
    
    # Save as CSV (backup format)
    csv_file = DATA_DIR / "card_catalog.csv"
    df.to_csv(csv_file, index=False)
    
    print(f"✅ Card catalog saved:")
    print(f"  - Parquet: {parquet_file}")
    print(f"  - CSV: {csv_file}")
    
    # Print summary
    print(f"\nCard Catalog Summary:")
    print(f"- Total cards: {len(df)}")
    print(f"- Issuers: {df['issuer'].nunique()} ({', '.join(df['issuer'].unique())})")
    print(f"- Networks: {df['network'].nunique()} ({', '.join(df['network'].unique())})")
    print(f"- Reward types: {df['reward_type'].value_counts().to_dict()}")
    print(f"- Avg annual fee: ${df['annual_fee'].mean():.2f}")
    print(f"- No annual fee cards: {(df['annual_fee'] == 0).sum()}")
    print(f"- Credit score range: {df['credit_score_min'].min()}-{df['credit_score_min'].max()}")


if __name__ == "__main__":
    create_card_catalog()