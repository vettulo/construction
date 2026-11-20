import { useEffect, useRef, useState, type ReactNode } from 'react';
import { APP_NAME, CURRENT_USER_ID } from '../config';
import { useStore } from '../store';
import { navigate } from '../lib/router';
import { AlertRow, Avatar, Empty } from './ui';
import { BrandMark, Icon, type IconName } from './Icon';
import { Search } from './Search';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/issues', label: 'Issues', icon: 'flag' },
  { to: '/alerts', label: 'Alerts', icon: 'bell' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function Layout({ route, children }: { route: string; children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useClickOutside(bellOpen, () => setBellOpen(false));
  const userRef = useClickOutside(userOpen, () => setUserOpen(false));
  const me = state.people.find((p) => p.id === CURRENT_USER_ID)!;
  const unread = state.alerts.filter((a) => !a.read).length;
  const openIssues = state.issues.filter((i) => i.status === 'open').length;

  useEffect(() => {
    setNavOpen(false);
    setBellOpen(false);
    setUserOpen(false);
  }, [route]);

  useEffect(() => {
    if (!state.toasts.length) return;
    const t = window.setTimeout(() => dispatch({ type: 'dismissToast', id: state.toasts[0].id }), 3800);
    return () => window.clearTimeout(t);
  }, [state.toasts, dispatch]);

  const signOut = () => {
    dispatch({ type: 'logout' });
    navigate('/');
  };

  const isActive = (to: string) => (to === '/' ? route === '/' : route.startsWith(to));
  const badge = (to: string) => (to === '/alerts' ? unread : to === '/issues' ? openIssues : 0);

  return (
    <div className={`app ${navOpen ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <a href="#/" className="brand">
          <BrandMark />
          <span>{APP_NAME}</span>
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={isActive(n.to) ? 'active' : ''} aria-current={isActive(n.to) ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {badge(n.to) > 0 && <em>{badge(n.to)}</em>}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="me">
            <Avatar name={me.name} size={32} />
            <div>
              <b>{me.name}</b>
              <span>{me.role}</span>
            </div>
            <button className="icon-btn me-out" onClick={signOut} aria-label="Sign out" title="Sign out">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <a href="#/" className="brand only-mobile">
            <BrandMark size={26} />
          </a>
          <Search />
          <div className="top-right">
            <div className="pop-wrap" ref={bellRef}>
              <button className="icon-btn" onClick={() => setBellOpen((o) => !o)} aria-label={`Alerts, ${unread} unread`}>
                <Icon name="bell" />
                {unread > 0 && <span className="bell-badge">{unread}</span>}
              </button>
              {bellOpen && (
                <div className="popover bell-pop">
                  <div className="pop-head">
                    <b>Alerts</b>
                    {unread > 0 && (
                      <button className="link" onClick={() => dispatch({ type: 'markAlertsRead' })}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="pop-list">
                    {state.alerts.length === 0 && <Empty>No alerts yet.</Empty>}
                    {state.alerts.slice(0, 5).map((a) => (
                      <AlertRow key={a.id} alert={a} compact />
                    ))}
                  </div>
                  <a href="#/alerts" className="pop-foot">
                    View all alerts
                  </a>
                </div>
              )}
            </div>
            <div className="pop-wrap" ref={userRef}>
              <button className="user-btn" onClick={() => setUserOpen((o) => !o)} aria-label="Account menu">
                <Avatar name={me.name} size={32} />
              </button>
              {userOpen && (
                <div className="popover user-pop">
                  <div className="pop-user">
                    <b>{me.name}</b>
                    <span>{state.user}</span>
                  </div>
                  <button
                    className="menu-item"
                    onClick={() => {
                      dispatch({ type: 'reset' });
                      setUserOpen(false);
                      navigate('/');
                    }}
                  >
                    <Icon name="refresh" /> Reset demo data
                  </button>
                  <button
                    className="menu-item"
                    onClick={signOut}
                  >
                    <Icon name="logout" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      <div className="toasts" aria-live="polite">
        {state.toasts.map((t) => (
          <div key={t.id} className="toast">
            <Icon name="check" size={16} />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
