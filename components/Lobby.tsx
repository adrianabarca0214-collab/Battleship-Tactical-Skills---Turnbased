
import React, { useState, useMemo } from 'react';
import { GameMode } from '../types';

interface LobbyProps {
  onStartGame: (playerConfigs: { name: string; isAI: boolean }[], maxPlayers: number, gameMode: GameMode) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onStartGame }) => {
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [error, setError] = useState('');
  
  const [playerConfigs, setPlayerConfigs] = useState([
      { name: 'Player 1', isAI: false },
      { name: 'Player 2', isAI: true },
      { name: 'Player 3', isAI: true },
      { name: 'Player 4', isAI: true },
  ]);

  const handleStart = () => {
    const activePlayers = playerConfigs.slice(0, maxPlayers);
    if (activePlayers.some(p => !p.isAI && !p.name.trim())) {
      setError('All human players must have a name.');
      return;
    }
    setError('');
    onStartGame(activePlayers, maxPlayers, gameMode);
  };

  const handlePlayerCountChange = (num: number) => {
    setMaxPlayers(num);
    if (num > 2) {
      setGameMode('SCORE_ATTACK');
    } else {
      if (gameMode === 'SCORE_ATTACK') {
        setGameMode('CLASSIC');
      }
    }
  };
  
  const handlePlayerConfigChange = (index: number, field: 'name' | 'isAI', value: string | boolean) => {
      setPlayerConfigs(prev => {
          const newConfigs = [...prev];
          // @ts-ignore
          newConfigs[index][field] = value;
          // Ensure first player is never an AI
          if (index === 0 && field === 'isAI' && value === true) {
              newConfigs[index].isAI = false;
          }
          return newConfigs;
      });
  }

  const getGameModeDescription = () => {
      if (gameMode === 'TACTICAL') return "1v1 strategic combat. Sink the enemy Mothership to win using unique ship skills.";
      if (maxPlayers > 2) return "Score Attack: Ships are placed automatically. The player with the highest score wins!";
      return "Classic Mode: Place your ships and be the last one standing.";
  }
  
  const activePlayerInputs = useMemo(() => {
    return playerConfigs.slice(0, maxPlayers).map((config, index) => (
      <div key={index} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-md">
        <label htmlFor={`p${index}_name`} className="font-semibold text-slate-300 w-20 text-center">Player {index + 1}</label>
        <input
          id={`p${index}_name`}
          type="text"
          value={config.name}
          onChange={(e) => handlePlayerConfigChange(index, 'name', e.target.value)}
          placeholder={`Enter Name for Player ${index+1}`}
          className="flex-grow px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
          disabled={config.isAI}
        />
        {index > 0 && (
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id={`p${index}_ai`}
              checked={config.isAI}
              onChange={(e) => handlePlayerConfigChange(index, 'isAI', e.target.checked)}
              className="h-5 w-5 rounded bg-slate-600 border-slate-500 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor={`p${index}_ai`} className="text-slate-300">AI</label>
          </div>
        )}
      </div>
    ));
  }, [playerConfigs, maxPlayers]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 fade-in">
      <div className="w-full max-w-lg bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-center text-cyan-400 tracking-wider">
            GEMINI BATTLESHIP
          </h1>
          <p className="text-center text-slate-400 mt-2 text-lg">FLEET COMMAND</p>
        </div>

        {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
        
        <div className="space-y-6 bg-slate-700/50 p-4 rounded-lg">
            <h2 className="text-2xl font-semibold text-center text-white">New Game Setup</h2>
            
            <div>
              <label className="block text-center text-slate-300 mb-2">Number of Players:</label>
              <div className="flex justify-center gap-2">
                  {[2, 3, 4].map(num => (
                      <button
                          key={num}
                          onClick={() => handlePlayerCountChange(num)}
                          className={`px-4 py-2 rounded-md font-bold transition-colors w-16 ${maxPlayers === num ? 'bg-cyan-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}
                      >
                          {num}
                      </button>
                  ))}
              </div>
            </div>

            {maxPlayers === 2 && (
                 <div>
                    <label className="block text-center text-slate-300 mb-2">Game Mode:</label>
                    <div className="flex justify-center gap-2">
                        <button onClick={() => setGameMode('CLASSIC')} className={`px-4 py-2 rounded-md font-bold transition-colors flex-1 ${gameMode === 'CLASSIC' ? 'bg-cyan-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>Classic</button>
                        <button onClick={() => setGameMode('TACTICAL')} className={`px-4 py-2 rounded-md font-bold transition-colors flex-1 ${gameMode === 'TACTICAL' ? 'bg-cyan-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>Tactical</button>
                    </div>
                 </div>
            )}
             <p className="text-center text-xs text-slate-400 mt-1 px-2 min-h-[40px] flex items-center justify-center">{getGameModeDescription()}</p>
            
            <div className="space-y-3">
              {activePlayerInputs}
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105 text-lg"
            >
              Start Game
            </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;