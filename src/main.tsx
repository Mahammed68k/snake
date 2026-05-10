import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import RootApp from './RootApp.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import TermsOfService from './components/TermsOfService.tsx';
import './index.css';

const path = window.location.pathname;
const urlParams = new URLSearchParams(window.location.search);
const page = urlParams.get('page');

let ComponentToRender = RootApp;
if (path === '/privacy' || path === '/privacy-policy' || path === '/privacy.html' || page === 'privacy') {
  ComponentToRender = PrivacyPolicy;
} else if (path === '/terms' || path === '/terms-of-service' || path === '/terms.html' || page === 'terms') {
  ComponentToRender = TermsOfService;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ComponentToRender />
    </ErrorBoundary>
  </StrictMode>,
);
