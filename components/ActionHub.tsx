import React from 'react';
import { Player, ShipType, GameState } from '../types';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';

interface ActionHubProps {
    player: Player;
    activeAction: GameState['activeAction'];
    onActionSelect: (actionType: ShipType) => void;
}

const actionConfig: { type: ShipType, name: string, Icon: React.FC<any> }[] = [
    { type: 'Mothership', name: 'Attack', Icon: MothershipIcon },
    { type: 'Radarship', name: 'Radar Scan', Icon: RadarshipIcon },
    { type: 'Repairship', name: 'Repair', Icon: RepairshipIcon },
    { type: 'Commandship', name: 'Relocate', Icon: CommandshipIcon },
    { type: 'Decoyship', name: 'Place Decoy', Icon: DecoyshipIcon },
];

const ActionHub: React.FC<ActionHubProps> = ({ player, activeAction, onActionSelect }) => {

    const getActionStatus = (shipType: ShipType) => {
        const ship = player.ships.find(s => s.type === shipType);
        if (!ship || ship.isSunk) {
            return { disabled: true, label: 'SUNK' };
        }

        const cooldown = player.skillCooldowns[shipType];
        if (cooldown !== undefined && cooldown > 0) {
            return { disabled: true, label: `${cooldown}T Cooldown` };
        }

        const uses = player.skillUses[shipType];
        if (uses !== undefined) {
            if (uses > 0) {
                return { disabled: false, label: `${uses} Left` };
            }
            return { disabled: true, label: 'No Uses' };
        }
        
        return { disabled: false, label: 'Ready' };
    };


    return (
        <div className="w-full max-w-screen-md bg-slate-900/50 border-2 border-slate-700 rounded-xl shadow-lg flex justify-around items-center p-3 gap-2 fade-in">
            {actionConfig.map(({ type, name, Icon }) => {
                const status = getActionStatus(type);
                const isActive = activeAction?.shipType === type;
                
                let baseClasses = "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all transform w-24 h-24 text-center border-2 ";
                if (status.disabled) {
                    baseClasses += "bg-slate-700/50 border-slate-600 text-slate-500 cursor-not-allowed opacity-60";
                } else if (isActive) {
                    baseClasses += "bg-cyan-600 border-cyan-400 text-white scale-105 shadow-lg";
                } else {
                    baseClasses += "bg-slate-700 border-slate-500 text-slate-200 hover:bg-slate-600 hover:border-cyan-500 hover:-translate-y-1";
                }

                return (
                    <button
                        key={type}
                        disabled={status.disabled}
                        onClick={() => onActionSelect(type)}
                        className={baseClasses}
                    >
                        <Icon className="w-7 h-7" />
                        <span className="text-sm font-bold leading-tight">{name}</span>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${status.disabled ? 'bg-slate-800' : 'bg-slate-900/50'}`}>
                            {status.label}
                        </span>
                    </button>
                )
            })}
        </div>
    );
};

export default ActionHub;