// The 15 surviving student features.
//
// WHAT WAS REMOVED, AND WHY IT MATTERS
// ------------------------------------
// Gone: age, gender, major, semester, parental_education_level,
//       parental_support_level, family_income_range, internet_quality,
//       access_to_tutoring, netflix_hours, part_time_job,
//       extracurricular_participation, learning_style
//
//  - ETHICS: gender, family_income_range and parental_education_level let the
//    model predict failure from a student's DEMOGRAPHICS. A system that tells a
//    poor student they will fail because their parents are poor is laundering
//    bias into an academic judgement. Removed on purpose.
//  - EVIDENCE: learning_style has no empirical support in the education
//    literature.
//  - NOISE: netflix_hours duplicates social_media_hours; age/semester/major
//    carry almost nothing once ability and behaviour are known.
//
// Every surviving field is ACTIONABLE (a student can change it) or ACADEMIC
// (prior attainment). Nothing here is immutable.
//
// Course-level inputs (midterm, quizzes, assignments, attendance) are NOT here.
// They are collected per-course on the Predict page, because they belong to a
// course, not to a person.

export const PREDICTION_FORM_SECTIONS = [
  {
    title: 'Study habits',
    fields: [
      { name: 'study_hours_per_day', label: 'Study hours / day', type: 'number', min: 0.5, max: 12, step: 0.5, default: 4 },
      { name: 'attendance_percentage', label: 'Overall attendance (%)', type: 'number', min: 30, max: 100, step: 1, default: 85 },
      { name: 'time_management_score', label: 'Time management (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 6 },
      { name: 'course_load', label: 'Courses this semester', type: 'number', min: 4, max: 7, step: 1, default: 5 },
      {
        name: 'study_environment', label: 'Where you usually study', type: 'select', default: 'home',
        options: [
          { value: 'home', label: 'Home' },
          { value: 'library', label: 'Library' },
          { value: 'cafe', label: 'Cafe' },
          { value: 'dormitory', label: 'Dormitory' },
        ],
      },
    ],
  },
  {
    title: 'Lifestyle & wellbeing',
    fields: [
      { name: 'sleep_hours', label: 'Sleep hours / night', type: 'number', min: 3, max: 10, step: 0.5, default: 7 },
      { name: 'social_media_hours', label: 'Social media hours / day', type: 'number', min: 0, max: 10, step: 0.5, default: 2.5 },
      { name: 'exercise_frequency', label: 'Exercise days / week', type: 'number', min: 0, max: 7, step: 1, default: 3 },
      {
        name: 'diet_quality', label: 'Diet quality', type: 'select', default: 'average',
        options: [
          { value: 'poor', label: 'Poor' },
          { value: 'average', label: 'Average' },
          { value: 'good', label: 'Good' },
        ],
      },
    ],
  },
  {
    title: 'Mental state',
    fields: [
      { name: 'stress_level', label: 'Stress level (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 5 },
      { name: 'mental_health_rating', label: 'Mental health (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 6 },
      { name: 'exam_anxiety_score', label: 'Exam anxiety (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 5 },
      { name: 'motivation_level', label: 'Motivation (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 6 },
    ],
  },
  {
    title: 'Academic history',
    fields: [
      { name: 'previous_gpa', label: 'Previous GPA (0-4)', type: 'number', min: 0, max: 4, step: 0.01, default: 3.0 },
      { name: 'aptitude_score', label: 'Aptitude score (20-100)', type: 'number', min: 20, max: 100, step: 1, default: 70 },
    ],
  },
];

// The exact 15 the model expects. Keep in sync with the trainer's
// STUDENT_FEATURES or predictions will silently misalign.
export const BEHAVIOUR_FIELDS = PREDICTION_FORM_SECTIONS.flatMap((s) =>
  s.fields.map((f) => f.name)
);

export const defaultFeatureValues = () => {
  const values = {};
  PREDICTION_FORM_SECTIONS.forEach((section) => {
    section.fields.forEach((f) => { values[f.name] = f.default; });
  });
  return values;
};