import React, { useEffect, useState } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500); // Wait for fade out
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <main className={`flex flex-col items-center justify-center w-full h-screen fixed inset-0 z-[100] overflow-hidden bg-zinc-950 transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        @keyframes glowPulse {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 0.15; transform: scale(1); }
          100% { opacity: 0.1; transform: scale(1.1); }
        }
        @keyframes titleReveal {
          0% { opacity: 0; transform: scale(0.95); letter-spacing: 0em; filter: blur(4px); }
          100% { opacity: 1; transform: scale(1); letter-spacing: 0.2em; filter: blur(0); }
        }
        @keyframes lineGrow {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        .glow-effect { animation: glowPulse 3.5s ease-out forwards; }
        .title-effect { animation: titleReveal 1.5s ease-out 0.5s forwards; opacity: 0; }
        .line-effect { animation: lineGrow 1.2s ease-in-out 1.2s forwards; opacity: 0; }
      `}</style>

      {/* Cinematic background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none glow-effect">
        <div className="w-[100vw] h-[100vw] md:w-[60vw] md:h-[60vw] bg-rose-500/10 rounded-full blur-[40px]" />
      </div>

      <div className="flex flex-col items-center z-10" style={{ fontFamily: 'Times New Roman, serif' }}>
        <p className="text-yellow-100 font-display text-2xl md:text-4xl lg:text-5xl font-black uppercase drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] ml-3 md:ml-4 whitespace-nowrap title-effect">
          MK EDITION
        </p>
        
        <div className="h-[2px] w-32 md:w-48 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mt-8 origin-center drop-shadow-md line-effect" />
      </div>
    </main>
  );
}
