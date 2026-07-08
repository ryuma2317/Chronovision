import PreviewBanner from '../../components/PreviewBanner';
import { Card, CardHeader } from '../../components/ui/Card';

/**
 * Generic shell for not-yet-backed features. Pass `sections` to render
 * representative sample content so the page isn't a blank "coming soon" —
 * it shows what the feature will look like, clearly marked as sample data.
 */
export default function PreviewPage({ title, description, featureName, sections = [] }) {
  return (
    <div>
      <PreviewBanner feature={featureName} />
      <h1 className="text-2xl font-bold text-heading mb-1">{title}</h1>
      {description && <p className="text-sm text-muted mb-6">{description}</p>}
      <div className="grid gap-6">
        {sections.map((section, i) => (
          <Card key={i}>
            {section.title && <CardHeader title={section.title} subtitle={section.subtitle} />}
            {section.content}
          </Card>
        ))}
      </div>
    </div>
  );
}
