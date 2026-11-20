import type { Frequency } from '../types';
import { useStore } from '../store';
import { Card, PersonLine } from '../components/ui';
import { SmsLogo, WhatsAppLogo } from '../components/Icon';

const FREQS: { id: Frequency; label: string; sub: string }[] = [
  { id: 'weekly', label: 'Weekly', sub: 'Every Monday, 8:00 AM' },
  { id: 'twice', label: 'Twice a week', sub: 'Mondays and Thursdays, 8:00 AM' },
  { id: 'daily', label: 'Daily', sub: 'Every weekday, 4:00 PM' },
];

export function Settings() {
  const { state, dispatch } = useStore();
  const foremen = state.projects.map((p) => ({ person: state.people.find((x) => x.id === p.foremanId)!, project: p }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">How often foremen are asked for updates, and when people get notified.</p>
        </div>
      </div>

      <div className="settings">
        <Card title="Check-in schedule">
          <p className="muted card-intro">Each foreman gets a short text asking for progress on the work that's due.</p>
          <div className="choice-row" role="radiogroup" aria-label="Check-in frequency">
            {FREQS.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={state.settings.frequency === f.id}
                className={`choice ${state.settings.frequency === f.id ? 'on' : ''}`}
                onClick={() => dispatch({ type: 'setFrequency', value: f.id })}
              >
                <b>{f.label}</b>
                <span>{f.sub}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Foremen and channels">
          <p className="muted card-intro">Reach every crew on the app they already use. No new app to install.</p>
          <div className="channel-list">
            {foremen.map(({ person, project }) => (
              <div key={person.id} className="channel-row">
                <div>
                  <PersonLine person={person} />
                  <span className="muted small">
                    {project.name} · {person.phone}
                  </span>
                </div>
                <div className="seg seg-sm" role="radiogroup" aria-label={`Channel for ${person.name}`}>
                  <button role="radio" aria-checked={person.channel === 'sms'} className={person.channel === 'sms' ? 'on' : ''} onClick={() => dispatch({ type: 'setChannel', personId: person.id, channel: 'sms' })}>
                    <SmsLogo size={14} /> SMS
                  </button>
                  <button role="radio" aria-checked={person.channel === 'whatsapp'} className={person.channel === 'whatsapp' ? 'on' : ''} onClick={() => dispatch({ type: 'setChannel', personId: person.id, channel: 'whatsapp' })}>
                    <WhatsAppLogo size={14} /> WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Alert rules">
          <p className="muted card-intro">Rules run after every check-in. Alerts go to the app, SMS and email.</p>
          <div className="rules">
            {state.rules.map((r) => (
              <div key={r.id} className={`rule ${r.enabled ? '' : 'off'}`}>
                <div className="rule-text">
                  <b>{r.label}</b>
                  <span>
                    {r.detail}
                    {r.threshold !== undefined && (
                      <>
                        {' '}
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={r.threshold}
                          disabled={!r.enabled}
                          aria-label={`${r.label} threshold`}
                          onChange={(e) => dispatch({ type: 'setThreshold', id: r.id, value: Math.max(1, Number(e.target.value) || 1) })}
                        />{' '}
                        {r.unit}.
                      </>
                    )}
                  </span>
                </div>
                <button
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label={r.label}
                  className={`switch ${r.enabled ? 'on' : ''}`}
                  onClick={() => dispatch({ type: 'toggleRule', id: r.id })}
                >
                  <i />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
