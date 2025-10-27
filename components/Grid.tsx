import React, { useMemo } from 'react';
import { CellState, Grid as GridType, Ship, GameLogEntry } from '../types';
import ExplosionIcon from './icons/ExplosionIcon';
import WaterIcon from './icons/WaterIcon';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import RadarContactIcon from './icons/RadarContactIcon';
import PermanentDamageIcon from './icons/PermanentDamageIcon';

// This defines what information we need about each part of a ship for rendering
interface ShipPart {
  ship: Ship;
  partIndex: number; // 0 for bow, ship.length - 1 for stern
  isHorizontal: boolean;
}

interface GridProps {
  grid: GridType;
  ships?: Ship[]; // Player's own ships for detailed rendering
  onCellClick?: (x: number, y: number) => void;
  isOpponentGrid?: boolean;
  isPlayerTurn?: boolean;
  title: string;
  gridDimensions: { rows: number; cols: number };
  animatedShot?: GameLogEntry | null;
  
  // Tactical Mode Props
  radarScanCells?: {x: number, y: number}[];
  activeAction?: any;
  onShipPartClick?: (ship: Ship) => void;
  isDimmed?: boolean;

  // Props for setup phase or commandship relocate
  isSetup?: boolean;
  onCellMouseEnter?: (x: number, y: number) => void;
  onCellMouseLeave?: () => void;
  hoverPreview?: { x: number; y: number; length: number; isHorizontal: boolean; isValid: boolean } | null;
  onShipDragStart?: (ship: Ship, partIndex: number) => void;
  onCellDrop?: (x: number, y: number) => void;
  onCellDragOver?: (e: React.DragEvent, x: number, y: number) => void;
  onShipDragEnd?: () => void;
  onShipClick?: (ship: Ship) => void;
  selectedShipName?: string | null;
}

const ShipTypeIcon: React.FC<{type: string, className?: string, style?: React.CSSProperties}> = ({ type, className, style }) => {
    switch(type) {
        case 'Mothership': return <MothershipIcon className={className} style={style} />;
        case 'Radarship': return <RadarshipIcon className={className} style={style} />;
        case 'Repairship': return <RepairshipIcon className={className} style={style} />;
        case 'Commandship': return <CommandshipIcon className={className} style={style} />;
        case 'Decoyship': return <DecoyshipIcon className={className} style={style} />;
        default: return null;
    }
}

