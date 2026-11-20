import { CURRENT_USER_ID } from '../config';
import { useStore } from '../store';
import { projectSummary } from '../lib/schedule';
import { fmtLongDate, today } from '../lib/dates';
import { DelayChart, ProgressChart, ReplyChart, SlipChart } from '../components/Charts';
import { AlertRow, Card, ChannelBadge, Empty } from '../components/ui';
import { Icon } from '../components/Icon';

const FREQ_LABEL = { weekly: 'Every Monday, 8:00 AM', twice: 'Mondays and Thursdays, 8:00 AM', daily: 'Every weekday, 4:00 PM' };

export function Dashboard() {
  const { state } = useStore();
  const me = state.people.find((p) => p.id === CURRENT_USER_ID)!;
  const sums = state.projects.map((p) => projectSummary(p));
  const onTrack = sums.filter((s) => s.health === 'on-track').length;
  const attention = sums.length - onTrack;
  const openIssues = state.issues.filter((i) => i.status === 'open').length;
  const unread = state.alerts.filter((a) => !a.read).length;
  const foremen = state.projects.map((p) => state.people.find((x) => x.id === p.foremanId)!);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{fmtLongDate(today())}</p>
          <h1>
            {greet}, {me.name.split(' ')[0]}
          </h1>
          <p className="muted">
            {attention > 0 ? `${attention} of ${sums.length} projects need your attention.` : 'All projects are on track.'}
          </p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Active projects</span>
          <b>{sums.length}</b>
        </div>
        <div className="kpi">
          <span>On track</span>
          <b>{onTrack}</b>
        </div>
        <div className={`kpi ${attention ? 'kpi-accent' : ''}`}>
          <span>Need attention</span>
          <b>{attention}</b>
        </div>
        <div className="kpi">
          <span>Open issues</span>
          <b>{openIssues}</b>
        </div>
      </div>

      <div className="dash-row dash-wide">
        <Card title="Progress vs plan" action={<span className="card-sub">All {sums.length} projects</span>}>
          <div className="ch-pad">
            <ProgressChart projects={state.projects} />
          </div>
        </Card>
        <Card title="Check-in replies" action={<span className="card-sub">Last 8 weeks</span>}>
          <div className="ch-pad">
            <ReplyChart projects={state.projects} />
          </div>
        </Card>
      </div>

      <div className="dash-row dash-half">
        <Card title="Forecast finish vs plan" action={<a href="#/projects" className="link">Projects</a>}>
          <p className="card-intro muted">Days each project is expected to finish late.</p>
          <div className="ch-pad">
            <SlipChart projects={state.projects} />
          </div>
        </Card>
        <Card title="Where the delays are" action={<span className="card-sub">By trade</span>}>
          <p className="card-intro muted">Line items behind plan across all projects.</p>
          <div className="ch-pad">
            <DelayChart projects={state.projects} />
          </div>
        </Card>
      </div>

      <div className="dash-row dash-half">
        <Card title={<>Latest alerts {unread > 0 && <span className="count">{unread} new</span>}</>} action={<a href="#/alerts" className="link">View all</a>}>
          <div className="list">
            {state.alerts.length === 0 && <Empty>No alerts.</Empty>}
            {state.alerts.slice(0, 4).map((a) => (
              <AlertRow key={a.id} alert={a} compact />
            ))}
          </div>
        </Card>
        <Card title="Next check-in" action={<a href="#/settings" className="link">Edit</a>}>
          <div className="next-ci">
            <span className="next-ic">
              <Icon name="message" />
            </span>
            <div>
              <b>{FREQ_LABEL[state.settings.frequency]}</b>
              <span className="muted">{foremen.length} foremen get a text asking for their progress.</span>
            </div>
          </div>
          <div className="ci-people">
            {foremen.map((f) => (
              <div key={f.id} className="ci-person">
                <span>{f.name}</span>
                <ChannelBadge channel={f.channel} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
