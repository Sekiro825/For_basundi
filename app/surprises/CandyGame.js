'use client';

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';

const CANDS = ['🍓', '🍬', '🍋', '🫐', '🍊', '🍇'];
const R = 8, C = 8;
const SWAP_DURATION = 250;
const MATCH_POP_DURATION = 300;
const GRAVITY_DURATION = 400;

const LEVELS = [
  { level: 1, target: 300, moves: 25 },
  { level: 2, target: 450, moves: 22 },
  { level: 3, target: 600, moves: 20 },
  { level: 4, target: 750, moves: 18 },
  { level: 5, target: 1000, moves: 22 },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findMatches(board) {
  const matchGroups = [];

  // Horizontal matches
  for (let r = 0; r < R; r++) {
    let matchLen = 1;
    for (let c = 0; c < C; c++) {
      let current = board[r][c];
      let next = board[r][c + 1];
      let isSame = current && !current.isBlocker && next && !next.isBlocker && 
                   (current.baseType || current.type) === (next.baseType || next.type) &&
                   (current.baseType || current.type) !== 'bomb';
      
      if (isSame) {
        matchLen++;
      } else {
        if (matchLen >= 3) {
          const coords = [];
          for (let i = 0; i < matchLen; i++) coords.push([r, c - i]);
          matchGroups.push({ coords, isHoriz: true, len: matchLen });
        }
        matchLen = 1;
      }
    }
  }
  
  // Vertical matches
  for (let c = 0; c < C; c++) {
    let matchLen = 1;
    for (let r = 0; r < R; r++) {
      let current = board[r][c];
      let next = board[r + 1]?.[c];
      let isSame = current && !current.isBlocker && next && !next.isBlocker && 
                   (current.baseType || current.type) === (next.baseType || next.type) &&
                   (current.baseType || current.type) !== 'bomb';
      
      if (isSame) {
        matchLen++;
      } else {
        if (matchLen >= 3) {
          const coords = [];
          for (let i = 0; i < matchLen; i++) coords.push([r - i, c]);
          matchGroups.push({ coords, isHoriz: false, len: matchLen });
        }
        matchLen = 1;
      }
    }
  }
  
  return matchGroups;
}

function hasValidMoves(board) {
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const currentCell = board[r][c];
      if (!currentCell || currentCell.isBlocker) continue;
      
      if (c + 1 < C) {
        const rightCell = board[r][c + 1];
        if (rightCell && !rightCell.isBlocker) {
          if (currentCell.type === 'bomb' || rightCell.type === 'bomb') return true;
          const tempBoard = board.map(row => [...row]);
          tempBoard[r][c] = rightCell;
          tempBoard[r][c + 1] = currentCell;
          if (findMatches(tempBoard).length > 0) return true;
        }
      }
      
      if (r + 1 < R) {
        const bottomCell = board[r + 1][c];
        if (bottomCell && !bottomCell.isBlocker) {
          if (currentCell.type === 'bomb' || bottomCell.type === 'bomb') return true;
          const tempBoard = board.map(row => [...row]);
          tempBoard[r][c] = bottomCell;
          tempBoard[r + 1][c] = currentCell;
          if (findMatches(tempBoard).length > 0) return true;
        }
      }
    }
  }
  return false;
}

