#!/usr/bin/env python3
"""
Optuna hyperparameter tuning for RecEngine models.
Jointly tunes gap_thr, learning_rate, max_depth across trigger and ranker models.
"""

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src"))

# Import our training modules
from train_trigger import (
    load_labeled_data, extract_features, train_trigger_classifier, 
    evaluate_model, train_test_split, roc_auc_score
)
from train_ranker import (
    load_card_catalog, load_user_data, generate_ranking_training_data,
    train_ranker_model, evaluate_ranker, train_test_split_groups
)

# Mock Optuna for development
class OptunaStudy:
    """Mock Optuna study for hyperparameter optimization."""
    
    def __init__(self, direction="maximize"):
        self.direction = direction
        self.trials = []
        self.best_params = None
        self.best_value = float('-inf') if direction == "maximize" else float('inf')
        
    def optimize(self, objective_func, n_trials=20):
        """Run optimization trials."""
        import random
        random.seed(42)
        
        print(f"🔍 Starting Optuna optimization with {n_trials} trials...")
        
        for trial_idx in range(n_trials):
            # Create mock trial
            trial = MockTrial(trial_idx)
            
            try:
                # Run objective function
                value = objective_func(trial)
                
                # Track trial
                self.trials.append({
                    "number": trial_idx,
                    "value": value,
                    "params": trial.params.copy()
                })
                
                # Update best
                if ((self.direction == "maximize" and value > self.best_value) or
                    (self.direction == "minimize" and value < self.best_value)):
                    self.best_value = value
                    self.best_params = trial.params.copy()
                
                print(f"Trial {trial_idx:2d}: {value:.4f} | params: {trial.params}")
                
            except Exception as e:
                print(f"Trial {trial_idx:2d}: FAILED - {e}")
        
        print(f"\n🎯 Best value: {self.best_value:.4f}")
        print(f"🎯 Best params: {self.best_params}")


class MockTrial:
    """Mock Optuna trial for parameter suggestions."""
    
    def __init__(self, trial_number):
        self.number = trial_number
        self.params = {}
        import random
        self.random = random.Random(42 + trial_number)
    
    def suggest_float(self, name, low, high):
        """Suggest float parameter."""
        value = self.random.uniform(low, high)
        self.params[name] = value
        return value
    
    def suggest_int(self, name, low, high):
        """Suggest integer parameter."""
        value = self.random.randint(low, high)
        self.params[name] = value
        return value
    
    def suggest_categorical(self, name, choices):
        """Suggest categorical parameter."""
        value = self.random.choice(choices)
        self.params[name] = value
        return value


# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "models"


def create_study(direction="maximize"):
    """Create Optuna study (mock)."""
    return OptunaStudy(direction=direction)


