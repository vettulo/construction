import type { AlertItem, Issue, Item, ItemStatus, Person, Project, Rule, State, Trade } from '../types';
import { CURRENT_USER_ID, DATA_VERSION } from '../config';
import { hoursAgo, iso, monthBounds, today } from '../lib/dates';

// All dates are relative to "today" so the demo always looks current.
// Every line item is one month of work: not started, in progress or done.

let seq = 0;
const uid = (p: string) => `${p}-${++seq}`;

type TaskSpec = [name: string, items: string[]];
type TradeSpec = [code: string, name: string, from: number, to: number, tasks: TaskSpec[]];

const L = (n: number) => Array.from({ length: n }, (_, i) => `Level ${i + 1}`);

const TEMPLATE: TradeSpec[] = [
  ['01', 'Sitework', 0, 0.12, [['Clearing & grading', ['North lot', 'South lot']], ['Excavation', ['Footprint', 'Utilities trench', 'Backfill']]]],
  ['02', 'Concrete', 0.08, 0.36, [['Foundations', ['Footings', 'Grade beams', 'Slab on grade']], ['Columns', L(3)], ['Slabs', L(3)], ['Beams', L(3)]]],
  ['03', 'Masonry', 0.28, 0.5, [['Exterior walls', L(4)], ['Interior partitions', L(4)]]],
  ['04', 'Plumbing', 0.22, 0.62, [['Underground', ['Sanitary', 'Storm']], ['Rough-in', L(3)], ['Fixtures', L(3)]]],
  ['05', 'Electrical', 0.32, 0.74, [['Rough-in', L(4)], ['Panels & service', ['Main service', 'Sub-panels']], ['Devices & trim', L(3)]]],
  ['06', 'HVAC', 0.38, 0.74, [['Ductwork', L(3)], ['Equipment', ['Rooftop units', 'Controls']]]],
  ['07', 'Roofing', 0.42, 0.58, [['Membrane', ['Main roof', 'Canopy']], ['Flashing & drains', ['Perimeter', 'Drains']]]],
  ['08', 'Drywall', 0.56, 0.8, [['Hanging', L(3)], ['Taping & finishing', L(3)]]],
  ['09', 'Finishes', 0.7, 0.96, [['Paint', L(3)], ['Flooring', L(3)], ['Millwork', ['Kitchens', 'Common areas']]]],
  ['10', 'Exterior & landscaping', 0.86, 1, [['Siding', ['North & East', 'South & West']], ['Landscaping', ['Hardscape', 'Planting']]]],
];

/**
 * A one-month line item `m` months from now. `lag` is how many months the crew runs behind:
 * work planned for month m actually started in month m + lag (if that's already happened).
 */
function item(name: string, m: number, lag = 0, forced?: ItemStatus): Item {
  const { start, end } = monthBounds(m);
  const startedM = m + lag;
  const status: ItemStatus = forced ?? (startedM < 0 ? 'done' : startedM === 0 ? 'doing' : 'todo');
  const at = (k: number, day: number) => iso(new Date(today().getFullYear(), today().getMonth() + k, day));
  const t = iso(today());
  const startedAt = status === 'todo' ? undefined : [at(startedM, 3), t].sort()[0];
  const doneAt = status === 'done' ? [at(startedM, 27), t].sort()[0] : undefined;
  return { id: uid('it'), name, start, end, status, startedAt, doneAt };
}

/** Lay the template over a project that started `startM` months ago and runs `months` months. */
function buildTrades(startM: number, months: number, lag: number, overrides: Record<string, Trade> = {}): Trade[] {
  return TEMPLATE.map(([code, name, from, to, tasks]) => {
    if (overrides[code]) return overrides[code];
    const a = startM + Math.round(from * (months - 1));
    const b = startM + Math.round(to * (months - 1));
    return {
      id: uid('tr'),
      code,
      name,
      tasks: tasks.map(([taskName, itemNames], ti) => {
        // tasks run one after another inside the trade's window, overlapping when it's tight
        const room = Math.max(0, b - a + 1 - itemNames.length);
        const s = a + (tasks.length > 1 ? Math.round((room * ti) / (tasks.length - 1)) : 0);
        return { id: uid('tk'), name: taskName, items: itemNames.map((n, ii) => item(n, s + ii, lag)) };
      }),
    };
  });
}

