import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pause, Play } from 'lucide-react';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [
  { x: 7, y: 7 },
  { x: 7, y: 8 },
  { x: 7, y: 9 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 150;

interface Point {
  x: number;
  y: number;
}

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
  onGameOver?: (score: number) => void;
  onShowLeaderboard?: () => void;
  highScore: number;
}

export default function SnakeGame({ onScoreChange, onGameOver, onShowLeaderboard, highScore }: SnakeGameProps) {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

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

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
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
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    onScoreChange(0);
    setGameOver(false);
    setIsPaused(false);
    setFood(generateFood(INITIAL_SNAKE));
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
        newHead.x = GRID_SIZE - 1;
      } else if (newHead.x >= GRID_SIZE) {
        newHead.x = 0;
      }

      if (newHead.y < 0) {
        newHead.y = GRID_SIZE - 1;
      } else if (newHead.y >= GRID_SIZE) {
        newHead.y = 0;
      }

      // Check collision with self
      if (
        snake.some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y
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
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    };

    const timeoutId = setTimeout(moveSnake, GAME_SPEED);
    return () => clearTimeout(timeoutId);
  }, [snake, food, gameOver, isPaused, score, onScoreChange, generateFood]);

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full relative touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="grid bg-black/40 border-2 border-cyan-500 rounded-lg shadow-[0_0_25px_rgba(6,182,212,0.5)] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: 'min(98vw, 98vh)',
          height: 'min(98vw, 98vh)',
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const snakeIndex = snake.findIndex((segment) => segment.x === x && segment.y === y);
          const isSnake = snakeIndex !== -1;
          const isHead = snakeIndex === 0;
          const isTail = snakeIndex === snake.length - 1 && snake.length > 1;
          const isFood = food.x === x && food.y === y;

          let content = null;

          if (isHead) {
            let headRotation = 0;
            if (snake.length > 1) {
              const dx = snake[0].x - snake[1].x;
              const dy = snake[0].y - snake[1].y;
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

            content = (
              <div
                className="w-full h-full bg-green-600 rounded-t-full rounded-b-sm relative z-10 shadow-[0_0_12px_rgba(22,163,74,0.7)]"
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
                <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[10%] h-[40%] bg-red-500 flex justify-center">
                  <div className="absolute -top-[20%] left-0 w-[80%] h-[40%] bg-red-500 rotate-45 origin-bottom-right" />
                  <div className="absolute -top-[20%] right-0 w-[80%] h-[40%] bg-red-500 -rotate-45 origin-bottom-left" />
                </div>
              </div>
            );
          } else if (isTail) {
            content = (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-[60%] h-[60%] bg-green-700 rounded-full shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]" />
              </div>
            );
          } else if (isSnake) {
            const isEven = snakeIndex % 2 === 0;
            content = (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`w-[96%] h-[96%] ${isEven ? 'bg-green-500' : 'bg-green-600'} rounded-lg shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]`} />
              </div>
            );
          } else if (isFood) {
            content = (
              <div className="w-full h-full flex items-center justify-center relative animate-bounce">
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
                  {/* Whiskers */}
                  <div className="absolute top-[55%] left-[5%] w-[20%] h-[2px] bg-white/60 rotate-12" />
                  <div className="absolute top-[65%] left-[5%] w-[20%] h-[2px] bg-white/60 -rotate-12" />
                  <div className="absolute top-[55%] right-[5%] w-[20%] h-[2px] bg-white/60 -rotate-12" />
                  <div className="absolute top-[65%] right-[5%] w-[20%] h-[2px] bg-white/60 rotate-12" />
                </div>
              </div>
            );
          }

          return (
            <div key={index} className={`w-full h-full ${!content ? 'border border-cyan-900/10' : ''}`}>
              {content}
            </div>
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

      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg z-20">
          <h2 className="text-4xl font-bold text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
            GAME OVER
          </h2>
          <div className="flex flex-col items-center gap-2 mb-6">
            <p className="text-xl text-cyan-300">Final Score: {score}</p>
            <p className="text-sm text-fuchsia-400 uppercase tracking-widest">High Score: {Math.max(score, highScore)}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-[200px]">
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
          </div>
        </div>
      )}

      {isPaused && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg z-20">
          <h2 className="text-4xl font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
            PAUSED
          </h2>
        </div>
      )}
    </div>
  );
}
