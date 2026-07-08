import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { Card, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const RISK_META = {
  on_track: { tone: 'success', label: 'On Track', icon: <CheckCircle2 size={18} /> },
  at_risk: { tone: 'warning', label: 'At Risk', icon: <AlertTriangle size={18} /> },
  high_risk: { tone: 'danger', label: 'High Risk', icon: <AlertTriangle size={18} /> },
};

export default function PredictionDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(location.state?.result || null);
  const [newBadges, setNewBadges] = useState(location.state?.result?.new_badges || []);
  const [isLoading, setIsLoading] = useState(!location.state?.result);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (result) return;
    studentApi.getPredictionHistory()
      .then((history) => {
        if (history.length === 0) {
          setNotFound(true);
        } else {
          setResult(history[0]);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [result]);

  if (isLoading) return <PageSpinner />;

  if (notFound || !result) {
    return (
      <EmptyState
        icon={<TrendingUp size={40} />}
        title="No prediction yet"
        description="Run a score entry first to see your predicted GPA and risk level."
        action={<Link to="/student/predict"><Button>Go to Score Entry</Button></Link>}
      />
    );
  }

  const risk = RISK_META[result.at_risk_status] || RISK_META.on_track;
  const gpaPercent = Math.min(100, (result.predicted_gpa / 4) * 100);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-heading mb-6">Your Prediction</h1>

      {newBadges.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 mb-6 text-sm text-heading">
          <Sparkles size={16} className="text-gold" />
          New badge unlocked: <strong>{newBadges.join(', ')}</strong>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex flex-col items-center text-center py-6">
          <div className="relative w-44 h-44 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="var(--color-gold)" strokeWidth="10"
                strokeDasharray={`${gpaPercent * 2.64} 264`} strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-heading">{Number(result.predicted_gpa).toFixed(2)}</span>
              <span className="text-xs text-muted uppercase tracking-wide">predicted GPA</span>
            </div>
          </div>
          <Badge tone={risk.tone} className="mb-2">{risk.icon}<span className="ml-1.5">{risk.label}</span></Badge>
          <p className="text-sm text-muted">{result.bucket}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Want to see what could change this?" />
          <p className="text-sm text-body mb-4">
            Try the What-If Simulator to see how adjusting your study habits shifts this prediction.
          </p>
          <Link to="/student/what-if"><Button variant="secondary">Open What-If Simulator</Button></Link>
        </Card>
        <Card>
          <CardHeader title="Ready to plan your week?" />
          <p className="text-sm text-body mb-4">
            Take the aptitude test and get an AI-suggested study plan built around this prediction.
          </p>
          <Link to="/student/study-plan"><Button variant="secondary">Build Study Plan</Button></Link>
        </Card>
      </div>
    </div>
  );
}
