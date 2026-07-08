import clsx from 'clsx';

/**
 * Shared MCQ question renderer — used by both the aptitude/IQ test and class quizzes.
 * answer: the currently selected option id (or null)
 * revealedOptionId: when set (review mode), highlights correct/incorrect after the fact
 */
export default function QuestionCard({ index, total, questionText, options, answer, onSelect, correctOptionId, showCorrectness }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted font-bold mb-2">
        Question {index + 1} of {total}
      </p>
      <p className="text-lg font-semibold text-heading mb-5">{questionText}</p>
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const isSelected = answer === opt.option_id;
          const isCorrect = showCorrectness && opt.option_id === correctOptionId;
          const isWrongSelected = showCorrectness && isSelected && opt.option_id !== correctOptionId;

          return (
            <button
              key={opt.option_id}
              type="button"
              disabled={showCorrectness}
              onClick={() => onSelect?.(opt.option_id)}
              className={clsx(
                'flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                isSelected && !showCorrectness && 'border-gold bg-gold/10',
                !isSelected && !showCorrectness && 'border-border hover:bg-input',
                isCorrect && 'border-success bg-success-bg',
                isWrongSelected && 'border-danger bg-danger-bg'
              )}
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-full border border-current text-xs font-bold shrink-0">
                {opt.option_label}
              </span>
              <span className="text-body">{opt.option_text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
