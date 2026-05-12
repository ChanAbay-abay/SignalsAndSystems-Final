# ECG Anomaly Detection System

Unsupervised ECG heartbeat classification using Hierarchical Agglomerative Clustering and Pearson correlation features, built on the ECG5000 dataset. The system trains entirely without labels, identifies a "normal" heartbeat cluster, and classifies new signals at inference time using nearest-centroid assignment.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Dataset](#dataset)
3. [Signal Processing Pipeline](#signal-processing-pipeline)
4. [Feature Extraction](#feature-extraction)
5. [Hierarchical Clustering & Hyperparameter Sweep](#hierarchical-clustering--hyperparameter-sweep)
6. [Inference: Nearest-Centroid Classification](#inference-nearest-centroid-classification)
7. [Evaluation Metrics](#evaluation-metrics)
8. [Frontend UI](#frontend-ui)
9. [Project Structure](#project-structure)
10. [Running the App](#running-the-app)
11. [Tech Stack](#tech-stack)

---

## Project Overview

The goal is to detect anomalous ECG heartbeats **without using labels during training**. The model:

1. Filters raw ECG signals with a bandpass filter to remove noise and baseline wander.
2. Extracts two features per signal: Pearson R² similarity to the mean normal template, and signal variance (energy).
3. Runs Hierarchical Agglomerative Clustering (Ward linkage) sweeping k from 2 to 10, selecting the best `k` using the Silhouette Score.
4. Identifies the "normal" cluster as the one with the highest mean R² — high similarity to the normal template.
5. At inference time, assigns a new signal to the closest cluster centroid (normal vs. irregular) in scaled feature space.

The frontend visualises each step of the pipeline interactively across six charts (Silhouette Score sweep, normal template, R² distribution, cluster scatter, morphology comparison, R² strip plot) and a five-step algorithm walkthrough for any uploaded or sample signal. Every chart and walkthrough step includes a plain-English tooltip explaining what is shown and how to interpret it.

---

## Dataset

**ECG5000** — a standard ECG time-series benchmark derived from the PhysioNet dataset.

| Split | Samples | Signal Length |
|-------|---------|---------------|
| Train | 500     | 140 samples   |
| Test  | 4,500   | 140 samples   |

Each signal is one heartbeat window of 140 samples, recorded at approximately 250 Hz (giving a ~560 ms window). The dataset has 5 original class labels:

| Class | Meaning         | Train Count |
|-------|-----------------|-------------|
| 1     | Normal          | 292         |
| 2     | R-on-T PVC      | 177         |
| 3     | PVC             | 10          |
| 4     | SP/EB           | 19          |
| 5     | UB/FB           | 2           |

For this project, class `1` is treated as **Normal** and all other classes as **Irregular**. The model never sees these labels during training — they are only used post-hoc to evaluate performance.

The 10 sample signals exposed in the UI are drawn directly from `ECG5000_TEST.arff`: the first 5 normal heartbeats and first 5 irregular heartbeats in the test split. These are genuinely unseen signals — the model never trains on them.

---

## Signal Processing Pipeline

### Bandpass Filter

Each raw ECG signal is passed through a 2nd-order Butterworth bandpass filter:

- **Low cutoff:** 0.5 Hz — removes baseline wander (slow drift in the signal)
- **High cutoff:** 40.0 Hz — removes high-frequency noise and EMG interference
- **Sampling rate:** 250 Hz
- **Implementation:** `scipy.signal.butter` + `scipy.signal.lfilter`

```python
# backend/utils/signal_processing.py
def bandpass_filter(data, lowcut=0.5, highcut=40.0, fs=250, order=2):
    nyq = 0.5 * fs
    b, a = signal.butter(order, [lowcut/nyq, highcut/nyq], btype='band')
    return signal.lfilter(b, a, data)
```

This retains the clinically relevant ECG frequency content (QRS complex, P-wave, T-wave) while discarding artefacts. The filtered signal is what all downstream steps operate on.

### Normal Template

After filtering, all training signals labelled as class `1` are averaged to produce a **mean normal template**. This template serves as the reference waveform for feature extraction — it represents what a typical healthy heartbeat looks like in this dataset.

---

## Feature Extraction

Each filtered signal is reduced to a **2D feature vector**:

### Feature 1 — R² (Pearson Similarity)

The squared Pearson correlation coefficient between the signal and the mean normal template:

```
r = pearsonr(signal, mean_normal_template)
R² = r²
```

- Range: 0 to 1
- **High R²** → the signal's shape closely matches the normal template → likely Normal
- **Low R²** → the signal deviates significantly from the normal template → likely Irregular
- Using R² instead of r avoids sign ambiguity from phase-inverted signals

### Feature 2 — Variance (Signal Energy)

The statistical variance of the filtered signal:

```
variance = np.var(signal)
```

Variance captures the amplitude spread / energy of the heartbeat. Abnormal beats (e.g. PVCs) often have different energy profiles than normal sinus beats. Combined with R², it provides a 2D space that separates the two populations cleanly.

---

## Hierarchical Clustering & Hyperparameter Sweep

### Why Hierarchical Agglomerative Clustering?

Hierarchical Agglomerative Clustering (HAC) with Ward linkage is chosen because:
- It builds a full hierarchy of merges (dendrogram), making the cluster structure interpretable
- Ward linkage minimises within-cluster variance at each merge step, producing compact, well-separated clusters
- The number of clusters `k` can be selected after the fact by cutting the dendrogram, enabling a principled sweep without re-running the algorithm

### K Sweep with Silhouette Score

The key hyperparameter is `k` — the number of clusters. Rather than guessing, the system computes a single linkage matrix and sweeps `k` from 2 to 10, selecting the best using the **Silhouette Score**:

```
S(i) = (b(i) - a(i)) / max(a(i), b(i))
```

Where `a(i)` is the mean intra-cluster distance for point i, and `b(i)` is the mean distance to the nearest other cluster. The overall Silhouette Score is the mean of S(i) across all points. **Higher score = better-defined, more separated clusters** (range: −1 to 1).

```python
# backend/utils/clustering.py
Z = linkage(X_scaled, 'ward')

for k in range(2, 11):
    labels = fcluster(Z, k, criterion='maxclust')
    score = silhouette_score(X_scaled, labels)
    # track best
```

Features are standardised with `StandardScaler` before clustering so that R² and variance contribute equally regardless of their natural scale. The linkage matrix is computed once and `fcluster` cuts it at each `k`, making the sweep efficient.

### Identifying the Normal Cluster

After clustering with `best_k`, the cluster with the **highest mean R²** is designated as the Normal cluster. Since normal heartbeats have high correlation with the normal template by definition, this heuristic reliably identifies the correct cluster without using any labels.

---

## Inference: Nearest-Centroid Classification

At inference time, re-running hierarchical clustering on a small number of new signals is unreliable — cluster structure is undefined for a single point. Instead, inference uses **nearest-centroid classification** in the scaled feature space:

1. Compute the centroids of the Normal and Irregular training clusters (in StandardScaler-transformed space).
2. For a new signal, extract its features and apply the same scaler transform.
3. Assign it to whichever centroid it is closer to (Euclidean distance).

```python
dist_normal    = np.linalg.norm(X_scaled - normal_centroid, axis=1)
dist_irregular = np.linalg.norm(X_scaled - irregular_centroid, axis=1)
prediction = (dist_normal <= dist_irregular).astype(int)  # 1 = Normal, 0 = Irregular
```

This generalises correctly to unseen data because the decision boundary is defined by the full cluster geometry learned during training.

---

## Evaluation Metrics

Predictions are evaluated against the ground-truth class labels (1 = Normal, other = Irregular):

| Metric    | Definition |
|-----------|-----------|
| Accuracy  | (TP + TN) / total |
| Precision | TP / (TP + FP) — of predicted Normal, how many are actually Normal |
| Recall    | TP / (TP + FN) — of actual Normal signals, how many were caught |
| F1-Score  | Harmonic mean of Precision and Recall |

A 2×2 confusion matrix is always returned with `labels=[0, 1]` to ensure consistent layout even when a test set contains only one class.

Training set performance with optimal `k = 3`:

| Metric    | Score  |
|-----------|--------|
| Accuracy  | ~93%   |
| Precision | ~99%   |
| Recall    | ~88%   |
| F1-Score  | ~93%   |

---

## Frontend UI

### Visualization Charts

Six interactive Plotly charts are displayed in a 2-column grid. Each has an **ⓘ info tooltip** (hover the icon next to the title) explaining what the chart shows and how to read it in plain terms.

| # | Chart | What it shows |
|---|-------|---------------|
| 1 | Silhouette Score vs K | Hyperparameter sweep — how well-separated each K value's clusters are; red line = optimal K |
| 2 | Normal Database Template | Mean healthy heartbeat (blue) overlaid on 50 individual normal beats (grey) |
| 3 | R² Similarity Distribution | Histogram of how closely every training signal matches the normal template |
| 4 | Hierarchical Clusters | 2D scatter of every training beat by R² and variance; blue = Normal, red = Irregular |
| 5 | Morphology Comparison | Shape overlay of the normal template vs the currently selected/uploaded signal |
| 6 | R² Values: Normal vs Irregular | Box-and-dot plot of R² scores split by class, showing the separation between groups |

Charts 3 and 6 are rendered taller than the others because they have no legends, giving more space to the data area.

### Algorithm Walkthrough

After selecting a sample or uploading a file, a five-step interactive walkthrough appears. Each step has a **"How to read this ⓘ"** tooltip inside the content area.

| Step | Content |
|------|---------|
| 1. Upload | Raw unprocessed ECG signal as recorded |
| 2. Filtered | Bandpass-filtered signal (blue) overlaid on the raw signal (faded), showing noise removal |
| 3. Features | R² and Variance values computed for this signal |
| 4. Clustering | Star marker showing where this signal sits in the 2D feature space |
| 5. Result | Final Normal / Irregular classification with ground truth comparison for sample signals |

---

## Project Structure

```
SignalsAndSystems-Final/
├── run.sh                        # One-command startup script
├── ECG5000/
│   ├── ECG5000_TRAIN.arff        # 500 training heartbeats
│   └── ECG5000_TEST.arff         # 4500 test heartbeats
│
├── backend/
│   ├── run.py                    # Flask entry point
│   ├── app.py                    # App factory — trains model on startup
│   ├── requirements.txt
│   ├── api/
│   │   └── ecg_routes.py         # REST endpoints (/api/training-data, /api/analyze, etc.)
│   ├── models/
│   │   └── ecg_analyzer.py       # Core model: fit(), analyze_signals(), _classify_features()
│   └── utils/
│       ├── signal_processing.py  # bandpass_filter(), get_correlation_features()
│       ├── clustering.py         # ecg_hierarchical_clustering(), get_normal_cluster_label()
│       └── data_loader.py        # ARFF / CSV parsing
│
└── frontend/
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx               # Fetches training data and sample signals on mount
        ├── store/
        │   └── ecgStore.ts       # Zustand global state
        ├── hooks/
        │   └── useSignalApi.ts   # API calls with loading/error state
        ├── types/
        │   └── ecg.ts            # TypeScript interfaces
        └── components/
            ├── Header.tsx
            ├── Dashboard.tsx          # Layout: Upload → Graphs → Results → Walkthrough
            ├── SignalUpload.tsx        # Drag-and-drop upload + sample signal buttons
            ├── VisualizationGrid.tsx  # 6 Plotly charts, each with an info tooltip
            ├── ResultsPanel.tsx       # 2-column metrics + confusion matrix
            ├── AlgorithmWalkthrough.tsx  # 5-step walkthrough, each step has an info tooltip
            ├── InfoTooltip.tsx        # Shared hover tooltip component (ⓘ icon)
            └── Plot.tsx               # Plotly.js wrapper (replaces react-plotly.js for React 19)
```

---

## Running the App

### Prerequisites

- Python 3.10+
- Node.js 18+

### Start

```bash
./run.sh
```

This script:
1. Creates a Python virtual environment in `backend/.venv` if it doesn't exist
2. Installs Python dependencies from `backend/requirements.txt`
3. Starts the Flask backend on `http://localhost:5001` — the model trains on ECG5000_TRAIN.arff at startup (~5 seconds)
4. Installs Node dependencies if needed and starts the Vite dev server on `http://localhost:3000`
5. Opens the browser automatically

### API Endpoints

| Method | Path                  | Description                                      |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/api/health`         | Health check                                     |
| GET    | `/api/training-data`  | Returns all visualisation data from training     |
| GET    | `/api/sample-signals` | Returns the 10 pre-loaded test samples           |
| POST   | `/api/analyze`        | Analyse an uploaded file or a sample by ID       |

The `/api/analyze` endpoint accepts either a multipart file upload (`.arff` or `.csv`) or a JSON body `{ "sample_id": N }`.

---

## Tech Stack

**Backend**
- Python / Flask — REST API
- NumPy / SciPy — signal filtering, feature computation, and Ward linkage (`scipy.cluster.hierarchy`)
- scikit-learn — StandardScaler, Silhouette Score, evaluation metrics
- pandas — ARFF/CSV parsing

**Frontend**
- React 19 + TypeScript
- Vite + Tailwind CSS v4
- Plotly.js (`plotly.js-dist-min`) — interactive charts via a custom React wrapper
- Zustand — global state management
