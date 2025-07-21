"""
Action selector for recommendation decisions.

This module determines whether to recommend 'add' or 'switch' actions
based on user card ownership, transaction patterns, and reward analysis.
"""

import json
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Union


class ActionType(Enum):
    """Types of recommendation actions."""
    ADD = "add"
    SWITCH = "switch"
    NONE = "none"


@dataclass
class ActionRecommendation:
    """Recommendation action with reasoning."""
    action: ActionType
    card_id: str
    reasoning: str
    confidence: float
    metadata: Dict


class ActionSelector:
    """Selector for recommendation actions based on business rules."""
    
    def __init__(self):
        """Initialize action selector with business rules."""
        self.max_cards_per_user = 5
        self.min_card_usage_months = 6
        self.switch_benefit_threshold = 100.0  # Annual benefit required to suggest switch
        
    def select_action(
        self,
        user_id: str,
        transaction: Dict,
        reward_analysis: Dict,
        user_cards: List[str],
        user_spending_pattern: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Select the appropriate action for a recommendation.
        
        Args:
            user_id: User identifier
            transaction: Transaction data
            reward_analysis: Output from reward calculator
            user_cards: List of cards user currently owns
            user_spending_pattern: Optional annual spending by category
            
        Returns:
            Dict with action, card_id, reasoning, and metadata
        """
        
        best_card_id = reward_analysis["best_card_id"]
        num_better_cards = reward_analysis["num_better_cards"]
        extra_reward_amt = reward_analysis["extra_reward_amt"]
        current_card_id = transaction.get("current_card_id")
        
        # Rule 1: User already has the best card
        if best_card_id in user_cards:
            return self._create_action_response(
                ActionType.NONE,
                best_card_id,
                "User already has the optimal card for this transaction",
                0.0,
                {"rule": "already_has_best_card"}
            )
        
        # Rule 2: No significant benefit
        if extra_reward_amt < 0.02:  # Less than 2 cents extra
            return self._create_action_response(
                ActionType.NONE,
                best_card_id,
                "Benefit too small to justify recommendation",
                0.0,
                {"rule": "insufficient_benefit", "extra_reward": extra_reward_amt}
            )
        
        # Rule 3: User has too many cards already - suggest switch
        if len(user_cards) >= self.max_cards_per_user:
            # Find worst performing card to potentially switch from
            worst_card = self._find_worst_card(user_cards, user_spending_pattern)
            
            return self._create_action_response(
                ActionType.SWITCH,
                best_card_id,
                f"Switch from {worst_card} to maximize rewards (wallet at capacity)",
                0.8,
                {
                    "rule": "max_cards_reached",
                    "from_card": worst_card,
                    "to_card": best_card_id,
                    "current_card_count": len(user_cards)
                }
            )
        
        # Rule 4: High-value transaction categories favor ADD
        high_value_categories = ["dining", "travel", "groceries"]
        if transaction["category"] in high_value_categories:
            
            # Check if user lacks cards for this category
            category_coverage = self._check_category_coverage(
                transaction["category"], 
                user_cards
            )
            
            if not category_coverage["has_good_coverage"]:
                return self._create_action_response(
                    ActionType.ADD,
                    best_card_id,
                    f"Add specialized card for {transaction['category']} category",
                    0.9,
                    {
                        "rule": "category_specialization",
                        "category": transaction["category"],
                        "coverage": category_coverage
                    }
                )
        
        # Rule 5: Large potential annual benefit suggests SWITCH
        if user_spending_pattern:
            estimated_annual_benefit = self._estimate_annual_benefit(
                best_card_id,
                current_card_id,
                user_spending_pattern
            )
            
            if estimated_annual_benefit >= self.switch_benefit_threshold:
                return self._create_action_response(
                    ActionType.SWITCH,
                    best_card_id,
                    f"Switch for estimated ${estimated_annual_benefit:.0f} annual benefit",
                    0.85,
                    {
                        "rule": "high_annual_benefit",
                        "estimated_benefit": estimated_annual_benefit,
                        "from_card": current_card_id,
                        "to_card": best_card_id
                    }
                )
        
        # Rule 6: Default to ADD for moderate benefits
        if extra_reward_amt >= 0.05 and len(user_cards) < 3:
            return self._create_action_response(
                ActionType.ADD,
                best_card_id,
                "Add card to complement existing portfolio",
                0.6,
                {
                    "rule": "portfolio_expansion",
                    "extra_reward": extra_reward_amt,
                    "current_cards": len(user_cards)
                }
            )
        
        # Rule 7: For users with 3-4 cards, prefer SWITCH
        if len(user_cards) >= 3:
            least_used_card = self._find_least_used_card(user_cards)
            return self._create_action_response(
                ActionType.SWITCH,
                best_card_id,
                f"Switch from underutilized card for better rewards",
                0.7,
                {
                    "rule": "optimize_existing_portfolio",
                    "from_card": least_used_card,
                    "to_card": best_card_id
                }
            )
        
        # Fallback: ADD with low confidence
        return self._create_action_response(
            ActionType.ADD,
            best_card_id,
            "Consider adding this card for better rewards",
            0.4,
            {"rule": "fallback_add"}
        )
    
    def _create_action_response(
        self,
        action: ActionType,
        card_id: str,
        reasoning: str,
        confidence: float,
        metadata: Dict
    ) -> Dict:
        """Create standardized action response."""
        return {
            "action": action.value,
            "card_id": card_id,
            "reasoning": reasoning,
            "confidence": confidence,
            "metadata": metadata
        }
    
    def _find_worst_card(
        self,
        user_cards: List[str],
        spending_pattern: Optional[Dict[str, float]]
    ) -> str:
        """Find the worst performing card in user's portfolio."""
        if not spending_pattern or not user_cards:
            return user_cards[0]  # Default to first card
        
        # Simple heuristic: card with lowest expected annual reward
        # In a real system, this would use actual usage data
        basic_cashback_cards = [
            "citi_double_cash_card",
            "wells_fargo_active_cash_card",
            "capital_one_quicksilver"
        ]
        
        # Prefer to remove basic cards if user has specialized ones
        for card in user_cards:
            if card in basic_cashback_cards:
                return card
        
        return user_cards[0]  # Fallback
    
    def _find_least_used_card(self, user_cards: List[str]) -> str:
        """Find the least used card (simplified heuristic)."""
        # In a real system, this would use actual transaction data
        # For now, assume first card is least used
        return user_cards[0] if user_cards else ""
    
    def _check_category_coverage(
        self,
        category: str,
        user_cards: List[str]
    ) -> Dict:
        """Check if user has good coverage for a spending category."""
        
        # Simplified category-card mapping
        category_specialists = {
            "dining": ["american_express_gold_card", "capital_one_savor", "chase_sapphire_preferred"],
            "travel": ["chase_sapphire_preferred", "chase_sapphire_reserve", "capital_one_venture_rewards"],
            "groceries": ["blue_cash_preferred_card", "american_express_gold_card"],
            "gas": ["blue_cash_preferred_card", "discover_it_cash_back"]
        }
        
        specialists = category_specialists.get(category, [])
        has_specialist = any(card in specialists for card in user_cards)
        
        return {
            "has_good_coverage": has_specialist,
            "category": category,
            "specialists_available": specialists,
            "user_has_specialist": has_specialist
        }
    
    def _estimate_annual_benefit(
        self,
        new_card_id: str,
        current_card_id: Optional[str],
        spending_pattern: Dict[str, float]
    ) -> float:
        """Estimate annual benefit of switching cards."""
        # Simplified estimation
        # In a real system, this would use the reward calculator
        
        total_annual_spending = sum(spending_pattern.values())
        
        # Rough estimates based on card types
        new_card_multiplier = 1.5  # Assume new card is 50% better
        current_card_multiplier = 1.0
        
        if "sapphire" in new_card_id.lower():
            new_card_multiplier = 2.0
        elif "gold" in new_card_id.lower():
            new_card_multiplier = 1.8
        elif "double_cash" in new_card_id.lower():
            new_card_multiplier = 1.4
        
        estimated_benefit = total_annual_spending * 0.01 * (new_card_multiplier - current_card_multiplier)
        return max(0, estimated_benefit)


def select_actions(
    user_id: str,
    txn: Dict,
    reward_table: Dict,
    user_cards: Optional[List[str]] = None,
    user_spending: Optional[Dict[str, float]] = None
) -> str:
    """
    Main function for action selection (matches spec signature).
    
    Args:
        user_id: User identifier
        txn: Transaction data
        reward_table: Reward analysis results
        user_cards: Optional list of user's current cards
        user_spending: Optional spending pattern data
        
    Returns:
        JSON string with action decision
    """
    
    selector = ActionSelector()
    
    # Default user cards if not provided
    if user_cards is None:
        user_cards = ["citi_double_cash_card"]  # Assume basic card
    
    # Get action recommendation
    action_result = selector.select_action(
        user_id=user_id,
        transaction=txn,
        reward_analysis=reward_table,
        user_cards=user_cards,
        user_spending_pattern=user_spending
    )
    
    return json.dumps(action_result)


def main():
    """Example usage and testing."""
    
    # Test data
    test_txn = {
        "transaction_id": "test_001",
        "user_id": "user_00001", 
        "amount": 100.0,
        "category": "dining",
        "current_card_id": "citi_double_cash_card"
    }
    
    test_reward_analysis = {
        "best_card_id": "american_express_gold_card",
        "best_rate": 4.0,
        "reward_gap_pct": 50.0,
        "extra_reward_amt": 2.0,
        "num_better_cards": 3
    }
    
    test_user_cards = ["citi_double_cash_card", "chase_freedom_unlimited"]
    
    test_spending = {
        "dining": 2400,
        "groceries": 1800, 
        "gas": 1200,
        "other": 3000
    }
    
    print("Testing action selector...")
    
    # Test the main function
    result_json = select_actions(
        "user_00001",
        test_txn,
        test_reward_analysis,
        test_user_cards,
        test_spending
    )
    
    result = json.loads(result_json)
    print(f"Action: {result['action']}")
    print(f"Card: {result['card_id']}")
    print(f"Reasoning: {result['reasoning']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Metadata: {result['metadata']}")
    
    # Test different scenarios
    print("\nTesting different scenarios...")
    
    selector = ActionSelector()
    
    # Scenario 1: User has max cards
    max_cards = ["card1", "card2", "card3", "card4", "card5"]
    result1 = selector.select_action("user1", test_txn, test_reward_analysis, max_cards)
    print(f"Max cards scenario: {result1['action']} - {result1['reasoning']}")
    
    # Scenario 2: User already has best card
    has_best = ["american_express_gold_card", "citi_double_cash_card"]
    result2 = selector.select_action("user2", test_txn, test_reward_analysis, has_best)
    print(f"Has best card scenario: {result2['action']} - {result2['reasoning']}")
    
    # Scenario 3: Low benefit
    low_benefit_analysis = {**test_reward_analysis, "extra_reward_amt": 0.01}
    result3 = selector.select_action("user3", test_txn, low_benefit_analysis, test_user_cards)
    print(f"Low benefit scenario: {result3['action']} - {result3['reasoning']}")


if __name__ == "__main__":
    main()