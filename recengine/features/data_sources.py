"""
Feast data sources definition for RecEngine.
"""

from datetime import timedelta
from pathlib import Path

from feast import FileSource

# Base data directory
DATA_DIR = Path(__file__).parent.parent / "data"

# User transactions data source
transactions_source = FileSource(
    name="transactions_source",
    path=str(DATA_DIR / "transactions.csv"),
    timestamp_field="timestamp",
    created_timestamp_column="timestamp",
    description="User transaction data from CrediBot",
)

# User profile data source
users_source = FileSource(
    name="users_source", 
    path=str(DATA_DIR / "users.csv"),
    timestamp_field="created_at",
    created_timestamp_column="created_at",
    description="User profile data from CrediBot",
)

# Card ownership data source
card_ownership_source = FileSource(
    name="card_ownership_source",
    path=str(DATA_DIR / "card_ownership.csv"), 
    timestamp_field="ownership_start_date",
    created_timestamp_column="ownership_start_date",
    description="User card ownership data from CrediBot",
)