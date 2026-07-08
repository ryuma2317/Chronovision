const classRepo = require('../repositories/class.repo');
const classService = require('../services/class.service');

// GET /api/teacher/classes or /api/student equivalent — shared logic
const getMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cls = await classRepo.findById(id);
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const members = await classRepo.getMembers(id);
    res.json({ class: cls, members });
  } catch (err) {
    next(err);
  }
};

// GET shared dashboard data for a class
const getDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cls = await classRepo.findById(id);
    if (!cls) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const dashboard = await classService.getClassDashboard(id);
    res.json({ class: cls, ...dashboard });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMembers, getDashboard };
