#!/usr/bin/env node

/**
 * Mock RecEngine Server
 * Provides mock implementation of RecEngine API for frontend integration testing
 */

const http = require('http');
const url = require('url');

const PORT = 8000;

// Mock data for credit cards
const mockCreditCards = [
    {
        card_id: "550e8400-e29b-41d4-a716-446655440001",
        card_name: "Chase Sapphire Preferred",
        issuer: "Chase",
        score: 0.92,
        predicted_value: 850,
        annual_fee: 95,
        priority: "high",
        label: "Best for Travel",
        confidence: 0.92,
        reasoning: "Excellent travel rewards and transfer partners",
        annual_value: 850,
        match_reason: "Perfect for frequent travelers with high dining spend",
        benefits: [
            "2X points on travel and dining",
            "25% more value when redeem for travel",
            "No foreign transaction fees"
        ],
        reward_structure: [
            { category: "travel", rate: 2.0, type: "points" },
            { category: "dining", rate: 2.0, type: "points" },
            { category: "other", rate: 1.0, type: "points" }
        ]
    },
    {
        card_id: "550e8400-e29b-41d4-a716-446655440003", 
        card_name: "American Express Gold Card",
        issuer: "American Express",
        score: 0.89,
        predicted_value: 720,
        annual_fee: 250,
        priority: "high",
        label: "Best for Dining",
        confidence: 0.89,
        reasoning: "High rewards for restaurant and grocery spending",
        annual_value: 720,
        match_reason: "Ideal for heavy dining and grocery spending",
        benefits: [
            "4X points on restaurants worldwide",
            "4X points on U.S. supermarkets (up to $25k)",
            "$120 Uber Cash annually"
        ],
        reward_structure: [
            { category: "dining", rate: 4.0, type: "points" },
            { category: "groceries", rate: 4.0, type: "points" },
            { category: "other", rate: 1.0, type: "points" }
        ]
    },
    {
        card_id: "550e8400-e29b-41d4-a716-446655440002",
        card_name: "Citi Double Cash Card",
        issuer: "Citi",
        score: 0.85,
        predicted_value: 650,
        annual_fee: 0,
        priority: "medium",
        label: "Best for Cash Back",
        confidence: 0.85,
        reasoning: "Simple 2% cash back on all purchases",
        annual_value: 650,
        match_reason: "Great baseline card for consistent returns",
        benefits: [
            "2% cash back on all purchases",
            "No annual fee",
            "No category restrictions"
        ],
        reward_structure: [
            { category: "other", rate: 2.0, type: "cashback" }
        ]
    }
];

// API response handlers
const apiHandlers = {
    '/health': () => ({
        status: 'healthy',
        service: 'RecEngine Mock Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    }),

    '/models/info': () => ({
        models: {
            trigger_classifier: { status: 'loaded', version: '1.0' },
            card_ranker: { status: 'loaded', version: '1.0' },
            reward_estimator: { status: 'loaded', version: '1.0' }
        },
        total_models: 3
    }),

    '/personalized-ranking': (data) => {
        // Use deterministic scores based on card properties instead of random
        const rankedCards = mockCreditCards.map((card, index) => ({
            ...card,
            personalization_score: card.score + (0.05 * (3 - index)), // Use base score + small ranking boost
            match_reason: card.match_reason
        })).sort((a, b) => b.personalization_score - a.personalization_score);

        return {
            ranked_cards: rankedCards,
            diversity_score: 0.82,
            total_candidates: rankedCards.length
        };
    },

    '/trigger-classify': (data) => {
        const shouldRecommend = Math.random() > 0.5;
        const confidence = Math.random() * 0.5 + 0.5;
        const category = data.transaction?.category || data.category || 'general';
        
        return {
            recommend_flag: shouldRecommend,
            confidence_score: confidence,
            suggested_card_id: shouldRecommend ? "550e8400-e29b-41d4-a716-446655440003" : "",
            extra_reward: shouldRecommend ? Math.round((data.transaction?.amount || data.amount || 0) * 0.02 * 100) / 100 : 0,
            reasoning: shouldRecommend 
                ? `Using American Express Gold provides higher rewards for ${category} category`
                : "Current credit card is already the optimal choice"
        };
    },

    '/estimate-rewards': (data) => {
        const totalSpending = Object.values(data.projected_spending || {}).reduce((a, b) => a + b, 0);
        const estimatedReward = totalSpending * 0.015; // 1.5% average
        
        return {
            card_id: data.card_id,
            estimated_annual_reward: Math.round(estimatedReward),
            category_breakdown: Object.entries(data.projected_spending || {}).map(([category, amount]) => ({
                category,
                spending: amount,
                reward_rate: category === 'dining' ? 0.04 : category === 'groceries' ? 0.04 : 0.01,
                estimated_reward: Math.round(amount * (category === 'dining' || category === 'groceries' ? 0.04 : 0.01))
            })),
            annual_fee: 250,
            net_value: Math.round(estimatedReward - 250)
        };
    },

    '/optimize-portfolio': (data) => {
        const currentScore = 0.75;
        const optimizedScore = 0.88;
        
        return {
            current_portfolio_score: currentScore,
            optimized_portfolio_score: optimizedScore,
            improvement_potential: optimizedScore - currentScore,
            recommendations: [
                {
                    action: "add",
                    card_id: "550e8400-e29b-41d4-a716-446655440001",
                    card_name: "Chase Sapphire Preferred",
                    reasoning: "Adding this card will enhance travel spending rewards",
                    expected_benefit: 180
                },
                {
                    action: "keep",
                    card_id: data.current_cards[0],
                    card_name: "Citi Double Cash Card", 
                    reasoning: "Continue using as base cash back card",
                    expected_benefit: 320
                }
            ]
        };
    },

    '/compare-cards': (data) => ({
        comparison: data.card_ids.map(cardId => {
            const card = mockCreditCards.find(c => c.card_id === cardId) || mockCreditCards[0];
            return {
                ...card,
                annual_value: Math.round(Math.random() * 500 + 300),
                best_categories: ['dining', 'travel']
            };
        }),
        best_card: data.card_ids[0],
        recommendation: "Based on your spending pattern, recommend using the first card"
    })
};

// HTTP Server
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${pathname}`);

    // Handle API requests
    if (apiHandlers[pathname]) {
        if (req.method === 'GET') {
            const response = apiHandlers[pathname]();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response, null, 2));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const response = apiHandlers[pathname](data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(response, null, 2));
                } catch (error) {
                    console.error('❌ Error processing request:', error);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        }
    } else {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Not Found',
            available_endpoints: Object.keys(apiHandlers)
        }));
    }
});

server.listen(PORT, () => {
    console.log('🚀 Mock RecEngine Server started successfully!');
    console.log(`📡 Service URL: http://localhost:${PORT}`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
    console.log(`📚 Available Endpoints:`);
    Object.keys(apiHandlers).forEach(endpoint => {
        console.log(`   - ${endpoint}`);
    });
    console.log('\n💡 This is a mock RecEngine service for frontend integration testing');
    console.log('   Frontend can now call RecEngine API and get mock responses');
    console.log('\n🔍 Request Monitoring:');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Mock RecEngine Server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});