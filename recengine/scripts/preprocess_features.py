#!/usr/bin/env python3
"""
Preprocess raw data and compute features for Feast feature store.
"""

import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
FEATURES_DIR = Path(__file__).parent.parent / "features"


def load_transactions() -> List[Dict]:
    """Load transaction data."""
    transactions = []
    with open(DATA_DIR / "transactions.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["amount"] = float(row["amount"])
            row["timestamp"] = datetime.fromisoformat(row["timestamp"])
            transactions.append(row)
    return transactions


def load_users() -> List[Dict]:
    """Load user data."""
    users = []
    with open(DATA_DIR / "users.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["age"] = int(row["age"])
            row["income"] = float(row["income"])
            row["credit_score"] = int(row["credit_score"])
            row["created_at"] = datetime.fromisoformat(row["created_at"])
            users.append(row)
    return users


def compute_user_stats_90d(transactions: List[Dict]) -> List[Dict]:
    """Compute user statistics over 90 days."""
    # Group transactions by user
    user_transactions = {}
    for txn in transactions:
        user_id = txn["user_id"]
        if user_id not in user_transactions:
            user_transactions[user_id] = []
        user_transactions[user_id].append(txn)
    
    # Compute statistics for each user
    user_stats = []
    current_time = datetime.now()
    cutoff_date = current_time - timedelta(days=90)
    
    for user_id, txns in user_transactions.items():
        # Filter to last 90 days
        recent_txns = [t for t in txns if t["timestamp"] >= cutoff_date]
        
        if not recent_txns:
            continue
        
        amounts = [t["amount"] for t in recent_txns]
        categories = [t["category"] for t in recent_txns]
        
        # Calculate statistics
        stats = {
            "user_id": user_id,
            "user_avg_amount": sum(amounts) / len(amounts),
            "user_std_amount": 0.0,  # Simplified
            "user_transaction_count": len(recent_txns),
            "user_total_spending": sum(amounts),
            "user_days_since_last_txn": (current_time - max(t["timestamp"] for t in recent_txns)).days,
            "user_avg_txn_per_day": len(recent_txns) / 90,
            "user_unique_categories": len(set(categories)),
            "user_max_amount": max(amounts),
            "user_min_amount": min(amounts),
            "timestamp": current_time.isoformat(),
        }
        
        # Calculate standard deviation
        if len(amounts) > 1:
            mean = stats["user_avg_amount"]
            variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
            stats["user_std_amount"] = variance ** 0.5
        
        user_stats.append(stats)
    
    return user_stats


def compute_category_stats_global(transactions: List[Dict]) -> List[Dict]:
    """Compute global category statistics."""
    # Group by category
    category_amounts = {}
    category_counts = {}
    
    for txn in transactions:
        category = txn["category"]
        amount = txn["amount"]
        
        if category not in category_amounts:
            category_amounts[category] = []
            category_counts[category] = 0
        
        category_amounts[category].append(amount)
        category_counts[category] += 1
    
    # Compute averages
    stats = {
        "timestamp": datetime.now().isoformat(),
    }
    
    # Add category-specific stats
    for category in ["groceries", "dining", "gas", "travel", "entertainment", 
                    "online_shopping", "utilities", "healthcare", "streaming", "other"]:
        if category in category_amounts and category_amounts[category]:
            avg_amount = sum(category_amounts[category]) / len(category_amounts[category])
            count = category_counts[category]
        else:
            avg_amount = 0.0
            count = 0
        
        stats[f"category_avg_amount_{category}"] = avg_amount
        stats[f"category_count_{category}"] = count
    
    return [stats]  # Global stats as single row


def compute_user_profile_features(users: List[Dict]) -> List[Dict]:
    """Compute user profile features."""
    current_time = datetime.now()
    
    user_features = []
    for user in users:
        features = {
            "user_id": user["user_id"],
            "user_age": user["age"],
            "user_income": user["income"], 
            "user_credit_score": user["credit_score"],
            "user_account_age_days": (current_time - user["created_at"]).days,
            "timestamp": current_time.isoformat(),
        }
        user_features.append(features)
    
    return user_features


def save_features_to_csv(features: List[Dict], filename: str) -> None:
    """Save computed features to CSV."""
    if not features:
        print(f"No features to save for {filename}")
        return
    
    output_path = DATA_DIR / filename
    fieldnames = features[0].keys()
    
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(features)
    
    print(f"Saved {len(features)} feature rows to {output_path}")


def main():
    """Main preprocessing pipeline."""
    print("Starting feature preprocessing...")
    
    # Load raw data
    print("Loading transactions...")
    transactions = load_transactions()
    print(f"Loaded {len(transactions)} transactions")
    
    print("Loading users...")
    users = load_users()
    print(f"Loaded {len(users)} users")
    
    # Compute features
    print("Computing user stats (90d)...")
    user_stats = compute_user_stats_90d(transactions)
    save_features_to_csv(user_stats, "user_stats_90d_features.csv")
    
    print("Computing category stats (global)...")
    category_stats = compute_category_stats_global(transactions)
    save_features_to_csv(category_stats, "category_stats_global_features.csv")
    
    print("Computing user profile features...")
    user_profile_features = compute_user_profile_features(users)
    save_features_to_csv(user_profile_features, "user_profile_features.csv")
    
    print("✅ Feature preprocessing complete!")
    
    # Summary
    print(f"\nFeature Summary:")
    print(f"- User stats (90d): {len(user_stats)} users")
    print(f"- Category stats: {len(category_stats)} global stats")
    print(f"- User profiles: {len(user_profile_features)} users")


if __name__ == "__main__":
    main()