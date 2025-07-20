"""
Reward calculation utilities for RecEngine.

This module computes reward rates, gaps, and potential benefits
for credit card recommendations based on transaction data and card catalog.
"""

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Data directory
DATA_DIR = Path(__file__).parent.parent.parent / "data"


@dataclass
class CardReward:
    """Represents reward calculation for a specific card and transaction."""
    card_id: str
    card_name: str
    base_rate: float
    bonus_rate: float
    applicable_rate: float
    reward_amount: float
    annual_fee: float
    net_benefit: float
    point_value_cents: float
    reward_type: str


@dataclass
class RewardAnalysis:
    """Complete reward analysis for a transaction."""
    transaction_amount: float
    transaction_category: str
    current_card_reward: Optional[CardReward]
    best_card_reward: CardReward
    best_rate: float
    reward_gap_pct: float
    extra_reward_amt: float
    num_better_cards: int
    all_card_rewards: List[CardReward]


class RewardCalculator:
    """Calculator for credit card rewards and gaps."""
    
    def __init__(self, card_catalog_path: Optional[str] = None):
        """Initialize with card catalog."""
        if card_catalog_path is None:
            card_catalog_path = DATA_DIR / "card_catalog.csv"
        
        self.cards = self._load_card_catalog(card_catalog_path)
        
    def _load_card_catalog(self, catalog_path: Path) -> List[Dict]:
        """Load card catalog from CSV."""
        cards = []
        with open(catalog_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Parse bonus categories JSON
                try:
                    row["bonus_categories"] = json.loads(row["bonus_categories"])
                except (json.JSONDecodeError, KeyError):
                    row["bonus_categories"] = {}
                
                # Convert numeric fields
                row["annual_fee"] = float(row["annual_fee"])
                row["base_rate_pct"] = float(row["base_rate_pct"])
                row["point_value_cent"] = float(row["point_value_cent"])
                row["bonus_cap_amt"] = float(row["bonus_cap_amt"])
                
                cards.append(row)
        
        return cards
    
    def get_reward_rate_for_category(self, card: Dict, category: str) -> float:
        """Get reward rate for a specific category."""
        bonus_categories = card["bonus_categories"]
        
        # Check for exact category match
        if category in bonus_categories:
            return bonus_categories[category]
        
        # Check for special cases
        if category in ["online_shopping", "shopping"] and "shopping" in bonus_categories:
            return bonus_categories["shopping"]
        
        if category == "rotating" and "rotating" in bonus_categories:
            return bonus_categories["rotating"]
        
        # Return base rate for other categories
        return card["base_rate_pct"]
    
    def calculate_reward_amount(
        self, 
        card: Dict, 
        amount: float, 
        category: str
    ) -> CardReward:
        """Calculate reward amount for a transaction."""
        base_rate = card["base_rate_pct"]
        bonus_rate = self.get_reward_rate_for_category(card, category)
        applicable_rate = bonus_rate if bonus_rate > base_rate else base_rate
        
        # Calculate raw reward
        # applicable_rate is already in points per dollar, not percentage
        if card["reward_type"] in ["points", "miles"]:
            reward_points = amount * applicable_rate  # e.g. $1000 * 2 points/$ = 2000 points
        else:  # cashback
            reward_points = amount * (applicable_rate / 100)  # e.g. $1000 * 2% = $20
        
        # Apply caps if applicable
        bonus_cap = card["bonus_cap_amt"]
        if bonus_cap > 0 and bonus_rate > base_rate:
            # Simplified cap logic - in reality this would track cumulative spending
            max_bonus_points = bonus_cap * (bonus_rate / 100)
            if reward_points > max_bonus_points:
                excess = reward_points - max_bonus_points
                reward_points = max_bonus_points + (excess * base_rate / bonus_rate)
        
        # Convert to cash value
        point_value = card["point_value_cent"] / 100  # Convert cents to dollars
        reward_amount = reward_points * point_value
        
        # Calculate net benefit (reward minus annual fee impact)
        # Assume user spends $1000/month, so annual fee impact per transaction
        monthly_spending = 1000
        annual_transactions = 12 * monthly_spending / amount if amount > 0 else 1
        annual_fee_per_txn = card["annual_fee"] / annual_transactions if annual_transactions > 0 else 0
        net_benefit = reward_amount - annual_fee_per_txn
        
        return CardReward(
            card_id=card["card_id"],
            card_name=card.get("issuer", "Unknown") + " " + card["card_id"].replace("_", " ").title(),
            base_rate=base_rate,
            bonus_rate=bonus_rate,
            applicable_rate=applicable_rate,
            reward_amount=reward_amount,
            annual_fee=card["annual_fee"],
            net_benefit=net_benefit,
            point_value_cents=card["point_value_cent"],
            reward_type=card["reward_type"]
        )
    
    def analyze_transaction(
        self, 
        amount: float, 
        category: str, 
        current_card_id: Optional[str] = None
    ) -> RewardAnalysis:
        """Analyze rewards for a transaction across all cards."""
        
        # Calculate rewards for all cards
        all_rewards = []
        for card in self.cards:
            reward = self.calculate_reward_amount(card, amount, category)
            all_rewards.append(reward)
        
        # Sort by reward amount (descending) for transaction analysis
        # Note: Using reward_amount instead of net_benefit for single transaction comparison
        # Net benefit is better for long-term portfolio analysis
        all_rewards.sort(key=lambda x: x.reward_amount, reverse=True)
        
        # Find best card
        best_reward = all_rewards[0]
        best_rate = best_reward.applicable_rate
        
        # Find current card reward
        current_reward = None
        if current_card_id:
            current_rewards = [r for r in all_rewards if r.card_id == current_card_id]
            current_reward = current_rewards[0] if current_rewards else None
        
        # Calculate gap metrics based on pure reward amounts (before annual fee impact)
        if current_reward:
            # Calculate pure reward amounts without annual fee impact
            if current_reward.reward_type in ["points", "miles"]:
                current_pure_reward = amount * current_reward.applicable_rate * (current_reward.point_value_cents / 100)
            else:
                current_pure_reward = amount * (current_reward.applicable_rate / 100)
                
            if best_reward.reward_type in ["points", "miles"]:
                best_pure_reward = amount * best_reward.applicable_rate * (best_reward.point_value_cents / 100)  
            else:
                best_pure_reward = amount * (best_reward.applicable_rate / 100)
            
            reward_gap_pct = ((best_pure_reward - current_pure_reward) / current_pure_reward * 100) if current_pure_reward > 0 else 0
            extra_reward_amt = best_pure_reward - current_pure_reward
        else:
            reward_gap_pct = 0
            extra_reward_amt = best_reward.reward_amount
        
        # Count better cards (using reward_amount for consistency)
        if current_reward:
            num_better_cards = len([r for r in all_rewards if r.reward_amount > current_reward.reward_amount])
        else:
            num_better_cards = len(all_rewards)
        
        return RewardAnalysis(
            transaction_amount=amount,
            transaction_category=category,
            current_card_reward=current_reward,
            best_card_reward=best_reward,
            best_rate=best_rate,
            reward_gap_pct=reward_gap_pct,
            extra_reward_amt=extra_reward_amt,
            num_better_cards=num_better_cards,
            all_card_rewards=all_rewards
        )
    
    def batch_analyze_transactions(self, transactions: List[Dict]) -> List[RewardAnalysis]:
        """Analyze multiple transactions."""
        analyses = []
        
        for txn in transactions:
            amount = float(txn["amount"])
            category = txn["category"]
            current_card = txn.get("card_id")
            
            analysis = self.analyze_transaction(amount, category, current_card)
            analyses.append(analysis)
        
        return analyses
    
    def get_user_card_recommendations(
        self, 
        user_id: str, 
        user_spending_pattern: Dict[str, float],
        current_cards: List[str],
        top_n: int = 3
    ) -> List[Tuple[str, float, str]]:
        """Get card recommendations based on user spending pattern."""
        
        card_scores = []
        
        for card in self.cards:
            if card["card_id"] in current_cards:
                continue  # Skip cards user already has
            
            # Calculate expected annual reward
            total_annual_reward = 0
            for category, annual_spending in user_spending_pattern.items():
                if annual_spending > 0:
                    rate = self.get_reward_rate_for_category(card, category)
                    reward_points = annual_spending * (rate / 100)
                    point_value = card["point_value_cent"] / 100
                    reward_amount = reward_points * point_value
                    total_annual_reward += reward_amount
            
            # Subtract annual fee
            net_annual_benefit = total_annual_reward - card["annual_fee"]
            
            # Generate reasoning
            reasoning = f"Estimated ${net_annual_benefit:.0f} annual benefit based on your spending pattern"
            
            card_scores.append((card["card_id"], net_annual_benefit, reasoning))
        
        # Sort by net benefit and return top N
        card_scores.sort(key=lambda x: x[1], reverse=True)
        return card_scores[:top_n]


def main():
    """Example usage and testing."""
    calc = RewardCalculator()
    
    # Test single transaction
    print("Testing reward calculation...")
    
    # Example: $100 dining transaction
    analysis = calc.analyze_transaction(100.0, "dining", "citi_double_cash_card")
    
    print(f"\nTransaction: ${analysis.transaction_amount} - {analysis.transaction_category}")
    print(f"Best card: {analysis.best_card_reward.card_name}")
    print(f"Best rate: {analysis.best_rate}%")
    print(f"Reward gap: {analysis.reward_gap_pct:.1f}%")
    print(f"Extra reward: ${analysis.extra_reward_amt:.2f}")
    print(f"Better cards available: {analysis.num_better_cards}")
    
    if analysis.current_card_reward:
        print(f"Current card reward: ${analysis.current_card_reward.reward_amount:.2f}")
        print(f"Best card reward: ${analysis.best_card_reward.reward_amount:.2f}")
    
    # Test user recommendation
    print("\nTesting user recommendations...")
    spending_pattern = {
        "dining": 2400,      # $200/month
        "groceries": 3600,   # $300/month  
        "gas": 1200,         # $100/month
        "other": 2400        # $200/month
    }
    
    recommendations = calc.get_user_card_recommendations(
        "user_00001", 
        spending_pattern, 
        ["citi_double_cash_card"],
        top_n=3
    )
    
    print("Top 3 recommended cards:")
    for i, (card_id, benefit, reasoning) in enumerate(recommendations, 1):
        print(f"{i}. {card_id}: {reasoning}")


if __name__ == "__main__":
    main()