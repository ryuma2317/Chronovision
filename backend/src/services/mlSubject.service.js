const axios = require('axios');
const { FLASK_SUBJECT_URL } = require('../config/env');

// Talks to the Flask /predict-subjects endpoint.
//
// NOTE: this is the SUBJECT service on port 5002 — a different service from the
// old single-GPA one on 5001 (FLASK_ML_URL). Using the wrong URL here means the
// endpoint doesn't exist and every prediction fails.
//
// features : the behavioural/demographic fields (study hours, attendance, major, ...)
// midterms : { mathematics: 72, physics: 65, ... } — what the student entered
// credits  : { mathematics: 3, ... } — read from the `subjects` table, so an
//            admin can change the weighting without touching any code.
//
// No value translation happens here: the models are trained on the SAME category
// labels the frontend sends and the database stores (e.g. major = 'Computer
// Science'). Keep it that way — if you ever need a mapping layer here, it means
// the training data and the app have drifted apart, and the right fix is to
// regenerate the data, not to paper over it.

const mapAtRisk = (flaskAtRisk) => {
  if (flaskAtRisk === 'high') return 'high_risk';
  if (flaskAtRisk === 'moderate') return 'at_risk';
  return 'on_track';
};

// The models were trained on numeric 0/1 flags; a JS boolean would be rejected.
const toFlag = (v) => (v === true ? 1 : v === false ? 0 : v);

const normalizeFeatures = (features) => ({
  ...features,
  part_time_job: toFlag(features.part_time_job),
  extracurricular_participation: toFlag(features.extracurricular_participation),
  access_to_tutoring: toFlag(features.access_to_tutoring),
});

const predictSubjects = async (features, midterms, credits) => {
  try {
    const { data } = await axios.post(`${FLASK_SUBJECT_URL}/predict-subjects`, {
      features: normalizeFeatures(features),
      midterms,
      credits,
    });

    return {
      predicted_gpa: data.predicted_gpa,
      bucket: data.bucket,
      at_risk_status: mapAtRisk(data.at_risk),
      total_credits: data.total_credits,
      subjects: data.subjects, // per-subject: predicted_final, contribution_pct, ...
      weakest_subject: data.weakest_subject,
      biggest_drag: data.biggest_drag,
    };
  } catch (err) {
    if (err.response && err.response.status === 422) {
      const validationErr = new Error(
        err.response.data.error || 'Invalid features or midterms for the ML model'
      );
      validationErr.status = 422;
      throw validationErr;
    }
    const error = new Error('ML prediction service unavailable');
    error.status = 503;
    throw error;
  }
};

module.exports = { predictSubjects, mapAtRisk };