export const DAY = 86_400_000;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function today(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date string `n` days from today. */
export function off(n: number): string {
  return iso(addDays(today(), n));
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

export function fmtShort(s: string): string {
  const d = parse(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTime(isoTs: string): string {
  return new Date(isoTs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function fmtLongDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export function timeAgo(isoTs: string): string {
  const m = Math.round((Date.now() - new Date(isoTs).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** First and last day of the month `n` months from the current one. */
export function monthBounds(n: number): { start: string; end: string } {
  const t = today();
  return { start: iso(new Date(t.getFullYear(), t.getMonth() + n, 1)), end: iso(new Date(t.getFullYear(), t.getMonth() + n + 1, 0)) };
}

export function fmtMonth(s: string): string {
  const d = parse(s);
  return MONTHS[d.getMonth()];
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
