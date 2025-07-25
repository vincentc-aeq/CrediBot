#!/usr/bin/env python3
"""
FastAPI application for RecEngine online serving.
Provides real-time ML-powered credit card recommendations.
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import sys
import warnings
warnings.filterwarnings('ignore')

# Add utils to path
sys.path.append(str(Path(__file__).parent))

# Real FastAPI imports
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Import our ML utilities
try:
    from utils.reward_calc import RewardCalculator
    from utils.action_selector import ActionSelector
except ImportError:
    print("⚠️ Warning: Could not import utils modules")
    RewardCalculator = None
    ActionSelector = None

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "models"

# Initialize FastAPI app
app = FastAPI(
    title="RecEngine API",
    version="1.0.0",
    description="Credit card recommendation engine with ML-powered insights"
)

# Add startup event
@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    startup()

# Global state
models = {}
reward_calculator = None
action_selector = None
user_cooldowns = {}  # In-memory cooldown tracking

# Request/Response models
class TransactionRequest(BaseModel):
    """Request for transaction analysis."""
    user_id: str
    amount: float
    category: str
    current_card_id: Optional[str] = None
    merchant: Optional[str] = None
    timestamp: Optional[str] = None

class RankingRequest(BaseModel):
    """Request for personalized ranking."""
    user_id: str
    user_cards: Optional[List[str]] = None
    spending_pattern: Optional[Dict[str, float]] = None
    preferences: Optional[Dict[str, Any]] = None

class RewardEstimationRequest(BaseModel):
    """Request for reward estimation."""
    user_id: str
    card_id: str
    projected_spending: Dict[str, float]
    time_horizon_months: Optional[int] = 12

class PortfolioOptimizationRequest(BaseModel):
    """Request for portfolio optimization."""
    user_id: str
    current_cards: List[str]
    spending_pattern: Dict[str, float]
    max_cards: Optional[int] = 5
    consider_annual_fees: Optional[bool] = True

class TriggerResponse(BaseModel):
    """Response for trigger classification."""
    recommend_flag: bool
    confidence_score: float
    suggested_card_id: str
    extra_reward: float
    reasoning: str

class RankingResponse(BaseModel):
    """Response for personalized ranking."""
    ranked_cards: List[Dict[str, Any]]
    user_id: str
    ranking_score: float

class RewardEstimationResponse(BaseModel):
    """Response for reward estimation."""
    estimated_annual_reward: float
    category_breakdown: Dict[str, float]
    compared_to_current: Optional[float] = None

class PortfolioOptimizationResponse(BaseModel):
    """Response for portfolio optimization."""
    recommendations: List[Dict[str, Any]]
    current_portfolio_score: float
    optimized_portfolio_score: float

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    models_loaded: bool
    uptime_seconds: float

class ModelInfoResponse(BaseModel):
    """Model information response."""
    models: Dict[str, Dict[str, Any]]
    last_updated: str
    version: str

# Startup time for uptime calculation
startup_time = time.time()

def load_models():
    """Load ML models from MLflow (mock implementation)."""
    global models, reward_calculator, action_selector
    
    try:
        # Load trigger classifier
        trigger_path = MODELS_DIR / "trigger_classifier_latest.json"
        if trigger_path.exists():
            with open(trigger_path, "r") as f:
                models["trigger_classifier"] = json.load(f)
        
        # Load ranker model
        ranker_path = MODELS_DIR / "card_ranker_latest.json"
        if ranker_path.exists():
            with open(ranker_path, "r") as f:
                models["card_ranker"] = json.load(f)
        
        # Load Optuna results
        optuna_path = MODELS_DIR / "optuna_combined_optimization.json"
        if optuna_path.exists():
            with open(optuna_path, "r") as f:
                models["hyperparameters"] = json.load(f)
        
        # Initialize utility classes
        if RewardCalculator:
            reward_calculator = RewardCalculator()
        if ActionSelector:
            action_selector = ActionSelector()
        
        print(f"✅ Loaded {len(models)} models successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to load models: {e}")
        return False

def check_user_cooldown(user_id: str, cooldown_minutes: int = 1) -> bool:
    """Check if user is in cooldown period."""
    # Temporarily disable cooldown for testing
    return False
    
    if user_id not in user_cooldowns:
        return False
    
    last_recommendation = user_cooldowns[user_id]
    cooldown_period = timedelta(minutes=cooldown_minutes)
    
    return datetime.now() - last_recommendation < cooldown_period

def update_user_cooldown(user_id: str):
    """Update user's last recommendation timestamp."""
    user_cooldowns[user_id] = datetime.now()

