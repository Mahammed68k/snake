import React, { useState, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import IntroScreen from './components/IntroScreen';
import ErrorBoundary from './components/ErrorBoundary';

const LazyApp = lazy(() => import('./App'));

export default function RootApp() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            key="intro-overlay" 
            className="fixed inset-0 z-[200] bg-zinc-950 flex items-center justify-center p-0 m-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <IntroScreen onComplete={() => setShowIntro(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
         key="app-content"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ duration: 0.5, ease: "easeOut", delay: showIntro ? 0 : 0.5 }}
         className="fixed inset-0 z-10"
      >
        <ErrorBoundary>
          <Suspense fallback={
            <main className="fixed inset-0 h-[100dvh] bg-[#050505] flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </main>
          }>
            <LazyApp />
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </>
  );
}
