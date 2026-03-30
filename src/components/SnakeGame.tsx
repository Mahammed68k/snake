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
  onGameOverStateChange?: (isGameOver: boolean) => void;
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
  onGameOverStateChange,
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
  const [showMainMenuButton, setShowMainMenuButton] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [justAte, setJustAte] = useState<boolean>(false);
  const [canRevive, setCanRevive] = useState<boolean>(() => {
    const lastRevive = localStorage.getItem('lastReviveDate');
    return lastRevive !== new Date().toDateString();
  });
  const [showInstructions, setShowInstructions] = useState<boolean>(() => {
    const hasSeen = localStorage.getItem('hasSeenSwipeInstructions');
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    return !hasSeen && isMobile;
  });

  // Pause game initially if showing instructions
  useEffect(() => {
    if (showInstructions) {
      setIsPaused(true);
    }
  }, [showInstructions]);

  const inputQueueRef = useRef<Point[]>([]);
  const lastExecutedDirectionRef = useRef<Point>(INITIAL_DIRECTION);
  const touchStart = useRef<Point | null>(null);
  const swipeHandled = useRef<boolean>(false);

  const handleDirectionClick = (newDir: Point) => {
    if (gameOver) return;
    const queue = inputQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : lastExecutedDirectionRef.current;
    
    if (newDir.x !== 0 && lastDir.x === newDir.x * -1) return;
    if (newDir.y !== 0 && lastDir.y === newDir.y * -1) return;
    
    if (newDir.x !== lastDir.x || newDir.y !== lastDir.y) {
      if (queue.length < 3) {
        queue.push(newDir);
      }
    }
    setIsPaused(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    swipeHandled.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || gameOver) return;

    const touchCurrent = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    const dx = touchCurrent.x - touchStart.current.x;
    const dy = touchCurrent.y - touchStart.current.y;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Minimum swipe distance to trigger move (lowered to 20 for more responsiveness)
    if (Math.max(absDx, absDy) > 20) {
      swipeHandled.current = true;
      if (!isPaused) {
        const queue = inputQueueRef.current;
        const lastDir = queue.length > 0 ? queue[queue.length - 1] : lastExecutedDirectionRef.current;
        let newDir: Point | null = null;

        if (absDx > absDy) {
          // Horizontal swipe
          if (dx > 0 && lastDir.x !== -1) newDir = { x: 1, y: 0 };
          else if (dx < 0 && lastDir.x !== 1) newDir = { x: -1, y: 0 };
        } else {
          // Vertical swipe
          if (dy > 0 && lastDir.y !== -1) newDir = { x: 0, y: 1 };
          else if (dy < 0 && lastDir.y !== 1) newDir = { x: 0, y: -1 };
        }

        if (newDir) {
          if (newDir.x !== lastDir.x || newDir.y !== lastDir.y) {
            if (queue.length < 3) {
              queue.push(newDir);
            }
          }
        }
      }
      
      // Update touch start to current position to allow continuous swiping (e.g. L-shapes)
      touchStart.current = touchCurrent;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || gameOver) return;

    if (!swipeHandled.current) {
      // Tap detected - check if it's in the middle area
      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
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
    swipeHandled.current = false;
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
    inputQueueRef.current = [];
    lastExecutedDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    onScoreChange(0);
    setGameOver(false);
    setIsPaused(false);
    
    const obstacleCount = Math.floor((gridSize * gridSize) / 50);
    const newObstacles = generateObstacles(initialSnake, obstacleCount);
    setObstacles(newObstacles);
    
    setFood(generateFood(initialSnake, newObstacles));
  };

  const continueGame = () => {
    localStorage.setItem('lastReviveDate', new Date().toDateString());
    setCanRevive(false);
    
    const initialSnake = [
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 1 },
      { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) + 2 },
    ];
    setSnake(initialSnake);
    setDirection(INITIAL_DIRECTION);
    inputQueueRef.current = [];
    lastExecutedDirectionRef.current = INITIAL_DIRECTION;
    
    // Keep score, just reset position and obstacles
    setGameOver(false);
    setIsPaused(true); // Pause to let player get ready
    
    const obstacleCount = Math.floor((gridSize * gridSize) / 50);
    const newObstacles = generateObstacles(initialSnake, obstacleCount);
    setObstacles(newObstacles);
    
    setFood(generateFood(initialSnake, newObstacles));
  };

  useEffect(() => {
    onGameOverStateChange?.(gameOver);
    if (gameOver) {
      const timer = setTimeout(() => {
        setShowMainMenuButton(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowMainMenuButton(false);
    }
  }, [gameOver, onGameOverStateChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      const queue = inputQueueRef.current;
      const lastDir = queue.length > 0 ? queue[queue.length - 1] : lastExecutedDirectionRef.current;
      let newDir: Point | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (lastDir.y !== 1) newDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
          if (lastDir.y !== -1) newDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
          if (lastDir.x !== 1) newDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
          if (lastDir.x !== -1) newDir = { x: 1, y: 0 };
          break;
        case ' ':
        case 'p':
          setIsPaused((prev) => !prev);
          break;
      }

      if (newDir) {
        if (newDir.x !== lastDir.x || newDir.y !== lastDir.y) {
          if (queue.length < 3) {
            queue.push(newDir);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const moveSnake = () => {
      let nextDir = lastExecutedDirectionRef.current;
      if (inputQueueRef.current.length > 0) {
        nextDir = inputQueueRef.current.shift()!;
        lastExecutedDirectionRef.current = nextDir;
        setDirection(nextDir);
      }

      const head = snake[0];
      const newHead = {
        x: head.x + nextDir.x,
        y: head.y + nextDir.y,
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
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        setGameOver(true);
        onGameOver?.(score);
        return;
      }

      const newSnake = [newHead, ...snake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        if (navigator.vibrate) navigator.vibrate(50);
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
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative bg-black/60 border-4 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 backdrop-blur-md ${isFullScreen ? 'rounded-none border-0 shadow-none' : ''} ${
          theme === 'cyber' ? 'shadow-[0_0_40px_rgba(6,182,212,0.5),inset_0_0_30px_rgba(6,182,212,0.2)] border-cyan-400/80' : 
          theme === 'plasma' ? 'shadow-[0_0_40px_rgba(217,70,239,0.5),inset_0_0_30px_rgba(217,70,239,0.2)] border-fuchsia-400/80' : 
          'shadow-[0_0_40px_rgba(255,255,255,0.2),inset_0_0_30px_rgba(255,255,255,0.1)] border-zinc-400/80'
        }`}
        style={{
          width: '100vmin',
          height: '100vmin',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: '1 / 1',
          backgroundImage: theme === 'cyber' 
            ? 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0.8) 100%)' 
            : theme === 'plasma'
            ? 'radial-gradient(circle at 50% 50%, rgba(217,70,239,0.15) 0%, rgba(0,0,0,0.8) 100%)'
            : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.8) 100%)'
        }}
      >
        {/* Obstacles */}
        {obstacles.map((obs, index) => (
          <motion.div
            key={`obs-${index}-${obs.x}-${obs.y}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.01, ease: "easeOut" }}
            className={`absolute flex items-center justify-center rounded-sm overflow-hidden backdrop-blur-sm ${
              theme === 'cyber' 
                ? 'bg-red-950/60 border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.6),inset_0_0_15px_rgba(239,68,68,0.5)]' 
                : theme === 'plasma'
                ? 'bg-purple-950/60 border border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.6),inset_0_0_15px_rgba(168,85,247,0.5)]'
                : 'bg-zinc-800/80 border border-zinc-400/50 shadow-[0_0_15px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(255,255,255,0.1)]'
            }`}
            style={{
              width: `${cellSize}%`,
              height: `${cellSize}%`,
              left: `${obs.x * cellSize}%`,
              top: `${obs.y * cellSize}%`,
            }}
          >
            {/* Inner texture */}
            <div className={`w-full h-full opacity-60 ${
              theme === 'cyber' ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(239,68,68,0.3)_2px,rgba(239,68,68,0.3)_4px)]' :
              theme === 'plasma' ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(168,85,247,0.3)_2px,rgba(168,85,247,0.3)_4px)]' :
              'bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]'
            }`} />
            {/* 3D Highlights */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />
            <div className="absolute top-0 left-0 w-[1px] h-full bg-white/30" />
            <div className="absolute bottom-0 right-0 w-full h-[1px] bg-black/60" />
            <div className="absolute bottom-0 right-0 w-[1px] h-full bg-black/60" />
          </motion.div>
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
          className="absolute flex items-center justify-center"
          style={{
            width: `${cellSize}%`,
            height: `${cellSize}%`,
            left: `${food.x * cellSize}%`,
            top: `${food.y * cellSize}%`,
          }}
        >
          {/* Food Glow Aura */}
          <motion.div 
            className={`absolute w-[180%] h-[180%] rounded-full opacity-40 blur-md ${
              theme === 'cyber' ? 'bg-orange-500' : 
              theme === 'plasma' ? 'bg-fuchsia-500' : 
              'bg-sky-400'
            }`}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />

          <div className={`w-full h-full flex items-center justify-center relative z-10 ${theme === 'cyber' ? 'animate-bounce' : ''}`}>
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
              if (direction.x === 1) headRotation = 90;
              else if (direction.x === -1) headRotation = -90;
              else if (direction.y === 1) headRotation = 180;
              else if (direction.y === -1) headRotation = 0;
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
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none transition-all duration-300 ${isPaused ? 'opacity-60 scale-110' : 'opacity-0 scale-100'}`}
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
              initial={{ scale: 0.5, opacity: 0, y: -20 }}
              animate={{ scale: [1.2, 1], opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 10 }}
              className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] tracking-widest text-center whitespace-nowrap"
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
              {canRevive && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ 
                    boxShadow: ["0 0 15px rgba(34,197,94,0.6)", "0 0 25px rgba(34,197,94,0.9)", "0 0 15px rgba(34,197,94,0.6)"] 
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={continueGame}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full transition-colors flex flex-col items-center justify-center leading-tight"
                >
                  <span>CONTINUE</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 font-normal">1 Chance Today</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  boxShadow: ["0 0 15px rgba(6,182,212,0.6)", "0 0 25px rgba(6,182,212,0.9)", "0 0 15px rgba(6,182,212,0.6)"] 
                }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                onClick={resetGame}
                className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-colors"
              >
                PLAY AGAIN
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  boxShadow: ["0 0 0px rgba(217,70,239,0)", "0 0 15px rgba(217,70,239,0.4)", "0 0 0px rgba(217,70,239,0)"] 
                }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}
                onClick={onShowLeaderboard}
                className="w-full px-6 py-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-400 border border-fuchsia-500/50 font-bold rounded-full transition-colors"
              >
                LEADERBOARD
              </motion.button>
              {onReturnToMenu && showMainMenuButton && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onReturnToMenu}
                  className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold rounded-full transition-colors"
                >
                  MAIN MENU
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && !gameOver && !showInstructions && (
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

      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg z-30 p-6 text-center"
          >
            <h2 className="text-3xl font-display font-bold text-cyan-400 mb-6 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
              HOW TO PLAY
            </h2>
            <div className="flex flex-col gap-4 text-white/90 mb-8 max-w-xs">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">↑</div>
                  <div className="flex gap-1">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">←</div>
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">↓</div>
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold text-lg">→</div>
                  </div>
                </div>
                <p className="text-sm text-left">Swipe anywhere on the screen to change direction.</p>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="w-12 h-12 flex items-center justify-center bg-fuchsia-500/20 rounded-full shrink-0">
                  <svg className="w-6 h-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-sm text-left">Tap the center of the screen to pause or resume.</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('hasSeenSwipeInstructions', 'true');
                setShowInstructions(false);
                setIsPaused(false);
              }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all tracking-widest"
            >
              GOT IT
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile D-Pad Controls Overlay */}
      {isMobile && !gameOver && !showInstructions && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 opacity-50 hover:opacity-90 transition-opacity pointer-events-auto">
          <button 
            className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl active:bg-white/30 backdrop-blur-sm touch-manipulation"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDirectionClick({ x: 0, y: -1 }); }}
          >↑</button>
          <div className="flex gap-12">
            <button 
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl active:bg-white/30 backdrop-blur-sm touch-manipulation"
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDirectionClick({ x: -1, y: 0 }); }}
            >←</button>
            <button 
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl active:bg-white/30 backdrop-blur-sm touch-manipulation"
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDirectionClick({ x: 1, y: 0 }); }}
            >→</button>
          </div>
          <button 
            className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl active:bg-white/30 backdrop-blur-sm touch-manipulation"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDirectionClick({ x: 0, y: 1 }); }}
          >↓</button>
        </div>
      )}
    </div>
  );
}
