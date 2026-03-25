import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden bg-[#050505]/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-center"
      >
        <h1 className="text-8xl md:text-[150px] font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-purple-600 drop-shadow-[0_0_30px_rgba(217,70,239,0.6)]">
          MK
        </h1>
        
        {/* Animated Rings */}
        <motion.div 
          className="absolute -inset-8 md:-inset-12 border-2 border-cyan-500/50 rounded-lg"
          initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 180 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -inset-12 md:-inset-20 border border-fuchsia-500/30 rounded-full"
          initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: -180 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
        
        {/* Scanline effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent"
          initial={{ top: '-100%' }}
          animate={{ top: '200%' }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}
