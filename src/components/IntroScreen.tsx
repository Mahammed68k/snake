import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center w-full h-full"
    >
      <motion.h1 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        className="text-4xl md:text-6xl lg:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_20px_rgba(217,70,239,0.8)] tracking-widest mb-4"
      >
        MK
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-cyan-300 font-display tracking-[0.5em] text-sm md:text-xl opacity-80"
      >
        MK EDITION
      </motion.p>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.2, duration: 1, ease: "easeInOut" }}
        className="h-1 w-48 md:w-64 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-8"
      />
    </motion.div>
  );
}
