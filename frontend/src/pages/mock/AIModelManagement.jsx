import PreviewPage from './PreviewPage';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function AIModelManagement() {
  return (
    <PreviewPage
      title="AI Model Management"
      description="Monitor the GPA prediction model, trigger retraining, and review execution history."
      featureName="Model retraining & ops"
      sections={[
        {
          title: 'Active model',
          content: (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-heading">XGBoost Regressor — v1.0</p>
                <p className="text-sm text-muted">Trained on 35 features &middot; deployed via Flask API</p>
              </div>
              <Badge tone="success">Live</Badge>
            </div>
          ),
        },
        {
          title: 'Retraining configuration',
          content: (
            <div className="flex items-center justify-between">
              <p className="text-sm text-body">Schedule: weekly &middot; Last run: 4 days ago &middot; Next run: in 3 days</p>
              <Button size="sm" variant="secondary" disabled>Trigger retraining</Button>
            </div>
          ),
        },
        {
          title: 'Recent execution history',
          content: (
            <div className="flex flex-col divide-y divide-border text-sm">
              {[
                { run: 'Run #114', status: 'Completed', tone: 'success', detail: 'RMSE 0.31 · 1,204 samples' },
                { run: 'Run #113', status: 'Completed', tone: 'success', detail: 'RMSE 0.33 · 1,180 samples' },
                { run: 'Run #112', status: 'Failed', tone: 'danger', detail: 'Timeout during feature encoding' },
              ].map((r) => (
                <div key={r.run} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-heading">{r.run}</p>
                    <p className="text-muted text-xs">{r.detail}</p>
                  </div>
                  <Badge tone={r.tone}>{r.status}</Badge>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
