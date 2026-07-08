import PreviewPage from './PreviewPage';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const SEMESTER_DATA = [
  { semester: 'Fall', avgGpa: 2.9 },
  { semester: 'Spring', avgGpa: 3.1 },
  { semester: 'Summer', avgGpa: 3.0 },
];

export default function ClassAnalytics() {
  return (
    <PreviewPage
      title="Analytics: Semester & Peer Comparison"
      description="Track average performance across semesters and compare cohorts side by side."
      featureName="Multi-semester analytics"
      sections={[
        {
          title: 'Average predicted GPA by semester',
          content: (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SEMESTER_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="semester" stroke="var(--color-muted)" fontSize={12} />
                  <YAxis domain={[0, 4]} stroke="var(--color-muted)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
                  <Bar dataKey="avgGpa" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ),
        },
      ]}
    />
  );
}
