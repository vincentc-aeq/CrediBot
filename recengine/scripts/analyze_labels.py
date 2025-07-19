#!/usr/bin/env python3
"""
Analyze and log label distribution for trigger classifier training.
"""

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

DATA_DIR = Path(__file__).parent.parent / "data"


def load_labeled_data(filename: str) -> List[Dict]:
    """Load labeled transaction data."""
    filepath = DATA_DIR / filename
    
    if not filepath.exists():
        print(f"Labeled data file not found: {filepath}")
        return []
    
    labeled_data = []
    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            row["amount"] = float(row["amount"])
            row["trigger_label"] = int(row["trigger_label"])
            row["reward_gap_pct"] = float(row["reward_gap_pct"])
            row["extra_reward_amt"] = float(row["extra_reward_amt"])
            row["num_better_cards"] = int(row["num_better_cards"])
            labeled_data.append(row)
    
    return labeled_data


def analyze_label_distribution(labeled_data: List[Dict]) -> Dict:
    """Comprehensive analysis of label distribution."""
    
    if not labeled_data:
        return {}
    
    analysis = {
        "total_samples": len(labeled_data),
        "label_counts": {"0": 0, "1": 0},
        "label_percentages": {},
        "category_breakdown": defaultdict(lambda: {"total": 0, "positive": 0}),
        "amount_ranges": defaultdict(lambda: {"total": 0, "positive": 0}),
        "reward_gap_ranges": defaultdict(lambda: {"total": 0, "positive": 0}),
        "statistics": {}
    }
    
    # Collect data for analysis
    amounts = []
    reward_gaps = []
    extra_rewards = []
    positive_amounts = []
    positive_gaps = []
    
    for sample in labeled_data:
        label = str(sample["trigger_label"])
        analysis["label_counts"][label] += 1
        
        category = sample["category"]
        analysis["category_breakdown"][category]["total"] += 1
        
        amount = sample["amount"]
        amounts.append(amount)
        
        reward_gap = sample["reward_gap_pct"]
        reward_gaps.append(reward_gap)
        
        extra_reward = sample["extra_reward_amt"]
        extra_rewards.append(extra_reward)
        
        if sample["trigger_label"] == 1:
            analysis["category_breakdown"][category]["positive"] += 1
            positive_amounts.append(amount)
            positive_gaps.append(reward_gap)
            
            # Amount ranges for positive samples
            if amount < 25:
                range_key = "$0-25"
            elif amount < 50:
                range_key = "$25-50"
            elif amount < 100:
                range_key = "$50-100"
            elif amount < 200:
                range_key = "$100-200"
            else:
                range_key = "$200+"
            
            analysis["amount_ranges"][range_key]["positive"] += 1
        
        # Total amount ranges
        if amount < 25:
            range_key = "$0-25"
        elif amount < 50:
            range_key = "$25-50"
        elif amount < 100:
            range_key = "$50-100"
        elif amount < 200:
            range_key = "$100-200"
        else:
            range_key = "$200+"
        
        analysis["amount_ranges"][range_key]["total"] += 1
        
        # Reward gap ranges
        if reward_gap < 1:
            gap_range = "0-1%"
        elif reward_gap < 5:
            gap_range = "1-5%"
        elif reward_gap < 10:
            gap_range = "5-10%"
        elif reward_gap < 25:
            gap_range = "10-25%"
        else:
            gap_range = "25%+"
        
        analysis["reward_gap_ranges"][gap_range]["total"] += 1
        if sample["trigger_label"] == 1:
            analysis["reward_gap_ranges"][gap_range]["positive"] += 1
    
    # Calculate percentages
    total = analysis["total_samples"]
    for label, count in analysis["label_counts"].items():
        analysis["label_percentages"][label] = (count / total) * 100 if total > 0 else 0
    
    # Calculate statistics
    analysis["statistics"] = {
        "amount_stats": {
            "min": min(amounts) if amounts else 0,
            "max": max(amounts) if amounts else 0,
            "avg": sum(amounts) / len(amounts) if amounts else 0,
            "positive_avg": sum(positive_amounts) / len(positive_amounts) if positive_amounts else 0
        },
        "reward_gap_stats": {
            "min": min(reward_gaps) if reward_gaps else 0,
            "max": max(reward_gaps) if reward_gaps else 0,
            "avg": sum(reward_gaps) / len(reward_gaps) if reward_gaps else 0,
            "positive_avg": sum(positive_gaps) / len(positive_gaps) if positive_gaps else 0
        },
        "extra_reward_stats": {
            "min": min(extra_rewards) if extra_rewards else 0,
            "max": max(extra_rewards) if extra_rewards else 0,
            "avg": sum(extra_rewards) / len(extra_rewards) if extra_rewards else 0
        }
    }
    
    return analysis


