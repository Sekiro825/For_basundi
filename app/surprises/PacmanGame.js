'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Maze template:
// '#' = Wall, '.' = Coin, 'P' = Power Pellet, ' ' = Empty path
const INITIAL_MAZE = [
  ['#','#','#','#','#','#','#','#','#','#','#','#','#'],
  ['#','.','.','.','#','.','.','.','#','.','.','.','#'],
  ['#','P','#','.','#','.','#','.','#','.','#','P','#'],
  ['#','.','#','.','.','.','#','.','.','.','#','.','#'],
  ['#','.','#','#','#','.','#','.','#','#','#','.','#'],
  ['#','.','.','.','.','.','.','.','.','.','.','.','#'],
  ['#','.','#','#','#','.','#','.','#','#','#','.','#'],
  ['#','.','#','.','.','.','#','.','.','.','#','.','#'],
  ['#','P','#','.','#','.','#','.','#','.','#','P','#'],
  ['#','.','.','.','#','.','.','.','#','.','.','.','#'],
  ['#','#','#','#','#','#','#','#','#','#','#','#','#'],
];

const ROWS = INITIAL_MAZE.length;
const COLS = INITIAL_MAZE[0].length;

export default function PacmanGame({ onWin }) {
  const [maze, setMaze] = useState(() => INITIAL_MAZE.map((r) => [...r]));
  const [player, setPlayer] = useState({ r: 5, c: 1, dir: [0, 1] }); // Grishma start
  const [ghosts, setGhosts] = useState([
    { id: 1, r: 5, c: 11, dir: [0, -1], color: '#f43f5e', name: 'Saket' },
    { id: 2, r: 1, c: 6, dir: [1, 0], color: '#ec4899', name: 'Ghostie' },
  ]);
  const [powerTimer, setPowerTimer] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const totalCoinsRef = useRef(0);
  const coinsCollectedRef = useRef(0);
  const wonRef = useRef(false);

  // Initialize total coins count
  useEffect(() => {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (INITIAL_MAZE[r][c] === '.' || INITIAL_MAZE[r][c] === 'P') count++;
      }
    }
    totalCoinsRef.current = count;
  }, []);

  // Direction Helper
  const isValidMove = (r, c, currentMaze) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    return currentMaze[r][c] !== '#';
  };

  const changeDir = (dr, dc) => {
    if (gameOver || wonRef.current) return;
    const nextR = player.r + dr;
    const nextC = player.c + dc;
    if (isValidMove(nextR, nextC, maze)) {
      setPlayer((prev) => ({ ...prev, dir: [dr, dc] }));
    }
  };

  // Game Loop Tick
  useEffect(() => {
    if (gameOver || wonRef.current) return;

    const interval = setInterval(() => {
      // 1. Move Player
      setPlayer((prevPlayer) => {
        const [dr, dc] = prevPlayer.dir;
        const nr = prevPlayer.r + dr;
        const nc = prevPlayer.c + dc;

        if (isValidMove(nr, nc, maze)) {
          // Check item at new cell
          const cell = maze[nr][nc];
          if (cell === '.' || cell === 'P') {
            const isPower = cell === 'P';
            const pointsToAdd = isPower ? 50 : 10;
            
            // Update maze
            setMaze((prevMaze) => {
              const newM = prevMaze.map((row) => [...row]);
              newM[nr][nc] = ' ';
              return newM;
            });

            setScore((s) => s + pointsToAdd);
            coinsCollectedRef.current++;

            if (isPower) {
              setPowerTimer(20); // ~5 seconds of power pellets
            }

            // Check Win Condition
            if (coinsCollectedRef.current >= totalCoinsRef.current && !wonRef.current) {
              wonRef.current = true;
              onWin();
            }
          }
          return { ...prevPlayer, r: nr, c: nc };
        }
        return prevPlayer;
      });

      // 2. Decrement Power Timer
      setPowerTimer((pt) => Math.max(0, pt - 1));

      // 3. Move Ghosts
      setGhosts((prevGhosts) =>
        prevGhosts.map((ghost) => {
          const possibleDirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ].filter(([dr, dc]) => isValidMove(ghost.r + dr, ghost.c + dc, maze));

          if (possibleDirs.length === 0) return ghost;

          // Pick random valid direction, leaning towards player occasionally
          let chosenDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
          
          const nr = ghost.r + chosenDir[0];
          const nc = ghost.c + chosenDir[1];
          return { ...ghost, r: nr, c: nc, dir: chosenDir };
        })
      );
    }, 240);

    return () => clearInterval(interval);
  }, [maze, gameOver, onWin]);

  // Check Collisions between Player & Ghosts
  useEffect(() => {
    if (gameOver || wonRef.current) return;

    ghosts.forEach((ghost) => {
      if (ghost.r === player.r && ghost.c === player.c) {
        if (powerTimer > 0) {
          // Eat Ghost!
          setScore((s) => s + 100);
          setGhosts((prev) =>
            prev.map((g) => (g.id === ghost.id ? { ...g, r: 5, c: 6 } : g))
          );
        } else {
          // Player hit by Ghost
          setLives((l) => {
            const nextL = l - 1;
            if (nextL <= 0) {
              setGameOver(true);
            } else {
              // Reset positions
              setPlayer({ r: 5, c: 1, dir: [0, 1] });
            }
            return nextL;
          });
        }
      }
    });
  }, [player, ghosts, powerTimer, gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') changeDir(-1, 0);
      else if (e.key === 'ArrowDown') changeDir(1, 0);
      else if (e.key === 'ArrowLeft') changeDir(0, -1);
      else if (e.key === 'ArrowRight') changeDir(0, 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maze, player, gameOver]);

  // Touch Swipe Controls
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDir(0, dx > 0 ? 1 : -1);
    } else {
      changeDir(dy > 0 ? 1 : -1, 0);
    }
  };

  const restart = () => {
    setMaze(INITIAL_MAZE.map((r) => [...r]));
    setPlayer({ r: 5, c: 1, dir: [0, 1] });
    setGhosts([
      { id: 1, r: 5, c: 11, dir: [0, -1], color: '#f43f5e', name: 'Saket' },
      { id: 2, r: 1, c: 6, dir: [1, 0], color: '#ec4899', name: 'Ghostie' },
    ]);
    setPowerTimer(0);
    setScore(0);
    setLives(3);
    setGameOver(false);
    coinsCollectedRef.current = 0;
    wonRef.current = false;
  };

  return (
    <div className="pacman-container">
      <div className="game-score-bar">
        <span>Score: {score} | Lives: {'❤️'.repeat(lives)} {powerTimer > 0 ? '⚡ POWER UP!' : ''}</span>
        <div
          className="score-fill"
          style={{ width: `${Math.min(100, (coinsCollectedRef.current / (totalCoinsRef.current || 1)) * 100)}%` }}
        />
      </div>

      <div
        className="pacman-grid"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {maze.flatMap((row, r) =>
          row.map((cell, c) => {
            const isPlayer = player.r === r && player.c === c;
            const ghost = ghosts.find((g) => g.r === r && g.c === c);
            const isWall = cell === '#';
            const isCoin = cell === '.';
            const isPower = cell === 'P';

            return (
              <div
                key={`${r}-${c}`}
                className={`pacman-cell ${isWall ? 'wall' : ''}`}
              >
                {isPlayer && (
                  <div className="pacman-player" title="Grishma">
                    <img src="/assets/avatar_grishma.png" alt="Grishma" onError={(e) => { e.target.style.display = 'none'; }} />
                    <span className="fallback-avatar">👸</span>
                  </div>
                )}
                {!isPlayer && ghost && (
                  <div className={`pacman-ghost ${powerTimer > 0 ? 'scared' : ''}`} title={ghost.name}>
                    <img src="/assets/avatar_saket.png" alt="Saket" onError={(e) => { e.target.style.display = 'none'; }} />
                    <span className="fallback-avatar">{powerTimer > 0 ? '🥺' : '👻'}</span>
                  </div>
                )}
                {!isPlayer && !ghost && isCoin && <span className="pacman-coin">🪙</span>}
                {!isPlayer && !ghost && isPower && <span className="pacman-power">💘</span>}
              </div>
            );
          })
        )}
      </div>

      <div className="dpad">
        <button onClick={() => changeDir(-1, 0)}>↑</button>
        <div>
          <button onClick={() => changeDir(0, -1)}>←</button>
          <button onClick={() => changeDir(0, 1)}>→</button>
        </div>
        <button onClick={() => changeDir(1, 0)}>↓</button>
      </div>

      {gameOver && (
        <div className="game-over-box">
          <p>Caught by Saket! 💥 Score: {score}</p>
          <button className="tiny-action" onClick={restart}>Try Again</button>
        </div>
      )}
    </div>
  );
}
