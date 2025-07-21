"""
Unit tests for reward calculation utilities.
"""

from pathlib import Path
import sys

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

from utils.reward_calc import RewardCalculator, RewardAnalysis


class TestRewardCalculator:
    """Test suite for RewardCalculator."""
    
    def test_calculator_initialization(self):
        """Test that calculator initializes correctly."""
        calc = RewardCalculator()
        assert len(calc.cards) > 0, "Should load cards from catalog"
        assert all("card_id" in card for card in calc.cards), "All cards should have card_id"
    
    def test_reward_rate_for_category(self):
        """Test reward rate calculation for different categories."""
        calc = RewardCalculator()
        
        # Find a card with bonus categories
        test_card = None
        for card in calc.cards:
            if card["bonus_categories"] and "dining" in card["bonus_categories"]:
                test_card = card
                break
        
        if test_card:
            # Test bonus category
            dining_rate = calc.get_reward_rate_for_category(test_card, "dining")
            assert dining_rate > test_card["base_rate_pct"], "Bonus rate should be higher than base"
            
            # Test non-bonus category
            other_rate = calc.get_reward_rate_for_category(test_card, "other")
            assert other_rate == test_card["base_rate_pct"], "Non-bonus should return base rate"
    
    def test_reward_calculation(self):
        """Test basic reward calculation."""
        calc = RewardCalculator()
        
        # Test with a simple transaction
        analysis = calc.analyze_transaction(100.0, "dining")
        
        assert analysis.transaction_amount == 100.0, "Should preserve transaction amount"
        assert analysis.transaction_category == "dining", "Should preserve category"
        assert analysis.best_card_reward is not None, "Should find best card"
        assert analysis.best_rate > 0, "Best rate should be positive"
        assert len(analysis.all_card_rewards) > 0, "Should analyze all cards"
    
    def test_reward_gap_calculation(self):
        """Test reward gap calculation with current card."""
        calc = RewardCalculator()
        
        # Test with current card
        analysis = calc.analyze_transaction(100.0, "dining", "citi_double_cash_card")
        
        assert analysis.current_card_reward is not None, "Should find current card reward"
        assert analysis.reward_gap_pct >= 0, "Reward gap should be non-negative"
        assert analysis.num_better_cards >= 0, "Number of better cards should be non-negative"
    
    def test_batch_analysis(self):
        """Test batch transaction analysis."""
        calc = RewardCalculator()
        
        # Create test transactions
        transactions = [
            {"amount": "100.0", "category": "dining", "card_id": "citi_double_cash_card"},
            {"amount": "50.0", "category": "groceries", "card_id": "chase_freedom_unlimited"},
            {"amount": "200.0", "category": "travel"},  # No current card
        ]
        
        analyses = calc.batch_analyze_transactions(transactions)
        
        assert len(analyses) == 3, "Should analyze all transactions"
        assert all(isinstance(a, RewardAnalysis) for a in analyses), "All should be RewardAnalysis objects"
    
    def test_user_recommendations(self):
        """Test user card recommendations."""
        calc = RewardCalculator()
        
        spending_pattern = {
            "dining": 2400,
            "groceries": 1800,
            "gas": 1200,
            "other": 2400
        }
        
        current_cards = ["citi_double_cash_card"]
        
        recommendations = calc.get_user_card_recommendations(
            "test_user", spending_pattern, current_cards, top_n=3
        )
        
        assert len(recommendations) <= 3, "Should return at most 3 recommendations"
        assert all(len(rec) == 3 for rec in recommendations), "Each recommendation should have 3 elements"
        
        # Check that recommended cards are not in current cards
        recommended_ids = [rec[0] for rec in recommendations]
        assert not any(card_id in current_cards for card_id in recommended_ids), \
            "Should not recommend cards user already has"
    
    def test_reward_amount_calculation(self):
        """Test detailed reward amount calculation."""
        calc = RewardCalculator()
        
        # Find a card for testing
        test_card = calc.cards[0]
        
        # Test with a specific amount and category
        reward = calc.calculate_reward_amount(test_card, 100.0, "other")
        
        assert reward.card_id == test_card["card_id"], "Should match card ID"
        assert reward.reward_amount >= 0, "Reward amount should be non-negative"
        assert reward.applicable_rate >= 0, "Applicable rate should be non-negative"
        assert reward.base_rate == test_card["base_rate_pct"], "Base rate should match"
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        calc = RewardCalculator()
        
        # Test with zero amount
        analysis = calc.analyze_transaction(0.0, "dining")
        assert analysis.transaction_amount == 0.0, "Should handle zero amount"
        
        # Test with unknown category
        analysis = calc.analyze_transaction(100.0, "unknown_category")
        assert analysis.transaction_category == "unknown_category", "Should handle unknown category"
        
        # Test with non-existent current card
        analysis = calc.analyze_transaction(100.0, "dining", "non_existent_card")
        assert analysis.current_card_reward is None, "Should handle non-existent card"


def run_tests():
    """Run all reward calculator tests."""
    test_class = TestRewardCalculator()
    tests = [
        "test_calculator_initialization",
        "test_reward_rate_for_category",
        "test_reward_calculation",
        "test_reward_gap_calculation",
        "test_batch_analysis",
        "test_user_recommendations",
        "test_reward_amount_calculation",
        "test_edge_cases",
    ]
    
    print("Running reward calculator tests...")
    passed = 0
    failed = 0
    
    for test_name in tests:
        try:
            test_method = getattr(test_class, test_name)
            test_method()
            print(f"✅ {test_name}")
            passed += 1
        except Exception as e:
            print(f"❌ {test_name}: {e}")
            failed += 1
    
    print(f"\nTest Results: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)