def print_analysis_report(analysis: Dict) -> None:
    """Print detailed analysis report."""
    
    print("=" * 80)
    print("TRIGGER LABEL DISTRIBUTION ANALYSIS")
    print("=" * 80)
    
    # Overall distribution
    print(f"\n📊 OVERALL DISTRIBUTION")
    print(f"Total samples: {analysis['total_samples']:,}")
    for label, count in analysis['label_counts'].items():
        percentage = analysis['label_percentages'][label]
        label_name = "POSITIVE (trigger=1)" if label == "1" else "NEGATIVE (trigger=0)"
        print(f"{label_name}: {count:,} ({percentage:.1f}%)")
    
    # Check for class imbalance
    pos_pct = analysis['label_percentages'].get('1', 0)
    if pos_pct < 5:
        print("⚠️  WARNING: Very low positive class ratio - consider adjusting thresholds")
    elif pos_pct > 80:
        print("⚠️  WARNING: Very high positive class ratio - consider raising thresholds")
    elif 20 <= pos_pct <= 60:
        print("✅ Good class balance for ML training")
    
    # Statistics
    stats = analysis['statistics']
    print(f"\n📈 TRANSACTION STATISTICS")
    print(f"Amount range: ${stats['amount_stats']['min']:.2f} - ${stats['amount_stats']['max']:.2f}")
    print(f"Average amount: ${stats['amount_stats']['avg']:.2f}")
    print(f"Average amount (positive samples): ${stats['amount_stats']['positive_avg']:.2f}")
    
    print(f"\nReward gap range: {stats['reward_gap_stats']['min']:.1f}% - {stats['reward_gap_stats']['max']:.1f}%")
    print(f"Average reward gap: {stats['reward_gap_stats']['avg']:.1f}%")
    print(f"Average reward gap (positive samples): {stats['reward_gap_stats']['positive_avg']:.1f}%")
    
    # Category breakdown
    print(f"\n🏷️  CATEGORY BREAKDOWN (Top 10)")
    category_items = list(analysis['category_breakdown'].items())
    category_items.sort(key=lambda x: x[1]['total'], reverse=True)
    
    for category, data in category_items[:10]:
        total = data['total']
        positive = data['positive']
        rate = (positive / total * 100) if total > 0 else 0
        print(f"{category:15}: {total:6,} total | {positive:5,} positive ({rate:5.1f}%)")
    
    # Amount ranges
    print(f"\n💰 AMOUNT RANGES")
    for range_key, data in sorted(analysis['amount_ranges'].items()):
        total = data['total']
        positive = data['positive']
        rate = (positive / total * 100) if total > 0 else 0
        print(f"{range_key:10}: {total:6,} total | {positive:5,} positive ({rate:5.1f}%)")
    
    # Reward gap ranges
    print(f"\n📊 REWARD GAP RANGES")
    for gap_range, data in sorted(analysis['reward_gap_ranges'].items()):
        total = data['total']
        positive = data['positive']
        rate = (positive / total * 100) if total > 0 else 0
        print(f"{gap_range:10}: {total:6,} total | {positive:5,} positive ({rate:5.1f}%)")


def validate_labels(labeled_data: List[Dict]) -> Dict:
    """Validate label quality and consistency."""
    
    validation_results = {
        "total_samples": len(labeled_data),
        "validation_errors": [],
        "warnings": [],
        "quality_metrics": {}
    }
    
    if not labeled_data:
        validation_results["validation_errors"].append("No labeled data found")
        return validation_results
    
    # Check required fields
    required_fields = [
        "trigger_label", "reward_gap_pct", "extra_reward_amt", 
        "amount", "category", "user_id"
    ]
    
    missing_fields = []
    for field in required_fields:
        if field not in labeled_data[0]:
            missing_fields.append(field)
    
    if missing_fields:
        validation_results["validation_errors"].append(f"Missing fields: {missing_fields}")
    
    # Validate data quality
    invalid_labels = 0
    negative_rewards = 0
    extreme_gaps = 0
    
    for i, sample in enumerate(labeled_data):
        # Check label values
        if sample["trigger_label"] not in [0, 1]:
            invalid_labels += 1
        
        # Check for negative extra rewards in positive samples
        if sample["trigger_label"] == 1 and sample["extra_reward_amt"] < 0:
            negative_rewards += 1
        
        # Check for extreme reward gaps
        if abs(sample["reward_gap_pct"]) > 200:
            extreme_gaps += 1
    
    if invalid_labels > 0:
        validation_results["validation_errors"].append(f"{invalid_labels} samples have invalid labels")
    
    if negative_rewards > 0:
        validation_results["warnings"].append(f"{negative_rewards} positive samples have negative extra rewards")
    
    if extreme_gaps > 0:
        validation_results["warnings"].append(f"{extreme_gaps} samples have extreme reward gaps (>200%)")
    
    # Quality metrics
    positive_count = sum(1 for s in labeled_data if s["trigger_label"] == 1)
    validation_results["quality_metrics"] = {
        "class_balance": positive_count / len(labeled_data) if labeled_data else 0,
        "data_completeness": 1.0 - (len(missing_fields) / len(required_fields)),
        "label_consistency": 1.0 - (invalid_labels / len(labeled_data)) if labeled_data else 0
    }
    
    return validation_results


