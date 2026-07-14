"""
Chronovision ML service — predicts finals for ANY admin-defined course, at ANY
point in the semester.

WHAT'S NEW vs the midterm-only version
--------------------------------------
Each course can now carry FOUR observables, and ALL OF THEM ARE OPTIONAL:

    course_attendance    week 1 onward
    quiz_average         ~week 4
    assignment_average   ~week 6
    midterm              ~week 8

A missing one is sent as null, becomes NaN, and XGBoost handles it natively —
it learned a default branch direction for NaN at every split, because the model
was trained with these randomly masked.

So a week-2 student gets a real prediction from attendance alone. It sharpens as
evidence lands. ONE model, ONE endpoint, no imputation, no "early model".

Every course gets an `evidence_stage` and a `confidence` so the UI can be honest
about how much to trust each number. A week-1 guess and a week-9 forecast must
not look identical on screen.

ENDPOINTS
  GET  /health
  POST /predict-courses
"""

import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

_candidates = [
    os.environ.get('MODEL_DIR'),
    os.path.join(os.path.dirname(__file__), 'model'),
    os.path.join(os.path.dirname(__file__), '..', 'Prediction_Model_Testing', 'model'),
]
MODEL_DIR = next(
    (c for c in _candidates if c and os.path.exists(os.path.join(c, 'generic_model.pkl'))),
    None,
)
if MODEL_DIR is None:
    raise FileNotFoundError(
        "generic_model.pkl not found. Run train_generic_model.py first."
    )

BUNDLE = joblib.load(os.path.join(MODEL_DIR, 'generic_model.pkl'))
MODEL            = BUNDLE['model']
ENCODERS         = BUNDLE['encoders']
FEATURE_ORDER    = BUNDLE['features']
STUDENT_FEATURES = BUNDLE['student_features']
MASKABLE         = BUNDLE['maskable']
CATEGORICAL_COLS = BUNDLE['categorical_cols']
STAGE_METRICS    = BUNDLE['stage_metrics']
METRICS          = BUNDLE['metrics']

print(f"   Loaded model from {MODEL_DIR}  (overall R2={METRICS['r2']:.4f})")
for s, m in STAGE_METRICS.items():
    print(f"      {s:<8} R2={m['r2']:.4f}  MAE={m['mae']:.2f}")

# Which stage a course is at, judged purely by what the student supplied.
# Order matters: the richest satisfied stage wins.
STAGE_RULES = [
    ('week_9', ['course_attendance', 'quiz_average', 'assignment_average', 'midterm']),
    ('week_7', ['course_attendance', 'quiz_average', 'assignment_average']),
    ('week_5', ['course_attendance', 'quiz_average']),
    ('week_2', ['course_attendance']),
]
STAGE_LABELS = {
    'week_1': 'No coursework yet — based on your habits and the course difficulty',
    'week_2': 'Based on your attendance',
    'week_5': 'Based on attendance and quizzes',
    'week_7': 'Based on attendance, quizzes and assignments',
    'week_9': 'Based on all your coursework including the midterm',
}


def classify_stage(course):
    """The stage is whatever the student actually gave us."""
    have = {k for k in MASKABLE if course.get(k) is not None}
    for stage, needed in STAGE_RULES:
        if set(needed).issubset(have):
            return stage
    # A midterm with no attendance still beats nothing — treat any evidence as week_5.
    if have:
        return 'week_5'
    return 'week_1'


def confidence_for(stage):
    """R2 at that stage, straight from the trained model. Not a made-up number."""
    return round(STAGE_METRICS.get(stage, {}).get('r2', 0.6), 3)


def encode_row(features, course):
    """Rebuild the model's input row in the EXACT trained order. None -> NaN."""
    row = []
    for feat in FEATURE_ORDER:
        if feat == 'difficulty_level':
            row.append(float(course.get('difficulty_level', 3)))
            continue

        if feat in MASKABLE:
            v = course.get(feat)
            row.append(np.nan if v is None else float(v))
            continue

        val = features.get(feat)
        if val is None:
            raise ValueError(f"Missing student feature: '{feat}'")
        if feat in CATEGORICAL_COLS:
            le = ENCODERS[feat]
            if val not in le.classes_:
                raise ValueError(
                    f"Unknown value '{val}' for '{feat}'. Allowed: {list(le.classes_)}"
                )
            val = int(le.transform([val])[0])
        row.append(float(val))
    return np.array(row, dtype=float).reshape(1, -1)


