import { Grid, CellState, Ship, Player, GameState } from '../types';
import { createEmptyGrid } from "./gameLogic";

// Client-side fallback to generate a random move if the backend function fails.
const getRandomValidMove = (shotsGrid: Grid, gridDimensions: { rows: number, cols: number }): { x: number, y: number } => {
    const emptyCells: { x: number, y: number }[] = [];
    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            if (!shotsGrid[y] || !shotsGrid[y][x] || shotsGrid[y][x] === CellState.EMPTY) {
                emptyCells.push({ x, y });
            }
        }
    }
    if (emptyCells.length === 0) return { x: 0, y: 0 }; // Should not happen in a normal game
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

// Function to get a move by calling our secure Netlify Function.
export const getAIMove = async (shotsGrid: Grid, targetShips: Ship[], gridDimensions: { rows: number, cols: number }): Promise<{ x: number, y: number }> => {
  try {
    const response = await fetch('/.netlify/functions/get-ai-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'classic',
        shotsGrid,
        targetShips,
        gridDimensions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serverless function failed with status: ${response.status}`);
    }
    
    const move = await response.json();
    return move;
  } catch (error) {
    console.error("Error fetching AI move from serverless function:", error);
    // Fallback to a random move in case of network error
    return getRandomValidMove(shotsGrid, gridDimensions);
  }
};

// Function to get a tactical move by calling our secure Netlify Function.
export const getAITacticalMove = async (aiPlayer: Player, opponent: Player, gameState: GameState): Promise<any> => {
  try {
    const response = await fetch('/.netlify/functions/get-ai-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'tactical',
        aiPlayer,
        opponent,
        // Only send necessary parts of gameState to keep payload small
        gameState: {
          turn: gameState.turn,
          gridDimensions: gameState.gridDimensions,
        }
      }),
    });

    if (!response.ok) {
        throw new Error(`Serverless function failed with status: ${response.status}`);
    }

    const move = await response.json();
    return move;
  } catch (error) {
    console.error("Error fetching AI tactical move from serverless function:", error);
    // Fallback to a random attack in case of network error
    const shotsGrid = aiPlayer.shots[opponent.id] || createEmptyGrid(gameState.gridDimensions.rows, gameState.gridDimensions.cols);
    return {
      action: "ATTACK",
      coords: getRandomValidMove(shotsGrid, gameState.gridDimensions),
    };
  }
};
