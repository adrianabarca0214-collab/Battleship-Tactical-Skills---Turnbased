
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Player } from '../types';
import FullscreenIcon from './icons/FullscreenIcon';

interface GameOverProps {
  game: GameState;
  onExitGame: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ game, onExitGame }) => {
  const winner = game.players.find(p => p.id === game.winner);
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


  const sortedPlayers = game.gameMode === 'SCORE_ATTACK' 
    ? [...game.players].sort((a, b) => b.score - a.score)
    : [];
  
  const getRankColor = (index: number) => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-slate-300';
    if (index === 2) return 'text-orange-400';
    return 'text-slate-500';
  }

  const renderWinMessage = () => {
    if (game.gameMode === 'TACTICAL') {
        return winner ? (
            <h2 className="text-2xl sm:text-4xl text-white mb-8">
                <span className="font-bold text-yellow-400">{winner.name}</span> has destroyed the enemy Mothership!
            </h2>
        ) : (
            <h2 className="text-2xl sm:text-4xl text-white mb-8">The battle ended in a stalemate.</h2>
        )
    }
    return winner ? (
        <h2 className="text-2xl sm:text-4xl text-white mb-8">
            <span className="font-bold text-yellow-400">{winner.name}</span> is the winner!
        </h2>
    ) : (
        <h2 className="text-2xl sm:text-4xl text-white mb-8">The game ended in a draw.</h2>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 text-center fade-in relative">
        <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-3 bg-cyan-800/50 hover:bg-cyan-700/50 rounded-full text-slate-200 transition-colors"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            <FullscreenIcon className="w-6 h-6" isFullscreen={isFullscreen} />
        </button>
      <h1 className="text-5xl sm:text-7xl font-extrabold text-cyan-400 mb-4">
        GAME OVER
      </h1>
      {game.gameMode === 'SCORE_ATTACK' ? (
        <div className="w-full max-w-md bg-slate-800 p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-3xl text-white mb-4 border-b border-slate-600 pb-2">Final Scores</h2>
            <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                    <div key={player.id} className={`flex justify-between items-center p-3 rounded-lg text-xl ${index === 0 ? 'bg-yellow-600/30' : 'bg-slate-700/50'}`}>
                        <span className={`font-bold ${getRankColor(index)}`}>
                           {index + 1}. {player.name}
                        </span>
                        <span className="font-mono text-white">{player.score} pts</span>
                    </div>
                ))}
            </div>
        </div>
      ) : (
          renderWinMessage()
      )}
      <button
        onClick={onExitGame}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-lg text-xl transition-transform transform hover:scale-105"
      >
        Back to Main Menu
      </button>
    </div>
  );
};

export default GameOver;
