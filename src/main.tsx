import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installGlobalRuntimeDiagnostics } from './services/runtime/runtime-diagnostics';
import { RuntimeErrorBoundary } from './services/runtime/runtime-error-boundary';

installGlobalRuntimeDiagnostics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </StrictMode>
);
