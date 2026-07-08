const axios = require('axios');
const { FLASK_ML_URL } = require('../config/env');

// Flask returns at_risk as 'high' | 'moderate' | 'on_track'.
// Our schema's gpa_predictions.at_risk_status enum is 'on_track' | 'at_risk' | 'high_risk'.
const mapAtRisk = (flaskAtRisk) => {
  if (flaskAtRisk === 'high') return 'high_risk';
  if (flaskAtRisk === 'moderate') return 'at_risk';
  return 'on_track';
};

// features must already be the flat 36-field object — Flask reads
// each field directly off the request body, it does not expect a wrapper.
const predict = async (features) => {
  try {
    const { data } = await axios.post(`${FLASK_ML_URL}/predict`, features);
    return {
      predicted_gpa: data.predicted_gpa,
      bucket: data.bucket,
      at_risk_status: mapAtRisk(data.at_risk),
    };
  } catch (err) {
    if (err.response && err.response.status === 422) {
      const validationErr = new Error(err.response.data.error || 'Invalid features for ML model');
      validationErr.status = 422;
      throw validationErr;
    }
    const error = new Error('ML prediction service unavailable');
    error.status = 503;
    throw error;
  }
};

// baselineFeatures: the flat feature object the prediction was made from.
// changes: a partial object of fields to override for the simulation.
const whatif = async (baselineFeatures, changes) => {
  try {
    const { data } = await axios.post(`${FLASK_ML_URL}/whatif`, {
      baseline: baselineFeatures,
      changes,
    });
    return {
      baseline_gpa: data.baseline.predicted_gpa,
      simulated_gpa: data.simulated.predicted_gpa,
      bucket: data.simulated.bucket,
      at_risk_status: mapAtRisk(data.simulated.at_risk),
      delta: data.delta,
      improved: data.improved,
    };
  } catch (err) {
    if (err.response && err.response.status === 422) {
      const validationErr = new Error(err.response.data.error || 'Invalid override values for ML model');
      validationErr.status = 422;
      throw validationErr;
    }
    const error = new Error('ML what-if service unavailable');
    error.status = 503;
    throw error;
  }
};

module.exports = { predict, whatif, mapAtRisk };
