import { FlaskConical } from 'lucide-react';

/**
 * Banner for screens that are UI-only (no backend yet). Keeps these pages
 * visually consistent with the rest of the app while being explicit that
 * the data shown is sample data, not live.
 */
export default function PreviewBanner({ feature }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 mb-6 text-sm text-heading">
      <FlaskConical size={18} className="text-gold shrink-0" />
      <span>
        <strong>Preview &mdash; sample data.</strong> {feature} isn&rsquo;t connected to the backend yet.
        This screen shows what it will look like once that API exists.
      </span>
    </div>
  );
}
