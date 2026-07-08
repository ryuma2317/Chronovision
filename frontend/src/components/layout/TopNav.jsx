import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Moon, Sun, ChevronDown, Bell, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_CONFIG } from './navConfig';
import Avatar from '../ui/Avatar';
import logo from '../../assets/logo.png';

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative px-1 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
          isActive ? 'text-gold' : 'text-white/80 hover:text-white'
        } after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-[2px] after:rounded-full ${
          isActive ? 'after:bg-gold' : 'after:bg-transparent'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

const SAMPLE_NOTIFICATIONS = [
  { id: 1, title: 'New quiz published', detail: 'Biology — Cell Structures', time: '2h ago' },
  { id: 2, title: 'Study plan reminder', detail: "You're behind on Chemistry hours this week", time: '1d ago' },
  { id: 3, title: 'Badge unlocked', detail: 'Rising Star — 500 points', time: '3d ago' },
];

export default function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const config = NAV_CONFIG[user?.role] || { primary: [], preview: [] };
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-40 flex items-center justify-between px-4 md:px-8 bg-navy h-nav-height shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden text-white" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <NavLink to={`/${user?.role || ''}`} className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="Chronovision" className="h-9 w-9 rounded object-contain" />
          <span className="hidden sm:inline text-gold font-bold text-lg tracking-tight">Chronovision</span>
        </NavLink>

        <div className="hidden md:flex items-center gap-5 ml-6">
          {config.primary.map((item) => (
            <NavItem key={item.to} to={item.to}>{item.label}</NavItem>
          ))}
          {config.preview?.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
                className="flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white py-2"
              >
                More <ChevronDown size={14} />
              </button>
              {moreOpen && (
                <div className="absolute left-0 mt-1 w-52 rounded-md bg-card border border-border shadow-overlay py-1 z-50">
                  {config.preview.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="block px-4 py-2 text-sm text-body hover:bg-input"
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={toggleTheme}
          className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            onBlur={() => setTimeout(() => setBellOpen(false), 150)}
            className="relative text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gold" />
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-1 w-72 rounded-md bg-card border border-border shadow-overlay py-2 z-50">
              <div className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                Notifications (preview)
              </div>
              {SAMPLE_NOTIFICATIONS.map((n) => (
                <div key={n.id} className="px-4 py-2 hover:bg-input">
                  <p className="text-sm font-semibold text-heading">{n.title}</p>
                  <p className="text-xs text-muted">{n.detail} &middot; {n.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            onBlur={() => setTimeout(() => setProfileOpen(false), 150)}
            className="flex items-center gap-2"
          >
            <Avatar name={fullName} size={32} />
            <ChevronDown size={14} className="hidden sm:block text-white/70" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-md bg-card border border-border shadow-overlay py-1 z-50">
              <NavLink to={`/${user?.role}/profile`} className="flex items-center gap-2 px-4 py-2 text-sm text-body hover:bg-input">
                <UserIcon size={15} /> Profile & Settings
              </NavLink>
              <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-input">
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute top-nav-height left-0 w-full bg-navy border-t border-white/10 md:hidden flex flex-col py-2 max-h-[80vh] overflow-y-auto">
          {[...config.primary, ...(config.preview || [])].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `px-5 py-3 text-sm font-medium ${isActive ? 'text-gold bg-white/5' : 'text-white/80'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
