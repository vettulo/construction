import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Project } from '../types';
import { useStore } from '../store';
import { DAY, MONTHS, fmtShort, iso, parse, today } from '../lib/dates';
import { ITEM_STATUS_LABEL, focusItem, findItem, projectItems, statsOf, tradeItems, type Stats } from '../lib/schedule';
import { useMedia } from '../lib/router';

interface RowSpec {
  id: string;
  level: 0 | 1 | 2;
  code?: string;
  name: string;
  meta?: string;
  stats: Stats;
  points: { id: string; end: string; stats: Stats }[];
  open?: boolean;
  itemIds: string[];
  itemNames?: string[];
}

export function Gantt({ project }: { project: Project }) {
  const { state } = useStore();
  const narrow = useMedia('(max-width: 760px)');
  const px = narrow ? 0.9 : 1.2;
  const LW = narrow ? 210 : 340;
  const t = today();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { rangeStart, totalDays } = useMemo(() => {
    const items = projectItems(project);
    let mn = items[0].start;
    let mx = items[0].end;
    for (const i of items) {
      if (i.start < mn) mn = i.start;
      if (i.end > mx) mx = i.end;
    }
    const s = parse(mn);
    const e = parse(mx);
    const rs = new Date(s.getFullYear(), s.getMonth(), 1);
    const re = new Date(e.getFullYear(), e.getMonth() + 1, 0);
    return { rangeStart: rs, totalDays: Math.round((re.getTime() - rs.getTime()) / DAY) + 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const W = totalDays * px;
  const xOf = (s: string) => Math.round((parse(s).getTime() - rangeStart.getTime()) / DAY) * px;

  const months = useMemo(() => {
    const out: { key: string; label: string; year?: number; left: number; width: number }[] = [];
    let d = new Date(rangeStart);
    let first = true;
    while (out.length < 200) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const left = Math.round((d.getTime() - rangeStart.getTime()) / DAY) * px;
      if (left >= W) break;
      const width = Math.round((next.getTime() - d.getTime()) / DAY) * px;
      out.push({ key: iso(d), label: MONTHS[d.getMonth()], year: first || d.getMonth() === 0 ? d.getFullYear() : undefined, left, width });
      first = false;
      d = next;
    }
    return out;
  }, [rangeStart, px, W]);

  const [open, setOpen] = useState<Set<string>>(() => {
    const f = focusItem(project);
    return new Set(f ? [f.trade.id, f.task.id] : []);
  });
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  // When a check-in updates an item: expand its branch and highlight it.
  useEffect(() => {
    const f = state.flash;
    if (!f || Date.now() - f.at > 5000) return;
    const hit = findItem(project, f.itemId);
    if (!hit) return;
    setOpen((o) => new Set([...o, hit.trade.id, hit.task.id]));
    setFlashId(f.itemId);
    const tm = window.setTimeout(() => setFlashId(null), 2600);
    return () => window.clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.flash?.at]);

  const todayX = xOf(iso(t)) + px / 2;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - (narrow ? 60 : 220));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, narrow]);

  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const expandAll = () => {
    setDelayedOnly(false);
    setOpen(new Set(project.trades.flatMap((tr) => [tr.id, ...tr.tasks.map((tk) => tk.id)])));
  };

  const rows: RowSpec[] = [];
  for (const tr of project.trades) {
    const items = tradeItems(tr);
    const ts = statsOf(items);
    if (delayedOnly && ts.status !== 'delayed') continue;
    const trOpen = delayedOnly || open.has(tr.id);
    rows.push({
      id: tr.id,
      level: 0,
      code: tr.code,
      name: tr.name,
      meta: `${tr.tasks.length} tasks · ${items.length} line items`,
      stats: ts,
      points: items.map((i) => ({ id: i.id, end: i.end, stats: statsOf([i]) })),
      open: trOpen,
      itemIds: items.map((i) => i.id),
    });
    if (!trOpen) continue;
    for (const tk of tr.tasks) {
      const ks = statsOf(tk.items);
      if (delayedOnly && ks.status !== 'delayed') continue;
      const tkOpen = delayedOnly || open.has(tk.id);
      rows.push({
        id: tk.id,
        level: 1,
        name: tk.name,
        meta: `${tk.items.length} items`,
        stats: ks,
        points: tk.items.map((i) => ({ id: i.id, end: i.end, stats: statsOf([i]) })),
        itemNames: tk.items.map((i) => i.name),
        open: tkOpen,
        itemIds: tk.items.map((i) => i.id),
      });
      if (!tkOpen) continue;
      for (const it of tk.items) {
        const is = statsOf([it]);
        if (delayedOnly && is.status !== 'delayed') continue;
        rows.push({ id: it.id, level: 2, name: it.name, stats: is, points: [{ id: it.id, end: it.end, stats: is }], itemIds: [it.id] });
      }
    }
  }

  const statusWord = { done: 'Finished', active: 'In progress', delayed: 'Delayed', pending: 'Not started' };

  // A line item is a month: its dot sits in the middle of that month.
  const dotX = (start: string, end: string) => (xOf(start) + xOf(end) + px) / 2;
  // Dots in a task never overlap: each one sits at least a dot apart from the previous one,
  // and the line-item rows below reuse the same positions so they line up.
  const dotPos = new Map<string, number>();
  for (const tr of project.trades)
    for (const tk of tr.tasks) {
      let prev = -Infinity;
      for (const it of [...tk.items].sort((a, b) => (a.end < b.end ? -1 : 1))) {
        prev = Math.max(dotX(it.start, it.end), prev + 18);
        dotPos.set(it.id, prev);
      }
    }
  const tip = (name: string, st: Stats, single = false) =>
    single
      ? `${name}: ${MONTHS[parse(st.start).getMonth()]} ${parse(st.start).getFullYear()} · ${ITEM_STATUS_LABEL[st.status]}${st.delayDays > 0 ? ` · ${st.delayDays} days past its month` : ''}`
      : `${name}: ${fmtShort(st.start)} – ${fmtShort(st.end)} · ${Math.round(st.actual)}% done (plan ${Math.round(st.planned)}%) · ${statusWord[st.status]}`;

  /** Trade row: a pill split into equal month cells, each coloured by the items running that month. */
  const monthCells = (r: RowSpec) => {
    const s0 = parse(r.stats.start);
    const e0 = parse(r.stats.end);
    const cells: { key: string; left: number; width: number; status: Stats['status'] }[] = [];
    let d = new Date(s0.getFullYear(), s0.getMonth(), 1);
    while (d <= e0) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const ms = iso(d);
      const me = iso(new Date(next.getTime() - DAY));
      const inMonth = r.points.filter((p) => p.stats.start <= me && p.stats.end >= ms).map((p) => p.stats.status);
      const status: Stats['status'] = !inMonth.length
        ? 'pending'
        : inMonth.every((x) => x === 'done')
          ? 'done'
          : inMonth.includes('delayed')
            ? 'delayed'
            : inMonth.some((x) => x === 'active' || x === 'done')
              ? 'active'
              : 'pending';
      cells.push({ key: ms, left: xOf(ms), width: xOf(iso(next)) - xOf(ms), status });
      d = next;
    }
    return cells;
  };

  const renderTrack = (r: RowSpec): ReactNode => {
    if (r.level === 0) {
      const cells = monthCells(r);
      const left = cells[0].left;
      const width = cells[cells.length - 1].left + cells[cells.length - 1].width - left;
      return (
        <div className="mbar" style={{ left, width }} title={tip(r.name, r.stats)}>
          {cells.map((c) => (
            <span key={c.key} className={`mcell s-${c.status}`} />
          ))}
        </div>
      );
    }
    const xs = r.points.map((p) => dotPos.get(p.id) ?? dotX(p.stats.start, p.stats.end));
    const first = Math.min(...xs);
    const last = Math.max(...xs);
    const late = r.stats.status === 'delayed';
    return (
      <>
        {r.level === 2 ? (
          <span className="g-line" style={{ left: xOf(r.stats.start), width: Math.max(0, last - xOf(r.stats.start)) }} />
        ) : (
          xs.length > 1 && <span className="g-chain" style={{ left: first, width: last - first }} />
        )}
        {r.points.map((p, i) => (
          <span key={p.id} className={`g-dot d-${p.stats.status}`} style={{ left: xs[i], ['--p' as string]: `${Math.round(p.stats.actual)}%` }} title={tip(r.level === 2 ? r.name : `${r.name} · ${r.itemNames?.[i] ?? `item ${i + 1}`}`, p.stats, true)} />
        ))}
        {r.level === 2 && late && r.stats.delayDays > 0 && (
          <span className="g-delay" style={{ left: last + 14 }}>
            −{r.stats.delayDays}d
          </span>
        )}
      </>
    );
  };

  const renderRow = (r: RowSpec): ReactNode => {
    const flash = flashId !== null && r.itemIds.includes(flashId);
    const late = r.stats.status === 'delayed';
    return (
      <div key={r.id} className={`g-row lvl-${r.level} ${flash ? 'flash' : ''}`}>
        <div className="g-label" style={{ width: LW }}>
          {r.level < 2 ? (
            <button className="caret" onClick={() => toggle(r.id)} aria-expanded={r.open} aria-label={`${r.open ? 'Collapse' : 'Expand'} ${r.name}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M3 1.5 7 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span className="it-dot" />
          )}
          {r.level === 0 && <span className="badge">{r.code}</span>}
          <span className="g-names">
            <span className="g-name">{r.name}</span>
            {r.meta && r.level === 0 && <span className="g-meta">{r.meta}</span>}
          </span>
          {r.meta && r.level === 1 && <span className="g-meta inline">{r.meta}</span>}
          <span className={`g-pct ${late ? 'late' : ''}`}>{r.level === 2 ? ITEM_STATUS_LABEL[r.stats.status] : `${Math.round(r.stats.actual)}%`}</span>
        </div>
        <div className="g-track" style={{ width: W }}>{renderTrack(r)}</div>
      </div>
    );
  };

  return (
    <section className="gantt-card" aria-label="Project schedule">
      <div className="gantt-toolbar">
        <div className="legend">
          <span>
            <i className="lg lg-done" /> Finished
          </span>
          <span>
            <i className="lg lg-active" /> In progress
          </span>
          <span>
            <i className="lg lg-pending" /> Not started
          </span>
          <span>
            <i className="lg lg-delayed" /> Delayed
          </span>
        </div>
        <div className="g-actions">
          <button className="btn sm" onClick={expandAll}>
            Expand all
          </button>
          <button
            className="btn sm"
            onClick={() => {
              setDelayedOnly(false);
              setOpen(new Set());
            }}
          >
            Collapse
          </button>
          <button className={`btn sm ${delayedOnly ? 'toggled' : ''}`} aria-pressed={delayedOnly} onClick={() => setDelayedOnly((v) => !v)}>
            Delayed only
          </button>
        </div>
      </div>
      <div className="gantt-scroll" ref={scrollRef}>
        <div className="gantt-inner" style={{ width: LW + W }}>
          <div className="g-head">
            <div className="g-label g-cap" style={{ width: LW }}>
              Trade · Task · Line item
            </div>
            <div className="g-months" style={{ width: W }}>
              {months.map((m) => (
                <div key={m.key} className="g-month" style={{ left: m.left, width: m.width }}>
                  {m.year && <b>{m.year}</b>}
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
          {rows.map(renderRow)}
          {rows.length === 0 && <div className="g-empty">Nothing is delayed. Nice.</div>}
          <div className="g-today" style={{ left: LW + todayX }}>
            <span>Today · {MONTHS[t.getMonth()]}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
