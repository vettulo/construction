import type { Item, Project, Task, Trade } from '../types';
import { DAY, addDays, parse, today } from './dates';

export type Status = 'done' | 'active' | 'delayed' | 'pending';
export type Health = 'on-track' | 'at-risk' | 'delayed';

export interface Stats {
  start: string;
  end: string;
  actual: number;
  planned: number;
  status: Status;
  delayDays: number;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** % of the item's month that has elapsed (what the plan expects by today). */
export function plannedPct(start: string, end: string, t: Date = today()): number {
  const s = parse(start).getTime();
  const e = parse(end).getTime() + DAY;
  return clamp(((t.getTime() - s) / (e - s)) * 100);
}

/** How much an item counts toward progress: done = 100, in progress = 50, not started = 0. */
export const itemPct = (i: Item) => (i.status === 'done' ? 100 : i.status === 'doing' ? 50 : 0);

/** Days an item is past its month without being finished (0 if it's done or its month isn't over). */
export function itemDelay(i: Item, t: Date = today()): number {
  if (i.status === 'done') return 0;
  return Math.max(0, Math.round((t.getTime() - parse(i.end).getTime()) / DAY));
}

export function itemStatus(i: Item, t: Date = today()): Status {
  if (i.status === 'done') return 'done';
  if (itemDelay(i, t) > 0) return 'delayed';
  return i.status === 'doing' ? 'active' : 'pending';
}

export const ITEM_STATUS_LABEL: Record<Status, string> = { done: 'Done', active: 'In progress', delayed: 'Late', pending: 'Not started' };

/** Progress for a group of line items. Every item is one month, so they weigh the same. */
export function statsOf(items: Item[], t: Date = today()): Stats {
  let a = 0;
  let p = 0;
  let maxDelay = 0;
  let start = items[0].start;
  let end = items[0].end;
  const sts: Status[] = [];
  for (const i of items) {
    a += itemPct(i);
    p += plannedPct(i.start, i.end, t);
    if (i.start < start) start = i.start;
    if (i.end > end) end = i.end;
    maxDelay = Math.max(maxDelay, itemDelay(i, t));
    sts.push(itemStatus(i, t));
  }
  const status: Status = sts.every((x) => x === 'done')
    ? 'done'
    : sts.includes('delayed')
      ? 'delayed'
      : sts.some((x) => x === 'active' || x === 'done')
        ? 'active'
        : 'pending';
  return { start, end, actual: a / items.length, planned: p / items.length, status, delayDays: maxDelay };
}

export const tradeItems = (tr: Trade) => tr.tasks.flatMap((t) => t.items);
export const projectItems = (p: Project) => p.trades.flatMap(tradeItems);

export interface ProjectSummary extends Stats {
  health: Health;
  forecast: Date;
  plannedEnd: Date;
  phase: string;
}

export function projectSummary(p: Project): ProjectSummary {
  const s = statsOf(projectItems(p));
  const gap = s.planned - s.actual;
  const health: Health = gap >= 6 ? 'delayed' : gap >= 2 || s.delayDays >= 5 ? 'at-risk' : 'on-track';
  const plannedEnd = parse(s.end);
  const spanDays = Math.round((plannedEnd.getTime() - parse(s.start).getTime()) / DAY);
  const slip = Math.max(s.delayDays, Math.round((gap / 100) * spanDays));
  const forecast = addDays(plannedEnd, health === 'on-track' ? 0 : slip);
  const phaseTrade = p.trades.find((tr) => {
    const st = statsOf(tradeItems(tr)).status;
    return st === 'active' || st === 'delayed';
  });
  return { ...s, health, forecast, plannedEnd, phase: phaseTrade?.name ?? '—' };
}

/** How the forecast compares with the plan, in words: "on plan", "12 days late" or "plan Jul 2028". */
export function forecastNote(s: ProjectSummary, fmtMonth: (d: Date) => string): { late: boolean; text: string } {
  const slip = Math.round((s.forecast.getTime() - s.plannedEnd.getTime()) / DAY);
  if (slip <= 0) return { late: false, text: 'on plan' };
  if (fmtMonth(s.forecast) === fmtMonth(s.plannedEnd)) return { late: true, text: `${slip} ${slip === 1 ? 'day' : 'days'} late` };
  return { late: true, text: `plan ${fmtMonth(s.plannedEnd)}` };
}

export const HEALTH_LABEL: Record<Health, string> = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  delayed: 'Delayed',
};

export interface Focus {
  trade: Trade;
  task: Task;
  item: Item;
}

/** What the next check-in asks about: the late item furthest behind, else this month's open work, else the next item. */
export function focusItem(p: Project, t: Date = today()): Focus | null {
  let best: (Focus & { score: number }) | null = null;
  for (const trade of p.trades)
    for (const task of trade.tasks)
      for (const item of task.items) {
        if (item.status === 'done') continue;
        const delay = itemDelay(item, t);
        const current = plannedPct(item.start, item.end, t) > 0;
        // late items first (by delay), then items already due, then the earliest upcoming one
        const score = delay > 0 ? 1e6 + delay : current ? 1e3 - parse(item.start).getTime() / DAY / 1e6 : -parse(item.start).getTime() / DAY;
        if (!best || score > best.score) best = { trade, task, item, score };
      }
  return best && { trade: best.trade, task: best.task, item: best.item };
}

export function findItem(p: Project, itemId: string): Focus | null {
  for (const trade of p.trades)
    for (const task of trade.tasks)
      for (const item of task.items) if (item.id === itemId) return { trade, task, item };
  return null;
}
