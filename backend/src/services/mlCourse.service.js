const axios = require('axios');
const { FLASK_COURSE_URL } = require('../config/env');

// Talks to Flask /predict-courses (app_courses.py).
//
// Every per-course input except difficulty is OPTIONAL. Undefined/'' becomes
// null on the wire, NaN in the model, and the model copes — it was trained with
// these randomly masked. That is what lets a week-2 student predict at all.

const mapAtRisk = (f) => (f === 'high' ? 'high_risk' : f === 'moderate' ? 'at_risk' : 'on_track');

// '' and undefined mean "hasn't happened yet". 0 is a REAL score and must survive.
const optional = (v) =>
  v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v);

const predictCourses = async (features, courses, is_partial = false) => {
  try {
    const { data } = await axios.post(`${FLASK_COURSE_URL}/predict-courses`, {
      features,
      is_partial,
      courses: courses.map((c) => ({
        course_id: c.course_id,
        course_name: c.course_name,
        credits: Number(c.credits),
        difficulty_level: Number(c.difficulty_level),
        course_attendance: optional(c.course_attendance),
        quiz_average: optional(c.quiz_average),
        assignment_average: optional(c.assignment_average),
        midterm: optional(c.midterm),
      })),
    });

    return { ...data, at_risk_status: mapAtRisk(data.at_risk) };
  } catch (err) {
    if (err.response && err.response.status === 422) {
      const e = new Error(err.response.data.error || 'Invalid inputs for the ML model');
      e.status = 422;
      throw e;
    }
    console.error('FLASK CALL FAILED:', err.code, err.message, err.response?.data);
    const e = new Error('ML prediction service unavailable');
    e.status = 503;
    throw e;
  }
};

module.exports = { predictCourses, mapAtRisk, optional };
