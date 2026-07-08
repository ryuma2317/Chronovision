const iqtestRepo = require('../repositories/iqtest.repo');
const iqtestService = require('../services/iqtest.service');

// GET /api/student/iq/questions
const getQuestions = async (req, res, next) => {
  try {
    const questions = await iqtestRepo.getActiveQuestions();
    res.json(questions);
  } catch (err) {
    next(err);
  }
};

// POST /api/student/iq/submit
// body: { answers: [{ question_id, selected_option_id }, ...], time_taken_seconds }
const submitIqTest = async (req, res, next) => {
  try {
    const { answers, time_taken_seconds } = req.body;
    const student_id = req.user.user_id;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'answers array is required' });
    }

    const result = await iqtestService.gradeAndSave({ student_id, submittedAnswers: answers, time_taken_seconds });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/student/iq/latest
const getLatestResult = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const result = await iqtestRepo.findLatestByStudent(student_id);
    if (!result) {
      return res.status(404).json({ message: 'No IQ test result found. Take the test first.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getQuestions, submitIqTest, getLatestResult };
