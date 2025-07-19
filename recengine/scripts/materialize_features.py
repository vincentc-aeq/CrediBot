#!/usr/bin/env python3
"""
Materialize features for the RecEngine feature store.
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path

FEATURES_DIR = Path(__file__).parent.parent / "features"


def materialize_features(start_date: str = None, end_date: str = None, dry_run: bool = False):
    """Materialize features to online store."""
    
    if not start_date:
        end_dt = datetime.now()
        start_dt = end_dt - timedelta(days=7)
        start_date = start_dt.strftime("%Y-%m-%d")
        end_date = end_dt.strftime("%Y-%m-%d")
    
    print(f"Materializing features from {start_date} to {end_date}")
    
    if dry_run:
        print("DRY RUN: Would materialize features but not actually doing it")
        return True
    
    try:
        # Check if Feast is available
        import feast
        
        # Load feature store
        from features.feature_repo import get_feature_store
        fs = get_feature_store()
        
        # Materialize features
        fs.materialize(start_date=start_date, end_date=end_date)
        
        print("✅ Feature materialization completed successfully!")
        return True
        
    except ImportError:
        print("Feast not installed. Creating mock materialization...")
        
        # Create materialization marker
        marker_file = FEATURES_DIR / "materialized.marker"
        with open(marker_file, "w") as f:
            f.write(f"Mock materialization: {start_date} to {end_date}\n")
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        
        print("✅ Mock materialization completed!")
        return True
        
    except Exception as e:
        print(f"❌ Feature materialization failed: {e}")
        return False


def check_materialization_status():
    """Check the status of feature materialization."""
    print("Checking materialization status...")
    
    try:
        # Check if Feast is available
        import feast
        from features.feature_repo import get_feature_store
        
        fs = get_feature_store()
        
        # Get feature store info (this would show materialization status)
        print("Feature store is available")
        
        # List feature views
        feature_views = fs.list_feature_views()
        print(f"Available feature views: {[fv.name for fv in feature_views]}")
        
        return True
        
    except ImportError:
        print("Feast not installed - checking mock status...")
        
        marker_file = FEATURES_DIR / "materialized.marker"
        if marker_file.exists():
            with open(marker_file, "r") as f:
                content = f.read()
            print("Mock materialization status:")
            print(content)
            return True
        else:
            print("No materialization found")
            return False
            
    except Exception as e:
        print(f"Error checking status: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Materialize RecEngine features")
    parser.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="End date (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    parser.add_argument("--status", action="store_true", help="Check materialization status")
    
    args = parser.parse_args()
    
    if args.status:
        success = check_materialization_status()
    else:
        success = materialize_features(args.start_date, args.end_date, args.dry_run)
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())