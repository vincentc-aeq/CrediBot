#!/usr/bin/env python3
"""
Convert card catalog CSV to Parquet format.
This is a placeholder until we have pandas/pyarrow installed.
"""

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def validate_card_schema(card_data):
    """Validate card catalog schema."""
    required_fields = [
        "card_id", "issuer", "network", "reward_type", "base_rate_pct",
        "bonus_categories", "bonus_cap_amt", "annual_fee", "signup_bonus_value",
        "signup_req_spend", "foreign_tx_fee_pct", "point_value_cent",
        "credit_score_min", "eligibility_region", "updated_at"
    ]
    
    errors = []
    warnings = []
    
    print("Validating card catalog schema...")
    
    for i, card in enumerate(card_data):
        # Check required fields
        missing_fields = [field for field in required_fields if field not in card]
        if missing_fields:
            errors.append(f"Card {i+1} missing fields: {missing_fields}")
        
        # Validate data types
        try:
            if "annual_fee" in card:
                float(card["annual_fee"])
            if "base_rate_pct" in card:
                float(card["base_rate_pct"])
            if "credit_score_min" in card:
                int(card["credit_score_min"])
            if "bonus_categories" in card:
                json.loads(card["bonus_categories"])
        except (ValueError, json.JSONDecodeError) as e:
            errors.append(f"Card {i+1} data type error: {e}")
    
    if errors:
        print(f"❌ Schema validation failed:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    if warnings:
        print(f"⚠️  Schema warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    
    print("✅ Schema validation passed!")
    return True


def convert_csv_to_parquet():
    """Convert CSV to Parquet (placeholder implementation)."""
    csv_file = DATA_DIR / "card_catalog.csv"
    parquet_file = DATA_DIR / "card_catalog.parquet"
    
    if not csv_file.exists():
        print(f"CSV file not found: {csv_file}")
        return False
    
    # Read CSV data
    card_data = []
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        card_data = list(reader)
    
    print(f"Loaded {len(card_data)} cards from CSV")
    
    # Validate schema
    if not validate_card_schema(card_data):
        return False
    
    # Since we don't have pyarrow/pandas, create a marker file
    # In production, this would use: df.to_parquet(parquet_file)
    with open(parquet_file, "w") as f:
        f.write("# Parquet placeholder\n")
        f.write("# To create actual parquet file, install pandas and pyarrow:\n")
        f.write("# pip install pandas pyarrow\n")
        f.write("# Then run: pandas.read_csv('card_catalog.csv').to_parquet('card_catalog.parquet')\n")
        f.write(f"# CSV source: {csv_file}\n")
        f.write(f"# Cards: {len(card_data)}\n")
        f.write(f"# Created: {card_data[0]['updated_at'] if card_data else 'unknown'}\n")
    
    print(f"✅ Parquet placeholder created: {parquet_file}")
    print("📝 Note: Install pandas and pyarrow for actual Parquet conversion")
    
    return True


if __name__ == "__main__":
    success = convert_csv_to_parquet()
    exit(0 if success else 1)