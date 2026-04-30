import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import TermsOfService from './components/TermsOfService.tsx';
import './index.css';

const path = window.location.pathname;

let ComponentToRender = App;
if (path === '/privacy') {
  ComponentToRender = PrivacyPolicy;
} else if (path === '/terms') {
  ComponentToRender = TermsOfService;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ComponentToRender />
    </ErrorBoundary>
  </StrictMode>,
);
