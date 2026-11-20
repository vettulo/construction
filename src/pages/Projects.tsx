import { useState } from 'react';
import { useStore } from '../store';
import { projectSummary, type Health } from '../lib/schedule';
import { ProjectTable } from '../components/ProjectTable';
import { Card, Empty } from '../components/ui';

type Filter = 'all' | Health;

export function Projects() {
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const list = state.projects.filter((p) => filter === 'all' || projectSummary(p).health === filter);
  const tabs: [Filter, string][] = [
    ['all', 'All'],
    ['on-track', 'On track'],
    ['at-risk', 'At risk'],
    ['delayed', 'Delayed'],
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="muted">{state.projects.length} active projects</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <Card>{list.length ? <ProjectTable projects={list} /> : <Empty>No projects match this filter.</Empty>}</Card>
    </div>
  );
}
