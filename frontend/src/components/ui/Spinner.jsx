export default function Spinner({ className = '', size = 24 }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span
        className="rounded-full border-3 border-gold border-t-transparent animate-spin"
        style={{ width: size, height: size, borderWidth: Math.max(2, size / 8) }}
      />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size={40} />
    </div>
  );
}
