import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
const RootApp = lazy(() => import('./RootApp.tsx'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy.tsx'));
const TermsOfService = lazy(() => import('./components/TermsOfService.tsx'));
import ErrorBoundary from './components/ErrorBoundary.tsx';

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
      <Suspense fallback={<div className="fixed inset-0 bg-[#050505]" />}>
        <ComponentToRender />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
