const iqtestRepo = require('../repositories/iqtest.repo');

// Standard normal CDF via Abramowitz-Stegun approximation — used to turn an
// estimated IQ (mean 100, sd 15) into a rough percentile rank.
const normalCdf = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
};

/**
 * NOTE: this is a lightweight 15-question aptitude quiz used to feed the
 * study-plan generator, not a validated psychometric instrument. The
 * iq_estimate is an illustrative scaling, not a clinical score.
 */
const scoreSubmission = ({ correct_answers, total_questions, time_taken_seconds }) => {
  const score = Math.round((correct_answers / total_questions) * 100); // whole-number percent — matches SMALLINT column
  const iq_estimate = Math.round(70 + score * 0.8); // 0% -> 70, 100% -> 150
  const percentile = Math.round(normalCdf((iq_estimate - 100) / 15) * 10000) / 100;

  return { score, iq_estimate, percentile, questions_attempted: total_questions, correct_answers, time_taken_seconds };
};

/**
 * submittedAnswers: [{ question_id, selected_option_id }, ...] from the client.
 * Grading happens here against the server-held answer key — the client
 * never receives is_correct, so it can't submit a fabricated perfect score.
 */
const gradeAndSave = async ({ student_id, submittedAnswers, time_taken_seconds }) => {
  const answerKey = await iqtestRepo.getAnswerKey();
  const totalQuestions = await iqtestRepo.getActiveQuestionCount();

  let correct_answers = 0;
  submittedAnswers.forEach((a) => {
    if (answerKey[a.question_id] && answerKey[a.question_id] === a.selected_option_id) {
      correct_answers++;
    }
  });

  const result = scoreSubmission({ correct_answers, total_questions: totalQuestions, time_taken_seconds });
  const saved = await iqtestRepo.saveResult({ student_id, ...result });
  return saved;
};

module.exports = { scoreSubmission, gradeAndSave };
