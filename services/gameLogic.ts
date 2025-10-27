
import { CellState, Grid, Player, Ship, GameState, GameLogEntry, ShipType, GamePhase } from '../types';

export const HIT_SCORE = 1;
export const BATTLEFIELD_KEY = 'BATTLEFIELD';

const getColumnLetter = (col: number) => String.fromCharCode(65 + col);

export const createEmptyGrid = (rows: number, cols: number): Grid => {
  return Array(rows).fill(null).map(() => Array(cols).fill(CellState.EMPTY));
};

export const createInitialPlayer = (id: string, name: string, isAI: boolean, shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired'>[], gridDimensions: { rows: number; cols: number }, gameMode: 'TACTICAL' | 'CLASSIC' | 'SCORE_ATTACK'): Player => {
  const initialShips = shipsConfig.map(shipConfig => ({
    ...shipConfig,
    positions: [],
    isSunk: false,
    isDamaged: false,
    hasBeenRepaired: false,
  }));

  const player: Player = {
    id,
    name: isAI ? `${name} (AI)` : name,
    isAI,
    grid: createEmptyGrid(gridDimensions.rows, gridDimensions.cols),
    ships: initialShips,
    shots: {},
    isReady: false,
    isEliminated: false,
    score: 0,
    skillCooldowns: {},
    skillUses: {},
    decoyPositions: [],
    jammedPositions: [],
    jamTurnsRemaining: 0,
    escapeSkillUnlocked: false,
  };

  if (gameMode === 'TACTICAL') {
      player.skillCooldowns = { 'Radarship': 0, 'Commandship': 0, 'Repairship': 0, 'Jamship': 0 };
      player.skillUses = { 'Decoyship': 2, 'Mothership': 1 };
  }

  return player;
};

export const canPlaceShip = (grid: Grid, ship: { length: number }, x: number, y: number, isHorizontal: boolean, gridDimensions: { rows: number, cols: number }): boolean => {
  const shipPositions = [];
  for (let i = 0; i < ship.length; i++) {
    const currentX = x + (isHorizontal ? i : 0);
    const currentY = y + (isHorizontal ? 0 : i);
    shipPositions.push({ x: currentX, y: currentY });
  }

  // Check if all ship positions are within bounds and on empty cells (no overlapping).
  for (const pos of shipPositions) {
    if (pos.x < 0 || pos.x >= gridDimensions.cols || pos.y < 0 || pos.y >= gridDimensions.rows || grid[pos.y][pos.x] !== CellState.EMPTY) {
      return false;
    }
  }

  return true;
};


export const placeShip = (grid: Grid, ship: Ship, x: number, y: number, isHorizontal: boolean): { newGrid: Grid; newShip: Ship } => {
  const newGrid = grid.map(row => [...row]);
  const newPositions = [];
  for (let i = 0; i < ship.length; i++) {
    const currentX = x + (isHorizontal ? i : 0);
    const currentY = y + (isHorizontal ? 0 : i);
    newGrid[currentY][currentX] = CellState.SHIP;
    newPositions.push({ x: currentX, y: currentY });
  }
  return { newGrid, newShip: { ...ship, positions: newPositions } };
};

const placeAllShipsRandomly = (shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired'>[], gridDimensions: { rows: number, cols: number }): { grid: Grid, ships: Ship[] } => {
    let newGrid = createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
    const newShips: Ship[] = [];

    for (const shipConfig of shipsConfig) {
        let placed = false;
        let attempts = 0;
        while (!placed) {
            attempts++;
            if (attempts > 500) { 
                console.error(`Failed to place ship: ${shipConfig.name}. Resetting.`);
                return placeAllShipsRandomly(shipsConfig, gridDimensions); 
            }

            const isHorizontal = Math.random() < 0.5;
            const x = Math.floor(Math.random() * gridDimensions.cols);
            const y = Math.floor(Math.random() * gridDimensions.rows);

            if (canPlaceShip(newGrid, shipConfig, x, y, isHorizontal, gridDimensions)) {
                const shipToPlace: Ship = { ...shipConfig, positions: [], isSunk: false, isDamaged: false, hasBeenRepaired: false };
                const result = placeShip(newGrid, shipToPlace, x, y, isHorizontal);
                newGrid = result.newGrid;
                newShips.push(result.newShip);
                placed = true;
            }
        }
    }
    const shipOrder = shipsConfig.map(s => s.name);
    newShips.sort((a, b) => shipOrder.indexOf(a.name) - shipOrder.indexOf(b.name));
    return { grid: newGrid, ships: newShips };
};