const people: Person[] = [
  { id: CURRENT_USER_ID, name: 'Alex Morgan', role: 'Operations Director', channel: 'sms' },
  { id: 'p-sarah', name: 'Sarah Chen', role: 'Project Manager', phone: '(512) 555-0110', channel: 'sms' },
  { id: 'p-tom', name: 'Tom Becker', role: 'Project Manager', phone: '(206) 555-0121', channel: 'sms' },
  { id: 'f-mike', name: 'Mike Torres', role: 'Foreman', phone: '(512) 555-0142', channel: 'sms' },
  { id: 'f-dave', name: 'Dave Miller', role: 'Foreman', phone: '(206) 555-0178', channel: 'sms' },
  { id: 'f-jenna', name: 'Jenna Brooks', role: 'Foreman', phone: '(303) 555-0119', channel: 'sms' },
  { id: 'f-luis', name: 'Luis Ramírez', role: 'Foreman', phone: '(916) 555-0163', channel: 'whatsapp' },
];

function northviewConcrete(): Trade {
  const task = (name: string, items: Item[]) => ({ id: uid('tk'), name, items });
  return {
    id: uid('tr'),
    code: '02',
    name: 'Concrete',
    tasks: [
      task('Foundations', [item('Footings', -5), item('Grade beams', -4), item('Slab on grade', -3)]),
      task('1st floor columns', [item('Formwork', -4), item('Rebar', -3), item('Pour', -2)]),
      // Rebar should have wrapped up last month: still in progress, so it's late.
      task('2nd floor slab', [item('Formwork', -2), item('Rebar', -1, 0, 'doing'), item('Pour & cure', 0, 0, 'todo')]),
      task('2nd floor beams', [item('Formwork', 1), item('Rebar', 2), item('Pour', 3)]),
      task('3rd floor slab', [item('Formwork', 3), item('Rebar', 4), item('Pour & cure', 5)]),
    ],
  };
}

function projects(): Project[] {
  return [
    {
      id: 'northview',
      name: 'Northview Residences',
      location: 'Austin, TX',
      client: 'Northview Living LLC',
      foremanId: 'f-mike',
      pmId: 'p-sarah',
      trades: buildTrades(-5, 26, 0, { '02': northviewConcrete() }),
      lastCheckIn: hoursAgo(24 * 6 + 3),
    },
    {
      id: 'harbor',
      name: 'Harbor Point Offices',
      location: 'Seattle, WA',
      client: 'Harbor Point Partners',
      foremanId: 'f-dave',
      pmId: 'p-tom',
      trades: buildTrades(-10, 23, 1),
      lastCheckIn: hoursAgo(24 * 3 + 2),
    },
    {
      id: 'maple',
      name: 'Maple Street Townhomes',
      location: 'Denver, CO',
      client: 'Maple Street Homes',
      foremanId: 'f-jenna',
      pmId: 'p-tom',
      trades: buildTrades(-14, 19, 0),
      lastCheckIn: hoursAgo(24 * 3 + 5),
    },
    {
      id: 'riverside',
      name: 'Riverside Medical Clinic',
      location: 'Sacramento, CA',
      client: 'Riverside Health Group',
      foremanId: 'f-luis',
      pmId: 'p-sarah',
      trades: buildTrades(-6, 18, 3),
      lastCheckIn: hoursAgo(24 * 9),
    },
  ];
}

const alerts = (): AlertItem[] => [
  {
    id: uid('al'),
    projectId: 'riverside',
    kind: 'no-reply',
    title: "Luis Ramírez hasn't replied to Monday's check-in",
    body: 'No field update from Riverside Medical Clinic in 52 hours.',
    notified: 'Sarah Chen · SMS & email',
    createdAt: hoursAgo(4),
    read: false,
  },
  {
    id: uid('al'),
    projectId: 'harbor',
    kind: 'issue',
    title: 'New issue #11: Elevator shaft 2 in. out of plumb',
    body: 'Reported by Dave Miller via SMS.',
    notified: 'Tom Becker · SMS & email',
    createdAt: hoursAgo(26),
    read: false,
  },
  {
    id: uid('al'),
    projectId: 'northview',
    kind: 'delay',
    title: 'Behind schedule: 2nd floor slab → Rebar',
    body: 'Still in progress, 20 days past its month.',
    notified: 'Sarah Chen · SMS & email',
    createdAt: hoursAgo(30),
    read: true,
  },
  {
    id: uid('al'),
    projectId: 'maple',
    kind: 'milestone',
    title: 'Milestone reached: Roofing complete',
    body: 'All roofing line items marked done by Jenna Brooks.',
    notified: 'Tom Becker · email',
    createdAt: hoursAgo(50),
    read: true,
  },
];

