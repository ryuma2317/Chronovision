import clsx from 'clsx';

const tones = {
  success: 'text-success bg-success-bg',
  warning: 'text-warning bg-warning-bg',
  danger: 'text-danger bg-danger-bg',
  info: 'text-info bg-info-bg',
  gold: 'text-navy bg-gold',
  neutral: 'text-body bg-input',
};

export default function Badge({ tone = 'neutral', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
