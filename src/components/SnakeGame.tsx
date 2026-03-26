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
  onReturnToMenu?: () => void;
  highScore: number;
  isFullScreen?: boolean;
  gridSize: number;
  speed: number;
  theme: 'cyber' | 'plasma' | 'normal';
}

export default function SnakeGame({ 
  onScoreChange, 
  onGameOver, 
  onShowLeaderboard, 
  onReturnToMenu,
  highScore, 
  isFullScreen,
  gridSize,
  speed,
  theme
}: SnakeGameProps) {
  const [snake, setSnake] = useState<Point[]>([
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 1 },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 2 },
  ]);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [obstacles, setObstacles] = useState<Point[]>([]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [justAte, setJustAte] = useState<boolean>(false);

  const directionRef = useRef(direction);
  directionRef.current = direction;
  const touchStart = useRef<Point | null>(null);

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

  const generateObstacles = useCallback((currentSnake: Point[], count: number) => {
    const newObstacles: Point[] = [];
    for (let i = 0; i < count; i++) {
      let newObstacle: Point;
      let isOccupied = true;
      let attempts = 0;
      while (isOccupied && attempts < 100) {
        newObstacle = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
        };
        
        // Avoid center area where snake starts and moves
        const inCenter = newObstacle.x >= Math.floor(gridSize/2) - 2 && newObstacle.x <= Math.floor(gridSize/2) + 2 &&
                         newObstacle.y >= Math.floor(gridSize/2) - 2 && newObstacle.y <= Math.floor(gridSize/2) + 2;

        // eslint-disable-next-line no-loop-func
        isOccupied =
          currentSnake.some((segment) => segment.x === newObstacle.x && segment.y === newObstacle.y) ||
          newObstacles.some((obs) => obs.x === newObstacle.x && obs.y === newObstacle.y) ||
          inCenter;
          
        attempts++;
      }
      if (!isOccupied) {
        newObstacles.push(newObstacle!);
      }
    }
    return newObstacles;
  }, [gridSize]);

  const generateFood = useCallback((currentSnake: Point[], currentObstacles: Point[] = []) => {
    let newFood: Point;
    let attempts = 0;
    while (attempts < 100) {
      newFood = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      // eslint-disable-next-line no-loop-func
      const isOnObstacle = currentObstacles.some(
        (obs) => obs.x === newFood.x && obs.y === newFood.y
      );
      if (!isOnSnake && !isOnObstacle) break;
      attempts++;
    }
    return newFood!;
  }, [gridSize]);

  useEffect(() => {
    const initialSnake = [
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 1 },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 2 },
    ];
    setSnake(initialSnake);
    
    const obstacleCount = Math.floor((gridSize * gridSize) / 50);
    const initialObstacles = generateObstacles(initialSnake, obstacleCount);
    setObstacles(initialObstacles);
    
    setFood(generateFood(initialSnake, initialObstacles));
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    onScoreChange(0);
    setGameOver(false);
    setIsPaused(false);
  }, [gridSize, speed, theme, generateObstacles, generateFood]);

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
    
    const obstacleCount = Math.floor((gridSize * gridSize) / 50);
    const newObstacles = generateObstacles(initialSnake, obstacleCount);
    setObstacles(newObstacles);
    
    setFood(generateFood(initialSnake, newObstacles));
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

      // Check collision with self or obstacles
      if (
        snake.some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y
        ) ||
        obstacles.some(
          (obs) => obs.x === newHead.x && obs.y === newHead.y
        )
      ) {
        setGameOver(true);
        onGameOver?.(score);
        return;
      }

      const newSnake = [newHead, ...snake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        onScoreChange(newScore);
        setFood(generateFood(newSnake, obstacles));
        setJustAte(true);
        setTimeout(() => setJustAte(false), 200);
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    };

    const timeoutId = setTimeout(moveSnake, speed);
    return () => clearTimeout(timeoutId);
  }, [snake, food, obstacles, gameOver, isPaused, score, onScoreChange, generateFood, speed, gridSize]);

  const cellSize = 100 / gridSize;

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full relative touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative bg-black/40 border-2 rounded-lg shadow-[0_0_25px_rgba(6,182,212,0.5)] overflow-hidden transition-all duration-500 ${isFullScreen ? 'rounded-none border-0 shadow-none' : ''} ${
          theme === 'cyber' ? 'border-cyan-500' : theme === 'plasma' ? 'border-fuchsia-500' : 'border-zinc-700'
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
            <div key={index} className={`w-full h-full ${
              theme === 'cyber' ? 'border border-cyan-900/10' : 
              theme === 'plasma' ? 'border border-fuchsia-900/10' : 
              'border border-white/5'
            }`} />
          ))}
        </div>

        {/* Obstacles */}
        {obstacles.map((obs, index) => (
          <div
            key={`obs-${index}-${obs.x}-${obs.y}`}
            className={`absolute flex items-center justify-center ${
              theme === 'cyber' 
                ? 'bg-red-900/40 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                : theme === 'plasma'
                ? 'bg-purple-900/40 border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                : 'bg-zinc-900 border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)]'
            }`}
            style={{
              width: `${cellSize}%`,
              height: `${cellSize}%`,
              left: `${obs.x * cellSize}%`,
              top: `${obs.y * cellSize}%`,
            }}
          >
            {theme === 'cyber' && (
              <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(239,68,68,0.2)_2px,rgba(239,68,68,0.2)_4px)]" />
            )}
            {theme === 'plasma' && (
              <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(168,85,247,0.2)_2px,rgba(168,85,247,0.2)_4px)]" />
            )}
            {theme === 'normal' && (
              <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
            )}
          </div>
        ))}

        {/* Food */}
        <motion.div
          key={`food-${food.x}-${food.y}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [1, 1.15, 1], 
            opacity: 1,
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
            rotate: { repeat: Infinity, duration: 0.5, ease: "easeInOut" },
            opacity: { duration: 0.3 }
          }}
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
              <div className="relative w-[90%] h-[90%] drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
                {/* Tail */}
                <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[10%] h-[50%] bg-orange-600 rounded-full origin-top rotate-[15deg]" />
                {/* Left Ear */}
                <div className="absolute top-[5%] left-[5%] w-[40%] h-[40%] bg-orange-500 rounded-full border border-orange-300" />
                {/* Right Ear */}
                <div className="absolute top-[5%] right-[5%] w-[40%] h-[40%] bg-orange-500 rounded-full border border-orange-300" />
                {/* Head/Body */}
                <div className="absolute top-[15%] left-[10%] w-[80%] h-[80%] bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-inner">
                  {/* Eyes */}
                  <div className="absolute top-[30%] left-[20%] w-[20%] h-[25%] bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                  <div className="absolute top-[30%] right-[20%] w-[20%] h-[25%] bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                  {/* Nose */}
                  <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-[15%] h-[15%] bg-pink-400 rounded-full shadow-[0_0_4px_rgba(244,114,182,0.8)]" />
                  {/* Whiskers */}
                  <div className="absolute top-[60%] -left-[20%] w-[40%] h-[2%] bg-white/50 rotate-12" />
                  <div className="absolute top-[70%] -left-[20%] w-[40%] h-[2%] bg-white/50 -rotate-12" />
                  <div className="absolute top-[60%] -right-[20%] w-[40%] h-[2%] bg-white/50 -rotate-12" />
                  <div className="absolute top-[70%] -right-[20%] w-[40%] h-[2%] bg-white/50 rotate-12" />
                </div>
              </div>
            ) : theme === 'plasma' ? (
              <div className="relative w-[90%] h-[90%] drop-shadow-[0_0_12px_rgba(217,70,239,0.9)] animate-pulse">
                <div className="absolute inset-0 bg-fuchsia-600 rounded-full animate-ping opacity-30" />
                <div className="absolute inset-[10%] bg-gradient-to-tr from-fuchsia-600 to-purple-500 rounded-full shadow-[inset_0_0_15px_rgba(255,255,255,0.6)]" />
                <div className="absolute inset-[30%] bg-white rounded-full blur-[2px]" />
                <div className="absolute inset-[40%] bg-fuchsia-100 rounded-full" />
              </div>
            ) : (
              <div className="relative w-[75%] h-[75%] drop-shadow-[0_0_10px_rgba(56,189,248,1)]">
                <div className="absolute inset-0 bg-sky-400 rotate-45 rounded-sm border-[3px] border-white shadow-[inset_0_0_10px_rgba(255,255,255,0.9)]" />
                <div className="absolute inset-[30%] bg-white rotate-45 rounded-sm" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Snake */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          const isTail = index === snake.length - 1 && snake.length > 1;
          const progress = snake.length > 1 ? index / (snake.length - 1) : 0; // 0 for head, 1 for tail

          // Calculate color based on progress and theme
          let segmentColor = '';
          let glowColor = '';
          
          if (theme === 'cyber') {
            // Neon green to cyan gradient
            const hue = 140 + (progress * 40); // 140 (green) to 180 (cyan)
            segmentColor = `hsl(${hue}, 80%, 50%)`;
            glowColor = `rgba(34, 211, 238, ${0.8 - progress * 0.5})`; // Fading glow
          } else if (theme === 'plasma') {
            // Purple to pink gradient
            const hue = 290 + (progress * 40); // 290 (purple) to 330 (pink)
            segmentColor = `hsl(${hue}, 90%, 60%)`;
            glowColor = `rgba(217, 70, 239, ${0.9 - progress * 0.4})`;
          } else {
            // Normal: High contrast amber/yellow
            const hue = 45 - (progress * 25); // 45 (yellow) to 20 (orange)
            segmentColor = `hsl(${hue}, 100%, 55%)`;
            glowColor = `rgba(250, 204, 21, ${0.7 - progress * 0.3})`;
          }

          // Scale down slightly towards the tail
          const segmentScale = 1 - (progress * 0.2);

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
                scale: isHead && justAte ? 1.2 : segmentScale,
              }}
              transition={{
                type: 'tween',
                ease: 'linear',
                duration: speed / 1000,
              }}
              className="absolute flex items-center justify-center"
              style={{
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                zIndex: isHead ? 20 : 10 - index,
              }}
            >
              {isHead ? (
                <div
                  className="w-full h-full rounded-t-full rounded-b-sm relative"
                  style={{ 
                    backgroundColor: segmentColor,
                    boxShadow: theme === 'normal' 
                      ? `0 0 20px ${glowColor}, inset 0 0 15px rgba(255,255,255,0.6), 0 0 0 2px rgba(255,255,255,0.2)` 
                      : `0 0 15px ${glowColor}, inset 0 0 10px rgba(0,0,0,0.3)`,
                    transform: `rotate(${headRotation}deg)` 
                  }}
                >
                  {/* Eyes */}
                  <div className={`absolute top-[20%] left-[20%] w-[25%] h-[25%] ${theme === 'normal' ? 'bg-white' : 'bg-black'} rounded-full shadow-inner`}>
                    <div className={`w-[40%] h-[40%] ${theme === 'normal' ? 'bg-sky-500' : 'bg-white'} rounded-full ml-[15%] mt-[15%]`} />
                  </div>
                  <div className={`absolute top-[20%] right-[20%] w-[25%] h-[25%] ${theme === 'normal' ? 'bg-white' : 'bg-black'} rounded-full shadow-inner`}>
                    <div className={`w-[40%] h-[40%] ${theme === 'normal' ? 'bg-sky-500' : 'bg-white'} rounded-full ml-[15%] mt-[15%]`} />
                  </div>
                  {/* Forked Tongue */}
                  {theme !== 'normal' && (
                    <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[10%] h-[40%] bg-red-500 flex justify-center">
                      <div className="absolute -top-[20%] left-0 w-[80%] h-[40%] bg-red-500 rotate-45 origin-bottom-right" />
                      <div className="absolute -top-[20%] right-0 w-[80%] h-[40%] bg-red-500 -rotate-45 origin-bottom-left" />
                    </div>
                  )}
                </div>
              ) : isTail ? (
                <div 
                  className="w-[60%] h-[60%] rounded-full"
                  style={{ 
                    backgroundColor: segmentColor,
                    boxShadow: theme === 'normal'
                      ? `0 0 10px ${glowColor}, inset 0 0 8px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.2)`
                      : `0 0 8px ${glowColor}, inset 0 0 5px rgba(0,0,0,0.5)`
                  }} 
                />
              ) : (
                <div 
                  className="w-[90%] h-[90%] rounded-lg"
                  style={{ 
                    backgroundColor: segmentColor,
                    boxShadow: theme === 'normal'
                      ? `0 0 12px ${glowColor}, inset 0 0 10px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.2)`
                      : `0 0 10px ${glowColor}, inset 0 0 8px rgba(0,0,0,0.3)`
                  }} 
                />
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
              className="flex flex-col gap-3 w-full max-w-[250px]"
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
              {onReturnToMenu && (
                <button
                  onClick={onReturnToMenu}
                  className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold rounded-full transition-all"
                >
                  MAIN MENU
                </button>
              )}
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
