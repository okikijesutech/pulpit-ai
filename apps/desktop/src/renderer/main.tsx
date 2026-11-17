/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

async function bootstrap() {
  // Only load the browser mock bridge during Vite web dev outside Electron.
  // In production Electron builds this dynamic import is tree-shaken completely.
  if (import.meta.env.DEV && typeof window !== 'undefined' && !(window as any).pulpitAPI) {
    await import('./browserMockBridge.js');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
