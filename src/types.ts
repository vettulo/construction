export type Channel = 'sms' | 'whatsapp';

export type ItemStatus = 'todo' | 'doing' | 'done';

/** The smallest unit of the schedule: one month of work with a simple status. */
export interface Item {
  id: string;
  name: string;
  start: string; // first day of its month, YYYY-MM-DD
  end: string; // last day of its month, YYYY-MM-DD
  status: ItemStatus;
  startedAt?: string; // YYYY-MM-DD, when it went to "doing"
  doneAt?: string; // YYYY-MM-DD, when it was finished
}

export interface Task {
  id: string;
  name: string;
  items: Item[];
}

export interface Trade {
  id: string;
  code: string;
  name: string;
  tasks: Task[];
}

export interface Person {
  id: string;
  name: string;
  role: string;
  phone?: string;
  channel: Channel;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  client: string;
  foremanId: string;
  pmId: string;
  trades: Trade[];
  lastCheckIn: string; // ISO timestamp
}

export type AlertKind = 'delay' | 'no-reply' | 'end-risk' | 'issue' | 'milestone';

export interface AlertItem {
  id: string;
  projectId: string;
  kind: AlertKind;
  title: string;
  body: string;
  notified: string;
  createdAt: string; // ISO timestamp
  read: boolean;
}

export interface Message {
  id: string;
  author: string; // person id or 'bot'
  text: string;
  at: string; // ISO timestamp
  via?: Channel | 'app';
}

export interface Issue {
  id: string;
  number: number;
  projectId: string;
  title: string;
  context: string;
  reportedBy: string;
  assignedTo: string;
  status: 'open' | 'resolved';
  createdAt: string;
  via: Channel | 'app';
  thread: Message[];
}

export type RuleKind = 'delay' | 'no-reply' | 'end-risk' | 'issue';

export interface Rule {
  id: RuleKind;
  label: string;
  detail: string;
  enabled: boolean;
  threshold?: number;
  unit?: string;
}

export type Frequency = 'weekly' | 'twice' | 'daily';

export interface Settings {
  frequency: Frequency;
}

export interface Toast {
  id: string;
  text: string;
}

export interface State {
  version: number;
  user: string | null;
  people: Person[];
  projects: Project[];
  alerts: AlertItem[];
  issues: Issue[];
  rules: Rule[];
  settings: Settings;
  // transient (not persisted)
  flash: { itemId: string; at: number } | null;
  toasts: Toast[];
}
