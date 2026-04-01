import React, { useState } from 'react';
import { signInWithPopup, signInAnonymously, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, facebookProvider, playGamesProvider, db } from '../firebase';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState('');

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    try {
      setError(null);
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      localStorage.setItem('authProvider', 'google');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
        return;
      }
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (isLoading) return;
    try {
      setError(null);
      setIsLoading(true);
      await signInWithPopup(auth, facebookProvider);
      localStorage.setItem('authProvider', 'facebook');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
        return;
      }
      setError(err.message || 'Failed to sign in with Facebook');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayGamesLogin = async () => {
    if (isLoading) return;
    try {
      setError(null);
      setIsLoading(true);
      await signInWithPopup(auth, playGamesProvider);
      localStorage.setItem('authProvider', 'playgames');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
        return;
      }
      setError(err.message || 'Failed to sign in with Google Play Games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
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
      setIsLoading(true);

      // Check if name is already taken across all providers
      const providers = ['google', 'facebook', 'playgames', 'guest'];
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
        setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center py-8 px-4 font-sans">
      <div className="z-10 bg-black/50 border border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_40px_rgba(6,182,212,0.2)] backdrop-blur-md w-full max-w-md flex flex-col items-center">
        <h1 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] tracking-wider mb-2">
          SNAKE
        </h1>
        <p className="text-cyan-300 font-display tracking-widest text-sm mb-8 opacity-80">
          LOGIN TO PLAY
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
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button
                onClick={handleFacebookLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 rounded-xl text-white font-medium transition-all hover:border-[#1877F2]/60 hover:shadow-[0_0_15px_rgba(24,119,242,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </>
                )}
              </button>

              <button
                onClick={handlePlayGamesLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#34A853]/10 hover:bg-[#34A853]/20 border border-[#34A853]/30 rounded-xl text-white font-medium transition-all hover:border-[#34A853]/60 hover:shadow-[0_0_15px_rgba(52,168,83,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#34A853] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-[#34A853]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.2,11.3L5.4,2.7C4.8,2.4,4.2,2.8,4.2,3.5v17.1c0,0.7,0.6,1.1,1.2,0.8l14.8-8.6C20.8,12.5,20.8,11.6,20.2,11.3z M10.4,14.6 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C11.5,14.1,11,14.6,10.4,14.6z M10.4,11.6 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C11.5,11.1,11,11.6,10.4,11.6z M13.4,12.8 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C14.5,12.3,14,12.8,13.4,12.8z M13.4,16.4 c-0.6,0-1.1-0.5-1.1-1.1c0-0.6,0.5-1.1,1.1-1.1c0.6,0,1.1,0.5,1.1,1.1C14.5,15.9,14,16.4,13.4,16.4z"/>
                    </svg>
                    Continue with Play Games
                  </>
                )}
              </button>

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-gray-500 text-[10px] uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/10"></div>
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
                  className="w-full bg-black/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
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
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{4,}$/.test(guestName.trim())}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium transition-all hover:border-cyan-500/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Play as Guest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
