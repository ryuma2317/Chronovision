const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { ANTHROPIC_API_KEY } = require('../config/env');

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

// ── Text extraction from uploaded lesson material ──────────────
const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const { text } = await pdfParse(buffer);
    return text;
  }

  const err = new Error(`Unsupported file type for quiz generation: ${ext}`);
  err.status = 422;
  throw err;
};

// ── AI-generated MCQ questions from extracted text ──────────────
// Returns the same shape quiz.repo.create() expects:
// [{ question_text, explanation, options: [{ label, text, is_correct }] }]
const generateQuestions = async (sourceText, questionCount = 10) => {
  if (!ANTHROPIC_API_KEY) {
    const err = new Error(
      'AI quiz generation is not configured. Set ANTHROPIC_API_KEY in .env, or create the quiz manually instead.'
    );
    err.status = 503;
    throw err;
  }

  const truncated = sourceText.slice(0, 20000); // keep prompt to a reasonable size

  const prompt = `You are generating a multiple-choice quiz for a teacher's lesson material.
Read the LESSON TEXT below and produce exactly ${questionCount} multiple-choice questions that test
understanding of it. Each question must have exactly 4 options labeled A, B, C, D, with exactly one
correct option. Include a short explanation for the correct answer.

Respond with ONLY valid JSON (no markdown fences, no preamble) in this exact shape:
[
  {
    "question_text": "...",
    "explanation": "...",
    "options": [
      { "label": "A", "text": "...", "is_correct": false },
      { "label": "B", "text": "...", "is_correct": true },
      { "label": "C", "text": "...", "is_correct": false },
      { "label": "D", "text": "...", "is_correct": false }
    ]
  }
]

LESSON TEXT:
"""
${truncated}
"""`;

  let response;
  try {
    response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 60000,
      }
    );
  } catch (err) {
    const wrapped = new Error('AI quiz generation request failed: ' + (err.response?.data?.error?.message || err.message));
    wrapped.status = 502;
    throw wrapped;
  }

  const textBlock = response.data.content.find((b) => b.type === 'text');
  if (!textBlock) {
    const err = new Error('AI quiz generation returned no text content');
    err.status = 502;
    throw err;
  }

  let questions;
  try {
    const cleaned = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
    questions = JSON.parse(cleaned);
  } catch {
    const err = new Error('AI quiz generation returned malformed JSON');
    err.status = 502;
    throw err;
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    const err = new Error('AI quiz generation returned no questions');
    err.status = 502;
    throw err;
  }

  return questions;
};

/**
 * quiz: result of quizRepo.findById(quiz_id, true) — includes is_correct per option
 * answers: [{ question_id, selected_option_id }, ...]
 * Returns { score, correct_answers, gradedAnswers } where gradedAnswers is
 * ready to hand to quizRepo.submitAttempt().
 */
const gradeAttempt = (quiz, answers) => {
  const answerMap = {};
  answers.forEach((a) => { answerMap[a.question_id] = a.selected_option_id; });

  let correct_answers = 0;
  const gradedAnswers = quiz.questions.map((q) => {
    const selected_option_id = answerMap[q.question_id] || null;
    const selectedOption = q.options.find((o) => o.option_id === selected_option_id);
    const is_correct = !!selectedOption?.is_correct;
    if (is_correct) correct_answers++;
    return { question_id: q.question_id, selected_option_id, is_correct };
  });

  const total = quiz.questions.length || 1;
  const score = Math.round((correct_answers / total) * 10000) / 100; // 2 decimal places

  return { score, correct_answers, total_questions: quiz.questions.length, gradedAnswers };
};

module.exports = { extractText, generateQuestions, gradeAttempt };
