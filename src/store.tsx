import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import type { AlertItem, Channel, Frequency, Issue, Item, ItemStatus, Message, RuleKind, State } from './types';
import { iso, today } from './lib/dates';
import { DATA_VERSION, STORAGE_KEY } from './config';
import { seed } from './data/seed';

export type Action =
  | { type: 'login'; email: string }
  | { type: 'logout' }
  | { type: 'reset' }
  | { type: 'updateItem'; projectId: string; itemId: string; status: ItemStatus }
  | { type: 'addAlert'; alert: Omit<AlertItem, 'id' | 'createdAt' | 'read'> }
  | { type: 'markAlertsRead'; ids?: string[] }
  | { type: 'toggleRule'; id: RuleKind }
  | { type: 'setThreshold'; id: RuleKind; value: number }
  | { type: 'setFrequency'; value: Frequency }
  | { type: 'setChannel'; personId: string; channel: Channel }
  | { type: 'addIssue'; issue: Issue }
  | { type: 'addIssueMessage'; issueId: string; message: Message }
  | { type: 'setIssueStatus'; issueId: string; status: Issue['status'] }
  | { type: 'checkedIn'; projectId: string }
  | { type: 'toast'; text: string }
  | { type: 'dismissToast'; id: string };

function withStatus(it: Item, status: ItemStatus): Item {
  const now = iso(today());
  return {
    ...it,
    status,
    startedAt: status === 'todo' ? undefined : (it.startedAt ?? now),
    doneAt: status === 'done' ? (it.doneAt ?? now) : undefined,
  };
}

export const uid = (p = 'x') => `${p}-${Math.random().toString(36).slice(2, 9)}`;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'login':
      return { ...s, user: a.email };
    case 'logout':
      return { ...s, user: null };
    case 'reset':
      return { ...seed(s.user), toasts: [{ id: uid('t'), text: 'Demo data reset' }] };
    case 'updateItem':
      return {
        ...s,
        flash: { itemId: a.itemId, at: Date.now() },
        projects: s.projects.map((p) =>
          p.id !== a.projectId
            ? p
            : {
                ...p,
                trades: p.trades.map((tr) => ({
                  ...tr,
                  tasks: tr.tasks.map((tk) => ({
                    ...tk,
                    items: tk.items.map((it) => (it.id === a.itemId ? withStatus(it, a.status) : it)),
                  })),
                })),
              },
        ),
      };
    case 'addAlert':
      return {
        ...s,
        alerts: [{ ...a.alert, id: uid('al'), createdAt: new Date().toISOString(), read: false }, ...s.alerts],
      };
    case 'markAlertsRead':
      return { ...s, alerts: s.alerts.map((al) => (!a.ids || a.ids.includes(al.id) ? { ...al, read: true } : al)) };
    case 'toggleRule':
      return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, enabled: !r.enabled } : r)) };
    case 'setThreshold':
      return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, threshold: a.value } : r)) };
    case 'setFrequency':
      return { ...s, settings: { ...s.settings, frequency: a.value } };
    case 'setChannel':
      return { ...s, people: s.people.map((p) => (p.id === a.personId ? { ...p, channel: a.channel } : p)) };
    case 'addIssue':
      return { ...s, issues: [a.issue, ...s.issues] };
    case 'addIssueMessage':
      return {
        ...s,
        issues: s.issues.map((i) => (i.id === a.issueId ? { ...i, thread: [...i.thread, a.message] } : i)),
      };
    case 'setIssueStatus':
      return { ...s, issues: s.issues.map((i) => (i.id === a.issueId ? { ...i, status: a.status } : i)) };
    case 'checkedIn':
      return {
        ...s,
        projects: s.projects.map((p) => (p.id === a.projectId ? { ...p, lastCheckIn: new Date().toISOString() } : p)),
      };
    case 'toast':
      return { ...s, toasts: [...s.toasts, { id: uid('t'), text: a.text }] };
    case 'dismissToast':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
  }
}

function load(): State {
  try {
    // Drop data saved by earlier versions of the demo (e.g. the old %-based line items).
    for (const old of ['ct-demo-v1', 'ct-demo-v2']) localStorage.removeItem(old);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as State;
      // Keep the sign-in, but reseed anything saved by another data version.
      if (saved.version !== DATA_VERSION) return seed(saved.user ?? null);
      return { ...saved, flash: null, toasts: [] };
    }
  } catch {
    /* storage blocked or corrupt: fall back to seed */
  }
  return seed();
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { flash, toasts, ...persisted } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* ignore */
    }
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}

export function usePerson(id: string) {
  const { state } = useStore();
  return state.people.find((p) => p.id === id)!;
}
