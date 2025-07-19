#!/usr/bin/env python3
"""
Train ranking model using LightGBM Ranker for MAP@5.
Ranks credit cards for personalized homepage recommendations.
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

# Mock imports for LightGBM-like functionality
class LGBMRanker:
    """Mock LightGBM Ranker for development without dependencies."""
    
    def __init__(self, n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.random_state = random_state
        self.feature_names = None
        self.feature_importances_ = None
        
    def fit(self, X, y, group):
        """Mock fit method for ranking."""
        import random
        random.seed(self.random_state)
        
        self.feature_names = [f"feature_{i}" for i in range(len(X[0]))] if X else []
        self.feature_importances_ = [random.random() for _ in self.feature_names]
        return self
    
    def predict(self, X):
        """Mock predict method for ranking scores."""
        import random
        random.seed(42)
        
        scores = []
        for i, row in enumerate(X):
            # Ranking-based scoring using card features
            # Expected features: user spending patterns + card reward rates
            
            base_score = 0.5
            
            # If we have card reward features (mock indices)
            if len(row) >= 10:
                # Mock card quality features
                reward_rate = row[0] if row[0] > 0 else 1.0  # Base reward rate
                annual_fee = row[1] if len(row) > 1 else 0  # Annual fee (lower is better)
                bonus_categories = row[2] if len(row) > 2 else 0  # Number of bonus categories
                
                # User-card fit features  
                spending_match = row[3] if len(row) > 3 else 0.5  # How well card matches user spending
                current_gap = row[4] if len(row) > 4 else 0  # Gap vs current cards
                
                # Calculate ranking score
                score = base_score
                
                # Reward rate contribution (0-30%)
                score += min(reward_rate * 0.1, 0.3)
                
                # Annual fee penalty (0-20%)
                score -= min(annual_fee / 500 * 0.2, 0.2)
                
                # Bonus categories boost (0-15%)
                score += min(bonus_categories / 10 * 0.15, 0.15)
                
                # User fit contribution (0-25%)
                score += spending_match * 0.25
                
                # Gap/opportunity contribution (0-20%)
                score += min(current_gap / 100 * 0.2, 0.2)
                
                # Add small random component for variety
                score += (random.random() - 0.5) * 0.1
                
            else:
                # Fallback scoring
                score = base_score + (random.random() - 0.5) * 0.3
            
            # Clamp to valid range
            score = max(0.1, min(1.0, score))
            scores.append(score)
        
        return scores

def ndcg_at_k(y_true, y_scores, k=5):
    """Calculate NDCG@k metric."""
    # Sort by descending scores
    sorted_pairs = sorted(zip(y_scores, y_true), reverse=True)
    
    # Calculate DCG@k
    dcg = 0.0
    for i, (score, relevance) in enumerate(sorted_pairs[:k]):
        if i == 0:
            dcg += relevance
        else:
            dcg += relevance / (i + 1) ** 0.5  # log2(i+1) approximation
    
    # Calculate ideal DCG@k
    ideal_sorted = sorted(y_true, reverse=True)
    idcg = 0.0
    for i, relevance in enumerate(ideal_sorted[:k]):
        if i == 0:
            idcg += relevance
        else:
            idcg += relevance / (i + 1) ** 0.5
    
    # Return NDCG
    return dcg / idcg if idcg > 0 else 0.0

def map_at_k(y_true, y_scores, k=5):
    """Calculate MAP@k (Mean Average Precision at k)."""
    # Sort by descending scores
    sorted_pairs = sorted(zip(y_scores, y_true), reverse=True)
    
    # Calculate AP@k
    relevant_found = 0
    total_precision = 0.0
    
    for i, (score, relevance) in enumerate(sorted_pairs[:k]):
        if relevance > 0:  # Relevant item
            relevant_found += 1
            precision_at_i = relevant_found / (i + 1)
            total_precision += precision_at_i
    
    # Average precision
    total_relevant = sum(1 for rel in y_true if rel > 0)
    if total_relevant == 0:
        return 0.0
    
    return total_precision / min(total_relevant, k)

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "models"

# Ranking features (derived from user preferences and card attributes)
RANKING_FEATURES = [
    # Card features
    "card_base_reward_rate",
    "card_annual_fee",
    "card_bonus_categories_count",
    "card_signup_bonus_value",
    "card_credit_score_requirement",
    
    # User-card fit features
    "user_spending_match_score",
    "reward_gap_vs_current_portfolio",
    "category_coverage_improvement",
    "annual_fee_vs_spending_ratio",
    "credit_score_eligibility",
    
    # Portfolio features
    "portfolio_diversification_score",
    "redundancy_with_existing_cards",
    "total_portfolio_annual_fees",
    
    # Contextual features
    "user_engagement_score",
    "card_popularity_score"
]


def load_card_catalog() -> List[Dict]:
    """Load card catalog data."""
    cards = []
    catalog_path = DATA_DIR / "card_catalog.csv"
    
    if not catalog_path.exists():
        print(f"❌ Card catalog not found: {catalog_path}")
        return []
    
    with open(catalog_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            row["base_rate_pct"] = float(row.get("base_rate_pct", 1.0))
            row["annual_fee"] = float(row.get("annual_fee", 0))
            row["signup_bonus_value"] = float(row.get("signup_bonus_value", 0))
            row["credit_score_min"] = int(row.get("credit_score_min", 650))
            cards.append(row)
    
    return cards


def load_user_data() -> List[Dict]:
    """Load user data for ranking training."""
    users = []
    users_path = DATA_DIR / "users.csv"
    
    if not users_path.exists():
        print(f"❌ Users data not found: {users_path}")
        return []
    
    with open(users_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            row["credit_score"] = int(row.get("credit_score", 700))
            row["annual_income"] = float(row.get("annual_income", 50000))
            users.append(row)
    
    return users


def generate_ranking_training_data(
    users: List[Dict], 
    cards: List[Dict], 
    num_samples_per_user: int = 10
) -> Tuple[List[List[float]], List[int], List[int]]:
    """Generate training data for ranking model."""
    
    import random
    random.seed(42)
    
    X = []  # Features
    y = []  # Relevance scores (0-3: not relevant to highly relevant)
    groups = []  # Group sizes for ranking
    
    print(f"Generating ranking data for {len(users)} users and {len(cards)} cards...")
    
    for user_idx, user in enumerate(users[:100]):  # Limit to first 100 users for training
        if user_idx % 20 == 0:
            print(f"Processing user {user_idx + 1}/100...")
        
        user_credit_score = int(user.get("credit_score", 700))
        user_income = float(user.get("annual_income", 50000))
        
        # Generate spending pattern for user (mock)
        user_spending = {
            "dining": random.uniform(100, 500),
            "groceries": random.uniform(200, 800),
            "gas": random.uniform(100, 400),
            "travel": random.uniform(0, 1000),
            "other": random.uniform(500, 2000)
        }
        total_spending = sum(user_spending.values())
        
        group_samples = []
        group_labels = []
        
        # Sample cards for this user
        sampled_cards = random.sample(cards, min(num_samples_per_user, len(cards)))
        
        for card in sampled_cards:
            # Extract card features
            base_rate = float(card.get("base_rate_pct", 1.0))
            annual_fee = float(card.get("annual_fee", 0))
            signup_bonus = float(card.get("signup_bonus_value", 0))
            min_credit_score = int(card.get("credit_score_min", 650))
            
            # Calculate derived features
            bonus_categories = len(card.get("bonus_categories", "{}").replace("{", "").replace("}", "").split(",")) if card.get("bonus_categories") else 0
            
            # User-card fit calculations
            spending_match = calculate_spending_match(user_spending, card)
            reward_gap = calculate_reward_gap(user_spending, card, base_rate)
            category_coverage = calculate_category_coverage(user_spending, card)
            fee_ratio = annual_fee / total_spending if total_spending > 0 else 0
            credit_eligible = 1.0 if user_credit_score >= min_credit_score else 0.0
            
            # Create feature vector
            feature_vector = [
                base_rate,  # card_base_reward_rate
                annual_fee,  # card_annual_fee
                bonus_categories,  # card_bonus_categories_count
                signup_bonus,  # card_signup_bonus_value
                min_credit_score,  # card_credit_score_requirement
                spending_match,  # user_spending_match_score
                reward_gap,  # reward_gap_vs_current_portfolio
                category_coverage,  # category_coverage_improvement
                fee_ratio,  # annual_fee_vs_spending_ratio
                credit_eligible,  # credit_score_eligibility
                random.uniform(0.3, 0.9),  # portfolio_diversification_score (mock)
                random.uniform(0.1, 0.7),  # redundancy_with_existing_cards (mock)
                annual_fee,  # total_portfolio_annual_fees (simplified)
                random.uniform(0.4, 0.8),  # user_engagement_score (mock)
                random.uniform(0.2, 0.9),  # card_popularity_score (mock)
            ]
            
            # Calculate relevance label (0-3)
            relevance = calculate_relevance_score(
                spending_match, reward_gap, annual_fee, credit_eligible, total_spending
            )
            
            group_samples.append(feature_vector)
            group_labels.append(relevance)
        
        # Add to training data
        X.extend(group_samples)
        y.extend(group_labels)
        groups.append(len(group_samples))
    
    print(f"Generated {len(X)} training samples across {len(groups)} user groups")
    return X, y, groups


def calculate_spending_match(user_spending: Dict, card: Dict) -> float:
    """Calculate how well card matches user spending patterns."""
    # Mock implementation - in real system would use actual bonus categories
    import random
    
    # Simulate bonus category matching
    total_spending = sum(user_spending.values())
    bonus_spending = user_spending.get("dining", 0) + user_spending.get("travel", 0)
    
    match_score = bonus_spending / total_spending if total_spending > 0 else 0
    return min(match_score + random.uniform(-0.1, 0.1), 1.0)


def calculate_reward_gap(user_spending: Dict, card: Dict, base_rate: float) -> float:
    """Calculate potential reward improvement."""
    total_spending = sum(user_spending.values())
    
    # Mock calculation: assume current cards give 1% cashback
    current_rewards = total_spending * 0.01
    potential_rewards = total_spending * (base_rate / 100)
    
    gap = max(0, potential_rewards - current_rewards)
    return min(gap / 100, 50.0)  # Normalize to reasonable range


def calculate_category_coverage(user_spending: Dict, card: Dict) -> float:
    """Calculate category coverage improvement."""
    import random
    
    # Mock - assume card covers some categories better
    coverage_score = random.uniform(0.2, 0.8)
    return coverage_score


def calculate_relevance_score(
    spending_match: float,
    reward_gap: float, 
    annual_fee: float,
    credit_eligible: float,
    total_spending: float
) -> int:
    """Calculate relevance score (0-3) for ranking."""
    
    if credit_eligible < 0.5:
        return 0  # Not eligible
    
    # Calculate value score
    value_score = 0
    
    # Spending match contribution
    if spending_match > 0.7:
        value_score += 2
    elif spending_match > 0.4:
        value_score += 1
    
    # Reward gap contribution
    if reward_gap > 20:
        value_score += 2
    elif reward_gap > 5:
        value_score += 1
    
    # Annual fee penalty
    fee_burden = annual_fee / total_spending if total_spending > 0 else 0
    if fee_burden > 0.02:  # Fee is >2% of spending
        value_score -= 1
    
    # Clamp to 0-3 range
    return max(0, min(3, value_score))


def train_ranker_model(
    X_train: List[List[float]], 
    y_train: List[int],
    groups_train: List[int],
    learning_rate: float = 0.1,
    max_depth: int = 6,
    n_estimators: int = 100
) -> LGBMRanker:
    """Train LightGBM ranker model."""
    
    print(f"Training LightGBM Ranker with lr={learning_rate}, depth={max_depth}, n_est={n_estimators}")
    
    # Initialize model
    model = LGBMRanker(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        max_depth=max_depth,
        random_state=42
    )
    
    # Train model
    model.fit(X_train, y_train, group=groups_train)
    
    return model


def evaluate_ranker(
    model: LGBMRanker, 
    X_test: List[List[float]], 
    y_test: List[int],
    groups_test: List[int]
) -> Dict:
    """Evaluate ranking model performance."""
    
    # Get predictions
    y_scores = model.predict(X_test)
    
    # Calculate metrics per group
    ndcg5_scores = []
    map5_scores = []
    
    start_idx = 0
    for group_size in groups_test:
        end_idx = start_idx + group_size
        
        group_true = y_test[start_idx:end_idx]
        group_scores = y_scores[start_idx:end_idx]
        
        # Calculate metrics for this group
        ndcg5 = ndcg_at_k(group_true, group_scores, k=5)
        map5 = map_at_k(group_true, group_scores, k=5)
        
        ndcg5_scores.append(ndcg5)
        map5_scores.append(map5)
        
        start_idx = end_idx
    
    # Average metrics
    avg_ndcg5 = sum(ndcg5_scores) / len(ndcg5_scores) if ndcg5_scores else 0.0
    avg_map5 = sum(map5_scores) / len(map5_scores) if map5_scores else 0.0
    
    return {
        "ndcg@5": avg_ndcg5,
        "map@5": avg_map5,
        "num_groups": len(groups_test),
        "total_samples": len(y_test)
    }


def save_ranker_mlflow(model: LGBMRanker, metrics: Dict, experiment_name: str = "card_ranker"):
    """Save ranker model to MLflow (mock implementation)."""
    
    # Create models directory
    MODELS_DIR.mkdir(exist_ok=True)
    
    # Mock MLflow model saving
    model_info = {
        "model_type": "LightGBM_Ranker",
        "experiment_name": experiment_name,
        "metrics": metrics,
        "params": {
            "n_estimators": model.n_estimators,
            "learning_rate": model.learning_rate,
            "max_depth": model.max_depth
        },
        "feature_names": RANKING_FEATURES,
        "feature_importances": dict(zip(RANKING_FEATURES, model.feature_importances_ or []))
    }
    
    # Save model metadata
    model_path = MODELS_DIR / "card_ranker_latest.json"
    with open(model_path, "w") as f:
        json.dump(model_info, f, indent=2)
    
    print(f"📊 Ranker model saved to: {model_path}")
    return model_path


def print_ranker_feature_importance(model: LGBMRanker):
    """Print feature importance for ranker."""
    if not model.feature_importances_:
        return
    
    print("\n🔍 RANKING FEATURE IMPORTANCE:")
    importance_pairs = list(zip(RANKING_FEATURES, model.feature_importances_))
    importance_pairs.sort(key=lambda x: x[1], reverse=True)
    
    for i, (feature, importance) in enumerate(importance_pairs[:10]):
        print(f"{i+1:2d}. {feature:30s}: {importance:.4f}")


def train_test_split_groups(X, y, groups, test_size=0.2, random_state=42):
    """Split data maintaining group structure."""
    import random
    random.seed(random_state)
    
    # Split groups instead of individual samples
    total_groups = len(groups)
    test_groups = int(total_groups * test_size)
    
    # Randomly select test groups
    group_indices = list(range(total_groups))
    random.shuffle(group_indices)
    
    test_group_indices = set(group_indices[:test_groups])
    train_group_indices = set(group_indices[test_groups:])
    
    # Split data
    X_train, X_test = [], []
    y_train, y_test = [], []
    groups_train, groups_test = [], []
    
    start_idx = 0
    for group_idx, group_size in enumerate(groups):
        end_idx = start_idx + group_size
        
        group_X = X[start_idx:end_idx]
        group_y = y[start_idx:end_idx]
        
        if group_idx in train_group_indices:
            X_train.extend(group_X)
            y_train.extend(group_y)
            groups_train.append(group_size)
        else:
            X_test.extend(group_X)
            y_test.extend(group_y)
            groups_test.append(group_size)
        
        start_idx = end_idx
    
    return X_train, X_test, y_train, y_test, groups_train, groups_test


def main():
    """Main ranker training function."""
    parser = argparse.ArgumentParser(description="Train card ranking model")
    parser.add_argument("--learning-rate", type=float, default=0.1,
                       help="Learning rate")
    parser.add_argument("--max-depth", type=int, default=6,
                       help="Max tree depth")
    parser.add_argument("--n-estimators", type=int, default=100,
                       help="Number of estimators")
    parser.add_argument("--test-size", type=float, default=0.2,
                       help="Test set proportion")
    parser.add_argument("--samples-per-user", type=int, default=10,
                       help="Number of card samples per user")
    
    args = parser.parse_args()
    
    print("🚀 Starting card ranker training...")
    print(f"Target: MAP@5 score for ranking evaluation")
    
    # Load data
    print(f"\n📊 Loading card catalog and user data...")
    cards = load_card_catalog()
    users = load_user_data()
    
    if not cards or not users:
        print("❌ Missing required data files!")
        return 1
    
    print(f"Loaded {len(cards)} cards and {len(users)} users")
    
    # Generate training data
    print(f"\n🔧 Generating ranking training data...")
    X, y, groups = generate_ranking_training_data(
        users, cards, num_samples_per_user=args.samples_per_user
    )
    
    if not X:
        print("❌ Failed to generate training data!")
        return 1
    
    # Split data
    print(f"\n📊 Splitting data (test_size={args.test_size})...")
    X_train, X_test, y_train, y_test, groups_train, groups_test = train_test_split_groups(
        X, y, groups, test_size=args.test_size, random_state=42
    )
    
    print(f"Training: {len(X_train)} samples, {len(groups_train)} groups")
    print(f"Test: {len(X_test)} samples, {len(groups_test)} groups")
    
    # Train model
    print(f"\n🤖 Training LightGBM Ranker...")
    model = train_ranker_model(
        X_train, y_train, groups_train,
        learning_rate=args.learning_rate,
        max_depth=args.max_depth,
        n_estimators=args.n_estimators
    )
    
    # Evaluate model
    print(f"\n📈 Evaluating ranking performance...")
    metrics = evaluate_ranker(model, X_test, y_test, groups_test)
    
    # Print results
    print(f"\n✅ RANKING RESULTS:")
    print(f"NDCG@5:    {metrics['ndcg@5']:.3f}")
    print(f"MAP@5:     {metrics['map@5']:.3f}")
    print(f"Groups:    {metrics['num_groups']}")
    print(f"Samples:   {metrics['total_samples']}")
    
    # Check target MAP@5
    if metrics['map@5'] >= 0.3:  # Reasonable target for mock implementation
        print(f"🎯 GOOD RANKING PERFORMANCE: MAP@5 {metrics['map@5']:.3f} ✅")
    else:
        print(f"⚠️  Low ranking performance: MAP@5 {metrics['map@5']:.3f}")
        print("💡 Consider improving features or model complexity")
    
    # Feature importance
    print_ranker_feature_importance(model)
    
    # Save model
    print(f"\n💾 Saving ranker model to MLflow...")
    model_path = save_ranker_mlflow(model, metrics)
    
    print(f"\n✅ Card ranker training complete!")
    print(f"MAP@5: {metrics['map@5']:.3f}")
    
    return 0


if __name__ == "__main__":
    exit(main())