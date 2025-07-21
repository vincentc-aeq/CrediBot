# RecEngine - Credit Card Recommendation ML Service

RecEngine is a machine learning service that powers intelligent credit card recommendations for CrediBot users.

## Architecture

RecEngine consists of four core ML models:
- **Trigger Classifier**: Determines when to show recommendations based on transactions
- **Reward Estimator**: Calculates potential rewards and benefits
- **Portfolio Optimizer**: Suggests card portfolio improvements
- **Personalized Ranker**: Ranks cards based on user preferences

## Tech Stack

- Python 3.11
- FastAPI for API serving
- Feast for feature store
- LightGBM for ML models
- MLflow for model management
- Redis for online features
- Docker for containerization

## Directory Structure

```
recengine/
├── data/               # Raw and processed data files
├── features/           # Feast feature definitions
├── labeling/           # Data labeling scripts
├── models/             # Trained model artifacts
├── scripts/            # Utility scripts
├── src/
│   ├── api/           # FastAPI application
│   ├── ml/            # ML training and inference
│   └── utils/         # Shared utilities
└── tests/             # Unit and integration tests
```

## Getting Started

1. Set up Python environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Run the service:
   ```bash
   uvicorn src.api.main:app --reload
   ```

3. Access API documentation:
   - Swagger UI: http://localhost:8080/docs
   - ReDoc: http://localhost:8080/redoc

## Integration with CrediBot

RecEngine integrates with the main CrediBot backend via REST API:
- Authentication via Bearer token (`RECENGINE_API_KEY`)
- Data sync from PostgreSQL to Parquet/Feast
- Real-time inference endpoints for recommendations

See `/specs/recengine.md` for detailed implementation specifications.