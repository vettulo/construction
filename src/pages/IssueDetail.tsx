import { useState, type FormEvent } from 'react';
import { CURRENT_USER_ID } from '../config';
import { uid, useStore } from '../store';
import { fmtTime, timeAgo } from '../lib/dates';
import { Avatar, Card, ChannelBadge, Empty, PersonLine } from '../components/ui';
import { BrandMark, Icon } from '../components/Icon';

export function IssueDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const issue = state.issues.find((i) => i.id === id);
  if (!issue) return <Empty>Issue not found. <a href="#/issues">Back to issues</a></Empty>;

  const project = state.projects.find((p) => p.id === issue.projectId)!;
  const person = (pid: string) => state.people.find((p) => p.id === pid);
  const by = person(issue.reportedBy)!;
  const to = person(issue.assignedTo)!;

  function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !issue) return;
    dispatch({ type: 'addIssueMessage', issueId: issue.id, message: { id: uid('m'), author: CURRENT_USER_ID, text: text.trim(), at: new Date().toISOString(), via: 'app' } });
    setText('');
  }

  function toggleStatus() {
    if (!issue) return;
    const next = issue.status === 'open' ? 'resolved' : 'open';
    const me = person(CURRENT_USER_ID)!;
    dispatch({ type: 'setIssueStatus', issueId: issue.id, status: next });
    dispatch({
      type: 'addIssueMessage',
      issueId: issue.id,
      message: { id: uid('m'), author: 'bot', text: next === 'resolved' ? `Issue marked as resolved by ${me.name}.` : `Issue reopened by ${me.name}.`, at: new Date().toISOString() },
    });
    dispatch({ type: 'toast', text: next === 'resolved' ? `Issue #${issue.number} resolved` : `Issue #${issue.number} reopened` });
  }

  return (
    <div className="page">
      <a href="#/issues" className="back">
        <Icon name="back" size={16} /> Issues
      </a>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            Issue #{issue.number} · <a href={`#/projects/${project.id}`}>{project.name}</a>
          </p>
          <h1>{issue.title}</h1>
          <p className="muted">{issue.context}</p>
        </div>
        <div className="head-actions">
          <span className={`status status-${issue.status}`}>{issue.status === 'open' ? 'Open' : 'Resolved'}</span>
          <button className={`btn ${issue.status === 'open' ? 'primary' : ''}`} onClick={toggleStatus}>
            {issue.status === 'open' ? (
              <>
                <Icon name="check" /> Mark resolved
              </>
            ) : (
              'Reopen'
            )}
          </button>
        </div>
      </div>

      <div className="grid-issue">
        <Card title="Conversation">
          <div className="thread">
            {issue.thread.map((m) => {
              const p = person(m.author);
              return (
                <div key={m.id} className={`tm ${m.author === 'bot' ? 'tm-bot' : ''}`}>
                  {m.author === 'bot' ? <BrandMark size={32} /> : <Avatar name={p?.name ?? '?'} size={32} />}
                  <div className="tm-body">
                    <div className="tm-head">
                      <b>{m.author === 'bot' ? 'Automation' : p?.name}</b>
                      {p && <span>{p.role}</span>}
                      <span>
                        · {timeAgo(m.at)}, {fmtTime(m.at)}
                      </span>
                      {m.via && m.via !== 'app' && <ChannelBadge channel={m.via} />}
                    </div>
                    <p>{m.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form className="composer" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" aria-label="Reply" />
            <button className="btn primary" disabled={!text.trim()}>
              <Icon name="send" size={16} /> Send
            </button>
          </form>
        </Card>
        <Card title="Details">
          <dl className="details">
            <dt>Reported by</dt>
            <dd>
              <PersonLine person={by} />
            </dd>
            <dt>Reported via</dt>
            <dd>
              <ChannelBadge channel={issue.via} />
            </dd>
            <dt>Assigned to</dt>
            <dd>
              <PersonLine person={to} />
            </dd>
            <dt>Opened</dt>
            <dd>{timeAgo(issue.createdAt)}</dd>
            <dt>Schedule item</dt>
            <dd>{issue.context}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
