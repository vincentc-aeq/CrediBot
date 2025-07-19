"""
Feast feature repository for RecEngine.

This file defines all entities, data sources, and feature views
for the RecEngine ML feature store.
"""

from feast import FeatureStore

from .entities import user_entity
from .data_sources import (
    transactions_source,
    users_source,
    card_ownership_source,
)
from .feature_views import (
    user_stats_90d,
    category_stats_global,
    user_profile_features,
)

# Export all components for Feast discovery
__all__ = [
    # Entities
    "user_entity",
    
    # Data sources
    "transactions_source", 
    "users_source",
    "card_ownership_source",
    
    # Feature views
    "user_stats_90d",
    "category_stats_global", 
    "user_profile_features",
]


def get_feature_store() -> FeatureStore:
    """Get the configured feature store instance."""
    return FeatureStore(repo_path="features/")


def get_feature_names_for_model(model_type: str) -> list[str]:
    """Get feature names required for specific ML models."""
    
    if model_type == "trigger_classifier":
        return [
            # Transaction features
            "amount_log",
            "hour",
            "day_of_week", 
            "is_weekend",
            
            # User stats features
            "user_avg_amount",
            "user_transaction_count",
            "amount_vs_user_avg",
            "user_recency",
            
            # Category features
            "is_high_value_category",
            "amount_vs_category_avg",
            
            # Reward gap features (computed)
            "reward_gap_pct",
            "extra_reward_amt", 
            "num_better_cards",
            
            # Cooldown features (computed)
            "time_since_last_transaction",
            "recommendation_recency",
        ]
    
    elif model_type == "personalized_ranker":
        return [
            # User profile
            "user_age",
            "user_income", 
            "user_credit_score",
            "user_account_age_days",
            
            # User spending patterns
            "user_avg_amount",
            "user_std_amount",
            "user_transaction_count",
            "user_total_spending",
            "user_unique_categories",
            
            # Category preferences (computed from spending)
            "pref_groceries",
            "pref_dining",
            "pref_travel",
            "pref_gas",
            "pref_entertainment",
        ]
    
    elif model_type == "reward_estimator":
        return [
            # Transaction context
            "transaction_amount",
            "transaction_category",
            
            # User context
            "user_avg_amount",
            "user_spending_category_pct",
            
            # Card features (from card catalog)
            "card_base_rate",
            "card_bonus_rate",
            "card_annual_fee",
            "card_signup_bonus",
        ]
    
    else:
        raise ValueError(f"Unknown model type: {model_type}")


def materialize_features_for_training(start_date: str, end_date: str) -> None:
    """Materialize features for model training."""
    fs = get_feature_store()
    
    print(f"Materializing features from {start_date} to {end_date}...")
    
    # Materialize all feature views
    fs.materialize(start_date=start_date, end_date=end_date)
    
    print("✅ Feature materialization complete!")


def get_online_features(entity_ids: list[str], features: list[str]) -> dict:
    """Get online features for real-time inference."""
    fs = get_feature_store()
    
    entity_rows = [{"user_id": user_id} for user_id in entity_ids]
    
    feature_vector = fs.get_online_features(
        features=features,
        entity_rows=entity_rows,
    )
    
    return feature_vector.to_dict()


def get_historical_features(entity_df, features: list[str]):
    """Get historical features for training."""
    fs = get_feature_store()
    
    training_df = fs.get_historical_features(
        entity_df=entity_df,
        features=features,
    )
    
    return training_df.to_df()