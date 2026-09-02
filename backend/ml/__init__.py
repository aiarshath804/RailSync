"""
RailSync Machine Learning Module: Real, Reproducible Decision Intelligence.
Provides end-to-end dataset generation, feature engineering, model training,
evaluation, persistence, inference, explainability, and baseline analytics.
"""

from backend.ml.dataset import DatasetService
from backend.ml.feature_engineering import FeaturePipeline
from backend.ml.model import RandomForestModel
from backend.ml.trainer import ModelTrainer
from backend.ml.inference import MLInferenceEngine

__all__ = [
    "DatasetService",
    "FeaturePipeline",
    "RandomForestModel",
    "ModelTrainer",
    "MLInferenceEngine"
]