export const placeShipsForAI = (player: Player, shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired'>[], gridDimensions: { rows: number, cols: number }): Player => {
    const { grid, ships } = placeAllShipsRandomly(shipsConfig, gridDimensions);
    return { ...player, grid, ships, isReady: true };
};

export const placeShipsOnBattlefield = (shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired'>[], gridDimensions: { rows: number, cols: number }): { battlefieldGrid: Grid, battlefieldShips: Ship[] } => {
    const { grid, ships } = placeAllShipsRandomly(shipsConfig, gridDimensions);
    return { battlefieldGrid: grid, battlefieldShips: ships };
}

export const findRandomValidPlacement = (player: Player, ship: Ship, gridDimensions: { rows: number, cols: number }): { x: number, y: number, isHorizontal: boolean } | null => {
    const gridWithoutShip = player.grid.map(row => [...row]);
    ship.positions.forEach(pos => {
        gridWithoutShip[pos.y][pos.x] = CellState.EMPTY;
    });

    let attempts = 0;
    while (attempts < 100) {
        const isHorizontal = Math.random() < 0.5;
        const x = Math.floor(Math.random() * gridDimensions.cols);
        const y = Math.floor(Math.random() * gridDimensions.rows);

        if (canPlaceShip(gridWithoutShip, ship, x, y, isHorizontal, gridDimensions)) {
            return { x, y, isHorizontal };
        }
        attempts++;
    }
    return null; // Failed to find a placement
};

export const advanceTurn = (gameState: GameState): GameState => {
    const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    
    if (currentTurnPlayer) {
        // Cooldown reduction at the start of the next player's turn
        if (gameState.gameMode === 'TACTICAL') {
            for (const shipType in currentTurnPlayer.skillCooldowns) {
                if (currentTurnPlayer.skillCooldowns[shipType as ShipType]! > 0) {
                    currentTurnPlayer.skillCooldowns[shipType as ShipType]!--;
                }
            }
        }

        // Decrement jam duration for the player who just finished their turn
        if (currentTurnPlayer.jamTurnsRemaining && currentTurnPlayer.jamTurnsRemaining > 0) {
            currentTurnPlayer.jamTurnsRemaining--;
            if (currentTurnPlayer.jamTurnsRemaining === 0) {
                currentTurnPlayer.jammedPositions = [];
                // Also clear the visual overlay if it belongs to this player
                if (gameState.jammedArea?.playerId === currentTurnPlayer.id) {
                    gameState.jammedArea = null;
                }
            }
        }
    }

    let currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayerId);
    let nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    // Check for Score Attack game end condition
    if (gameState.gameMode === 'SCORE_ATTACK' && gameState.isFinalRound && nextPlayerIndex === 0) {
        gameState.phase = GamePhase.GAME_OVER;
        const winner = gameState.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
        gameState.winner = winner.id;
        return gameState;
    }

    // Skip eliminated players
    while(gameState.players[nextPlayerIndex].isEliminated) {
        nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
        // This prevents an infinite loop if all other players are eliminated.
        if (nextPlayerIndex === currentPlayerIndex) break;
    }
    
    gameState.turn++;
    gameState.hasActedThisTurn = false;
    gameState.currentPlayerId = gameState.players[nextPlayerIndex].id;
    gameState.activeAction = null;
    gameState.radarScanResult = null;
    
    const nextPlayer = gameState.players[nextPlayerIndex];
    const hasMultipleHumans = gameState.players.filter(p => !p.isAI).length > 1;

    // If the next player is human and there's more than one human, transition
    if (!nextPlayer.isAI && hasMultipleHumans) {
        gameState.phase = GamePhase.TURN_TRANSITION;
    }

    return gameState;
};

