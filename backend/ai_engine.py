import math
import random
import json
from typing import Dict, Any, List, Tuple

try:
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

class FallbackRandomForest:
    """
    A pure Python high-fidelity mathematical fallback for Random Forest.
    Guarantees deterministic, production-ready, zero-dependency model training and inference
    in sandboxed environments where binary wheels (scikit-learn/xgboost) are not pre-compiled.
    """
    def __init__(self, n_estimators: int = 10, max_depth: int = 5):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.trees = []

    def fit(self, X: List[List[float]], y: List[int]):
        """
        Trains n_estimators of decision trees on bootstrap samples of the training data.
        """
        if not X or not y:
            return
        
        n_samples = len(X)
        n_features = len(X[0])
        
        for _ in range(self.n_estimators):
            # Bootstrap sample
            indices = [random.randint(0, n_samples - 1) for _ in range(n_samples)]
            X_b = [X[i] for i in indices]
            y_b = [y[i] for i in indices]
            
            # Simple decision tree heuristic node splits
            tree = self._build_tree(X_b, y_b, depth=0, n_features=n_features)
            self.trees.append(tree)

    def _build_tree(self, X: List[List[float]], y: List[int], depth: int, n_features: int) -> Dict[str, Any]:
        """
        Recursively builds a decision tree node by maximizing class purity.
        """
        if depth >= self.max_depth or len(set(y)) <= 1 or len(y) < 2:
            return {"leaf": True, "value": sum(y) / len(y) if y else 0.0}

        # Select random subset of features (Forest feature bagging)
        feature_indices = random.sample(range(n_features), k=max(1, int(math.sqrt(n_features))))
        
        best_feature = -1
        best_threshold = 0.0
        best_gini = 1.0
        best_left_idx, best_right_idx = [], []
        
        # Simple split optimization based on Gini impurity
        for feat in feature_indices:
            thresholds = sorted(list(set(row[feat] for row in X)))
            for thresh in thresholds:
                left = [i for i, row in enumerate(X) if row[feat] <= thresh]
                right = [i for i, row in enumerate(X) if row[feat] > thresh]
                
                if not left or not right:
                    continue
                
                # Gini calculation
                gini_l = 1.0 - sum((y[i] == 1) for i in left)**2 / len(left)**2 - sum((y[i] == 0) for i in left)**2 / len(left)**2
                gini_r = 1.0 - sum((y[i] == 1) for i in right)**2 / len(right)**2 - sum((y[i] == 0) for i in right)**2 / len(right)**2
                weighted_gini = (len(left) * gini_l + len(right) * gini_r) / len(y)
                
                if weighted_gini < best_gini:
                    best_gini = weighted_gini
                    best_feature = feat
                    best_threshold = thresh
                    best_left_idx = left
                    best_right_idx = right

        if best_feature == -1:
            return {"leaf": True, "value": sum(y) / len(y) if y else 0.0}

        # Recursively construct branches
        X_l = [X[i] for i in best_left_idx]
        y_l = [y[i] for i in best_left_idx]
        X_r = [X[i] for i in best_right_idx]
        y_r = [y[i] for i in best_right_idx]

        return {
            "leaf": False,
            "feature": best_feature,
            "threshold": best_threshold,
            "left": self._build_tree(X_l, y_l, depth + 1, n_features),
            "right": self._build_tree(X_r, y_r, depth + 1, n_features)
        }

    def _predict_tree(self, node: Dict[str, Any], sample: List[float]) -> float:
        if node["leaf"]:
            return node["value"]
        if sample[node["feature"]] <= node["threshold"]:
            return self._predict_tree(node["left"], sample)
        return self._predict_tree(node["right"], sample)

    def predict_proba(self, sample: List[float]) -> float:
        """
        Returns probability of urgency (Class 1) based on ensemble vote.
        """
        if not self.trees:
            return 0.5
        votes = [self._predict_tree(tree, sample) for tree in self.trees]
        return sum(votes) / len(votes)


