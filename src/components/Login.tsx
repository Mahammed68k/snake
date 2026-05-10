import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup, signInAnonymously, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, facebookProvider, db } from '../firebase';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [showDesktopPopup, setShowDesktopPopup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cachedUser, setCachedUser] = useState<{name: string, email: string, photo: string | null} | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Handle system back button (and native edge swipes on mobile)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.modal === 'none' || !e.state) {
        if (showPrivacy) setShowPrivacy(false);
        if (showTerms) setShowTerms(false);
        if (showDesktopPopup && cachedUser && !showGuestInput) setShowDesktopPopup(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPrivacy, showTerms, showDesktopPopup, cachedUser, showGuestInput]);

  const openPrivacy = () => {
    window.history.pushState({ modal: 'privacy' }, '');
    setShowPrivacy(true);
  };

  const openTerms = () => {
    window.history.pushState({ modal: 'terms' }, '');
    setShowTerms(true);
  };

  const closePrivacy = () => {
    if (window.history.state?.modal === 'privacy') window.history.back();
    else setShowPrivacy(false);
  };

  const closeTerms = () => {
    if (window.history.state?.modal === 'terms') window.history.back();
    else setShowTerms(false);
  };

  const openDesktopPopup = () => {
    window.history.pushState({ modal: 'desktopPopup' }, '');
    setShowDesktopPopup(true);
  };

  const closeDesktopPopup = () => {
    if (window.history.state?.modal === 'desktopPopup') window.history.back();
    else setShowDesktopPopup(false);
  };

  // Load cached user info for personalization

  useEffect(() => {
    // Only access localStorage once on mount
    try {
      const saved = localStorage.getItem('last_user_profile');
      if (saved) {
        let profile = JSON.parse(saved);
        if (profile.photo && (profile.photo.includes('ui-avatars.com') || profile.photo.includes('dicebear'))) {
          profile.photo = null;
        }
        setCachedUser(profile);
        // Defer showing the popup slightly to prioritize main UI render
        const timer = setTimeout(() => setShowDesktopPopup(true), 100);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Failed to load cached user profile');
    }
  }, []);

  const handleOneTapLogin = async () => {
    setIsVerifying(true);
    // Add a slight delay to show the "Verifying..." state before opening popup
    setTimeout(async () => {
      try {
        await handleGoogleLogin();
      } catch (error) {
        setIsVerifying(false);
      }
    }, 1200);
  };

  // Reset loading state after 1 minute as a safety fallback for stuck mobile popups
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loadingProvider) {
      timeoutId = setTimeout(() => {
        setLoadingProvider(null);
      }, 1000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadingProvider]);

  const handleSocialLoginError = (err: any, providerName: string) => {
    const errString = typeof err === 'string' ? err : (err?.message || '');
    const isPopupClosed = err?.code === 'auth/popup-closed-by-user' || 
                          err?.code === 'auth/cancelled-popup-request' ||
                          errString.includes('popup-closed-by-user') || 
                          errString.includes('cancelled-popup-request');
                          
    if (isPopupClosed) {
      setError(null);
      return; 
    }
    
    console.error(err);
    if (err?.code === 'auth/popup-blocked' || errString.includes('popup-blocked')) {
      setError('Popup was blocked by your browser. Please allow popups for this site, or Play as Guest.');
      return;
    }
    if (err.code === 'auth/web-storage-unsupported' || err.code === 'auth/third-party-auth-error') {
      setError('Your browser is blocking third-party cookies. Please enable them in your browser settings, or Play as Guest.');
      return;
    }
    if (err.code === 'auth/network-request-failed') {
      setError('Network error. Please check your internet connection and try again.');
      return;
    }
    if (err.message && err.message.includes('Invalid Scopes: email')) {
      setError('Facebook App Setup Error: The "email" permission is missing or not configured correctly in your Meta Developer Dashboard. Make sure you clicked "Save changes", and your Facebook account is listed in "App Roles".');
      return;
    }
    
    if (err.code === 'auth/invalid-credential-or-provider-id') {
      setError('Invalid Facebook App ID or configuration. Ensure "Save changes" was clicked in the Meta Dashboard and your Redirect URI is fully saved.');
      return;
    }
    setError(err.message || `Failed to sign in with ${providerName}`);
  };

  const getBestPhotoURL = (u: any): string | null => {
    if (!u) return null;
    let url = u.photoURL;
    if (!url && u.providerData && u.providerData.length > 0) {
      for (const provider of u.providerData) {
        if (provider.photoURL) {
          url = provider.photoURL;
          break;
        }
      }
    }
    if (url && url.includes('googleusercontent.com')) {
      url = url.replace(/=s\d+-c/, '=s256-c'); // Use a decent resolution
    }
    return url;
  };

  const handleGoogleLogin = async () => {
    if (loadingProvider) return;
    try {
      setError(null);
      setLoadingProvider('google');
      const result = await signInWithPopup(auth, googleProvider);
      
      // Cache profile for next time
      const user = result.user;
      if (user) {
        const profile = {
          name: user.displayName || 'Player',
          email: user.email || '',
          photo: getBestPhotoURL(user)
        };
        localStorage.setItem('last_user_profile', JSON.stringify(profile));
        setCachedUser(profile);
      }

      localStorage.setItem('authProvider', 'google');
    } catch (err: any) {
      handleSocialLoginError(err, 'Google');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleFacebookLogin = async () => {
    if (loadingProvider) return;
    try {
      setError(null);
      setLoadingProvider('facebook');
      await signInWithPopup(auth, facebookProvider);
      localStorage.setItem('authProvider', 'facebook');
    } catch (err: any) {
      handleSocialLoginError(err, 'Facebook');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingProvider) return;
    
    if (!showGuestInput) {
      setShowGuestInput(true);
      return;
    }

    const trimmedName = guestName.trim();
    const isValidName = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{4,}$/.test(trimmedName);
    if (!isValidName) {
      setError('Guest name must be at least 4 chars, 1 uppercase, 1 lowercase, and 1 number.');
      return;
    }

    try {
      setError(null);
      setLoadingProvider('guest');

      // Check if name is already taken across all providers
      const providers = ['google', 'facebook', 'guest'];
      let nameTaken = false;
      
      for (const p of providers) {
        const q = query(collection(db, `leaderboard_${p}`), where('displayName', '==', trimmedName));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          nameTaken = true;
          break;
        }
      }
      
      if (nameTaken) {
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const suggestedName = `${trimmedName}_${randomId}`.substring(0, 20);
        setGuestName(suggestedName);
        setError(`Name is already taken. We suggested: ${suggestedName}`);
        setLoadingProvider(null);
        return;
      }

      const userCredential = await signInAnonymously(auth);
      await updateProfile(userCredential.user, { displayName: trimmedName });
      
      const scoreRef = doc(db, 'leaderboard_guest', userCredential.user.uid);
      await setDoc(scoreRef, {
        userId: userCredential.user.uid,
        displayName: trimmedName,
        score: 0,
        timestamp: serverTimestamp()
      }, { merge: true });

      localStorage.setItem('authProvider', 'guest');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError('Guest access is restricted. Please enable "Anonymous" provider and "User Sign-up" in your Firebase Console.');
      } else {
        setError(err.message || 'Failed to sign in as Guest');
      }
      setLoadingProvider(null);
    }
  };

  return (
    <main className="fixed inset-0 min-h-[100dvh] bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center py-8 px-4 font-sans overflow-y-auto">
      {/* Desktop One Tap Style Popup */}
      <AnimatePresence>
        {showDesktopPopup && cachedUser && !showGuestInput && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="hidden lg:block fixed top-6 right-6 z-50 w-[360px] bg-[#202124] border border-white/10 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden font-sans"
          >
            <div className="relative">
              {/* Progress bar during Verifying state */}
              {isVerifying && (
                <div className="absolute top-[52px] left-0 right-0 h-[2px] bg-white/5 overflow-hidden z-20">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-1/2 h-full bg-[#8ab4f8]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05] bg-[#303134]">
                <div className="flex items-center gap-2.5">
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-[14px] text-[#e8eaed] font-medium tracking-normal">
                    {isVerifying ? 'Verifying...' : 'Sign in to Snake with google.com'}
                  </span>
                </div>
                {!isVerifying && (
                  <button 
                    onClick={closeDesktopPopup}
                    className="p-1 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-[48px] h-[48px] rounded-full overflow-hidden shrink-0 bg-[#3c4043] flex items-center justify-center ring-1 ring-white/10 shadow-inner">
                    {cachedUser?.photo ? (
                      <img 
                        src={cachedUser.photo} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          setCachedUser(prev => prev ? {...prev, photo: null} : null);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-lg font-medium tracking-tighter">
                        {cachedUser?.name ? cachedUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[16px] font-medium text-white truncate px-1">
                      {cachedUser?.name}
                    </span>
                    <span className="text-[14px] text-[#9aa0a6] truncate mt-0.5 px-1 font-normal">
                      {cachedUser?.email}
                    </span>
                  </div>
                </div>

                {!isVerifying && (
                  <button
                    onClick={handleOneTapLogin}
                    className="w-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] py-2.5 rounded-full text-[14px] font-bold transition-all active:scale-[0.98] shadow-md"
                  >
                    Continue as {cachedUser?.name?.split(' ')[0] || 'Player'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="z-10 bg-black/50 border border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_40px_rgba(6,182,212,0.2)] backdrop-blur-md w-full max-w-md flex flex-col items-center">
        <h1 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] tracking-wider mb-2">
          SNAKE
        </h1>
        <p className="text-white font-display font-bold tracking-widest text-sm mb-8 drop-shadow-sm">
          MK EDITION
        </p>

        {error && (
          <div className="w-full bg-red-500/20 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          {!showGuestInput && (
            <>
              <button
                onClick={handleGoogleLogin}
                aria-label="Sign in with Google"
                disabled={loadingProvider !== null && loadingProvider !== 'google'}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProvider === 'google' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span className="whitespace-nowrap text-[13px] sm:text-base">{loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <button
                onClick={handleFacebookLogin}
                aria-label="Sign in with Facebook"
                disabled={loadingProvider !== null && loadingProvider !== 'facebook'}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 rounded-xl text-white font-medium transition-all hover:border-[#1877F2]/60 hover:shadow-[0_0_15px_rgba(24,119,242,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProvider === 'facebook' ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin shrink-0"></div>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span className="whitespace-nowrap text-[13px] sm:text-base leading-none">{loadingProvider === 'facebook' ? 'Connecting...' : 'Continue with Facebook'}</span>
              </button>

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-white/20"></div>
                <span className="text-white text-[11px] uppercase tracking-widest font-black">or</span>
                <div className="flex-1 h-px bg-white/20"></div>
              </div>
            </>
          )}

          {showGuestInput ? (
            <form onSubmit={handleGuestLogin} className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="guestName" className="text-cyan-400 text-xs font-bold uppercase tracking-widest ml-1">
                  Enter Guest Name
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Min 4 chars, 1 uppercase, 1 lowercase, 1 number..."
                  className="w-full bg-black/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                  autoFocus
                  minLength={4}
                  maxLength={20}
                  required
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestInput(false);
                    setError(null);
                  }}
                  disabled={loadingProvider !== null}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loadingProvider !== null || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{4,}$/.test(guestName.trim())}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingProvider === 'guest' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Start Playing'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={handleGuestLogin}
              aria-label="Play as Guest"
              disabled={loadingProvider !== null && loadingProvider !== 'guest'}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium transition-all hover:border-cyan-500/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'guest' ? (
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <span>{loadingProvider === 'guest' ? 'Connecting...' : 'Play as Guest'}</span>
            </button>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white font-bold">
            <button onClick={openPrivacy} className="hover:text-cyan-400 underline transition-colors underline-offset-4 focus:outline-none">Privacy Policy</button>
            <span aria-hidden="true" className="opacity-50">&bull;</span>
            <button onClick={openTerms} className="hover:text-cyan-400 underline transition-colors underline-offset-4 focus:outline-none">Terms of Service</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-black overflow-y-auto"
          >
            <PrivacyPolicy onClose={closePrivacy} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-black overflow-y-auto"
          >
            <TermsOfService onClose={closeTerms} />
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}