def objective_trigger_classifier(trial):
    """Objective function for trigger classifier optimization."""
    
    # Suggest hyperparameters
    gap_thr = trial.suggest_float("gap_thr", 0.005, 0.05)
    learning_rate = trial.suggest_float("learning_rate", 0.01, 0.3)
    max_depth = trial.suggest_int("max_depth", 3, 10)
    n_estimators = trial.suggest_int("n_estimators", 50, 200)
    
    try:
        # Load data with specific gap threshold
        labeled_data, labels = load_labeled_data("trigger_labels_v2.csv")
        
        if not labeled_data:
            return 0.0
        
        # Filter by gap threshold (simulate re-labeling with different threshold)
        filtered_data = []
        filtered_labels = []
        
        for data, label in zip(labeled_data, labels):
            # Apply gap threshold filter
            if data["reward_gap_pct"] >= (gap_thr * 100) or label == 0:
                filtered_data.append(data)
                filtered_labels.append(label)
        
        if len(filtered_data) < 100:  # Need minimum samples
            return 0.0
        
        # Extract features
        features = extract_features(filtered_data)
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            features, filtered_labels, test_size=0.2, random_state=42
        )
        
        # Train model
        from train_trigger import LGBMClassifier
        model = LGBMClassifier(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Evaluate
        metrics = evaluate_model(model, X_test, y_test)
        
        return metrics['auc']
        
    except Exception as e:
        print(f"Trial failed: {e}")
        return 0.0


def objective_ranker_model(trial):
    """Objective function for ranker model optimization."""
    
    # Suggest hyperparameters
    learning_rate = trial.suggest_float("learning_rate", 0.01, 0.3)
    max_depth = trial.suggest_int("max_depth", 3, 10)
    n_estimators = trial.suggest_int("n_estimators", 50, 200)
    
    try:
        # Load data
        cards = load_card_catalog()
        users = load_user_data()
        
        if not cards or not users:
            return 0.0
        
        # Generate training data (smaller sample for tuning)
        X, y, groups = generate_ranking_training_data(
            users[:50], cards, num_samples_per_user=8  # Smaller for speed
        )
        
        if not X:
            return 0.0
        
        # Split data
        X_train, X_test, y_train, y_test, groups_train, groups_test = train_test_split_groups(
            X, y, groups, test_size=0.2, random_state=42
        )
        
        # Train model
        from train_ranker import LGBMRanker
        model = LGBMRanker(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            random_state=42
        )
        model.fit(X_train, y_train, group=groups_train)
        
        # Evaluate
        metrics = evaluate_ranker(model, X_test, y_test, groups_test)
        
        return metrics['map@5']
        
    except Exception as e:
        print(f"Trial failed: {e}")
        return 0.0


def objective_combined(trial):
    """Combined objective function optimizing both models."""
    
    # Suggest shared hyperparameters
    gap_thr = trial.suggest_float("gap_thr", 0.005, 0.05)
    learning_rate = trial.suggest_float("learning_rate", 0.01, 0.3)
    max_depth = trial.suggest_int("max_depth", 4, 8)
    
    # Get trigger classifier performance
    trigger_auc = 0.0
    try:
        # Simplified trigger evaluation
        labeled_data, labels = load_labeled_data("trigger_labels_v2.csv")
        if labeled_data:
            # Quick evaluation (smaller sample)
            sample_size = min(1000, len(labeled_data))
            sample_data = labeled_data[:sample_size]
            sample_labels = labels[:sample_size]
            
            features = extract_features(sample_data)
            X_train, X_test, y_train, y_test = train_test_split(
                features, sample_labels, test_size=0.3, random_state=42
            )
            
            from train_trigger import LGBMClassifier
            model = LGBMClassifier(
                learning_rate=learning_rate,
                max_depth=max_depth,
                n_estimators=100,
                random_state=42
            )
            model.fit(X_train, y_train)
            metrics = evaluate_model(model, X_test, y_test)
            trigger_auc = metrics['auc']
    except:
        pass
    
    # Get ranker performance
    ranker_map5 = 0.0
    try:
        cards = load_card_catalog()
        users = load_user_data()
        if cards and users:
            X, y, groups = generate_ranking_training_data(
                users[:30], cards, num_samples_per_user=6
            )
            if X:
                X_train, X_test, y_train, y_test, groups_train, groups_test = train_test_split_groups(
                    X, y, groups, test_size=0.3, random_state=42
                )
                
                from train_ranker import LGBMRanker
                model = LGBMRanker(
                    learning_rate=learning_rate,
                    max_depth=max_depth,
                    n_estimators=100,
                    random_state=42
                )
                model.fit(X_train, y_train, group=groups_train)
                metrics = evaluate_ranker(model, X_test, y_test, groups_test)
                ranker_map5 = metrics['map@5']
    except:
        pass
    
    # Combined score (weighted average)
    combined_score = 0.6 * trigger_auc + 0.4 * ranker_map5
    return combined_score


def save_study_results(study: OptunaStudy, study_name: str):
    """Save Optuna study results."""
    
    MODELS_DIR.mkdir(exist_ok=True)
    
    study_results = {
        "study_name": study_name,
        "direction": study.direction,
        "best_value": study.best_value,
        "best_params": study.best_params,
        "n_trials": len(study.trials),
        "trials": study.trials
    }
    
    results_path = MODELS_DIR / f"optuna_{study_name}.json"
    with open(results_path, "w") as f:
        json.dump(study_results, f, indent=2)
    
    print(f"📊 Study results saved to: {results_path}")
    return results_path


def analyze_study_results(study: OptunaStudy):
    """Analyze and print study results."""
    
    if not study.trials:
        print("❌ No trials completed!")
        return
    
    print(f"\n📊 OPTUNA STUDY ANALYSIS")
    print(f"{'='*50}")
    print(f"Total trials: {len(study.trials)}")
    print(f"Best value: {study.best_value:.4f}")
    print(f"Best params: {study.best_params}")
    
    # Parameter importance analysis
    if study.best_params:
        print(f"\n🎯 BEST HYPERPARAMETERS:")
        for param, value in study.best_params.items():
            print(f"  {param}: {value}")
    
    # Trial performance distribution
    trial_values = [trial['value'] for trial in study.trials if trial['value'] is not None]
    if trial_values:
        print(f"\n📈 PERFORMANCE DISTRIBUTION:")
        print(f"  Mean: {sum(trial_values)/len(trial_values):.4f}")
        print(f"  Min:  {min(trial_values):.4f}")
        print(f"  Max:  {max(trial_values):.4f}")
    
    # Top 5 trials
    sorted_trials = sorted(study.trials, key=lambda x: x['value'], reverse=True)
    print(f"\n🏆 TOP 5 TRIALS:")
    for i, trial in enumerate(sorted_trials[:5]):
        print(f"  {i+1}. Trial {trial['number']:2d}: {trial['value']:.4f} | {trial['params']}")


def main():
    """Main hyperparameter tuning function."""
    parser = argparse.ArgumentParser(description="Optuna hyperparameter tuning")
    parser.add_argument("--model", type=str, choices=["trigger", "ranker", "combined"], 
                       default="combined", help="Model to tune")
    parser.add_argument("--n-trials", type=int, default=20,
                       help="Number of optimization trials")
    parser.add_argument("--study-name", type=str, default=None,
                       help="Study name (auto-generated if not provided)")
    
    args = parser.parse_args()
    
    # Generate study name if not provided
    if not args.study_name:
        args.study_name = f"{args.model}_optimization"
    
    print("🚀 Starting Optuna hyperparameter optimization...")
    print(f"Model: {args.model}")
    print(f"Trials: {args.n_trials}")
    print(f"Study: {args.study_name}")
    
    # Create study
    study = create_study(direction="maximize")
    
    # Select objective function
    if args.model == "trigger":
        objective_func = objective_trigger_classifier
        print(f"\n🎯 Optimizing trigger classifier (AUC)")
    elif args.model == "ranker":
        objective_func = objective_ranker_model
        print(f"\n🎯 Optimizing ranker model (MAP@5)")
    else:  # combined
        objective_func = objective_combined
        print(f"\n🎯 Optimizing combined models (weighted score)")
    
    # Run optimization
    study.optimize(objective_func, n_trials=args.n_trials)
    
    # Analyze results
    analyze_study_results(study)
    
    # Save results
    print(f"\n💾 Saving study results...")
    results_path = save_study_results(study, args.study_name)
    
    # Recommendations
    if study.best_params:
        print(f"\n💡 RECOMMENDATIONS:")
        print(f"Use these hyperparameters for best performance:")
        for param, value in study.best_params.items():
            if isinstance(value, float):
                print(f"  --{param.replace('_', '-')} {value:.4f}")
            else:
                print(f"  --{param.replace('_', '-')} {value}")
    
    print(f"\n✅ Hyperparameter optimization complete!")
    print(f"Best {args.model} performance: {study.best_value:.4f}")
    
    return 0


if __name__ == "__main__":
    exit(main())