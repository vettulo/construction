import { useState } from 'react';
import { useStore } from '../store';
import { AlertRow, Card, Empty } from '../components/ui';

export function Alerts() {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const unread = state.alerts.filter((a) => !a.read).length;
  const list = state.alerts.filter((a) => filter === 'all' || !a.read);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Alerts</h1>
          <p className="muted">Triggered automatically by field check-ins and your alert rules.</p>
        </div>
        <div className="head-actions">
          <a href="#/settings" className="btn">
            Alert rules
          </a>
          <button className="btn" disabled={!unread} onClick={() => dispatch({ type: 'markAlertsRead' })}>
            Mark all as read
          </button>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
          All
        </button>
        <button role="tab" aria-selected={filter === 'unread'} className={filter === 'unread' ? 'on' : ''} onClick={() => setFilter('unread')}>
          Unread {unread > 0 && <em>{unread}</em>}
        </button>
      </div>
      <Card>
        <div className="list">
          {list.length === 0 && <Empty>You're all caught up.</Empty>}
          {list.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      </Card>
    </div>
  );
}
