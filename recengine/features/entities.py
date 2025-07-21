"""
Feast entities definition for RecEngine.
"""

from feast import Entity, ValueType

# Primary entity for users
user_entity = Entity(
    name="user_id",
    value_type=ValueType.STRING,
    description="Unique identifier for users in the CrediBot system",
)