const Grid: React.FC<GridProps> = ({ 
    grid, 
    ships = [], 
    onCellClick, 
    isOpponentGrid = false, 
    isPlayerTurn = false, 
    title,
    isSetup = false,
    onCellMouseEnter,
    onCellMouseLeave,
    hoverPreview,
    gridDimensions,
    onShipDragStart,
    onCellDrop,
    onCellDragOver,
    onShipDragEnd,
    onShipClick,
    selectedShipName,
    animatedShot,
    radarScanCells = [],
    activeAction,
    onShipPartClick,
    isDimmed,
}) => {

  const shipsToRender = useMemo(() => {
    if (activeAction?.type === 'SKILL' && activeAction.shipType === 'Commandship' && activeAction.stage === 'PLACE_SHIP' && activeAction.shipToMove) {
        return ships.filter(s => s.name !== activeAction.shipToMove.name);
    }
    return ships;
  }, [ships, activeAction]);

  // Create a lookup map for quick access to ship info for any cell coordinate
  const shipMap = useMemo(() => {
    const map = new Map<string, ShipPart>();
    if (isOpponentGrid) return map;

    shipsToRender.forEach(ship => {
      if (ship.positions.length > 0) {
        const isHorizontal = ship.positions.length > 1 ? ship.positions[0].y === ship.positions[1].y : true;
        ship.positions.forEach((pos, index) => {
          map.set(`${pos.x},${pos.y}`, { ship, partIndex: index, isHorizontal });
        });
      }
    });
    return map;
  }, [shipsToRender, isOpponentGrid]);

  const getCellContent = (cellState: CellState, shipPart?: ShipPart) => {
    switch (cellState) {
      case CellState.PERMANENT_DAMAGE:
        return <PermanentDamageIcon className="w-6 h-6 text-red-400" />;
      case CellState.HIT:
         return <ExplosionIcon className={`w-5 h-5 ${shipPart ? 'text-orange-300' : 'text-orange-400'}`} />;
      case CellState.SUNK:
        return <ExplosionIcon className="w-6 h-6 text-red-500 animate-pulse" />;
      case CellState.MISS:
        return <WaterIcon className="w-5 h-5 text-cyan-500" />;
      case CellState.RADAR_CONTACT:
        return <RadarContactIcon className="w-6 h-6 text-cyan-400 animate-pulse" />;
      default:
        return null;
    }
  };

  const getShipBodyClasses = (part: ShipPart, cellState: CellState) => {
    let classes = 'absolute inset-0.5 bg-gradient-to-br from-slate-500 to-slate-600 z-0 transition-all';

    if (part.ship.isSunk) {
        classes = 'absolute inset-0.5 bg-slate-800 border border-slate-700 z-0';
    } else if (cellState === CellState.HIT || cellState === CellState.PERMANENT_DAMAGE) {
        classes = 'absolute inset-0.5 bg-gradient-to-br from-slate-700 to-slate-800 z-0';
    } else if (isSetup) {
        classes += ' cursor-grab';
        if (part.ship.name === selectedShipName) {
            classes += ' ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-800';
        }
    } else { // In-game logic, not opponent grid
        classes += ' shadow-[0_0_8px_rgba(56,189,248,0.5)] ring-1 ring-cyan-500/30';

        const isClickableForRelocate = activeAction?.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP' && !part.ship.isDamaged && part.ship.type !== 'Commandship'
        if (isPlayerTurn && isClickableForRelocate) {
            classes += ' cursor-pointer hover:ring-2 hover:ring-yellow-400/80';
        }
    }
    
    const isBow = part.partIndex === 0;
    const isStern = part.partIndex === part.ship.length - 1;

    if (part.isHorizontal) {
      if (isBow) classes += ' rounded-l-full';
      if (isStern) classes += ' rounded-r-full';
    } else {
      if (isBow) classes += ' rounded-t-full';
      if (isStern) classes += ' rounded-b-full';
    }
    
    return classes;
  };

  const headers = Array.from({ length: gridDimensions.cols }, (_, i) => String.fromCharCode(65 + i));
  const gridStyle = {
    gridTemplateColumns: `min-content repeat(${gridDimensions.cols}, minmax(0, 1fr))`
  };
  
  const isPlacingMode = activeAction?.type === 'SKILL' && 
      ((activeAction.shipType === 'Commandship' && activeAction.stage === 'PLACE_SHIP') ||
       (activeAction.shipType === 'Decoyship' && activeAction.stage === 'PLACE_DECOY'));

  return (
    <div className="p-2 bg-slate-900/50 rounded-lg shadow-lg relative">
      {isDimmed && <div className="absolute inset-0 bg-slate-900/70 z-30 rounded-lg" />}
      <h3 className="text-center font-bold text-slate-300 mb-2">{title}</h3>
      <div 
        className="grid gap-1 text-xs"
        style={gridStyle}
        onMouseLeave={(isSetup || isPlacingMode) ? onCellMouseLeave : undefined}
      >
        <div className="flex items-center justify-center"></div> {/* Top-left empty cell */}
        {headers.map(header => <div key={header} className="flex items-center justify-center text-slate-400">{header}</div>)}
        
        {grid.map((row, y) => (
          <React.Fragment key={y}>
            <div className="flex items-center justify-center text-slate-400">{y + 1}</div>
            {row.map((cell, x) => {
              const shipPart = shipMap.get(`${x},${y}`);
              let baseClass = 'w-full h-full flex items-center justify-center border border-slate-700 transition-colors relative';
              let hoverShipPart = null;
              const isRadarCell = radarScanCells.some(c => c.x === x && c.y === y);
              
              let isDisabled = !onCellClick || (isSetup && cell === CellState.SHIP);

              if (isOpponentGrid) {
                 if (isRadarCell) {
                    baseClass += ' bg-cyan-500/30 ring-1 ring-cyan-400';
                 } else if (cell === CellState.RADAR_CONTACT) {
                    baseClass += ' bg-cyan-900/50';
                 } else if (cell === CellState.HIT) {
                    baseClass += ' bg-orange-900/40';
                 } else if (cell === CellState.SUNK) {
                    baseClass += ' bg-red-900/50';
                 } else if (onCellClick && isPlayerTurn && activeAction && (cell === CellState.EMPTY || cell === CellState.RADAR_CONTACT)) {
                    baseClass += ' cursor-pointer bg-slate-800 hover:bg-slate-700/70';
                 } else {
                    baseClass += ' bg-slate-800/50';
                 }
                 isDisabled = isDisabled || !isPlayerTurn || !activeAction || (cell !== CellState.EMPTY && cell !== CellState.RADAR_CONTACT);

                 if (activeAction?.type === 'SKILL' && activeAction.shipType === 'Radarship') {
                     isDisabled = !isPlayerTurn || !activeAction || cell !== CellState.EMPTY;
                 }
              } else if (isSetup) {
                 baseClass += ' cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700'
              }
              else { // Own grid, in-game
                  baseClass += ' bg-slate-800/50';
                  if (cell === CellState.PERMANENT_DAMAGE) {
                    baseClass += ' bg-red-900/40';
                  }
                  isDisabled = true; // By default, own grid cells aren't clickable

                  if (isPlayerTurn && activeAction) {
                      // Allow clicking on a HIT cell to repair
                      if (activeAction.type === 'SKILL' && activeAction.shipType === 'Repairship' && cell === CellState.HIT) {
                          baseClass += ' cursor-pointer hover:bg-green-700/50';
                          isDisabled = false;
                      } 
                      // Allow clicking empty cell to place relocated ship or decoy
                      else if (isPlacingMode && cell === CellState.EMPTY) {
                          baseClass += ' cursor-pointer hover:bg-slate-700/70';
                          isDisabled = false;
                      }
                  }
                  
                  // Allow clicking on a ship part to select for a skill
                  if (shipPart && !shipPart.ship.isSunk && isPlayerTurn && activeAction) {
                      const canSelectForRelocate = activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP' && !shipPart.ship.isDamaged && shipPart.ship.type !== 'Commandship';
                      if (canSelectForRelocate) {
                         isDisabled = false;
                      }
                  }
              }

              if ((isSetup || isPlacingMode) && hoverPreview) {
                 const { x: hx, y: hy, length, isHorizontal, isValid } = hoverPreview;
                 const inHoverRange = isHorizontal ? 
                    (y === hy && x >= hx && x < hx + length) : 
                    (x === hx && y >= hy && y < hy + length);

                 if (inHoverRange) {
                    hoverShipPart = {
                        color: isValid ? 'bg-slate-500/50' : 'bg-red-500/50',
                        isBow: isHorizontal ? x === hx : y === hy,
                        isStern: isHorizontal ? x === hx + length - 1 : y === hy + length - 1,
                        isHorizontal: isHorizontal
                    }
                 }
              }
              
              const isAnimated = animatedShot && animatedShot.coords?.x === x && animatedShot.coords?.y === y;

              return (
              <div key={`${x}-${y}`} className="aspect-square">
                <button
                  className={`${baseClass} ${isAnimated ? 'cell-targeted' : ''}`}
                  onClick={() => !isDimmed && onCellClick && onCellClick(x, y)}
                  onMouseEnter={(isSetup || isPlacingMode) ? () => onCellMouseEnter && onCellMouseEnter(x, y) : undefined}
                  onDrop={(e) => { e.preventDefault(); onCellDrop && onCellDrop(x,y); }}
                  onDragOver={(e) => onCellDragOver && onCellDragOver(e, x, y)}
                  disabled={isDisabled || isDimmed}
                  aria-label={`Cell ${headers[x]}${y + 1}, state: ${cell}`}
                >
                  {shipPart && (
                    <div 
                      title={shipPart.ship.name}
                      className={getShipBodyClasses(shipPart, cell)}
                      draggable={isSetup}
                      onDragStart={(e) => {
                          e.stopPropagation();
                          onShipDragStart && onShipDragStart(shipPart.ship, shipPart.partIndex);
                      }}
                      onDragEnd={(e) => {
                          e.stopPropagation();
                          onShipDragEnd && onShipDragEnd();
                      }}
                      onClick={(e) => {
                          e.stopPropagation();
                          if (isDimmed) return;
                          if(isSetup) onShipClick && onShipClick(shipPart.ship);
                          else onShipPartClick && onShipPartClick(shipPart.ship);
                      }}
                    >
                    </div>
                  )}

                  {shipPart && shipPart.partIndex === 0 && !shipPart.ship.isSunk && (
                      <div
                          className="absolute top-0 left-0 flex items-center justify-center pointer-events-none"
                          style={{
                              width: shipPart.isHorizontal ? `${shipPart.ship.length * 100}%` : '100%',
                              height: shipPart.isHorizontal ? '100%' : `${shipPart.ship.length * 100}%`,
                              zIndex: 25,
                          }}
                      >
                          <ShipTypeIcon type={shipPart.ship.type} className="w-8 h-8 text-slate-200" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }}/>
                      </div>
                  )}

                  {hoverShipPart && (
                    <div className={`absolute inset-0.5 z-10 ${hoverShipPart.color} ${
                        hoverShipPart.isHorizontal 
                        ? `${hoverShipPart.isBow ? 'rounded-l-full' : ''} ${hoverShipPart.isStern ? 'rounded-r-full' : ''}`
                        : `${hoverShipPart.isBow ? 'rounded-t-full' : ''} ${hoverShipPart.isStern ? 'rounded-b-full' : ''}`
                    }`}></div>
                  )}

                  <div className="relative z-20">
                     {getCellContent(cell, shipPart)}
                  </div>
                </button>
              </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Grid;