import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Channel, Issue, ItemStatus, Project } from '../types';
import { APP_NAME } from '../config';
import { uid, useStore } from '../store';
import { MONTH_NAMES, fmtTime, parse } from '../lib/dates';
import { focusItem, itemDelay, type Focus } from '../lib/schedule';
import { BrandMark, Icon, SmsLogo, WhatsAppLogo } from './Icon';

interface Msg {
  id: string;
  from: 'bot' | 'me';
  text: string;
  at: string;
}

type Step = 'progress' | 'blocker' | 'done';

const NO_BLOCKER = /^\s*(no\b|nope|none|nothing|all good|good|fine|ok\b)/i;

/** Read a free-text reply as a status. Accepts the quick replies plus everyday wording (and some Spanish). */
function parseStatus(text: string): ItemStatus | null {
  const t = text.toLowerCase();
  if (/\b(not started|haven'?t started|didn'?t start|not yet|no\b|nope|sin empezar|no empez)/.test(t)) return 'todo';
  if (/\b(almost|nearly|working|in progress|still|ongoing|started|halfway|close|trabajando|en curso|casi)/.test(t)) return 'doing';
  if (/\b(done|finished|complete|completed|wrapped|yes\b|yep|listo|terminad)/.test(t)) return 'done';
  return null;
}

const ASK_LABEL: Record<ItemStatus, string> = { done: 'Done', doing: 'Still working', todo: 'Not started' };

const first = (name: string) => name.split(' ')[0];

