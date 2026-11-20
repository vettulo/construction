import { useState } from 'react';
import { useStore } from '../store';
import { timeAgo } from '../lib/dates';
import { navigate } from '../lib/router';
import { Card, ChannelBadge, Empty, PersonLine } from '../components/ui';
import { Icon } from '../components/Icon';

export function Issues() {
  const { state } = useStore();
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const list = state.issues.filter((i) => filter === 'all' || i.status === filter).sort((a, b) => b.number - a.number);
  const count = (s: 'open' | 'resolved') => state.issues.filter((i) => i.status === s).length;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Issues</h1>
          <p className="muted">Problems reported from the field, each with an owner.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {(['open', 'resolved', 'all'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
            {k === 'all' ? 'All' : k === 'open' ? 'Open' : 'Resolved'}
            {k !== 'all' && <em>{count(k)}</em>}
          </button>
        ))}
      </div>
      <Card>
        <div className="itable" role="table" aria-label="Issues">
          <div className="itable-row itable-head" role="row">
            <span>Issue</span>
            <span>Reported by</span>
            <span>Assigned to</span>
            <span>Status</span>
            <span />
          </div>
          {list.length === 0 && <Empty>No issues here.</Empty>}
          {list.map((i) => {
            const project = state.projects.find((p) => p.id === i.projectId)!;
            const by = state.people.find((p) => p.id === i.reportedBy)!;
            const to = state.people.find((p) => p.id === i.assignedTo)!;
            return (
              <a key={i.id} href={`#/issues/${i.id}`} className="itable-row" role="row" onClick={(e) => (e.preventDefault(), navigate(`/issues/${i.id}`))}>
                <span className="it-main">
                  <b>
                    <span className="num">#{i.number}</span> {i.title}
                  </b>
                  <span>
                    {project.name} · {timeAgo(i.createdAt)}
                  </span>
                </span>
                <span className="it-by">
                  <PersonLine person={by} />
                  <ChannelBadge channel={i.via} />
                </span>
                <span>
                  <PersonLine person={to} />
                </span>
                <span>
                  <span className={`status status-${i.status}`}>{i.status === 'open' ? 'Open' : 'Resolved'}</span>
                </span>
                <span className="pt-go" aria-hidden="true">
                  <Icon name="chevron" />
                </span>
              </a>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
