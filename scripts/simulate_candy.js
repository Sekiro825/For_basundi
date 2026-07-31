const CANDS = ['🍓', '🍬', '🍋', '🫐', '🍊', '🍇'];
const R = 8, C = 8;
const LEVELS = [
  { level: 1, target: 300, moves: 25 },
  { level: 2, target: 450, moves: 22 },
  { level: 3, target: 600, moves: 20 },
  { level: 4, target: 750, moves: 18 },
  { level: 5, target: 1000, moves: 15 },
];

function findMatches(board) {
  const matches = new Set();
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C - 2; c++) {
      const c1 = board[r][c];
      const c2 = board[r][c + 1];
      const c3 = board[r][c + 2];
      if (c1 && !c1.isBlocker && c2 && !c2.isBlocker && c3 && !c3.isBlocker) {
        if (c1.type === c2.type && c1.type === c3.type) {
          matches.add(`${r},${c}`);
          matches.add(`${r},${c + 1}`);
          matches.add(`${r},${c + 2}`);
        }
      }
    }
  }
  for (let r = 0; r < R - 2; r++) {
    for (let c = 0; c < C; c++) {
      const c1 = board[r][c];
      const c2 = board[r + 1][c];
      const c3 = board[r + 2][c];
      if (c1 && !c1.isBlocker && c2 && !c2.isBlocker && c3 && !c3.isBlocker) {
        if (c1.type === c2.type && c1.type === c3.type) {
          matches.add(`${r},${c}`);
          matches.add(`${r + 1},${c}`);
          matches.add(`${r + 2},${c}`);
        }
      }
    }
  }
  return [...matches].map(s => s.split(',').map(Number));
}

function hasValidMoves(board) {
  const validMoves = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const currentCell = board[r][c];
      if (!currentCell || currentCell.isBlocker) continue;
      
      // Try swapping with right neighbor
      if (c + 1 < C) {
        const rightCell = board[r][c + 1];
        if (rightCell && !rightCell.isBlocker) {
          const tempBoard = board.map(row => [...row]);
          tempBoard[r][c] = rightCell;
          tempBoard[r][c + 1] = currentCell;
          if (findMatches(tempBoard).length > 0) {
            validMoves.push({r1: r, c1: c, r2: r, c2: c+1});
          }
        }
      }
      
      // Try swapping with bottom neighbor
      if (r + 1 < R) {
        const bottomCell = board[r + 1][c];
        if (bottomCell && !bottomCell.isBlocker) {
          const tempBoard = board.map(row => [...row]);
          tempBoard[r][c] = bottomCell;
          tempBoard[r + 1][c] = currentCell;
          if (findMatches(tempBoard).length > 0) {
             validMoves.push({r1: r, c1: c, r2: r+1, c2: c});
          }
        }
      }
    }
  }
  return validMoves;
}

function makeBoard(level = 1) {
  let b;
  let attempts = 0;
  do {
    b = [];
    const rMid = Math.floor(R / 2);
    const cMid = Math.floor(C / 2);
    const blockerPositions = new Set();
    
    if (level >= 1) {
      blockerPositions.add(`${rMid - 1},${cMid - 1}`);
      blockerPositions.add(`${rMid - 1},${cMid}`);
      blockerPositions.add(`${rMid},${cMid - 1}`);
      blockerPositions.add(`${rMid},${cMid}`);
    }
    if (level >= 2) {
      blockerPositions.add(`1,1`);
      blockerPositions.add(`1,${C-2}`);
    }
    if (level >= 3) {
      blockerPositions.add(`${R-2},1`);
      blockerPositions.add(`${R-2},${C-2}`);
    }
    if (level >= 4) {
      blockerPositions.add(`3,1`);
      blockerPositions.add(`4,${C-2}`);
    }
    if (level >= 5) {
      blockerPositions.add(`1,3`);
      blockerPositions.add(`1,4`);
      blockerPositions.add(`${R-2},3`);
      blockerPositions.add(`${R-2},4`);
    }

    const blockerStrength = level > 3 ? 3 : (level > 1 ? 2 : 1);

    for (let r = 0; r < R; r++) {
      b[r] = [];
      for (let c = 0; c < C; c++) {
        if (blockerPositions.has(`${r},${c}`)) {
          b[r][c] = {
            type: '🧊',
            isBlocker: true,
            strength: blockerStrength
          };
          continue;
        }
        let v;
        do {
          v = CANDS[Math.floor(Math.random() * CANDS.length)];
        } while (
          (c >= 2 && b[r][c - 1] && b[r][c - 1].type === v && !b[r][c - 1].isBlocker && b[r][c - 2] && b[r][c - 2].type === v && !b[r][c - 2].isBlocker) ||
          (r >= 2 && b[r - 1][c] && b[r - 1][c].type === v && !b[r - 1][c].isBlocker && b[r - 2][c] && b[r - 2][c].type === v && !b[r - 2][c].isBlocker)
        );
        b[r][c] = { type: v };
      }
    }
    attempts++;
  } while (hasValidMoves(b).length === 0 && attempts < 100);
  return b;
}

