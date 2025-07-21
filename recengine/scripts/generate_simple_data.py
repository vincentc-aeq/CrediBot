#!/usr/bin/env python3
"""
Simplified data generation script with minimal dependencies.
"""

import csv
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
RANDOM_SEED = 42
DATA_DIR = Path(__file__).parent.parent / "data"
NUM_USERS = 5000
NUM_MONTHS = 3

# Set random seed
random.seed(RANDOM_SEED)

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)

# Card catalog
CARDS = [
    {"card_id": "chase_sapphire_preferred", "issuer": "Chase", "annual_fee": 95},
    {"card_id": "amex_gold", "issuer": "American Express", "annual_fee": 250},
    {"card_id": "citi_double_cash", "issuer": "Citi", "annual_fee": 0},
    {"card_id": "capital_one_savor", "issuer": "Capital One", "annual_fee": 95},
    {"card_id": "discover_it", "issuer": "Discover", "annual_fee": 0},
    {"card_id": "bofa_customized_cash", "issuer": "Bank of America", "annual_fee": 0},
    {"card_id": "wells_fargo_active_cash", "issuer": "Wells Fargo", "annual_fee": 0},
    {"card_id": "chase_freedom_flex", "issuer": "Chase", "annual_fee": 0},
    {"card_id": "amex_blue_cash_preferred", "issuer": "American Express", "annual_fee": 95},
    {"card_id": "capital_one_venture", "issuer": "Capital One", "annual_fee": 95},
    {"card_id": "us_bank_altitude_go", "issuer": "US Bank", "annual_fee": 0},
    {"card_id": "pnc_cash_rewards", "issuer": "PNC", "annual_fee": 0},
]

CATEGORIES = ["groceries", "dining", "gas", "travel", "entertainment", 
             "online_shopping", "utilities", "healthcare", "streaming", "other"]

STATES = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI"]

print("Generating mock data...")

# Generate users
print("1. Generating users.csv...")
with open(DATA_DIR / "users.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["user_id", "age", "income", "credit_score", "location", "created_at"])
    writer.writeheader()
    
    users = []
    for i in range(NUM_USERS):
        user = {
            "user_id": f"user_{i+1:05d}",
            "age": random.randint(18, 80),
            "income": round(random.uniform(20000, 250000), -3),
            "credit_score": random.randint(550, 850),
            "location": random.choice(STATES),
            "created_at": (datetime.now() - timedelta(days=random.randint(0, 730))).isoformat()
        }
        users.append(user)
        writer.writerow(user)

# Generate card ownership
print("2. Generating card_ownership.csv...")
with open(DATA_DIR / "card_ownership.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["user_id", "card_id", "ownership_start_date", "is_primary", "credit_limit"])
    writer.writeheader()
    
    ownerships = []
    for user in users:
        # Number of cards based on credit score
        if user["credit_score"] < 650:
            num_cards = random.randint(1, 2)
        elif user["credit_score"] < 750:
            num_cards = random.randint(2, 4)
        else:
            num_cards = random.randint(3, 6)
        
        # Select random cards
        selected_cards = random.sample(CARDS, min(num_cards, len(CARDS)))
        
        for idx, card in enumerate(selected_cards):
            ownership = {
                "user_id": user["user_id"],
                "card_id": card["card_id"],
                "ownership_start_date": (datetime.fromisoformat(user["created_at"]) + 
                                       timedelta(days=random.randint(0, 365))).isoformat(),
                "is_primary": idx == 0,
                "credit_limit": round(user["income"] * random.uniform(0.1, 0.3), -2)
            }
            ownerships.append(ownership)
            writer.writerow(ownership)

# Generate transactions
print("3. Generating transactions.csv...")
transaction_count = 0
with open(DATA_DIR / "transactions.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["transaction_id", "user_id", "card_id", "amount", 
                                          "category", "merchant", "location", "timestamp"])
    writer.writeheader()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30 * NUM_MONTHS)
    
    # Group ownerships by user
    user_cards = {}
    for ownership in ownerships:
        user_id = ownership["user_id"]
        if user_id not in user_cards:
            user_cards[user_id] = []
        user_cards[user_id].append(ownership)
    
    # Generate transactions for each user
    for user in users:
        if user["user_id"] not in user_cards:
            continue
        
        cards = user_cards[user["user_id"]]
        
        # Generate 10-50 transactions per month per user
        num_transactions = random.randint(10 * NUM_MONTHS, 50 * NUM_MONTHS)
        
        for _ in range(num_transactions):
            # Pick a random card (prefer primary)
            card = random.choices(cards, 
                                weights=[3 if c["is_primary"] else 1 for c in cards])[0]
            
            # Generate transaction
            days_ago = random.randint(0, (end_date - start_date).days)
            transaction = {
                "transaction_id": f"txn_{transaction_count:08d}",
                "user_id": user["user_id"],
                "card_id": card["card_id"],
                "amount": round(random.uniform(10, 500), 2),
                "category": random.choice(CATEGORIES),
                "merchant": f"Merchant_{random.randint(1, 1000)}",
                "location": user["location"],
                "timestamp": (end_date - timedelta(days=days_ago, 
                                                 hours=random.randint(0, 23),
                                                 minutes=random.randint(0, 59))).isoformat()
            }
            writer.writerow(transaction)
            transaction_count += 1

print(f"\n✅ Data generation complete!")
print(f"- Users: {NUM_USERS:,}")
print(f"- Card ownerships: {len(ownerships):,}")
print(f"- Transactions: {transaction_count:,}")
print(f"Files saved to: {DATA_DIR}")