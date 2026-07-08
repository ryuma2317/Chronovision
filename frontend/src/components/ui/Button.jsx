import clsx from 'clsx';

const variants = {
  primary: 'bg-gold text-navy hover:bg-gold-dim',
  secondary: 'bg-transparent border border-navy text-navy dark:border-gold dark:text-gold hover:bg-input',
  ghost: 'bg-transparent text-body hover:bg-input',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  isLoading,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
