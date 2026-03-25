import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 150;

interface Point {
  x: number;
  y: number;
}

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
}

export default function SnakeGame({ onScoreChange }: SnakeGameProps) {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const directionRef = useRef(direction);
  directionRef.current = direction;

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
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <div
        className="grid bg-black/40 border-2 border-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: 'min(80vw, 500px)',
          height: 'min(80vw, 500px)',
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
                className="w-full h-full bg-green-600 rounded-t-full rounded-b-sm relative z-10 shadow-[0_0_10px_rgba(22,163,74,0.6)]"
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
                <div className={`w-[90%] h-[90%] ${isEven ? 'bg-green-500' : 'bg-green-600'} rounded-lg shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]`} />
              </div>
            );
          } else if (isFood) {
            content = (
              <div className="w-full h-full flex items-center justify-center relative animate-bounce">
                {/* Left Ear */}
                <div className="absolute top-[15%] left-[15%] w-[30%] h-[30%] bg-orange-500 rounded-tl-md rotate-[-45deg]" />
                {/* Right Ear */}
                <div className="absolute top-[15%] right-[15%] w-[30%] h-[30%] bg-orange-500 rounded-tr-md rotate-[45deg]" />
                {/* Head */}
                <div className="absolute top-[25%] w-[75%] h-[65%] bg-orange-400 rounded-full shadow-sm">
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
            <div key={index} className={`w-full h-full ${!content ? 'border border-cyan-900/20' : ''}`}>
              {content}
            </div>
          );
        })}
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg z-20">
          <h2 className="text-4xl font-bold text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
            GAME OVER
          </h2>
          <p className="text-xl text-cyan-300 mb-6">Final Score: {score}</p>
          <button
            onClick={resetGame}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)]"
          >
            PLAY AGAIN
          </button>
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