export const processShot = (gameState: GameState, targetPlayerId: string | null, x: number, y: number): GameState => {
  const newGameState = JSON.parse(JSON.stringify(gameState));
  const attacker = newGameState.players.find(p => p.id === newGameState.currentPlayerId)!;
  let actionTaken = false;
  
  const baseLogEntry = {
    turn: newGameState.turn,
    playerId: attacker.id,
    playerName: attacker.name,
    coords: { x, y },
  };

  // --- TACTICAL MODE LOGIC ---
  if (newGameState.gameMode === 'TACTICAL') {
      const target = newGameState.players.find(p => p.id === targetPlayerId)!;
      
      if (!attacker.shots[targetPlayerId]) {
          attacker.shots[targetPlayerId] = createEmptyGrid(newGameState.gridDimensions.rows, newGameState.gridDimensions.cols);
      }

      const currentShotCellState = attacker.shots[targetPlayerId][y][x];
      if (currentShotCellState !== CellState.EMPTY && currentShotCellState !== CellState.RADAR_CONTACT) {
        return gameState; // Already shot here (and it was a confirmed hit/miss/sunk)
      }

      const decoyIndex = target.decoyPositions?.findIndex(p => p.x === x && p.y === y);

      if (decoyIndex > -1) {
          // It's a decoy hit! Deceive the attacker.
          attacker.shots[targetPlayerId][y][x] = CellState.HIT; // Report a HIT to the attacker

          // Remove the decoy from the target's state
          target.decoyPositions.splice(decoyIndex, 1);
          if (target.grid[y][x] === CellState.DECOY) {
              target.grid[y][x] = CellState.EMPTY;
          }

          // Log a generic HIT to maintain deception
          newGameState.log.unshift({
              ...baseLogEntry,
              result: 'HIT',
              hitShipName: 'unidentified contact',
              targetId: target.id,
              targetName: target.name,
          });
          newGameState.hasActedThisTurn = false; // Player gets another action, just like a regular hit.
      } else {
          const targetCell = target.grid[y][x];
          if (targetCell === CellState.SHIP) {
              attacker.shots[targetPlayerId][y][x] = CellState.HIT;
              const hitShip = target.ships.find(ship => ship.positions.some(pos => pos.x === x && pos.y === y))!;
              
              target.grid[y][x] = CellState.HIT;
              hitShip.isDamaged = true;
              if (!newGameState.hitLog) newGameState.hitLog = {};
              if (!newGameState.hitLog[target.id]) newGameState.hitLog[target.id] = {};
              newGameState.hitLog[target.id][`${x},${y}`] = newGameState.turn;

              // HIT & GO AGAIN RULE: End turn only if Mothership is hit.
              if (hitShip.type === 'Mothership') {
                  newGameState.hasActedThisTurn = true;
                  // Unlock escape skill on first damage
                  if (!target.escapeSkillUnlocked) {
                      target.escapeSkillUnlocked = true;
                  }
              } else {
                  newGameState.hasActedThisTurn = false; // Player gets another action.
              }

              const isSunk = hitShip.positions.every(pos => {
                const cellState = newGameState.players.find(p=>p.id === target.id)!.grid[pos.y][pos.x];
                return cellState === CellState.HIT;
              });

              if (isSunk) {
                  hitShip.isSunk = true;
                  hitShip.positions.forEach(pos => {
                      target.grid[pos.y][pos.x] = CellState.SUNK;
                      attacker.shots[targetPlayerId][pos.y][pos.x] = CellState.SUNK;
                  });
                   newGameState.log.unshift({
                      ...baseLogEntry,
                      result: 'SUNK_SHIP',
                      sunkShipName: hitShip.name,
                      targetId: target.id,
                      targetName: target.name,
                  });
                  if (hitShip.type === 'Mothership') {
                      target.isEliminated = true;
                      newGameState.phase = 'GAME_OVER';
                      newGameState.winner = attacker.id;
                  }
              } else {
                  newGameState.log.unshift({
                      ...baseLogEntry,
                      result: 'HIT',
                      hitShipName: hitShip.name,
                      targetId: target.id,
                      targetName: target.name,
                  });
              }
          } else { // MISS
              attacker.shots[targetPlayerId][y][x] = CellState.MISS;
              if (target.grid[y][x] !== CellState.DECOY) { // Don't overwrite decoy on target grid
                target.grid[y][x] = CellState.MISS;
              }
              newGameState.log.unshift({
                  ...baseLogEntry,
                  result: 'MISS',
                  targetId: target.id,
                  targetName: target.name,
              });
              newGameState.hasActedThisTurn = true; // Turn ends on miss
          }
      }
      return newGameState; // Return here to isolate tactical logic
  }
  
  // --- SCORE ATTACK MODE LOGIC ---
  else if (newGameState.gameMode === 'SCORE_ATTACK') {
    const logEntry: GameLogEntry = {
        ...baseLogEntry,
        targetName: "Battlefield",
        result: 'MISS',
    };

    if (!attacker.shots[BATTLEFIELD_KEY]) {
        attacker.shots[BATTLEFIELD_KEY] = createEmptyGrid(newGameState.gridDimensions.rows, newGameState.gridDimensions.cols);
    }
    if (attacker.shots[BATTLEFIELD_KEY][y][x] !== CellState.EMPTY) {
        return gameState; // Already shot here
    }

    actionTaken = true;
    const targetCell = newGameState.battlefieldGrid[y][x];
    if (targetCell === CellState.SHIP) {
        newGameState.players.forEach(p => {
            if (p.shots[BATTLEFIELD_KEY]) {
                p.shots[BATTLEFIELD_KEY][y][x] = CellState.HIT;
            }
        });
        newGameState.battlefieldGrid[y][x] = CellState.HIT;
        attacker.score += HIT_SCORE;
        logEntry.result = 'HIT';

        const hitShip = newGameState.battlefieldShips.find(ship => ship.positions.some(pos => pos.x === x && pos.y === y));
        if (hitShip) {
            logEntry.hitShipName = hitShip.name;
            const isSunk = hitShip.positions.every(pos => newGameState.battlefieldGrid[pos.y][pos.x] === CellState.HIT);
            if (isSunk) {
                hitShip.isSunk = true;
                logEntry.result = 'SUNK_SHIP';
                logEntry.sunkShipName = hitShip.name;
                
                hitShip.positions.forEach(pos => {
                    newGameState.battlefieldGrid[pos.y][pos.x] = CellState.SUNK;
                    newGameState.players.forEach(p => {
                        if (p.shots[BATTLEFIELD_KEY]) {
                            p.shots[BATTLEFIELD_KEY][pos.y][pos.x] = CellState.SUNK;
                        }
                    });
                });
            }
        }
    } else {
        newGameState.players.forEach(p => {
            if (p.shots[BATTLEFIELD_KEY]) {
                p.shots[BATTLEFIELD_KEY][y][x] = CellState.MISS;
            }
        });
    }
    
    // Round-based Ending: Check if all ships are sunk to start the final round.
    const allShipsSunk = newGameState.battlefieldShips.every(s => s.isSunk);
    if (allShipsSunk && !newGameState.isFinalRound) {
        newGameState.isFinalRound = true;
        // The game will now end via advanceTurn logic, ensuring a full round is played.
    }
    newGameState.log.unshift(logEntry);
  
  // --- CLASSIC MODE LOGIC ---
  } else {
    const target = newGameState.players.find(p => p.id === targetPlayerId)!;
    const logEntry: GameLogEntry = {
        ...baseLogEntry,
        targetId: targetPlayerId,
        targetName: target.name,
        result: 'MISS',
    };
    const { rows, cols } = gameState.gridDimensions;

    if (!attacker.shots[targetPlayerId]) {
        attacker.shots[targetPlayerId] = createEmptyGrid(rows, cols);
    }
    if (attacker.shots[targetPlayerId][y][x] !== CellState.EMPTY) {
        return gameState; // Already shot here
    }

    actionTaken = true;
    const targetCell = target.grid[y][x];

    if (targetCell === CellState.SHIP || targetCell === CellState.HIT || targetCell === CellState.SUNK) {
      attacker.shots[targetPlayerId][y][x] = CellState.HIT;
      target.grid[y][x] = CellState.HIT;
      logEntry.result = 'HIT';

      const hitShip = target.ships.find(ship => ship.positions.some(pos => pos.x === x && pos.y === y));
      if (hitShip) {
        logEntry.hitShipName = hitShip.name;
        const isSunk = hitShip.positions.every(pos => target.grid[pos.y][pos.x] === CellState.HIT);
        if (isSunk) {
          hitShip.isSunk = true;
          logEntry.result = 'SUNK_SHIP';
          logEntry.sunkShipName = hitShip.name;
          hitShip.positions.forEach(pos => {
            target.grid[pos.y][pos.x] = CellState.SUNK;
            attacker.shots[targetPlayerId][pos.y][pos.x] = CellState.SUNK;
          });
        }
      }
    } else {
      attacker.shots[targetPlayerId][y][x] = CellState.MISS;
      target.grid[y][x] = CellState.MISS;
    }
    
    if (target.ships.every(ship => ship.isSunk)) {
      target.isEliminated = true;
    }
    
    const activePlayers = newGameState.players.filter(p => !p.isEliminated);
    if (activePlayers.length <= 1) {
      newGameState.phase = 'GAME_OVER';
      newGameState.winner = activePlayers.length === 1 ? activePlayers[0].id : null;
      actionTaken = false;
    }
    newGameState.log.unshift(logEntry);
  }
  
  if (actionTaken) {
    newGameState.hasActedThisTurn = true;
  }

  return newGameState;
};