#!/usr/bin/env python3
"""
Create trigger labels for training the trigger classifier model.

This script analyzes transactions and determines when a recommendation
should be triggered based on reward gap thresholds.
"""

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

from utils.reward_calc import RewardCalculator

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
LABELING_DIR = Path(__file__).parent


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


def create_trigger_labels(
    transactions: List[Dict],
    card_ownership: Dict[str, List[str]],
    gap_thr: float = 0.01,
    min_extra_reward: float = 0.10
) -> List[Dict]:
    """Create trigger labels for transactions."""
    
    print(f"Creating trigger labels with gap_thr={gap_thr}, min_extra_reward=${min_extra_reward}")
    
    calculator = RewardCalculator()
    labeled_transactions = []
    
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
        current_card_id = txn.get("card_id")
        
        # Get user's current cards
        user_cards = card_ownership.get(user_id, [])
        
        # Analyze transaction rewards
        analysis = calculator.analyze_transaction(amount, category, current_card_id)
        
        # Determine trigger label based on criteria
        trigger_label = 0  # Default: no recommendation
        
        # Criterion 1: Reward gap percentage threshold
        reward_gap_significant = analysis.reward_gap_pct >= (gap_thr * 100)
        
        # Criterion 2: Minimum absolute extra reward
        extra_reward_significant = analysis.extra_reward_amt >= min_extra_reward
        
        # Criterion 3: User doesn't already have the best card
        best_card_id = analysis.best_card_reward.card_id
        user_has_best_card = best_card_id in user_cards
        
        # Criterion 4: Minimum transaction amount (avoid tiny transactions)
        min_transaction_amount = 10.0
        amount_significant = amount >= min_transaction_amount
        
        # Trigger if all criteria are met
        if (reward_gap_significant and 
            extra_reward_significant and 
            not user_has_best_card and 
            amount_significant):
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
            
            # Label and features for ML
            "trigger_label": trigger_label,
            "reward_gap_significant": reward_gap_significant,
            "extra_reward_significant": extra_reward_significant,
            "user_has_best_card": user_has_best_card,
            "amount_significant": amount_significant,
            
            # Additional context
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


