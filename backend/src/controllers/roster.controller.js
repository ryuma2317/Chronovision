const classRepo = require('../repositories/class.repo');
const rosterService = require('../services/roster.service');

const bulkEnrollStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cls = await classRepo.findById(id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    if (!req.file) return res.status(400).json({ message: 'A roster file is required (form field: file)' });

    const entries = await rosterService.parseRoster(req.file);
    if (entries.length === 0) {
      return res.status(422).json({ message: 'No student emails were found in the uploaded file' });
    }

    const result = await rosterService.bulkEnroll(id, entries);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { bulkEnrollStudents };
