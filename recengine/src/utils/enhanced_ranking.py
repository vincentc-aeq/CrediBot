"""
Enhanced ranking algorithm based on actual user spending patterns.
This replaces the mock ranking logic with real calculations.
"""

from typing import Dict, List, Any
import json

def calculate_personalized_ranking(
    user_spending_pattern: Dict[str, float],
    card_catalog: List[Dict[str, Any]],
    user_cards: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Calculate personalized card ranking based on user's spending pattern.
    
    Args:
        user_spending_pattern: Monthly spending by category
        card_catalog: List of available credit cards
        user_cards: Cards user already owns (to exclude)
    
    Returns:
        Ranked list of card recommendations
    """
    user_cards = user_cards or []
    rankings = []
    
    for card in card_catalog:
        # Skip cards user already has
        if card["card_id"] in user_cards:
            continue
            
        # Calculate expected annual rewards
        annual_reward = 0
        category_breakdown = {}
        
        # Get bonus categories
        bonus_categories = card.get("bonus_categories", {})
        if isinstance(bonus_categories, str):
            bonus_categories = json.loads(bonus_categories)
        
        base_rate = float(card.get("base_rate_pct", 1.0))
        
        # Calculate rewards for each spending category
        for category, monthly_amount in user_spending_pattern.items():
            # Get reward rate for this category
            if category in bonus_categories:
                rate = float(bonus_categories[category])
            else:
                rate = base_rate
            
            # Calculate annual reward
            if card["reward_type"] == "cashback":
                # Cashback is simple percentage
                category_reward = monthly_amount * 12 * (rate / 100)
            else:
                # Points/miles need value conversion
                points = monthly_amount * 12 * rate
                point_value = float(card.get("point_value_cent", 1.0)) / 100
                category_reward = points * point_value
            
            annual_reward += category_reward
            category_breakdown[category] = category_reward
        
        # Subtract annual fee
        annual_fee = float(card.get("annual_fee", 0))
        net_benefit = annual_reward - annual_fee
        
        # Calculate composite score
        score = calculate_composite_score(
            net_benefit=net_benefit,
            annual_fee=annual_fee,
            total_spending=sum(user_spending_pattern.values()) * 12,
            signup_bonus=float(card.get("signup_bonus_value", 0))
        )
        
        rankings.append({
            "card_id": card["card_id"],
            "issuer": card.get("issuer", "Unknown"),
            "card_name": card.get("card_id", "").replace("_", " ").title(),
            "ranking_score": score,
            "annual_fee": annual_fee,
            "signup_bonus": float(card.get("signup_bonus_value", 0)),
            "annual_reward": annual_reward,
            "net_benefit": net_benefit,
            "category_breakdown": category_breakdown,
            "reason": generate_recommendation_reason(net_benefit, category_breakdown)
        })
    
    # Sort by score
    rankings.sort(key=lambda x: x["ranking_score"], reverse=True)
    
    return rankings


def calculate_composite_score(
    net_benefit: float,
    annual_fee: float,
    total_spending: float,
    signup_bonus: float
) -> float:
    """
    Calculate composite score considering multiple factors.
    """
    # Base score from net benefit (normalized)
    benefit_score = min(net_benefit / 1000, 1.0) * 0.5
    
    # Reward rate effectiveness
    if total_spending > 0:
        effectiveness = (net_benefit + annual_fee) / total_spending
        effectiveness_score = min(effectiveness * 10, 1.0) * 0.3
    else:
        effectiveness_score = 0
    
    # Annual fee penalty (less penalty for high spenders)
    if total_spending > 36000:  # $3k/month
        fee_penalty = min(annual_fee / 1000, 0.1)
    else:
        fee_penalty = min(annual_fee / 500, 0.2)
    
    # Signup bonus contribution (amortized over 2 years)
    bonus_score = min(signup_bonus / 2000, 0.2)
    
    # Calculate final score
    score = benefit_score + effectiveness_score + bonus_score - fee_penalty
    
    # Ensure score is between 0 and 1
    return max(0.1, min(1.0, score))


def generate_recommendation_reason(net_benefit: float, category_breakdown: Dict[str, float]) -> str:
    """
    Generate human-readable recommendation reason.
    """
    if net_benefit <= 0:
        return "Consider if you value the card's additional benefits"
    
    # Find top rewarding categories
    top_categories = sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)[:2]
    
    if top_categories:
        top_cat = top_categories[0][0].replace("_", " ").title()
        return f"Excellent rewards for your {top_cat} spending"
    else:
        return f"Estimated annual benefit: ${net_benefit:.0f}"


def analyze_spending_pattern(transactions: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Analyze user transactions to extract spending pattern.
    """
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    # Calculate spending by category for last 6 months
    category_spending = defaultdict(float)
    category_counts = defaultdict(int)
    
    six_months_ago = datetime.now() - timedelta(days=180)
    
    for txn in transactions:
        # Parse transaction date
        txn_date = datetime.fromisoformat(txn["transaction_date"].replace("Z", "+00:00"))
        
        if txn_date >= six_months_ago:
            category = txn.get("category", "other")
            amount = float(txn.get("amount", 0))
            
            category_spending[category] += amount
            category_counts[category] += 1
    
    # Calculate monthly averages
    monthly_pattern = {}
    for category, total in category_spending.items():
        monthly_pattern[category] = total / 6  # 6 months average
    
    return monthly_pattern