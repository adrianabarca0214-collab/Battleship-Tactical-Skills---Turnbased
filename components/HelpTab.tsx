
import React, { useState } from 'react';
import HelpIcon from './icons/HelpIcon';
import XIcon from './icons/XIcon';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';


const HelpTab: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const ships = [
        {
            name: "Mothership (2 sq.)",
            icon: MothershipIcon,
            purpose: "The command center. If it's sunk, you lose the game.",
            skill: "Escape (Active, 1 Use): Once your Mothership has been damaged, this skill becomes available. Using it fully repairs the Mothership and lets you move it to a new location. A powerful one-time comeback mechanic."
        },
        {
            name: "Radarship (3 sq.)",
            icon: RadarshipIcon,
            purpose: "Provides intelligence on enemy positions.",
            skill: "Radar Scan (Active): Reveal the contents of a 2x2 area. It will identify ships and decoys as contacts. The revealed information is temporary and will disappear at the end of your turn. Cooldown: 3 turns."
        },
        {
            name: "Repairship (3 sq.)",
            icon: RepairshipIcon,
            purpose: "Maintains your fleet's integrity.",
            skill: "Repair (Active): Remove one 'hit' marker from any of your ships. Cooldown: 3 turns. Each ship can only be repaired once. If a ship is fully repaired, it becomes hidden from enemy grids again!"
        },
        {
            name: "Jamship (3 sq.)",
            icon: JamshipIcon,
            purpose: "Disrupts enemy special systems.",
            skill: `"Jam" (Active): Target a 3x3 area on the opponent's grid. For the opponent's next turn, any of their ships located within that zone have their active skills disabled. Cooldown: 4 turns.`
        },
        {
            name: "Commandship (5 sq.)",
            icon: CommandshipIcon,
            purpose: "Offers strategic repositioning.",
            skill: "Relocate (Active): Move one of your UNDAMAGED ships to a new valid location that has not been hit by enemy fire. Cooldown: 5 turns."
        },
        {
            name: "Decoyship (4 sq.)",
            icon: DecoyshipIcon,
            purpose: "This ship is a standard combat vessel that also carries decoy launchers.",
            skill: "Deploy Decoy (Active): Place a single decoy beacon in an empty cell. If an enemy hits the decoy, it will register as a 'HIT' on their grid before being destroyed, creating false intelligence. This leaves a ghost signal designed to make them waste shots. Max 2 uses."
        }
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-40 p-4 bg-cyan-600 hover:bg-cyan-700 rounded-full text-white shadow-lg transition-transform hover:scale-110"
                aria-label="Open Help"
            >
                <HelpIcon className="w-8 h-8" />
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 fade-in">
            <div className="bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b border-slate-600">
                    <h2 className="text-3xl font-bold text-cyan-400">Tactical Guide</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200"
                        aria-label="Close Help"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="text-center bg-slate-900/50 p-3 rounded-lg">
                        <h3 className="text-xl font-bold text-yellow-400">Objective</h3>
                        <p className="text-slate-300">Be the first to find and sink the opponent's <strong>Mothership</strong>.</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                        <h3 className="text-xl font-bold text-slate-200 mb-3">Core Combat Rules</h3>
                        <div className="space-y-2 text-sm text-slate-300">
                             <p>
                                <strong className="text-green-400">HIT & GO AGAIN:</strong> If your shot hits an enemy ship or a decoy, you get to take another action! However, hitting the enemy <strong>Mothership</strong> will end your turn immediately.
                            </p>
                            <p>
                                <strong className="text-cyan-400">INCOGNITO REPAIR:</strong> If you manage to fully repair a ship (remove all HIT markers), it will be removed from your opponent's grid, becoming invisible again.
                            </p>
                             <p>
                                <strong className="text-red-400">ONE-TIME REPAIR:</strong> Each ship can only be repaired <strong className="font-bold">once</strong> per game, so choose your moment wisely!
                            </p>
                            <p>
                                <strong className="text-orange-400">REPAIR TIMING:</strong> The Repairship skill <strong className="font-bold">cannot</strong> be used to fix damage that was sustained on the current turn. You must wait for your next turn to repair it.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-200 mb-3">Ship Classes & Skills</h3>
                        <div className="space-y-4">
                            {ships.map(ship => {
                                const Icon = ship.icon;
                                return (
                                <div key={ship.name} className="flex items-start gap-4 p-3 bg-slate-700/50 rounded-lg">
                                    <Icon className="w-8 h-8 text-cyan-300 flex-shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-lg text-white">{ship.name}</h4>
                                        <p className="text-sm text-slate-300 italic mb-1">{ship.purpose}</p>
                                        <p className="text-sm text-slate-200"><strong className="text-cyan-400">Skill:</strong> {ship.skill}</p>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpTab;