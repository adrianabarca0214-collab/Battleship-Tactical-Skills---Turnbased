
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, Player, GameLogEntry, Ship, ShipType, CellState, GamePhase as GamePhaseEnum } from '../types';
import Grid from './Grid';
import Spinner from './Spinner';
import ShipStatus from './ShipStatus';
import ExitIcon from './icons/ExitIcon';
import Scoreboard from './Scoreboard';
import { BATTLEFIELD_KEY, createEmptyGrid, canPlaceShip } from '../services/gameLogic';
import GameLog from './GameLog';
import CancelIcon from './icons/CancelIcon';
import HelpTab from './HelpTab';
import InfoIcon from './icons/InfoIcon';
import ActionHub from './ActionHub';
import FullscreenIcon from './icons/FullscreenIcon';

interface GamePhaseProps {
  game: GameState;
  onFireShot: (targetPlayerId: string | null, x: number, y: number) => void;
  isAITurn: boolean;
  onExitGame: () => void;
  onSetActiveAction: (action: any) => void;
  onUseSkill: (skillType: ShipType, options: any) => void;
  onConfirmTransition: () => void;
  onEndTurn: () => void;
}

const ActionPanel: React.FC<{ activeAction: any, onSetActiveAction: (action: any) => void }> = ({ activeAction, onSetActiveAction }) => {
    let title = '';
    let description = '';

    if (activeAction.type === 'ATTACK') {
        title = 'Attack Mode';
        description = "Select a target coordinate on the opponent's grid to fire.";
    } else { // It's a skill
        switch (activeAction.shipType) {
            case 'Mothership':
                title = 'Escape Maneuver';
                description = `Click a new top-left cell to relocate your repaired Mothership.`;
                break;
            case 'Radarship':
                title = 'Radar Scan';
                description = "Select the TOP-LEFT coordinate for a 2x2 radar scan.";
                break;
            case 'Repairship':
                title = 'Repair Mode';
                description = "Select a damaged part of one of your ships to repair.";
                break;
            case 'Commandship':
                title = 'Relocate Command';
                if (activeAction.stage === 'SELECT_SHIP') {
                    description = "Select one of your undamaged ships to relocate.";
                } else if (activeAction.stage === 'PLACE_SHIP') {
                    description = `Click a new top-left cell to place your ${activeAction.shipToMove?.name}.`;
                }
                break;
            case 'Decoyship':
                title = 'Deploy Decoy';
                description = "Select an empty cell to place a single decoy beacon.";
                break;
            case 'Jamship':
                title = 'Signal Jam';
                description = "Select the CENTER coordinate for a 3x3 jam area.";
                break;
        }
    }

    return (
        <div className="w-full max-w-screen-md mx-auto mb-4 p-4 bg-slate-800 border-2 border-cyan-500 rounded-xl shadow-lg action-panel-throb fade-in-down">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <InfoIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                    <div>
                        <h3 className="text-2xl font-bold text-white">{title}</h3>
                        <p className="text-slate-300">{description}</p>
                    </div>
                </div>
                <button onClick={() => onSetActiveAction(null)} className="flex items-center gap-2 bg-red-600/80 hover:bg-red-500/80 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto justify-center">
                    <CancelIcon className="w-5 h-5" />
                    Cancel Action
                </button>
            </div>
        </div>
    );
};

const TurnTransition: React.FC<{ nextPlayerName: string; onConfirm: () => void }> = ({ nextPlayerName, onConfirm }) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 fade-in">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-200">Next Turn</h2>
            <p className="text-slate-400 mt-2 mb-6">Please pass the device to the next player.</p>
            <button
                onClick={onConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-md transition-transform transform hover:scale-105 text-xl"
            >
                I am {nextPlayerName}, Start My Turn
            </button>
        </div>
    </div>
);

