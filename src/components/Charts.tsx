import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Project } from '../types';
import { DAY, MONTHS, addDays, fmtShort, iso, parse, today } from '../lib/dates';
import { forecastNote, plannedPct, projectItems, projectSummary, statsOf } from '../lib/schedule';
import { fmtMonthYear } from '../lib/dates';
import { navigate } from '../lib/router';

/* ---------- shared bits ---------- */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Tip {
  x: number;
  y: number;
  body: ReactNode;
}

function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 70), width - 70);
  return (
    <div className="ch-tip" style={{ left, top: tip.y }}>
      {tip.body}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v)}%`;

/* ---------- 1. Portfolio progress vs plan ---------- */

/** % done across every line item, sampled at month starts. Done counts 100, in progress 50, using the
 *  dates each item was actually started and finished. */
function progressSeries(projects: Project[]) {
  const items = projects.flatMap(projectItems);
  const t = today();
  let mn = items[0].start;
  let mx = items[0].end;
  for (const i of items) {
    if (i.start < mn) mn = i.start;
    if (i.end > mx) mx = i.end;
  }
  const first = parse(mn);
  const last = parse(mx);
  const at = (when: Date) => {
    const w = iso(when);
    let p = 0;
    let a = 0;
    for (const i of items) {
      p += plannedPct(i.start, i.end, when);
      a += i.doneAt && i.doneAt <= w ? 100 : i.startedAt && i.startedAt <= w ? 50 : 0;
    }
    return { plan: p / items.length, actual: a / items.length };
  };
  const pts: { d: Date; plan: number; actual: number | null }[] = [];
  let d = new Date(first.getFullYear(), first.getMonth(), 1);
  while (d <= last) {
    const v = at(d);
    pts.push({ d, plan: v.plan, actual: d <= t ? v.actual : null });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  const now = at(t);
  return { pts, now, t };
}

export function ProgressChart({ projects }: { projects: Project[] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { pts, now, t } = progressSeries(projects);
  const H = 220;
  const m = { l: 36, r: 16, t: 12, b: 26 };
  const iw = Math.max(0, W - m.l - m.r);
  const ih = H - m.t - m.b;
  const t0 = pts[0].d.getTime();
  const t1 = pts[pts.length - 1].d.getTime();
  const x = (d: Date) => m.l + ((d.getTime() - t0) / (t1 - t0)) * iw;
  const y = (v: number) => m.t + ih - (v / 100) * ih;

  const planPath = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.plan).toFixed(1)}`).join('');
  const past = pts.filter((p) => p.actual !== null);
  const actualPath =
    past.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.actual!).toFixed(1)}`).join('') + `L${x(t).toFixed(1)},${y(now.actual).toFixed(1)}`;

  const step = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(iw / 70))));
  const h = hover !== null ? pts[hover] : null;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - r.left + m.l;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(p.d) - px) < Math.abs(x(pts[best].d) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="chart" ref={ref}>
      <div className="ch-legend">
        <span>
          <i className="lk lk-accent" /> Actual
        </span>
        <span>
          <i className="lk lk-dash" /> Plan
        </span>
        <span className="ch-now">
          Today: <b>{pct(now.actual)}</b> done vs <b>{pct(now.plan)}</b> planned
        </span>
      </div>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Portfolio progress: ${pct(now.actual)} done, ${pct(now.plan)} planned by today`}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="ch-grid" />
              <text x={m.l - 8} y={y(v)} className="ch-ax" textAnchor="end" dominantBaseline="middle">
                {v}%
              </text>
            </g>
          ))}
          {pts.map((p, i) =>
            i % step === 0 ? (
              <text key={iso(p.d)} x={x(p.d)} y={H - 6} className="ch-ax" textAnchor="middle">
                {MONTHS[p.d.getMonth()]} ’{String(p.d.getFullYear()).slice(2)}
              </text>
            ) : null,
          )}
          <line x1={x(t)} x2={x(t)} y1={m.t} y2={m.t + ih} className="ch-today" />
          <path d={planPath} className="ch-plan" />
          <path d={actualPath} className="ch-actual" />
          <circle cx={x(t)} cy={y(now.actual)} r={5} className="ch-dot" />
          {h && (
            <g>
              <line x1={x(h.d)} x2={x(h.d)} y1={m.t} y2={m.t + ih} className="ch-cross" />
              <circle cx={x(h.d)} cy={y(h.plan)} r={4} className="ch-dot-plan" />
              {h.actual !== null && <circle cx={x(h.d)} cy={y(h.actual)} r={4} className="ch-dot" />}
            </g>
          )}
          <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      <Tooltip
        width={W}
        tip={
          h && {
            x: x(h.d),
            y: Math.min(y(h.actual ?? h.plan), y(h.plan)) - 10,
            body: (
              <>
                <b>
                  {MONTHS[h.d.getMonth()]} {h.d.getFullYear()}
                </b>
                {h.actual !== null && (
                  <span>
                    <i className="lk lk-accent" /> Actual {pct(h.actual)}
                  </span>
                )}
                <span>
                  <i className="lk lk-dash" /> Plan {pct(h.plan)}
                </span>
              </>
            ),
          }
        }
      />
    </div>
  );
}

