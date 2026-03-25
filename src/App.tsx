import React, { useState } from 'react';
import SnakeGame from './components/SnakeGame';
import MusicPlayer from './components/MusicPlayer';

export default function App() {
  const [score, setScore] = useState(0);

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col items-center justify-between py-8 px-4 font-sans">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #d946ef 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
        }}
      />

      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10 mb-8">
        <div className="flex flex-col">
          <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] tracking-wider">
            NEON SNAKE
          </h1>
          <p className="text-cyan-300 font-display tracking-widest text-sm mt-1 opacity-80">
            CYBERPUNK EDITION
          </p>
        </div>

        {/* Score Display */}
        <div className="bg-black/50 border border-cyan-500/50 rounded-xl px-6 py-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-sm">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Score</p>
          <p className="text-3xl font-display font-bold text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]">
            {score.toString().padStart(4, '0')}
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-12 z-10">
        
        {/* Game Container */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="relative p-1 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-fuchsia-500 blur-xl opacity-20 rounded-2xl"></div>
            <div className="relative bg-black rounded-xl p-4 border border-white/5">
              <SnakeGame onScoreChange={setScore} />
            </div>
          </div>
        </div>

        {/* Sidebar / Music Player */}
        <div className="w-full lg:w-96 flex flex-col items-center justify-center gap-8">
          <MusicPlayer />
          
          {/* Instructions */}
          <div className="w-full max-w-md bg-black/40 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-cyan-400 font-display font-bold mb-4 tracking-wider text-lg">CONTROLS</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center justify-between">
                <span>Move</span>
                <div className="flex gap-1">
                  <kbd className="bg-gray-800 px-2 py-1 rounded text-cyan-300 border border-cyan-900/50 font-mono">W</kbd>
                  <kbd className="bg-gray-800 px-2 py-1 rounded text-cyan-300 border border-cyan-900/50 font-mono">A</kbd>
                  <kbd className="bg-gray-800 px-2 py-1 rounded text-cyan-300 border border-cyan-900/50 font-mono">S</kbd>
                  <kbd className="bg-gray-800 px-2 py-1 rounded text-cyan-300 border border-cyan-900/50 font-mono">D</kbd>
                </div>
              </li>
              <li className="flex items-center justify-between">
                <span>Alt Move</span>
                <span className="text-fuchsia-400 font-mono">Arrow Keys</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Pause</span>
                <kbd className="bg-gray-800 px-3 py-1 rounded text-cyan-300 border border-cyan-900/50 font-mono">Space</kbd>
              </li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
}
