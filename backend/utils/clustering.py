import numpy as np
from scipy.cluster.hierarchy import linkage, fcluster
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score


def ecg_hierarchical_clustering(X_features, n_clusters_range=(2, 10)):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_features)

    Z = linkage(X_scaled, 'ward')

    sil_scores = []
    valid_k = []
    best_score = -2.0
    best_k = n_clusters_range[0]
    best_labels = None

    for k in range(n_clusters_range[0], n_clusters_range[1] + 1):
        labels = fcluster(Z, k, criterion='maxclust')
        try:
            score = silhouette_score(X_scaled, labels)
            sil_scores.append(score)
            valid_k.append(k)
            if score > best_score:
                best_score = score
                best_k = k
                best_labels = labels
        except ValueError:
            pass

    if best_labels is None:
        best_k = n_clusters_range[0]
        best_labels = fcluster(Z, best_k, criterion='maxclust')
        sil_scores = [0.0]
        valid_k = [best_k]

    return best_labels, sil_scores, valid_k, best_k, scaler


def get_normal_cluster_label(labels, X_features):
    unique = np.unique(labels)
    if len(unique) == 0:
        return None
    means = [np.mean(X_features[labels == i, 0]) for i in unique]
    return unique[int(np.argmax(means))]
