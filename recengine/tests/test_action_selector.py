"""
Unit tests for action selector.
"""

import json
import sys
from pathlib import Path

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

from utils.action_selector import ActionSelector, ActionType, select_actions


class TestActionSelector:
    """Test suite for ActionSelector."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.selector = ActionSelector()
        
        self.test_txn = {
            "transaction_id": "test_001",
            "user_id": "user_00001",
            "amount": 100.0,
            "category": "dining",
            "current_card_id": "citi_double_cash_card"
        }
        
        self.test_reward_analysis = {
            "best_card_id": "american_express_gold_card",
            "best_rate": 4.0,
            "reward_gap_pct": 50.0,
            "extra_reward_amt": 2.0,
            "num_better_cards": 3
        }
    
    def test_user_already_has_best_card(self):
        """Test when user already has the best card."""
        user_cards = ["american_express_gold_card", "citi_double_cash_card"]
        
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, user_cards
        )
        
        assert result["action"] == ActionType.NONE.value
        assert result["card_id"] == "american_express_gold_card"
        assert "already has the optimal card" in result["reasoning"]
    
    def test_insufficient_benefit(self):
        """Test when benefit is too small."""
        low_benefit_analysis = {**self.test_reward_analysis, "extra_reward_amt": 0.01}
        user_cards = ["citi_double_cash_card"]
        
        result = self.selector.select_action(
            "user1", self.test_txn, low_benefit_analysis, user_cards
        )
        
        assert result["action"] == ActionType.NONE.value
        assert "too small" in result["reasoning"]
    
    def test_max_cards_reached(self):
        """Test when user has maximum number of cards."""
        max_cards = ["card1", "card2", "card3", "card4", "card5"]
        
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, max_cards
        )
        
        assert result["action"] == ActionType.SWITCH.value
        assert result["card_id"] == "american_express_gold_card"
        assert "wallet at capacity" in result["reasoning"]
    
    def test_category_specialization(self):
        """Test category specialization logic."""
        user_cards = ["citi_double_cash_card"]  # No dining specialist
        
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, user_cards
        )
        
        assert result["action"] == ActionType.ADD.value
        assert "specialized card for dining" in result["reasoning"]
        assert result["metadata"]["rule"] == "category_specialization"
    
    def test_portfolio_expansion(self):
        """Test portfolio expansion for users with few cards."""
        user_cards = ["citi_double_cash_card"]
        moderate_benefit_analysis = {**self.test_reward_analysis, "extra_reward_amt": 0.1}
        
        # Test with non-category transaction
        non_category_txn = {**self.test_txn, "category": "other"}
        
        result = self.selector.select_action(
            "user1", non_category_txn, moderate_benefit_analysis, user_cards
        )
        
        assert result["action"] == ActionType.ADD.value
        assert "complement existing portfolio" in result["reasoning"]
    
    def test_optimize_existing_portfolio(self):
        """Test optimization for users with 3+ cards."""
        many_cards = ["card1", "card2", "card3", "card4"]
        
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, many_cards
        )
        
        assert result["action"] == ActionType.SWITCH.value
        assert "optimize_existing_portfolio" in result["metadata"]["rule"]
    
    def test_select_actions_function(self):
        """Test the main select_actions function."""
        user_cards = ["citi_double_cash_card"]
        
        result_json = select_actions(
            "user1",
            self.test_txn,
            self.test_reward_analysis,
            user_cards
        )
        
        result = json.loads(result_json)
        
        assert "action" in result
        assert "card_id" in result
        assert "reasoning" in result
        assert "confidence" in result
        assert "metadata" in result
        
        assert result["action"] in ["add", "switch", "none"]
        assert isinstance(result["confidence"], (int, float))
        assert 0 <= result["confidence"] <= 1
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        
        # Test with empty user cards
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, []
        )
        assert result["action"] in ["add", "switch", "none"]
        
        # Test with missing transaction data
        minimal_txn = {"category": "other", "amount": 50.0}
        result = self.selector.select_action(
            "user1", minimal_txn, self.test_reward_analysis, ["card1"]
        )
        assert result["action"] in ["add", "switch", "none"]
    
    def test_confidence_scores(self):
        """Test that confidence scores are reasonable."""
        
        # High confidence scenario: category specialization
        user_cards = ["citi_double_cash_card"]
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, user_cards
        )
        assert result["confidence"] >= 0.8
        
        # Low confidence scenario: fallback
        fallback_txn = {**self.test_txn, "category": "other"}
        moderate_analysis = {**self.test_reward_analysis, "extra_reward_amt": 0.03}
        result = self.selector.select_action(
            "user1", fallback_txn, moderate_analysis, ["card1", "card2", "card3", "card4"]
        )
        # Should be switch with medium confidence, not fallback add
        assert result["confidence"] >= 0.5
    
    def test_action_metadata(self):
        """Test that metadata contains useful information."""
        user_cards = ["citi_double_cash_card"]
        
        result = self.selector.select_action(
            "user1", self.test_txn, self.test_reward_analysis, user_cards
        )
        
        metadata = result["metadata"]
        assert "rule" in metadata
        assert isinstance(metadata, dict)
        
        # Rule-specific metadata checks
        if result["action"] == ActionType.ADD.value:
            if metadata["rule"] == "category_specialization":
                assert "category" in metadata
                assert "coverage" in metadata


def run_tests():
    """Run all action selector tests."""
    test_class = TestActionSelector()
    tests = [
        "test_user_already_has_best_card",
        "test_insufficient_benefit",
        "test_max_cards_reached",
        "test_category_specialization",
        "test_portfolio_expansion",
        "test_optimize_existing_portfolio", 
        "test_select_actions_function",
        "test_edge_cases",
        "test_confidence_scores",
        "test_action_metadata",
    ]
    
    print("Running action selector tests...")
    passed = 0
    failed = 0
    
    for test_name in tests:
        try:
            test_class.setup_method()
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