#!/usr/bin/env python3
"""
Sync credit cards from CrediBot PostgreSQL database to RecEngine format.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
REQUIRED_FIELDS = [
    "card_id", "issuer", "network", "reward_type", "base_rate_pct",
    "bonus_categories", "bonus_cap_amt", "annual_fee", "signup_bonus_value",
    "signup_req_spend", "foreign_tx_fee_pct", "point_value_cent",
    "credit_score_min", "eligibility_region"
]

# Mapping from PostgreSQL to RecEngine schema
NETWORK_MAPPING = {
    "American Express": "American Express",
    "Chase": "Visa",  # Most Chase cards are Visa
    "Citi": "Mastercard",  # Most Citi cards are Mastercard
    "Capital One": "Visa",  # Most Capital One cards are Visa
    "Discover": "Discover",
    "Wells Fargo": "Visa",
    "Bank of America": "Visa",
}

REWARD_TYPE_MAPPING = {
    "cashback": "cashback",
    "points": "points",
    "miles": "miles",
}

# Point/mile value estimates (in cents)
POINT_VALUES = {
    "cashback": 1.0,
    "points": 1.0,  # Default, varies by program
    "miles": 1.0,   # Default, varies by program
}

# Special point values for specific issuers
ISSUER_POINT_VALUES = {
    "Chase": 1.5,      # Ultimate Rewards
    "American Express": 1.8,  # Membership Rewards
    "Citi": 1.6,       # ThankYou Points
    "Capital One": 1.0, # Miles usually 1:1
}


def get_db_connection(db_url: Optional[str] = None) -> psycopg2.extensions.connection:
    """Get database connection."""
    if not db_url:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            # Default local connection
            db_url = "postgresql://postgres:password@localhost:5432/credibot"
    
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to database: {e}")
        print("Make sure PostgreSQL is running and DATABASE_URL is set correctly")
        sys.exit(1)


def fetch_credit_cards(conn: psycopg2.extensions.connection) -> List[Dict]:
    """Fetch credit cards from PostgreSQL."""
    query = """
    SELECT 
        id, name, issuer, card_type, annual_fee,
        reward_structure, benefits, requirements,
        description, image_url, apply_url, is_active,
        created_at, updated_at
    FROM credit_cards 
    WHERE is_active = true
    ORDER BY issuer, name
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        return [dict(row) for row in cur.fetchall()]


def extract_base_rate(reward_structure: List[Dict]) -> float:
    """Extract base reward rate (for 'other' category)."""
    for reward in reward_structure:
        if reward.get("category") == "other":
            return float(reward.get("rewardRate", 0.0))
    return 1.0  # Default base rate


def extract_bonus_categories(reward_structure: List[Dict]) -> Dict[str, float]:
    """Extract bonus categories and rates."""
    bonus_categories = {}
    
    for reward in reward_structure:
        category = reward.get("category")
        rate = float(reward.get("rewardRate", 0.0))
        
        if category and category != "other" and rate > 0:
            bonus_categories[category] = rate
    
    return bonus_categories


def extract_bonus_cap(reward_structure: List[Dict]) -> float:
    """Extract maximum bonus cap amount."""
    max_cap = 0.0
    
    for reward in reward_structure:
        cap = reward.get("cap")
        if cap and float(cap) > max_cap:
            max_cap = float(cap)
    
    return max_cap


def get_primary_reward_type(reward_structure: List[Dict]) -> str:
    """Determine primary reward type."""
    if not reward_structure:
        return "cashback"
    
    # Get the most common reward type
    reward_types = [r.get("rewardType", "cashback") for r in reward_structure]
    return max(set(reward_types), key=reward_types.count)


def estimate_foreign_tx_fee(issuer: str) -> float:
    """Estimate foreign transaction fee based on issuer."""
    # Most premium cards have no foreign transaction fees
    no_fee_keywords = ["premium", "travel", "sapphire", "reserve", "venture", "gold"]
    
    if issuer.lower() in ["american express", "chase", "capital one"]:
        return 0.0  # These issuers typically don't charge FTF on travel cards
    
    return 2.5  # Default FTF for other cards


