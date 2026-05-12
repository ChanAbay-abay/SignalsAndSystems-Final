import numpy as np
import scipy.signal as signal
from scipy.stats import pearsonr


def bandpass_filter(data, lowcut=0.5, highcut=40.0, fs=250, order=2):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = signal.butter(order, [low, high], btype='band')
    return signal.lfilter(b, a, data)


def get_correlation_features(X_data, reference_signal):
    features = []
    for sig in X_data:
        r, _ = pearsonr(sig, reference_signal)
        r_sq = r ** 2
        features.append([r_sq, np.var(sig)])
    return np.array(features)