def load_card_catalog() -> List[Dict]:
    """Load card catalog for recommendations."""
    cards = []
    catalog_path = DATA_DIR / "card_catalog.csv"
    
    if not catalog_path.exists():
        return []
    
    import csv
    with open(catalog_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            row["base_rate_pct"] = float(row.get("base_rate_pct", 1.0))
            row["annual_fee"] = float(row.get("annual_fee", 0))
            row["signup_bonus_value"] = float(row.get("signup_bonus_value", 0))
            cards.append(row)
    
    return cards

# API Endpoints

@app.get("/health")
def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        models_loaded=len(models) > 0,
        uptime_seconds=time.time() - startup_time
    )

@app.get("/models/info")
def models_info() -> ModelInfoResponse:
    """Get information about loaded models."""
    model_info = {}
    
    for model_name, model_data in models.items():
        if isinstance(model_data, dict):
            model_info[model_name] = {
                "type": model_data.get("model_type", "unknown"),
                "metrics": model_data.get("metrics", {}),
                "params": model_data.get("params", {}),
                "features": len(model_data.get("feature_names", []))
            }
    
    return ModelInfoResponse(
        models=model_info,
        last_updated=datetime.now().isoformat(),
        version="1.0.0"
    )

@app.post("/trigger-classify")
def trigger_classify(request: TransactionRequest) -> TriggerResponse:
    """
    Classify if a transaction should trigger a recommendation.
    Returns recommendation flag, confidence, and suggested card.
    """
    
    # Check cooldown
    if check_user_cooldown(request.user_id, cooldown_minutes=60):
        return TriggerResponse(
            recommend_flag=False,
            confidence_score=0.0,
            suggested_card_id="",
            extra_reward=0.0,
            reasoning="User in cooldown period"
        )
    
    # Validate models are loaded
    if not models.get("trigger_classifier"):
        raise HTTPException(status_code=503, detail="Trigger classifier not available")
    
    if not reward_calculator:
        raise HTTPException(status_code=503, detail="Reward calculator not available")
    
    try:
        # Analyze transaction rewards
        analysis = reward_calculator.analyze_transaction(
            amount=request.amount,
            category=request.category,
            current_card_id=request.current_card_id
        )
        
        # Mock trigger classification (in real system would use actual model)
        # Use reward analysis to determine if we should trigger
        should_trigger = False
        confidence = 0.5
        reasoning = "No significant benefit found"
        
        # Generate category-specific reasoning
        def get_category_reasoning(category: str, best_card: any, current_rate: float, best_rate: float) -> str:
            category_display = {
                'dining': 'restaurants',
                'travel': 'travel',
                'groceries': 'groceries', 
                'gas': 'gas stations',
                'shopping': 'shopping'
            }.get(category, category)
            
            if best_card.reward_type in ['points', 'miles']:
                return f"Earns {best_rate:.0f}x {best_card.reward_type} on {category_display} vs your current {current_rate:.1f}x"
            else:
                return f"Earns {best_rate:.0f}% cashback on {category_display} vs your current {current_rate:.1f}%"

        # Business rules for triggering (focus on reward gap percentage + smart thresholds)
        if analysis.reward_gap_pct > 200:  # Very high reward gap always triggers
            should_trigger = True
            confidence = min(0.95, 0.7 + (analysis.reward_gap_pct / 500))
            reasoning = get_category_reasoning(request.category, analysis.best_card_reward, 
                                            analysis.current_card_reward.applicable_rate if analysis.current_card_reward else 0,
                                            analysis.best_card_reward.applicable_rate)
        elif analysis.reward_gap_pct > 100 and analysis.extra_reward_amt > 0.05:  # Good gap + small absolute benefit
            should_trigger = True
            confidence = min(0.85, 0.6 + (analysis.reward_gap_pct / 300))
            reasoning = get_category_reasoning(request.category, analysis.best_card_reward,
                                            analysis.current_card_reward.applicable_rate if analysis.current_card_reward else 0,
                                            analysis.best_card_reward.applicable_rate)
        elif analysis.extra_reward_amt > 0.15:  # Meaningful absolute savings
            should_trigger = True
            confidence = 0.8
            reasoning = f"Worth considering: ${analysis.extra_reward_amt:.2f} more in rewards for {request.category}"
        elif request.amount > 100 and analysis.reward_gap_pct > 50 and analysis.extra_reward_amt > 0.10:
            should_trigger = True
            confidence = 0.7
            reasoning = get_category_reasoning(request.category, analysis.best_card_reward,
                                            analysis.current_card_reward.applicable_rate if analysis.current_card_reward else 0,
                                            analysis.best_card_reward.applicable_rate)
        elif analysis.reward_gap_pct > 75 and analysis.extra_reward_amt > 0.05 and request.amount > 30:
            should_trigger = True
            confidence = 0.65
            reasoning = get_category_reasoning(request.category, analysis.best_card_reward,
                                            analysis.current_card_reward.applicable_rate if analysis.current_card_reward else 0,
                                            analysis.best_card_reward.applicable_rate)
        
        # Update cooldown if recommending
        if should_trigger:
            update_user_cooldown(request.user_id)
        
        return TriggerResponse(
            recommend_flag=should_trigger,
            confidence_score=confidence,
            suggested_card_id=analysis.best_card_reward.card_id,
            extra_reward=analysis.extra_reward_amt,
            reasoning=reasoning
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@app.post("/personalized-ranking")
def personalized_ranking(request: RankingRequest) -> RankingResponse:
    """
    Get personalized card ranking for homepage display.
    Returns ranked list of card recommendations based on actual spending patterns.
    """
    
    # Validate models are loaded
    if not models.get("card_ranker"):
        raise HTTPException(status_code=503, detail="Card ranker not available")
    
    try:
        # Load card catalog
        cards = load_card_catalog()
        if not cards:
            raise HTTPException(status_code=503, detail="Card catalog not available")
        
        # Enhanced ranking logic based on real spending patterns
        user_cards = request.user_cards or []
        spending_pattern = request.spending_pattern or {}
        
        # If no spending pattern provided, use default pattern
        if not spending_pattern:
            spending_pattern = {
                "dining": 600,
                "groceries": 400, 
                "gas": 200,
                "travel": 150,
                "other": 1650
            }
        
        ranked_cards = []
        for card in cards:
            # Skip cards user already has
            if card["card_id"] in user_cards:
                continue
            
            # Calculate expected annual rewards based on spending pattern
            annual_reward = 0
            category_breakdown = {}
            
            # Get bonus categories (parse JSON if string)
            bonus_categories = card.get("bonus_categories", {})
            if isinstance(bonus_categories, str):
                try:
                    import json
                    bonus_categories = json.loads(bonus_categories)
                except:
                    bonus_categories = {}
            
            base_rate = float(card.get("base_rate_pct", 1.0))
            
            # Calculate rewards for each spending category
            for category, monthly_amount in spending_pattern.items():
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
            total_spending = sum(spending_pattern.values()) * 12
            
            # Base score from net benefit (normalized)
            benefit_score = min(net_benefit / 1000, 1.0) * 0.5
            
            # Reward rate effectiveness
            if total_spending > 0:
                effectiveness = annual_reward / total_spending
                effectiveness_score = min(effectiveness * 10, 1.0) * 0.3
            else:
                effectiveness_score = 0
            
            # Annual fee penalty (less penalty for high spenders)
            if total_spending > 36000:  # $3k/month
                fee_penalty = min(annual_fee / 1000, 0.1)
            else:
                fee_penalty = min(annual_fee / 500, 0.2)
            
            # Signup bonus contribution (amortized over 2 years)
            signup_bonus = float(card.get("signup_bonus_value", 0))
            bonus_score = min(signup_bonus / 2000, 0.2)
            
            # Calculate final score
            score = benefit_score + effectiveness_score + bonus_score - fee_penalty
            score = max(0.1, min(1.0, score))
            
            # Generate recommendation reason
            if net_benefit <= 0:
                reason = "Consider if you value the card's additional benefits"
            else:
                # Find top rewarding categories
                top_categories = sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)[:2]
                if top_categories:
                    top_cat = top_categories[0][0].replace("_", " ").title()
                    reason = f"Excellent rewards for your {top_cat} spending"
                else:
                    reason = f"Estimated annual benefit: ${net_benefit:.0f}"
            
            ranked_cards.append({
                "card_id": card["card_id"],
                "issuer": card.get("issuer", "Unknown"),
                "card_name": card.get("card_id", "").replace("_", " ").title(),
                "ranking_score": score,
                "annual_fee": annual_fee,
                "signup_bonus": signup_bonus,
                "reason": reason
            })
        
        # Sort by ranking score
        ranked_cards.sort(key=lambda x: x["ranking_score"], reverse=True)
        
        # Return top 5
        top_cards = ranked_cards[:5]
        
        return RankingResponse(
            ranked_cards=top_cards,
            user_id=request.user_id,
            ranking_score=sum(card["ranking_score"] for card in top_cards) / len(top_cards) if top_cards else 0.0
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking error: {str(e)}")

@app.post("/estimate-rewards")
def estimate_rewards(request: RewardEstimationRequest) -> RewardEstimationResponse:
    """
    Estimate potential rewards for a specific card given spending pattern.
    """
    
    if not reward_calculator:
        raise HTTPException(status_code=503, detail="Reward calculator not available")
    
    try:
        # Load card catalog to get card details
        cards = load_card_catalog()
        target_card = None
        for card in cards:
            if card["card_id"] == request.card_id:
                target_card = card
                break
        
        if not target_card:
            raise HTTPException(status_code=404, detail="Card not found")
        
        # Calculate rewards for each category
        category_rewards = {}
        total_estimated_reward = 0.0
        
        for category, amount in request.projected_spending.items():
            if amount <= 0:
                continue
            
            # Mock reward calculation (simplified)
            base_rate = float(target_card.get("base_rate_pct", 1.0)) / 100
            
            # Apply category bonuses (mock)
            category_multiplier = 1.0
            if category in ["dining", "travel"]:
                category_multiplier = 2.0  # 2x bonus
            elif category in ["groceries", "gas"]:
                category_multiplier = 1.5  # 1.5x bonus
            
            category_reward = amount * base_rate * category_multiplier
            category_rewards[category] = category_reward
            total_estimated_reward += category_reward
        
        # Annualize based on time horizon
        months = request.time_horizon_months or 12
        annual_reward = total_estimated_reward * (12 / months)
        
        return RewardEstimationResponse(
            estimated_annual_reward=annual_reward,
            category_breakdown=category_rewards,
            compared_to_current=None  # Could compare to current portfolio
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimation error: {str(e)}")

@app.post("/optimize-portfolio")
def optimize_portfolio(request: PortfolioOptimizationRequest) -> PortfolioOptimizationResponse:
    """
    Analyze current card portfolio and suggest optimizations.
    """
    
    try:
        # Load card catalog
        cards = load_card_catalog()
        if not cards:
            raise HTTPException(status_code=503, detail="Card catalog not available")
        
        # Calculate current portfolio performance
        current_cards = []
        for card in cards:
            if card["card_id"] in request.current_cards:
                current_cards.append(card)
        
        if not current_cards:
            raise HTTPException(status_code=400, detail="No valid current cards found")
        
        # Mock portfolio analysis
        current_score = 0.6  # Base portfolio score
        total_spending = sum(request.spending_pattern.values())
        
        # Calculate current portfolio efficiency
        total_fees = sum(float(card.get("annual_fee", 0)) for card in current_cards)
        fee_burden = total_fees / total_spending if total_spending > 0 else 0
        current_score -= min(fee_burden * 0.5, 0.3)
        
        # Generate recommendations
        recommendations = []
        
        # If portfolio is small, suggest adding cards
        if len(current_cards) < 3:
            available_cards = [card for card in cards if card["card_id"] not in request.current_cards]
            for card in available_cards[:2]:
                recommendations.append({
                    "action": "add",
                    "card_id": card["card_id"],
                    "card_name": card.get("card_id", "").replace("_", " ").title(),
                    "reasoning": "Diversify your portfolio with specialized rewards",
                    "impact_score": 0.15,
                    "annual_fee": float(card.get("annual_fee", 0))
                })
        
        # If high-fee cards with low utilization, suggest switches
        if total_fees > total_spending * 0.02:  # Fees > 2% of spending
            high_fee_cards = [card for card in current_cards if float(card.get("annual_fee", 0)) > 200]
            if high_fee_cards:
                recommendations.append({
                    "action": "switch",
                    "card_id": high_fee_cards[0]["card_id"],
                    "reasoning": "Consider switching from high-fee card due to spending pattern",
                    "impact_score": 0.20,
                    "annual_fee_savings": float(high_fee_cards[0].get("annual_fee", 0))
                })
        
        # Calculate optimized score
        optimized_score = current_score + sum(rec.get("impact_score", 0) for rec in recommendations)
        optimized_score = min(optimized_score, 1.0)
        
        return PortfolioOptimizationResponse(
            recommendations=recommendations,
            current_portfolio_score=current_score,
            optimized_portfolio_score=optimized_score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

# Application lifecycle
def startup():
    """Initialize the application."""
    print("🚀 Starting RecEngine API...")
    
    # Load models
    models_loaded = load_models()
    if not models_loaded:
        print("⚠️ Warning: Some models failed to load")
    
    print(f"✅ RecEngine API ready! Loaded {len(models)} models")

def shutdown():
    """Clean up on shutdown."""
    print("🛑 Shutting down RecEngine API...")

# Mock server runner
def run_server(host="0.0.0.0", port=8000):
    """Mock server runner for testing."""
    startup()
    
    print(f"📡 RecEngine API running on http://{host}:{port}")
    print(f"📚 API documentation: http://{host}:{port}/docs")
    print(f"🔧 Health check: http://{host}:{port}/health")
    
    # In real implementation, would use uvicorn.run(app, host=host, port=port)
    print("Note: This is a mock server. Use 'uvicorn src.api:app --reload' for real deployment.")

if __name__ == "__main__":
    run_server()