import React, { useState, useEffect, Suspense, lazy } from 'react';
import IntroScreen from './components/IntroScreen';
import ErrorBoundary from './components/ErrorBoundary';

const LazyApp = lazy(() => import('./App'));

// Preload the main app chunk after a tiny delay
const preloadApp = () => import('./App');

export default function RootApp() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Start preloading App component after a delay
    const timer = setTimeout(preloadApp, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div 
        className={`fixed inset-0 z-[200] bg-zinc-950 flex items-center justify-center p-0 m-0 transition-opacity duration-1000 ${showIntro ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      </div>
      
      <div className={`fixed inset-0 z-10 transition-opacity duration-700 ${showIntro ? 'opacity-0' : 'opacity-100'}`}>
        <ErrorBoundary>
          <Suspense fallback={
            <main className="fixed inset-0 h-[100dvh] bg-[#050505] flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </main>
          }>
            <LazyApp />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