def save_labeled_data(labeled_transactions: List[Dict], filename: str) -> None:
    """Save labeled transactions to file."""
    output_path = DATA_DIR / filename
    
    if labeled_transactions:
        fieldnames = labeled_transactions[0].keys()
        
        with open(output_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(labeled_transactions)
    
    print(f"Saved {len(labeled_transactions)} labeled transactions to {output_path}")


def analyze_label_distribution(labeled_transactions: List[Dict]) -> Dict:
    """Analyze the distribution of labels and features."""
    
    stats = {
        "total_count": len(labeled_transactions),
        "positive_count": 0,
        "negative_count": 0,
        "categories": {},
        "amounts": {"min": float("inf"), "max": 0, "avg": 0},
        "reward_gaps": {"min": float("inf"), "max": 0, "avg": 0},
        "extra_rewards": {"min": float("inf"), "max": 0, "avg": 0},
    }
    
    total_amount = 0
    total_gap = 0
    total_extra = 0
    
    for txn in labeled_transactions:
        # Count labels
        if txn["trigger_label"] == 1:
            stats["positive_count"] += 1
        else:
            stats["negative_count"] += 1
        
        # Category distribution
        category = txn["category"]
        if category not in stats["categories"]:
            stats["categories"][category] = {"total": 0, "positive": 0}
        stats["categories"][category]["total"] += 1
        if txn["trigger_label"] == 1:
            stats["categories"][category]["positive"] += 1
        
        # Amount statistics
        amount = txn["amount"]
        stats["amounts"]["min"] = min(stats["amounts"]["min"], amount)
        stats["amounts"]["max"] = max(stats["amounts"]["max"], amount)
        total_amount += amount
        
        # Reward gap statistics
        gap = txn["reward_gap_pct"]
        stats["reward_gaps"]["min"] = min(stats["reward_gaps"]["min"], gap)
        stats["reward_gaps"]["max"] = max(stats["reward_gaps"]["max"], gap)
        total_gap += gap
        
        # Extra reward statistics
        extra = txn["extra_reward_amt"]
        stats["extra_rewards"]["min"] = min(stats["extra_rewards"]["min"], extra)
        stats["extra_rewards"]["max"] = max(stats["extra_rewards"]["max"], extra)
        total_extra += extra
    
    # Calculate averages
    count = stats["total_count"]
    stats["amounts"]["avg"] = total_amount / count if count > 0 else 0
    stats["reward_gaps"]["avg"] = total_gap / count if count > 0 else 0
    stats["extra_rewards"]["avg"] = total_extra / count if count > 0 else 0
    
    return stats


def print_detailed_stats(stats: Dict) -> None:
    """Print detailed statistics about the labeled data."""
    
    print(f"\n" + "="*60)
    print("DETAILED LABEL ANALYSIS")
    print("="*60)
    
    total = stats["total_count"]
    positive = stats["positive_count"]
    negative = stats["negative_count"]
    
    print(f"\nOverall Distribution:")
    print(f"- Total: {total:,}")
    print(f"- Positive: {positive:,} ({positive/total*100:.1f}%)")
    print(f"- Negative: {negative:,} ({negative/total*100:.1f}%)")
    
    print(f"\nTransaction Amounts:")
    print(f"- Min: ${stats['amounts']['min']:.2f}")
    print(f"- Max: ${stats['amounts']['max']:.2f}")
    print(f"- Avg: ${stats['amounts']['avg']:.2f}")
    
    print(f"\nReward Gaps:")
    print(f"- Min: {stats['reward_gaps']['min']:.1f}%")
    print(f"- Max: {stats['reward_gaps']['max']:.1f}%")
    print(f"- Avg: {stats['reward_gaps']['avg']:.1f}%")
    
    print(f"\nExtra Rewards:")
    print(f"- Min: ${stats['extra_rewards']['min']:.2f}")
    print(f"- Max: ${stats['extra_rewards']['max']:.2f}")
    print(f"- Avg: ${stats['extra_rewards']['avg']:.2f}")
    
    print(f"\nCategory Distribution (Top 10):")
    category_items = list(stats["categories"].items())
    category_items.sort(key=lambda x: x[1]["total"], reverse=True)
    
    for category, data in category_items[:10]:
        total_cat = data["total"]
        positive_cat = data["positive"]
        rate = positive_cat / total_cat * 100 if total_cat > 0 else 0
        print(f"- {category:15}: {total_cat:6,} total, {positive_cat:5,} positive ({rate:4.1f}%)")


def main():
    """Main labeling function."""
    parser = argparse.ArgumentParser(description="Create trigger labels for ML training")
    parser.add_argument("--gap-thr", type=float, default=0.01, 
                       help="Reward gap threshold (default: 0.01 = 1%)")
    parser.add_argument("--min-reward", type=float, default=0.10,
                       help="Minimum extra reward amount (default: $0.10)")
    parser.add_argument("--output", type=str, default="trigger_labels.csv",
                       help="Output filename")
    parser.add_argument("--sample", type=int, help="Sample N transactions for testing")
    
    args = parser.parse_args()
    
    print("Loading transaction data...")
    transactions = load_transactions()
    
    if args.sample:
        print(f"Sampling {args.sample} transactions for testing...")
        transactions = transactions[:args.sample]
    
    print("Loading card ownership data...")
    card_ownership = load_card_ownership()
    
    print("Creating trigger labels...")
    labeled_transactions = create_trigger_labels(
        transactions, 
        card_ownership, 
        gap_thr=args.gap_thr,
        min_extra_reward=args.min_reward
    )
    
    # Save labeled data
    save_labeled_data(labeled_transactions, args.output)
    
    # Analyze and print statistics
    stats = analyze_label_distribution(labeled_transactions)
    print_detailed_stats(stats)
    
    print("\n✅ Trigger label generation complete!")


if __name__ == "__main__":
    main()