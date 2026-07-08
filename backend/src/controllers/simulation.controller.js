const simulationRepo = require('../repositories/simulation.repo');
const predictionRepo = require('../repositories/prediction.repo');
const mlService = require('../services/ml.service');

// POST /api/student/whatif
// body: { overrides: { study_hours_per_day: 6, ... } }
const runWhatIf = async (req, res, next) => {
  try {
    const { overrides } = req.body;
    const student_id = req.user.user_id;

    if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) {
      return res.status(400).json({ message: 'A non-empty overrides object is required' });
    }

    const latest = await predictionRepo.findLatestByStudent(student_id);
    if (!latest) {
      return res.status(404).json({
        message: 'No baseline prediction found. Submit a prediction first before running a what-if simulation.',
      });
    }

    const baselineFeatures = {};
    predictionRepo.PROFILE_FIELDS.forEach((f) => { baselineFeatures[f] = latest[f]; });

    const unknownField = Object.keys(overrides).find((k) => !predictionRepo.PROFILE_FIELDS.includes(k));
    if (unknownField) {
      return res.status(422).json({ message: `Unknown feature in overrides: ${unknownField}` });
    }

    const result = await mlService.whatif(baselineFeatures, overrides);

    const saved = await simulationRepo.create({
      student_id,
      prediction_id: latest.prediction_id,
      overrides,
      baseline_gpa: result.baseline_gpa,
      simulated_gpa: result.simulated_gpa,
    });

    res.status(201).json({ ...saved, bucket: result.bucket, at_risk_status: result.at_risk_status });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/whatif/history
const getHistory = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const history = await simulationRepo.findByStudent(student_id);
    res.json(history);
  } catch (err) {
    next(err);
  }
};

module.exports = { runWhatIf, getHistory };
