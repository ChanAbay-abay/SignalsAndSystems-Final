import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import davies_bouldin_score


def ecg_dbscan(X_features, eps_range=(0.3, 1.0), num_eps=300, min_samples=3):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_features)

    eps_values = np.linspace(eps_range[0], eps_range[1], num_eps)
    db_scores = []
    valid_eps = []

    for eps in eps_values:
        db = DBSCAN(eps=eps, min_samples=min_samples).fit(X_scaled)
        labels = db.labels_
        unique_clusters = np.unique(labels[labels != -1])
        if len(unique_clusters) >= 2:
            mask = labels != -1
            score = davies_bouldin_score(X_scaled[mask], labels[mask])
            db_scores.append(score)
            valid_eps.append(eps)

    if not db_scores:
        best_eps = 0.5
        final_db = DBSCAN(eps=best_eps, min_samples=min_samples).fit(X_scaled)
        return final_db.labels_, [0.0], [best_eps], best_eps, scaler

    best_eps = valid_eps[int(np.argmin(db_scores))]
    final_db = DBSCAN(eps=best_eps, min_samples=min_samples).fit(X_scaled)
    return final_db.labels_, db_scores, valid_eps, best_eps, scaler


def apply_dbscan(X_features, scaler, best_eps, min_samples=3):
    X_scaled = scaler.transform(X_features)
    db = DBSCAN(eps=best_eps, min_samples=min_samples).fit(X_scaled)
    return db.labels_


def get_normal_cluster_label(labels, X_features):
    unique = np.unique(labels[labels != -1])
    if len(unique) == 0:
        return None
    means = [np.mean(X_features[labels == i, 0]) for i in unique]
    return unique[int(np.argmax(means))]
