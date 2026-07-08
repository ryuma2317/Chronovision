import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { Card } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { History } from 'lucide-react';

export default function WhatIfHistory() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    studentApi.getWhatIfHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  if (history === null) return <PageSpinner />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-heading mb-6">What-If History</h1>
      {history.length === 0 ? (
        <EmptyState icon={<History size={40} />} title="No simulations yet" description="Run a what-if simulation to see your history here." />
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((h) => (
            <Card key={h.simulation_id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-heading">{Number(h.baseline_gpa).toFixed(2)}</span>
                <ArrowRight size={16} className="text-muted" />
                <span className={`text-lg font-bold ${h.improved ? 'text-success' : 'text-danger'}`}>{Number(h.simulated_gpa).toFixed(2)}</span>
              </div>
              <span className="text-xs text-muted">{new Date(h.created_at).toLocaleString()}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
