import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, Player, GameMode, CellState, ShipType, Ship } from './types';
import Lobby from './components/Lobby';
import SetupPhase from './components/SetupPhase';
import GamePhaseComponent from './components/GamePhase';
import GameOver from './components/GameOver';
import { createInitialPlayer, placeShipsForAI, processShot, createEmptyGrid, placeShipsOnBattlefield, BATTLEFIELD_KEY, canPlaceShip, placeShip, advanceTurn, findRandomValidPlacement } from './services/gameLogic';
import { getAIMove, getAITacticalMove } from './services/geminiService';
import Spinner from './components/Spinner';
import { getGameConfig } from './constants';
import Toast from './components/Toast';

const App: React.FC = () => {
  const [game, setGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const gameRef = useRef<GameState | null>(null);
  
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const showToast = useCallback((message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ message, type });
  }, []);

  const updateGameState = useCallback(async (newState: GameState) => {
    setGame(newState);
  }, []);

  const handleSetActiveAction = async(action: any) => {
    if (!game) return;
    await updateGameState({ ...game, activeAction: action });
  };
  
  const handleUseSkill = useCallback(async(skillType: ShipType, options: any, isAI: boolean = false) => {
    if (!game) return;
    const currentGameState = isAI ? game : JSON.parse(JSON.stringify(game));
    const attacker = currentGameState.players.find((p: Player) => p.id === currentGameState.currentPlayerId)!;

    const logEntry = { turn: currentGameState.turn, playerId: attacker.id, playerName: attacker.name, result: 'SKILL_USED' as const, message: `${skillType} used`};

    let postSkillAction = async (finalGameState: GameState) => {
        await updateGameState(finalGameState);
    };

    let actionTaken = true;

    switch(skillType) {
        case 'Radarship': {
            const opponent = currentGameState.players.find((p: Player) => p.id !== attacker.id)!;
            const allScannedCells = [];
            // The clicked coordinate is the top-left of the 2x2 scan
            for (let i = 0; i <= 1; i++) {
                for (let j = 0; j <= 1; j++) {
                    const checkX = options.x + j;
                    const checkY = options.y + i;
                    if (checkX >= 0 && checkX < game.gridDimensions.cols && checkY >= 0 && checkY < game.gridDimensions.rows) {
                        allScannedCells.push({ x: checkX, y: checkY });
                    }
                }
            }
    
            if (!attacker.shots[opponent.id]) {
                attacker.shots[opponent.id] = createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols);
            }
    
            allScannedCells.forEach(({x, y}) => {
                const opponentCell = opponent.grid[y][x];
                // Only update if it's unknown. Don't overwrite existing hits/misses from normal shots.
                if (attacker.shots[opponent.id][y][x] === CellState.EMPTY) {
                    if (opponentCell === CellState.SHIP || opponentCell === CellState.DECOY) {
                        attacker.shots[opponent.id][y][x] = CellState.RADAR_CONTACT;
                    } else {
                        attacker.shots[opponent.id][y][x] = CellState.MISS;
                    }
                }
            });
            
            const cooldown = 3;
            attacker.skillCooldowns.Radarship = cooldown;
            logEntry.message = `Radar Scan used. Cooldown set to 3 turns.`;

            currentGameState.radarScanResult = { playerId: attacker.id, cells: allScannedCells };
            
            postSkillAction = async (finalGameState: GameState) => {
                await updateGameState(finalGameState);
                setTimeout(async () => {
                    // Ref is needed for local mode to get the latest state post-update
                    const latestGame = gameRef.current;
                    
                    if (latestGame && latestGame.radarScanResult) {
                        const gameWithoutHint = { ...latestGame, radarScanResult: null };
                        await updateGameState(gameWithoutHint);
                    }
                }, 3000);
            };
            break;
        }
        case 'Repairship': {
            const cellToRepair = attacker.grid[options.y][options.x];
            const repairedShip = attacker.ships.find((s: Ship) => s.positions.some(p => p.x === options.x && p.y === options.y));

            if (repairedShip?.isSunk) {
                if (!isAI) showToast("Cannot repair a ship that is already sunk.", "error");
                actionTaken = false;
                break;
            }
            
            if (cellToRepair === CellState.PERMANENT_DAMAGE) {
                if (!isAI) showToast("This part has permanent damage and cannot be repaired.", "error");
                actionTaken = false;
                break;
            }
            
            if (cellToRepair !== CellState.HIT) {
                // Not a valid target, but don't show an error for a simple mis-click on water/own ship.
                actionTaken = false;
                break; 
            }

            const hitTurn = currentGameState.hitLog?.[attacker.id]?.[`${options.x},${options.y}`];
            if (!hitTurn || hitTurn >= currentGameState.turn) {
                if (!isAI) showToast("Cannot repair damage sustained on the current turn.", "error");
                actionTaken = false;
                break;
            }

            // All conditions met, proceed with repair.
            attacker.grid[options.y][options.x] = CellState.SHIP;
            attacker.skillUses.Repairship!--;
            logEntry.message = `${attacker.name} repaired their ${repairedShip?.name || 'ship'}.`;

            if (repairedShip) {
                const isStillDamaged = repairedShip.positions.some(p => 
                    attacker.grid[p.y][p.x] === CellState.HIT || attacker.grid[p.y][p.x] === CellState.PERMANENT_DAMAGE
                );
                if (!isStillDamaged) {
                    repairedShip.isDamaged = false;
                }
            }
            break;
        }
        case 'Decoyship': {
            const { x, y, isHorizontal } = options;
            const decoyShipConfig = { name: 'Decoy', length: 3 };

            if (canPlaceShip(attacker.grid, decoyShipConfig, x, y, isHorizontal, game.gridDimensions)) {
                const decoyToPlace: Ship = { ...decoyShipConfig, type: 'Decoyship', positions: [], isSunk: false, isDamaged: false };
                // Use a temporary grid to place the decoy, then mark cells as DECOY type
                const { newGrid: gridWithShip, newShip } = placeShip(attacker.grid, decoyToPlace, x, y, isHorizontal);
                
                newShip.positions.forEach(pos => {
                    gridWithShip[pos.y][pos.x] = CellState.DECOY;
                });

                attacker.grid = gridWithShip;
                attacker.decoyShip = newShip;
                attacker.skillUses.Decoyship!--;
            } else {
                if (!isAI) showToast("Cannot place decoy there. The area is blocked or out of bounds.", "error");
                actionTaken = false;
            }
            break;
        }
        case 'Commandship': {
            const { shipToMove, x, y, isHorizontal } = options;
            if (!shipToMove) {
                if(!isAI) showToast("No ship selected to move.", "error");
                actionTaken = false;
            } else {
                const oldPositions = [...shipToMove.positions];
                
                const gridWithoutShip = attacker.grid.map((row: CellState[]) => [...row]);
                oldPositions.forEach(pos => {
                    if (gridWithoutShip[pos.y]?.[pos.x]) {
                        gridWithoutShip[pos.y][pos.x] = CellState.EMPTY;
                    }
                });
                
                if (canPlaceShip(gridWithoutShip, shipToMove, x, y, isHorizontal, game.gridDimensions)) {
                    // Now, apply the changes to the attacker's state
                    const { newGrid, newShip } = placeShip(gridWithoutShip, shipToMove, x, y, isHorizontal);
                    attacker.ships = attacker.ships.map((s: Ship) => s.name === newShip.name ? newShip : s);
                    attacker.grid = newGrid;
                    attacker.skillCooldowns.Commandship = 5;
                    logEntry.message = `${attacker.name} has relocated a ship!`;
                } else {
                    if(!isAI) showToast("Invalid placement for relocated ship.", "error");
                    actionTaken = false;
                }
            }
            break;
        }
    }

    if (!actionTaken) return; // If skill use failed, abort the turn action.

    currentGameState.log.unshift(logEntry);
    currentGameState.hasActedThisTurn = true;
    currentGameState.activeAction = null;
    await postSkillAction(currentGameState);
  }, [game, showToast, updateGameState]);
  
  // AI Turn Logic
   useEffect(() => {
    if (game?.phase === GamePhase.PLAYING && game.currentPlayerId) {
        const currentPlayer = game.players.find(p => p.id === game.currentPlayerId);
        if (currentPlayer?.isAI && !currentPlayer.isEliminated && !game.hasActedThisTurn) {
            const handleAITurn = async () => {
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const latestGameState = game;
                if (!latestGameState || latestGameState.phase !== GamePhase.PLAYING || latestGameState.currentPlayerId !== currentPlayer.id) return;
                
                if (latestGameState.gameMode === 'TACTICAL') {
                    const opponent = latestGameState.players.find(p => p.id !== currentPlayer.id)!;
                    const move = await getAITacticalMove(currentPlayer, opponent, latestGameState);
                    
                    const fallbackToAttack = async () => {
                        console.error("AI returned invalid move or context changed, falling back to attack:", move);
                        const fallbackMove = await getAIMove(currentPlayer.shots[opponent.id] || createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols), opponent.ships, game.gridDimensions);
                        const updatedGame = processShot(latestGameState, opponent.id, fallbackMove.x, fallbackMove.y);
                        await updateGameState(updatedGame);
                    };

                    if (move.action === 'ATTACK') {
                         if (move.coords && typeof move.coords.x === 'number' && typeof move.coords.y === 'number') {
                            const updatedGame = processShot(latestGameState, opponent.id, move.coords.x, move.coords.y);
                            await updateGameState(updatedGame);
                        } else {
                            await fallbackToAttack();
                        }
                    } else if (move.action === 'SKILL') {
                        let skillOptions: any = {};
                        let isValidMove = true;
                        
                        switch (move.shipType) {
                            case 'Decoyship':
                                if(move.coords) {
                                    skillOptions = { x: move.coords.x, y: move.coords.y, isHorizontal: !!move.isHorizontal };
                                } else {
                                    isValidMove = false;
                                }
                                break;
                            case 'Commandship': {
                                const shipToMove = currentPlayer.ships.find(s => s.name === move.shipToMove);
                                if (shipToMove && !shipToMove.isDamaged && shipToMove.type !== 'Commandship') {
                                    const placement = findRandomValidPlacement(currentPlayer, shipToMove, latestGameState.gridDimensions);
                                    if (placement) {
                                        skillOptions = {
                                            shipToMove: shipToMove,
                                            x: placement.x,
                                            y: placement.y,
                                            isHorizontal: placement.isHorizontal,
                                        };
                                    } else {
                                        isValidMove = false; // Couldn't find a spot
                                    }
                                } else {
                                    isValidMove = false; // AI chose invalid ship
                                }
                                break;
                            }
                            default: // For Radarship and Repairship
                                if(move.coords) {
                                    skillOptions = move.coords;
                                } else {
                                    isValidMove = false;
                                }
                                break;
                        }

                        if (isValidMove) {
                            await handleUseSkill(move.shipType, skillOptions, true);
                        } else {
                            await fallbackToAttack();
                        }
                    } else {
                        await fallbackToAttack();
                    }
                } else { // Classic and Score Attack AI
                    const { gridDimensions } = game;
                    let targetPlayerId: string | null = null;
                    let shotsGrid: any;
                    let targetShips: any;

                    if (latestGameState.gameMode === 'SCORE_ATTACK') {
                        shotsGrid = currentPlayer.shots[BATTLEFIELD_KEY] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
                        targetShips = latestGameState.battlefieldShips;
                    } else {
                        const opponents = latestGameState.players.filter(p => p.id !== currentPlayer.id && !p.isEliminated);
                        if (opponents.length === 0) return; 
                        const targetPlayer = opponents[Math.floor(Math.random() * opponents.length)];
                        targetPlayerId = targetPlayer.id;
                        shotsGrid = currentPlayer.shots[targetPlayer.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
                        targetShips = targetPlayer.ships;
                    }

                    const { x, y } = await getAIMove(shotsGrid, targetShips, gridDimensions);

                    const latestGameStateAfterMove = game;
                    if (!latestGameStateAfterMove || latestGameStateAfterMove.phase !== GamePhase.PLAYING || latestGameStateAfterMove.currentPlayerId !== currentPlayer.id) return;
                    
                    const updatedGameState = processShot(latestGameStateAfterMove, targetPlayerId, x, y);
                    await updateGameState(updatedGameState);
                }
            };
            handleAITurn();
        } else if (currentPlayer?.isAI && game.hasActedThisTurn) {
            // AI has acted, now automatically end its turn after a short delay
            const endAITurn = async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const latestGameState = game;
                if (latestGameState && latestGameState.phase === GamePhase.PLAYING && latestGameState.currentPlayerId === currentPlayer.id && latestGameState.hasActedThisTurn) {
                    const updatedGameState = advanceTurn(latestGameState);
                    await updateGameState(updatedGameState);
                }
            };
            endAITurn();
        }
    }
   }, [game, updateGameState, handleUseSkill]);

  const handleStartGame = async (playerConfigs: { name: string; isAI: boolean }[], maxPlayers: number, gameMode: GameMode) => {
    setIsLoading(true);
    const gameId = `local_${Date.now()}`;
    const { gridDimensions, shipsConfig } = getGameConfig(maxPlayers, gameMode);

    let players = playerConfigs.map(config => 
        createInitialPlayer(crypto.randomUUID(), config.name, config.isAI, shipsConfig, gridDimensions, gameMode)
    );
    
    const newGameBase = {
        gameId,
        winner: null,
        maxPlayers,
        turn: 1,
        gridDimensions,
        shipsConfig,
        gameMode,
        log: [],
        hitLog: {},
        hasActedThisTurn: false,
    };

    if (gameMode === 'SCORE_ATTACK') {
        const { battlefieldGrid, battlefieldShips } = placeShipsOnBattlefield(shipsConfig as any, gridDimensions);
        
        players = players.map(p => ({
            ...p,
            isReady: true,
            ships: [], 
            grid: createEmptyGrid(gridDimensions.rows, gridDimensions.cols),
            shots: { [BATTLEFIELD_KEY]: createEmptyGrid(gridDimensions.rows, gridDimensions.cols) }
        }));

        const newGame: GameState = {
            ...newGameBase,
            phase: GamePhase.PLAYING,
            players,
            currentPlayerId: players[0].id,
            battlefieldGrid,
            battlefieldShips,
            isFinalRound: false,
        };
        setGame(newGame);

    } else { // CLASSIC or TACTICAL MODE
        players = players.map(p => {
          if (p.isAI) {
            return placeShipsForAI(p, shipsConfig as any, gridDimensions);
          }
          return p;
        });

        const firstHumanIndex = players.findIndex(p => !p.isAI);

        const newGame: GameState = {
            ...newGameBase,
            phase: firstHumanIndex !== -1 ? GamePhase.SETUP : GamePhase.PLAYING, // Skip setup if all AI
            players,
            currentPlayerId: firstHumanIndex === -1 ? players[0].id : null,
            setupPlayerIndex: firstHumanIndex !== -1 ? firstHumanIndex : undefined,
        };
        setGame(newGame);
    }
    
    setIsLoading(false);
  };
  
  const handleReady = useCallback(async (playerWithShips: Player) => {
    if (!game || game.phase !== GamePhase.SETUP) return;
    
    const newPlayers = game.players.map(p => p.id === playerWithShips.id ? { ...playerWithShips, isReady: true } : p);

    const nextHumanPlayerIndex = newPlayers.findIndex((p, index) => index > game.setupPlayerIndex! && !p.isAI);

    if (nextHumanPlayerIndex !== -1) {
        // There's another human player to set up
        const updatedGame = { ...game, players: newPlayers, setupPlayerIndex: nextHumanPlayerIndex, phase: GamePhase.TURN_TRANSITION };
        await updateGameState(updatedGame);
    } else {
        // All human players are ready, start the game
        let newCurrentPlayerId = game.players[0].id;
        const firstPlayer = game.players[0];
        let newPhase = GamePhase.PLAYING;
        
        const { rows, cols } = game.gridDimensions;
        const finalPlayers = newPlayers.map(player => {
            const opponents = newPlayers.filter(p => p.id !== player.id);
            const newShots = { ...player.shots };
            opponents.forEach(opponent => {
                if (!newShots[opponent.id]) {
                    newShots[opponent.id] = createEmptyGrid(rows, cols);
                }
            });
            return { ...player, shots: newShots };
        });
        
        const hasMultipleHumans = game.players.filter(p => !p.isAI).length > 1;
        if (!firstPlayer.isAI && hasMultipleHumans) {
            newPhase = GamePhase.TURN_TRANSITION;
        }

        const updatedGame = { ...game, players: finalPlayers, phase: newPhase, currentPlayerId: newCurrentPlayerId, setupPlayerIndex: undefined };
        await updateGameState(updatedGame);
    }
  }, [game, updateGameState]);

  const handleFireShot = async (targetPlayerId: string | null, x: number, y: number) => {
      if (!game || game.hasActedThisTurn || !game.players.some(p => p.id === game.currentPlayerId && !p.isAI)) return;
      const updatedGameState = processShot(game, targetPlayerId, x, y);
      await updateGameState(updatedGameState);
  }
  
  const handleConfirmTransition = async () => {
    if (!game) return;
    const newPhase = game.phase === GamePhase.TURN_TRANSITION && game.setupPlayerIndex !== undefined
        ? GamePhase.SETUP
        : GamePhase.PLAYING;
    await updateGameState({ ...game, phase: newPhase });
  }

  const handleEndTurn = async () => {
    if (!game || !game.hasActedThisTurn || game.phase !== GamePhase.PLAYING) return;
    const updatedGameState = advanceTurn(JSON.parse(JSON.stringify(game)));
    await updateGameState(updatedGameState);
  };

  const handleExitGame = async () => {
    setGame(null);
  };

  const isAITurn = game?.phase === GamePhase.PLAYING && !!game.players.find(p => p.id === game.currentPlayerId)?.isAI;
  
  let pageContent;
  if (isLoading) {
    pageContent = <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900"><Spinner /> <p className="mt-4 text-slate-300">Loading Game...</p></div>;
  } else if (!game) {
    pageContent = <Lobby onStartGame={handleStartGame} />;
  } else if (game.phase === GamePhase.SETUP || (game.phase === GamePhase.TURN_TRANSITION && game.setupPlayerIndex !== undefined)) {
    const playerToSetup = game.players[game.setupPlayerIndex!];
    pageContent = <SetupPhase game={game} playerToSetup={playerToSetup} onReady={handleReady} onExitGame={handleExitGame} showToast={showToast} onConfirmTransition={handleConfirmTransition} />;
  } else if (game.phase === GamePhase.PLAYING || game.phase === GamePhase.TURN_TRANSITION) {
    pageContent = <GamePhaseComponent game={game} onFireShot={handleFireShot} isAITurn={isAITurn} onExitGame={handleExitGame} onSetActiveAction={handleSetActiveAction} onUseSkill={handleUseSkill} onConfirmTransition={handleConfirmTransition} onEndTurn={handleEndTurn} />;
  } else if (game.phase === GamePhase.GAME_OVER) {
    pageContent = <GameOver game={game} onExitGame={handleExitGame}/>;
  } else {
    pageContent = <div className="min-h-screen flex items-center justify-center bg-slate-900">Something went wrong.</div>;
  }
  
  return (
    <>
      {pageContent}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;