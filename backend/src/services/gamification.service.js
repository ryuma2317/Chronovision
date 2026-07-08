const gamificationRepo = require('../repositories/gamification.repo');

// ── Point rules ────────────────────────────────────────────────
const POINT_RULES = {
  QUIZ_COMPLETED: 20,
  QUIZ_PERFECT_SCORE: 50,
  LESSON_VIEWED: 5,
  STUDY_PLAN_GENERATED: 10,
  PREDICTION_SUBMITTED: 5,
};

const awardPoints = async (student_id, ruleKey, { class_id = null, customAmount = null } = {}) => {
  const points = customAmount ?? POINT_RULES[ruleKey];
  if (points === undefined) {
    throw new Error(`Unknown point rule: ${ruleKey}`);
  }

  await gamificationRepo.addPoints({ student_id, class_id, points, reason: ruleKey });
  const newlyAwarded = await evaluateBadges(student_id);

  return { points_awarded: points, new_badges: newlyAwarded };
};

// All badges share criteria_type = 'points' (see seed data) — one ladder,
// evaluated against the student's running total every time points change.
const evaluateBadges = async (student_id) => {
  const totalPoints = await gamificationRepo.getTotalPoints(student_id);
  const eligible = await gamificationRepo.findUnearnedEligibleBadges(student_id, 'points', totalPoints);

  for (const badge of eligible) {
    await gamificationRepo.awardBadge({ student_id, badge_id: badge.badge_id });
  }

  return eligible.map((b) => b.name);
};

const getLeaderboard = async (limit = 10) => {
  return gamificationRepo.getLeaderboard(limit);
};

const getStudentProfile = async (student_id) => {
  const totalPoints = await gamificationRepo.getTotalPoints(student_id);
  const badges = await gamificationRepo.findBadges(student_id);
  const history = await gamificationRepo.getPointHistory(student_id);

  return { student_id, total_points: totalPoints, badges, history };
};

module.exports = { POINT_RULES, awardPoints, evaluateBadges, getLeaderboard, getStudentProfile };
