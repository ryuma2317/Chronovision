import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Model directory resolution order:
#   1. MODEL_DIR env var (set this in production / docker-compose)
#   2. ./model            (co-located with this app.py — copy the trained
#                           model here for deployment)
#   3. ../Prediction_Model_Testing/model  (convenience fallback so this
#                           works straight out of the repo without copying)
_candidates = [
    os.environ.get('MODEL_DIR'),
    os.path.join(os.path.dirname(__file__), 'model'),
    os.path.join(os.path.dirname(__file__), '..', 'Prediction_Model_Testing', 'model'),
]
MODEL_DIR = next((c for c in _candidates if c and os.path.exists(os.path.join(c, 'xgboost.pkl'))), None)
if MODEL_DIR is None:
    raise FileNotFoundError(
        "Could not find xgboost.pkl. Set MODEL_DIR env var, or copy the trained "
        "model folder to Flask_API/model/, or keep Prediction_Model_Testing/ as a sibling folder."
    )
print(f"   Loading model from: {MODEL_DIR}")

pkg = joblib.load(os.path.join(MODEL_DIR, 'xgboost.pkl'))
if isinstance(pkg, dict):
    MODEL    = pkg['model']
    ENCODERS = pkg['encoders']
    FEATURES = pkg['features']
else:
    MODEL    = pkg
    ENCODERS = joblib.load(os.path.join(MODEL_DIR, 'encoders.pkl'))
    FEATURES = joblib.load(os.path.join(MODEL_DIR, 'feature_columns.pkl'))
print(f"   ✔ Model loaded | {len(FEATURES)} features")

CATEGORICAL_COLS = [
    'gender', 'major', 'diet_quality', 'study_environment',
    'learning_style', 'parental_education_level',
    'family_income_range', 'internet_quality',
]

def at_risk_flag(gpa):
    if gpa < 2.0:   return 'high'
    elif gpa < 2.5: return 'moderate'
    else:           return 'on_track'

def gpa_bucket(gpa):
    if gpa >= 3.5:  return 'High (3.5+)'
    elif gpa >= 3.0: return 'Good (3.0-3.5)'
    elif gpa >= 2.0: return 'Average (2.0-3.0)'
    else:            return 'Low (<2.0)'

def encode_input(data):
    row = {}
    for feat in FEATURES:
        val = data.get(feat)
        if val is None:
            raise ValueError(f"Missing feature: '{feat}'")
        if feat in CATEGORICAL_COLS:
            le = ENCODERS[feat]
            if val not in le.classes_:
                raise ValueError(f"Unknown value '{val}' for '{feat}'. Allowed: {list(le.classes_)}")
            val = int(le.transform([val])[0])
        row[feat] = float(val)
    return np.array([row[f] for f in FEATURES]).reshape(1, -1)




@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'xgboost', 'features': len(FEATURES)})


@app.route('/features', methods=['GET'])
def features():
    allowed = {col: list(le.classes_) for col, le in ENCODERS.items()}
    return jsonify({'features': FEATURES, 'categorical_allowed_values': allowed})


@app.route('/predict', methods=['POST'])
def predict():
    """Predict GPA from student features."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'Request body must be JSON'}), 400
    try:
        X = encode_input(body)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    gpa = round(float(np.clip(MODEL.predict(X)[0], 0.0, 4.0)), 2)
    return jsonify({
        'predicted_gpa': gpa,
        'bucket':        gpa_bucket(gpa),
        'at_risk':       at_risk_flag(gpa),
    })


@app.route('/whatif', methods=['POST'])
def whatif():
    """
    What-if simulation.
    Body: { "baseline": {...}, "changes": { "study_hours_per_day": 6 } }
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'Request body must be JSON'}), 400

    baseline = body.get('baseline')
    changes  = body.get('changes')
    if not baseline or changes is None:
        return jsonify({'error': "'baseline' and 'changes' are required"}), 422

    try:
        X_base = encode_input(baseline)
        X_sim  = encode_input({**baseline, **changes})
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    gpa_base = round(float(np.clip(MODEL.predict(X_base)[0], 0.0, 4.0)), 2)
    gpa_sim  = round(float(np.clip(MODEL.predict(X_sim)[0],  0.0, 4.0)), 2)
    delta    = round(gpa_sim - gpa_base, 2)

    return jsonify({
        'baseline':  {'predicted_gpa': gpa_base, 'bucket': gpa_bucket(gpa_base), 'at_risk': at_risk_flag(gpa_base)},
        'simulated': {'predicted_gpa': gpa_sim,  'bucket': gpa_bucket(gpa_sim),  'at_risk': at_risk_flag(gpa_sim), 'changes_applied': changes},
        'delta':    delta,
        'improved': delta > 0,
    })


if __name__ == '__main__':
    print("\n Chronovision ML API — http://localhost:5001")
    print("   GET  /health   — health check")
    print("   GET  /features — feature list & allowed values")
    print("   POST /predict  — predict GPA")
    print("   POST /whatif   — what-if simulation\n")
    app.run(host='0.0.0.0', port=5001, debug=False)
