#!/usr/bin/env python3
"""
RecEngine API Demo Script
Demonstrates the full API functionality with realistic scenarios.
"""

import sys
import time
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from api import (
    app, startup, TransactionRequest, RankingRequest, 
    RewardEstimationRequest, PortfolioOptimizationRequest
)

def print_header(title: str):
    """Print formatted section header."""
    print(f"\n{'='*60}")
    print(f"🎯 {title}")
    print(f"{'='*60}")

def print_section(title: str):
    """Print formatted subsection."""
    print(f"\n🔹 {title}")
    print(f"{'-'*40}")

def demo_trigger_classification():
    """Demo trigger classification with various scenarios."""
    print_header("TRIGGER CLASSIFICATION DEMO")
    
    # Scenario 1: High-value dining transaction
    print_section("Scenario 1: High-value dining transaction")
    request1 = TransactionRequest(
        user_id="demo_user_001",
        amount=250.0,
        category="dining",
        current_card_id="citi_double_cash_card",
        merchant="Fancy Restaurant"
    )
    
    response1 = app.routes["POST /trigger-classify"](request1)
    print(f"Transaction: ${request1.amount:.2f} at {request1.merchant} ({request1.category})")
    print(f"Recommend: {response1.recommend_flag}")
    print(f"Confidence: {response1.confidence_score:.1%}")
    print(f"Suggested Card: {response1.suggested_card_id}")
    print(f"Extra Reward: ${response1.extra_reward:.2f}")
    print(f"Reasoning: {response1.reasoning}")
    
    # Scenario 2: Small grocery purchase
    print_section("Scenario 2: Small grocery purchase")
    request2 = TransactionRequest(
        user_id="demo_user_001",
        amount=35.0,
        category="groceries",
        current_card_id="citi_double_cash_card",
        merchant="Local Grocery"
    )
    
    response2 = app.routes["POST /trigger-classify"](request2)
    print(f"Transaction: ${request2.amount:.2f} at {request2.merchant} ({request2.category})")
    print(f"Recommend: {response2.recommend_flag}")
    print(f"Confidence: {response2.confidence_score:.1%}")
    print(f"Reasoning: {response2.reasoning}")
    
    # Scenario 3: Large travel purchase
    print_section("Scenario 3: Large travel purchase")
    request3 = TransactionRequest(
        user_id="demo_user_002",
        amount=1200.0,
        category="travel",
        current_card_id="wells_fargo_active_cash_card",
        merchant="Airline Booking"
    )
    
    response3 = app.routes["POST /trigger-classify"](request3)
    print(f"Transaction: ${request3.amount:.2f} at {request3.merchant} ({request3.category})")
    print(f"Recommend: {response3.recommend_flag}")
    print(f"Confidence: {response3.confidence_score:.1%}")
    print(f"Suggested Card: {response3.suggested_card_id}")
    print(f"Extra Reward: ${response3.extra_reward:.2f}")
    print(f"Reasoning: {response3.reasoning}")

def demo_personalized_ranking():
    """Demo personalized ranking for different user profiles."""
    print_header("PERSONALIZED RANKING DEMO")
    
    # User Profile 1: High dining spender
    print_section("User Profile 1: High dining spender")
    request1 = RankingRequest(
        user_id="foodie_user",
        user_cards=["citi_double_cash_card"],
        spending_pattern={
            "dining": 2000.0,
            "groceries": 500.0,
            "gas": 200.0,
            "travel": 300.0,
            "other": 1000.0
        }
    )
    
    response1 = app.routes["POST /personalized-ranking"](request1)
    print(f"User has: {request1.user_cards}")
    print(f"Monthly dining: ${request1.spending_pattern['dining']:.0f}")
    print(f"Overall ranking score: {response1.ranking_score:.3f}")
    print(f"\nTop recommendations:")
    for i, card in enumerate(response1.ranked_cards[:3], 1):
        print(f"  {i}. {card['card_name']}")
        print(f"     Score: {card['ranking_score']:.3f} | Fee: ${card['annual_fee']:.0f}")
        print(f"     Reason: {card['reason']}")
    
    # User Profile 2: Travel enthusiast
    print_section("User Profile 2: Travel enthusiast")
    request2 = RankingRequest(
        user_id="traveler_user",
        user_cards=["chase_freedom_unlimited"],
        spending_pattern={
            "dining": 400.0,
            "groceries": 600.0,
            "gas": 300.0,
            "travel": 1800.0,
            "other": 900.0
        }
    )
    
    response2 = app.routes["POST /personalized-ranking"](request2)
    print(f"User has: {request2.user_cards}")
    print(f"Monthly travel: ${request2.spending_pattern['travel']:.0f}")
    print(f"Overall ranking score: {response2.ranking_score:.3f}")
    print(f"\nTop recommendations:")
    for i, card in enumerate(response2.ranked_cards[:3], 1):
        print(f"  {i}. {card['card_name']}")
        print(f"     Score: {card['ranking_score']:.3f} | Signup: ${card['signup_bonus']:.0f}")

