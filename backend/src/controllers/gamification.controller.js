const gamificationService = require('../services/gamification.service');

// GET /api/student/leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const leaderboard = await gamificationService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
};

// GET /api/student/badges
const getBadges = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const profile = await gamificationService.getStudentProfile(student_id);
    res.json({ total_points: profile.total_points, badges: profile.badges });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/points/history
const getPointHistory = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const profile = await gamificationService.getStudentProfile(student_id);
    res.json(profile.history);
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard, getBadges, getPointHistory };