const issues = (): Issue[] => [
  {
    id: uid('is'),
    number: 11,
    projectId: 'harbor',
    title: 'Elevator shaft 2 in. out of plumb',
    context: 'Concrete → Columns → Level 3',
    reportedBy: 'f-dave',
    assignedTo: 'p-tom',
    status: 'open',
    createdAt: hoursAgo(26),
    via: 'sms',
    thread: [
      { id: uid('m'), author: 'f-dave', text: 'Surveyor found the elevator shaft 2 inches out of plumb at level 3. Holding the next pour.', at: hoursAgo(26), via: 'sms' },
      { id: uid('m'), author: 'bot', text: 'Issue created automatically from Dave’s SMS reply. Tom Becker notified.', at: hoursAgo(26) },
      { id: uid('m'), author: 'p-tom', text: 'Thanks Dave. I’m calling the structural engineer, will have an answer by tomorrow noon.', at: hoursAgo(24), via: 'app' },
    ],
  },
  {
    id: uid('is'),
    number: 10,
    projectId: 'riverside',
    title: 'Water pooling in excavation after rain',
    context: 'Sitework → Excavation → Footprint',
    reportedBy: 'f-luis',
    assignedTo: 'p-sarah',
    status: 'open',
    createdAt: hoursAgo(24 * 3),
    via: 'whatsapp',
    thread: [
      { id: uid('m'), author: 'f-luis', text: 'Heavy rain last night, water pooling on the east side of the excavation. Need a pump.', at: hoursAgo(24 * 3), via: 'whatsapp' },
      { id: uid('m'), author: 'bot', text: 'Issue created automatically from Luis’s WhatsApp reply. Sarah Chen notified.', at: hoursAgo(24 * 3) },
    ],
  },
  {
    id: uid('is'),
    number: 9,
    projectId: 'maple',
    title: 'Window delivery delayed one week',
    context: 'Finishes → Millwork → Kitchens',
    reportedBy: 'f-jenna',
    assignedTo: 'p-tom',
    status: 'resolved',
    createdAt: hoursAgo(24 * 9),
    via: 'sms',
    thread: [
      { id: uid('m'), author: 'f-jenna', text: 'Supplier pushed the window delivery a week.', at: hoursAgo(24 * 9), via: 'sms' },
      { id: uid('m'), author: 'p-tom', text: 'Resequenced: crews move to interior paint until they arrive.', at: hoursAgo(24 * 8), via: 'app' },
      { id: uid('m'), author: 'bot', text: 'Issue marked as resolved by Tom Becker.', at: hoursAgo(24 * 2) },
    ],
  },
];

const rules = (): Rule[] => [
  { id: 'delay', label: 'Task falls behind schedule', detail: 'Notify the project manager when a line item is', enabled: true, threshold: 5, unit: 'days behind plan' },
  { id: 'no-reply', label: "Foreman doesn't reply to a check-in", detail: 'Notify the project manager after', enabled: true, threshold: 48, unit: 'hours without a reply' },
  { id: 'end-risk', label: 'Completion date at risk', detail: 'Notify operations when the forecast end date moves past the plan.', enabled: true },
  { id: 'issue', label: 'Issue reported from the field', detail: 'Notify the assigned person as soon as an issue is reported.', enabled: true },
];

export function seed(user: string | null = null): State {
  seq = 0;
  return {
    version: DATA_VERSION,
    user,
    people,
    projects: projects(),
    alerts: alerts(),
    issues: issues(),
    rules: rules(),
    settings: { frequency: 'weekly' },
    flash: null,
    toasts: [],
  };
}
