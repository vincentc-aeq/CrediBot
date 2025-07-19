#!/usr/bin/env python3
"""
Validate data integrity without external dependencies.
"""

import csv
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def validate_data():
    """Run all data validation checks."""
    print("Validating data integrity...\n")
    
    errors = []
    warnings = []
    
    # Check files exist
    users_file = DATA_DIR / "users.csv"
    ownership_file = DATA_DIR / "card_ownership.csv" 
    transactions_file = DATA_DIR / "transactions.csv"
    
    for file_path in [users_file, ownership_file, transactions_file]:
        if not file_path.exists():
            errors.append(f"Missing file: {file_path}")
            return errors, warnings
    
    # Load data
    print("Loading data files...")
    
    # Load users
    users = {}
    with open(users_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row["user_id"]] = row
    
    # Load ownership
    ownership = []
    user_cards = {}  # user_id -> list of card_ids
    valid_pairs = set()  # (user_id, card_id) tuples
    
    with open(ownership_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ownership.append(row)
            user_id = row["user_id"]
            card_id = row["card_id"]
            
            if user_id not in user_cards:
                user_cards[user_id] = []
            user_cards[user_id].append(card_id)
            valid_pairs.add((user_id, card_id))
    
    # Load transactions
    transaction_count = 0
    invalid_transactions = 0
    
    with open(transactions_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            transaction_count += 1
            pair = (row["user_id"], row["card_id"])
            if pair not in valid_pairs:
                invalid_transactions += 1
    
    # Validation checks
    print("\nRunning validation checks...")
    
    # 1. Check user count
    if len(users) != 5000:
        warnings.append(f"Expected 5000 users, found {len(users)}")
    
    # 2. Check transaction count
    if transaction_count < 200000:
        errors.append(f"Expected at least 200k transactions, found {transaction_count:,}")
    
    # 3. Check all users have cards
    users_without_cards = set(users.keys()) - set(user_cards.keys())
    if users_without_cards:
        errors.append(f"{len(users_without_cards)} users have no cards")
    
    # 4. Check transaction referential integrity
    if invalid_transactions > 0:
        errors.append(f"{invalid_transactions} transactions use invalid card ownership")
    
    # 5. Check primary card assignment
    primary_counts = {}
    for row in ownership:
        user_id = row["user_id"]
        if user_id not in primary_counts:
            primary_counts[user_id] = 0
        if row["is_primary"].lower() == "true":
            primary_counts[user_id] += 1
    
    invalid_primary = [u for u, c in primary_counts.items() if c != 1]
    if invalid_primary:
        errors.append(f"{len(invalid_primary)} users don't have exactly one primary card")
    
    # Print results
    print("\n" + "="*50)
    print("VALIDATION RESULTS")
    print("="*50)
    
    print(f"\nData Summary:")
    print(f"- Users: {len(users):,}")
    print(f"- Card ownerships: {len(ownership):,}")
    print(f"- Transactions: {transaction_count:,}")
    print(f"- Avg cards per user: {len(ownership) / len(users):.1f}")
    print(f"- Avg transactions per user: {transaction_count / len(users):.1f}")
    
    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for error in errors:
            print(f"  - {error}")
    
    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"  - {warning}")
    
    if not errors and not warnings:
        print("\n✅ All validation checks passed!")
    
    return errors, warnings


if __name__ == "__main__":
    errors, warnings = validate_data()
    exit(1 if errors else 0)