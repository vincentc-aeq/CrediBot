#!/bin/bash

# RecEngine Integration Test Script
# Tests the complete integration between CrediBot and RecEngine

set -e

echo "🧪 RecEngine Integration Test Suite"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
RECENGINE_URL="http://localhost:8000"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="TestPassword123!"

# Check if services are running
check_service() {
    local service_name=$1
    local url=$2
    local endpoint=$3
    
    echo -n "Checking $service_name... "
    if curl -s -f "$url$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Start services if not running
start_services() {
    echo "Starting services with Docker Compose..."
    docker-compose -f docker-compose.recengine.yml up -d
    
    echo "Waiting for services to be ready..."
    sleep 30
}

# Test RecEngine Health
test_recengine_health() {
    echo -e "\n${YELLOW}Test 1: RecEngine Health Check${NC}"
    
    response=$(curl -s "$RECENGINE_URL/health")
    if [[ $response == *"healthy"* ]]; then
        echo -e "${GREEN}✓ RecEngine is healthy${NC}"
        echo "Response: $response"
    else
        echo -e "${RED}✗ RecEngine health check failed${NC}"
        exit 1
    fi
}

# Test RecEngine Model Info
test_recengine_models() {
    echo -e "\n${YELLOW}Test 2: RecEngine Model Information${NC}"
    
    response=$(curl -s "$RECENGINE_URL/models/info")
    if [[ $response == *"trigger_classifier"* ]] && [[ $response == *"card_ranker"* ]]; then
        echo -e "${GREEN}✓ Models loaded successfully${NC}"
        echo "Models found: trigger_classifier, card_ranker"
    else
        echo -e "${RED}✗ Models not loaded${NC}"
        exit 1
    fi
}

# Test Backend Integration
test_backend_integration() {
    echo -e "\n${YELLOW}Test 3: Backend RecEngine Integration${NC}"
    
    # First, get auth token
    echo "Authenticating..."
    auth_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}")
    
    token=$(echo $auth_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        echo -e "${YELLOW}Creating test user...${NC}"
        curl -s -X POST "$BACKEND_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"name\":\"Test User\"}" > /dev/null
        
        auth_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}")
        
        token=$(echo $auth_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ -z "$token" ]; then
        echo -e "${RED}✗ Authentication failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Authenticated successfully${NC}"
    
    # Test recommendation status
    echo "Testing recommendation service status..."
    status_response=$(curl -s "$BACKEND_URL/api/recommendations/status" \
        -H "Authorization: Bearer $token")
    
    if [[ $status_response == *"available"* ]]; then
        echo -e "${GREEN}✓ RecEngine service available through backend${NC}"
    else
        echo -e "${RED}✗ RecEngine service not available${NC}"
        exit 1
    fi
}

# Test Homepage Recommendations
test_homepage_recommendations() {
    echo -e "\n${YELLOW}Test 4: Homepage Recommendations${NC}"
    
    # Direct RecEngine test
    echo "Testing direct RecEngine endpoint..."
    direct_response=$(curl -s -X POST "$RECENGINE_URL/personalized-ranking" \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "test_user",
            "user_cards": ["citi_double_cash_card"],
            "spending_pattern": {
                "dining": 500,
                "groceries": 800,
                "gas": 200,
                "travel": 300,
                "other": 1200
            }
        }')
    
    if [[ $direct_response == *"ranked_cards"* ]]; then
        echo -e "${GREEN}✓ Direct RecEngine call successful${NC}"
        card_count=$(echo $direct_response | grep -o '"card_id"' | wc -l)
        echo "Recommended cards: $card_count"
    else
        echo -e "${RED}✗ Direct RecEngine call failed${NC}"
        echo "Response: $direct_response"
        exit 1
    fi
}

# Test Transaction Analysis
test_transaction_analysis() {
    echo -e "\n${YELLOW}Test 5: Transaction Analysis${NC}"
    
    response=$(curl -s -X POST "$RECENGINE_URL/trigger-classify" \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "test_user",
            "amount": 150.0,
            "category": "dining",
            "current_card_id": "citi_double_cash_card",
            "merchant": "Test Restaurant"
        }')
    
    if [[ $response == *"recommend_flag"* ]] && [[ $response == *"confidence_score"* ]]; then
        echo -e "${GREEN}✓ Transaction analysis successful${NC}"
        recommend=$(echo $response | grep -o '"recommend_flag":[^,]*' | cut -d':' -f2)
        echo "Recommendation triggered: $recommend"
    else
        echo -e "${RED}✗ Transaction analysis failed${NC}"
        echo "Response: $response"
        exit 1
    fi
}