def at_risk_flag(gpa):
    return 'high' if gpa < 2.0 else 'moderate' if gpa < 2.5 else 'on_track'


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
        'model': 'xgboost-generic-course-progressive',
        'metrics': METRICS,
        'stage_metrics': STAGE_METRICS,
        'features': FEATURE_ORDER,
        'optional_course_inputs': MASKABLE,
    })


@app.route('/predict-courses', methods=['POST'])
def predict_courses():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'Request body must be JSON'}), 400

    features = body.get('features')
    courses = body.get('courses')
    # is_partial: the student picked a SUBSET of their courses. Then the result
    # is not their GPA and must not be labelled as one.
    is_partial = bool(body.get('is_partial'))

    if not features:
        return jsonify({'error': "'features' is required"}), 422
    if not isinstance(courses, list) or not courses:
        return jsonify({'error': "'courses' must be a non-empty array"}), 422

    per_course = []
    try:
        for c in courses:
            name = c.get('course_name')
            if not name:
                return jsonify({'error': 'Every course needs a course_name'}), 422

            credits = int(c.get('credits', 3))
            if not 1 <= credits <= 6:
                return jsonify({'error': f"Credits for '{name}' must be 1-6"}), 422

            difficulty = float(c.get('difficulty_level', 3))
            if not 1 <= difficulty <= 5:
                return jsonify({'error': f"difficulty_level for '{name}' must be 1-5"}), 422

            # Every observable is optional, but if given it must be sane.
            for k in MASKABLE:
                v = c.get(k)
                if v is None:
                    continue
                v = float(v)
                if not 0 <= v <= 100:
                    return jsonify({'error': f"{k} for '{name}' must be 0-100"}), 422
                c[k] = v

            stage = classify_stage(c)
            X = encode_row(features, c)
            predicted_final = float(np.clip(MODEL.predict(X)[0], 0, 100))

            midterm = c.get('midterm')
            per_course.append({
                'course_id': c.get('course_id'),
                'course_name': name,
                'course_attendance': c.get('course_attendance'),
                'quiz_average': c.get('quiz_average'),
                'assignment_average': c.get('assignment_average'),
                'midterm': midterm,
                'predicted_final': round(predicted_final, 1),
                # Only meaningful once a midterm exists.
                'change_from_midterm': (
                    round(predicted_final - midterm, 1) if midterm is not None else None
                ),
                'credits': credits,
                'difficulty_level': int(difficulty),
                'grade_point': round((predicted_final / 100.0) * 4.0, 3),
                'evidence_stage': stage,
                'evidence_label': STAGE_LABELS[stage],
                'confidence': confidence_for(stage),
            })
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    total_credits = sum(c['credits'] for c in per_course)
    if total_credits == 0:
        return jsonify({'error': 'Total credits cannot be zero'}), 422

    weighted_sum = sum(c['grade_point'] * c['credits'] for c in per_course)
    predicted_gpa = float(np.clip(weighted_sum / total_credits, 0.0, 4.0))

    for c in per_course:
        c['contribution_points'] = round((c['grade_point'] * c['credits']) / total_credits, 3)
        c['contribution_pct'] = (
            round(c['contribution_points'] / predicted_gpa * 100, 1) if predicted_gpa > 0 else 0.0
        )
        c['weight_pct'] = round(c['credits'] / total_credits * 100, 1)
        c['performance_vs_weight'] = round(c['contribution_pct'] - c['weight_pct'], 1)

    per_course.sort(key=lambda c: c['contribution_points'], reverse=True)
    gpa_rounded = round(predicted_gpa, 2)

    # The overall prediction is only as trustworthy as its WEAKEST course.
    weakest_stage = min(per_course, key=lambda c: c['confidence'])
    single = len(per_course) == 1

    return jsonify({
        'predicted_gpa': gpa_rounded,
        'bucket': gpa_bucket(gpa_rounded),
        'at_risk': at_risk_flag(gpa_rounded),
        'total_credits': total_credits,
        'course_count': len(per_course),
        'is_partial': is_partial or single,
        'evidence_stage': weakest_stage['evidence_stage'],
        'confidence': weakest_stage['confidence'],
        'courses': per_course,
        'weakest_course': min(per_course, key=lambda c: c['predicted_final'])['course_name'],
        'biggest_drag': (
            None if single
            else min(per_course, key=lambda c: c['performance_vs_weight'])['course_name']
        ),
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5002)))