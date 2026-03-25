import React from 'react';
import { X, Settings, Volume2, Grid, Zap, Palette } from 'lucide-react';

interface GameSettings {
  gridSize: number;
  speed: number;
  volume: number;
  theme: 'cyber' | 'classic' | 'minimal';
}

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...settings, volume: parseFloat(e.target.value) });
  };

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
    <div className="bg-black/90 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-sm animate-in zoom-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="text-cyan-400 w-5 h-5" />
          <h2 className="text-xl font-display font-bold text-white tracking-widest">SETTINGS</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Difficulty: Speed */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Zap size={14} />
            <span>Speed / Difficulty</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Slow', value: 200 },
              { label: 'Normal', value: 150 },
              { label: 'Fast', value: 80 },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleSpeedChange(opt.value)}
                className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                  settings.speed === opt.value
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Size */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Grid size={14} />
            <span>Grid Size</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Small', value: 10 },
              { label: 'Medium', value: 15 },
              { label: 'Large', value: 20 },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleGridSizeChange(opt.value)}
                className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                  settings.gridSize === opt.value
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Volume2 size={14} />
              <span>SFX Volume</span>
            </div>
            <span className="text-cyan-400 font-mono">{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={handleVolumeChange}
            className="w-full accent-cyan-400 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Theme */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Palette size={14} />
            <span>Theme</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['cyber', 'classic', 'minimal'].map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t as GameSettings['theme'])}
                className={`py-2 text-[10px] font-bold rounded-lg border capitalize transition-all ${
                  settings.theme === t
                    ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.3)]'
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
