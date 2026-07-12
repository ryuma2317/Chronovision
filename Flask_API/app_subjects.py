"""
Chronovision ML service — subject-level predictions + credit-weighted GPA.

ENDPOINTS
  GET  /health            service + models loaded
  GET  /subjects          the subject list and their default credits
  POST /predict-subjects  the main one (see below)

POST /predict-subjects
  Body: {
    "features":  { ...behavioural fields... },
    "midterms":  { "mathematics": 72, "physics": 65, ... },   # 0-100 per subject
    "credits":   { "mathematics": 3, ... }                    # OPTIONAL override
  }

  What it does, in order:
    1. For EACH subject, run that subject's model on (shared features + that
       subject's midterm) -> predicted FINAL score (0-100).
    2. Convert each predicted final into a grade point (0-4).
    3. Compute the credit-weighted GPA:
           GPA = sum(grade_point * credits) / sum(credits)
    4. Compute each subject's CONTRIBUTION to that GPA — two honest numbers:
         - contribution_points : how many GPA points this subject added
                                 = grade_point * credits / total_credits
         - contribution_pct    : that as a % of the final GPA
                                 (so the six percentages sum to 100%)
       This directly answers "how much does Maths contribute to my GPA?"
    5. Also report weight_pct = credits / total_credits — how much of the GPA a
       subject COULD influence, regardless of performance. Comparing
       contribution_pct against weight_pct is the interesting bit: a subject
       contributing LESS than its weight is dragging the GPA down.
"""

import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Load the six models ─────────────────────────────────────────────────────
_candidates = [
    os.environ.get('MODEL_DIR'),
    os.path.join(os.path.dirname(__file__), 'model'),
    os.path.join(os.path.dirname(__file__), '..', 'Prediction_Model_Testing', 'model'),
]
MODEL_DIR = next(
    (c for c in _candidates if c and os.path.exists(os.path.join(c, 'subject_models.pkl'))),
    None,
)
if MODEL_DIR is None:
    raise FileNotFoundError(
        "Could not find subject_models.pkl. Run train_subject_models.py first, then "
        "set MODEL_DIR or copy the model/ folder next to this app."
    )

BUNDLE   = joblib.load(os.path.join(MODEL_DIR, 'subject_models.pkl'))
ENCODERS = BUNDLE['encoders']
SUBJECT_MODELS = BUNDLE['subjects']
SUBJECTS = list(SUBJECT_MODELS.keys())

print(f"   Loaded {len(SUBJECTS)} subject models from {MODEL_DIR}")

# Default credits. The BACKEND normally sends its own (from the `subjects` table,
# which an admin can edit) — these are only the fallback.
DEFAULT_CREDITS = {
    'mathematics': 3, 'physics': 3, 'computer_science': 3,
    'chemistry': 2, 'biology': 2, 'statistics': 2,
}

CATEGORICAL_COLS = [
    'gender', 'major', 'diet_quality', 'study_environment',
    'learning_style', 'parental_education_level',
    'family_income_range', 'internet_quality',
]


def encode_row(features, feature_order, midterm_col, midterm_value):
    """Build the model's input row in the EXACT order it was trained on."""
    row = []
    for feat in feature_order:
        if feat == midterm_col:
            row.append(float(midterm_value))
            continue
        val = features.get(feat)
        if val is None:
            raise ValueError(f"Missing feature: '{feat}'")
        if feat in CATEGORICAL_COLS:
            le = ENCODERS[feat]
            if val not in le.classes_:
                raise ValueError(
                    f"Unknown value '{val}' for '{feat}'. Allowed: {list(le.classes_)}"
                )
            val = int(le.transform([val])[0])
        row.append(float(val))
    return np.array(row).reshape(1, -1)


def at_risk_flag(gpa):
    if gpa < 2.0:
        return 'high'
    if gpa < 2.5:
        return 'moderate'
    return 'on_track'


