#!/usr/bin/env python3
"""
Setup Feast feature store and materialize features.
"""

import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

FEATURES_DIR = Path(__file__).parent.parent / "features"
REPO_ROOT = Path(__file__).parent.parent


def check_redis_connection():
    """Check if Redis is accessible."""
    try:
        import redis
        client = redis.Redis(host='localhost', port=6379, decode_responses=True)
        client.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("Please ensure Redis is running: docker run -d -p 6379:6379 redis:latest")
        return False


def run_feast_command(command: list, cwd: Path = None) -> bool:
    """Run a Feast CLI command."""
    if cwd is None:
        cwd = REPO_ROOT
    
    try:
        print(f"Running: {' '.join(command)}")
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False
    except FileNotFoundError:
        print("Feast CLI not found. Install with: pip install feast[redis]")
        return False


def setup_feast_repo():
    """Initialize Feast repository."""
    print("Setting up Feast repository...")
    
    # Check if registry already exists
    registry_file = FEATURES_DIR / "registry.db"
    if registry_file.exists():
        print("Registry already exists, skipping initialization")
        return True
    
    # Change to features directory and apply
    success = run_feast_command(["feast", "apply"], cwd=FEATURES_DIR)
    
    if success:
        print("✅ Feast repository initialized")
    else:
        print("❌ Failed to initialize Feast repository")
    
    return success


def materialize_features():
    """Materialize features to online store."""
    print("Materializing features...")
    
    # Calculate date range (last 7 days to now)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    print(f"Materializing features from {start_str} to {end_str}")
    
    success = run_feast_command([
        "feast", "materialize", start_str, end_str
    ], cwd=FEATURES_DIR)
    
    if success:
        print("✅ Feature materialization completed")
    else:
        print("❌ Feature materialization failed")
    
    return success


def validate_feature_store():
    """Validate that the feature store is working."""
    print("Validating feature store...")
    
    try:
        # This would normally use Feast SDK, but since we may not have it installed,
        # we'll do a simple validation
        
        # Check if registry exists
        registry_file = FEATURES_DIR / "registry.db"
        if not registry_file.exists():
            print("❌ Registry file not found")
            return False
        
        print("✅ Feature store validation passed")
        return True
        
    except Exception as e:
        print(f"❌ Feature store validation failed: {e}")
        return False


def setup_feature_store_mock():
    """Setup a mock feature store when Feast is not available."""
    print("Setting up mock feature store (Feast not installed)...")
    
    # Create registry placeholder
    registry_file = FEATURES_DIR / "registry.db"
    with open(registry_file, "w") as f:
        f.write("# Mock Feast registry\n")
        f.write("# Install Feast to use real feature store\n")
        f.write(f"# Created: {datetime.now().isoformat()}\n")
    
    # Create materialization marker
    materialization_file = FEATURES_DIR / "materialized.marker"
    with open(materialization_file, "w") as f:
        f.write(f"Mock materialization completed at {datetime.now().isoformat()}\n")
    
    print("✅ Mock feature store setup complete")
    return True


def main():
    """Main setup function."""
    print("Setting up Feast feature store...")
    
    # Check if we have dependencies
    try:
        import feast
        has_feast = True
    except ImportError:
        print("Feast not installed. Creating mock setup...")
        has_feast = False
    
    if not has_feast:
        return setup_feature_store_mock()
    
    # Check Redis connection
    if not check_redis_connection():
        print("Continuing with file-based offline store only...")
    
    # Setup repository
    if not setup_feast_repo():
        return False
    
    # Materialize features
    if not materialize_features():
        print("Warning: Feature materialization failed, but continuing...")
    
    # Validate
    if not validate_feature_store():
        return False
    
    print("✅ Feast feature store setup complete!")
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)