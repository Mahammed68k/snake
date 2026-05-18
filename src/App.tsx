import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { onAuthStateChanged, signOut, User, updateProfile, linkWithPopup } from 'firebase/auth';
import { collection, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs, addDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider, testFirestoreConnection } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Palette, MessageSquare } from 'lucide-react';

const SnakeGame = lazy(() => import('./components/SnakeGame'));
const Login = lazy(() => import('./components/Login'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

import { getAvatarUrl } from './lib/avatarUtils';

interface GameSettings {
  gridSize: number;
  speed: number;
  theme: 'cyber' | 'plasma';
}

// Error Boundary Component
export default function App() {
  const [score, setScore] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [divisionRecord, setDivisionRecord] = useState(0);
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
  const [isOffline, setIsOffline] = useState(false);
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const prevUserUid = React.useRef<string | null>(null);

  const getUserProvider = (u: User | null): 'google' | 'facebook' | 'playgames' | 'guest' => {
    if (!u || u.isAnonymous) return 'guest';
    
    // Check providerData first as it is the most reliable current state
    for (const data of u.providerData) {
      if (data.providerId === 'facebook.com') return 'facebook';
      if (data.providerId === 'google.com') return 'google';
      // Some versions of Play Games might use different provider strings
      if (data.providerId.includes('play') || data.providerId.includes('games')) return 'playgames';
    }

    const storedProvider = localStorage.getItem('authProvider');
    if (storedProvider === 'playgames' || storedProvider === 'facebook' || storedProvider === 'google') {
      return storedProvider as any;
    }

    return 'google';
  };

  const getPhotoURL = (u: User | null): string | null => {
    if (!u) return null;
    
    // Facebook URLs often break or expire, so ignore them to fallback to Dicebear avatars
    const hasFacebook = u.providerData.some(p => p.providerId === 'facebook.com');
    if (hasFacebook) return null;

    let url = u.photoURL;
    if (!url) {
      for (const provider of u.providerData) {
        if (provider.photoURL) {
          url = provider.photoURL;
          break;
        }
      }
    }
    
    if (url && (url.includes('facebook') || url.includes('graph.facebook.com') || url.includes('fbsbx.com'))) {
      return null;
    }
    
    if (url && url.includes('googleusercontent.com')) {
      url = url.replace(/=s\d+-c/, '=s400-c');
    }
    
    return url || null;
  };

  const handleSyncAccount = async (provider: 'google' | 'facebook' | 'playgames') => {
    if (!user) return;
    try {
      setSyncError(null);
      const guestScoreRef = doc(db, 'leaderboard_guest', user.uid);
      const guestScoreDoc = await getDoc(guestScoreRef);
      const guestData = guestScoreDoc.exists() ? guestScoreDoc.data() : null;

      const authProvider = provider === 'google' ? googleProvider : facebookProvider;
      let targetUid = user.uid;

      try {
        await linkWithPopup(user, authProvider);
      } catch (linkError: any) {
        const errString = typeof linkError === 'string' ? linkError : (linkError?.message || '');
        if (linkError?.code === 'auth/credential-already-in-use' || errString.includes('credential-already-in-use')) {
          // The account exists, simply sign in with it popup
          import('firebase/auth').then(async ({ signInWithPopup }) => {
            try {
              const result = await signInWithPopup(auth, authProvider);
              targetUid = result.user.uid;
              localStorage.setItem('authProvider', provider);
              
              if (guestData) {
                const newScoreRef = doc(db, `leaderboard_${provider}`, targetUid);
                const newScoreDoc = await getDoc(newScoreRef);
                if (!newScoreDoc.exists() || guestData.score > newScoreDoc.data().score) {
                  await setDoc(newScoreRef, {
                    ...guestData,
                    displayName: result.user.displayName || guestData.displayName,
                    photoURL: getPhotoURL(result.user),
                    timestamp: serverTimestamp()
                  }, { merge: true });
                }
              }
              
              setShowProfileMenu(false);
            } catch (innerErr: any) {
               console.error('Inner sign in error:', innerErr);
               setSyncError(innerErr.message || 'Failed to sign in.');
            }
          });
          return; // Early return since we handled async inside then()
        } else {
          throw linkError;
        }
      }
      
      localStorage.setItem('authProvider', provider);
      
      if (guestData) {
        const newScoreRef = doc(db, `leaderboard_${provider}`, targetUid);
        const newScoreDoc = await getDoc(newScoreRef);
        
        if (!newScoreDoc.exists() || guestData.score > newScoreDoc.data().score) {
          await setDoc(newScoreRef, {
            ...guestData,
            displayName: auth.currentUser?.displayName || guestData.displayName,
            photoURL: getPhotoURL(auth.currentUser),
            timestamp: serverTimestamp()
          }, { merge: true });
        }
      }
      
      // Success! The user state will update automatically via onAuthStateChanged
      setShowProfileMenu(false);
    } catch (error: any) {
      const errString = typeof error === 'string' ? error : (error?.message || '');
      const isPopupClosed = error?.code === 'auth/popup-closed-by-user' || 
                            error?.code === 'auth/cancelled-popup-request' ||
                            errString.includes('popup-closed-by-user') ||
                            errString.includes('cancelled-popup-request');

      if (isPopupClosed) {
        setSyncError(null);
        return;
      }
      
      console.error('Sync error:', error);
      if (error?.code === 'auth/popup-blocked' || errString.includes('popup-blocked')) {
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };
  const [isGameOver, setIsGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    localStorage.setItem('snakeSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (score > personalBest) {
      setPersonalBest(score);
    }
  }, [score, personalBest]);

  useEffect(() => {
    if (score > divisionRecord) {
      // Immediate session update if player beats the current leaderboard record
      setDivisionRecord(score);
    }
  }, [score, divisionRecord]);

  useEffect(() => {
    // Delay non-critical connectivity check slightly to prioritize initial render
    const timer = setTimeout(() => {
      testFirestoreConnection().then(connected => {
        setIsOffline(!connected);
      });
    }, 2000);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const scoreRef = React.useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    // Reset division record when user identity changes
    setDivisionRecord(scoreRef.current);
    
    let innerUnsubscribe: (() => void) | null = null;
    
    // Fetch Division Record (1st Position) for current provider
    const provider = getUserProvider(auth.currentUser || user);
    
    // Delay non-critical data fetching
    const timer = setTimeout(() => {
      const q = query(collection(db, `leaderboard_${provider}`), orderBy('score', 'desc'), limit(1));
      const unsubscribeEffect = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const dbRecord = snapshot.docs[0].data().score || 0;
          setDivisionRecord(prev => Math.max(scoreRef.current, dbRecord));
        } else {
          setDivisionRecord(scoreRef.current);
        }
      }, (err) => {
        console.warn(`Division record fetch failed for ${provider}`, err);
      });
      innerUnsubscribe = unsubscribeEffect;
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (innerUnsubscribe) innerUnsubscribe();
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Immediate state updates
      setUser(currentUser);
      setLoading(false);
      
      // Reset scores when user truly changes (identity change)
      if (currentUser?.uid !== prevUserUid.current) {
        setScore(0);
        
        // Update appropriate local score for the current identity
        const storageKey = currentUser ? `snakeHighScore_${currentUser.uid}` : 'snakeHighScore_guest';
        const saved = localStorage.getItem(storageKey) || '0';
        const initialScore = parseInt(saved, 10);
        setPersonalBest(initialScore);
        
        // If we have a current session score, compare it
        if (score > initialScore) {
          setPersonalBest(score);
          localStorage.setItem(storageKey, score.toString());
        }

        prevUserUid.current = currentUser?.uid || null;
      }
      
      if (currentUser) {
        setNewName(currentUser.displayName || '');

        // Update local cache for Login screen personalization
        if (!currentUser.isAnonymous) {
          const profile = {
            name: currentUser.displayName || 'Player',
            email: currentUser.email || '',
            photo: getPhotoURL(currentUser)
          };
          localStorage.setItem('last_user_profile', JSON.stringify(profile));
        }
        
        // Fetch high score from Firestore based on provider asynchronously
        const fetchHighScore = async () => {
          let currentProvider = getUserProvider(currentUser);
          
          const fetchFromProvider = async (p: string) => {
            const collectionName = `leaderboard_${p}`;
            const scoreRef = doc(db, collectionName, currentUser.uid);
            try {
              const scoreDoc = await getDoc(scoreRef);
              if (scoreDoc.exists()) {
                return scoreDoc.data().score as number;
              }
            } catch (err) {
              console.warn(`Failed to fetch from ${collectionName}`, err);
            }
            return null;
          };

          try {
            // Check all possible collections to find the absolute highest score recorded for this identity
            const possibleProviders = ['google', 'facebook', 'playgames', 'guest'];
            let absoluteMaxDbScore = -1;

            for (const p of possibleProviders) {
              const s = await fetchFromProvider(p);
              if (s !== null && s > absoluteMaxDbScore) {
                absoluteMaxDbScore = s;
              }
            }

            // Sync logic: Cloud vs Local
            const localHighScoreKey = `snakeHighScore_${currentUser.uid}`;
            const localBest = parseInt(localStorage.getItem(localHighScoreKey) || '0', 10);
            
            // Source of Truth logic
            // If the database has a score (even if manually lowered), prefer it over local storage so manual edits apply.
            let finalSyncScore = absoluteMaxDbScore >= 0 ? absoluteMaxDbScore : Math.max(localBest, 0);

            setPersonalBest(finalSyncScore);
            localStorage.setItem(localHighScoreKey, finalSyncScore.toString());
            
            // We only need to write back to the database if we actually had to fall back to the local score (meaning it wasn't in DB)
            // or if we just want to update the profile information.
            const scoreRef = doc(db, `leaderboard_${currentProvider}`, currentUser.uid);
            const dataToWrite: any = {
              userId: currentUser.uid,
              displayName: currentUser.displayName || 'Player',
              photoURL: getPhotoURL(currentUser) || '',
              timestamp: serverTimestamp()
            };
            
            if (absoluteMaxDbScore < 0) {
              dataToWrite.score = finalSyncScore;
            }
            // Do not override user's score unconditionally here to respect manual database changes.
            await setDoc(scoreRef, dataToWrite, { merge: true }).catch((error) => console.error("Error setting initial score:", error));

          } catch (error) {
            console.error("Error fetching high score:", error);
          }
        };
        
        fetchHighScore();
      } else {
        // Guest mode
        const saved = localStorage.getItem('snakeHighScore_guest') || '0';
        setPersonalBest(parseInt(saved, 10));
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

  const stateRef = useRef({
    showLeaderboard,
    showSettings,
    showProfileModal,
    showFeedbackModal,
    showProfileMenu,
    isFullScreen,
    gameState
  });

  useEffect(() => {
    stateRef.current = {
      showLeaderboard,
      showSettings,
      showProfileModal,
      showFeedbackModal,
      showProfileMenu,
      isFullScreen,
      gameState
    };
  }, [showLeaderboard, showSettings, showProfileModal, showFeedbackModal, showProfileMenu, isFullScreen, gameState]);

  // Handle System Back Button (Edge swipe on Android/iOS via History API)
  useEffect(() => {
    window.history.pushState({ page: 'start' }, '');
    window.history.pushState({ page: 'main' }, '');

    const handlePopState = (e: PopStateEvent) => {
      const s = stateRef.current;
      let actionTaken = false;

      if (s.showLeaderboard) { setShowLeaderboard(false); actionTaken = true; }
      if (s.showSettings) { setShowSettings(false); actionTaken = true; }
      if (s.showProfileModal) { setShowProfileModal(false); actionTaken = true; }
      if (s.showFeedbackModal) { setShowFeedbackModal(false); actionTaken = true; }
      if (s.showProfileMenu) { setShowProfileMenu(false); actionTaken = true; }
      if (s.isFullScreen) { setIsFullScreen(false); actionTaken = true; }
      if (s.gameState === 'playing') { 
        setGameState('menu'); 
        actionTaken = true; 
      }

      if (actionTaken) {
        // If we closed a modal, push 'main' again so the next back press is also intercepted
        window.history.pushState({ page: 'main' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Back gesture: Swipe from left or right edge to go back (fallback for non-native browsers)
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      const isRightEdgeSwipe = startX > window.innerWidth - 40 && deltaX < -60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
      const isLeftEdgeSwipe = startX < 40 && deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

      if (isRightEdgeSwipe || isLeftEdgeSwipe) {
        if (showLeaderboard) setShowLeaderboard(false);
        else if (showSettings) setShowSettings(false);
        else if (showProfileModal) setShowProfileModal(false);
        else if (showFeedbackModal) setShowFeedbackModal(false);
        else if (showProfileMenu) setShowProfileMenu(false);
        else if (isFullScreen) setIsFullScreen(false);
        else if (gameState === 'playing') {
          setGameState('menu');
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showLeaderboard, showSettings, showProfileModal, showFeedbackModal, showProfileMenu, isFullScreen, gameState]);

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
          photoURL: getPhotoURL(auth.currentUser),
          score: 0,
          timestamp: serverTimestamp()
        });
      }
      
      // Update local state
      setUser(auth.currentUser);
      window.dispatchEvent(new Event('profileUpdated')); // Optional event to trigger re-renders
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
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.disableAutoSelect();
      }
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
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Always use fresh auth object to avoid stale closures
    const provider = getUserProvider(currentUser);
    const collectionName = `leaderboard_${provider}`;
    const path = `${collectionName}/${currentUser.uid}`;
    const scoreRef = doc(db, collectionName, currentUser.uid);
    const displayName = currentUser.displayName || (currentUser.isAnonymous 
      ? 'Anonymous' 
      : (currentUser.email?.split('@')[0] || 'Anonymous'));

    if (finalScore > personalBest) {
      setPersonalBest(finalScore);
      localStorage.setItem(currentUser ? `snakeHighScore_${currentUser.uid}` : 'snakeHighScore_guest', finalScore.toString());
    }

    try {
      const scoreDoc = await getDoc(scoreRef);
      const dbScore = scoreDoc.exists() ? (scoreDoc.data().score || 0) : 0;

      if (finalScore > dbScore) {
        await setDoc(scoreRef, {
          userId: currentUser.uid,
          displayName,
          photoURL: getPhotoURL(currentUser) || '',
          score: finalScore,
          timestamp: serverTimestamp()
        }, { merge: true });
        console.log("Score saved successfully to", collectionName);
      } else if (finalScore > 0 || scoreDoc.exists()) {
        // Just update profile in case it changed without overriding score
        await setDoc(scoreRef, {
          userId: currentUser.uid,
          displayName,
          photoURL: getPhotoURL(currentUser) || '',
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
      if (personalBest > 0) {
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

  const currentProvider = getUserProvider(auth.currentUser || user);
  const providerDisplayName = currentProvider === 'google' ? 'Google' : currentProvider === 'facebook' ? 'Facebook' : currentProvider === 'playgames' ? 'Play Games' : 'Guest';
  const recordLabelText = `${providerDisplayName.toUpperCase()}_TOP`;

  const renderAppContent = () => {
    if (loading) {
      return (
        <main className="fixed inset-0 h-[100dvh] bg-[#050505] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </main>
      );
    }

    if (!user) {
      return (
        <Suspense fallback={<div className="fixed inset-0 bg-[#050505]" />}>
          <Login />
        </Suspense>
      );
    }

    return (
      <main className="fixed inset-0 h-[100dvh] w-screen bg-[#050505] overflow-hidden flex items-center justify-center font-sans p-0 m-0">
      {/* Offline Warning Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-500/90 backdrop-blur-md px-4 py-2 text-center"
          >
            <p className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Offline Mode: Connection to Leaderboard currently unavailable
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Header / HUD - Hidden in Full Screen */}
      {!isFullScreen && (
        <header className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex flex-col pointer-events-auto">
            {gameState === 'playing' && (
              <div className="flex flex-col items-start translate-y-1" style={{ fontFamily: 'Times New Roman' }}>
                <h1 className="text-2xl md:text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-fuchsia-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] tracking-widest leading-none">
                  SNAKE
                </h1>
                <p className="text-white font-display tracking-[0.3em] text-[8px] md:text-[10px] mt-1 font-bold opacity-90">
                  MK EDITION
                </p>
              </div>
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
                <div className="absolute top-12 right-0 w-56 bg-black/90 border border-cyan-500/30 rounded-xl p-2 backdrop-blur-xl z-40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-bottom border-white/5 mb-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
                      {getPhotoURL(user) ? (
                        <img src={getPhotoURL(user)!} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <img src={getAvatarUrl(user.displayName || (user.isAnonymous ? 'Anon' : (user.email || 'Anon')), 0)} alt="Profile" className="w-full h-full object-cover scale-110 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white uppercase tracking-widest font-black">Account</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-cyan-300 truncate font-mono">
                          {user.displayName || (user.isAnonymous ? 'Anonymous' : (user.email || 'User'))}
                        </p>
                        {!user.isAnonymous && (
                          <button
                            onClick={() => {
                              setShowProfileModal(true);
                              setShowProfileMenu(false);
                            }}
                            className="p-1 text-gray-300 hover:text-cyan-400 transition-colors ml-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

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
                      <p className="px-3 py-1 text-[9px] text-fuchsia-400 uppercase tracking-widest font-bold">🔗 Bind Account</p>
                      <div className="flex flex-row gap-1 p-1">
                        <button
                          onClick={() => handleSyncAccount('google')}
                          className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 text-[10px] text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Google
                        </button>
                        <button
                          onClick={() => handleSyncAccount('facebook')}
                          className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 text-[10px] text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
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

            {/* Unified Score Display */}
            <div className={`${isGameOver ? 'hidden' : ''}`}>
              {gameState === 'playing' && (
                <div className="flex flex-col items-end gap-3 pointer-events-auto">
                  <div role="status" className="relative group pointer-events-auto" style={{ fontFamily: 'Times New Roman' }}>
                    {/* Outer Glow Effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-[14px] opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-500" />
                    
                    <div className="relative bg-[#0a0a0a]/95 border border-white/20 rounded-[12px] px-4 py-2 md:px-6 md:py-2.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-5 md:gap-7 overflow-hidden">
                      {/* Top Highlight line */}
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                      
                      {/* Current Score Column */}
                      <div className="flex flex-col items-center min-w-[45px] md:min-w-[60px] relative z-10">
                        <p className="text-cyan-400 text-[6px] md:text-[8px] font-bold tracking-[0.2em] mb-1 uppercase opacity-100" style={{ fontFamily: 'Times New Roman' }}>CURRENT</p>
                        <p className="text-lg md:text-2xl lg:text-3xl font-black text-white tabular-nums leading-none tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" style={{ fontFamily: 'Times New Roman' }}>
                          {score.toString().padStart(4, '0')}
                        </p>
                      </div>
                      
                      {/* Vertical Divider - High Quality Styling */}
                      <div className="relative w-[1px] h-8 md:h-10">
                        <div className="absolute inset-0 bg-white/20" />
                        <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-white/50 to-transparent" />
                      </div>
                      
                      {/* Division Record Column */}
                      <div className="flex flex-col items-center min-w-[45px] md:min-w-[60px] relative z-10">
                        <p className="text-yellow-400 text-[6px] md:text-[8px] font-bold tracking-[0.2em] mb-1 uppercase opacity-100" style={{ fontFamily: 'Times New Roman' }}>{recordLabelText}</p>
                        <p 
                          className="text-lg md:text-2xl lg:text-3xl font-black text-yellow-100 tabular-nums leading-none tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" 
                          style={{ fontFamily: 'Times New Roman' }}
                        >
                          {divisionRecord.toString().padStart(4, '0')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Desktop Controls Info Card - Bottom Right */}
      {gameState === 'playing' && !isGameOver && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden xl:flex fixed bottom-6 right-6 flex-col gap-2 bg-black/60 border border-white/5 rounded-xl p-3 backdrop-blur-xl border-r-4 border-r-gray-500/30 z-[50]"
        >
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">In-Game Commands</p>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-10">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Move</span>
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono text-cyan-300">WASD</span>
                <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono text-cyan-300">ARROWS</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-10">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pause</span>
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono text-fuchsia-400">P</span>
                <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono text-fuchsia-400">SPACE</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-10">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Menu</span>
              <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono text-red-400">ESC</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Exit Full Screen Button */}
      {isFullScreen && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-4 animate-in fade-in duration-500">
          {gameState === 'playing' && (
            <div className="bg-black/60 border border-cyan-500/50 rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
              <p className="text-white text-[9px] uppercase tracking-widest mb-0.5 font-black">Score</p>
              <p className="text-xl font-display font-bold text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                {score.toString().padStart(4, '0')}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsFullScreen(false)}
            className="bg-black/60 border border-red-500/50 hover:bg-red-500/20 text-red-400 p-3 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-md"
            title="Exit Full Screen (Esc)"
          >
            <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Game Area - Full Screen Centered */}
      <main 
        className={`relative z-10 w-full h-full flex items-center justify-center transition-all duration-500 mx-auto ${isFullScreen ? 'p-0' : 'max-w-[375px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1200px] px-0 py-20 md:p-12 landscape:p-4'}`}
      >
        <AnimatePresence mode="wait">
          <Suspense fallback={null}>
            {gameState === 'playing' ? (
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
                  highScore={personalBest} 
                  onShowLeaderboard={() => setShowLeaderboard(true)}
                  onReturnToMenu={() => setGameState('menu')}
                  isFullScreen={isFullScreen}
                  gridSize={settings.gridSize}
                  speed={settings.speed}
                  theme={settings.theme}
                  userId={user.uid}
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
                  <p className="text-cyan-200 font-display tracking-[0.5em] text-sm md:text-xl">
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
                  aria-label="Start playing the game"
                  className="w-full px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95"
                >
                  PLAY GAME
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  aria-label="Open global leaderboard"
                  className="w-full px-8 py-4 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 border border-fuchsia-500/50 font-bold text-xl rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  LEADERBOARD
                </button>
                </motion.div>
              </motion.div>
            )}
          </Suspense>
        </AnimatePresence>
      </main>

      {/* Floating Sidebar Widgets - Hidden in Full Screen */}
      {!isFullScreen && gameState === 'playing' && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row items-end justify-end gap-4 z-20 pointer-events-none">
          {/* Right Side: Controls (Hidden on small screens to save space) */}
        </div>
      )}

      {/* Leaderboard Modal */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-200 ${showLeaderboard ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="relative w-full h-[100dvh] max-w-2xl mx-auto flex flex-col">
          <Suspense fallback={null}>
            {showLeaderboard && user && <Leaderboard provider={getUserProvider(user)} onClose={() => setShowLeaderboard(false)} />}
          </Suspense>
        </div>
      </div>

      {/* Settings Modal */}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal 
            settings={settings} 
            onUpdate={setSettings} 
            onClose={() => setShowSettings(false)} 
            isFullscreen={isFullScreen}
            onToggleFullscreen={toggleFullScreen}
          />
        )}
      </Suspense>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm bg-black/90 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button 
              onClick={() => setShowProfileModal(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-display font-bold text-cyan-400 mb-6 tracking-wider">
              USER NAME
            </h2>
            
            <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
                <label className="block text-[10px] text-white uppercase tracking-widest mb-1.5 ml-1 font-black">Display Name</label>
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="Min 4 chars, 1 uppercase, 1 lowercase, 1 number..."
                  className={`w-full bg-white/5 border ${nameError ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-500`}
                  minLength={user?.isAnonymous ? 4 : undefined}
                  maxLength={20}
                  required
                />
                {nameError && (
                  <p className="text-red-400 text-xs mt-2 ml-1 font-medium">{nameError}</p>
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
                      <span className="text-cyan-400 text-xs font-bold uppercase">or</span>
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
            isFullscreen={isFullScreen}
            onToggleFullscreen={toggleFullScreen}
          />
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#111] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <h2 className="text-2xl font-display font-bold text-cyan-400 mb-2">Help & Feedback</h2>
            <p className="text-gray-200 text-sm mb-6">
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
    </main>
    );
  };

  return renderAppContent();
}
