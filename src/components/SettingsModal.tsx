import React from 'react';
import { X, Settings, Palette } from 'lucide-react';

interface GameSettings {
  gridSize: number;
  speed: number;
  theme: 'cyber' | 'plasma';
}

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function SettingsModal({ settings, onUpdate, onClose, isFullscreen, onToggleFullscreen }: SettingsModalProps) {
  const handleGridSizeChange = (size: number) => {
    onUpdate({ ...settings, gridSize: size });
  };

  const handleSpeedChange = (speed: number) => {
    onUpdate({ ...settings, speed });
  };

  const handleThemeChange = (theme: GameSettings['theme']) => {
    onUpdate({ ...settings, theme });
  };

  const canFullscreen = typeof document !== 'undefined' && (document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen);

  return (
    <div className="bg-black/95 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-sm animate-in zoom-in duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="text-cyan-400 w-5 h-5" />
          <h2 className="text-white font-display font-black tracking-widest text-sm uppercase" style={{ fontFamily: 'Times New Roman' }}>Settings</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-white hover:text-cyan-400 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-8">
        {/* Theme Settings */}
        <div className="space-y-4">
          <div 
            className="flex items-center gap-2 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ fontFamily: 'Times New Roman' }}
          >
            <Palette size={14} className="opacity-70" />
            <span>VISUAL THEMES</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['cyber', 'plasma'].map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t as GameSettings['theme'])}
                className={`py-3 text-[10px] font-black rounded-xl border-2 uppercase transition-all duration-300 active:scale-95 ${
                  settings.theme === t
                    ? t === 'cyber'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                    : 'bg-zinc-900/50 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300'
                }`}
              >
                {t === 'cyber' ? 'CYBERPUNK' : 'PLASMA'}
              </button>
            ))}
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div 
            className="flex items-center gap-2 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ fontFamily: 'Times New Roman' }}
          >
            <svg className="w-3.5 h-3.5 rotate-90 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>DISPLAY MODE</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <button
              disabled={!canFullscreen}
              onClick={onToggleFullscreen}
              className={`flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all duration-300 active:scale-[0.98] ${
                isFullscreen 
                ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                : 'bg-zinc-900/50 border-white/5 text-gray-400 hover:border-white/10'
              } ${!canFullscreen ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">Full Screen Display</p>
                <p className="text-[9px] text-gray-500 mt-0.5 tracking-tight uppercase">Hide browser navigation bars</p>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isFullscreen ? 'bg-green-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${isFullscreen ? 'left-5' : 'left-1'}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full mt-10 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-[11px] font-black tracking-[0.3em] rounded-xl uppercase transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.3)] active:scale-95 active:shadow-none"
      >
        SAVE CONFIGURATION
      </button>
    </div>
  );
}
