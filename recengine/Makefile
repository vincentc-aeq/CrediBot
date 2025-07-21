.PHONY: help install test lint format clean run-dev docker-build docker-run

help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make test        - Run tests"
	@echo "  make lint        - Run linting"
	@echo "  make format      - Format code"
	@echo "  make clean       - Clean cache files"
	@echo "  make run-dev     - Run development server"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run  - Run Docker container"

install:
	pip install -r requirements.txt

test:
	pytest tests/ -v --cov=src --cov-report=html

lint:
	flake8 src/ tests/
	mypy src/ tests/

format:
	black src/ tests/
	isort src/ tests/

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
	find . -type d -name ".mypy_cache" -delete
	rm -rf htmlcov/
	rm -rf .coverage

run-dev:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8080

docker-build:
	docker build -t recengine:latest .

docker-run:
	docker run -p 8080:8080 --env-file .env recengine:latest

# ML specific commands
train:
	python -m src.ml.train_trigger
	python -m src.ml.train_ranker

materialize:
	cd features && feast materialize-incremental $(shell date -u +%Y-%m-%dT%H:%M:%S)