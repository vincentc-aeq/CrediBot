"""
Feast feature views for RecEngine ML models.
"""

from datetime import timedelta

from feast import Feature, FeatureView, ValueType

from .data_sources import transactions_source, users_source
from .entities import user_entity

# User statistics over 90 days
user_stats_90d = FeatureView(
    name="user_stats_90d",
    entities=[user_entity],
    ttl=timedelta(days=1),
    features=[
        Feature(name="user_avg_amount", dtype=ValueType.DOUBLE),
        Feature(name="user_std_amount", dtype=ValueType.DOUBLE), 
        Feature(name="user_transaction_count", dtype=ValueType.INT64),
        Feature(name="user_total_spending", dtype=ValueType.DOUBLE),
        Feature(name="user_days_since_last_txn", dtype=ValueType.INT64),
        Feature(name="user_avg_txn_per_day", dtype=ValueType.DOUBLE),
        Feature(name="user_unique_categories", dtype=ValueType.INT64),
        Feature(name="user_max_amount", dtype=ValueType.DOUBLE),
        Feature(name="user_min_amount", dtype=ValueType.DOUBLE),
    ],
    source=transactions_source,
    description="User spending statistics computed over the last 90 days",
)

# Global category statistics
category_stats_global = FeatureView(
    name="category_stats_global", 
    entities=[],  # Global features without entity
    ttl=timedelta(days=7),
    features=[
        Feature(name="category_avg_amount_groceries", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_dining", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_gas", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_travel", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_entertainment", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_online_shopping", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_utilities", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_healthcare", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_streaming", dtype=ValueType.DOUBLE),
        Feature(name="category_avg_amount_other", dtype=ValueType.DOUBLE),
        Feature(name="category_count_groceries", dtype=ValueType.INT64),
        Feature(name="category_count_dining", dtype=ValueType.INT64),
        Feature(name="category_count_gas", dtype=ValueType.INT64),
        Feature(name="category_count_travel", dtype=ValueType.INT64),
        Feature(name="category_count_entertainment", dtype=ValueType.INT64),
        Feature(name="category_count_online_shopping", dtype=ValueType.INT64),
        Feature(name="category_count_utilities", dtype=ValueType.INT64),
        Feature(name="category_count_healthcare", dtype=ValueType.INT64),
        Feature(name="category_count_streaming", dtype=ValueType.INT64),
        Feature(name="category_count_other", dtype=ValueType.INT64),
    ],
    source=transactions_source,
    description="Global statistics for spending categories across all users",
)

# User profile features
user_profile_features = FeatureView(
    name="user_profile_features",
    entities=[user_entity],
    ttl=timedelta(days=30),
    features=[
        Feature(name="user_age", dtype=ValueType.INT64),
        Feature(name="user_income", dtype=ValueType.DOUBLE),
        Feature(name="user_credit_score", dtype=ValueType.INT64),
        Feature(name="user_account_age_days", dtype=ValueType.INT64),
    ],
    source=users_source,
    description="User demographic and profile information",
)