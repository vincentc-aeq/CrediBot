"""
Test feature store setup and data.
"""

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
FEATURES_DIR = Path(__file__).parent.parent / "features"


class TestFeatureStore:
    """Test suite for feature store validation."""
    
    def test_feature_files_exist(self):
        """Test that feature files exist."""
        required_files = [
            "user_stats_90d_features.csv",
            "category_stats_global_features.csv", 
            "user_profile_features.csv",
        ]
        
        for filename in required_files:
            filepath = DATA_DIR / filename
            assert filepath.exists(), f"Feature file missing: {filepath}"
    
    def test_feast_config_exists(self):
        """Test that Feast configuration exists."""
        config_file = FEATURES_DIR / "feature_store.yaml"
        assert config_file.exists(), f"Feast config missing: {config_file}"
    
    def test_feast_repo_exists(self):
        """Test that Feast repository files exist."""
        required_files = [
            "feature_repo.py",
            "entities.py",
            "data_sources.py",
            "feature_views.py",
        ]
        
        for filename in required_files:
            filepath = FEATURES_DIR / filename
            assert filepath.exists(), f"Feast repo file missing: {filepath}"
    
    def test_registry_exists(self):
        """Test that registry exists (or mock)."""
        registry_file = FEATURES_DIR / "registry.db"
        assert registry_file.exists(), f"Registry file missing: {registry_file}"
    
    def test_user_stats_features(self):
        """Test user stats feature data."""
        filepath = DATA_DIR / "user_stats_90d_features.csv"
        
        with open(filepath, "r") as f:
            reader = csv.DictReader(f)
            features = list(reader)
        
        assert len(features) > 0, "No user stats features found"
        
        # Check required columns
        required_columns = [
            "user_id", "user_avg_amount", "user_transaction_count",
            "user_total_spending", "user_days_since_last_txn",
            "user_unique_categories"
        ]
        
        first_feature = features[0]
        for column in required_columns:
            assert column in first_feature, f"Missing column: {column}"
        
        # Validate data types
        for feature in features[:10]:  # Sample check
            assert feature["user_id"].startswith("user_"), f"Invalid user_id: {feature['user_id']}"
            assert float(feature["user_avg_amount"]) >= 0, "user_avg_amount must be non-negative"
            assert int(feature["user_transaction_count"]) >= 0, "user_transaction_count must be non-negative"
    
    def test_category_stats_features(self):
        """Test category stats feature data."""
        filepath = DATA_DIR / "category_stats_global_features.csv"
        
        with open(filepath, "r") as f:
            reader = csv.DictReader(f)
            features = list(reader)
        
        assert len(features) == 1, "Should have exactly one global stats row"
        
        # Check category columns exist
        categories = ["groceries", "dining", "gas", "travel", "entertainment"]
        first_feature = features[0]
        
        for category in categories:
            avg_col = f"category_avg_amount_{category}"
            count_col = f"category_count_{category}"
            
            assert avg_col in first_feature, f"Missing column: {avg_col}"
            assert count_col in first_feature, f"Missing column: {count_col}"
            
            # Validate values
            assert float(first_feature[avg_col]) >= 0, f"{avg_col} must be non-negative"
            assert int(first_feature[count_col]) >= 0, f"{count_col} must be non-negative"
    
    def test_user_profile_features(self):
        """Test user profile feature data."""
        filepath = DATA_DIR / "user_profile_features.csv"
        
        with open(filepath, "r") as f:
            reader = csv.DictReader(f)
            features = list(reader)
        
        assert len(features) > 0, "No user profile features found"
        
        # Check required columns
        required_columns = [
            "user_id", "user_age", "user_income", 
            "user_credit_score", "user_account_age_days"
        ]
        
        first_feature = features[0]
        for column in required_columns:
            assert column in first_feature, f"Missing column: {column}"
        
        # Validate ranges
        for feature in features[:10]:  # Sample check
            age = int(feature["user_age"])
            income = float(feature["user_income"])
            credit_score = int(feature["user_credit_score"])
            
            assert 18 <= age <= 100, f"Invalid age: {age}"
            assert 10000 <= income <= 1000000, f"Invalid income: {income}"
            assert 300 <= credit_score <= 850, f"Invalid credit score: {credit_score}"
    
    def test_feature_consistency(self):
        """Test consistency between feature files."""
        # Load user IDs from different feature files
        user_stats_file = DATA_DIR / "user_stats_90d_features.csv"
        user_profile_file = DATA_DIR / "user_profile_features.csv"
        
        with open(user_stats_file, "r") as f:
            stats_user_ids = set(row["user_id"] for row in csv.DictReader(f))
        
        with open(user_profile_file, "r") as f:
            profile_user_ids = set(row["user_id"] for row in csv.DictReader(f))
        
        # Check that user IDs are consistent
        missing_in_stats = profile_user_ids - stats_user_ids
        missing_in_profile = stats_user_ids - profile_user_ids
        
        assert len(missing_in_stats) == 0, f"Users missing in stats: {list(missing_in_stats)[:5]}"
        assert len(missing_in_profile) == 0, f"Users missing in profile: {list(missing_in_profile)[:5]}"


def run_tests():
    """Run all feature store tests."""
    test_class = TestFeatureStore()
    tests = [
        "test_feature_files_exist",
        "test_feast_config_exists",
        "test_feast_repo_exists", 
        "test_registry_exists",
        "test_user_stats_features",
        "test_category_stats_features",
        "test_user_profile_features",
        "test_feature_consistency",
    ]
    
    print("Running feature store tests...")
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