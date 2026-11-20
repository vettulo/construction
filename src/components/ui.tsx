import type { ReactNode } from 'react';
import type { AlertItem, Channel, Person } from '../types';
import { HEALTH_LABEL, type Health } from '../lib/schedule';
import { timeAgo } from '../lib/dates';
import { useStore } from '../store';
import { Icon, SmsLogo, WhatsAppLogo, type IconName } from './Icon';

export function StatusPill({ health }: { health: Health }) {
  return (
    <span className={`pill pill-${health}`}>
      <i />
      {HEALTH_LABEL[health]}
    </span>
  );
}

export function ProgressPlan({ actual, planned, compact }: { actual: number; planned: number; compact?: boolean }) {
  const behind = planned - actual >= 2;
  return (
    <div className={`pp ${compact ? 'pp-compact' : ''}`}>
      <div className="pp-top">
        <b>{Math.round(actual)}%</b>
        <span>plan {Math.round(planned)}%</span>
      </div>
      <div className="pp-bar" role="img" aria-label={`${Math.round(actual)}% complete, plan ${Math.round(planned)}%`}>
        <div className={`pp-fill ${behind ? 'late' : ''}`} style={{ width: `${actual}%` }} />
        <div className="pp-mark" style={{ left: `${planned}%` }} />
      </div>
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

export function Avatar({ name, size = 30, accent }: { name: string; size?: number; accent?: boolean }) {
  return (
    <span className={`avatar ${accent ? 'avatar-accent' : ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: Channel | 'app' }) {
  if (channel === 'app') return <span className="chan">App</span>;
  return (
    <span className="chan">
      {channel === 'whatsapp' ? <WhatsAppLogo size={14} /> : <SmsLogo size={14} />}
      {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
    </span>
  );
}

export function PersonLine({ person, showChannel }: { person: Person; showChannel?: boolean }) {
  return (
    <span className="person">
      <Avatar name={person.name} size={26} />
      <span>{person.name}</span>
      {showChannel && <ChannelBadge channel={person.channel} />}
    </span>
  );
}

const ALERT_ICON: Record<AlertItem['kind'], IconName> = {
  delay: 'warning',
  'no-reply': 'clock',
  'end-risk': 'calendar',
  issue: 'flag',
  milestone: 'check',
};

export function AlertRow({ alert, compact }: { alert: AlertItem; compact?: boolean }) {
  const { state } = useStore();
  const project = state.projects.find((p) => p.id === alert.projectId);
  const strong = alert.kind === 'delay' || alert.kind === 'end-risk';
  return (
    <a href={`#/projects/${alert.projectId}`} className={`alert-row ${alert.read ? '' : 'unread'} ${compact ? 'compact' : ''}`}>
      <span className={`alert-ic ${strong ? 'strong' : ''}`}>
        <Icon name={ALERT_ICON[alert.kind]} size={compact ? 16 : 18} />
      </span>
      <span className="alert-body">
        <span className="alert-title">{alert.title}</span>
        {!compact && <span className="alert-text">{alert.body}</span>}
        <span className="alert-meta">
          {project?.name} · {timeAgo(alert.createdAt)}
          {!compact && <> · Notified {alert.notified}</>}
        </span>
      </span>
      {!alert.read && <span className="dot" aria-label="Unread" />}
    </a>
  );
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
