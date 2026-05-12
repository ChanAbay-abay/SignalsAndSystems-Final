import numpy as np
import pandas as pd
from scipy.io import arff
import io


def load_arff(path_or_bytes):
    if isinstance(path_or_bytes, (str, bytes.__class__)):
        data, _ = arff.loadarff(path_or_bytes)
    else:
        data, _ = arff.loadarff(io.StringIO(path_or_bytes.decode('utf-8')))
    df = pd.DataFrame(data)
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].str.decode('utf-8')
    X = df.iloc[:, :-1].values.astype(float)
    y = np.array(df.iloc[:, -1].values, dtype=str)
    return X, y


def load_csv(path_or_bytes):
    if isinstance(path_or_bytes, (str,)):
        df = pd.read_csv(path_or_bytes, header=None)
    else:
        df = pd.read_csv(io.BytesIO(path_or_bytes))
    # Last column is label if non-numeric, otherwise all columns are signal
    last_col = df.iloc[:, -1]
    try:
        last_col.astype(float)
        X = df.values.astype(float)
        y = np.array(['unknown'] * len(X))
    except (ValueError, TypeError):
        X = df.iloc[:, :-1].values.astype(float)
        y = df.iloc[:, -1].values.astype(str)
    return X, y


def parse_upload(file_bytes, filename):
    name = filename.lower()
    if name.endswith('.arff'):
        return load_arff(file_bytes)
    elif name.endswith('.csv') or name.endswith('.txt'):
        return load_csv(file_bytes)
    else:
        raise ValueError(f"Unsupported file format: {filename}")
