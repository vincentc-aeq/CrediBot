# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A credit card recommendations system that analyzes user spending patterns and provides personalized card suggestions. Uses a full-stack TypeScript architecture with React frontend, Node.js/Express backend, PostgreSQL database, and Redis caching.

**Core Features:**

- Homepage personalized card recommendations with carousel display
- Real-time transaction analysis with "better card" suggestions
- Comprehensive dashboard with card performance analytics
- Secure Plaid integration for financial data
- RecEngine ML service for intelligent recommendations

**Project Status:** Foundation and data models completed (tasks 1-2). See `/specs/credit-card-recommendations/tasks.md` for detailed implementation plan.

## Development Commands

### Local Development Setup (Recommended)

For better debugging experience, run services locally with Docker only for databases:

```bash
# 1. Start Database Services (PostgreSQL and Redis)
docker-compose up -d postgres redis

# 2. Backend Service
cd backend
npm install
cp .env.example .env
# Edit .env to ensure RECENGINE_BASE_URL=http://localhost:8080
npm run migrate
npm run seed
npm run dev

# 3. Frontend Service
cd frontend
npm install --legacy-peer-deps  # Note: requires --legacy-peer-deps flag
npm start

# 4. RecEngine ML Service
cd recengine
source .venv/bin/activate
# If .venv doesn't exist: python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
uvicorn src.api:app --host 0.0.0.0 --port 8080 --reload
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- RecEngine API: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Docker Development (Full Stack)

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npm run migrate

# Seed database with test data
docker-compose exec backend npm run seed

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Backend (from /backend directory)

```bash
# Development
npm run dev              # Start with hot reload
npm run build           # Build TypeScript to JavaScript
npm start              # Start production server

# Database
npm run migrate        # Run migrations
npm run migrate:rollback # Rollback last migration
npm run migrate:make   # Create new migration
npm run seed          # Run seeds
npm run seed:make     # Create new seed

# Testing
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

### Frontend (from /frontend directory)

```bash
npm start           # Start development server
npm run build       # Build for production
npm test           # Run tests
```

### RecEngine (from /recengine directory)

```bash
# Start RecEngine (MUST use venv)
source .venv/bin/activate
uvicorn src.api:app --host 0.0.0.0 --port 8080 --reload

# Health check
curl http://localhost:8080/health
```

## API Testing

### Authentication

```bash
# Login to get access token (IMPORTANT: Use proper JSON escaping)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"john.doe@example.com\", \"password\": \"TestRecEngine123!\", \"rememberMe\": false}"

# Use the returned accessToken for authenticated requests
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Available test accounts:
# john.doe@example.com / TestRecEngine123!
# jane.smith@example.com / TestRecEngine123!
# mike.wilson@example.com / TestRecEngine123!
```

### Recent Transactions API

```bash
# Get recent transactions with better card recommendations
curl "http://localhost:3001/api/analytics/recent-transactions?limit=5&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

### RecEngine Direct Testing

```bash
# Test trigger classifier
curl -X POST http://localhost:8080/trigger-classify \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "amount": 100, "category": "dining", "current_card_id": "citi_double_cash_card"}'

# Test personalized ranking
curl -X POST http://localhost:8080/personalized-ranking \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "spending_pattern": {"dining": 1000, "travel": 500}}'
```

## Architecture

### Backend Structure

- **Models**: TypeScript classes with validation in `/src/models/`
- **Repositories**: Database access layer using Knex.js in `/src/repositories/`
- **Database**: PostgreSQL with Knex migrations in `/src/database/migrations/`
- **Authentication**: JWT-based auth with bcrypt password hashing
- **API**: Express.js REST endpoints

### Frontend Structure

- **React 18** with TypeScript
- **Material-UI** for component library
- **React Query** for server state management
- **Chart.js** for data visualization
- **React Router** for navigation

### Database Schema

Key tables: `users`, `credit_cards`, `transactions`, `user_cards`, `recommendations`

### External Integrations

- **Plaid API**: Financial data aggregation with OAuth flow
- **RecEngine ML**: Sophisticated ML service with 4 specialized models:
  - Trigger Classifier: Determines transaction-based suggestions
  - Reward Estimator: Calculates benefit projections
  - Optimizer/Action Selector: Portfolio optimization recommendations
  - Personalized Ranker: Homepage card rankings
- **SendGrid**: Email notifications

## Testing

Backend uses Jest with ts-jest preset. Test files should be in `/src/test/` or use `.test.ts` suffix.

## Environment Setup

The project uses environment variables for configuration. See `.env.example` files in both backend and frontend directories.

## Key API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - User profile

### Recommendations

- `GET /api/recommendations/homepage` - Homepage card carousel
- `POST /api/recommendations/transaction-analysis` - Transaction-based suggestions
- `GET /api/recommendations/optimization` - Dashboard optimization

### Analytics

- `GET /api/analytics/recent-transactions` - Recent transactions with better card recommendations
- `GET /api/analytics/spending-patterns` - User spending analysis
- `GET /api/analytics/card-performance` - Card performance metrics

### RecEngine (Direct API - Port 8080)

- `GET /health` - Health check and status
- `POST /trigger-classify` - Analyze transaction for better card recommendations
- `POST /personalized-ranking` - Get personalized card rankings
- `POST /estimate-rewards` - Estimate potential rewards
- `POST /optimize-portfolio` - Portfolio optimization suggestions
- `GET /models/info` - Model information and metrics

## Project Documentation

- **Requirements**: `/specs/credit-card-recommendations/requirements.md` - User stories and acceptance criteria
- **Design**: `/specs/credit-card-recommendations/design.md` - Detailed system architecture and RecEngine ML integration
- **Implementation Plan**: `/specs/credit-card-recommendations/tasks.md` - 20-task development roadmap

## Common Development Tasks

- Use Knex migrations for database schema changes
- Follow TypeScript strict mode conventions
- Use the existing repository pattern for database operations
- Material-UI components are available for frontend development
- Redis is used for caching and session management
- Reference design docs before implementing new features
