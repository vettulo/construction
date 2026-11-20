import { useState } from 'react';
import { useStore } from '../store';
import { projectSummary, forecastNote } from '../lib/schedule';
import { fmtMonthYear, timeAgo } from '../lib/dates';
import { Gantt } from '../components/Gantt';
import { PhoneSim } from '../components/PhoneSim';
import { ChannelBadge, Empty, PersonLine, StatusPill } from '../components/ui';
import { Icon } from '../components/Icon';

export function ProjectPage({ id }: { id: string }) {
  const { state } = useStore();
  const [sim, setSim] = useState(false);
  const project = state.projects.find((p) => p.id === id);
  if (!project) return <Empty>Project not found. <a href="#/projects">Back to projects</a></Empty>;

  const s = projectSummary(project);
  const foreman = state.people.find((p) => p.id === project.foremanId)!;
  const pm = state.people.find((p) => p.id === project.pmId)!;
  const issues = state.issues.filter((i) => i.projectId === project.id && i.status === 'open');
  const note = forecastNote(s, fmtMonthYear);
  const late = note.late;

  return (
    <div className={`page ${sim ? 'sim-open' : ''}`}>
      <a href="#/projects" className="back">
        <Icon name="back" size={16} /> Projects
      </a>
      <div className="page-head">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">
            {project.location} · {project.client}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn primary" onClick={() => setSim(true)}>
            <Icon name="message" /> Send check-in
          </button>
        </div>
      </div>

      {!sim && (
        <div className="tip">
          <Icon name="sparkle" size={16} />
          <span>
            <b>Try it:</b> send a check-in and reply as {foreman.name}. The schedule, alerts and issues update live.
          </span>
        </div>
      )}

      <div className="kpis kpis-5">
        <div className={`kpi ${s.planned - s.actual >= 2 ? 'kpi-accent' : ''}`}>
          <span>Progress</span>
          <b>{Math.round(s.actual)}%</b>
          <em>plan {Math.round(s.planned)}%</em>
        </div>
        <div className="kpi">
          <span>Current phase</span>
          <b className="kpi-text">{s.phase}</b>
        </div>
        <div className={`kpi ${late ? 'kpi-accent' : ''}`}>
          <span>Forecast completion</span>
          <b className="kpi-text">{fmtMonthYear(s.forecast)}</b>
          <em>{note.text}</em>
        </div>
        <div className="kpi">
          <span>Open issues</span>
          <b>{issues.length}</b>
        </div>
        <div className="kpi">
          <span>Status</span>
          <StatusPill health={s.health} />
        </div>
      </div>

      <div className="people-row">
        <div>
          <span className="label">Foreman</span>
          <PersonLine person={foreman} />
          <ChannelBadge channel={foreman.channel} />
          <span className="muted">· last update {timeAgo(project.lastCheckIn)}</span>
        </div>
        <div>
          <span className="label">Project manager</span>
          <PersonLine person={pm} />
        </div>
        {issues.length > 0 && (
          <div>
            <span className="label">Latest issue</span>
            <a href={`#/issues/${issues[0].id}`} className="link">
              #{issues[0].number} {issues[0].title}
            </a>
          </div>
        )}
      </div>

      <Gantt project={project} />

      {sim && <PhoneSim project={project} onClose={() => setSim(false)} />}
    </div>
  );
}
