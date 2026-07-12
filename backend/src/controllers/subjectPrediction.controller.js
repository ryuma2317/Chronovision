const predictionRepo = require('../repositories/prediction.repo');
const subjectRepo = require('../repositories/subject.repo');
const mlSubjectService = require('../services/mlSubject.service');
const classService = require('../services/class.service');
const gamificationService = require('../services/gamification.service');

const SUBJECT_KEYS = [
  'mathematics', 'physics', 'chemistry',
  'biology', 'computer_science', 'statistics',
];

// GET /api/student/subjects  (also useful for admin)
// The catalogue + current credits, so the UI can render the midterm form.
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectRepo.findAllActive();
    res.json(subjects);
  } catch (err) {
    next(err);
  }
};

// POST /api/student/prediction/subjects
// body: { class_id, features: {...behavioural...}, midterms: { mathematics: 72, ... } }
//
// Flow:
//   1. validate the student is in the class
//   2. validate all six midterms are present and 0-100
//   3. read the credits from the DB (admin-editable) — NOT hard-coded
//   4. ask Flask to predict each subject's final and the credit-weighted GPA
//   5. save the profile, the overall prediction, and the six subject rows
//   6. return everything so the UI can show the breakdown
const submitSubjectPrediction = async (req, res, next) => {
  try {
    const { class_id, features, midterms } = req.body;
    const student_id = req.user.user_id;

    if (!class_id || !features || !midterms) {
      return res
        .status(400)
        .json({ message: 'class_id, features, and midterms are required' });
    }

    await classService.validateMembership(class_id, student_id);

    // Every subject needs a midterm in range.
    const missing = SUBJECT_KEYS.filter(
      (k) => midterms[k] === undefined || midterms[k] === null || midterms[k] === ''
    );
    if (missing.length) {
      return res
        .status(422)
        .json({ message: `Missing midterm score(s) for: ${missing.join(', ')}` });
    }
    const outOfRange = SUBJECT_KEYS.filter((k) => {
      const v = Number(midterms[k]);
      return Number.isNaN(v) || v < 0 || v > 100;
    });
    if (outOfRange.length) {
      return res
        .status(422)
        .json({ message: `Midterm scores must be 0-100: ${outOfRange.join(', ')}` });
    }

    // Credits come from the database, so admins control the weighting.
    const credits = await subjectRepo.getCreditsMap();

    const mlResult = await mlSubjectService.predictSubjects(features, midterms, credits);

    // Persist. The academic profile still stores the behavioural features; the
    // per-subject midterms/finals live in subject_predictions.
    const profile_id = await predictionRepo.upsertProfile({
      student_id,
      class_id,
      features: {
        ...features,
        // keep the legacy per-subject columns populated with the MIDTERMS the
        // student actually entered, so existing screens keep working
        mathematics_score: midterms.mathematics,
        physics_score: midterms.physics,
        chemistry_score: midterms.chemistry,
        biology_score: midterms.biology,
        computer_science_score: midterms.computer_science,
        statistics_score: midterms.statistics,
      },
    });

    const saved = await predictionRepo.createPrediction({
      student_id,
      profile_id,
      predicted_gpa: mlResult.predicted_gpa,
      bucket: mlResult.bucket,
      at_risk_status: mlResult.at_risk_status,
    });

    await subjectRepo.createSubjectPredictions(saved.prediction_id, mlResult.subjects);

    const { new_badges } = await gamificationService.awardPoints(
      student_id,
      'PREDICTION_SUBMITTED',
      { class_id }
    );

    res.status(201).json({
      ...saved,
      total_credits: mlResult.total_credits,
      subjects: mlResult.subjects,
      weakest_subject: mlResult.weakest_subject,
      biggest_drag: mlResult.biggest_drag,
      new_badges,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/prediction/:id/subjects — the breakdown for a saved prediction
const getSubjectBreakdown = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await subjectRepo.findByPrediction(id);
    if (!rows.length) {
      return res
        .status(404)
        .json({ message: 'No subject breakdown found for this prediction' });
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/subjects/:key/credits   body: { credits }
const updateSubjectCredits = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { credits } = req.body;
    const n = Number(credits);
    if (!Number.isInteger(n) || n < 1 || n > 6) {
      return res.status(422).json({ message: 'credits must be an integer between 1 and 6' });
    }
    const ok = await subjectRepo.updateCredits(key, n);
    if (!ok) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Credits updated. Future predictions will use the new weighting.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSubjects,
  submitSubjectPrediction,
  getSubjectBreakdown,
  updateSubjectCredits,
};
