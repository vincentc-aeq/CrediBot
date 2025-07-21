#!/usr/bin/env python3
"""
Generate mock data for RecEngine development and testing.
Creates users.csv, card_ownership.csv, and transactions.csv
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Tuple

import numpy as np
import pandas as pd


# Configuration
RANDOM_SEED = 42
DATA_DIR = Path(__file__).parent.parent / "data"

# User configuration
NUM_USERS = 5000
AGE_RANGE = (18, 80)
INCOME_RANGE = (20000, 250000)
CREDIT_SCORE_RANGE = (550, 850)

# Card catalog (simplified version)
CARD_CATALOG = [
    {
        "card_id": "chase_sapphire_preferred",
        "issuer": "Chase",
        "name": "Sapphire Preferred",
        "annual_fee": 95,
        "categories": {"dining": 3, "travel": 2, "other": 1},
    },
    {
        "card_id": "amex_gold",
        "issuer": "American Express",
        "name": "Gold Card",
        "annual_fee": 250,
        "categories": {"dining": 4, "groceries": 4, "travel": 3, "other": 1},
    },
    {
        "card_id": "citi_double_cash",
        "issuer": "Citi",
        "name": "Double Cash",
        "annual_fee": 0,
        "categories": {"other": 2},  # 2% on everything
    },
    {
        "card_id": "capital_one_savor",
        "issuer": "Capital One",
        "name": "Savor",
        "annual_fee": 95,
        "categories": {"dining": 4, "entertainment": 4, "groceries": 2, "other": 1},
    },
    {
        "card_id": "discover_it",
        "issuer": "Discover",
        "name": "Discover it",
        "annual_fee": 0,
        "categories": {"gas": 5, "groceries": 5, "other": 1},  # Rotating categories
    },
    {
        "card_id": "bofa_customized_cash",
        "issuer": "Bank of America",
        "name": "Customized Cash Rewards",
        "annual_fee": 0,
        "categories": {"gas": 3, "online_shopping": 3, "dining": 2, "other": 1},
    },
    {
        "card_id": "wells_fargo_active_cash",
        "issuer": "Wells Fargo",
        "name": "Active Cash",
        "annual_fee": 0,
        "categories": {"other": 2},
    },
    {
        "card_id": "chase_freedom_flex",
        "issuer": "Chase",
        "name": "Freedom Flex",
        "annual_fee": 0,
        "categories": {"gas": 5, "groceries": 5, "dining": 3, "other": 1},
    },
    {
        "card_id": "amex_blue_cash_preferred",
        "issuer": "American Express",
        "name": "Blue Cash Preferred",
        "annual_fee": 95,
        "categories": {"groceries": 6, "streaming": 6, "gas": 3, "other": 1},
    },
    {
        "card_id": "capital_one_venture",
        "issuer": "Capital One",
        "name": "Venture",
        "annual_fee": 95,
        "categories": {"other": 2},  # 2x miles on everything
    },
    {
        "card_id": "us_bank_altitude_go",
        "issuer": "US Bank",
        "name": "Altitude Go",
        "annual_fee": 0,
        "categories": {"dining": 4, "groceries": 2, "gas": 2, "other": 1},
    },
    {
        "card_id": "pnc_cash_rewards",
        "issuer": "PNC",
        "name": "Cash Rewards",
        "annual_fee": 0,
        "categories": {"gas": 4, "dining": 3, "groceries": 2, "other": 1},
    },
]

# Transaction categories and spending patterns
TRANSACTION_CATEGORIES = {
    "groceries": {"avg": 150, "std": 50, "freq": 8},
    "dining": {"avg": 75, "std": 30, "freq": 12},
    "gas": {"avg": 50, "std": 15, "freq": 4},
    "travel": {"avg": 500, "std": 300, "freq": 0.5},
    "entertainment": {"avg": 100, "std": 50, "freq": 2},
    "online_shopping": {"avg": 200, "std": 100, "freq": 3},
    "utilities": {"avg": 200, "std": 50, "freq": 1},
    "healthcare": {"avg": 150, "std": 100, "freq": 0.5},
    "streaming": {"avg": 50, "std": 20, "freq": 1},
    "other": {"avg": 100, "std": 75, "freq": 5},
}

# US states for location
US_STATES = [
    "CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI",
    "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI",
]


def generate_users(num_users: int) -> pd.DataFrame:
    """Generate user profiles."""
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    
    users = []
    for i in range(num_users):
        user = {
            "user_id": f"user_{i+1:05d}",
            "age": random.randint(*AGE_RANGE),
            "income": round(random.uniform(*INCOME_RANGE), -3),  # Round to nearest 1000
            "credit_score": random.randint(*CREDIT_SCORE_RANGE),
            "location": random.choice(US_STATES),
            "created_at": datetime.now() - timedelta(days=random.randint(0, 730)),
        }
        
        # Add user preferences based on demographics
        if user["age"] < 30:
            user["preferred_categories"] = ["dining", "entertainment", "online_shopping"]
        elif user["age"] < 50:
            user["preferred_categories"] = ["groceries", "gas", "dining"]
        else:
            user["preferred_categories"] = ["groceries", "healthcare", "utilities"]
        
        users.append(user)
    
    return pd.DataFrame(users)


def generate_card_ownership(users_df: pd.DataFrame) -> pd.DataFrame:
    """Generate card ownership data."""
    random.seed(RANDOM_SEED)
    
    ownerships = []
    
    for _, user in users_df.iterrows():
        # Determine number of cards based on credit score
        if user["credit_score"] < 650:
            num_cards = random.randint(1, 2)
        elif user["credit_score"] < 750:
            num_cards = random.randint(2, 4)
        else:
            num_cards = random.randint(3, 6)
        
        # Select cards based on user profile
        available_cards = CARD_CATALOG.copy()
        
        # Filter by annual fee preference based on income
        if user["income"] < 50000:
            # Prefer no annual fee cards
            available_cards = sorted(available_cards, key=lambda x: x["annual_fee"])
        
        # Select cards
        selected_cards = random.sample(available_cards, min(num_cards, len(available_cards)))
        
        for idx, card in enumerate(selected_cards):
            ownership = {
                "user_id": user["user_id"],
                "card_id": card["card_id"],
                "ownership_start_date": user["created_at"] + timedelta(days=random.randint(0, 365)),
                "is_primary": idx == 0,  # First card is primary
                "credit_limit": round(user["income"] * random.uniform(0.1, 0.3), -2),
            }
            ownerships.append(ownership)
    
    return pd.DataFrame(ownerships)


def generate_transactions(
    users_df: pd.DataFrame, 
    ownership_df: pd.DataFrame, 
    num_months: int = 3
) -> pd.DataFrame:
    """Generate transaction data."""
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    
    transactions = []
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30 * num_months)
    
    for _, user in users_df.iterrows():
        # Get user's cards
        user_cards = ownership_df[ownership_df["user_id"] == user["user_id"]]
        
        if user_cards.empty:
            continue
        
        # Generate transactions for the period
        current_date = start_date
        
        while current_date <= end_date:
            # Generate daily transactions
            for category, pattern in TRANSACTION_CATEGORIES.items():
                # Check if transaction happens today (based on monthly frequency)
                if random.random() < pattern["freq"] / 30:
                    # Select a card (prefer primary card)
                    card_weights = [2.0 if card["is_primary"] else 1.0 for _, card in user_cards.iterrows()]
                    selected_card = user_cards.sample(weights=card_weights).iloc[0]
                    
                    # Generate amount
                    amount = max(10, np.random.normal(pattern["avg"], pattern["std"]))
                    
                    transaction = {
                        "transaction_id": str(uuid.uuid4()),
                        "user_id": user["user_id"],
                        "card_id": selected_card["card_id"],
                        "amount": round(amount, 2),
                        "category": category,
                        "merchant": f"{category.title()} Merchant {random.randint(1, 100)}",
                        "location": user["location"],
                        "timestamp": current_date + timedelta(
                            hours=random.randint(6, 22),
                            minutes=random.randint(0, 59)
                        ),
                    }
                    transactions.append(transaction)
            
            current_date += timedelta(days=1)
    
    return pd.DataFrame(transactions)


def validate_data(users_df: pd.DataFrame, ownership_df: pd.DataFrame, transactions_df: pd.DataFrame) -> bool:
    """Validate referential integrity."""
    print("\nValidating data integrity...")
    
    # Check all users have at least one card
    users_with_cards = set(ownership_df["user_id"].unique())
    all_users = set(users_df["user_id"].unique())
    users_without_cards = all_users - users_with_cards
    
    if users_without_cards:
        print(f"Warning: {len(users_without_cards)} users have no cards")
    
    # Check all transactions use valid cards
    transaction_cards = set(zip(transactions_df["user_id"], transactions_df["card_id"]))
    ownership_cards = set(zip(ownership_df["user_id"], ownership_df["card_id"]))
    invalid_cards = transaction_cards - ownership_cards
    
    if invalid_cards:
        print(f"Error: {len(invalid_cards)} transactions use invalid card ownership")
        return False
    
    # Check transaction counts
    print(f"\nData summary:")
    print(f"- Users: {len(users_df):,}")
    print(f"- Card ownerships: {len(ownership_df):,}")
    print(f"- Transactions: {len(transactions_df):,}")
    print(f"- Avg cards per user: {len(ownership_df) / len(users_df):.1f}")
    print(f"- Avg transactions per user: {len(transactions_df) / len(users_df):.1f}")
    
    return True


def main():
    """Main function to generate all data files."""
    parser = argparse.ArgumentParser(description="Generate mock data for RecEngine")
    parser.add_argument("--users", type=int, default=NUM_USERS, help="Number of users to generate")
    parser.add_argument("--months", type=int, default=3, help="Number of months of transactions")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()
    
    # Ensure data directory exists
    DATA_DIR.mkdir(exist_ok=True)
    
    # Check for existing data
    transactions_file = DATA_DIR / "transactions.csv"
    if transactions_file.exists() and not args.force:
        print(f"Transactions file already exists at {transactions_file}")
        print("Use --force to regenerate data")
        return
    
    print(f"Generating mock data for {args.users:,} users...")
    
    # Generate data
    print("1. Generating users...")
    users_df = generate_users(args.users)
    users_df.to_csv(DATA_DIR / "users.csv", index=False)
    
    print("2. Generating card ownership...")
    ownership_df = generate_card_ownership(users_df)
    ownership_df.to_csv(DATA_DIR / "card_ownership.csv", index=False)
    
    print("3. Generating transactions...")
    transactions_df = generate_transactions(users_df, ownership_df, args.months)
    transactions_df.to_csv(DATA_DIR / "transactions.csv", index=False)
    
    # Validate data
    if validate_data(users_df, ownership_df, transactions_df):
        print("\n✅ Data generation complete!")
        print(f"Files saved to: {DATA_DIR}")
    else:
        print("\n❌ Data validation failed!")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())