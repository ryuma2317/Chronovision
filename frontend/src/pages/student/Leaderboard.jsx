import { useEffect, useState } from 'react';
import { Trophy, Award } from 'lucide-react';
import * as studentApi from '../../lib/endpoints/student';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';

const RANK_COLORS = ['text-gold', 'text-muted', 'text-[#B08D57]'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState(null);
  const [badgeProfile, setBadgeProfile] = useState(null);

  useEffect(() => {
    studentApi.getLeaderboard(20).then(setLeaderboard).catch(() => setLeaderboard([]));
    studentApi.getBadges().then(setBadgeProfile).catch(() => setBadgeProfile({ total_points: 0, badges: [] }));
  }, []);

  if (leaderboard === null || badgeProfile === null) return <PageSpinner />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold text-heading mb-6">Leaderboard</h1>
        <Card>
          <div className="flex flex-col divide-y divide-border">
            {leaderboard.map((row, i) => {
              const isMe = row.student_id === user?.user_id;
              const fullName = `${row.first_name} ${row.last_name}`;
              return (
                <div key={row.student_id} className={`flex items-center gap-4 py-3 first:pt-0 last:pb-0 ${isMe ? 'bg-gold/5 rounded-lg px-2 -mx-2' : ''}`}>
                  <span className={`w-6 text-center font-extrabold ${RANK_COLORS[i] || 'text-muted'}`}>{row.rank}</span>
                  <Avatar name={fullName} size={32} />
                  <span className="flex-1 text-sm font-semibold text-heading">{fullName}{isMe && ' (you)'}</span>
                  <span className="text-sm font-bold text-gold">{row.total_points} pts</span>
                </div>
              );
            })}
            {leaderboard.length === 0 && <p className="text-sm text-muted py-4">No points logged yet — be the first!</p>}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold text-heading mb-6">Your Badges</h2>
        <Card className="mb-4 text-center">
          <Trophy size={28} className="text-gold mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-heading">{badgeProfile.total_points}</p>
          <p className="text-xs text-muted uppercase">total points</p>
        </Card>
        <Card>
          <CardHeader title="Earned" />
          {badgeProfile.badges.length === 0 ? (
            <p className="text-sm text-muted">No badges yet — complete quizzes and lessons to start earning them.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {badgeProfile.badges.map((b) => (
                <div key={b.badge_id} className="flex items-center gap-3">
                  <Award size={20} className="text-gold shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-heading">{b.name}</p>
                    <p className="text-xs text-muted">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
