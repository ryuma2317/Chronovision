-- ============================================================
-- CHRONOVISION - Seed Data (PostgreSQL / Supabase)
-- Run AFTER chronovision_schema.sql
-- Safe to re-run (uses INSERT ... ON DUPLICATE / IGNORE)
-- ============================================================

-- ============================================================
-- Badges
-- Single, consistent criteria: total points earned (see
-- backend criteria_type = 'points'). Keeps the gamification
-- logic simple — one ladder instead of five different rule types.
-- ============================================================
INSERT INTO badges (name, description, criteria_type, criteria_value)
SELECT * FROM (
  SELECT 'First Steps'      AS name, 'Earn your first points on Chronovision'      AS description, 'points' AS criteria_type, 1    AS criteria_value
  UNION ALL
  SELECT 'Quiz Master',        'Earn 200 points from quizzes and activity',          'points', 200
  UNION ALL
  SELECT 'Rising Star',        'Reach 500 total points',                             'points', 500
  UNION ALL
  SELECT 'Top of the Class',   'Reach 2000 total points',                            'points', 2000
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM badges b WHERE b.name = seed.name
);


-- ============================================================
-- Aptitude / IQ test question bank (15 questions, A–D options)
-- Generic logic / pattern / numeric / verbal reasoning items —
-- original wording, not sourced from any copyrighted test.
-- ============================================================

-- Helper pattern: insert question, then its 4 options, only if
-- a question with that question_order doesn't already exist.

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 1, 'What number comes next in the sequence: 2, 4, 6, 8, ?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 1);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 2, 'Book is to Reading as Fork is to ____.'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 2);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 3, 'Which word does NOT belong with the others: Apple, Banana, Carrot, Mango?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 3);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 4, 'If all Zips are Zaps, and all Zaps are Zops, then all Zips are definitely ____.'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 4);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 5, 'What number comes next: 1, 2, 4, 8, 16, ?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 5);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 6, 'A clock shows 3:15. What is the angle relationship between the hour and minute hands closest to?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 6);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 7, 'Hot is to Cold as Up is to ____.'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 7);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 8, 'Complete the pattern: A, C, E, G, ?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 8);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 9, 'If 5 machines make 5 toys in 5 minutes, how many minutes would it take 100 machines to make 100 toys?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 9);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 10, 'Which shape would logically complete a set where every figure has one more side than the last, starting at a triangle (3 sides), then 4, then 5 — what comes next?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 10);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 11, 'Doctor is to Hospital as Teacher is to ____.'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 11);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 12, 'What number comes next: 3, 6, 12, 24, ?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 12);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 13, 'A train travels 60 km in 1 hour. At the same speed, how far does it travel in 3 hours?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 13);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 14, 'Which word does NOT belong with the others: Triangle, Square, Circle, Rectangle?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 14);

INSERT INTO aptitude_questions (question_id, question_order, question_text)
SELECT gen_random_uuid(), 15, 'If today is Wednesday, what day will it be 100 days from now?'
WHERE NOT EXISTS (SELECT 1 FROM aptitude_questions WHERE question_order = 15);


-- ── Options (4 each, exactly one correct) ──────────────────────
-- Q1
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'9' txt,0 correct UNION ALL SELECT 'B','10',1 UNION ALL SELECT 'C','12',0 UNION ALL SELECT 'D','11',0) x
WHERE q.question_order = 1 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q2
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Cutting' txt,0 correct UNION ALL SELECT 'B','Eating',1 UNION ALL SELECT 'C','Cooking',0 UNION ALL SELECT 'D','Washing',0) x
WHERE q.question_order = 2 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q3
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Apple' txt,0 correct UNION ALL SELECT 'B','Banana',0 UNION ALL SELECT 'C','Carrot',1 UNION ALL SELECT 'D','Mango',0) x
WHERE q.question_order = 3 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q4
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Zops' txt,1 correct UNION ALL SELECT 'B','Zaps only',0 UNION ALL SELECT 'C','Neither',0 UNION ALL SELECT 'D','Cannot be determined',0) x
WHERE q.question_order = 4 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q5
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'24' txt,0 correct UNION ALL SELECT 'B','30',0 UNION ALL SELECT 'C','32',1 UNION ALL SELECT 'D','36',0) x
WHERE q.question_order = 5 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q6
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Acute' txt,1 correct UNION ALL SELECT 'B','Obtuse',0 UNION ALL SELECT 'C','Right angle',0 UNION ALL SELECT 'D','Straight',0) x
WHERE q.question_order = 6 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q7
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Down' txt,1 correct UNION ALL SELECT 'B','Sideways',0 UNION ALL SELECT 'C','Left',0 UNION ALL SELECT 'D','Above',0) x
WHERE q.question_order = 7 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q8
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'H' txt,0 correct UNION ALL SELECT 'B','I',1 UNION ALL SELECT 'C','J',0 UNION ALL SELECT 'D','F',0) x
WHERE q.question_order = 8 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q9
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'5' txt,1 correct UNION ALL SELECT 'B','20',0 UNION ALL SELECT 'C','100',0 UNION ALL SELECT 'D','100',0) x
WHERE q.question_order = 9 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q10
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'A hexagon (6 sides)' txt,1 correct UNION ALL SELECT 'B','Another pentagon (5 sides)',0 UNION ALL SELECT 'C','A square (4 sides)',0 UNION ALL SELECT 'D','A circle',0) x
WHERE q.question_order = 10 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q11
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Hospital' txt,0 correct UNION ALL SELECT 'B','School',1 UNION ALL SELECT 'C','Library',0 UNION ALL SELECT 'D','Office',0) x
WHERE q.question_order = 11 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q12
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'36' txt,0 correct UNION ALL SELECT 'B','48',1 UNION ALL SELECT 'C','30',0 UNION ALL SELECT 'D','42',0) x
WHERE q.question_order = 12 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q13
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'120 km' txt,0 correct UNION ALL SELECT 'B','150 km',0 UNION ALL SELECT 'C','180 km',1 UNION ALL SELECT 'D','200 km',0) x
WHERE q.question_order = 13 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q14
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Triangle' txt,0 correct UNION ALL SELECT 'B','Square',0 UNION ALL SELECT 'C','Circle',1 UNION ALL SELECT 'D','Rectangle',0) x
WHERE q.question_order = 14 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);

-- Q15
INSERT INTO aptitude_options (question_id, option_label, option_text, is_correct)
SELECT q.question_id, x.label, x.txt, x.correct FROM aptitude_questions q,
(SELECT 'A' label,'Tuesday' txt,0 correct UNION ALL SELECT 'B','Thursday',0 UNION ALL SELECT 'C','Friday',1 UNION ALL SELECT 'D','Saturday',0) x
WHERE q.question_order = 15 AND NOT EXISTS (SELECT 1 FROM aptitude_options o WHERE o.question_id = q.question_id);
