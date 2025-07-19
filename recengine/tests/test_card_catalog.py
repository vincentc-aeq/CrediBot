"""
Test card catalog data and schema.
"""

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


class TestCardCatalog:
    """Test suite for card catalog validation."""
    
    def test_card_catalog_exists(self):
        """Test that card catalog file exists."""
        csv_file = DATA_DIR / "card_catalog.csv"
        assert csv_file.exists(), f"Card catalog CSV not found: {csv_file}"
    
    def test_parquet_placeholder_exists(self):
        """Test that parquet placeholder exists."""
        parquet_file = DATA_DIR / "card_catalog.parquet"
        assert parquet_file.exists(), f"Card catalog parquet not found: {parquet_file}"
    
    def test_minimum_cards(self):
        """Test that we have at least 12 cards as specified."""
        csv_file = DATA_DIR / "card_catalog.csv"
        
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        assert len(cards) >= 12, f"Expected at least 12 cards, found {len(cards)}"
    
    def test_required_fields(self):
        """Test that all cards have required fields."""
        required_fields = [
            "card_id", "issuer", "network", "reward_type", "base_rate_pct",
            "bonus_categories", "bonus_cap_amt", "annual_fee", "signup_bonus_value",
            "signup_req_spend", "foreign_tx_fee_pct", "point_value_cent",
            "credit_score_min", "eligibility_region", "updated_at"
        ]
        
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        for i, card in enumerate(cards):
            missing_fields = [field for field in required_fields if field not in card or not card[field]]
            assert len(missing_fields) == 0, \
                f"Card {i+1} ({card.get('card_id', 'unknown')}) missing fields: {missing_fields}"
    
    def test_data_types(self):
        """Test that data types are correct."""
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        for i, card in enumerate(cards):
            card_id = card.get("card_id", f"card_{i+1}")
            
            # Test numeric fields
            try:
                annual_fee = float(card["annual_fee"])
                assert annual_fee >= 0, f"{card_id}: annual fee must be non-negative"
            except ValueError:
                assert False, f"{card_id}: annual_fee must be numeric"
            
            try:
                base_rate = float(card["base_rate_pct"])
                assert 0 <= base_rate <= 10, f"{card_id}: base rate should be 0-10%"
            except ValueError:
                assert False, f"{card_id}: base_rate_pct must be numeric"
            
            try:
                credit_score = int(card["credit_score_min"])
                assert 300 <= credit_score <= 850, f"{card_id}: credit score should be 300-850"
            except ValueError:
                assert False, f"{card_id}: credit_score_min must be integer"
            
            # Test JSON fields
            try:
                bonus_categories = json.loads(card["bonus_categories"])
                assert isinstance(bonus_categories, dict), f"{card_id}: bonus_categories must be dict"
            except json.JSONDecodeError:
                assert False, f"{card_id}: bonus_categories must be valid JSON"
    
    def test_issuer_diversity(self):
        """Test that we have cards from multiple issuers."""
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        issuers = set(card["issuer"] for card in cards)
        assert len(issuers) >= 4, f"Expected at least 4 issuers, found {len(issuers)}: {issuers}"
    
    def test_reward_type_diversity(self):
        """Test that we have different reward types."""
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        reward_types = set(card["reward_type"] for card in cards)
        expected_types = {"cashback", "points", "miles"}
        
        assert reward_types.intersection(expected_types), \
            f"Expected reward types {expected_types}, found {reward_types}"
    
    def test_network_diversity(self):
        """Test that we have cards from different networks."""
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        networks = set(card["network"] for card in cards)
        assert len(networks) >= 3, f"Expected at least 3 networks, found {len(networks)}: {networks}"
    
    def test_unique_card_ids(self):
        """Test that all card IDs are unique."""
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        card_ids = [card["card_id"] for card in cards]
        unique_card_ids = set(card_ids)
        
        assert len(card_ids) == len(unique_card_ids), \
            f"Duplicate card IDs found: {len(card_ids)} total, {len(unique_card_ids)} unique"
    
    def test_eligibility_region(self):
        """Test that all cards are for US region."""
        csv_file = DATA_DIR / "card_catalog.csv"
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            cards = list(reader)
        
        for card in cards:
            assert card["eligibility_region"] == "US", \
                f"Card {card['card_id']} has wrong region: {card['eligibility_region']}"


def run_tests():
    """Run all tests manually."""
    test_class = TestCardCatalog()
    tests = [
        "test_card_catalog_exists",
        "test_parquet_placeholder_exists", 
        "test_minimum_cards",
        "test_required_fields",
        "test_data_types",
        "test_issuer_diversity",
        "test_reward_type_diversity",
        "test_network_diversity",
        "test_unique_card_ids",
        "test_eligibility_region",
    ]
    
    print("Running card catalog tests...")
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