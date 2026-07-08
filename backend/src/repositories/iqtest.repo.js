const db = require('../config/db');
const { randomUUID } = require('crypto');

// Sent to the student — never includes is_correct
const getActiveQuestions = async () => {
  const [questions] = await db.query(
    'SELECT question_id, question_order, question_text FROM aptitude_questions WHERE is_active = 1 ORDER BY question_order'
  );
  const withOptions = await Promise.all(
    questions.map(async (q) => {
      const [options] = await db.query(
        'SELECT option_id, option_label, option_text FROM aptitude_options WHERE question_id = ? ORDER BY option_label',
        [q.question_id]
      );
      return { ...q, options };
    })
  );
  return withOptions;
};

// question_id -> correct option_id, used server-side to grade a submission
const getAnswerKey = async () => {
  const [rows] = await db.query(
    `SELECT question_id, option_id FROM aptitude_options WHERE is_correct = 1`
  );
  const key = {};
  rows.forEach((r) => { key[r.question_id] = r.option_id; });
  return key;
};

const getActiveQuestionCount = async () => {
  const [rows] = await db.query('SELECT COUNT(*) AS cnt FROM aptitude_questions WHERE is_active = 1');
  return rows[0].cnt;
};

const saveResult = async ({ student_id, score, iq_estimate, percentile, questions_attempted, correct_answers, time_taken_seconds }) => {
  const iq_result_id = randomUUID();
  await db.query(
    `INSERT INTO iq_test_results (iq_result_id, student_id, score, iq_estimate, percentile, questions_attempted, correct_answers, time_taken_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [iq_result_id, student_id, score, iq_estimate, percentile, questions_attempted, correct_answers, time_taken_seconds]
  );
  return { iq_result_id, student_id, score, iq_estimate, percentile, questions_attempted, correct_answers };
};

const findLatestByStudent = async (student_id) => {
  const [rows] = await db.query(
    'SELECT * FROM iq_test_results WHERE student_id = ? ORDER BY created_at DESC LIMIT 1',
    [student_id]
  );
  return rows[0] || null;
};

const findById = async (iq_result_id) => {
  const [rows] = await db.query('SELECT * FROM iq_test_results WHERE iq_result_id = ?', [iq_result_id]);
  return rows[0] || null;
};

module.exports = { getActiveQuestions, getAnswerKey, getActiveQuestionCount, saveResult, findLatestByStudent, findById };
