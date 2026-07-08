import PreviewPage from './PreviewPage';
import Badge from '../../components/ui/Badge';

const ITEMS = [
  { title: 'New quiz published', detail: 'Biology — Cell Structures is now live for Class 10B', time: '2 hours ago', tone: 'info' },
  { title: 'Study plan reminder', detail: "You're 2 hours behind your weekly Chemistry target", time: '1 day ago', tone: 'warning' },
  { title: 'Badge unlocked', detail: 'Rising Star — 500 points reached', time: '3 days ago', tone: 'success' },
  { title: 'Attendance flag', detail: '3 students marked absent in Period 4', time: '4 days ago', tone: 'danger' },
];

export default function NotificationCenter() {
  return (
    <PreviewPage
      title="Notifications & Announcements"
      description="A central feed for quiz publishes, study plan nudges, badge unlocks, and class announcements."
      featureName="The notification center"
      sections={[
        {
          title: 'Recent activity',
          content: (
            <div className="flex flex-col divide-y divide-border">
              {ITEMS.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-heading">{item.title}</p>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={item.tone}>{item.tone}</Badge>
                    <p className="text-xs text-muted mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
