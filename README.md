# Credit Card Recommendations System

A personalized financial advisory platform that analyzes user spending patterns and transaction history to provide intelligent credit card recommendations.

## Features

- **Homepage Recommendations**: Personalized card suggestions based on spending behavior
- **Real-time Transaction Analysis**: Immediate feedback on optimization opportunities
- **Comprehensive Dashboard**: Card performance analytics and optimization insights
- **Secure Financial Data Integration**: Safe connection to financial accounts via Plaid
- **ML-Powered Recommendations**: Advanced recommendation engine using RecEngine ML service

## Tech Stack

### Frontend

- React 18 with TypeScript
- Material-UI for components
- React Query for state management
- Chart.js for data visualization
- React Router for navigation

### Backend

- Node.js with Express.js
- TypeScript for type safety
- PostgreSQL with Knex.js migrations
- Redis for caching and sessions
- JWT authentication

### External Services

- Plaid API for financial data
- RecEngine ML service for recommendations (runs on port 8080)
- SendGrid for email notifications

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start with Docker

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CrediBot
   ```

2. **Start all services**

   ```bash
   docker-compose up -d
   ```

3. **Initialize database**

   ```bash
   # Run database migrations
   docker-compose exec backend npm run migrate

   # Import seed data
   docker-compose exec backend npm run seed
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health Check: http://localhost:3001/health

### Local Development Setup (Recommended for Debugging)

For better debugging experience, it's recommended to run services locally with Docker only for databases. This setup provides hot reload and better debugging capabilities.

#### Complete Local Development Setup

Follow these steps in order to start all services:

1. **Start database services only**

   ```bash
   # Start PostgreSQL and Redis with Docker
   docker-compose up -d postgres redis

   # Check service status
   docker-compose ps
   ```

2. **Setup backend for local development**

   ```bash
   cd backend

   # Install dependencies
   npm install

   # Setup environment variables
   cp .env.example .env
   # Edit .env file as needed

   # Run database migrations
   npm run migrate

   # Import seed data
   npm run seed

   # Start development server with hot reload
   npm run dev
   ```

3. **Setup frontend**

   ```bash
   cd frontend

   # Install dependencies (requires legacy peer deps flag)
   npm install --legacy-peer-deps

   # Start development server
   npm start
   ```

4. **Start RecEngine ML Service**

   ```bash
   cd recengine

   # Activate virtual environment
   source .venv/bin/activate

   # If .venv doesn't exist, create it first:
   # python -m venv .venv
   # source .venv/bin/activate
   # pip install -r requirements.txt

   # Start RecEngine on port 8080
   uvicorn src.api:app --host 0.0.0.0 --port 8080 --reload
   ```

#### Service URLs and Ports

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- RecEngine API: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

#### Alternative: Local PostgreSQL Installation

If you prefer to install PostgreSQL locally instead of using Docker:

1. **Install PostgreSQL and Redis**

   ```bash
   # Using Homebrew on macOS
   brew install postgresql@15 redis

   # Start services
   brew services start postgresql@15
   brew services start redis

   # Create database
   createdb credit_card_recommendations
   ```

2. **Update environment variables**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env to use local database:
   # DATABASE_URL=postgresql://username:password@localhost:5432/credit_card_recommendations
   ```

3. **Continue with steps 2-4 from the main setup above**

### VS Code Debugging Setup

For enhanced debugging experience, use the included VS Code configuration:

1. **Launch configuration is already provided** in `.vscode/launch.json`

2. **Available debug configurations:**

   - **Debug Backend**: Debug the backend server with breakpoints
   - **Debug Backend Tests**: Debug backend tests

3. **Usage:**
   - Set breakpoints in your TypeScript code
   - Press F5 or use the Debug panel
   - Select "Debug Backend" configuration
   - The debugger will attach to the running process

### Database Management

#### Using Command Line Tools

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U username -d credit_card_recommendations

# Check Redis connection
redis-cli ping

# Useful database commands
npm run migrate:status    # Check migration status
npm run migrate:latest    # Run latest migrations
npm run migrate:rollback  # Rollback last migration
npm run seed             # Re-run seed data
```

#### Using GUI Tools

Recommended database management tools:

- **TablePlus** (macOS/Windows)
- **pgAdmin** (Cross-platform)
- **DBeaver** (Cross-platform)

### Test Data and Users

After running `npm run seed`, you can use these test accounts:

- **Email**: `john.doe@example.com` / **Password**: `TestRecEngine123!`
- **Email**: `jane.smith@example.com` / **Password**: `TestRecEngine123!`
- **Email**: `mike.wilson@example.com` / **Password**: `TestRecEngine123!`

The seed data includes:

- 15 real credit cards with complete reward structures
- 3 test users with different preferences
- Sample transactions for testing

### Development Workflow

1. **Start databases**

   ```bash
   docker-compose up -d postgres redis
   ```

2. **Backend development**

   ```bash
   cd backend
   npm run dev  # Hot reload enabled
   ```

3. **Frontend development**

   ```bash
   cd frontend
   npm start    # Hot reload enabled
   ```

4. **Database operations**

   ```bash
   # Reset database
   npm run migrate:rollback --all
   npm run migrate:latest
   npm run seed

   # Create new migration
   npm run migrate:make -- create_new_table

   # Create new seed file
   npm run seed:make -- new_seed_data
   ```

### Troubleshooting

#### Common Issues

1. **Port conflicts**: Ensure ports 3000, 3001, 5432, 6379 are not in use
2. **Database connection failed**: Wait for PostgreSQL to fully start before running migrations
3. **Frontend can't connect to backend**: Check that `REACT_APP_API_URL` is set correctly

#### Useful Commands

```bash
# View service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# Check service health
curl http://localhost:3001/health
```

## Available Scripts

### Backend Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run seed` - Run database seeds

### Frontend Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and preferences
- `credit_cards` - Card database with reward structures
- `transactions` - User spending history
- `user_cards` - User's current card portfolio
- `recommendations` - Generated recommendations and tracking

## API Documentation

### Health Check

```
GET /health
```

### Authentication

```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/profile
```

### Recommendations

```
GET /api/recommendations/homepage
POST /api/recommendations/transaction-analysis
GET /api/recommendations/optimization
```

## Environment Variables

See `.env.example` files in both `backend` and `frontend` directories for required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the ISC License.
