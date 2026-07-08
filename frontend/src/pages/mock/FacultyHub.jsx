import PreviewPage from './PreviewPage';

export default function FacultyHub() {
  return (
    <PreviewPage
      title="Faculty Hub"
      description="A shared space for staff announcements, department messages, and cross-class coordination."
      featureName="Faculty Hub messaging"
      sections={[
        {
          title: 'Department announcements',
          content: (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-body"><span className="font-semibold text-heading">Science Dept:</span> Midterm grading deadline moved to next Friday.</p>
              <p className="text-body"><span className="font-semibold text-heading">Admin:</span> New at-risk intervention workflow rolling out next week — training session Thursday.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
