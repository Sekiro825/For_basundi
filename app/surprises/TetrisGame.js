'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const COLS = 10;
const ROWS = 16;
const TARGET_SCORE = 100;

// Tetromino definitions
const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#38bdf8', // Cyan
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#818cf8', // Indigo/Blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#fb923c', // Orange
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#facc15', // Yellow
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#4ade80', // Green
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#f472b6', // Pink
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#fb7185', // Rose
  },
};

const SHAPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

function getRandomTetromino() {
  const randKey = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    key: randKey,
    ...TETROMINOES[randKey],
  };
}

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export default function TetrisGame({ onWin }) {
  const [grid, setGrid] = useState(createEmptyGrid);
  const [current, setCurrent] = useState(() => ({
    tetromino: getRandomTetromino(),
    x: 3,
    y: 0,
  }));
  const [nextPiece, setNextPiece] = useState(getRandomTetromino);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const wonRef = useRef(false);

  // Refs for loop state
  const gridRef = useRef(grid);
  const currentRef = useRef(current);
  const scoreRef = useRef(score);
  const nextPieceRef = useRef(nextPiece);

  gridRef.current = grid;
  currentRef.current = current;
  scoreRef.current = score;
  nextPieceRef.current = nextPiece;

  // Collision check helper
  const checkCollision = useCallback((tetromino, x, y, board) => {
    const { shape } = tetromino;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && board[newY][newX] !== null) return true;
        }
      }
    }
    return false;
  }, []);

  // Lock piece into board and check line clears
  const lockAndSpawn = useCallback(() => {
    const { tetromino, x, y } = currentRef.current;
    const newGrid = gridRef.current.map((row) => [...row]);

    // Lock cells
    for (let r = 0; r < tetromino.shape.length; r++) {
      for (let c = 0; c < tetromino.shape[r].length; c++) {
        if (tetromino.shape[r][c]) {
          const boardY = y + r;
          const boardX = x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newGrid[boardY][boardX] = tetromino.color;
          }
        }
      }
    }

    // Check completed lines
    let linesCleared = 0;
    const updatedGrid = newGrid.filter((row) => {
      if (row.every((cell) => cell !== null)) {
        linesCleared++;
        return false;
      }
      return true;
    });

    while (updatedGrid.length < ROWS) {
      updatedGrid.unshift(Array(COLS).fill(null));
    }

    // Update score
    let points = 0;
    if (linesCleared === 1) points = 50;
    else if (linesCleared === 2) points = 120;
    else if (linesCleared === 3) points = 200;
    else if (linesCleared >= 4) points = 400;

    const newScore = scoreRef.current + points;
    setScore(newScore);
    if (linesCleared > 0) setLines((l) => l + linesCleared);

    if (newScore >= TARGET_SCORE && !wonRef.current) {
      wonRef.current = true;
      onWin();
      return;
    }

    // Spawn next piece
    const upcoming = nextPieceRef.current;
    const spawnX = Math.floor((COLS - upcoming.shape[0].length) / 2);
    const spawnY = 0;

    if (checkCollision(upcoming, spawnX, spawnY, updatedGrid)) {
      setGrid(updatedGrid);
      setGameOver(true);
    } else {
      setGrid(updatedGrid);
      setCurrent({ tetromino: upcoming, x: spawnX, y: spawnY });
      setNextPiece(getRandomTetromino());
    }
  }, [checkCollision, onWin]);

  // Tick step (move down)
  const stepDown = useCallback(() => {
    if (gameOver || wonRef.current) return;
    const { tetromino, x, y } = currentRef.current;
    if (!checkCollision(tetromino, x, y + 1, gridRef.current)) {
      setCurrent((prev) => ({ ...prev, y: prev.y + 1 }));
    } else {
      lockAndSpawn();
    }
  }, [checkCollision, gameOver, lockAndSpawn]);

  // Main game tick loop
  useEffect(() => {
    if (gameOver || wonRef.current) return;
    const interval = setInterval(stepDown, 480);
    return () => clearInterval(interval);
  }, [stepDown, gameOver]);

  // Player Actions
  const moveLeft = () => {
    if (gameOver || wonRef.current) return;
    const { tetromino, x, y } = currentRef.current;
    if (!checkCollision(tetromino, x - 1, y, gridRef.current)) {
      setCurrent((prev) => ({ ...prev, x: prev.x - 1 }));
    }
  };

  const moveRight = () => {
    if (gameOver || wonRef.current) return;
    const { tetromino, x, y } = currentRef.current;
    if (!checkCollision(tetromino, x + 1, y, gridRef.current)) {
      setCurrent((prev) => ({ ...prev, x: prev.x + 1 }));
    }
  };

  const rotate = () => {
    if (gameOver || wonRef.current) return;
    const { tetromino, x, y } = currentRef.current;
    // Rotate matrix 90 degrees clockwise
    const shape = tetromino.shape;
    const newShape = shape[0].map((_, c) => shape.map((row) => row[c]).reverse());
    const newTetromino = { ...tetromino, shape: newShape };

    // Wall kick attempts (offset x if near edges)
    let kickX = 0;
    if (checkCollision(newTetromino, x, y, gridRef.current)) {
      if (!checkCollision(newTetromino, x - 1, y, gridRef.current)) kickX = -1;
      else if (!checkCollision(newTetromino, x + 1, y, gridRef.current)) kickX = 1;
      else if (!checkCollision(newTetromino, x - 2, y, gridRef.current)) kickX = -2;
      else if (!checkCollision(newTetromino, x + 2, y, gridRef.current)) kickX = 2;
      else return; // Rotation invalid
    }

    setCurrent((prev) => ({
      ...prev,
      x: prev.x + kickX,
      tetromino: newTetromino,
    }));
  };

  const hardDrop = () => {
    if (gameOver || wonRef.current) return;
    let { tetromino, x, y } = currentRef.current;
    while (!checkCollision(tetromino, x, y + 1, gridRef.current)) {
      y++;
    }
    currentRef.current.y = y;
    setCurrent((prev) => ({ ...prev, y }));
    lockAndSpawn();
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft') moveLeft();
      else if (e.key === 'ArrowRight') moveRight();
      else if (e.key === 'ArrowUp') rotate();
      else if (e.key === 'ArrowDown') stepDown();
      else if (e.key === ' ') hardDrop();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepDown]);

  // Reset Game
  const restart = () => {
    const freshGrid = createEmptyGrid();
    setGrid(freshGrid);
    const p1 = getRandomTetromino();
    setCurrent({ tetromino: p1, x: 3, y: 0 });
    setNextPiece(getRandomTetromino());
    setScore(0);
    setLines(0);
    setGameOver(false);
    wonRef.current = false;
  };

  // Render combined view of grid + falling piece
  const displayGrid = grid.map((row) => [...row]);
  const { tetromino, x, y } = current;
  if (!gameOver && tetromino) {
    for (let r = 0; r < tetromino.shape.length; r++) {
      for (let c = 0; c < tetromino.shape[r].length; c++) {
        if (tetromino.shape[r][c]) {
          const by = y + r;
          const bx = x + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            displayGrid[by][bx] = tetromino.color;
          }
        }
      }
    }
  }

  return (
    <div className="tetris-container">
      <div className="game-score-bar">
        <span>Score: {score} / {TARGET_SCORE} | Lines: {lines}</span>
        <div className="score-fill" style={{ width: `${Math.min(100, (score / TARGET_SCORE) * 100)}%` }} />
      </div>

      <div className="tetris-layout">
        <div className="tetris-board">
          {displayGrid.map((row, rIdx) => (
            <div key={rIdx} className="tetris-row">
              {row.map((cellColor, cIdx) => (
                <div
                  key={cIdx}
                  className={`tetris-cell ${cellColor ? 'filled' : ''}`}
                  style={{ backgroundColor: cellColor || 'transparent' }}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="tetris-side">
          <div className="next-box">
            <small>NEXT</small>
            <div className="next-grid">
              {nextPiece.shape.map((row, r) => (
                <div key={r} className="next-row">
                  {row.map((val, c) => (
                    <div
                      key={c}
                      className="next-cell"
                      style={{ backgroundColor: val ? nextPiece.color : 'transparent' }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tetris-controls">
        <button className="tiny-action" onClick={moveLeft}>←</button>
        <button className="tiny-action" onClick={rotate}>↻ Rotate</button>
        <button className="tiny-action" onClick={stepDown}>↓</button>
        <button className="tiny-action" onClick={moveRight}>→</button>
        <button className="tiny-action hard-drop-btn" onClick={hardDrop}>⏬ Drop</button>
      </div>

      {gameOver && (
        <div className="game-over-box">
          <p>Game Over! Score: {score}</p>
          <button className="tiny-action" onClick={restart}>Try Again</button>
        </div>
      )}
    </div>
  );
}
