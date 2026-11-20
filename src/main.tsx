import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store';
import { App } from './App';
import './styles.css';

// No StrictMode: the check-in simulator runs timed scripts on mount.
createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
