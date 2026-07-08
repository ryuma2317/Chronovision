import clsx from 'clsx';

export default function Select({ label, error, className, id, children, ...props }) {
  const selectId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-bold uppercase tracking-wide text-heading">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'rounded-lg border bg-input px-3.5 py-2.5 text-sm text-heading',
          'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
