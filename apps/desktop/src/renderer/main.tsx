/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { NativeProjectorScreen } from './screens/NativeProjectorScreen.js';
import { NativeFoldbackScreen } from './screens/NativeFoldbackScreen.js';
import './index.css';

async function bootstrap() {
  // Only load the browser mock bridge during Vite web dev outside Electron.
  // In production Electron builds this dynamic import is tree-shaken completely.
  if (import.meta.env.DEV && typeof window !== 'undefined' && !(window as any).pulpitAPI) {
    await import('./browserMockBridge.js');
  }

  const urlParams = new URLSearchParams(window.location.search);
  const viewMode = urlParams.get('view');

  const rootElement = document.getElementById('root')!;

  if (viewMode === 'projector') {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <NativeProjectorScreen />
      </React.StrictMode>
    );
  } else if (viewMode === 'foldback') {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <NativeFoldbackScreen />
      </React.StrictMode>
    );
  } else {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

bootstrap();
