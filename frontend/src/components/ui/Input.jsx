import clsx from 'clsx';

export default function Input({ label, error, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wide text-heading">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'rounded-lg border bg-input px-3.5 py-2.5 text-sm text-heading placeholder:text-muted',
          'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
