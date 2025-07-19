"""
RecEngine Feature Store

This package contains Feast feature definitions for the RecEngine ML system.
"""

from .feature_repo import (
    get_feature_store,
    get_feature_names_for_model,
    materialize_features_for_training,
    get_online_features,
    get_historical_features,
)

__all__ = [
    "get_feature_store",
    "get_feature_names_for_model", 
    "materialize_features_for_training",
    "get_online_features",
    "get_historical_features",
]