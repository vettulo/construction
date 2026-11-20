import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { navigate } from '../lib/router';
import { projectSummary, HEALTH_LABEL } from '../lib/schedule';
import { Icon } from './Icon';

interface Hit {
  group: 'Projects' | 'Issues' | 'People';
  to: string;
  title: string;
  sub: string;
}

/** Top-bar search over projects, issues and people. Press "/" to focus. */
export function Search() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const all = useMemo<Hit[]>(() => {
    const projName = (id: string) => state.projects.find((p) => p.id === id)?.name ?? '';
    return [
      ...state.projects.map((p) => ({
        group: 'Projects' as const,
        to: `/projects/${p.id}`,
        title: p.name,
        sub: `${p.location} · ${HEALTH_LABEL[projectSummary(p).health]}`,
      })),
      ...state.issues.map((i) => ({
        group: 'Issues' as const,
        to: `/issues/${i.id}`,
        title: `#${i.number} ${i.title}`,
        sub: `${projName(i.projectId)} · ${i.status === 'open' ? 'Open' : 'Resolved'}`,
      })),
      ...state.people
        .filter((p) => p.role === 'Foreman')
        .map((p) => {
          const proj = state.projects.find((x) => x.foremanId === p.id);
          return { group: 'People' as const, to: proj ? `/projects/${proj.id}` : '/settings', title: p.name, sub: `Foreman · ${proj?.name ?? ''}` };
        }),
    ];
  }, [state.projects, state.issues, state.people]);

  const term = q.trim().toLowerCase();
  const hits = term ? all.filter((h) => `${h.title} ${h.sub}`.toLowerCase().includes(term)).slice(0, 8) : all.filter((h) => h.group === 'Projects');

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(t.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  const go = (h: Hit) => {
    navigate(h.to);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  let lastGroup = '';
  return (
    <div className="search" ref={wrapRef}>
      <label className="search-box">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          value={q}
          placeholder="Search…"
          title="Search projects, issues and foremen"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, hits.length - 1)));
            else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)));
            else if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
            else if (e.key === 'Escape') (setOpen(false), inputRef.current?.blur());
          }}
          aria-label="Search"
        />
        {!q && <kbd>/</kbd>}
      </label>
      {open && (
        <div className="popover search-pop" role="listbox">
          {hits.length === 0 && <div className="search-empty">No matches for “{q}”.</div>}
          {hits.map((h, i) => {
            const head = h.group !== lastGroup;
            lastGroup = h.group;
            return (
              <div key={`${h.group}-${h.to}-${h.title}`}>
                {head && <div className="search-group">{h.group}</div>}
                <button className={`search-hit ${i === sel ? 'on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => go(h)} role="option" aria-selected={i === sel}>
                  <b>{h.title}</b>
                  <span>{h.sub}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
