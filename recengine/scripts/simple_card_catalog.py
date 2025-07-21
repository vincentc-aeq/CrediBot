#!/usr/bin/env python3
"""
Create card catalog without external dependencies.
"""

import csv
import json
from datetime import datetime
from pathlib import Path

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"

# Card data (normalized to RecEngine schema)
CARD_DATA = [
    {
        "card_id": "chase_sapphire_preferred",
        "issuer": "Chase",
        "network": "Visa",
        "reward_type": "points",
        "base_rate_pct": 1.0,
        "bonus_categories": json.dumps({"travel": 2.0, "dining": 2.0}),
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
        "bonus_categories": json.dumps({}),
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
        "bonus_categories": json.dumps({"dining": 4.0, "groceries": 4.0}),
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
        "bonus_categories": json.dumps({"rotating": 5.0}),
        "bonus_cap_amt": 1500.0,
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
        "bonus_categories": json.dumps({}),
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
        "bonus_categories": json.dumps({}),
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
        "bonus_categories": json.dumps({"groceries": 6.0, "entertainment": 3.0, "gas": 3.0}),
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
        "bonus_categories": json.dumps({}),
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
        "bonus_categories": json.dumps({"travel": 3.0, "dining": 3.0}),
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
        "bonus_categories": json.dumps({}),
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
        "bonus_categories": json.dumps({"travel": 3.0, "shopping": 3.0}),
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
        "bonus_categories": json.dumps({"rotating": 5.0}),
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
    """Create card catalog CSV file."""
    print("Creating card catalog...")
    
    # Ensure data directory exists
    DATA_DIR.mkdir(exist_ok=True)
    
    # Save as CSV
    csv_file = DATA_DIR / "card_catalog.csv"
    
    if CARD_DATA:
        fieldnames = CARD_DATA[0].keys()
        
        with open(csv_file, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(CARD_DATA)
    
    print(f"✅ Card catalog saved to: {csv_file}")
    
    # Print summary
    total_cards = len(CARD_DATA)
    issuers = set(card["issuer"] for card in CARD_DATA)
    networks = set(card["network"] for card in CARD_DATA)
    reward_types = {}
    annual_fees = [card["annual_fee"] for card in CARD_DATA]
    no_fee_cards = sum(1 for card in CARD_DATA if card["annual_fee"] == 0)
    
    for card in CARD_DATA:
        reward_type = card["reward_type"]
        reward_types[reward_type] = reward_types.get(reward_type, 0) + 1
    
    print(f"\nCard Catalog Summary:")
    print(f"- Total cards: {total_cards}")
    print(f"- Issuers: {len(issuers)} ({', '.join(sorted(issuers))})")
    print(f"- Networks: {len(networks)} ({', '.join(sorted(networks))})")
    print(f"- Reward types: {reward_types}")
    print(f"- Avg annual fee: ${sum(annual_fees) / len(annual_fees):.2f}")
    print(f"- No annual fee cards: {no_fee_cards}")
    print(f"- Credit score range: {min(card['credit_score_min'] for card in CARD_DATA)}-{max(card['credit_score_min'] for card in CARD_DATA)}")


if __name__ == "__main__":
    create_card_catalog()