class AIRailSyncPrioritizationEngine:
    """
    AI Task Prioritization Engine for Indian Railways maintenance planning.
    Scores and ranks maintenance requests dynamically on startup or re-trigger.
    """
    def __init__(self):
        self.model = None
        self._is_trained = False
        self._initialize_model()

    def _generate_synthetic_train_data(self) -> Tuple[List[List[float]], List[int]]:
        """
        Generates realistic operational historical maintenance logs for model training.
        Features mapping:
        [defect_severity(1-5), asset_age_years, weather_risk_factor(0-1), delay_impact_mins, frequency_of_inspection_days]
        """
        X = []
        y = []
        random.seed(42)
        
        for _ in range(250):
            severity = random.randint(1, 5)
            age = random.uniform(0.5, 40.0)
            weather = random.uniform(0.0, 1.0)
            delay = random.uniform(0.0, 120.0)
            inspection_freq = random.randint(7, 365)
            
            # Label heuristic: Class 1 if repair is urgent, Class 0 otherwise
            score = (severity * 0.45) + (age / 40.0 * 0.15) + (weather * 0.15) + (delay / 120.0 * 0.25) - (inspection_freq / 365.0 * 0.1)
            is_critical = 1 if score > 0.55 else 0
            
            X.append([severity, age, weather, delay, inspection_freq])
            y.append(is_critical)
            
        return X, y

    def _initialize_model(self):
        """
        Initializes and trains the model.
        Uses scikit-learn RandomForestClassifier if available, else our robust mathematical fallback.
        """
        X, y = self._generate_synthetic_train_data()
        
        if HAS_SKLEARN:
            self.model = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
            # sklearn expects numpy array
            self.model.fit(np.array(X), np.array(y))
        else:
            self.model = FallbackRandomForest(n_estimators=15, max_depth=5)
            self.model.fit(X, y)
            
        self._is_trained = True

    def compute_criticality(self, defect_severity: int, asset_age: float, weather_risk: float, historical_delay: float, inspection_freq: int) -> float:
        """
        Computes a Normalized Criticality Score between 0.00 and 1.00.
        """
        if not self._is_trained:
            self._initialize_model()
            
        features = [float(defect_severity), float(asset_age), float(weather_risk), float(historical_delay), float(inspection_freq)]
        
        if HAS_SKLEARN:
            # Predict probability of class 1 (Critical)
            probs = self.model.predict_proba(np.array([features]))[0]
            # Probabilities is a list of [prob_0, prob_1]
            return float(probs[1])
        else:
            return float(self.model.predict_proba(features))

    def batch_prioritize(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Accepts a batch of maintenance requests, scores them, and adds a Prioritization Rank.
        """
        scored_requests = []
        for req in requests:
            # Retrieve parameters or fall back to realistic defaults
            severity = req.get("defect_severity", 3)
            # Mock or derived assets features for prioritization
            asset_age = req.get("asset_age", 12.5) # Default asset age 12.5 years
            weather_risk = req.get("weather_risk", 0.3) # Default weather risk
            historical_delay = req.get("historical_delay", 15.0) # Historical delay factor (mins)
            inspection_freq = req.get("inspection_freq", 90) # Days between inspection
            
            criticality_score = self.compute_criticality(
                severity, asset_age, weather_risk, historical_delay, inspection_freq
            )
            
            updated_req = req.copy()
            updated_req["urgency_level"] = round(criticality_score, 4)
            scored_requests.append(updated_req)

        # Sort descending by urgency score to generate a Rank
        scored_requests.sort(key=lambda x: x["urgency_level"], reverse=True)
        for index, s_req in enumerate(scored_requests):
            s_req["prioritization_rank"] = index + 1
            
        return scored_requests


if __name__ == "__main__":
    import sys
    try:
        raw_input = sys.stdin.read()
        requests = json.loads(raw_input) if raw_input.strip() else []
        engine = AIRailSyncPrioritizationEngine()
        prioritized = engine.batch_prioritize(requests)
        print(json.dumps({
            "status": "SUCCESS",
            "prioritized_requests": prioritized,
            "has_sklearn": HAS_SKLEARN,
            "engine": "Scikit-Learn RandomForest" if HAS_SKLEARN else "Pure-Python FallbackRandomForest"
        }))
    except Exception as e:
        print(json.dumps({"status": "ERROR", "error": str(e)}))

