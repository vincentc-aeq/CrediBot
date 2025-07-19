"""
Test data integrity for generated mock data.
"""

import csv
from pathlib import Path
from typing import Set, Tuple

import pytest

DATA_DIR = Path(__file__).parent.parent / "data"


def load_csv_ids(file_path: Path, id_column: str) -> Set[str]:
    """Load unique IDs from a CSV file."""
    ids = set()
    with open(file_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ids.add(row[id_column])
    return ids


def load_csv_tuples(file_path: Path, columns: list) -> Set[Tuple]:
    """Load tuples of specified columns from a CSV file."""
    tuples = set()
    with open(file_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tuple_values = tuple(row[col] for col in columns)
            tuples.add(tuple_values)
    return tuples


class TestDataIntegrity:
    """Test suite for data integrity validation."""
    
    @pytest.fixture(scope="class")
    def users_file(self):
        """Path to users.csv file."""
        return DATA_DIR / "users.csv"
    
    @pytest.fixture(scope="class")
    def ownership_file(self):
        """Path to card_ownership.csv file."""
        return DATA_DIR / "card_ownership.csv"
    
    @pytest.fixture(scope="class")
    def transactions_file(self):
        """Path to transactions.csv file."""
        return DATA_DIR / "transactions.csv"
    
    def test_data_files_exist(self, users_file, ownership_file, transactions_file):
        """Test that all required data files exist."""
        assert users_file.exists(), f"Users file not found: {users_file}"
        assert ownership_file.exists(), f"Ownership file not found: {ownership_file}"
        assert transactions_file.exists(), f"Transactions file not found: {transactions_file}"
    
    def test_user_count(self, users_file):
        """Test that we have the expected number of users."""
        user_ids = load_csv_ids(users_file, "user_id")
        assert len(user_ids) == 5000, f"Expected 5000 users, found {len(user_ids)}"
    
    def test_transaction_count(self, transactions_file):
        """Test that we have sufficient transactions."""
        transaction_ids = load_csv_ids(transactions_file, "transaction_id")
        assert len(transaction_ids) >= 200000, f"Expected at least 200k transactions, found {len(transaction_ids)}"
    
    def test_all_users_have_cards(self, users_file, ownership_file):
        """Test that all users have at least one card."""
        user_ids = load_csv_ids(users_file, "user_id")
        ownership_user_ids = set()
        
        with open(ownership_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ownership_user_ids.add(row["user_id"])
        
        users_without_cards = user_ids - ownership_user_ids
        assert len(users_without_cards) == 0, \
            f"{len(users_without_cards)} users have no cards: {list(users_without_cards)[:5]}..."
    
    def test_transaction_card_ownership(self, ownership_file, transactions_file):
        """Test that all transactions use cards that users actually own."""
        # Load valid user-card pairs
        valid_pairs = load_csv_tuples(ownership_file, ["user_id", "card_id"])
        
        # Check each transaction
        invalid_transactions = []
        with open(transactions_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pair = (row["user_id"], row["card_id"])
                if pair not in valid_pairs:
                    invalid_transactions.append(row["transaction_id"])
        
        assert len(invalid_transactions) == 0, \
            f"{len(invalid_transactions)} transactions use invalid card ownership"
    
    def test_primary_card_assignment(self, ownership_file):
        """Test that each user has exactly one primary card."""
        user_primary_counts = {}
        
        with open(ownership_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                user_id = row["user_id"]
                is_primary = row["is_primary"].lower() == "true"
                
                if user_id not in user_primary_counts:
                    user_primary_counts[user_id] = 0
                
                if is_primary:
                    user_primary_counts[user_id] += 1
        
        invalid_users = [user for user, count in user_primary_counts.items() if count != 1]
        assert len(invalid_users) == 0, \
            f"{len(invalid_users)} users don't have exactly one primary card"
    
    def test_data_field_validity(self, users_file, ownership_file, transactions_file):
        """Test that data fields contain valid values."""
        # Test users
        with open(users_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                assert 18 <= int(row["age"]) <= 80, f"Invalid age: {row['age']}"
                assert 20000 <= float(row["income"]) <= 250000, f"Invalid income: {row['income']}"
                assert 550 <= int(row["credit_score"]) <= 850, f"Invalid credit score: {row['credit_score']}"
        
        # Test transactions
        with open(transactions_file, "r") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i > 1000:  # Sample check for performance
                    break
                assert float(row["amount"]) > 0, f"Invalid amount: {row['amount']}"
                assert row["category"] in ["groceries", "dining", "gas", "travel", 
                                          "entertainment", "online_shopping", "utilities", 
                                          "healthcare", "streaming", "other"], \
                    f"Invalid category: {row['category']}""