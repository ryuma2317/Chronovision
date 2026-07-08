import PreviewPage from './PreviewPage';
import Button from '../../components/ui/Button';
import { FileText, Download } from 'lucide-react';

const REPORTS = [
  { name: 'Semester GPA Summary', updated: 'Updated weekly' },
  { name: 'Attendance Compliance Report', updated: 'Updated daily' },
  { name: 'At-Risk Student Roster', updated: 'Updated daily' },
  { name: 'Quiz Performance by Class', updated: 'Updated weekly' },
];

export default function ReportsHub() {
  return (
    <PreviewPage
      title="Reports Hub"
      description="Generate and export standardized reports for stakeholders and accreditation reviews."
      featureName="Report generation"
      sections={[
        {
          title: 'Available reports',
          content: (
            <div className="flex flex-col divide-y divide-border">
              {REPORTS.map((r) => (
                <div key={r.name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gold" />
                    <div>
                      <p className="text-sm font-semibold text-heading">{r.name}</p>
                      <p className="text-xs text-muted">{r.updated}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" disabled><Download size={14} /> Export</Button>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
