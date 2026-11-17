import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ensureSeeded, migrate } from './db/seed';
import { DataProvider } from './state/data';
import './styles/tokens.css';
import './styles/app.css';

// Guarda la app en el teléfono para que abra sin conexión y se actualice sola.
registerSW({ immediate: true });

void ensureSeeded()
  .then(() => migrate())
  .then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DataProvider>
        <App />
      </DataProvider>
    </StrictMode>,
  );
});