def convert_card_to_recengine_format(card: Dict) -> Dict:
    """Convert CrediBot card format to RecEngine format."""
    # Parse JSON fields
    reward_structure = json.loads(card["reward_structure"]) if card["reward_structure"] else []
    requirements = json.loads(card["requirements"]) if card["requirements"] else {}
    
    # Extract required fields
    card_id = card["name"].lower().replace(" ", "_").replace("-", "_")
    issuer = card["issuer"]
    network = NETWORK_MAPPING.get(issuer, "Visa")  # Default to Visa
    
    primary_reward_type = get_primary_reward_type(reward_structure)
    base_rate = extract_base_rate(reward_structure)
    bonus_categories = extract_bonus_categories(reward_structure)
    bonus_cap = extract_bonus_cap(reward_structure)
    
    # Point value estimation
    point_value = ISSUER_POINT_VALUES.get(issuer, POINT_VALUES.get(primary_reward_type, 1.0))
    
    # Signup bonus estimation (simplified)
    signup_bonus_value = 500.0  # Default estimate
    signup_req_spend = 3000.0   # Default estimate
    
    return {
        "card_id": card_id,
        "issuer": issuer,
        "network": network,
        "reward_type": primary_reward_type,
        "base_rate_pct": base_rate,
        "bonus_categories": bonus_categories,
        "bonus_cap_amt": bonus_cap,
        "annual_fee": float(card["annual_fee"]),
        "signup_bonus_value": signup_bonus_value,
        "signup_req_spend": signup_req_spend,
        "foreign_tx_fee_pct": estimate_foreign_tx_fee(issuer),
        "point_value_cent": point_value,
        "credit_score_min": requirements.get("minCreditScore", 600),
        "eligibility_region": "US",  # Default to US
        "updated_at": datetime.now(),
        
        # Additional metadata
        "original_id": card["id"],
        "name": card["name"],
        "card_type": card["card_type"],
        "description": card["description"],
        "image_url": card["image_url"],
        "apply_url": card["apply_url"],
    }


def validate_card_schema(card: Dict) -> bool:
    """Validate that card has all required fields."""
    missing_fields = []
    
    for field in REQUIRED_FIELDS:
        if field not in card:
            missing_fields.append(field)
    
    if missing_fields:
        print(f"Warning: Card {card.get('card_id', 'unknown')} missing fields: {missing_fields}")
        return False
    
    return True


def sync_cards(db_url: Optional[str] = None, output_format: str = "parquet") -> int:
    """Main sync function."""
    print("Syncing credit cards from CrediBot database...")
    
    # Ensure data directory exists
    DATA_DIR.mkdir(exist_ok=True)
    
    # Connect to database
    conn = get_db_connection(db_url)
    
    try:
        # Fetch cards
        print("Fetching credit cards from PostgreSQL...")
        raw_cards = fetch_credit_cards(conn)
        print(f"Found {len(raw_cards)} active credit cards")
        
        if not raw_cards:
            print("No credit cards found!")
            return 1
        
        # Convert to RecEngine format
        print("Converting to RecEngine format...")
        converted_cards = []
        validation_errors = 0
        
        for card in raw_cards:
            try:
                converted_card = convert_card_to_recengine_format(card)
                
                if validate_card_schema(converted_card):
                    converted_cards.append(converted_card)
                else:
                    validation_errors += 1
                    
            except Exception as e:
                print(f"Error converting card {card.get('name', 'unknown')}: {e}")
                validation_errors += 1
        
        print(f"Successfully converted {len(converted_cards)} cards")
        if validation_errors > 0:
            print(f"Warning: {validation_errors} cards failed validation")
        
        # Save to file
        df = pd.DataFrame(converted_cards)
        
        if output_format == "parquet":
            output_file = DATA_DIR / "card_catalog.parquet"
            df.to_parquet(output_file, index=False)
        else:
            output_file = DATA_DIR / "card_catalog.csv"
            df.to_csv(output_file, index=False)
        
        print(f"Saved card catalog to: {output_file}")
        
        # Print summary
        print(f"\nCard Catalog Summary:")
        print(f"- Total cards: {len(converted_cards)}")
        print(f"- Issuers: {df['issuer'].nunique()}")
        print(f"- Networks: {df['network'].nunique()}")
        print(f"- Reward types: {df['reward_type'].value_counts().to_dict()}")
        print(f"- Avg annual fee: ${df['annual_fee'].mean():.2f}")
        print(f"- No annual fee cards: {(df['annual_fee'] == 0).sum()}")
        
        return 0
        
    finally:
        conn.close()


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Sync credit cards from CrediBot database")
    parser.add_argument("--db-url", help="PostgreSQL connection string")
    parser.add_argument("--format", choices=["parquet", "csv"], default="parquet", 
                       help="Output format")
    parser.add_argument("--dry-run", action="store_true", 
                       help="Print what would be done without saving")
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("DRY RUN: Would sync cards but not save to file")
        # TODO: Implement dry run logic
        return 0
    
    return sync_cards(args.db_url, args.format)


if __name__ == "__main__":
    exit(main())