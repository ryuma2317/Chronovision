// Mirrors backend PROFILE_FIELDS order and the ranges used in data_generation/generate_data.py
export const PREDICTION_FORM_SECTIONS = [
  {
    title: 'About you',
    fields: [
      { name: 'age', label: 'Age', type: 'number', min: 17, max: 26, step: 1, default: 19 },
      { name: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'], default: 'male' },
      {
        name: 'major', label: 'Major', type: 'select', default: 'Computer Science',
        options: ['Computer Science', 'Engineering', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Statistics', 'Business', 'Psychology', 'Education'],
      },
      { name: 'semester', label: 'Semester', type: 'number', min: 1, max: 8, step: 1, default: 3 },
      { name: 'course_load', label: 'Courses this term', type: 'number', min: 4, max: 7, step: 1, default: 5 },
    ],
  },
  {
    title: 'Study habits',
    fields: [
      { name: 'study_hours_per_day', label: 'Study hours / day', type: 'number', min: 0.5, max: 12, step: 0.5, default: 4 },
      { name: 'attendance_percentage', label: 'Attendance %', type: 'number', min: 30, max: 100, step: 0.5, default: 85 },
      { name: 'time_management_score', label: 'Time management (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 6 },
      { name: 'study_environment', label: 'Where you usually study', type: 'select', options: ['home', 'library', 'cafe', 'dormitory'], default: 'home' },
    ],
  },
  {
    title: 'Lifestyle',
    fields: [
      { name: 'social_media_hours', label: 'Social media hours / day', type: 'number', min: 0, max: 10, step: 0.5, default: 2.5 },
      { name: 'netflix_hours', label: 'Streaming hours / day', type: 'number', min: 0, max: 8, step: 0.5, default: 1.5 },
      { name: 'sleep_hours', label: 'Sleep hours / night', type: 'number', min: 3, max: 10, step: 0.5, default: 7 },
      { name: 'diet_quality', label: 'Diet quality', type: 'select', options: ['poor', 'average', 'good'], default: 'average' },
      { name: 'exercise_frequency', label: 'Exercise days / week', type: 'number', min: 0, max: 7, step: 1, default: 3 },
      { name: 'part_time_job', label: 'Have a part-time job?', type: 'boolean', default: false },
      { name: 'extracurricular_participation', label: 'Active in extracurriculars?', type: 'boolean', default: true },
    ],
  },
  {
    title: 'Wellbeing',
    fields: [
      { name: 'stress_level', label: 'Stress level (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 5 },
      { name: 'mental_health_rating', label: 'Mental health rating (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 6 },
      { name: 'exam_anxiety_score', label: 'Exam anxiety (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 5 },
      { name: 'motivation_level', label: 'Motivation level (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 7 },
      { name: 'learning_style', label: 'Learning style', type: 'select', options: ['visual', 'auditory', 'reading', 'kinesthetic'], default: 'visual' },
    ],
  },
  {
    title: 'Support & background',
    fields: [
      { name: 'parental_education_level', label: "Parent's education", type: 'select', options: ['high_school', 'bachelor', 'master', 'phd'], default: 'bachelor' },
      { name: 'parental_support_level', label: 'Parental support (1-10)', type: 'number', min: 1, max: 10, step: 1, default: 6 },
      { name: 'family_income_range', label: 'Family income range', type: 'select', options: ['low', 'middle', 'high'], default: 'middle' },
      { name: 'internet_quality', label: 'Internet quality', type: 'select', options: ['poor', 'moderate', 'good', 'excellent'], default: 'good' },
      { name: 'access_to_tutoring', label: 'Access to tutoring?', type: 'boolean', default: false },
    ],
  },
  {
    title: 'Academic record',
    fields: [
      { name: 'previous_gpa', label: 'Previous GPA (0-4)', type: 'number', min: 0, max: 4, step: 0.01, default: 3.0 },
      { name: 'aptitude_score', label: 'Aptitude score (20-100)', type: 'number', min: 20, max: 100, step: 1, default: 70 },
      { name: 'exam_score', label: 'Most recent exam score (0-100)', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
    ],
  },
  {
    title: 'Subject scores (0-100)',
    fields: [
      { name: 'mathematics_score', label: 'Mathematics', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
      { name: 'biology_score', label: 'Biology', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
      { name: 'chemistry_score', label: 'Chemistry', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
      { name: 'physics_score', label: 'Physics', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
      { name: 'computer_science_score', label: 'Computer Science', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
      { name: 'statistics_score', label: 'Statistics', type: 'number', min: 0, max: 100, step: 0.5, default: 75 },
    ],
  },
];

export const SUBJECT_FIELDS = [
  ['mathematics_score', 'Mathematics'],
  ['biology_score', 'Biology'],
  ['chemistry_score', 'Chemistry'],
  ['physics_score', 'Physics'],
  ['computer_science_score', 'Computer Science'],
  ['statistics_score', 'Statistics'],
];

export const defaultFeatureValues = () => {
  const values = {};
  PREDICTION_FORM_SECTIONS.forEach((section) => {
    section.fields.forEach((f) => {
      values[f.name] = f.type === 'boolean' ? (f.default ? 1 : 0) : f.default;
    });
  });
  return values;
};