const GamePhase: React.FC<GamePhaseProps> = ({ game, onFireShot, isAITurn, onExitGame, onSetActiveAction, onUseSkill, onConfirmTransition, onEndTurn }) => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) {
      console.warn("Fullscreen API is not supported by this browser.");
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const turnPlayer = game.players.find(p => p.id === game.currentPlayerId);
  if (!turnPlayer) return null; // Should not happen

  const isMyTurn = !turnPlayer.isAI;
  const canTakeAction = isMyTurn && !game.hasActedThisTurn;
  const showEndTurnButton = isMyTurn && game.hasActedThisTurn;

  const turnIndicatorColor = isMyTurn ? 'text-green-400' : 'text-orange-400';
  const [animatedShot, setAnimatedShot] = useState<GameLogEntry | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const activeAction = game.activeAction;
  
  const currentPlayer = turnPlayer;

  useEffect(() => {
    if (game.log.length > 0) {
        const latestLog = game.log[0];
        if (animatedShot?.turn !== latestLog.turn || (animatedShot.coords?.x !== latestLog.coords?.x || animatedShot.coords?.y !== latestLog.coords?.y)) {
            setAnimatedShot(latestLog);
        }
    }
  }, [game.log]);

  let statusMessage = '';
  if (isAITurn) {
      statusMessage = "AI is calculating its next move...";
  } else if (canTakeAction) {
      statusMessage = "It's your turn to act.";
  } else if (showEndTurnButton) {
      statusMessage = "Action complete. Please end your turn.";
  } else {
      statusMessage = `Waiting for ${turnPlayer?.name || 'player'}...`;
  }
  
  const handleExit = () => {
    if (window.confirm("Are you sure you want to exit? This will forfeit the game.")) {
      onExitGame();
    }
  };
  
  const handleShipPartClick = (ship: Ship) => {
    if (!canTakeAction || !activeAction) return;
    
    // Only used for selecting a ship for a skill, like Relocate
    if (activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP') {
        if (ship.isDamaged || ship.type === 'Commandship') { return; } 
        onSetActiveAction({ ...activeAction, stage: 'PLACE_SHIP', shipToMove: ship });
        return;
    }
  };

  const handleActionSelect = (actionType: ShipType | 'ATTACK') => {
     if (!canTakeAction) return;

    if (activeAction && (activeAction.shipType === actionType || (actionType === 'ATTACK' && activeAction.type === 'ATTACK'))) {
        onSetActiveAction(null); // Toggle off
        return;
    }

    if (actionType === 'ATTACK') {
        onSetActiveAction({ playerId: currentPlayer.id, type: 'ATTACK' });
        return;
    }
    
    // It's a skill from here
    const ship = currentPlayer.ships.find(s => s.type === actionType);
    if (!ship || ship.isSunk) return;

    const cooldown = currentPlayer.skillCooldowns[actionType] ?? 0;
    const uses = currentPlayer.skillUses[actionType] ?? 1;
    if (cooldown > 0 || uses <= 0) return;

    // Special check for Mothership Escape skill unlock
    if (actionType === 'Mothership' && !currentPlayer.escapeSkillUnlocked) return;

    const newAction = { playerId: currentPlayer.id, type: 'SKILL' as const, shipType: actionType };
    if (actionType === 'Commandship') {
        onSetActiveAction({ ...newAction, stage: 'SELECT_SHIP' });
    } else if (actionType === 'Decoyship') {
        onSetActiveAction({ ...newAction, stage: 'PLACE_DECOY' });
    } else if (actionType === 'Mothership') {
        const mothership = currentPlayer.ships.find(s => s.type === 'Mothership')!;
        onSetActiveAction({ ...newAction, stage: 'PLACE_SHIP', shipToMove: mothership });
    } else {
        onSetActiveAction(newAction);
    }
  }

  const handleOpponentGridClick = (targetPlayerId: string | null, x: number, y: number) => {
    if (!canTakeAction || !activeAction) return;

    if (activeAction.type === 'ATTACK') {
      onFireShot(targetPlayerId, x, y);
    } else if (activeAction.type === 'SKILL' && activeAction.shipType === 'Radarship') {
      onUseSkill(activeAction.shipType, { x, y });
    } else if (activeAction.type === 'SKILL' && activeAction.shipType === 'Jamship') {
      onUseSkill(activeAction.shipType, { x, y });
    }
  }
  
  const handleOwnGridClick = (x: number, y: number) => {
    if (!canTakeAction || !activeAction) return;

    if (activeAction.type === 'SKILL' && activeAction.shipType === 'Repairship') {
        onUseSkill('Repairship', { x, y });
    } else if (activeAction.type === 'SKILL' && (activeAction.shipType === 'Commandship' || activeAction.shipType === 'Mothership') && activeAction.stage === 'PLACE_SHIP') {
        const shipToMove = activeAction.shipToMove!;
        const isHorizontal = shipToMove.positions.length > 1 ? shipToMove.positions[0].y === shipToMove.positions[1].y : true;
        onUseSkill(activeAction.shipType, { shipToMove, x, y, isHorizontal });
    } else if (activeAction.type === 'SKILL' && activeAction.shipType === 'Decoyship' && activeAction.stage === 'PLACE_DECOY') {
        onUseSkill('Decoyship', { x, y });
    }
  };

  const gridForPlacementCheck = useMemo(() => {
    if (activeAction?.shipToMove) {
        const newGrid = currentPlayer.grid.map(row => [...row]);
        activeAction.shipToMove.positions.forEach(pos => {
            newGrid[pos.y][pos.x] = CellState.EMPTY;
        });
        return newGrid;
    }
    return currentPlayer.grid;
  }, [currentPlayer.grid, activeAction?.shipToMove]);
  
  const hoverPreview = useMemo(() => {
    if (!hoveredCell || !activeAction || !canTakeAction) return null;

    let shipLength: number | undefined;
    let isHorizontal: boolean | undefined = activeAction.isHorizontal;
    
    const isRelocating = activeAction.type === 'SKILL' && (activeAction.shipType === 'Commandship' || activeAction.shipType === 'Mothership') && activeAction.stage === 'PLACE_SHIP';
    const isPlacingDecoy = activeAction.type === 'SKILL' && activeAction.shipType === 'Decoyship' && activeAction.stage === 'PLACE_DECOY';

    if (isRelocating && activeAction.shipToMove) {
        shipLength = activeAction.shipToMove.length;
        isHorizontal = activeAction.shipToMove.positions.length > 1 ? activeAction.shipToMove.positions[0].y === activeAction.shipToMove.positions[1].y : true;
    } else if (isPlacingDecoy) {
        shipLength = 1; // Decoy is 1 square
        isHorizontal = true;
    }

    if (shipLength === undefined || isHorizontal === undefined) return null;
    
    return {
        x: hoveredCell.x,
        y: hoveredCell.y,
        length: shipLength,
        isHorizontal: isHorizontal,
        isValid: canPlaceShip(gridForPlacementCheck, { length: shipLength }, hoveredCell.x, hoveredCell.y, isHorizontal, game.gridDimensions)
    };
  }, [hoveredCell, activeAction, gridForPlacementCheck, game.gridDimensions, canTakeAction]);


  const renderClassicMode = () => {
    const otherPlayers = game.players.filter(p => p.id !== currentPlayer.id);
    const isTwoPlayerGame = game.players.length === 2;

    return (
        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          <div className={`bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg ${isTwoPlayerGame ? 'lg:w-1/2' : 'lg:w-1/3'}`}>
            <Grid 
                grid={currentPlayer.grid} 
                ships={currentPlayer.ships}
                title={`${currentPlayer.name} (Your Fleet)`}
                gridDimensions={game.gridDimensions}
            />
            <ShipStatus ships={currentPlayer.ships} grid={currentPlayer.grid} />
          </div>
          {otherPlayers.length > 0 && (
            <div className={isTwoPlayerGame ? 'lg:w-1/2' : 'lg:w-2/3'}>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-300 mb-4 border-b-2 border-slate-700 pb-2">
                {isTwoPlayerGame ? 'Opponent Fleet' : 'Opponent Fleets'}
              </h2>
              <div className={`grid grid-cols-1 ${!isTwoPlayerGame ? 'xl:grid-cols-2' : ''} gap-4 md:gap-6`}>
                {otherPlayers.map(player => {
                  const isActiveTarget = canTakeAction && !player.isEliminated;
                  return (
                  <div key={player.id} className={`p-2 sm:p-4 rounded-xl shadow-lg transition-all duration-300 ${player.isEliminated ? 'bg-red-900/20 opacity-70' : 'bg-slate-800'} ${isActiveTarget ? 'grid-active-turn' : 'border border-transparent'}`}>
                    <Grid
                      grid={currentPlayer.shots[player.id] || createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols)}
                      onCellClick={(x, y) => onFireShot(player.id, x, y)}
                      isOpponentGrid={true}
                      isPlayerTurn={isActiveTarget}
                      title={`${player.name}${player.isAI ? ' (AI)' : ''} ${player.isEliminated ? '- ELIMINATED' : ''}`}
                      gridDimensions={game.gridDimensions}
                      animatedShot={animatedShot?.targetId === player.id ? animatedShot : null}
                    />
                    <ShipStatus ships={player.ships} isOpponent={true} />
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
    )
  }

  const renderTacticalMode = () => {
    const opponent = game.players.find(p => p.id !== currentPlayer.id)!;
    const playerShipsForGrid = currentPlayer.ships;

    const isOpponentGridDimmed = isMyTurn && activeAction && activeAction.type === 'SKILL' && ['Repairship', 'Decoyship', 'Commandship', 'Mothership'].includes(activeAction.shipType);
    const isOwnGridDimmed = isMyTurn && activeAction && (activeAction.type === 'ATTACK' || (activeAction.type === 'SKILL' && ['Radarship', 'Jamship'].includes(activeAction.shipType)));

    return (
      <>
        <div className="flex flex-col lg:flex-row gap-8 mt-2">
          <div className="bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg lg:w-1/2">
            <Grid 
                grid={currentPlayer.grid} 
                ships={playerShipsForGrid}
                title={`${currentPlayer.name} (Your Fleet)`}
                gridDimensions={game.gridDimensions}
                onShipPartClick={handleShipPartClick}
                activeAction={activeAction}
                isPlayerTurn={canTakeAction}
                onCellClick={handleOwnGridClick}
                hoverPreview={hoverPreview}
                onCellMouseEnter={(x, y) => setHoveredCell({x, y})}
                onCellMouseLeave={() => setHoveredCell(null)}
                isDimmed={isOwnGridDimmed}
            />
            <ShipStatus ships={playerShipsForGrid} player={currentPlayer} grid={currentPlayer.grid} gameMode={game.gameMode} />
          </div>
          <div className={`p-2 sm:p-4 rounded-xl shadow-lg lg:w-1/2 transition-all duration-300 ${opponent.isEliminated ? 'bg-red-900/20 opacity-70' : 'bg-slate-800'} ${canTakeAction && activeAction && !isOwnGridDimmed ? 'grid-active-turn' : 'border border-transparent'}`}>
            <Grid
              grid={currentPlayer.shots[opponent.id] || createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols)}
              onCellClick={(x, y) => handleOpponentGridClick(opponent.id, x, y)}
              isOpponentGrid={true}
              isPlayerTurn={canTakeAction}
              title={`${opponent.name}${opponent.isAI ? ' (AI)' : ''} ${opponent.isEliminated ? '- ELIMINATED' : ''}`}
              gridDimensions={game.gridDimensions}
              animatedShot={animatedShot?.targetId === opponent.id ? animatedShot : null}
              radarOverlay={game.radarScanResult?.playerId === currentPlayer.id ? game.radarScanResult.results : []}
              jammedOverlay={game.jammedArea?.playerId === opponent.id ? game.jammedArea.coords : []}
              activeAction={activeAction}
              isDimmed={isOpponentGridDimmed}
            />
            <ShipStatus ships={opponent.ships} isOpponent={true} gameMode={game.gameMode} player={opponent} />
          </div>
        </div>
      </>
    )
  }

  const renderScoreAttackMode = () => {
    const isActiveTarget = canTakeAction;
    return (
        <div className="flex flex-col items-center gap-8 mt-6">
            <div className={`w-full max-w-4xl bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg transition-all duration-300 ${isActiveTarget ? 'grid-active-turn' : 'border border-transparent'}`}>
                <Grid 
                    grid={currentPlayer.shots[BATTLEFIELD_KEY] || createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols)} 
                    ships={game.battlefieldShips}
                    title="Shared Battlefield"
                    onCellClick={(x, y) => onFireShot(null, x, y)}
                    isOpponentGrid={true}
                    isPlayerTurn={isActiveTarget}
                    gridDimensions={game.gridDimensions}
                    animatedShot={animatedShot?.targetId === null ? animatedShot : null}
                />
            </div>
            <div className="w-full max-w-sm">
                <ShipStatus ships={game.battlefieldShips!} isOpponent={true} gameMode={game.gameMode}/>
            </div>
        </div>
    )
  }
  
  if (game.phase === GamePhaseEnum.TURN_TRANSITION) {
    return <TurnTransition nextPlayerName={turnPlayer.name} onConfirm={onConfirmTransition} />
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white p-2 sm:p-4 md:p-6 fade-in">
      {game.gameMode === 'TACTICAL' && <HelpTab />}
      <div className="max-w-screen-2xl mx-auto">
        <header className="flex flex-col items-center mb-4 p-4 bg-slate-800 rounded-xl shadow-lg border border-slate-700 gap-4">
            <div className="flex flex-col md:flex-row justify-between items-center w-full">
                <div className="flex-1 text-center md:text-left mb-4 md:mb-0">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 tracking-wider">
                        {game.gameMode === 'SCORE_ATTACK' && 'SCORE ATTACK'}
                        {game.gameMode === 'CLASSIC' && 'CLASSIC BATTLE'}
                        {game.gameMode === 'TACTICAL' && 'TACTICAL COMMAND'}
                    </h1>
                    <p className="text-slate-400 mt-1 min-h-[24px]">{statusMessage}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center p-3 rounded-lg bg-slate-900/50 min-w-[200px]">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Turn {game.turn}</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            {isAITurn && !game.hasActedThisTurn && <Spinner />}
                            <h2 className={`text-3xl font-bold truncate ${turnIndicatorColor}`}>
                                {turnPlayer?.name || 'Unknown'}
                            </h2>
                        </div>
                    </div>
                    <GameLog log={game.log} players={game.players} currentUserId={currentPlayer.id} gameMode={game.gameMode} />
                    <button
                        onClick={toggleFullscreen}
                        className="p-3 bg-cyan-800/50 hover:bg-cyan-700/50 rounded-full text-slate-200 transition-colors"
                        aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        <FullscreenIcon className="w-6 h-6" isFullscreen={isFullscreen} />
                    </button>
                    <button 
                        onClick={handleExit} 
                        className="p-3 bg-red-800/50 hover:bg-red-700/50 rounded-full text-slate-200 transition-colors"
                        aria-label="Exit Game"
                    >
                        <ExitIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
            {isMyTurn && !game.hasActedThisTurn && game.gameMode === 'TACTICAL' && (
              <ActionHub 
                player={turnPlayer} 
                activeAction={game.activeAction} 
                onActionSelect={handleActionSelect} 
              />
            )}
        </header>

        {showEndTurnButton && (
            <div className="flex justify-center my-4 fade-in">
                <button 
                    onClick={onEndTurn}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 animate-pulse"
                >
                    End Turn
                </button>
            </div>
        )}
        
        {canTakeAction && activeAction && game.gameMode === 'TACTICAL' && (
            <ActionPanel activeAction={activeAction} onSetActiveAction={onSetActiveAction} />
        )}

        {game.gameMode === 'SCORE_ATTACK' && <Scoreboard players={game.players} />}
        
        <div>
            {game.gameMode === 'CLASSIC' && renderClassicMode()}
            {game.gameMode === 'TACTICAL' && renderTacticalMode()}
            {game.gameMode === 'SCORE_ATTACK' && renderScoreAttackMode()}
        </div>

      </div>
    </div>
  );
};

export default GamePhase;