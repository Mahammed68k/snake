import React, { useEffect } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <main
      className="flex flex-col items-center justify-center w-full h-full"
    >
      <p
        className="text-white font-display tracking-[0.5em] text-sm md:text-xl font-bold opacity-0 animate-[fadeInUp_0.4s_ease-out_0.3s_forwards]"
      >
        MK EDITION
      </p>
      
      <div 
        className="h-1 w-48 md:w-64 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-8 origin-center scale-x-0 animate-[scaleInX_0.7s_ease-in-out_0.6s_forwards]"
      />
    </main>
  );
}
