const db = require('../config/db');
const { randomUUID } = require('crypto');

/**
 * questions shape expected by create():
 * [{ question_text, explanation, options: [{ label, text, is_correct }, ...] }, ...]
 * Each question needs exactly one option with is_correct = true.
 * Insert is wrapped in a transaction so a quiz never ends up half-written.
 */
const create = async ({ class_id, teacher_id, title, quiz_type = 'manual', source_file_url = null, time_limit_minutes = null, max_attempts = 1, questions }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const quiz_id = randomUUID();
    await conn.query(
      `INSERT INTO quizzes (quiz_id, class_id, teacher_id, title, quiz_type, source_file_url, time_limit_minutes, max_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [quiz_id, class_id, teacher_id, title, quiz_type, source_file_url, time_limit_minutes, max_attempts]
    );

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const question_id = randomUUID();
      await conn.query(
        `INSERT INTO quiz_questions (question_id, quiz_id, question_order, question_text, explanation)
         VALUES (?, ?, ?, ?, ?)`,
        [question_id, quiz_id, i + 1, q.question_text, q.explanation || null]
      );

      const optionRows = q.options.map((o) => [randomUUID(), question_id, o.label, o.text, o.is_correct ? 1 : 0]);
      await conn.query(
        `INSERT INTO quiz_options (option_id, question_id, option_label, option_text, is_correct) VALUES ?`,
        [optionRows]
      );
    }

    await conn.commit();
    return { quiz_id, class_id, title, question_count: questions.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const findByClass = async (class_id) => {
  const [rows] = await db.query(
    `SELECT q.*, COUNT(qq.question_id) AS question_count
     FROM quizzes q
     LEFT JOIN quiz_questions qq ON qq.quiz_id = q.quiz_id
     WHERE q.class_id = ?
     GROUP BY q.quiz_id
     ORDER BY q.created_at DESC`,
    [class_id]
  );
  return rows;
};

// includeAnswers=false strips is_correct + explanation — used when sending to a student before they submit
const findById = async (quiz_id, includeAnswers = true) => {
  const [quizRows] = await db.query('SELECT * FROM quizzes WHERE quiz_id = ?', [quiz_id]);
  if (!quizRows[0]) return null;

  const [questionRows] = await db.query(
    'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order',
    [quiz_id]
  );

  const questions = await Promise.all(
    questionRows.map(async (q) => {
      const [options] = await db.query(
        'SELECT * FROM quiz_options WHERE question_id = ? ORDER BY option_label',
        [q.question_id]
      );
      const cleanOptions = includeAnswers
        ? options
        : options.map(({ is_correct, ...rest }) => rest);
      return {
        ...(includeAnswers ? q : { question_id: q.question_id, question_order: q.question_order, question_text: q.question_text }),
        options: cleanOptions,
      };
    })
  );

  return { ...quizRows[0], questions };
};

const publish = async (quiz_id) => {
  const [result] = await db.query('UPDATE quizzes SET is_published = TRUE WHERE quiz_id = ?', [quiz_id]);
  return result.affectedRows > 0;
};

const countAttemptsByStudent = async (quiz_id, student_id) => {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?',
    [quiz_id, student_id]
  );
  return rows[0].cnt;
};

const createAttempt = async ({ quiz_id, student_id, total_questions }) => {
  const attempt_id = randomUUID();
  await db.query(
    `INSERT INTO quiz_attempts (attempt_id, quiz_id, student_id, total_questions) VALUES (?, ?, ?, ?)`,
    [attempt_id, quiz_id, student_id, total_questions]
  );
  return { attempt_id, quiz_id, student_id, total_questions, status: 'in_progress' };
};

const findAttemptById = async (attempt_id) => {
  const [rows] = await db.query('SELECT * FROM quiz_attempts WHERE attempt_id = ?', [attempt_id]);
  return rows[0] || null;
};

/**
 * gradedAnswers: [{ question_id, selected_option_id, is_correct }, ...]
 */
const submitAttempt = async ({ attempt_id, gradedAnswers, score, correct_answers }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const answerRows = gradedAnswers.map((a) => [
      randomUUID(), attempt_id, a.question_id, a.selected_option_id, a.is_correct ? 1 : 0,
    ]);
    if (answerRows.length) {
      await conn.query(
        `INSERT INTO quiz_attempt_answers (id, attempt_id, question_id, selected_option_id, is_correct) VALUES ?`,
        [answerRows]
      );
    }

    await conn.query(
      `UPDATE quiz_attempts SET score = ?, correct_answers = ?, submitted_at = NOW(), status = 'graded'
       WHERE attempt_id = ?`,
      [score, correct_answers, attempt_id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const findAttemptsByStudent = async (quiz_id, student_id) => {
  const [rows] = await db.query(
    `SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? ORDER BY started_at DESC`,
    [quiz_id, student_id]
  );
  return rows;
};

const findAttemptAnswers = async (attempt_id) => {
  const [rows] = await db.query(
    `SELECT aa.*, qq.question_text, qq.explanation, qo.option_text AS selected_text
     FROM quiz_attempt_answers aa
     INNER JOIN quiz_questions qq ON aa.question_id = qq.question_id
     INNER JOIN quiz_options qo ON aa.selected_option_id = qo.option_id
     WHERE aa.attempt_id = ?`,
    [attempt_id]
  );
  return rows;
};

const findAllAttempts = async (quiz_id) => {
  const [rows] = await db.query(
    `SELECT qa.*, u.first_name, u.last_name, u.email
     FROM quiz_attempts qa
     INNER JOIN users u ON qa.student_id = u.user_id
     WHERE qa.quiz_id = ?
     ORDER BY qa.started_at DESC`,
    [quiz_id]
  );
  return rows;
};

module.exports = {
  create, findByClass, findById, publish, countAttemptsByStudent,
  createAttempt, findAttemptById, submitAttempt, findAttemptsByStudent,
  findAttemptAnswers, findAllAttempts,
};
