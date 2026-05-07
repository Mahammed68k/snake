import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  useEffect(() => {
    // 3.0 seconds duration before exit starts (0.5s exit = 3.5s total)
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.main
      initial={{ opacity: 1 }}
      className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden bg-zinc-950"
    >
      {/* Deep cinematic background glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.2, scale: 1.1 }}
        transition={{ duration: 3.5, ease: "easeOut" }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[100vw] h-[100vw] md:w-[60vw] md:h-[60vw] bg-rose-500/10 rounded-full blur-[120px]" />
      </motion.div>

      <div className="flex flex-col items-center z-10" style={{ fontFamily: 'Times New Roman' }}>
        
        {/* Main Title Reveal */}
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0em", scale: 0.95 }}
          animate={{ opacity: 1, letterSpacing: "0.2em", scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          className="text-white font-display text-2xl md:text-4xl lg:text-5xl font-normal drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] ml-3 md:ml-4"
        >
          MK EDITION
        </motion.p>
        
        {/* Elegant line separator */}
        <motion.div 
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 1.2 }}
          className="h-[1px] w-32 md:w-48 bg-gradient-to-r from-transparent via-white/40 to-transparent mt-8 origin-center"
        />

      </div>
    </motion.main>
  );
}
