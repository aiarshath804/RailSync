"""
RailSync Random Forest Classifier Engine.
A pure Python mathematical ensemble learning model with multi-class Gini impurity optimization,
bootstrap aggregation, random subspace feature bagging, class probability estimation,
global feature importance calculation, and local tree decision path attribution.
Fully serializable to/from JSON artifacts.
"""

import math
import random
from typing import List, Dict, Any, Tuple, Optional


class DecisionNode:
    def __init__(
        self,
        feature_idx: int = -1,
        threshold: float = 0.0,
        left: Optional["DecisionNode"] = None,
        right: Optional["DecisionNode"] = None,
        is_leaf: bool = False,
        class_probabilities: Optional[List[float]] = None,
        predicted_class: int = 0,
        samples_count: int = 0,
        impurity: float = 0.0
    ):
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right
        self.is_leaf = is_leaf
        self.class_probabilities = class_probabilities or []
        self.predicted_class = predicted_class
        self.samples_count = samples_count
        self.impurity = impurity

    def to_dict(self) -> Dict[str, Any]:
        if self.is_leaf:
            return {
                "leaf": True,
                "probabilities": self.class_probabilities,
                "predicted_class": self.predicted_class,
                "samples": self.samples_count,
                "impurity": round(self.impurity, 5)
            }
        return {
            "leaf": False,
            "feature_idx": self.feature_idx,
            "threshold": round(self.threshold, 5),
            "samples": self.samples_count,
            "impurity": round(self.impurity, 5),
            "probabilities": self.class_probabilities,
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionNode":
        if data.get("leaf", False):
            return cls(
                is_leaf=True,
                class_probabilities=data.get("probabilities", []),
                predicted_class=data.get("predicted_class", 0),
                samples_count=data.get("samples", 0),
                impurity=data.get("impurity", 0.0)
            )
        node = cls(
            feature_idx=data["feature_idx"],
            threshold=data["threshold"],
            samples_count=data.get("samples", 0),
            impurity=data.get("impurity", 0.0),
            class_probabilities=data.get("probabilities", []),
            is_leaf=False
        )
        if data.get("left"):
            node.left = cls.from_dict(data["left"])
        if data.get("right"):
            node.right = cls.from_dict(data["right"])
        return node


class DecisionTree:
    def __init__(self, max_depth: int = 6, min_samples_split: int = 4, num_classes: int = 4):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.num_classes = num_classes
        self.root: Optional[DecisionNode] = None
        self.feature_importances_accum: Dict[int, float] = {}

    def _calculate_gini(self, y: List[int]) -> float:
        if not y:
            return 0.0
        n = len(y)
        counts = [0] * self.num_classes
        for label in y:
            if 0 <= label < self.num_classes:
                counts[label] += 1
        return 1.0 - sum((c / n) ** 2 for c in counts)

    def _get_class_distribution(self, y: List[int]) -> List[float]:
        if not y:
            return [1.0 / self.num_classes] * self.num_classes
        n = len(y)
        counts = [0] * self.num_classes
        for label in y:
            if 0 <= label < self.num_classes:
                counts[label] += 1
        return [round(c / n, 5) for c in counts]

    def fit(self, X: List[List[float]], y: List[int], rng: random.Random) -> None:
        self.feature_importances_accum = {}
        self.root = self._build_tree(X, y, depth=0, rng=rng)

    def _build_tree(self, X: List[List[float]], y: List[int], depth: int, rng: random.Random) -> DecisionNode:
        n_samples = len(X)
        probs = self._get_class_distribution(y)
        pred_class = max(range(self.num_classes), key=lambda c: probs[c])
        current_gini = self._calculate_gini(y)

        # Stopping conditions
        if depth >= self.max_depth or n_samples < self.min_samples_split or current_gini == 0.0:
            return DecisionNode(
                is_leaf=True,
                class_probabilities=probs,
                predicted_class=pred_class,
                samples_count=n_samples,
                impurity=current_gini
            )

        n_features = len(X[0])
        # Random subspace feature selection
        k_features = min(n_features, max(4, int(math.sqrt(n_features) * 1.5)))
        feature_indices = rng.sample(range(n_features), k=k_features)

        best_gain = 0.0
        best_feat = -1
        best_thresh = 0.0
        best_left_idx, best_right_idx = [], []

        for feat in feature_indices:
            values = sorted(list(set(row[feat] for row in X)))
            if len(values) <= 1:
                continue

            # Candidate thresholds as midpoints or quantiles
            if len(values) <= 20:
                thresholds = [(values[i] + values[i + 1]) / 2.0 for i in range(len(values) - 1)]
            else:
                step = len(values) / 20.0
                thresholds = [(values[int(i * step)] + values[min(len(values) - 1, int((i + 1) * step))]) / 2.0 for i in range(19)]

            for thresh in thresholds:
                left_idx = [i for i, row in enumerate(X) if row[feat] <= thresh]
                right_idx = [i for i, row in enumerate(X) if row[feat] > thresh]

                if not left_idx or not right_idx:
                    continue

                y_l = [y[i] for i in left_idx]
                y_r = [y[i] for i in right_idx]

                gini_l = self._calculate_gini(y_l)
                gini_r = self._calculate_gini(y_r)
                weighted_gini = (len(y_l) * gini_l + len(y_r) * gini_r) / n_samples
                gain = current_gini - weighted_gini

                if gain > best_gain:
                    best_gain = gain
                    best_feat = feat
                    best_thresh = thresh
                    best_left_idx = left_idx
                    best_right_idx = right_idx

        if best_gain <= 1e-6 or best_feat == -1:
            return DecisionNode(
                is_leaf=True,
                class_probabilities=probs,
                predicted_class=pred_class,
                samples_count=n_samples,
                impurity=current_gini
            )

        # Record feature importance gain
        self.feature_importances_accum[best_feat] = self.feature_importances_accum.get(best_feat, 0.0) + (best_gain * n_samples)

        left_child = self._build_tree([X[i] for i in best_left_idx], [y[i] for i in best_left_idx], depth + 1, rng)
        right_child = self._build_tree([X[i] for i in best_right_idx], [y[i] for i in best_right_idx], depth + 1, rng)

        return DecisionNode(
            feature_idx=best_feat,
            threshold=best_thresh,
            left=left_child,
            right=right_child,
            is_leaf=False,
            class_probabilities=probs,
            predicted_class=pred_class,
            samples_count=n_samples,
            impurity=current_gini
        )

    def predict_sample(self, sample: List[float]) -> Tuple[List[float], Dict[int, float]]:
        """
        Traverses tree and returns (leaf_probabilities, feature_contributions_dict).
        Feature contribution measures change in expected probability vector along the path.
        """
        curr = self.root
        contributions: Dict[int, float] = {}
        if not curr:
            return [1.0 / self.num_classes] * self.num_classes, contributions

        while curr and not curr.is_leaf:
            feat = curr.feature_idx
            prev_crit_prob = curr.class_probabilities[3] if len(curr.class_probabilities) > 3 else 0.0
            
            if sample[feat] <= curr.threshold:
                next_node = curr.left
            else:
                next_node = curr.right

            if next_node:
                next_crit_prob = next_node.class_probabilities[3] if len(next_node.class_probabilities) > 3 else 0.0
                diff = next_crit_prob - prev_crit_prob
                contributions[feat] = contributions.get(feat, 0.0) + diff
                curr = next_node
            else:
                break

        return (curr.class_probabilities if curr else [0.25] * self.num_classes), contributions


class RandomForestModel:
    """
    Production-ready Random Forest Classifier for Failure Risk Classification.
    """
    CLASS_LABELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    def __init__(
        self,
        n_estimators: int = 35,
        max_depth: int = 6,
        min_samples_split: int = 4,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.random_state = random_state
        self.num_classes = len(self.CLASS_LABELS)
        self.trees: List[DecisionTree] = []
        self.feature_importances: Dict[str, float] = {}
        self.feature_names: List[str] = []
        self.is_trained: bool = False

    def fit(self, X: List[List[float]], y: List[int], feature_names: Optional[List[str]] = None) -> "RandomForestModel":
        if not X or not y:
            raise ValueError("Training dataset cannot be empty.")

        n_samples = len(X)
        self.feature_names = feature_names or [f"feature_{i}" for i in range(len(X[0]))]
        self.trees = []
        rng = random.Random(self.random_state)
        
        raw_importances: Dict[int, float] = {i: 0.0 for i in range(len(self.feature_names))}

        for t_idx in range(self.n_estimators):
            # Bootstrap sampling with replacement
            bootstrap_indices = [rng.randint(0, n_samples - 1) for _ in range(n_samples)]
            X_boot = [X[i] for i in bootstrap_indices]
            y_boot = [y[i] for i in bootstrap_indices]

            tree = DecisionTree(
                max_depth=self.max_depth,
                min_samples_split=self.min_samples_split,
                num_classes=self.num_classes
            )
            tree.fit(X_boot, y_boot, rng=rng)
            self.trees.append(tree)

            for feat_idx, gain in tree.feature_importances_accum.items():
                raw_importances[feat_idx] = raw_importances.get(feat_idx, 0.0) + gain

        # Normalize global feature importances
        total_gain = sum(raw_importances.values())
        if total_gain > 0:
            self.feature_importances = {
                self.feature_names[i]: round(gain / total_gain, 4)
                for i, gain in raw_importances.items()
                if i < len(self.feature_names)
            }
        else:
            self.feature_importances = {fn: 1.0 / len(self.feature_names) for fn in self.feature_names}

        self.is_trained = True
        return self

    def predict_proba(self, X: List[List[float]]) -> List[List[float]]:
        if not self.is_trained or not self.trees:
            raise RuntimeError("Model must be trained before predict_proba.")

        results = []
        for sample in X:
            tree_probs = [tree.predict_sample(sample)[0] for tree in self.trees]
            avg_probs = [0.0] * self.num_classes
            for probs in tree_probs:
                for c in range(self.num_classes):
                    avg_probs[c] += probs[c]
            avg_probs = [round(p / len(self.trees), 4) for p in avg_probs]
            results.append(avg_probs)
        return results

    def predict(self, X: List[List[float]]) -> List[int]:
        probs_list = self.predict_proba(X)
        return [max(range(self.num_classes), key=lambda c: probs[c]) for probs in probs_list]

    def explain_sample(
        self,
        sample: List[float],
        top_k: int = 4
    ) -> Tuple[List[float], int, str, float, List[Dict[str, Any]]]:
        """
        Generates probability distribution, predicted class label, confidence, and top feature attributions.
        """
        if not self.is_trained or not self.trees:
            raise RuntimeError("Model must be trained before explain_sample.")

        tree_probs = []
        accum_contributions: Dict[int, float] = {}

        for tree in self.trees:
            probs, contribs = tree.predict_sample(sample)
            tree_probs.append(probs)
            for feat_idx, val in contribs.items():
                accum_contributions[feat_idx] = accum_contributions.get(feat_idx, 0.0) + val

        # Ensemble average probabilities
        avg_probs = [0.0] * self.num_classes
        for probs in tree_probs:
            for c in range(self.num_classes):
                avg_probs[c] += probs[c]
        avg_probs = [round(p / len(self.trees), 4) for p in avg_probs]

        pred_class_idx = max(range(self.num_classes), key=lambda c: avg_probs[c])
        pred_label = self.CLASS_LABELS[pred_class_idx]
        confidence = avg_probs[pred_class_idx]

        # Normalize local contributions
        top_features = []
        sorted_contribs = sorted(
            accum_contributions.items(),
            key=lambda item: abs(item[1]),
            reverse=True
        )

        for feat_idx, score in sorted_contribs[:top_k]:
            if feat_idx < len(self.feature_names):
                fname = self.feature_names[feat_idx]
                val = sample[feat_idx]
                direction = "INCREASED_RISK" if score > 0 else "REDUCED_RISK"
                top_features.append({
                    "feature": fname,
                    "value": round(val, 3),
                    "attribution_score": round(score / len(self.trees), 4),
                    "global_importance": self.feature_importances.get(fname, 0.0),
                    "direction": direction
                })

        return avg_probs, pred_class_idx, pred_label, confidence, top_features

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "min_samples_split": self.min_samples_split,
            "random_state": self.random_state,
            "num_classes": self.num_classes,
            "class_labels": self.CLASS_LABELS,
            "feature_names": self.feature_names,
            "feature_importances": self.feature_importances,
            "is_trained": self.is_trained,
            "trees": [tree.root.to_dict() if tree.root else None for tree in self.trees]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RandomForestModel":
        model = cls(
            n_estimators=data.get("n_estimators", 35),
            max_depth=data.get("max_depth", 6),
            min_samples_split=data.get("min_samples_split", 4),
            random_state=data.get("random_state", 42)
        )
        model.feature_names = data.get("feature_names", [])
        model.feature_importances = data.get("feature_importances", {})
        model.is_trained = data.get("is_trained", False)
        
        trees = []
        for tree_data in data.get("trees", []):
            if tree_data:
                tree = DecisionTree(
                    max_depth=model.max_depth,
                    min_samples_split=model.min_samples_split,
                    num_classes=model.num_classes
                )
                tree.root = DecisionNode.from_dict(tree_data)
                trees.append(tree)
        model.trees = trees
        return model