def gpa_bucket(gpa):
    if gpa >= 3.5:
        return 'High (3.5+)'
    if gpa >= 3.0:
        return 'Good (3.0-3.5)'
    if gpa >= 2.0:
        return 'Average (2.0-3.0)'
    return 'Low (<2.0)'


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': 'xgboost-per-subject',
        'subjects': SUBJECTS,
    })


@app.route('/subjects', methods=['GET'])
def subjects():
    return jsonify({
        'subjects': [
            {
                'key': s,
                'default_credits': DEFAULT_CREDITS.get(s, 2),
                'metrics': SUBJECT_MODELS[s]['metrics'],
            }
            for s in SUBJECTS
        ]
    })


@app.route('/predict-subjects', methods=['POST'])
def predict_subjects():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'Request body must be JSON'}), 400

    features = body.get('features')
    midterms = body.get('midterms')
    if not features or not midterms:
        return jsonify({'error': "'features' and 'midterms' are required"}), 422

    credits = {**DEFAULT_CREDITS, **(body.get('credits') or {})}

    # ── Step 1: predict each subject's FINAL from its midterm + behaviour ────
    per_subject = []
    try:
        for subj in SUBJECTS:
            if subj not in midterms or midterms[subj] is None:
                return jsonify({'error': f"Missing midterm for '{subj}'"}), 422
            midterm = float(midterms[subj])
            if not 0 <= midterm <= 100:
                return jsonify({'error': f"Midterm for '{subj}' must be 0-100"}), 422

            cfg = SUBJECT_MODELS[subj]
            X = encode_row(features, cfg['features'], cfg['midterm_col'], midterm)
            predicted_final = float(np.clip(cfg['model'].predict(X)[0], 0, 100))

            per_subject.append({
                'subject': subj,
                'midterm': round(midterm, 1),
                'predicted_final': round(predicted_final, 1),
                'change_from_midterm': round(predicted_final - midterm, 1),
                'credits': int(credits.get(subj, 2)),
                'grade_point': round((predicted_final / 100.0) * 4.0, 3),
            })
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    # ── Step 2 & 3: credit-weighted GPA from the predicted finals ────────────
    total_credits = sum(s['credits'] for s in per_subject)
    if total_credits == 0:
        return jsonify({'error': 'Total credits cannot be zero'}), 422

    weighted_sum = sum(s['grade_point'] * s['credits'] for s in per_subject)
    predicted_gpa = float(np.clip(weighted_sum / total_credits, 0.0, 4.0))

    # ── Step 4 & 5: contribution and weight per subject ──────────────────────
    for s in per_subject:
        # How many GPA points this subject actually put on the board.
        s['contribution_points'] = round(
            (s['grade_point'] * s['credits']) / total_credits, 3
        )
        # As a share of the final GPA — the six of these sum to 100%.
        s['contribution_pct'] = (
            round(s['contribution_points'] / predicted_gpa * 100, 1)
            if predicted_gpa > 0 else 0.0
        )
        # How much of the GPA this subject COULD influence (credits share).
        s['weight_pct'] = round(s['credits'] / total_credits * 100, 1)
        # Positive => performing above its weight; negative => dragging you down.
        s['performance_vs_weight'] = round(s['contribution_pct'] - s['weight_pct'], 1)

    per_subject.sort(key=lambda s: s['contribution_points'], reverse=True)
    gpa_rounded = round(predicted_gpa, 2)

    return jsonify({
        'predicted_gpa': gpa_rounded,
        'bucket': gpa_bucket(gpa_rounded),
        'at_risk': at_risk_flag(gpa_rounded),
        'total_credits': total_credits,
        'subjects': per_subject,
        'weakest_subject': min(per_subject, key=lambda s: s['predicted_final'])['subject'],
        'biggest_drag': min(per_subject, key=lambda s: s['performance_vs_weight'])['subject'],
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)))
