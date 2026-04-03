import React from 'react';
import { X, Settings, Palette } from 'lucide-react';

interface GameSettings {
  gridSize: number;
  speed: number;
  theme: 'cyber' | 'plasma' | 'normal';
}

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  const handleGridSizeChange = (size: number) => {
    onUpdate({ ...settings, gridSize: size });
  };

  const handleSpeedChange = (speed: number) => {
    onUpdate({ ...settings, speed });
  };

  const handleThemeChange = (theme: GameSettings['theme']) => {
    onUpdate({ ...settings, theme });
  };

  return (
    <div className="bg-black/90 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-sm animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-end mb-6">
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div className="space-y-3">
          <div 
            className="flex items-center justify-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider"
            style={{ textAlign: 'center', fontFamily: 'Times New Roman' }}
          >
            <Palette size={14} />
            <span>THEMES</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['cyber', 'plasma', 'normal'].map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t as GameSettings['theme'])}
                className={`py-2 text-[10px] font-bold rounded-lg border capitalize transition-all ${
                  settings.theme === t
                    ? t === 'cyber'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : t === 'plasma'
                      ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.3)]'
                      : 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full mt-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
      >
        SAVE & CLOSE
      </button>
    </div>
  );
}