# Test Reward Estimation
test_reward_estimation() {
    echo -e "\n${YELLOW}Test 6: Reward Estimation${NC}"
    
    response=$(curl -s -X POST "$RECENGINE_URL/estimate-rewards" \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "test_user",
            "card_id": "american_express_gold_card",
            "projected_spending": {
                "dining": 2400,
                "groceries": 1800,
                "gas": 1200,
                "travel": 2000,
                "other": 3000
            }
        }')
    
    if [[ $response == *"estimated_annual_reward"* ]] && [[ $response == *"category_breakdown"* ]]; then
        echo -e "${GREEN}✓ Reward estimation successful${NC}"
        annual_reward=$(echo $response | grep -o '"estimated_annual_reward":[^,]*' | cut -d':' -f2)
        echo "Estimated annual reward: \$$annual_reward"
    else
        echo -e "${RED}✗ Reward estimation failed${NC}"
        echo "Response: $response"
        exit 1
    fi
}

# Test Portfolio Optimization
test_portfolio_optimization() {
    echo -e "\n${YELLOW}Test 7: Portfolio Optimization${NC}"
    
    response=$(curl -s -X POST "$RECENGINE_URL/optimize-portfolio" \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "test_user",
            "current_cards": ["citi_double_cash_card", "chase_freedom_unlimited"],
            "spending_pattern": {
                "dining": 1200,
                "groceries": 1800,
                "gas": 1000,
                "travel": 800,
                "other": 2200
            }
        }')
    
    if [[ $response == *"recommendations"* ]] && [[ $response == *"current_portfolio_score"* ]]; then
        echo -e "${GREEN}✓ Portfolio optimization successful${NC}"
        current_score=$(echo $response | grep -o '"current_portfolio_score":[^,]*' | cut -d':' -f2)
        optimized_score=$(echo $response | grep -o '"optimized_portfolio_score":[^,]*' | cut -d':' -f2)
        echo "Current score: $current_score → Optimized score: $optimized_score"
    else
        echo -e "${RED}✗ Portfolio optimization failed${NC}"
        echo "Response: $response"
        exit 1
    fi
}

# Performance test
test_performance() {
    echo -e "\n${YELLOW}Test 8: Performance Test${NC}"
    
    # Test response time for trigger classification
    start_time=$(date +%s%N)
    curl -s -X POST "$RECENGINE_URL/trigger-classify" \
        -H "Content-Type: application/json" \
        -d '{
            "user_id": "test_user",
            "amount": 50.0,
            "category": "groceries"
        }' > /dev/null
    end_time=$(date +%s%N)
    
    response_time=$(( ($end_time - $start_time) / 1000000 ))
    
    if [ $response_time -lt 50 ]; then
        echo -e "${GREEN}✓ Response time: ${response_time}ms (< 50ms target)${NC}"
    else
        echo -e "${YELLOW}⚠ Response time: ${response_time}ms (> 50ms target)${NC}"
    fi
}

# Main test execution
main() {
    echo "Starting RecEngine Integration Tests"
    echo "===================================="
    
    # Check if services are running
    services_running=true
    check_service "Backend" "$BACKEND_URL" "/api/health" || services_running=false
    check_service "RecEngine" "$RECENGINE_URL" "/health" || services_running=false
    
    if [ "$services_running" = false ]; then
        echo -e "\n${YELLOW}Some services are not running.${NC}"
        read -p "Start services with Docker Compose? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_services
        else
            echo "Please start services manually and run tests again."
            exit 1
        fi
    fi
    
    # Run tests
    test_recengine_health
    test_recengine_models
    test_backend_integration
    test_homepage_recommendations
    test_transaction_analysis
    test_reward_estimation
    test_portfolio_optimization
    test_performance
    
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    echo "RecEngine integration is working correctly."
}

# Run main function
main "$@"