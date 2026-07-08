const predictionRepo = require('../repositories/prediction.repo');
const mlService = require('../services/ml.service');
const classService = require('../services/class.service');
const gamificationService = require('../services/gamification.service');

// POST /api/student/prediction
// body: { class_id, features: { ...36 ML input fields... } }
const submitPrediction = async (req, res, next) => {
  try {
    const { class_id, features } = req.body;
    const student_id = req.user.user_id;

    if (!class_id || !features || typeof features !== 'object') {
      return res.status(400).json({ message: 'class_id and a features object are required' });
    }

    await classService.validateMembership(class_id, student_id);

    const missing = predictionRepo.PROFILE_FIELDS.filter((f) => features[f] === undefined || features[f] === null || features[f] === '');
    if (missing.length > 0) {
      return res.status(422).json({ message: `Missing required feature(s): ${missing.join(', ')}` });
    }

    const mlResult = await mlService.predict(features);

    const profile_id = await predictionRepo.upsertProfile({ student_id, class_id, features });
    const saved = await predictionRepo.createPrediction({
      student_id,
      profile_id,
      predicted_gpa: mlResult.predicted_gpa,
      bucket: mlResult.bucket,
      at_risk_status: mlResult.at_risk_status,
    });

    const { new_badges } = await gamificationService.awardPoints(student_id, 'PREDICTION_SUBMITTED', { class_id });

    res.status(201).json({ ...saved, new_badges });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/prediction/history
const getPredictionHistory = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const history = await predictionRepo.findAllByStudent(student_id);
    res.json(history);
  } catch (err) {
    next(err);
  }
};

// GET /api/student/prediction/peer-comparison?class_id=...
const getPeerComparison = async (req, res, next) => {
  try {
    const { class_id } = req.query;
    const student_id = req.user.user_id;
    if (!class_id) {
      return res.status(400).json({ message: 'class_id query parameter is required' });
    }

    await classService.validateMembership(class_id, student_id);

    const comparison = await predictionRepo.getClassComparison(class_id, student_id);
    if (!comparison) {
      return res.status(404).json({ message: 'No predictions found for this class yet' });
    }
    res.json(comparison);
  } catch (err) {
    next(err);
  }
};

module.exports = { submitPrediction, getPredictionHistory, getPeerComparison };