function makeBoard(level = 1) {
  let b;
  let attempts = 0;
  do {
    b = [];
    const blockerPositions = new Set();
    
    // Balanced blocker scaling
    if (level >= 1) { // 4 blockers
      blockerPositions.add(`3,3`); blockerPositions.add(`3,4`);
      blockerPositions.add(`4,3`); blockerPositions.add(`4,4`);
    }
    if (level >= 2) { // +2 = 6 blockers
      blockerPositions.add(`2,2`); blockerPositions.add(`5,5`);
    }
    if (level >= 3) { // +2 = 8 blockers
      blockerPositions.add(`2,5`); blockerPositions.add(`5,2`);
    }
    if (level >= 4) { // +2 = 10 blockers
      blockerPositions.add(`1,1`); blockerPositions.add(`6,6`);
    }
    if (level >= 5) { // +4 = 14 blockers
      blockerPositions.add(`1,6`); blockerPositions.add(`6,1`);
      blockerPositions.add(`0,3`); blockerPositions.add(`7,4`);
    }

    const blockerStrength = level > 3 ? 3 : (level > 2 ? 2 : 1);

    for (let r = 0; r < R; r++) {
      b[r] = [];
      for (let c = 0; c < C; c++) {
        if (blockerPositions.has(`${r},${c}`)) {
          b[r][c] = {
            type: '🧊',
            id: `block-${r}-${c}-${Date.now()}-${Math.random()}`,
            isBlocker: true,
            strength: blockerStrength
          };
          continue;
        }
        let v;
        do {
          v = CANDS[Math.floor(Math.random() * CANDS.length)];
        } while (
          (c >= 2 && b[r][c - 1] && (b[r][c - 1].baseType || b[r][c - 1].type) === v && !b[r][c - 1].isBlocker && 
           b[r][c - 2] && (b[r][c - 2].baseType || b[r][c - 2].type) === v && !b[r][c - 2].isBlocker) ||
          (r >= 2 && b[r - 1][c] && (b[r - 1][c].baseType || b[r - 1][c].type) === v && !b[r - 1][c].isBlocker && 
           b[r - 2][c] && (b[r - 2][c].baseType || b[r - 2][c].type) === v && !b[r - 2][c].isBlocker)
        );
        b[r][c] = { type: v, baseType: v, id: `${r}-${c}-${Date.now()}-${Math.random()}` };
      }
    }
    attempts++;
  } while (!hasValidMoves(b) && attempts < 100);
  return b;
}

function shuffleCandies(board) {
  const candies = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (board[r][c] && !board[r][c].isBlocker) {
        candies.push(board[r][c]);
      }
    }
  }
  
  let shuffledBoard;
  let attempts = 0;
  let success = false;
  
  while (attempts < 100) {
    const shuffledCandies = shuffle(candies);
    let candyIdx = 0;
    
    shuffledBoard = board.map(row => row.map(cell => {
      if (cell && cell.isBlocker) return { ...cell };
      return shuffledCandies[candyIdx++];
    }));
    
    if (findMatches(shuffledBoard).length === 0 && hasValidMoves(shuffledBoard)) {
      success = true;
      break;
    }
    attempts++;
  }
  
  if (!success) {
    attempts = 0;
    while (attempts < 100) {
      shuffledBoard = board.map((row, r) => row.map((cell, c) => {
        if (cell && cell.isBlocker) return { ...cell };
        const v = CANDS[Math.floor(Math.random() * CANDS.length)];
        return {
          type: v, baseType: v,
          id: `shuf-${r}-${c}-${Date.now()}-${Math.random()}`
        };
      }));
      if (findMatches(shuffledBoard).length === 0 && hasValidMoves(shuffledBoard)) break;
      attempts++;
    }
  }
  
  return shuffledBoard;
}

function applyGravity(board) {
  const newBoard = board.map(row => row.map(() => null));
  const newCandies = [];
  
  for (let c = 0; c < C; c++) {
    for (let r = 0; r < R; r++) {
      if (board[r][c] && board[r][c].isBlocker && !board[r][c].matched) {
        newBoard[r][c] = { ...board[r][c] };
      }
    }
    
    let writeRow = R - 1;
    for (let r = R - 1; r >= 0; r--) {
      while (writeRow >= 0 && newBoard[writeRow][c] && newBoard[writeRow][c].isBlocker) {
        writeRow--;
      }
      
      if (board[r][c] && !board[r][c].isBlocker && !board[r][c].matched) {
        if (writeRow >= 0) {
          const candy = { ...board[r][c] };
          newBoard[writeRow][c] = candy;
          if (writeRow !== r) {
            newCandies.push({ candy, fromRow: r, toRow: writeRow, col: c });
          }
          writeRow--;
        }
      }
    }
    
    for (let r = writeRow; r >= 0; r--) {
      if (newBoard[r][c] && newBoard[r][c].isBlocker) continue;
      const v = CANDS[Math.floor(Math.random() * CANDS.length)];
      const candy = { type: v, baseType: v, id: `new-${r}-${c}-${Date.now()}-${Math.random()}` };
      newBoard[r][c] = candy;
      newCandies.push({ candy, fromRow: r - (writeRow - r + 1), toRow: r, col: c, isNew: true });
    }
  }
  return { board: newBoard, newCandies };
}