def demo_reward_estimation():
    """Demo reward estimation for different cards and spending patterns."""
    print_header("REWARD ESTIMATION DEMO")
    
    # Estimation 1: AmEx Gold for dining-heavy spender
    print_section("AmEx Gold for dining-heavy spender")
    request1 = RewardEstimationRequest(
        user_id="demo_user",
        card_id="american_express_gold_card",
        projected_spending={
            "dining": 2400.0,
            "groceries": 1800.0,
            "gas": 1200.0,
            "travel": 2000.0,
            "other": 3000.0
        },
        time_horizon_months=12
    )
    
    response1 = app.routes["POST /estimate-rewards"](request1)
    print(f"Card: American Express Gold")
    print(f"Annual spending: ${sum(request1.projected_spending.values()):,.0f}")
    print(f"Estimated annual reward: ${response1.estimated_annual_reward:.2f}")
    print(f"\nCategory breakdown:")
    for category, reward in response1.category_breakdown.items():
        spending = request1.projected_spending[category]
        rate = (reward / spending * 100) if spending > 0 else 0
        print(f"  {category.title()}: ${reward:.2f} ({rate:.1f}% on ${spending:.0f})")
    
    # Estimation 2: Chase Sapphire for travel spender
    print_section("Chase Sapphire for travel spender")
    request2 = RewardEstimationRequest(
        user_id="demo_user",
        card_id="chase_sapphire_preferred",
        projected_spending={
            "dining": 1200.0,
            "groceries": 1500.0,
            "gas": 800.0,
            "travel": 3000.0,
            "other": 2500.0
        },
        time_horizon_months=12
    )
    
    response2 = app.routes["POST /estimate-rewards"](request2)
    print(f"Card: Chase Sapphire Preferred")
    print(f"Annual spending: ${sum(request2.projected_spending.values()):,.0f}")
    print(f"Estimated annual reward: ${response2.estimated_annual_reward:.2f}")

