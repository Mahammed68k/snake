import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  score: number;
  timestamp: any;
}

interface LeaderboardProps {
  provider: 'google' | 'facebook' | 'playgames' | 'guest';
  onClose?: () => void;
}

const backgrounds = ['b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc', 'd1d4f9', 'ffd5dc', 'b6e3f4', 'd1d4f9'];

export const getAvatarUrl = (name: string, index: number = 0) => {
  const bg = backgrounds[index % backgrounds.length];
  return `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bg}`;
};

const getHighResPhoto = (url?: string) => {
  if (!url) return undefined;
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=s\d+-c/, '=s400-c');
  }
  return url;
};

export default function Leaderboard({ provider, onClose }: LeaderboardProps) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = `leaderboard_${provider}`;
    const q = query(collection(db, path), orderBy('score', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LeaderboardEntry[];
      
      const uniqueScores: LeaderboardEntry[] = [];
      const seenUsers = new Set();
      
      for (const entry of allScores) {
        if (!seenUsers.has(entry.userId)) {
          uniqueScores.push(entry);
          seenUsers.add(entry.userId);
        }
        if (uniqueScores.length >= 10) break;
      }
      
      setScores(uniqueScores);
      setLoading(false);
    }, (error: any) => {
      if (error.code === 'permission-denied') handleFirestoreError(error, OperationType.LIST, path);
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [provider]);

  const topUser = scores[0];
  const isWinner = topUser && topUser.userId === auth.currentUser?.uid;

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#2e2671] to-[#141235] overflow-hidden relative flex flex-col font-sans">
      {/* Confetti Background */}
      <div className="absolute inset-x-0 top-0 h-64 pointer-events-none overflow-hidden opacity-80">
        <div className="absolute top-[10%] left-[20%] w-3 h-3 bg-fuchsia-500/80 rounded-sm rotate-12"></div>
        <div className="absolute top-[30%] left-[80%] w-4 h-4 bg-cyan-400/80 rounded-sm rotate-45"></div>
        <div className="absolute top-[40%] left-[40%] w-3 h-2 bg-yellow-400/80 rounded-sm rotate-[30deg]"></div>
        <div className="absolute top-[50%] left-[10%] w-2 h-4 bg-white/70 rounded-sm -rotate-12"></div>
        <div className="absolute top-[20%] right-[30%] w-4 h-2 bg-pink-500/80 rounded-sm -rotate-12"></div>
        <div className="absolute top-[60%] right-[15%] w-3 h-3 bg-purple-400/80 rounded-sm rotate-[-45deg]"></div>
        <div className="absolute top-[70%] left-[30%] w-4 h-3 bg-cyan-300/80 rounded-sm rotate-[60deg]"></div>
      </div>

      <div className="relative pt-16 px-8 pb-6 flex flex-col shrink-0">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center bg-transparent border border-white/20 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <svg className="w-5 h-5 pr-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        {/* Top Avatars */}
        {scores.length > 0 && (
          <div className="flex items-center mb-6 pl-2">
            <div className="flex items-center relative z-20">
              <span className="text-white font-black text-[2.5rem] leading-none drop-shadow-md mr-3">1<sup className="text-xl">ST</sup></span>
              <div className="w-28 h-28 rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)] bg-[#b6e3f4] ring-4 ring-[#2e2671]">
                 <img src={getHighResPhoto(scores[0]?.photoURL) || getAvatarUrl(scores[0]?.displayName || 'Top', 0)} alt="1st" className={`w-full h-full object-cover ${!scores[0]?.photoURL ? 'scale-110 mt-2' : ''}`} />
              </div>
            </div>
            
            <div className="flex -ml-4 z-10">
              {scores[1] && (
                <div className="w-[4.2rem] h-[4.2rem] rounded-full overflow-hidden shadow-lg border-[3px] border-[#2e2671] bg-[#c0aede] relative top-2">
                  <img src={getHighResPhoto(scores[1]?.photoURL) || getAvatarUrl(scores[1]?.displayName || '2nd', 1)} alt="2nd" className={`w-full h-full object-cover ${!scores[1]?.photoURL ? 'scale-110 mt-1' : ''}`} />
                </div>
              )}
              {scores[2] && (
                <div className="w-[4.2rem] h-[4.2rem] rounded-full overflow-hidden shadow-lg border-[3px] border-[#2e2671] bg-[#ffdfbf] -ml-3 relative -top-3">
                  <img src={getHighResPhoto(scores[2]?.photoURL) || getAvatarUrl(scores[2]?.displayName || '3rd', 2)} alt="3rd" className={`w-full h-full object-cover ${!scores[2]?.photoURL ? 'scale-110 mt-1' : ''}`} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1.5 opacity-90">
          <div className="w-[18px] h-[18px] bg-yellow-500 rounded flex items-center justify-center shadow-md">
            <svg className="w-2.5 h-2.5 text-[#141235]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <span className="text-xs font-bold text-gray-200 tracking-wider">Leaderboard</span>
        </div>
        
        <h2 className="text-[26px] font-black text-white mb-1.5 leading-tight tracking-tight">
          {scores.length > 0 && isWinner ? 'You are the winner!' : 'Top Players'}
        </h2>
        <p className="text-[#a0a5db] font-medium text-[15px] leading-snug">
          {provider === 'playgames' ? 'Play Games' : provider.charAt(0).toUpperCase() + provider.slice(1)} Division<br/>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="flex-1 bg-[#17153a] bg-opacity-95 overflow-y-auto custom-scrollbar border-t border-white/5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col">
            {scores.length === 0 ? (
               <p className="text-center text-[#a0a5db] py-8 text-sm">No scores yet. Be the first!</p>
            ) : (
              scores.map((entry, index) => {
                const isMe = entry.userId === auth.currentUser?.uid;
                return (
                  <div key={entry.id} className={`flex items-center px-6 py-3.5 border-b border-indigo-900/40 relative ${isMe ? 'bg-indigo-900/30' : ''}`}>
                    {isMe && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
                    )}
                    <span className="text-xl font-bold text-gray-200 w-6 tabular-nums text-right shrink-0">{index + 1}</span>
                    
                    <div className="w-[3.25rem] h-[3.25rem] rounded-full overflow-hidden ml-4 mr-4 bg-white/5 shrink-0 flex items-center justify-center">
                      <img src={getHighResPhoto(entry.photoURL) || getAvatarUrl(entry.displayName || 'Anon', index)} className={`w-full h-full object-cover ${!entry.photoURL ? 'scale-110 mt-1' : ''}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center">
                      {isMe && (
                        <div className="text-[10px] text-[#868bd4] font-bold tracking-wider mb-0.5 truncate uppercase">
                           You
                        </div>
                      )}
                      <div className={`text-[15px] font-bold truncate ${isMe ? 'text-white' : 'text-gray-100'}`}>
                        {entry.displayName || 'Anonymous'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-center shrink-0">
                      <span className="text-[17px] font-bold text-white tabular-nums tracking-tight">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
