import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  score: number;
  timestamp: any;
}

interface LeaderboardProps {
  provider: 'google' | 'facebook' | 'guest';
}

export default function Leaderboard({ provider }: LeaderboardProps) {
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

  return (
    <div className="w-full max-w-md bg-black/40 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm">
      <h3 className="text-cyan-400 font-display font-bold mb-4 tracking-wider text-lg flex items-center gap-2 uppercase">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        {provider} HIGH SCORES
      </h3>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No scores yet. Be the first!</p>
          ) : (
            scores.map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between text-sm bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-cyan-600'}`}>
                    #{index + 1}
                  </span>
                  <span className="text-gray-200 truncate max-w-[120px]">{entry.displayName || 'Anonymous'}</span>
                </div>
                <span className="text-fuchsia-400 font-mono font-bold">{entry.score.toString().padStart(4, '0')}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
