import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
)

from utils.signal_processing import bandpass_filter, get_correlation_features
from utils.clustering import ecg_hierarchical_clustering, get_normal_cluster_label
from utils.data_loader import load_arff


_SAMPLE_COUNT = 10  # number of sample signals exposed (5 normal + 5 irregular)


class ECGAnalyzer:
    def __init__(self, train_arff_path, test_arff_path=None):
        self.train_arff_path = train_arff_path
        self.test_arff_path = test_arff_path

        self.mean_normal = None
        self.best_k = None
        self.scaler = None
        self.X_raw = None
        self.X_filt = None
        self.X_normal = None
        self.X_features = None
        self.final_labels = None
        self.normal_cluster_label = None
        self.silhouette_scores = None
        self.valid_k = None
        self.y = None
        self.metrics = None
        self.normal_centroid_scaled = None
        self.irregular_centroid_scaled = None

        # Pre-loaded sample signals from test set
        self._samples = []

    def fit(self):
        X_raw, y = load_arff(self.train_arff_path)
        self.X_raw = X_raw
        self.y = y

        self.X_filt = np.array([bandpass_filter(row) for row in X_raw])

        normal_mask = (y == '1')
        self.X_normal = self.X_filt[normal_mask]
        self.mean_normal = np.mean(self.X_normal, axis=0)

        self.X_features = get_correlation_features(self.X_filt, self.mean_normal)

        (self.final_labels, self.silhouette_scores,
         self.valid_k, self.best_k, self.scaler) = ecg_hierarchical_clustering(self.X_features)

        self.normal_cluster_label = get_normal_cluster_label(
            self.final_labels, self.X_features
        )

        normal_cluster_mask = self.final_labels == self.normal_cluster_label
        irregular_cluster_mask = self.final_labels != self.normal_cluster_label

        X_feat_scaled = self.scaler.transform(self.X_features)
        self.normal_centroid_scaled = X_feat_scaled[normal_cluster_mask].mean(axis=0)
        self.irregular_centroid_scaled = (
            X_feat_scaled[irregular_cluster_mask].mean(axis=0)
            if irregular_cluster_mask.any()
            else -self.normal_centroid_scaled
        )

        y_true = (y == '1').astype(int)
        y_pred = np.zeros(len(self.final_labels), dtype=int)
        if self.normal_cluster_label is not None:
            y_pred[self.final_labels == self.normal_cluster_label] = 1

        self.metrics = self._compute_metrics(y_true, y_pred)
        self._load_samples()

    def _load_samples(self):
        if not self.test_arff_path:
            return
        try:
            X_test, y_test = load_arff(self.test_arff_path)
        except Exception:
            return

        normal_idx = np.where(y_test == '1')[0]
        irregular_idx = np.where(y_test != '1')[0]

        chosen = list(normal_idx[:5]) + list(irregular_idx[:5])
        for i, idx in enumerate(chosen):
            label = y_test[idx]
            self._samples.append({
                'id': i,
                'name': f"Sample {i + 1} ({'Normal' if label == '1' else 'Irregular'})",
                'ground_truth': label,
                'signal': X_test[idx].tolist(),
            })

    def _classify_features(self, X_features_new):
        """Nearest-centroid classification in scaled feature space."""
        X_scaled = self.scaler.transform(X_features_new)
        dist_normal = np.linalg.norm(X_scaled - self.normal_centroid_scaled, axis=1)
        dist_irregular = np.linalg.norm(X_scaled - self.irregular_centroid_scaled, axis=1)
        return (dist_normal <= dist_irregular).astype(int)

    def _compute_metrics(self, y_true, y_pred):
        return {
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'precision': float(precision_score(y_true, y_pred, pos_label=1, zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, pos_label=1, zero_division=0)),
            'f1': float(f1_score(y_true, y_pred, pos_label=1, zero_division=0)),
            'confusion_matrix': confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
        }

    def get_sample_signals(self):
        return [{'id': s['id'], 'name': s['name'], 'ground_truth': s['ground_truth']}
                for s in self._samples]

    def analyze_sample(self, sample_id):
        sample = next((s for s in self._samples if s['id'] == sample_id), None)
        if sample is None:
            raise ValueError(f"Sample {sample_id} not found")
        X_raw = np.array(sample['signal']).reshape(1, -1)
        y = np.array([sample['ground_truth']])
        result = self.analyze_signals(X_raw, y)
        result['sample_name'] = sample['name']
        return result

    def analyze_signals(self, X_raw_input, y_input=None):
        X_filt = np.array([bandpass_filter(row) for row in X_raw_input])
        X_features = get_correlation_features(X_filt, self.mean_normal)
        y_pred = self._classify_features(X_features)

        result = {
            'labels': y_pred.tolist(),
            'features': X_features.tolist(),
            'normal_cluster_label': 1,
            'signals_raw': X_raw_input.tolist(),
            'signals_filtered': X_filt.tolist(),
            'predictions': y_pred.tolist(),
        }

        if y_input is not None:
            y_true = (np.array(y_input) == '1').astype(int)
            result['metrics'] = self._compute_metrics(y_true, y_pred)
            result['ground_truth'] = y_true.tolist()

        return result

    def get_training_visualization_data(self):
        normal_mask = self.final_labels == self.normal_cluster_label
        irregular_mask = ~normal_mask

        irreg_indices = np.where(irregular_mask)[0]
        sample_irreg_signal = (
            self.X_filt[irreg_indices[0]].tolist() if len(irreg_indices) > 0 else []
        )

        return {
            'k_sweep': {
                'k_values': list(self.valid_k),
                'silhouette_scores': list(self.silhouette_scores),
                'best_k': int(self.best_k),
            },
            'normal_template': {
                'mean_signal': self.mean_normal.tolist(),
                'normal_signals_sample': self.X_normal[:50].tolist(),
            },
            'r_squared_distribution': {
                'values': self.X_features[:, 0].tolist(),
            },
            'clusters': {
                'r_squared': self.X_features[:, 0].tolist(),
                'variance': self.X_features[:, 1].tolist(),
                'labels': self.final_labels.tolist(),
                'normal_cluster_label': int(self.normal_cluster_label) if self.normal_cluster_label is not None else None,
            },
            'morphology': {
                'mean_normal': self.mean_normal.tolist(),
                'sample_irregular': sample_irreg_signal,
            },
            'r_squared_strip': {
                'normal': self.X_features[normal_mask, 0].tolist(),
                'irregular': self.X_features[irregular_mask, 0].tolist(),
            },
            'metrics': self.metrics,
            'best_k': int(self.best_k),
        }