function applyGravity(board) {
  const newBoard = board.map(row => row.map(() => null));
  
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
          newBoard[writeRow][c] = { ...board[r][c] };
          writeRow--;
        }
      }
    }
    
    for (let r = writeRow; r >= 0; r--) {
      if (newBoard[r][c] && newBoard[r][c].isBlocker) {
        continue;
      }
      newBoard[r][c] = { type: CANDS[Math.floor(Math.random() * CANDS.length)] };
    }
  }
  return newBoard;
}

function playRandomGame(levelConfig) {
  let board = makeBoard(levelConfig.level);
  let score = 0;
  let movesLeft = levelConfig.moves;

  while (movesLeft > 0 && score < levelConfig.target) {
    const validMoves = hasValidMoves(board);
    if (validMoves.length === 0) {
      // Just shuffle and continue
      board = makeBoard(levelConfig.level); // Simple shuffle mock
      continue;
    }
    
    // Pick random valid move
    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    
    // Swap
    [board[move.r1][move.c1], board[move.r2][move.c2]] = [board[move.r2][move.c2], board[move.r1][move.c1]];
    movesLeft--;
    
    let isCascading = true;
    while (isCascading) {
      const matches = findMatches(board);
      const blockersToDamage = new Set();
      matches.forEach(([mr, mc]) => {
        const neighbors = [[mr - 1, mc], [mr + 1, mc], [mr, mc - 1], [mr, mc + 1]];
        neighbors.forEach(([nr, nc]) => {
          if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
            const cell = board[nr][nc];
            if (cell && cell.isBlocker && !cell.matched) blockersToDamage.add(`${nr},${nc}`);
          }
        });
      });

      let totalGained = 0;
      blockersToDamage.forEach(coord => {
        const [br, bc] = coord.split(',').map(Number);
        const blocker = board[br][bc];
        if (blocker) {
          blocker.strength = (blocker.strength || 1) - 1;
          if (blocker.strength <= 0) {
            blocker.matched = true;
            matches.push([br, bc]);
            totalGained += 20; 
          }
        }
      });

      if (matches.length === 0) {
        score += totalGained;
        isCascading = false;
        break;
      }

      const gained = matches.filter(([r, c]) => board[r][c] && !board[r][c].isBlocker).length * 10;
      totalGained += gained;
      score += totalGained;

      matches.forEach(([r, c]) => {
        if (board[r][c]) board[r][c].matched = true;
      });

      board = applyGravity(board);
    }
  }
  return score >= levelConfig.target;
}

const numGames = 1000;
console.log('Simulating 1000 games per level (random moves)...');
for (const level of LEVELS) {
  let wins = 0;
  for (let i = 0; i < numGames; i++) {
    if (playRandomGame(level)) wins++;
  }
  console.log(`Level ${level.level}: ${wins}/${numGames} wins (${(wins/numGames*100).toFixed(2)}%)`);
}
