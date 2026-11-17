import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { DeviceCheck } from './DeviceCheck';
import './device-check.css';

// Guarda la app en el teléfono para que abra sin conexión y se actualice sola.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceCheck />
  </StrictMode>,
);