def print_validation_report(validation: Dict) -> None:
    """Print validation report."""
    
    print("\n" + "=" * 80)
    print("LABEL VALIDATION REPORT")
    print("=" * 80)
    
    print(f"Total samples validated: {validation['total_samples']:,}")
    
    # Errors
    if validation['validation_errors']:
        print(f"\n❌ VALIDATION ERRORS:")
        for error in validation['validation_errors']:
            print(f"  - {error}")
    else:
        print(f"\n✅ No validation errors found")
    
    # Warnings
    if validation['warnings']:
        print(f"\n⚠️  WARNINGS:")
        for warning in validation['warnings']:
            print(f"  - {warning}")
    
    # Quality metrics
    metrics = validation['quality_metrics']
    print(f"\n📊 QUALITY METRICS:")
    print(f"Class balance: {metrics.get('class_balance', 0):.3f}")
    print(f"Data completeness: {metrics.get('data_completeness', 0):.3f}")
    print(f"Label consistency: {metrics.get('label_consistency', 0):.3f}")
    
    # Overall quality score
    avg_quality = sum(metrics.values()) / len(metrics) if metrics else 0
    print(f"Overall quality score: {avg_quality:.3f}")
    
    if avg_quality >= 0.9:
        print("✅ Excellent label quality")
    elif avg_quality >= 0.7:
        print("✅ Good label quality")
    elif avg_quality >= 0.5:
        print("⚠️  Fair label quality - consider improvements")
    else:
        print("❌ Poor label quality - review labeling process")


def save_analysis_report(analysis: Dict, validation: Dict, output_file: str) -> None:
    """Save analysis report to JSON file."""
    
    report = {
        "analysis": analysis,
        "validation": validation,
        "generation_timestamp": "2024-07-19T00:00:00"  # Would use actual timestamp
    }
    
    output_path = DATA_DIR / output_file
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Analysis report saved to: {output_path}")


def main():
    """Main analysis function."""
    parser = argparse.ArgumentParser(description="Analyze trigger label distribution")
    parser.add_argument("--input", type=str, default="trigger_labels_v2.csv",
                       help="Input labeled data file")
    parser.add_argument("--output", type=str, default="label_analysis_report.json",
                       help="Output analysis report file")
    parser.add_argument("--verbose", action="store_true",
                       help="Print detailed analysis")
    
    args = parser.parse_args()
    
    print("Loading labeled data...")
    labeled_data = load_labeled_data(args.input)
    
    if not labeled_data:
        print("No labeled data found!")
        return 1
    
    print(f"Loaded {len(labeled_data):,} labeled samples")
    
    # Perform analysis
    print("\nAnalyzing label distribution...")
    analysis = analyze_label_distribution(labeled_data)
    
    # Validate labels
    print("Validating label quality...")
    validation = validate_labels(labeled_data)
    
    # Print reports
    if args.verbose:
        print_analysis_report(analysis)
        print_validation_report(validation)
    else:
        # Summary only
        total = analysis['total_samples']
        pos_count = analysis['label_counts']['1']
        pos_pct = analysis['label_percentages']['1']
        
        print(f"\n📊 SUMMARY:")
        print(f"Total samples: {total:,}")
        print(f"Positive labels: {pos_count:,} ({pos_pct:.1f}%)")
        print(f"Quality score: {sum(validation['quality_metrics'].values()) / len(validation['quality_metrics']):.3f}")
    
    # Save report
    save_analysis_report(analysis, validation, args.output)
    
    print("\n✅ Label analysis complete!")
    return 0


if __name__ == "__main__":
    exit(main())