export function PhoneSim({ project, onClose }: { project: Project; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const foreman = state.people.find((p) => p.id === project.foremanId)!;
  const pm = state.people.find((p) => p.id === project.pmId)!;
  const delayRule = state.rules.find((r) => r.id === 'delay')!;
  const issueRule = state.rules.find((r) => r.id === 'issue')!;

  const [channel, setChannel] = useState<Channel>(foreman.channel);
  const [target, setTarget] = useState<Focus | null>(() => focusItem(project));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(true);
  const [step, setStep] = useState<Step>('progress');
  const [input, setInput] = useState('');
  const timers = useRef<number[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chName = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

  function botSay(lines: string[]) {
    setBusy(true);
    let delay = 250;
    lines.forEach((text, i) => {
      timers.current.push(window.setTimeout(() => setTyping(true), delay));
      delay += 650 + Math.min(text.length * 10, 900);
      timers.current.push(
        window.setTimeout(() => {
          setTyping(false);
          setMsgs((m) => [...m, { id: uid('m'), from: 'bot', text, at: new Date().toISOString() }]);
          if (i === lines.length - 1) {
            setBusy(false);
            inputRef.current?.focus({ preventScroll: true });
          }
        }, delay),
      );
      delay += 250;
    });
  }

  function start(f: Focus | null) {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setMsgs([]);
    setTyping(false);
    setInput('');
    if (!f) {
      setStep('done');
      botSay([`Hi ${first(foreman.name)}, everything on ${project.name} is marked complete. Nothing to report this week!`]);
      return;
    }
    setStep('progress');
    botSay([
      `Hi ${first(foreman.name)}, it's ${APP_NAME} with your weekly check-in for ${project.name}.`,
      `Quick one: ${f.task.name} → ${f.item.name} (planned for ${MONTH_NAMES[parse(f.item.start).getMonth()]}). Is it done?`,
    ]);
  }

  useEffect(() => {
    start(target);
    return () => timers.current.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function reply(text: string) {
    if (!text.trim() || busy || step === 'done' || !target) return;
    setMsgs((m) => [...m, { id: uid('m'), from: 'me', text: text.trim(), at: new Date().toISOString() }]);
    setInput('');
    dispatch({ type: 'checkedIn', projectId: project.id });

    if (step === 'progress') {
      const status = parseStatus(text);
      if (status === null) {
        botSay(['Sorry, I didn\'t catch that. Reply "Done", "Still working" or "Not started".']);
        return;
      }
      const { task, item } = target;
      const updated = { ...item, status };
      dispatch({ type: 'updateItem', projectId: project.id, itemId: item.id, status });
      dispatch({ type: 'toast', text: `Schedule updated from ${first(foreman.name)}'s ${chName} reply` });
      const delay = itemDelay(updated);
      const where = `${task.name} → ${item.name}`;
      let head = '';
      if (status === 'done') head = `Nice, ${where} is marked done.`;
      else if (status === 'doing') head = `Got it, ${where} is in progress.`;
      else head = `Got it, ${where} hasn't started yet.`;
      let extra = '';
      if (status !== 'done' && delayRule.enabled && delay >= (delayRule.threshold ?? 5)) {
        dispatch({
          type: 'addAlert',
          alert: {
            projectId: project.id,
            kind: 'delay',
            title: `Behind schedule: ${where}`,
            body: `${status === 'doing' ? 'Still in progress' : 'Not started'}, ${delay} days past its month. Reported by ${foreman.name} via ${chName}.`,
            notified: `${pm.name} · SMS & email`,
          },
        });
        extra = ` It was due by the end of ${MONTH_NAMES[parse(item.end).getMonth()]}, so I gave ${first(pm.name)} a heads-up.`;
      }
      setTarget({ ...target, item: updated });
      setStep('blocker');
      botSay([head + extra, 'Anything blocking the work?']);
      return;
    }

    if (step === 'blocker') {
      if (NO_BLOCKER.test(text)) {
        setStep('done');
        botSay([`Great, thanks ${first(foreman.name)}. Talk next week!`]);
        return;
      }
      const number = Math.max(0, ...state.issues.map((i) => i.number)) + 1;
      const title = text.trim().replace(/^./, (c) => c.toUpperCase()).replace(/[.!]+$/, '');
      const now = new Date().toISOString();
      const issue: Issue = {
        id: uid('is'),
        number,
        projectId: project.id,
        title,
        context: `${target.trade.name} → ${target.task.name} → ${target.item.name}`,
        reportedBy: foreman.id,
        assignedTo: pm.id,
        status: 'open',
        createdAt: now,
        via: channel,
        thread: [
          { id: uid('m'), author: foreman.id, text: text.trim(), at: now, via: channel },
          { id: uid('m'), author: 'bot', text: `Issue created automatically from ${first(foreman.name)}'s ${chName} reply. ${pm.name} notified.`, at: now },
        ],
      };
      dispatch({ type: 'addIssue', issue });
      if (issueRule.enabled) {
        dispatch({
          type: 'addAlert',
          alert: {
            projectId: project.id,
            kind: 'issue',
            title: `New issue #${number}: ${title}`,
            body: `Reported by ${foreman.name} via ${chName}.`,
            notified: `${pm.name} · SMS & email`,
          },
        });
      }
      dispatch({ type: 'toast', text: `Issue #${number} created and assigned to ${pm.name}` });
      setStep('done');
      botSay([`Got it. I opened issue #${number} and notified ${pm.name}.`, 'Thanks, talk next week!']);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    reply(input);
  }

  const quick: string[] =
    step === 'progress' && target
      ? (['done', 'doing', 'todo'] as ItemStatus[]).filter((st) => !(target.item.status === 'doing' && st === 'todo')).map((st) => ASK_LABEL[st])
      : step === 'blocker'
        ? ['No, all good', "Material didn't arrive", 'Waiting on inspection']
        : [];

  return (
    <>
      <div className="sim-scrim" onClick={onClose} />
      <aside className="sim" aria-label="Check-in simulator">
        <div className="sim-head">
          <div>
            <div className="sim-title">Field check-in</div>
            <div className="sim-sub">
              You're replying as <b>{foreman.name}</b>, foreman
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close simulator">
            <Icon name="x" />
          </button>
        </div>

        <div className="seg" role="radiogroup" aria-label="Channel">
          <button role="radio" aria-checked={channel === 'sms'} className={channel === 'sms' ? 'on' : ''} onClick={() => setChannel('sms')}>
            <SmsLogo size={16} /> SMS
          </button>
          <button role="radio" aria-checked={channel === 'whatsapp'} className={channel === 'whatsapp' ? 'on' : ''} onClick={() => setChannel('whatsapp')}>
            <WhatsAppLogo size={16} /> WhatsApp
          </button>
        </div>

        <div className={`phone ph-${channel}`}>
          <div className="ph-screen">
            <div className="ph-status">
              <span>9:41</span>
              <span className="ph-island" />
              <span className="ph-sig">●●●</span>
            </div>
            {channel === 'whatsapp' ? (
              <div className="ph-head wa">
                <Icon name="back" size={20} />
                <span className="ph-av">
                  <BrandMark size={34} />
                </span>
                <span className="ph-who">
                  <b>{APP_NAME}</b>
                  <span>Business account</span>
                </span>
              </div>
            ) : (
              <div className="ph-head sms">
                <span className="ph-av">
                  <BrandMark size={40} />
                </span>
                <b>{APP_NAME}</b>
                <span>Text message · (512) 555-0100</span>
              </div>
            )}

            <div className="ph-chat" ref={chatRef}>
              {msgs.map((m) => (
                <div key={m.id} className={`bub ${m.from}`}>
                  {m.text}
                  <span className="bub-t">
                    {fmtTime(m.at)}
                    {m.from === 'me' && channel === 'whatsapp' && <span className="ticks">✓✓</span>}
                  </span>
                </div>
              ))}
              {typing && (
                <div className="bub bot typing" aria-label="Typing">
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </div>

            {quick.length > 0 && !busy && (
              <div className="ph-quick">
                {quick.map((q) => (
                  <button key={q} onClick={() => reply(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form className="ph-input" onSubmit={submit}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={step === 'done' ? 'Check-in complete' : channel === 'whatsapp' ? 'Message' : 'Text Message'}
                disabled={step === 'done'}
                aria-label="Reply"
              />
              <button disabled={!input.trim() || busy || step === 'done'} aria-label="Send">
                <Icon name="send" size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="sim-foot">
          {step === 'done' && !busy ? (
            <>
              <span className="sim-ok">
                <Icon name="check" size={16} /> Check-in complete
              </span>
              <button className="link" onClick={() => { const f = focusItem(project); setTarget(f); start(f); }}>
                Run another
              </button>
            </>
          ) : (
            <span className="muted">Tap a suggested reply or type your own, like “almost done” or “waiting on the pump truck”.</span>
          )}
        </div>
      </aside>
    </>
  );
}
