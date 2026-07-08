import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, TrendingUp, Brain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import logo from '../../assets/logo.png';

const PILLARS = [
  { icon: <Brain size={18} />, title: 'Predictive insight', text: 'GPA forecasts grounded in your actual study habits, not guesswork.' },
  { icon: <TrendingUp size={18} />, title: 'What-if simulation', text: 'See how a schedule change shifts your trajectory before you commit to it.' },
  { icon: <GraduationCap size={18} />, title: 'Built for every role', text: 'One platform for admins, teachers, and students to act on the same data.' },
];

export default function Login() {
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(email, password);
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-page">
      <div className="hidden lg:flex lg:w-[42%] bg-navy flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <img src={logo} alt="Chronovision" className="w-20 h-20 object-contain mb-6" />
          <h1 className="text-3xl font-extrabold text-gold mb-2 tracking-tight">Chronovision</h1>
          <p className="text-white/70 text-sm mb-10">Wisdom &middot; Time &middot; Foresight</p>

          <div className="flex flex-col gap-6 text-left w-full">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <div className="mt-0.5 text-gold shrink-0">{p.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white">{p.title}</p>
                  <p className="text-sm text-white/60 mt-0.5">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Chronovision" className="w-14 h-14 object-contain mb-3" />
            <h1 className="text-xl font-extrabold text-heading">Chronovision</h1>
          </div>

          <div className="flex border-b border-border mb-8">
            <button
              onClick={() => setTab('signin')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                tab === 'signin' ? 'text-heading border-gold' : 'text-muted border-transparent'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                tab === 'signup' ? 'text-heading border-gold' : 'text-muted border-transparent'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold text-heading">Welcome back</h2>
              {error && (
                <p className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>
              )}
              <Input
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-[34px] text-muted hover:text-heading"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button type="submit" size="lg" isLoading={isLoading} className="mt-1">
                Sign In
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-heading">Sign up</h2>
              <p className="text-sm text-body bg-input rounded-lg px-4 py-3.5 leading-relaxed">
                Chronovision accounts are created by your school administrator — there&rsquo;s no
                self-service sign-up. If you don&rsquo;t have a login yet, ask your admin to add you,
                then come back here to sign in.
              </p>
              <Button variant="secondary" onClick={() => setTab('signin')}>Back to Sign In</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
