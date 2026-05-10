import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService({ onClose }: { onClose?: () => void } = {}) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#050505] text-gray-300 py-12 px-4 md:px-8 font-sans relative z-[100]">
      <div className="max-w-3xl mx-auto bg-black/50 border border-cyan-500/30 rounded-2xl p-5 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex flex-row items-center mb-6 sm:mb-8 border-b border-white/10 pb-4 gap-4">
          {onClose ? (
            <button onClick={onClose} className="p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all focus:outline-none whitespace-nowrap shrink-0 flex items-center gap-2" aria-label="Back">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <a href="/" className="p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2" aria-label="Back">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </a>
          )}
          <h1 className="text-xl sm:text-3xl font-display font-black text-cyan-400 tracking-wider truncate">
            TERMS OF SERVICE
          </h1>
        </div>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">1. Agreement to Terms</h2>
            <p>By accessing or playing Snake ("the Game"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Game.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">2. Accounts</h2>
            <p>When you create an account with us (via third-party login or guest access):</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>You must provide accurate and complete information.</li>
              <li>You are responsible for safeguarding your account access and credentials.</li>
              <li>You agree not to use offensive, disparaging, or inappropriate display names on our leaderboards. We reserve the right to modify or remove names that violate this policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use bots, scripts, or any unauthorized software to gain an unfair advantage or manipulate scores.</li>
              <li>Attempt to gain unauthorized access to our servers or databases.</li>
              <li>Use the Game for any illegal or unauthorized purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">4. Intellectual Property</h2>
            <p>The Game, including its original content, features, functionality, and design, are owned by its creators and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">5. Disclaimer</h2>
            <p>Your use of the Game is at your sole risk. The Game is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">6. Changes to Terms</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide notice prior to any new terms taking effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">7. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at: mahammed68k@gmail.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
