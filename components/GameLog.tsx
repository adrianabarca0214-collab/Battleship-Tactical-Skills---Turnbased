import React, { useState, useRef, useEffect } from 'react';
import { GameLogEntry, Player, GameMode } from '../types';
import HistoryIcon from './icons/HistoryIcon';
import TargetIcon from './icons/TargetIcon';
import ExplosionIcon from './icons/ExplosionIcon';
import WaterIcon from './icons/WaterIcon';
import ShipIcon from './icons/ShipIcon';

interface GameLogProps {
    log: GameLogEntry[];
    players: Player[];
    currentUserId: string;
    gameMode: GameMode;
}

const getColumnLetter = (col: number) => String.fromCharCode(65 + col);

const GameLog: React.FC<GameLogProps> = ({ log, players, currentUserId, gameMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [log, isOpen]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);


    const formatLogEntry = (entry: GameLogEntry) => {
        const isCurrentUser = entry.playerId === currentUserId;
        const playerName = isCurrentUser ? "You" : entry.playerName;
        const targetName = entry.targetId === currentUserId ? "your" : (entry.targetName ? `${entry.targetName}'s` : '');
        const coords = entry.coords ? `${getColumnLetter(entry.coords.x)}${entry.coords.y + 1}` : '';

        if (gameMode === 'TACTICAL' && entry.result === 'SKILL_USED') {
             return (
                <>
                   <ShipIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                   <span className="flex-1">
                       <strong>{playerName}</strong> used a ship skill.
                   </span>
               </>
           );
        }

        switch (entry.result) {
            case 'MISS':
                return (
                    <>
                        <WaterIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> fired at {coords} and missed.
                        </span>
                    </>
                );
            case 'HIT':
                const hitTarget = entry.targetId === currentUserId 
                    ? 'your ship' 
                    : (entry.targetName === 'Battlefield' 
                        ? 'a ship' 
                        : `one of ${entry.targetName}'s ships`);
                return (
                    <>
                        <ExplosionIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> hit {hitTarget} at {coords}!
                        </span>
                    </>
                );
            case 'SUNK_SHIP':
                 return (
                    <>
                        <ShipIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> sunk {targetName} <strong>{entry.sunkShipName}</strong>!
                        </span>
                    </>
                );
            default:
                return <span>Event: {JSON.stringify(entry)}</span>;
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 bg-cyan-800/50 hover:bg-cyan-700/50 rounded-full text-slate-200 transition-colors"
                aria-label="Toggle Game Log"
            >
                <HistoryIcon className="w-6 h-6" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-30 w-96 max-h-[70vh] bg-slate-800/95 backdrop-blur-sm border-2 border-slate-600 rounded-lg shadow-2xl fade-in-down">
                    <div className="p-4 h-full flex flex-col">
                        <h3 className="text-2xl font-bold text-slate-200 border-b border-slate-600 pb-2 mb-3">Game Log</h3>
                        <div ref={logContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {log.length === 0 && <p className="text-slate-400 text-center mt-4">No events yet.</p>}
                            {log.map((entry, index) => (
                                <div key={index} className="flex items-center gap-3 text-slate-300 p-2 text-sm bg-slate-700/50 rounded-md">
                                    <span className="font-mono text-slate-500 text-xs">T{entry.turn}</span>
                                    {formatLogEntry(entry)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameLog;