import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import SnakeGame from './components/SnakeGame';
import MusicPlayer from './components/MusicPlayer';
import Login from './components/Login';
import Leaderboard from './components/Leaderboard';

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snakeHighScore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGameOver = async (finalScore: number) => {
    if (!user || finalScore === 0) return;
    
    try {
      const scoreRef = doc(db, 'leaderboard', user.uid);
      const scoreDoc = await getDoc(scoreRef);
      
      if (!scoreDoc.exists() || finalScore > scoreDoc.data().score) {
        await setDoc(scoreRef, {
          userId: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          score: finalScore,
          timestamp: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen w-screen bg-[#050505] relative overflow-hidden flex items-center justify-center font-sans p-0 m-0">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #d946ef 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
        }}
      />

      {/* Floating Header / HUD */}
      <header className="absolute top-4 left-4 right-4 flex items-start justify-between z-20 pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <h1 className="text-2xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)] tracking-wider">
            NEON SNAKE
          </h1>
          <p className="text-cyan-300 font-display tracking-widest text-[10px] md:text-xs mt-0.5 opacity-80">
            CYBERPUNK EDITION
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full border border-cyan-500/50" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan-900/50 border border-cyan-500/50 flex items-center justify-center text-cyan-300 text-[10px] font-bold">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-gray-300 text-[10px] hidden sm:block max-w-[80px] truncate">
                {user.displayName || user.email}
              </span>
            </div>
            <div className="w-px h-4 bg-white/10 mx-0.5"></div>
            <button
              onClick={handleSignOut}
              className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors uppercase tracking-wider font-bold"
            >
              Sign Out
            </button>
          </div>

          {/* Score Display */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="bg-black/60 border border-cyan-500/50 rounded-xl px-3 py-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md hover:bg-cyan-500/20 transition-all flex items-center justify-center"
              title="View Leaderboard"
            >
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <div className="bg-black/60 border border-cyan-500/50 rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
              <p className="text-gray-400 text-[9px] uppercase tracking-widest mb-0.5">Score</p>
              <p className="text-xl md:text-2xl font-display font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                {score.toString().padStart(4, '0')}
              </p>
            </div>
            <div className="bg-black/60 border border-fuchsia-500/50 rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(217,70,239,0.2)] backdrop-blur-md">
              <p className="text-gray-400 text-[9px] uppercase tracking-widest mb-0.5">High Score</p>
              <p className="text-xl md:text-2xl font-display font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]">
                {highScore.toString().padStart(4, '0')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Game Area - Full Screen Centered */}
      <main className="relative z-10 w-full h-full flex items-center justify-center">
        <SnakeGame 
          onScoreChange={setScore} 
          onGameOver={handleGameOver} 
          highScore={highScore} 
          onShowLeaderboard={() => setShowLeaderboard(true)}
        />
      </main>

      {/* Floating Sidebar Widgets */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row items-end justify-between gap-4 z-20 pointer-events-none">
        {/* Left Side: Music Player */}
        <div className="pointer-events-auto w-full md:w-auto">
          <MusicPlayer />
        </div>

        {/* Right Side: Controls (Hidden on small screens to save space) */}
        <div className="hidden lg:flex flex-col gap-4 pointer-events-auto w-80">
          {/* Instructions */}
          <div className="bg-black/40 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-md">
            <h3 className="text-cyan-400 font-display font-bold mb-2 tracking-wider text-xs">CONTROLS</h3>
            <ul className="space-y-1.5 text-[10px] text-gray-300">
              <li className="flex items-center justify-between">
                <span>Move</span>
                <span className="text-fuchsia-400 font-mono">WASD / Arrows / Swipe</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Pause</span>
                <span className="text-cyan-300 font-mono">Space / Tap Center</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md">
            <button 
              onClick={() => setShowLeaderboard(false)}
              className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Leaderboard />
          </div>
        </div>
      )}
    </div>
  );
}
