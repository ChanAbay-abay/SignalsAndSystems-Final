import os
from flask import Flask
from flask_cors import CORS

from models.ecg_analyzer import ECGAnalyzer
from api.ecg_routes import bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_path = os.path.join(base_dir, 'ECG5000', 'ECG5000_TRAIN.arff')
    test_path = os.path.join(base_dir, 'ECG5000', 'ECG5000_TEST.arff')

    print('Training ECG analyzer on ECG5000_TRAIN.arff ...')
    analyzer = ECGAnalyzer(train_path, test_path)
    analyzer.fit()
    print(f'Training complete. Best K: {analyzer.best_k}')

    app.config['ANALYZER'] = analyzer
    app.register_blueprint(bp)

    return app
