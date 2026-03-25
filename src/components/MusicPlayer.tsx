import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Headphones } from 'lucide-react';

const TRACKS = [
  {
    id: 1,
    title: 'Neon Drift (AI Generated)',
    artist: 'Cyber Synth',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '6:12',
  },
  {
    id: 2,
    title: 'Digital Horizon',
    artist: 'AI Maestro',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: '7:05',
  },
  {
    id: 3,
    title: 'Quantum Beats',
    artist: 'Neural Network',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: '5:44',
  },
];

export default function MusicPlayer() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying) {
      const playPromise = audioRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name !== 'AbortError') {
            console.error("Audio play failed:", e);
          }
        });
      }
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const playPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      if (duration) {
        setProgress((current / duration) * 100);
      }
    }
  };

  const handleTrackEnded = () => {
    playNext();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const percentage = x / bounds.width;
      audioRef.current.currentTime = percentage * audioRef.current.duration;
    }
  };

  return (
    <div className="bg-black/60 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl rounded-tl-none p-6 w-full max-w-md shadow-[0_0_30px_rgba(217,70,239,0.15)] relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <audio
        ref={audioRef}
        src={currentTrack.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnded}
      />

      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse-slow">
          <Headphones className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-white font-bold text-lg truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
            {currentTrack.title}
          </h3>
          <p className="text-cyan-300 text-sm truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="h-1.5 bg-gray-800 rounded-full mb-6 cursor-pointer relative z-10 overflow-hidden"
        onClick={handleProgressClick}
      >
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(217,70,239,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-400 hover:text-cyan-400 transition-colors p-2"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-20 accent-cyan-400 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={playPrev}
            className="text-white hover:text-fuchsia-400 transition-colors p-2"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] transition-all"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Headphones className="w-6 h-6" />
            )}
          </button>
          
          <button 
            onClick={playNext}
            className="text-white hover:text-fuchsia-400 transition-colors p-2"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
