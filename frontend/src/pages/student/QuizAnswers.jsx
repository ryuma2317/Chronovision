import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as studentApi from '../../lib/endpoints/student';
import { apiErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import QuestionCard from '../../components/QuestionCard';
import { PageSpinner } from '../../components/ui/Spinner';

export default function QuizAnswers() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    studentApi.getQuizAnswers(id).then(setData).catch((err) => setError(apiErrorMessage(err, 'Submit the quiz first to view its answer sheet.')));
  }, [id]);

  if (error) return <p className="text-sm text-danger bg-danger-bg rounded-lg px-4 py-3 max-w-md">{error}</p>;
  if (!data) return <PageSpinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-heading mb-1">Answer Sheet</h1>
      <p className="text-sm text-muted mb-6">{data.correct_answers} of {data.total_questions} correct &middot; {Number(data.score).toFixed(0)}%</p>

      <div className="flex flex-col gap-5">
        {data.questions.map((q, i) => {
          const yourAnswer = data.your_answers.find((a) => a.question_id === q.question_id);
          const correctOption = q.options.find((o) => o.is_correct);
          return (
            <Card key={q.question_id}>
              <QuestionCard
                index={i}
                total={data.questions.length}
                questionText={q.question_text}
                options={q.options}
                answer={yourAnswer?.selected_option_id}
                correctOptionId={correctOption?.option_id}
                showCorrectness
              />
              {q.explanation && (
                <p className="text-sm text-muted mt-4 pt-4 border-t border-border">
                  <strong className="text-heading">Explanation:</strong> {q.explanation}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