const CandyCell = memo(({ candy, anim, r, c, onPointerDown, onPointerMove, onPointerUp, disabled }) => {
  let cellStyle = {};
  let btnStyle = {};
  let cellClass = 'candy-cell';
  let btnClass = 'candy-btn';

  if (candy.isBlocker) {
    btnClass += ' blocker-btn';
    if (candy.strength === 1) btnClass += ' strength-1';
  } else if (candy.type === 'stripe-h') {
    btnClass += ' special-stripe-h';
  } else if (candy.type === 'stripe-v') {
    btnClass += ' special-stripe-v';
  } else if (candy.type === 'bomb') {
    btnClass += ' special-bomb';
  }

  if (anim) {
    if (anim.type === 'swap') {
      cellStyle = { 
        transform: `translate3d(${anim.dx}px, ${anim.dy}px, 0)`, 
        transition: `transform ${SWAP_DURATION}ms ease-in-out`,
        zIndex: 10 
      };
      btnClass += ' swapping';
    } else if (anim.type === 'pop') {
      btnClass += ' popping';
      cellClass += ' flash';
    } else if (anim.type === 'fall-start') {
      cellStyle = { transform: `translate3d(0, ${anim.dy}px, 0)` };
      if (anim.isNew) btnStyle = { opacity: 0 };
    } else if (anim.type === 'fall-end') {
      cellStyle = { 
        transform: `translate3d(0, 0, 0)`, 
        transition: `transform ${GRAVITY_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)` 
      };
      if (anim.isNew) btnClass += ' new-candy';
    }
  }

  return (
    <div className={cellClass} style={cellStyle}>
      <button
        className={btnClass}
        style={btnStyle}
        onPointerDown={(e) => onPointerDown(e, r, c)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        disabled={disabled || !!anim}
        aria-label={`Candy at row ${r + 1} column ${c + 1}`}
      >
        {candy.isBlocker ? '' : (
          candy.type === 'bomb' ? (
            <span className="candy-icon-wrap bomb-wrap">
              <span className="candy-emoji">🪩</span>
              <span className="candy-badge bomb-badge">✨</span>
            </span>
          ) : candy.type === 'stripe-h' ? (
            <span className="candy-icon-wrap stripe-h-wrap">
              <span className="candy-emoji">{candy.baseType}</span>
              <span className="stripe-beam stripe-beam-h" />
              <span className="candy-badge stripe-badge-h">↔️</span>
            </span>
          ) : candy.type === 'stripe-v' ? (
            <span className="candy-icon-wrap stripe-v-wrap">
              <span className="candy-emoji">{candy.baseType}</span>
              <span className="stripe-beam stripe-beam-v" />
              <span className="candy-badge stripe-badge-v">↕️</span>
            </span>
          ) : (
            <span className="candy-emoji">{candy.type}</span>
          )
        )}
      </button>
    </div>
  );
});
CandyCell.displayName = 'CandyCell';

export default function CandyGame({ onWin }) {
  const [level, setLevel] = useState(1);
  const currentLevel = LEVELS[level - 1];
  const TARGET = currentLevel.target;

  const [board, setBoard] = useState(() => makeBoard(1));
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState('Swipe to swap candies!');
  const [animating, setAnimating] = useState(false);
  const [animations, setAnimations] = useState([]);
  const [particles, setParticles] = useState([]);
  const [movesLeft, setMovesLeft] = useState(currentLevel.moves);
  const [gameOver, setGameOver] = useState(false);
  const [levelAnimating, setLevelAnimating] = useState(false);
  
  const boardRef = useRef(null);
  const dragRef = useRef({ active: false, startR: -1, startC: -1, startX: 0, startY: 0, swapped: false });
  const wonRef = useRef(false);

  useEffect(() => {
    if (score >= TARGET && !wonRef.current && !levelAnimating) {
      if (level < 5) {
        setLevelAnimating(true);
        setMsg(`Level ${level} complete! Get ready...`);
        setTimeout(() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setBoard(makeBoard(nextLevel));
          setMovesLeft(LEVELS[nextLevel - 1].moves);
          setScore(0);
          setMsg(`Level ${nextLevel}: Reach ${LEVELS[nextLevel - 1].target} points!`);
          setLevelAnimating(false);
        }, 2000);
      } else {
        wonRef.current = true;
        setMsg('Sweet victory! 🎉');
        onWin();
      }
    }
  }, [score, level, TARGET, onWin, levelAnimating]);

  useEffect(() => {
    if (movesLeft === 0 && score < TARGET && !gameOver && !levelAnimating && !animating) {
      setGameOver(true);
      setMsg('Out of moves! Game over.');
    }
  }, [movesLeft, score, TARGET, gameOver, levelAnimating, animating]);

  const clearAnimations = useCallback(() => {
    setAnimations([]);
  }, []);

  const playSwapAnimation = useCallback((r1, c1, r2, c2, onComplete) => {
    if (!boardRef.current) { onComplete(); return; }
    const rect = boardRef.current.getBoundingClientRect();
    const cellWidth = rect.width / C;
    const cellHeight = rect.height / R;

    const dx = (c2 - c1) * cellWidth;
    const dy = (r2 - r1) * cellHeight;

    const candy1 = board[r1]?.[c1];
    const candy2 = board[r2]?.[c2];
    if (!candy1 || !candy2) { onComplete(); return; }

    setAnimations([
      { id: candy1.id, type: 'swap', dx, dy },
      { id: candy2.id, type: 'swap', dx: -dx, dy: -dy }
    ]);

    setTimeout(() => {
      clearAnimations();
      onComplete();
    }, SWAP_DURATION);
  }, [board, clearAnimations]);

  const playMatchAnimation = useCallback((matchesList, onComplete) => {
    const matchAnimations = matchesList.map(({ r, c }) => {
      const candy = board[r]?.[c];
      return { type: 'pop', id: candy?.id || `${r}-${c}` };
    });
    
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const newParticles = [];
      const palette = ['#f48fb1', '#ffd54f', '#ffffff', '#ce93d8', '#80deea', '#b39ddb', '#ffab91'];
      
      matchesList.forEach(({ r, c }) => {
        const cx = rect.left + c * (rect.width / C) + (rect.width / C) / 2;
        const cy = rect.top + r * (rect.height / R) + (rect.height / R) / 2;
        
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6 + (Math.random() - 0.5) * 0.5;
          const speed = 40 + Math.random() * 60;
          newParticles.push({
            id: `particle-${r}-${c}-${i}-${Date.now()}`,
            x: cx - rect.left,
            y: cy - rect.top,
            vx: Math.cos(angle) * speed + 'px',
            vy: Math.sin(angle) * speed - 20 + 'px',
            color: palette[Math.floor(Math.random() * palette.length)]
          });
        }
      });
      
      setParticles(prev => {
        const next = [...prev, ...newParticles].slice(-50); // Keep max 50 particles
        return next;
      });
      // Clean up particles after animation
      setTimeout(() => {
         setParticles(p => p.filter(part => !newParticles.find(np => np.id === part.id)));
      }, 600);
    }
    
    setAnimations(matchAnimations);

    setTimeout(() => {
      clearAnimations();
      onComplete();
    }, MATCH_POP_DURATION);
  }, [board, clearAnimations]);

  const playGravityAnimation = useCallback((newCandies, onComplete) => {
    if (!boardRef.current) { onComplete(); return; }
    const rect = boardRef.current.getBoundingClientRect();
    const cellHeight = rect.height / R;

    const gravityAnimsStart = newCandies.map(nc => ({
      id: nc.candy.id, type: 'fall-start', dy: (nc.fromRow - nc.toRow) * cellHeight, isNew: nc.isNew
    }));

    setAnimations(gravityAnimsStart);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimations(gravityAnimsStart.map(a => ({ ...a, type: 'fall-end' })));
      });
    });

    setTimeout(() => {
      clearAnimations();
      onComplete();
    }, GRAVITY_DURATION);
  }, [clearAnimations]);

  const processMove = useCallback((r1, c1, r2, c2) => {
    if (animating || levelAnimating || gameOver || wonRef.current) return;

    const newBoard = board.map(row => row.map(c => ({ ...c })));
    [newBoard[r1][c1], newBoard[r2][c2]] = [newBoard[r2][c2], newBoard[r1][c1]];

    const candy1 = newBoard[r1][c1];
    const candy2 = newBoard[r2][c2];

    let specialActivated = false;
    let forcedClearCells = new Set();

    if (candy1.type === 'bomb' && candy2.type !== 'bomb' && !candy2.isBlocker) {
      specialActivated = true;
      const targetType = candy2.baseType || candy2.type;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (newBoard[r][c] && !newBoard[r][c].isBlocker && (newBoard[r][c].baseType || newBoard[r][c].type) === targetType) {
            forcedClearCells.add(`${r},${c}`);
          }
        }
      }
      forcedClearCells.add(`${r1},${c1}`);
    } else if (candy2.type === 'bomb' && candy1.type !== 'bomb' && !candy1.isBlocker) {
      specialActivated = true;
      const targetType = candy1.baseType || candy1.type;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (newBoard[r][c] && !newBoard[r][c].isBlocker && (newBoard[r][c].baseType || newBoard[r][c].type) === targetType) {
            forcedClearCells.add(`${r},${c}`);
          }
        }
      }
      forcedClearCells.add(`${r2},${c2}`);
    } else if (candy1.type === 'bomb' && candy2.type === 'bomb') {
       // Bomb + Bomb clears board
       specialActivated = true;
       for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) {
             if (newBoard[r][c] && !newBoard[r][c].isBlocker) forcedClearCells.add(`${r},${c}`);
          }
       }
    }

    if (!specialActivated) {
      const initialMatches = findMatches(newBoard);
      if (initialMatches.length === 0) {
        setAnimating(true);
        playSwapAnimation(r1, c1, r2, c2, () => {
          playSwapAnimation(r2, c2, r1, c1, () => {
            setMsg('No match! Try again.');
            setAnimating(false);
            if (!hasValidMoves(board) && !wonRef.current && movesLeft > 0) {
              setMsg('No moves left! Shuffling...');
              setAnimating(true);
              setTimeout(() => {
                setBoard(prevBoard => shuffleCandies(prevBoard));
                setAnimating(false);
                setMsg('Shuffled!');
              }, 1200);
            }
          });
        });
        return;
      }
    }

    const nextMoves = Math.max(0, movesLeft - 1);
    setMovesLeft(nextMoves);
    setAnimating(true);
    setMsg('');

    let totalGained = 0;

    const runCascade = (currentBoard, currentMovesLeft, forcedClear = null) => {
      const cellsToClear = new Set(forcedClear || []);
      const specialsToSpawn = [];
      const activatedSpecials = [];
      
      if (!forcedClear) {
         const matchGroups = findMatches(currentBoard);
         matchGroups.forEach(match => {
            match.coords.forEach(([r, c]) => {
               cellsToClear.add(`${r},${c}`);
               const cell = currentBoard[r][c];
               if (cell.type === 'stripe-h' || cell.type === 'stripe-v') activatedSpecials.push({ r, c, type: cell.type });
            });
            
            if (match.len >= 5) {
               const center = match.coords[2];
               specialsToSpawn.push({ r: center[0], c: center[1], type: 'bomb', baseType: 'bomb' });
            } else if (match.len === 4) {
               const center = match.coords[1];
               const baseType = currentBoard[center[0]][center[1]].baseType || currentBoard[center[0]][center[1]].type;
               specialsToSpawn.push({ r: center[0], c: center[1], type: match.isHoriz ? 'stripe-v' : 'stripe-h', baseType }); // Opposite stripe for coolness
            }
         });
      } else {
         forcedClear.forEach(coord => {
            const [r, c] = coord.split(',').map(Number);
            const cell = currentBoard[r][c];
            if (cell && (cell.type === 'stripe-h' || cell.type === 'stripe-v')) activatedSpecials.push({ r, c, type: cell.type });
         });
      }

      // Process activated specials (Stripes)
      let processingSpecials = [...activatedSpecials];
      while (processingSpecials.length > 0) {
         const spec = processingSpecials.pop();
         if (spec.type === 'stripe-h') {
            for (let c = 0; c < C; c++) {
               if (currentBoard[spec.r][c] && !currentBoard[spec.r][c].isBlocker) {
                  if (!cellsToClear.has(`${spec.r},${c}`)) {
                     cellsToClear.add(`${spec.r},${c}`);
                     if (currentBoard[spec.r][c].type === 'stripe-v') processingSpecials.push({ r: spec.r, c, type: 'stripe-v' });
                  }
               }
            }
         } else if (spec.type === 'stripe-v') {
            for (let r = 0; r < R; r++) {
               if (currentBoard[r][spec.c] && !currentBoard[r][spec.c].isBlocker) {
                  if (!cellsToClear.has(`${r},${spec.c}`)) {
                     cellsToClear.add(`${r},${spec.c}`);
                     if (currentBoard[r][spec.c].type === 'stripe-h') processingSpecials.push({ r, c: spec.c, type: 'stripe-h' });
                  }
               }
            }
         }
      }

      const blockersToDamage = new Set();
      cellsToClear.forEach(coord => {
        const [mr, mc] = coord.split(',').map(Number);
        const neighbors = [[mr - 1, mc], [mr + 1, mc], [mr, mc - 1], [mr, mc + 1]];
        neighbors.forEach(([nr, nc]) => {
          if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
            const cell = currentBoard[nr][nc];
            if (cell && cell.isBlocker && !cell.matched) blockersToDamage.add(`${nr},${nc}`);
          }
        });
      });

      blockersToDamage.forEach(coord => {
        const [br, bc] = coord.split(',').map(Number);
        const blocker = currentBoard[br][bc];
        if (blocker) {
          blocker.strength -= 1;
          if (blocker.strength <= 0) {
            blocker.matched = true;
            cellsToClear.add(`${br},${bc}`);
            totalGained += 20; 
          }
        }
      });

      if (cellsToClear.size === 0) {
        setScore(prev => prev + totalGained);
        if (!hasValidMoves(currentBoard) && !wonRef.current && currentMovesLeft > 0) {
          setMsg('No moves left! Shuffling...');
          setAnimating(true);
          setTimeout(() => {
            setBoard(prevBoard => shuffleCandies(prevBoard));
            setAnimating(false);
            setMsg('Shuffled!');
          }, 1200);
        } else {
          setMsg(totalGained > 50 ? `+${totalGained} pts! Awesome!` : '');
          setAnimating(false);
        }
        return;
      }

      totalGained += cellsToClear.size * 10;
      
      const popList = [];
      cellsToClear.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        if (currentBoard[r][c]) {
           currentBoard[r][c].matched = true;
           popList.push({ r, c });
        }
      });
      
      // Inject specials
      specialsToSpawn.forEach(spec => {
         if (currentBoard[spec.r][spec.c]) {
            currentBoard[spec.r][spec.c].matched = false;
            currentBoard[spec.r][spec.c].type = spec.type;
            currentBoard[spec.r][spec.c].baseType = spec.baseType;
            // Remove from popList so it doesn't vanish
            const idx = popList.findIndex(p => p.r === spec.r && p.c === spec.c);
            if (idx > -1) popList.splice(idx, 1);
         }
      });
      
      playMatchAnimation(popList, () => {
        const gravityResult = applyGravity(currentBoard);
        setBoard(gravityResult.board);
        
        playGravityAnimation(gravityResult.newCandies, () => {
          runCascade(gravityResult.board, currentMovesLeft);
        });
      });
    };

    playSwapAnimation(r1, c1, r2, c2, () => {
      setBoard(newBoard);
      runCascade(newBoard, nextMoves, specialActivated ? forcedClearCells : null);
    });
  }, [board, animating, levelAnimating, gameOver, movesLeft, playSwapAnimation, playMatchAnimation, playGravityAnimation]);

  const onPointerDown = useCallback((e, r, c) => {
    if (animating || levelAnimating || gameOver || wonRef.current) return;
    const cell = board[r]?.[c];
    if (cell && cell.isBlocker) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, startR: r, startC: c, startX: e.clientX, startY: e.clientY, swapped: false };
  }, [board, animating, gameOver, levelAnimating]);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag.active || drag.swapped || animating || levelAnimating) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    let nr = drag.startR, nc = drag.startC;
    if (Math.abs(dx) > Math.abs(dy)) {
      nc = drag.startC + (dx > 0 ? 1 : -1);
    } else {
      nr = drag.startR + (dy > 0 ? 1 : -1);
    }

    if (nr >= 0 && nr < R && nc >= 0 && nc < C && (nr !== drag.startR || nc !== drag.startC)) {
      const targetCell = board[nr]?.[nc];
      if (targetCell && targetCell.isBlocker) {
        dragRef.current.active = false;
        return;
      }
      drag.swapped = true;
      processMove(drag.startR, drag.startC, nr, nc);
    }
  }, [board, animating, levelAnimating, processMove]);

  const onPointerUp = useCallback((e) => {
    const drag = dragRef.current;
    if (drag.active) {
      const target = e.currentTarget;
      if (target.releasePointerCapture) target.releasePointerCapture(e.pointerId);
      dragRef.current = { active: false, startR: -1, startC: -1, startX: 0, startY: 0, swapped: false };
    }
  }, []);

  const renderBoard = useMemo(() => {
    const animMap = new Map(animations.map(a => [a.id, a]));
    return board.flatMap((row, r) =>
      row.map((candy, c) => (
        <CandyCell 
          key={candy.id}
          candy={candy}
          anim={animMap.get(candy.id)}
          r={r} c={c}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          disabled={animating || levelAnimating}
        />
      ))
    );
  }, [board, animations, animating, levelAnimating, onPointerDown, onPointerMove, onPointerUp]);

  return (
    <div className="candy-game">
      <div className="game-score-bar">
        <div className="score-fill" style={{ width: `${Math.min(100, (score / TARGET) * 100)}%` }} />
        <span className="score-label">🍬 Score {score} / {TARGET}</span>
      </div>
      <div className="game-info">
        <span className="info-chip">🏅 Level <strong>{level}/5</strong></span>
        <span className="info-chip">🎯 Moves <strong>{movesLeft}</strong></span>
      </div>
      <div
        className="candy-board"
        ref={boardRef}
        tabIndex={0}
        role="application"
        aria-label="Candy Crush mini game board"
        style={{ gridTemplateColumns: `repeat(${C}, 1fr)` }}
      >
        {renderBoard}
        {particles.length > 0 && (
          <div className="particle-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
            {particles.map(p => (
              <div
                key={p.id}
                className="candy-particle"
                style={{
                  left: p.x, top: p.y,
                  background: p.color,
                  boxShadow: `0 0 6px ${p.color}`,
                  width: '8px', height: '8px',
                  '--vx': p.vx, '--vy': p.vy
                }}
              />
            ))}
          </div>
        )}
      </div>
      {msg && <div className="game-note">{msg}</div>}
    </div>
  );
}