def demo_portfolio_optimization():
    """Demo portfolio optimization for different scenarios."""
    print_header("PORTFOLIO OPTIMIZATION DEMO")
    
    # Scenario 1: Basic portfolio optimization
    print_section("Scenario 1: Basic 2-card portfolio")
    request1 = PortfolioOptimizationRequest(
        user_id="basic_user",
        current_cards=["citi_double_cash_card", "chase_freedom_unlimited"],
        spending_pattern={
            "dining": 1200.0,
            "groceries": 1800.0,
            "gas": 1000.0,
            "travel": 800.0,
            "other": 2200.0
        },
        max_cards=4
    )
    
    response1 = app.routes["POST /optimize-portfolio"](request1)
    print(f"Current cards: {len(request1.current_cards)} cards")
    print(f"Annual spending: ${sum(request1.spending_pattern.values()):,.0f}")
    print(f"Current portfolio score: {response1.current_portfolio_score:.3f}")
    print(f"Optimized portfolio score: {response1.optimized_portfolio_score:.3f}")
    print(f"Improvement: {(response1.optimized_portfolio_score - response1.current_portfolio_score):.3f}")
    
    print(f"\nRecommendations ({len(response1.recommendations)}):")
    for i, rec in enumerate(response1.recommendations, 1):
        print(f"  {i}. {rec['action'].upper()}: {rec.get('card_name', rec.get('card_id', 'Unknown'))}")
        print(f"     Impact: +{rec.get('impact_score', 0):.3f} score")
        print(f"     Reason: {rec['reasoning']}")
        if 'annual_fee' in rec:
            print(f"     Annual fee: ${rec['annual_fee']:.0f}")
    
    # Scenario 2: High-fee portfolio optimization
    print_section("Scenario 2: High-fee portfolio needing optimization")
    request2 = PortfolioOptimizationRequest(
        user_id="premium_user",
        current_cards=["chase_sapphire_reserve", "american_express_platinum_card"],
        spending_pattern={
            "dining": 800.0,
            "groceries": 600.0,
            "gas": 400.0,
            "travel": 1000.0,
            "other": 1200.0
        },
        max_cards=5,
        consider_annual_fees=True
    )
    
    response2 = app.routes["POST /optimize-portfolio"](request2)
    print(f"Current cards: Premium cards with high fees")
    print(f"Annual spending: ${sum(request2.spending_pattern.values()):,.0f}")
    print(f"Current portfolio score: {response2.current_portfolio_score:.3f}")
    print(f"Optimized portfolio score: {response2.optimized_portfolio_score:.3f}")
    
    if response2.recommendations:
        print(f"\nOptimization suggestions:")
        for rec in response2.recommendations:
            print(f"  • {rec['reasoning']}")
            if 'annual_fee_savings' in rec:
                print(f"    Potential savings: ${rec['annual_fee_savings']:.0f}/year")

def demo_system_info():
    """Demo system information endpoints."""
    print_header("SYSTEM INFORMATION DEMO")
    
    # Health check
    print_section("Health Status")
    health = app.routes["GET /health"]()
    print(f"Status: {health.status}")
    print(f"Models loaded: {health.models_loaded}")
    print(f"Uptime: {health.uptime_seconds:.1f} seconds")
    print(f"Timestamp: {health.timestamp}")
    
    # Models info
    print_section("Model Information")
    models_info = app.routes["GET /models/info"]()
    print(f"API Version: {models_info.version}")
    print(f"Last updated: {models_info.last_updated}")
    
    print(f"\nLoaded models:")
    for model_name, model_info in models_info.models.items():
        print(f"  • {model_name}:")
        print(f"    Type: {model_info.get('type', 'Unknown')}")
        print(f"    Features: {model_info.get('features', 0)}")
        if model_info.get('metrics'):
            metrics = model_info['metrics']
            for metric, value in metrics.items():
                if isinstance(value, (int, float)):
                    print(f"    {metric}: {value:.3f}")

def main():
    """Run the complete API demo."""
    print("🚀 RecEngine API Interactive Demo")
    print("This demo showcases all API endpoints with realistic scenarios")
    
    # Initialize the API
    startup()
    
    # Run all demos
    demo_system_info()
    demo_trigger_classification()
    demo_personalized_ranking()
    demo_reward_estimation()
    demo_portfolio_optimization()
    
    print_header("DEMO COMPLETED")
    print("✅ All API endpoints demonstrated successfully!")
    print("🚀 RecEngine API is ready for production deployment!")
    
    print(f"\n📚 API Documentation:")
    print(f"   Health: GET /health")
    print(f"   Models: GET /models/info")
    print(f"   Trigger: POST /trigger-classify")
    print(f"   Ranking: POST /personalized-ranking")
    print(f"   Rewards: POST /estimate-rewards")
    print(f"   Portfolio: POST /optimize-portfolio")
    
    print(f"\n🐳 Docker deployment:")
    print(f"   docker build -t recengine-api .")
    print(f"   docker run -p 8080:8080 recengine-api")
    
    print(f"\n🔧 Local development:")
    print(f"   uvicorn src.api:app --reload --port 8000")

if __name__ == "__main__":
    main()