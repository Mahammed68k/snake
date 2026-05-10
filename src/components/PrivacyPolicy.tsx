import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy({ onClose }: { onClose?: () => void } = {}) {
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
            PRIVACY POLICY
          </h1>
        </div>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">1. Introduction</h2>
            <p>Welcome to Snake ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains what information we collect, how we use it, and how we protect it when you play our game.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> When you log in via third-party providers (like Google, Facebook, or Google Play Games), we receive basic public profile information such as your name, email address, and profile picture.</li>
              <li><strong>Game Data:</strong> We collect and store your scores, settings, and high score records on our leaderboards.</li>
              <li><strong>Feedback:</strong> If you use our feedback form, we store the content you provide.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To create and manage your game account.</li>
              <li>To maintain and display your position on our leaderboards.</li>
              <li>To save your personal high scores.</li>
              <li>To analyze game usage and improve our services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">4. Data Sharing and Security</h2>
            <p>We do not sell, trade, or rent your personal data to third parties. We use Firebase (a Google service) to securely store your data and manage authentication. Your data is protected by industry-standard security measures provided by Firebase.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">5. Your Rights</h2>
            <p>You have the right to request access to or deletion of your data at any time. If you wish to delete your account or leaderboard entries, please contact us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-fuchsia-400 mb-2">6. Contact Us</h2>
            <p>If you have any questions or concerns about these Privacy Terms, please contact us at: mahammed68k@gmail.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
