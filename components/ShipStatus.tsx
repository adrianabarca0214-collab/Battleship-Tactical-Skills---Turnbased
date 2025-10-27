
import React from 'react';
import { Ship, Grid as GridType, CellState, GameMode, Player, ShipType } from '../types';
import ShipIcon from './icons/ShipIcon';
import HistoryIcon from './icons/HistoryIcon'; // For cooldown
import TargetIcon from './icons/TargetIcon'; // For uses left
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';

interface ShipStatusProps {
  ships: Ship[];
  grid?: GridType;
  isOpponent?: boolean;
  gameMode?: GameMode;
  player?: Player;
}

const ShipTypeIcon: React.FC<{ shipType: ShipType | string, className?: string }> = ({ shipType, className }) => {
    switch(shipType) {
        case 'Mothership': return <MothershipIcon className={className} />;
        case 'Radarship': return <RadarshipIcon className={className} />;
        case 'Repairship': return <RepairshipIcon className={className} />;
        case 'Commandship': return <CommandshipIcon className={className} />;
        case 'Decoyship': return <DecoyshipIcon className={className} />;
        case 'Jamship': return <JamshipIcon className={className} />;
        default: return <ShipIcon className={className} />; // Fallback for Classic/Score Attack
    }
}

const ShipStatus: React.FC<ShipStatusProps> = ({ ships, grid, isOpponent = false, gameMode, player }) => {

  const getShipHealth = (ship: Ship) => {
    if (ship.isSunk) {
      return { status: 'Sunk', hits: ship.length, percentage: 100 };
    }
    
    // For opponent tactical ships, we don't know their status
    if (isOpponent && gameMode === 'TACTICAL') {
        return { status: 'Unknown', hits: '?', percentage: 0 };
    }

    if (!grid) {
      return { status: 'Operational', hits: 0, percentage: 0 };
    }

    const hits = ship.positions.reduce((acc, pos) => {
      if (grid && grid[pos.y] && grid[pos.y][pos.x] !== undefined) {
          const cell = grid[pos.y][pos.x];
          if (cell === CellState.HIT || cell === CellState.SUNK) {
              return acc + 1;
          }
      }
      return acc;
    }, 0);

    const percentage = (hits / ship.length) * 100;
    let status = 'Operational';
    if (hits > 0) {
      status = 'Damaged';
    }

    return { status, hits, percentage };
  };

  const getHealthBarColor = (percentage: number, status: string) => {
      if (status === 'Sunk') return 'bg-red-600';
      if (percentage > 50) return 'bg-orange-500';
      return 'bg-green-500';
  }

  const renderTacticalStatus = (ship: Ship) => {
    if (!player || ship.type === 'Mothership' || ship.isSunk) return null;

    const cooldown = player.skillCooldowns[ship.type];
    const uses = player.skillUses[ship.type];

    if (cooldown !== undefined) {
        if (cooldown > 0) {
            return <div className="flex items-center gap-1.5 text-orange-400"><HistoryIcon className="w-4 h-4" /> <span className="font-mono font-bold">{cooldown}T</span></div>
        }
        return <div className="flex items-center gap-1.5 text-green-400"><HistoryIcon className="w-4 h-4" /> <span className="font-mono font-bold">READY</span></div>
    }

    if (uses !== undefined) {
         return <div className="flex items-center gap-1.5 text-cyan-400"><TargetIcon className="w-4 h-4" /> <span className="font-mono font-bold">{uses} Left</span></div>
    }
    
    return null;
  }
  
  const sortedShips = [...ships].sort((a,b) => (a.isSunk ? 1 : -1) - (b.isSunk ? 1 : -1) || a.length - b.length);

  return (
    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
      <h4 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-700 pb-2">Fleet Status</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sortedShips.map(ship => {
          const health = getShipHealth(ship);
          
          return (
            <div 
                key={ship.name} 
                className={`p-2 rounded-lg transition-all ${health.status === 'Sunk' ? 'bg-red-900/30' : 'bg-slate-800'}`}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ShipTypeIcon 
                          shipType={ship.type} 
                          className={`w-4 h-4 flex-shrink-0 ${health.status === 'Sunk' ? 'text-red-500' : 'text-slate-300'}`} 
                        />
                        <span className={`font-bold text-sm ${health.status === 'Sunk' ? 'line-through text-slate-500' : 'text-slate-200'}`}>{ship.name}</span>
                    </div>
                    {gameMode === 'TACTICAL' && !isOpponent && (
                        <div className="text-xs">
                            {renderTacticalStatus(ship)}
                        </div>
                    )}
                </div>
                
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2.5">
                    {health.status !== 'Unknown' && (
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${getHealthBarColor(health.percentage, health.status)}`} 
                            style={{ width: `${health.percentage}%` }}>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                    <span>{health.status}</span>
                    <span className="font-mono">{health.hits} / {ship.length}</span>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShipStatus;