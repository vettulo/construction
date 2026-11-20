import type { Project } from '../types';
import { useStore } from '../store';
import { forecastNote, projectSummary } from '../lib/schedule';
import { fmtMonthYear, timeAgo } from '../lib/dates';
import { navigate } from '../lib/router';
import { PersonLine, ProgressPlan, StatusPill } from './ui';
import { Icon } from './Icon';

export function ProjectTable({ projects }: { projects: Project[] }) {
  const { state } = useStore();
  return (
    <div className="ptable" role="table" aria-label="Projects">
      <div className="ptable-row ptable-head" role="row">
        <span role="columnheader">Project</span>
        <span role="columnheader">Foreman</span>
        <span role="columnheader">Progress</span>
        <span role="columnheader">Forecast end</span>
        <span role="columnheader">Status</span>
        <span />
      </div>
      {projects.map((p) => {
        const s = projectSummary(p);
        const foreman = state.people.find((x) => x.id === p.foremanId)!;
        const open = state.issues.filter((i) => i.projectId === p.id && i.status === 'open').length;
        return (
          <a key={p.id} href={`#/projects/${p.id}`} className="ptable-row" role="row" onClick={(e) => (e.preventDefault(), navigate(`/projects/${p.id}`))}>
            <span className="pt-name" role="cell">
              <b>{p.name}</b>
              <span>
                {p.location} · {s.phase}
                {open > 0 && <> · {open} open {open === 1 ? 'issue' : 'issues'}</>}
              </span>
            </span>
            <span role="cell" className="pt-foreman">
              <PersonLine person={foreman} showChannel />
              <span className="pt-sub">Last update {timeAgo(p.lastCheckIn)}</span>
            </span>
            <span role="cell">
              <ProgressPlan actual={s.actual} planned={s.planned} compact />
            </span>
            <span role="cell" className="pt-forecast">
              <b>{fmtMonthYear(s.forecast)}</b>
              <span>{forecastNote(s, fmtMonthYear).text}</span>
            </span>
            <span role="cell">
              <StatusPill health={s.health} />
            </span>
            <span className="pt-go" aria-hidden="true">
              <Icon name="chevron" />
            </span>
          </a>
        );
      })}
    </div>
  );
}
