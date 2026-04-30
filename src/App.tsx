import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User, updateProfile, linkWithPopup } from 'firebase/auth';
import { collection, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Palette, MessageSquare } from 'lucide-react';
import SnakeGame from './components/SnakeGame';
import Login from './components/Login';
import Leaderboard from './components/Leaderboard';
import SettingsModal from './components/SettingsModal';
import IntroScreen from './components/IntroScreen';

interface GameSettings {
  gridSize: number;
  speed: number;
  theme: 'cyber' | 'plasma';
}

// Error Boundary Component
export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'intro' | 'menu' | 'playing'>('intro');

  const getUserProvider = (u: User | null): 'google' | 'facebook' | 'playgames' | 'guest' => {
    if (!u || u.isAnonymous) return 'guest';
    const storedProvider = localStorage.getItem('authProvider');
    if (storedProvider === 'playgames') return 'playgames';
    if (storedProvider === 'facebook') return 'facebook';
    if (storedProvider === 'google') return 'google';

    const providerId = u.providerData[0]?.providerId;
    if (providerId === 'facebook.com') return 'facebook';
    return 'google';
  };

  const handleSyncAccount = async (provider: 'google' | 'facebook' | 'playgames') => {
    if (!user) return;
    try {
      setSyncError(null);
      const authProvider = provider === 'google' ? googleProvider : facebookProvider;
      await linkWithPopup(user, authProvider);
      
      localStorage.setItem('authProvider', provider);
      
      // Sync the high score from guest to the new provider
      const guestScoreRef = doc(db, 'leaderboard_guest', user.uid);
      const guestScoreDoc = await getDoc(guestScoreRef);
      
      if (guestScoreDoc.exists()) {
        const newScoreRef = doc(db, `leaderboard_${provider}`, user.uid);
        const newScoreDoc = await getDoc(newScoreRef);
        
        const guestData = guestScoreDoc.data();
        
        if (!newScoreDoc.exists() || guestData.score > newScoreDoc.data().score) {
          await setDoc(newScoreRef, {
            ...guestData,
            timestamp: serverTimestamp()
          }, { merge: true });
        }
      }
      
      // Success! The user state will update automatically via onAuthStateChanged
      setShowProfileMenu(false);
    } catch (error: any) {
      console.error('Sync error:', error);
      if (error.code === 'auth/credential-already-in-use') {
        setSyncError('This account is already linked to another user.');
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setSyncError('Popup was closed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setSyncError('Popup blocked. Please allow popups.');
      } else if (error.code === 'auth/web-storage-unsupported' || error.code === 'auth/third-party-auth-error') {
        setSyncError('Third-party cookies are blocked. Please enable them.');
      } else {
        setSyncError(error.message || 'Failed to sync account.');
      }
    }
  };
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('snakeSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Handle legacy themes
      if (parsed.theme === 'classic') parsed.theme = 'plasma';
      if (parsed.theme === 'minimal' || parsed.theme === 'focus' || parsed.theme === 'normal') parsed.theme = 'cyber';
      return parsed;
    }
    return {
      gridSize: 15,
      speed: 150,
      theme: 'cyber'
    };
  });
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    localStorage.setItem('snakeSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        setNewName(currentUser.displayName || '');
        
        // Fetch high score from Firestore based on provider asynchronously
        const fetchHighScore = async () => {
          const provider = getUserProvider(currentUser);
          const collectionName = `leaderboard_${provider}`;
          const scoreRef = doc(db, collectionName, currentUser.uid);
          try {
            const scoreDoc = await getDoc(scoreRef);
            if (scoreDoc.exists()) {
              const dbScore = scoreDoc.data().score;
              setHighScore(dbScore);
            } else {
              setHighScore(0);
              // Reserve the name if it's already set (e.g. Google/Facebook)
              if (currentUser.displayName) {
                await setDoc(scoreRef, {
                  userId: currentUser.uid,
                  displayName: currentUser.displayName,
                  score: 0,
                  timestamp: serverTimestamp()
                });
              }
            }
          } catch (error) {
            console.error("Error fetching high score:", error);
          }
        };
        
        fetchHighScore();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      if (auth.currentUser) {
        setUser({ ...auth.currentUser } as User);
        setNewName(auth.currentUser.displayName || '');
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newName.trim() || isUpdating) return;

    const desiredName = newName.trim();
    const isGuest = auth.currentUser.isAnonymous;
    
    if (isGuest) {
      const isValidName = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{4,}$/.test(desiredName);
      if (!isValidName) {
        setNameError("Guest names must be at least 4 chars, 1 uppercase, 1 lowercase, and 1 number.");
        return;
      }
    }

    setIsUpdating(true);
    setNameError(null);
    const provider = getUserProvider(auth.currentUser);
    const collectionName = `leaderboard_${provider}`;
    const path = `${collectionName}/${auth.currentUser.uid}`;
    
    try {
      // Check if name is already taken across all providers
      const providers = ['google', 'facebook', 'playgames', 'guest'];
      let nameTaken = false;
      
      for (const p of providers) {
        const q = query(collection(db, `leaderboard_${p}`), where('displayName', '==', desiredName));
        const querySnapshot = await getDocs(q);
        
        // Make sure we don't count the current user's own document
        const otherUsersWithSameName = querySnapshot.docs.filter(doc => doc.id !== auth.currentUser!.uid);
        
        if (otherUsersWithSameName.length > 0) {
          nameTaken = true;
          break;
        }
      }
      
      if (nameTaken) {
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const suggestedName = `${desiredName}_${randomId}`.substring(0, 20);
        setNewName(suggestedName);
        setNameError(`Name is already taken. We suggested: ${suggestedName}`);
        setIsUpdating(false);
        return;
      }

      await updateProfile(auth.currentUser, { displayName: desiredName });
      
      // Update leaderboard entry if it exists, otherwise create it to reserve the name
      const scoreRef = doc(db, collectionName, auth.currentUser.uid);
      const scoreDoc = await getDoc(scoreRef);
      if (scoreDoc.exists()) {
        await setDoc(scoreRef, { displayName: desiredName }, { merge: true });
      } else {
        await setDoc(scoreRef, {
          userId: auth.currentUser.uid,
          displayName: desiredName,
          score: 0,
          timestamp: serverTimestamp()
        });
      }
      
      // Update local state
      setUser({ ...auth.currentUser } as User);
      setShowProfileModal(false);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      console.error("Error updating profile:", error);
      setNameError(error.message || "Failed to update name.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('authProvider');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !feedbackText.trim() || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Anonymous',
        text: feedbackText.trim(),
        timestamp: serverTimestamp()
      });
      setFeedbackSuccess(true);
      setFeedbackText('');
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.CREATE, 'feedback');
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleGameOver = async (finalScore: number) => {
    if (!user || finalScore === 0) return;
    
    const provider = getUserProvider(user);
    const collectionName = `leaderboard_${provider}`;
    const path = `${collectionName}/${user.uid}`;
    try {
      const scoreRef = doc(db, collectionName, user.uid);
      const scoreDoc = await getDoc(scoreRef);
      
      const displayName = user.displayName || (user.isAnonymous 
        ? 'Anonymous' 
        : (user.email?.split('@')[0] || 'Anonymous'));

      if (!scoreDoc.exists() || finalScore > scoreDoc.data().score) {
        await setDoc(scoreRef, {
          userId: user.uid,
          displayName,
          score: finalScore,
          timestamp: serverTimestamp()
        }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      console.error("Error saving score:", error);
    }
  };

  const handlePlayGame = () => {
    if (!user) return;
    
    const hasSeen = localStorage.getItem(`snake_has_seen_instructions_${user.uid}`);
    
    if (!hasSeen) {
      if (highScore > 0) {
        // Existing user who already has a score, don't bother them
        localStorage.setItem(`snake_has_seen_instructions_${user.uid}`, 'true');
        setGameState('playing');
      } else {
        // New user (or existing user with 0 score)
        setShowInstructions(true);
      }
    } else {
      setGameState('playing');
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
      {/* Floating Header / HUD - Hidden in Full Screen */}
      {!isFullScreen && gameState !== 'intro' && (
        <header className="absolute top-4 left-4 right-4 flex items-start justify-between z-20 pointer-events-none">
          <div className="flex flex-col pointer-events-auto text-center">
            {gameState === 'playing' && (
              <>
                <h1 className="text-2xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)] tracking-wider">
                  SNAKE
                </h1>
                <p className="text-cyan-300 font-display tracking-widest text-[10px] md:text-xs mt-0.5 opacity-80">
                  MK EDITION
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-4 pointer-events-auto relative">
            {/* Menu Toggle */}
            {gameState !== 'playing' && (
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2.5 bg-black/60 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-xl group"
                title="Settings"
              >
                {showProfileMenu ? (
                  <X className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <Settings className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" />
                )}
              </button>
            )}

            {/* Profile Dropdown Menu */}
            {showProfileMenu && gameState !== 'playing' && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute top-12 right-0 w-48 bg-black/90 border border-cyan-500/30 rounded-xl p-2 backdrop-blur-xl z-40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-bottom border-white/5 mb-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Account</p>
                    <p className="text-xs text-cyan-400 truncate font-mono">
                      {user.displayName || (user.isAnonymous ? 'Anonymous' : (user.email || 'User'))}
                    </p>
                  </div>

                  {!user.isAnonymous && (
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-colors group"
                    >
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Edit Name
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-wider text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors group drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                  >
                    <Palette className="w-4 h-4" />
                    THEME
                  </button>

                  <button
                    onClick={() => {
                      setShowFeedbackModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-wider text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors group drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    FEEDBACK
                  </button>

                  {user.isAnonymous && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="px-3 py-1 text-[9px] text-fuchsia-400 uppercase tracking-widest font-bold">Sync Progress</p>
                      <div className="flex flex-col gap-1 p-1">
                        <button
                          onClick={() => handleSyncAccount('google')}
                          className="w-full flex items-center gap-3 px-2 py-1.5 text-[10px] text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Link Google
                        </button>
                        <button
                          onClick={() => handleSyncAccount('facebook')}
                          className="w-full flex items-center gap-3 px-2 py-1.5 text-[10px] text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Link Facebook
                        </button>
                        <button
                          onClick={() => handleSyncAccount('playgames')}
                          className="w-full flex items-center gap-3 px-2 py-1.5 text-[10px] text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-[#34A853]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.2,11.3L5.4,2.7C4.8,2.4,4.2,2.8,4.2,3.5v17.1c0,0.7,0.6,1.1,1.2,0.8l14.8-8.6C20.8,12.5,20.8,11.6,20.2,11.3z M10.4,14.6 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C11.5,14.1,11,14.6,10.4,14.6z M10.4,11.6 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C11.5,11.1,11,11.6,10.4,11.6z M13.4,12.8 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C14.5,12.3,14,12.8,13.4,12.8z M13.4,16.4 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C14.5,15.9,14,16.4,13.4,16.4z"/>
                          </svg>
                          Link Play Games
                        </button>
                        {syncError && (
                          <p className="px-2 py-1 text-[8px] text-red-500 leading-tight">{syncError}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-white/5 my-1"></div>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-lg transition-colors group"
                  >
                    <svg className="w-4 h-4 text-fuchsia-500/50 group-hover:text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}

            {/* Score Display */}
            <div className={`flex gap-2 md:gap-3 items-stretch ${isGameOver ? 'hidden' : ''}`}>
              {gameState === 'playing' && (
                <>
                  <div className="bg-black/60 border border-cyan-500/50 rounded-xl px-3 py-1.5 md:px-5 md:py-2.5 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-xl border-l-4">
                    <p className="text-cyan-500/60 text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold mb-0.5 md:mb-1 text-center leading-[15px]" style={{ fontFamily: 'Times New Roman' }}>Current_Score</p>
                    <p className="text-xl md:text-[30px] font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] tabular-nums leading-none text-center" style={{ fontFamily: 'Times New Roman' }}>
                      {score.toString().padStart(4, '0')}
                    </p>
                  </div>
                  <div className="bg-black/60 border rounded-xl px-3 py-1.5 md:px-5 md:py-2.5 shadow-[0_0_25px_rgba(217,70,239,0.15)] backdrop-blur-xl border-l-4" style={{ borderColor: '#fb2a2a' }}>
                    <p className="text-fuchsia-500/60 text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-normal mb-0.5 md:mb-1 text-center leading-[15px]" style={{ fontFamily: 'Times New Roman' }}>High_Record</p>
                    <motion.p 
                      key={highScore}
                      initial={{ scale: 1.3, filter: 'brightness(1.5)' }}
                      animate={{ scale: 1, filter: 'brightness(1)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      className="text-lg md:text-2xl lg:text-3xl font-black text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)] tabular-nums leading-none text-center" 
                      style={{ borderColor: '#ff6a6a', fontFamily: 'Times New Roman' }}
                    >
                      {highScore.toString().padStart(4, '0')}
                    </motion.p>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Exit Full Screen Button */}
      {isFullScreen && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-4 animate-in fade-in duration-500">
          {gameState === 'playing' && (
            <div className="bg-black/60 border border-cyan-500/50 rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
              <p className="text-gray-400 text-[9px] uppercase tracking-widest mb-0.5">Score</p>
              <p className="text-xl font-display font-bold text-cyan-400">
                {score.toString().padStart(4, '0')}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsFullScreen(false)}
            className="bg-black/60 border border-red-500/50 hover:bg-red-500/20 text-red-400 p-3 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-md"
            title="Exit Full Screen (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Game Area - Full Screen Centered */}
      <main className={`relative z-10 w-full h-full flex items-center justify-center transition-all duration-500 ${isFullScreen ? 'p-0' : 'p-4 md:p-12 landscape:p-2'}`}>
        <AnimatePresence mode="wait">
          {gameState === 'intro' ? (
            <IntroScreen key="intro" onComplete={() => setGameState('menu')} />
          ) : gameState === 'playing' ? (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full h-full flex items-center justify-center"
            >
              <SnakeGame 
                onScoreChange={setScore} 
                onGameOver={handleGameOver} 
                onGameOverStateChange={setIsGameOver}
                highScore={highScore} 
                onShowLeaderboard={() => setShowLeaderboard(true)}
                onReturnToMenu={() => setGameState('menu')}
                isFullScreen={isFullScreen}
                gridSize={settings.gridSize}
                speed={settings.speed}
                theme={settings.theme}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center gap-12"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <h1 className="text-6xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_20px_rgba(217,70,239,0.5)] tracking-wider mb-2">
                  SNAKE
                </h1>
                <p className="text-cyan-300 font-display tracking-[0.5em] text-sm md:text-xl opacity-80">
                  MK EDITION
                </p>
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-4 w-full max-w-[300px]"
              >
                <button
                  onClick={handlePlayGame}
                  className="w-full px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95"
                >
                  PLAY GAME
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="w-full px-8 py-4 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-400 border border-fuchsia-500/50 font-bold text-xl rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  LEADERBOARD
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Sidebar Widgets - Hidden in Full Screen */}
      {!isFullScreen && gameState === 'playing' && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row items-end justify-end gap-4 z-20 pointer-events-none">
          {/* Right Side: Controls (Hidden on small screens to save space) */}
        </div>
      )}

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
            <Leaderboard provider={getUserProvider(user)} />
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm bg-black/90 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-display font-bold text-cyan-400 mb-6 tracking-wider">
              USER NAME
            </h2>
            
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Display Name</label>
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="Min 4 chars, 1 uppercase, 1 lowercase, 1 number..."
                  className={`w-full bg-white/5 border ${nameError ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-700`}
                  minLength={user?.isAnonymous ? 4 : undefined}
                  maxLength={20}
                  required
                />
                {nameError && (
                  <p className="text-red-400 text-xs mt-2 ml-1">{nameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isUpdating || !newName.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm tracking-widest"
              >
                {isUpdating ? 'UPDATING...' : 'SAVE CHANGES'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-sm bg-black/90 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <h2 className="text-xl font-display font-bold text-cyan-400 mb-6 text-center tracking-wider">HOW TO PLAY</h2>
            
            <div className="space-y-6 mb-8 text-gray-300">
              <div className="flex flex-col items-center gap-3 text-center">
                {('ontouchstart' in window || navigator.maxTouchPoints > 0) ? (
                  <>
                    <div className="flex items-center justify-center gap-6 mb-2">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">Swipe</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">Swipe</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <span className="text-[10px] uppercase tracking-widest text-fuchsia-500 font-bold">Tap</span>
                      </div>
                    </div>
                    <p className="font-medium text-lg text-white">Swipe to Move</p>
                    <p className="text-sm">Swipe anywhere to move. Tap the center to pause.</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-6 mb-2">
                      {/* WASD */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-sm">W</div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-sm">A</div>
                          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-sm">S</div>
                          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-sm">D</div>
                        </div>
                      </div>
                      <span className="text-cyan-500/50 text-xs font-bold uppercase">or</span>
                      {/* Arrows */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">↑</div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">←</div>
                          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">↓</div>
                          <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">→</div>
                        </div>
                      </div>
                    </div>
                    <p className="font-medium text-lg text-white">Use Keyboard</p>
                    <p className="text-sm">Use the Arrow keys or W, A, S, D to control the snake's direction.</p>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="w-3 h-3 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]"></div>
                <p className="text-sm">Eat the glowing food to grow longer and increase your score.</p>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="w-4 h-4 rounded-sm border-2 border-red-500/50 bg-red-500/20"></div>
                <p className="text-sm">Avoid hitting your own tail or obstacles!</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                if (user) {
                  localStorage.setItem(`snake_has_seen_instructions_${user.uid}`, 'true');
                }
                setShowInstructions(false);
                setGameState('playing');
              }}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 tracking-widest text-sm"
            >
              GOT IT, LET'S PLAY!
            </button>
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <SettingsModal 
            settings={settings}
            onUpdate={setSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#111] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <h2 className="text-2xl font-display font-bold text-cyan-400 mb-2">Help & Feedback</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you frustrated with something? Have an idea to improve the game? Let us know!
            </p>
            
            {feedbackSuccess ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-400 font-bold mb-2">Thank you!</p>
                <p className="text-gray-300 text-sm mb-4">Your feedback has been submitted successfully.</p>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackSuccess(false);
                  }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-4">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none h-32"
                  required
                />
                
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackText.trim()}
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingFeedback ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
