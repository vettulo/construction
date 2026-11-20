import { useStore } from './store';
import { useRoute } from './lib/router';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectPage } from './pages/ProjectPage';
import { Issues } from './pages/Issues';
import { IssueDetail } from './pages/IssueDetail';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';

export function App() {
  const { state } = useStore();
  const route = useRoute();
  if (!state.user) return <Login />;

  const [section, id] = route.split('/').filter(Boolean);
  let page;
  if (section === 'projects' && id) page = <ProjectPage key={id} id={id} />;
  else if (section === 'projects') page = <Projects />;
  else if (section === 'issues' && id) page = <IssueDetail key={id} id={id} />;
  else if (section === 'issues') page = <Issues />;
  else if (section === 'alerts') page = <Alerts />;
  else if (section === 'settings') page = <Settings />;
  else page = <Dashboard />;

  return <Layout route={route}>{page}</Layout>;
}
