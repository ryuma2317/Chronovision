import PreviewPage from './PreviewPage';

const ROWS = [
  { time: '2026-06-19 08:42', actor: 'admin@chronovision.edu', action: 'Created user', target: 'teacher: j.ramirez@school.edu' },
  { time: '2026-06-18 17:05', actor: 'm.santos@school.edu', action: 'Published quiz', target: 'Biology — Unit 4 Quiz' },
  { time: '2026-06-18 14:21', actor: 'admin@chronovision.edu', action: 'Deactivated user', target: 'student: a.kim@school.edu' },
  { time: '2026-06-17 09:10', actor: 'system', action: 'Model prediction batch', target: '142 students scored' },
];

export default function AuditLog() {
  return (
    <PreviewPage
      title="Audit Log"
      description="A record of administrative actions across the platform — user changes, content publishes, and system jobs."
      featureName="The audit log"
      sections={[
        {
          title: 'Recent events',
          content: (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Actor</th>
                    <th className="pb-2 pr-4">Action</th>
                    <th className="pb-2">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 text-muted whitespace-nowrap">{r.time}</td>
                      <td className="py-2.5 pr-4 text-body">{r.actor}</td>
                      <td className="py-2.5 pr-4 text-heading font-medium">{r.action}</td>
                      <td className="py-2.5 text-body">{r.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        },
      ]}
    />
  );
}
