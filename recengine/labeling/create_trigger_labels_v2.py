#!/usr/bin/env python3
"""
Improved trigger label generation with more realistic scenarios.
"""

import argparse
import csv
import random
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

from utils.reward_calc import RewardCalculator

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
random.seed(42)  # For reproducible results


def load_transactions() -> List[Dict]:
    """Load transaction data."""
    transactions = []
    with open(DATA_DIR / "transactions.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["amount"] = float(row["amount"])
            transactions.append(row)
    return transactions


def load_card_ownership() -> Dict[str, List[str]]:
    """Load user card ownership mapping."""
    ownership = {}
    with open(DATA_DIR / "card_ownership.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_id = row["user_id"]
            card_id = row["card_id"]
            
            if user_id not in ownership:
                ownership[user_id] = []
            ownership[user_id].append(card_id)
    
    return ownership


def simulate_realistic_ownership(original_ownership: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Simulate more realistic card ownership where users have suboptimal cards."""
    
    # List of "basic" cards that users might start with
    basic_cards = [
        "citi_double_cash_card",
        "chase_freedom_unlimited", 
        "capital_one_quicksilver",
        "wells_fargo_active_cash_card",
        "discover_it_cash_back"
    ]
    
    realistic_ownership = {}
    
    for user_id, cards in original_ownership.items():
        # 70% chance user has only 1-2 basic cards instead of optimal portfolio
        if random.random() < 0.7:
            num_cards = random.choice([1, 2])
            realistic_ownership[user_id] = random.sample(basic_cards, num_cards)
        else:
            # 30% keep original (more optimal) cards
            realistic_ownership[user_id] = cards
    
    return realistic_ownership


def create_trigger_labels_v2(
    transactions: List[Dict],
    card_ownership: Dict[str, List[str]],
    gap_thr: float = 0.01,
    min_extra_reward: float = 0.05
) -> List[Dict]:
    """Create trigger labels with improved logic."""
    
    print(f"Creating trigger labels with gap_thr={gap_thr}, min_extra_reward=${min_extra_reward}")
    
    calculator = RewardCalculator()
    labeled_transactions = []
    
    # Use realistic ownership
    realistic_ownership = simulate_realistic_ownership(card_ownership)
    
    # Statistics tracking
    total_transactions = len(transactions)
    positive_labels = 0
    negative_labels = 0
    
    for i, txn in enumerate(transactions):
        if i % 10000 == 0:
            print(f"Processing transaction {i+1}/{total_transactions}")
        
        user_id = txn["user_id"]
        amount = txn["amount"]
        category = txn["category"]
        
        # Use realistic card ownership
        user_cards = realistic_ownership.get(user_id, [])
        
        # Simulate current card for transaction (pick randomly from user's cards)
        current_card_id = random.choice(user_cards) if user_cards else None
        
        # Analyze transaction rewards
        analysis = calculator.analyze_transaction(amount, category, current_card_id)
        
        # More lenient triggering criteria
        trigger_label = 0
        
        # Criterion 1: Reward gap (lowered threshold)
        reward_gap_significant = analysis.reward_gap_pct >= (gap_thr * 100)
        
        # Criterion 2: Minimum extra reward (lowered threshold)
        extra_reward_significant = analysis.extra_reward_amt >= min_extra_reward
        
        # Criterion 3: User doesn't have the best card
        best_card_id = analysis.best_card_reward.card_id
        user_has_best_card = best_card_id in user_cards
        
        # Criterion 4: Transaction amount threshold (lowered)
        amount_significant = amount >= 5.0
        
        # Criterion 5: Category-specific triggers (dining, travel, groceries are high-value)
        high_value_categories = ["dining", "travel", "groceries", "gas"]
        is_high_value_category = category in high_value_categories
        
        # More complex triggering logic
        should_trigger = False
        
        # High-value scenario: significant gap + high-value category
        if (reward_gap_significant and is_high_value_category and 
            not user_has_best_card and amount_significant):
            should_trigger = True
        
        # Medium-value scenario: large extra reward regardless of category
        elif (analysis.extra_reward_amt >= 0.20 and not user_has_best_card and 
              amount >= 20.0):
            should_trigger = True
        
        # Low-threshold scenario: any improvement for large transactions
        elif (analysis.extra_reward_amt >= 0.02 and amount >= 100.0 and 
              not user_has_best_card):
            should_trigger = True
        
        if should_trigger:
            trigger_label = 1
            positive_labels += 1
        else:
            negative_labels += 1
        
        # Create labeled record
        labeled_txn = {
            # Original transaction data
            "transaction_id": txn["transaction_id"],
            "user_id": user_id,
            "amount": amount,
            "category": category,
            "timestamp": txn["timestamp"],
            "current_card_id": current_card_id,
            
            # Computed reward features
            "best_rate": analysis.best_rate,
            "reward_gap_pct": analysis.reward_gap_pct,
            "extra_reward_amt": analysis.extra_reward_amt,
            "num_better_cards": analysis.num_better_cards,
            "best_card_id": analysis.best_card_reward.card_id,
            "current_card_reward": analysis.current_card_reward.reward_amount if analysis.current_card_reward else 0.0,
            "best_card_reward": analysis.best_card_reward.reward_amount,
            
            # Decision features
            "is_high_value_category": is_high_value_category,
            "reward_gap_significant": reward_gap_significant,
            "extra_reward_significant": extra_reward_significant,
            "user_has_best_card": user_has_best_card,
            "amount_significant": amount_significant,
            
            # Label
            "trigger_label": trigger_label,
            
            # Metadata
            "labeling_timestamp": datetime.now().isoformat(),
            "gap_threshold_used": gap_thr,
            "min_reward_threshold_used": min_extra_reward,
        }
        
        labeled_transactions.append(labeled_txn)
    
    # Print label distribution
    print(f"\nLabel Distribution:")
    print(f"- Total transactions: {total_transactions:,}")
    print(f"- Positive labels (trigger=1): {positive_labels:,} ({positive_labels/total_transactions*100:.1f}%)")
    print(f"- Negative labels (trigger=0): {negative_labels:,} ({negative_labels/total_transactions*100:.1f}%)")
    
    return labeled_transactions


def main():
    """Main labeling function."""
    parser = argparse.ArgumentParser(description="Create improved trigger labels")
    parser.add_argument("--gap-thr", type=float, default=0.01,
                       help="Reward gap threshold")
    parser.add_argument("--min-reward", type=float, default=0.05,
                       help="Minimum extra reward amount")
    parser.add_argument("--output", type=str, default="trigger_labels_v2.csv",
                       help="Output filename")
    parser.add_argument("--sample", type=int, help="Sample N transactions")
    
    args = parser.parse_args()
    
    print("Loading transaction data...")
    transactions = load_transactions()
    
    if args.sample:
        print(f"Sampling {args.sample} transactions...")
        transactions = transactions[:args.sample]
    
    print("Loading card ownership data...")
    card_ownership = load_card_ownership()
    
    print("Creating improved trigger labels...")
    labeled_transactions = create_trigger_labels_v2(
        transactions,
        card_ownership,
        gap_thr=args.gap_thr,
        min_extra_reward=args.min_reward
    )
    
    # Save labeled data
    output_path = DATA_DIR / args.output
    if labeled_transactions:
        fieldnames = labeled_transactions[0].keys()
        
        with open(output_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(labeled_transactions)
    
    print(f"Saved {len(labeled_transactions)} labeled transactions to {output_path}")
    print("\n✅ Improved trigger label generation complete!")


if __name__ == "__main__":
    main()