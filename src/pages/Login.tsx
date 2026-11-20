import { useState, type FormEvent } from 'react';
import { APP_NAME, DEMO_EMAIL, DEMO_PASSWORD } from '../config';
import { useStore } from '../store';
import { navigate } from '../lib/router';
import { BrandMark } from '../components/Icon';

export function Login() {
  const { dispatch } = useStore();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError('Wrong email or password. Use the demo credentials below.');
      return;
    }
    setError('');
    setBusy(true);
    window.setTimeout(() => {
      dispatch({ type: 'login', email: DEMO_EMAIL });
      navigate('/');
    }, 450);
  }

  return (
    <div className="login">
      <div className="login-side">
        <div className="brand brand-lg">
          <BrandMark size={36} />
          <span>{APP_NAME}</span>
        </div>
        <div className="login-pitch">
          <h1>Every project on plan. Updated by a text.</h1>
          <p>Your foremen reply to a quick text. Your schedule, alerts and issues update themselves.</p>
        </div>
        <div className="login-bars" aria-hidden="true">
          <i style={{ width: '42%', marginLeft: '0%' }} className="done" />
          <i style={{ width: '50%', marginLeft: '18%' }} className="late" />
          <i style={{ width: '46%', marginLeft: '34%' }} />
          <i style={{ width: '40%', marginLeft: '50%' }} />
          <i style={{ width: '30%', marginLeft: '64%' }} />
        </div>
      </div>
      <div className="login-main">
        <form className="login-card" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Welcome back. Sign in to see your projects.</p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="demo-creds">
            <b>Demo account</b>
            <span>
              {DEMO_EMAIL} · {DEMO_PASSWORD}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
