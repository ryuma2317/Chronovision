import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, CalendarDays, Trophy, Sparkles } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { useAuth } from '../../context/AuthContext';
import useMyClasses from '../../hooks/useMyClasses';
import { Card, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';

const RISK_TONE = { on_track: 'success', at_risk: 'warning', high_risk: 'danger' };

export default function StudentDashboard() {
  const { user } = useAuth();
  const { classes, selectedClassId } = useMyClasses();
  const [prediction, setPrediction] = useState(undefined);
  const [plan, setPlan] = useState(undefined);
  const [badgeProfile, setBadgeProfile] = useState(undefined);
  const [comparison, setComparison] = useState(undefined);

  useEffect(() => {
    studentApi.getPredictionHistory().then((h) => setPrediction(h[0] || null)).catch(() => setPrediction(null));
    studentApi.getLatestStudyPlan().then(setPlan).catch(() => setPlan(null));
    studentApi.getBadges().then(setBadgeProfile).catch(() => setBadgeProfile(null));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    studentApi.getPeerComparison(selectedClassId).then(setComparison).catch(() => setComparison(null));
  }, [selectedClassId]);

  if (prediction === undefined || plan === undefined || badgeProfile === undefined) return <PageSpinner />;

  if (!prediction) {
    return (
      <EmptyState
        icon={<Sparkles size={40} />}
        title={`Welcome, ${user?.first_name}!`}
        description="Run your first GPA prediction to unlock your dashboard, study plan, and what-if simulator."
        action={<Link to="/student/predict"><Button>Get Your First Prediction</Button></Link>}
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-heading mb-1">Welcome back, {user?.first_name}</h1>
      <p className="text-sm text-muted mb-6">Here's where things stand right now.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <TrendingUp size={18} className="text-gold mb-2" />
          <p className="text-2xl font-extrabold text-heading">{Number(prediction.predicted_gpa).toFixed(2)}</p>
          <p className="text-xs text-muted">predicted GPA</p>
          <Badge tone={RISK_TONE[prediction.at_risk_status]} className="mt-2">{prediction.at_risk_status.replace('_', ' ')}</Badge>
        </Card>
        <Card>
          <CalendarDays size={18} className="text-gold mb-2" />
          <p className="text-2xl font-extrabold text-heading">{plan ? `${Number(plan.total_study_hours_per_week).toFixed(1)}h` : '—'}</p>
          <p className="text-xs text-muted">study plan hours / week</p>
        </Card>
        <Card>
          <Trophy size={18} className="text-gold mb-2" />
          <p className="text-2xl font-extrabold text-heading">{badgeProfile?.total_points ?? 0}</p>
          <p className="text-xs text-muted">total points</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Your prediction" action={<Link to="/student/predict/result" className="text-sm text-gold font-semibold">Details</Link>} />
          <p className="text-sm text-body">{prediction.bucket}</p>
          <Link to="/student/what-if"><Button variant="secondary" size="sm" className="mt-3">Try What-If</Button></Link>
        </Card>
        <Card>
          <CardHeader title="Study plan" action={<Link to="/student/study-plan" className="text-sm text-gold font-semibold">View</Link>} />
          {plan ? (
            <p className="text-sm text-body">Targeting {Number(plan.target_gpa).toFixed(2)} GPA &middot; {plan.subjects.length} subjects scheduled</p>
          ) : (
            <p className="text-sm text-muted">No study plan yet.</p>
          )}
          {!plan && <Link to="/student/study-plan/new"><Button variant="secondary" size="sm" className="mt-3">Build One</Button></Link>}
        </Card>
      </div>

      {comparison && (
        <Card className="mt-6">
          <CardHeader title="You vs. your class" />
          <div className="flex items-center gap-8">
            <div><p className="text-2xl font-extrabold text-heading">{Number(comparison.your_predicted_gpa).toFixed(2)}</p><p className="text-xs text-muted">you</p></div>
            <div><p className="text-2xl font-extrabold text-muted">{Number(comparison.class_average_gpa).toFixed(2)}</p><p className="text-xs text-muted">class average</p></div>
            <div><p className="text-2xl font-extrabold text-gold">{comparison.percentile}th</p><p className="text-xs text-muted">percentile of {comparison.total_students}</p></div>
          </div>
        </Card>
      )}
    </div>
  );
}
