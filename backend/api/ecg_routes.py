import numpy as np
from flask import Blueprint, jsonify, request, current_app

from utils.data_loader import parse_upload

bp = Blueprint('ecg', __name__, url_prefix='/api')


def get_analyzer():
    return current_app.config['ANALYZER']


@bp.get('/health')
def health():
    return jsonify({'status': 'ok'})


@bp.get('/training-data')
def training_data():
    analyzer = get_analyzer()
    return jsonify(analyzer.get_training_visualization_data())


@bp.get('/sample-signals')
def sample_signals():
    analyzer = get_analyzer()
    samples = analyzer.get_sample_signals()
    return jsonify(samples)


@bp.post('/analyze')
def analyze():
    analyzer = get_analyzer()

    if 'file' in request.files:
        f = request.files['file']
        file_bytes = f.read()
        try:
            X_raw, y = parse_upload(file_bytes, f.filename)
        except Exception as e:
            return jsonify({'error': str(e)}), 400

        has_labels = not all(lbl == 'unknown' for lbl in y)
        result = analyzer.analyze_signals(X_raw, y if has_labels else None)
        result['source'] = 'upload'
        result['filename'] = f.filename
        return jsonify(result)

    elif request.is_json:
        body = request.get_json()
        sample_id = body.get('sample_id')
        if sample_id is not None:
            try:
                result = analyzer.analyze_sample(int(sample_id))
                result['source'] = 'sample'
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': str(e)}), 400

        signal_data = body.get('signal')
        if signal_data:
            X_raw = np.array(signal_data, dtype=float)
            if X_raw.ndim == 1:
                X_raw = X_raw.reshape(1, -1)
            result = analyzer.analyze_signals(X_raw)
            result['source'] = 'manual'
            return jsonify(result)

    return jsonify({'error': 'No file or signal data provided'}), 400
