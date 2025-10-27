import React, { useState } from 'react';
import HelpIcon from './icons/HelpIcon';
import XIcon from './icons/XIcon';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';


const HelpTab: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const ships = [
        {
            name: "Mothership (2 sq.)",
            icon: MothershipIcon,
            purpose: "The command center. Click this ship to initiate an Attack. If it's sunk, you lose.",
            skill: "No active or passive skills."
        },
        {
            name: "Radarship (3 sq.)",
            icon: RadarshipIcon,
            purpose: "Provides intelligence on enemy positions.",
            skill: "Radar Scan (Active): Reveal the contents of a 2x2 area. The revealed grid information is permanent, with the scanned area highlighted for 3 seconds. Cooldown: 3 turns."
        },
        {
            name: "Repairship (3 sq.)",
            icon: RepairshipIcon,
            purpose: "Maintains your fleet's integrity.",
            skill: "Repair (Active): Remove one 'hit' marker from any of your ships. Max 3 uses."
        },
        {
            name: "Commandship (5 sq.)",
            icon: CommandshipIcon,
            purpose: "Offers strategic repositioning.",
            skill: "Relocate (Active): Move one of your UNDAMAGED ships to a new valid location. Cooldown: 5 turns."
        },
        {
            name: "Decoyship (4 sq.)",
            icon: DecoyshipIcon,
            purpose: "This ship is a standard combat vessel that also carries decoy launchers.",
            skill: "Deploy Decoy (Active): Place a separate, 3-square decoy on your grid. If an enemy hits the decoy, it is destroyed, and they are notified of the deception. The decoy does not count towards your main fleet. Max 2 uses."
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
                                <strong className="text-red-400">PERMANENT DAMAGE:</strong> The <strong className="font-bold">first hit</strong> on any ship causes permanent damage. This specific square cannot be repaired for the rest of the game!
                            </p>
                            <p>
                                <strong className="text-cyan-400">REPAIR TIMING:</strong> The Repairship skill <strong className="font-bold">cannot</strong> be used to fix damage that was sustained on the current turn. You must wait for your next turn to repair it.
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