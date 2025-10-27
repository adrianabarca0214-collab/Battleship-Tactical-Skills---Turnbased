
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Player, CellState, Ship } from '../types';
import { canPlaceShip, placeShip, createEmptyGrid, placeShipsForAI } from '../services/gameLogic';
import Grid from './Grid';
import ExitIcon from './icons/ExitIcon';
import RotateIcon from './icons/RotateIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';

interface SetupPhaseProps {
  game: GameState;
  playerToSetup: Player;
  onReady: (player: Player) => void;
  onExitGame: () => void;
  showToast: (message: string, type: 'error' | 'info' | 'success') => void;
  onConfirmTransition: () => void;
}

const SetupTransition: React.FC<{ nextPlayerName: string; onConfirm: () => void }> = ({ nextPlayerName, onConfirm }) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 fade-in">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-200">Setup Complete!</h2>
            <p className="text-slate-400 mt-2 mb-6">Please pass the device to the next player.</p>
            <button
                onClick={onConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-md transition-transform transform hover:scale-105 text-xl"
            >
                I am {nextPlayerName}, Begin Setup
            </button>
        </div>
    </div>
);

const SetupPhase: React.FC<SetupPhaseProps> = ({ game, playerToSetup, onReady, onExitGame, showToast, onConfirmTransition }) => {
  const [history, setHistory] = useState<Player[]>([playerToSetup]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const localPlayer = history[historyIndex];

  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [draggedShipInfo, setDraggedShipInfo] = useState<{ ship: Ship; partIndex: number; isHorizontal: boolean; } | null>(null);
  const [selectedPlacedShip, setSelectedPlacedShip] = useState<Ship | null>(null);

  useEffect(() => {
    // When the playerToSetup prop changes, reset the component's internal state
    setHistory([playerToSetup]);
    setHistoryIndex(0);
    setSelectedShipIndex(0);
    setIsHorizontal(true);
    setHoveredCell(null);
    setDraggedShipInfo(null);
    setSelectedPlacedShip(null);
  }, [playerToSetup]);

  const { gridDimensions } = game;
  const unplacedShips = localPlayer.ships.filter(s => s.positions.length === 0);
  const selectedShip = unplacedShips[selectedShipIndex];
  
  const recordHistory = useCallback((newPlayerState: Player) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPlayerState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleExit = () => {
    if (window.confirm("Are you sure you want to exit to the main menu? Your setup will be lost.")) {
      onExitGame();
    }
  };

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!selectedShip || draggedShipInfo) return;

    if (canPlaceShip(localPlayer.grid, selectedShip, x, y, isHorizontal, gridDimensions)) {
      const { newGrid, newShip } = placeShip(localPlayer.grid, selectedShip, x, y, isHorizontal);
      const updatedShips = localPlayer.ships.map(ship => ship.name === newShip.name ? newShip : ship);
      
      const newPlayerState = { ...localPlayer, grid: newGrid, ships: updatedShips };
      recordHistory(newPlayerState);

      setSelectedShipIndex(0);
      setSelectedPlacedShip(null);
    }
  }, [localPlayer, selectedShip, isHorizontal, gridDimensions, draggedShipInfo, recordHistory]);

  const handleReset = () => {
      const resetPlayer = {
          ...playerToSetup,
          grid: createEmptyGrid(gridDimensions.rows, gridDimensions.cols),
          ships: game.shipsConfig.map(sc => ({...sc, positions: [], isSunk: false, isDamaged: false}))
      };
      setHistory([resetPlayer]);
      setHistoryIndex(0);
      setSelectedShipIndex(0);
      setSelectedPlacedShip(null);
  };

  const handleAutoPlace = () => {
    const blankPlayer = {
        ...localPlayer,
        grid: createEmptyGrid(gridDimensions.rows, gridDimensions.cols),
        ships: game.shipsConfig.map(sc => ({...sc, positions: [], isSunk: false, isDamaged: false}))
    };
    const playerWithPlacedShips = placeShipsForAI(blankPlayer, game.shipsConfig, gridDimensions);
    recordHistory({ ...playerWithPlacedShips, isReady: false });
    setSelectedPlacedShip(null);
    setSelectedShipIndex(0);
  };
  
  // --- Drag and Drop Handlers ---
  const handleShipDragStart = (ship: Ship, partIndex: number) => {
    const isHorizontal = ship.positions.length > 1 ? ship.positions[0].y === ship.positions[1].y : true;
    const gridWithoutShip = localPlayer.grid.map(row => [...row]);
    ship.positions.forEach(pos => {
        gridWithoutShip[pos.y][pos.x] = CellState.EMPTY;
    });
    setDraggedShipInfo({ ship, partIndex, isHorizontal });

    // Temporarily update the visual state without recording history
    const tempPlayer = { ...localPlayer, grid: gridWithoutShip };
    setHistory([...history.slice(0, historyIndex + 1), tempPlayer]);
    setHistoryIndex(historyIndex + 1);

    setSelectedShipIndex(999);
    setSelectedPlacedShip(null);
  };

  const handleCellDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (draggedShipInfo) {
      setHoveredCell({ x, y });
    }
  };
  
  const handleCellDrop = (x: number, y: number) => {
    if (!draggedShipInfo) return;

    // Go back to the state before the drag started to check for validity
    const preDragPlayerState = history[historyIndex - 1];
    
    const { ship, partIndex, isHorizontal } = draggedShipInfo;
    const shipX = isHorizontal ? x - partIndex : x;
    const shipY = isHorizontal ? y : y - partIndex;

    // Abort drag operation by reverting to pre-drag state
    const abortDrag = () => {
        setHistory(history.slice(0, historyIndex));
        setHistoryIndex(historyIndex - 1);
        setDraggedShipInfo(null);
        setHoveredCell(null);
    }

    if (canPlaceShip(preDragPlayerState.grid, ship, shipX, shipY, isHorizontal, gridDimensions)) {
      const { newGrid, newShip } = placeShip(preDragPlayerState.grid, ship, shipX, shipY, isHorizontal);
      const updatedShips = preDragPlayerState.ships.map(s => s.name === newShip.name ? newShip : s);
      
      // Update history properly, replacing the temporary drag state
      const newHistory = history.slice(0, historyIndex);
      newHistory.push({ ...preDragPlayerState, grid: newGrid, ships: updatedShips });
      setHistory(newHistory);
    } else {
      abortDrag();
      showToast("Cannot place ship there.", "error");
    }

    setDraggedShipInfo(null);
    setHoveredCell(null);
  };

  const handleShipDragEnd = () => {
    if (draggedShipInfo) {
        // This case handles dragging a ship off-grid, which is a cancellation.
        setHistory(history.slice(0, historyIndex));
        setHistoryIndex(historyIndex - 1);
        setDraggedShipInfo(null);
        setHoveredCell(null);
    }
  };
  
  const handleShipClick = (ship: Ship) => {
    setSelectedPlacedShip(prev => (prev?.name === ship.name ? null : ship));
    setSelectedShipIndex(999); // Deselect from the unplaced list
  };

  const handleRotate = useCallback(() => {
    if (selectedPlacedShip) {
        const shipToRotate = selectedPlacedShip;
        const gridWithoutShip = localPlayer.grid.map(row => [...row]);
        shipToRotate.positions.forEach(pos => {
            gridWithoutShip[pos.y][pos.x] = CellState.EMPTY;
        });

        const currentIsHorizontal = shipToRotate.positions.length > 1 
            ? shipToRotate.positions[0].y === shipToRotate.positions[1].y 
            : shipToRotate.positions.length === 1 ? isHorizontal : true; // Fallback for single-cell ship
        
        const newIsHorizontal = !currentIsHorizontal;
        const anchor = shipToRotate.positions[0];

        if (canPlaceShip(gridWithoutShip, shipToRotate, anchor.x, anchor.y, newIsHorizontal, gridDimensions)) {
            const { newGrid, newShip } = placeShip(gridWithoutShip, shipToRotate, anchor.x, anchor.y, newIsHorizontal);
            const updatedShips = localPlayer.ships.map(s => s.name === newShip.name ? newShip : s);
            recordHistory({ ...localPlayer, grid: newGrid, ships: updatedShips });
            setSelectedPlacedShip(newShip);
        } else {
            showToast("Cannot rotate ship: Path is blocked or out of bounds.", "error");
        }
    } else {
        setIsHorizontal(prev => !prev);
    }
  }, [selectedPlacedShip, localPlayer, isHorizontal, gridDimensions, recordHistory, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'r') {
            handleRotate();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRotate]);


  const shipToPreview = draggedShipInfo ? draggedShipInfo.ship : selectedShip;
  const previewIsHorizontal = draggedShipInfo ? draggedShipInfo.isHorizontal : isHorizontal;
  let previewX = hoveredCell?.x ?? 0;
  let previewY = hoveredCell?.y ?? 0;

  if (draggedShipInfo && hoveredCell) {
    if (draggedShipInfo.isHorizontal) {
      previewX = hoveredCell.x - draggedShipInfo.partIndex;
    } else {
      previewY = hoveredCell.y - draggedShipInfo.partIndex;
    }
  }

  const hoverPreview = hoveredCell && shipToPreview ? {
      x: previewX,
      y: previewY,
      length: shipToPreview.length,
      isHorizontal: previewIsHorizontal,
      isValid: canPlaceShip(draggedShipInfo ? history[historyIndex-1].grid : localPlayer.grid, shipToPreview, previewX, previewY, previewIsHorizontal, gridDimensions)
  } : null;

  const allShipsPlaced = unplacedShips.length === 0;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (game.phase === 'TURN_TRANSITION') {
    return <SetupTransition nextPlayerName={playerToSetup.name} onConfirm={onConfirmTransition} />
  }

  const nextHumanPlayer = game.players.find((p, index) => index > game.setupPlayerIndex! && !p.isAI);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-2 sm:p-4 fade-in relative">
      <button 
        onClick={handleExit} 
        className="absolute top-4 right-4 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors"
        aria-label="Exit to main menu"
      >
        <ExitIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Exit</span>
      </button>

      <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 mb-2 text-center">Setup Your Fleet, {playerToSetup.name}</h1>
      
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 items-center lg:items-start mt-4">
        <div className="flex-shrink-0 w-full max-w-md lg:max-w-xs mx-auto">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4 w-full">
                <h3 className="text-2xl font-bold text-slate-200 border-b border-slate-600 pb-2">
                    {allShipsPlaced ? "Fleet Controls" : "Remaining Ships"}
                </h3>
                
                {allShipsPlaced ? (
                    <div className="text-center py-2">
                        <p className="text-lg text-green-400 font-bold">All Ships Deployed!</p>
                        <p className="text-slate-300 mt-1 text-sm">You can still move ships or use the controls below.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                    {unplacedShips.map((ship, index) => (
                        <button 
                            key={ship.name}
                            onClick={() => {
                                setSelectedShipIndex(index);
                                setSelectedPlacedShip(null);
                            }}
                            className={`w-full text-left p-3 rounded-md transition-colors text-lg ${selectedShipIndex === index ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            {ship.name} ({ship.length} cells)
                        </button>
                    ))}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-600 grid grid-cols-2 gap-3">
                    <button
                        onClick={handleRotate}
                        className="col-span-2 bg-slate-600 hover:bg-slate-500 text-slate-200 font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <RotateIcon className="w-5 h-5" />
                        {selectedPlacedShip 
                            ? 'Rotate Selected Ship' 
                            : `Rotate Placement (${isHorizontal ? 'Horizontal' : 'Vertical'})`}
                    </button>
                   <button 
                        onClick={handleUndo} 
                        disabled={!canUndo}
                        className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700/50 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                      <UndoIcon className="w-5 h-5" /> Undo
                   </button>
                   <button 
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700/50 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                      <RedoIcon className="w-5 h-5" /> Redo
                   </button>
                   <button onClick={handleAutoPlace} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded">
                      Auto-Place
                  </button>
                  <button onClick={handleReset} className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded">
                      Reset
                  </button>
                </div>
            </div>
        </div>
        
        <div className="w-full lg:flex-1">
          <Grid
            grid={localPlayer.grid}
            ships={localPlayer.ships}
            title={`${playerToSetup.name}'s Fleet Setup`}
            isSetup={true}
            onCellClick={handleCellClick}
            onCellMouseEnter={(x, y) => setHoveredCell({x, y})}
            onCellMouseLeave={() => setHoveredCell(null)}
            hoverPreview={hoverPreview}
            gridDimensions={gridDimensions}
            onShipDragStart={handleShipDragStart}
            onCellDrop={handleCellDrop}
            onCellDragOver={handleCellDragOver}
            onShipDragEnd={handleShipDragEnd}
            onShipClick={handleShipClick}
            selectedShipName={selectedPlacedShip?.name || null}
          />
        </div>
      </div>

      <button
        onClick={() => onReady(localPlayer)}
        disabled={!allShipsPlaced || playerToSetup.isReady}
        className="mt-8 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105"
      >
        {nextHumanPlayer ? "Confirm Fleet & Pass" : "Confirm Fleet & Start Battle"}
      </button>
    </div>
  );
};

export default SetupPhase;
