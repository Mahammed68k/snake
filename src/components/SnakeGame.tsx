import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_DIRECTION = { x: 0, y: -1 };

interface Point {
  x: number;
  y: number;
}

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
  onGameOver?: (score: number) => void;
  onShowLeaderboard?: () => void;
  highScore: number;
  isFullScreen?: boolean;
  gridSize: number;
  speed: number;
  volume: number;
  theme: 'cyber' | 'classic' | 'minimal';
}

// Sound synthesizer helper
const playSound = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (error) {
    console.warn('Audio not supported or blocked:', error);
  }
};

export default function SnakeGame({ 
  onScoreChange, 
  onGameOver, 
  onShowLeaderboard, 
  highScore, 
  isFullScreen,
  gridSize,
  speed,
  volume: sfxVolume,
  theme
}: SnakeGameProps) {
  const [snake, setSnake] = useState<Point[]>([
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 1 },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 2 },
  ]);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [justAte, setJustAte] = useState<boolean>(false);

  const directionRef = useRef(direction);
  directionRef.current = direction;
  const touchStart = useRef<Point | null>(null);

  useEffect(() => {
    setSnake([
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 1 },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 2 },
    ]);
    setFood(generateFood([]));
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    onScoreChange(0);
    setGameOver(false);
    setIsPaused(false);
  }, [gridSize, speed, theme]);

  const playMoveSound = useCallback(() => {
    playSound(150, 'square', 0.05, 0.02 * sfxVolume * 10);
  }, [sfxVolume]);

  const playEatSound = useCallback(() => {
    // Single pleasant beep (E5)
    playSound(659.25, 'sine', 0.15, 0.08 * sfxVolume * 10);
  }, [sfxVolume]);

  const playGameOverSound = useCallback(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.1 * sfxVolume * 10, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  }, [sfxVolume]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || gameOver) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const dx = touchEnd.x - touchStart.current.x;
    const dy = touchEnd.y - touchStart.current.y;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Minimum swipe distance to trigger move
    if (Math.max(absDx, absDy) > 30) {
      if (isPaused) return;
      const { x: curX, y: curY } = directionRef.current;
      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0 && curX !== -1) setDirection({ x: 1, y: 0 });
        else if (dx < 0 && curX !== 1) setDirection({ x: -1, y: 0 });
      } else {
        // Vertical swipe
        if (dy > 0 && curY !== -1) setDirection({ x: 0, y: 1 });
        else if (dy < 0 && curY !== 1) setDirection({ x: 0, y: -1 });
      }
    } else {
      // Tap detected - check if it's in the middle area
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distFromCenter = Math.sqrt(
        Math.pow(touchEnd.x - centerX, 2) + Math.pow(touchEnd.y - centerY, 2)
      );
      
      // If tap is within 30% of the board width from the center, toggle pause
      if (distFromCenter < rect.width * 0.3) {
        setIsPaused((prev) => !prev);
      }
    }

    touchStart.current = null;
  };

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    const initialSnake = [
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 1 },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 2 },
    ];
    setSnake(initialSnake);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    onScoreChange(0);
    setGameOver(false);
    setIsPaused(false);
    setFood(generateFood(initialSnake));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      const { x, y } = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
          if (y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
          if (x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
          if (x !== -1) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
        case 'p':
          setIsPaused((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const moveSnake = () => {
      const head = snake[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y,
      };

      // Wrap around walls
      if (newHead.x < 0) {
        newHead.x = gridSize - 1;
      } else if (newHead.x >= gridSize) {
        newHead.x = 0;
      }

      if (newHead.y < 0) {
        newHead.y = gridSize - 1;
      } else if (newHead.y >= gridSize) {
        newHead.y = 0;
      }

      // Check collision with self
      if (
        snake.some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y
        )
      ) {
        setGameOver(true);
        playGameOverSound();
        onGameOver?.(score);
        return;
      }

      const newSnake = [newHead, ...snake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        onScoreChange(newScore);
        setFood(generateFood(newSnake));
        playEatSound();
        setJustAte(true);
        setTimeout(() => setJustAte(false), 200);
      } else {
        newSnake.pop();
        playMoveSound();
      }

      setSnake(newSnake);
    };

    const timeoutId = setTimeout(moveSnake, speed);
    return () => clearTimeout(timeoutId);
  }, [snake, food, gameOver, isPaused, score, onScoreChange, generateFood, speed, gridSize]);

  const cellSize = 100 / gridSize;

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full relative touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative bg-black/40 border-2 rounded-lg shadow-[0_0_25px_rgba(6,182,212,0.5)] overflow-hidden transition-all duration-500 ${isFullScreen ? 'rounded-none border-0 shadow-none' : ''} ${
          theme === 'cyber' ? 'border-cyan-500' : theme === 'classic' ? 'border-green-800' : 'border-gray-700'
        }`}
        style={{
          width: isFullScreen ? '100vmin' : 'min(98vw, 98vh)',
          height: isFullScreen ? '100vmin' : 'min(98vw, 98vh)',
        }}
      >
        {/* Grid Background */}
        <div 
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => (
            <div key={index} className={`w-full h-full ${theme === 'cyber' ? 'border border-cyan-900/10' : ''}`} />
          ))}
        </div>

        {/* Food */}
        <motion.div
          key={`food-${food.x}-${food.y}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute"
          style={{
            width: `${cellSize}%`,
            height: `${cellSize}%`,
            left: `${food.x * cellSize}%`,
            top: `${food.y * cellSize}%`,
          }}
        >
          <div className={`w-full h-full flex items-center justify-center relative ${theme === 'cyber' ? 'animate-bounce' : ''}`}>
            {theme === 'cyber' ? (
              <>
                {/* Left Ear */}
                <div className="absolute top-[10%] left-[10%] w-[35%] h-[35%] bg-orange-500 rounded-tl-md rotate-[-45deg]" />
                {/* Right Ear */}
                <div className="absolute top-[10%] right-[10%] w-[35%] h-[35%] bg-orange-500 rounded-tr-md rotate-[45deg]" />
                {/* Head */}
                <div className="absolute top-[20%] w-[85%] h-[75%] bg-orange-400 rounded-full shadow-sm">
                  {/* Eyes */}
                  <div className="absolute top-[30%] left-[20%] w-[15%] h-[20%] bg-gray-900 rounded-full" />
                  <div className="absolute top-[30%] right-[20%] w-[15%] h-[20%] bg-gray-900 rounded-full" />
                  {/* Nose */}
                  <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[15%] h-[15%] bg-pink-500 rounded-full" />
                </div>
              </>
            ) : theme === 'classic' ? (
              <div className="w-[70%] h-[70%] bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
            ) : (
              <div className="w-[40%] h-[40%] bg-white rounded-sm rotate-45" />
            )}
          </div>
        </motion.div>

        {/* Snake */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          const isTail = index === snake.length - 1 && snake.length > 1;
          const isEven = index % 2 === 0;

          let headRotation = 0;
          if (isHead) {
            if (snake.length > 1) {
              const dx = snake[0].x - snake[1].x;
              const dy = snake[0].y - snake[1].y;
              // Handle wrap-around rotation
              if (dx === 1 || dx < -1) headRotation = 90;
              else if (dx === -1 || dx > 1) headRotation = -90;
              else if (dy === 1 || dy < -1) headRotation = 180;
              else if (dy === -1 || dy > 1) headRotation = 0;
            } else {
              if (directionRef.current.x === 1) headRotation = 90;
              else if (directionRef.current.x === -1) headRotation = -90;
              else if (directionRef.current.y === 1) headRotation = 180;
              else if (directionRef.current.y === -1) headRotation = 0;
            }
          }

          return (
            <motion.div
              key={`${index}-${segment.x}-${segment.y}`}
              layout
              initial={false}
              animate={{
                left: `${segment.x * cellSize}%`,
                top: `${segment.y * cellSize}%`,
                scale: isHead && justAte ? 1.2 : 1,
              }}
              transition={{
                type: 'tween',
                ease: 'linear',
                duration: speed / 1000,
              }}
              className="absolute"
              style={{
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                zIndex: isHead ? 20 : 10 - index,
              }}
            >
              {isHead ? (
                <div
                  className={`w-full h-full rounded-t-full rounded-b-sm relative shadow-[0_0_12px_rgba(22,163,74,0.7)] ${
                    theme === 'cyber' ? 'bg-green-600' : theme === 'classic' ? 'bg-green-800' : 'bg-gray-400'
                  }`}
                  style={{ transform: `rotate(${headRotation}deg)` }}
                >
                  {/* Eyes */}
                  <div className="absolute top-[20%] left-[20%] w-[25%] h-[25%] bg-black rounded-full shadow-inner">
                    <div className="w-[40%] h-[40%] bg-white rounded-full ml-[15%] mt-[15%]" />
                  </div>
                  <div className="absolute top-[20%] right-[20%] w-[25%] h-[25%] bg-black rounded-full shadow-inner">
                    <div className="w-[40%] h-[40%] bg-white rounded-full ml-[15%] mt-[15%]" />
                  </div>
                  {/* Forked Tongue */}
                  {theme !== 'minimal' && (
                    <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[10%] h-[40%] bg-red-500 flex justify-center">
                      <div className="absolute -top-[20%] left-0 w-[80%] h-[40%] bg-red-500 rotate-45 origin-bottom-right" />
                      <div className="absolute -top-[20%] right-0 w-[80%] h-[40%] bg-red-500 -rotate-45 origin-bottom-left" />
                    </div>
                  )}
                </div>
              ) : isTail ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className={`w-[60%] h-[60%] rounded-full shadow-[inset_0_0_5px_rgba(0,0,0,0.5)] ${
                    theme === 'cyber' ? 'bg-green-700' : theme === 'classic' ? 'bg-green-900' : 'bg-gray-500'
                  }`} />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className={`w-[96%] h-[96%] rounded-lg shadow-[inset_0_0_8px_rgba(0,0,0,0.3)] ${
                    theme === 'cyber' 
                      ? (isEven ? 'bg-green-500' : 'bg-green-600') 
                      : theme === 'classic' 
                      ? (isEven ? 'bg-green-700' : 'bg-green-800')
                      : 'bg-gray-600'
                  }`} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Center Pause/Play Button Indicator */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none transition-all duration-300 ${isPaused ? 'opacity-60 scale-110' : 'opacity-10 scale-100'}`}
        style={{ width: '15%', height: '15%' }}
      >
        {isPaused ? (
          <Play fill="currentColor" className="w-full h-full text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
        ) : (
          <Pause fill="currentColor" className="w-full h-full text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
        )}
      </div>

      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg z-20"
          >
            <motion.h2 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            >
              GAME OVER
            </motion.h2>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-2 mb-6"
            >
              <p className="text-xl text-cyan-300">Final Score: {score}</p>
              <p className="text-sm text-fuchsia-400 uppercase tracking-widest">High Score: {Math.max(score, highScore)}</p>
            </motion.div>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-3 w-full max-w-[200px]"
            >
              <button
                onClick={resetGame}
                className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)]"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={onShowLeaderboard}
                className="w-full px-6 py-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-400 border border-fuchsia-500/50 font-bold rounded-full transition-all"
              >
                LEADERBOARD
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && !gameOver && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-20"
          >
            <h2 className="text-4xl font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
              PAUSED
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