/* ---------- 2. Check-in reply rate ---------- */

// Replies from earlier weeks (out of 4 foremen). The current week is computed from live data.
const PAST_REPLIES = [4, 3, 4, 4, 3, 4, 4];

export function ReplyChart({ projects }: { projects: Project[] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const t = today();
  const monday = addDays(t, -((t.getDay() + 6) % 7));
  const total = projects.length;
  const thisWeek = projects.filter((p) => new Date(p.lastCheckIn).getTime() >= monday.getTime()).length;
  const data = [...PAST_REPLIES.slice(-(8 - 1)), thisWeek].map((n, i, arr) => ({
    week: addDays(monday, -7 * (arr.length - 1 - i)),
    n,
    rate: (n / total) * 100,
  }));
  const avg = data.slice(0, -1).reduce((s, d) => s + d.rate, 0) / (data.length - 1);
  const H = 180;
  const m = { l: 4, r: 4, t: 22, b: 24 };
  const iw = Math.max(0, W - m.l - m.r);
  const ih = H - m.t - m.b;
  const slot = iw / data.length;
  const bw = Math.min(28, slot - 6);
  const y = (v: number) => m.t + ih - (v / 100) * ih;
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <div className="ch-legend">
        <span className="ch-now">
          This week: <b>{thisWeek} of {total}</b> replied · 7-week avg <b>{pct(avg)}</b>
        </span>
      </div>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Check-in replies per week. This week ${thisWeek} of ${total}.`}>
          <line x1={m.l} x2={W - m.r} y1={y(100)} y2={y(100)} className="ch-grid" />
          <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} className="ch-base" />
          {data.map((d, i) => {
            const cx = m.l + slot * i + slot / 2;
            const last = i === data.length - 1;
            const top = y(Math.max(d.rate, 2));
            return (
              <g key={iso(d.week)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={cx - slot / 2} y={m.t} width={slot} height={ih} fill="transparent" />
                <path d={roundTop(cx - bw / 2, top, bw, y(0) - top, 4)} className={last ? 'ch-bar-accent' : 'ch-bar'} opacity={hover !== null && hover !== i ? 0.45 : 1} />
                {last && (
                  <text x={cx} y={top - 6} className="ch-val" textAnchor="middle">
                    {pct(d.rate)}
                  </text>
                )}
                {(i % 2 === 1 || last) && (
                  <text x={cx} y={H - 6} className="ch-ax" textAnchor="middle">
                    {last ? 'This wk' : fmtShort(iso(d.week))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip
        width={W}
        tip={
          h && {
            x: m.l + slot * hover! + slot / 2,
            y: y(h.rate) - 10,
            body: (
              <>
                <b>Week of {fmtShort(iso(h.week))}</b>
                <span>
                  {h.n} of {total} foremen replied ({pct(h.rate)})
                </span>
              </>
            ),
          }
        }
      />
    </div>
  );
}

function roundTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
function roundRight(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

/* ---------- 3 & 4. Horizontal bar lists ---------- */

interface HRow {
  key: string;
  label: string;
  value: number;
  valueText: string;
  tip: ReactNode;
  accent?: boolean;
  to?: string;
}

function HBars({ rows, empty, ariaLabel }: { rows: HRow[]; empty: string; ariaLabel: string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  // Narrow cards stack each label above its bar so long names never clip.
  const stacked = W < 440;
  const LW = stacked ? 0 : Math.min(150, W * 0.38);
  const VW = 74;
  const rowH = stacked ? 46 : 34;
  const bw = Math.max(0, W - LW - VW);
  const H = rows.length * rowH;
  if (!rows.length) return <p className="ch-empty">{empty}</p>;
  const h = hover !== null ? rows[hover] : null;
  return (
    <div className="chart" ref={ref}>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label={ariaLabel}>
          {!stacked && <line x1={LW} x2={LW} y1={0} y2={H} className="ch-base" />}
          {rows.map((r, i) => {
            const cy = stacked ? i * rowH + 32 : i * rowH + rowH / 2;
            const len = r.value > 0 ? Math.max(4, (r.value / max) * (bw - 8)) : 0;
            return (
              <g
                key={r.key}
                className={r.to ? 'ch-link' : undefined}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => r.to && navigate(r.to)}
              >
                <rect x={0} y={i * rowH} width={W} height={rowH} fill="transparent" />
                <text x={stacked ? 0 : LW - 10} y={stacked ? i * rowH + 12 : cy} className="ch-label" textAnchor={stacked ? 'start' : 'end'} dominantBaseline="middle">
                  {r.label}
                </text>
                {len > 0 ? (
                  <path d={roundRight(LW, cy - 7, len, 14, 4)} className={r.accent ? 'ch-bar-accent' : 'ch-bar'} opacity={hover !== null && hover !== i ? 0.45 : 1} />
                ) : (
                  <circle cx={LW + 4} cy={cy} r={3} className="ch-zero" />
                )}
                <text x={LW + Math.max(len, 8) + 8} y={cy} className="ch-val" dominantBaseline="middle">
                  {r.valueText}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip width={W} tip={h && { x: LW + bw / 2, y: hover! * rowH + 2, body: h.tip }} />
    </div>
  );
}

export function SlipChart({ projects }: { projects: Project[] }) {
  const rows: HRow[] = projects
    .map((p) => {
      const s = projectSummary(p);
      const slip = Math.max(0, Math.round((s.forecast.getTime() - s.plannedEnd.getTime()) / DAY));
      const note = forecastNote(s, fmtMonthYear);
      return {
        key: p.id,
        label: p.name,
        value: slip,
        valueText: slip > 0 ? `${slip} days` : 'On plan',
        accent: slip > 0,
        to: `/projects/${p.id}`,
        tip: (
          <>
            <b>{p.name}</b>
            <span>
              Forecast {fmtMonthYear(s.forecast)} · {note.text}
            </span>
            <span className="ch-tip-hint">Click to open</span>
          </>
        ),
      };
    })
    .sort((a, b) => b.value - a.value);
  return <HBars rows={rows} empty="No projects." ariaLabel="Days each project's forecast finish is behind plan" />;
}

export function DelayChart({ projects }: { projects: Project[] }) {
  const t = today();
  const byTrade = new Map<string, { n: number; days: number; projects: Set<string> }>();
  for (const p of projects)
    for (const tr of p.trades)
      for (const tk of tr.tasks)
        for (const it of tk.items) {
          const st = statsOf([it], t);
          if (st.status !== 'delayed') continue;
          const e = byTrade.get(tr.name) ?? { n: 0, days: 0, projects: new Set<string>() };
          e.n += 1;
          e.days = Math.max(e.days, st.delayDays);
          e.projects.add(p.name);
          byTrade.set(tr.name, e);
        }
  const rows: HRow[] = [...byTrade.entries()]
    .sort((a, b) => b[1].n - a[1].n || b[1].days - a[1].days)
    .slice(0, 6)
    .map(([name, e]) => ({
      key: name,
      label: name,
      value: e.n,
      valueText: `${e.n} ${e.n === 1 ? 'item' : 'items'}`,
      tip: (
        <>
          <b>{name}</b>
          <span>
            {e.n} line {e.n === 1 ? 'item' : 'items'} behind plan, worst {e.days} days
          </span>
          <span>{[...e.projects].join(', ')}</span>
        </>
      ),
    }));
  return <HBars rows={rows} empty="Nothing is behind plan." ariaLabel="Line items behind plan, by trade" />;
}
