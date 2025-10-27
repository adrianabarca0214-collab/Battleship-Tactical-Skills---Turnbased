import React from 'react';
import { Player } from '../types';

interface ScoreboardProps {
  players: Player[];
}

const Scoreboard: React.FC<ScoreboardProps> = ({ players }) => {
  // Sort players by score for display
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="mb-6 p-4 bg-slate-800 rounded-xl shadow-lg border border-slate-700">
      <h2 className="text-xl font-bold text-center text-slate-300 mb-3">Scoreboard</h2>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className="flex items-baseline gap-2 p-2 rounded-lg bg-slate-700/50">
            <span className="font-bold text-slate-400 text-sm">#{index + 1}</span>
            <span className="text-white font-semibold text-lg truncate max-w-[150px]">{player.name}</span>
            <span className="font-mono text-cyan-400 text-lg">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
