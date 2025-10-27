
import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";
import { Grid, CellState, Ship, Player, GameState, ShipType } from '../../types';
import { createEmptyGrid } from '../../services/gameLogic';

// Fallback function to generate a random move if the AI fails.
const getRandomValidMove = (shotsGrid: Grid, gridDimensions: { rows: number, cols: number }): { x: number, y: number } => {
    const emptyCells: { x: number, y: number }[] = [];
    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            if (!shotsGrid || !shotsGrid[y] || shotsGrid[y][x] === CellState.EMPTY) {
                emptyCells.push({ x, y });
            }
        }
    }
    if (emptyCells.length === 0) return { x: 0, y: 0 }; // Should not happen
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

// Server-side logic to get a move for Classic/Score Attack modes.
const fetchClassicAIMove = async (shotsGrid: Grid, targetShips: Ship[], gridDimensions: { rows: number, cols: number }): Promise<{ x: number, y: number }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const gridString = shotsGrid.map(row => 
      row.map(cell => {
          if (cell === CellState.HIT) return 'H';
          if (cell === CellState.SUNK) return 'S';
          if (cell === CellState.MISS) return 'M';
          return '.';
      }).join(' ')
  ).join('\n');

  const unsunkShips = targetShips.filter(ship => !ship.isSunk);
  const unsunkShipsString = unsunkShips.length > 0
      ? unsunkShips.map(ship => `- ${ship.name} (length ${ship.length})`).join('\n')
      : 'All target ships are sunk.';

  const prompt = `
You are a world-champion Battleship AI. Your objective is to win by sinking all enemy ships in the fewest moves possible. You MUST use a sophisticated Hunt/Target strategy.

**GRID ANALYSIS**
You are provided with a ${gridDimensions.rows}x${gridDimensions.cols} grid of your previous shots and a list of enemy ships that are still afloat.
- Grid Legend: '.'=Untargeted, 'M'=Miss, 'H'=Hit, 'S'=Sunk.
- Remaining Enemy Ships:
${unsunkShipsString}
- Current Grid State:
\`\`\`
${gridString}
\`\`\`

**STRATEGIC DIRECTIVES (You MUST follow these rules in order)**
1.  **TARGET MODE (Priority 1)**: If there is at least one 'H', your ONLY valid moves are to fire at the ends of an established line of 'H's, or adjacent to a single 'H'. Your move MUST be adjacent to an 'H'.
2.  **HUNT MODE (Priority 2)**: If there are NO 'H's, you MUST only target cells (x, y) where (x + y) is even (checkerboard pattern) to find a new ship efficiently.

**OUTPUT INSTRUCTION**
Your response MUST be ONLY the coordinate of your next shot in the format "X,Y". The chosen coordinate MUST be a '.' on the grid. Example response: \`4,5\`
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const text = response.text?.trim();
    if (text) {
      const parts = text.split(',');
      if (parts.length === 2) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x < gridDimensions.cols && y >= 0 && y < gridDimensions.rows &&
            (!shotsGrid[y] || shotsGrid[y][x] === CellState.EMPTY)) {
          return { x, y };
        }
      }
    }
  } catch (error) {
    console.error("Gemini API error in serverless function:", error);
  }
  
  // Fallback to random move if Gemini response is invalid or API fails
  return getRandomValidMove(shotsGrid, gridDimensions);
};

// Server-side logic to get a move for Tactical mode.
const fetchTacticalAIMove = async (aiPlayer: Player, opponent: Player, gameState: GameState): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const { gridDimensions } = gameState;
    const shotsGrid = aiPlayer.shots[opponent.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);

    const gridString = shotsGrid.map(row => 
        row.map(cell => {
            if (cell === CellState.HIT) return 'H';
            if (cell === CellState.SUNK) return 'S';
            if (cell === CellState.MISS) return 'M';
            return '.';
        }).join(' ')
    ).join('\n');

    const ownGridString = aiPlayer.grid.map(row => row.map(cell => {
        if (cell === CellState.PERMANENT_DAMAGE) return 'P';
        if (cell === CellState.HIT) return 'H';
        if (cell === CellState.SUNK) return 'S';
        if (cell === CellState.MISS) return 'M';
        if (cell === CellState.SHIP || cell === CellState.DECOY) return 'O';
        return '.';
    }).join(' ')).join('\n');

    const shipOrder: ShipType[] = ['Mothership', 'Radarship', 'Repairship', 'Commandship', 'Decoyship'];
    const shipStatusStrings: string[] = shipOrder.map(shipType => {
        const ship = aiPlayer.ships.find(s => s.type === shipType)!;
        const status = ship.isSunk ? 'SUNK' : (ship.isDamaged ? 'DAMAGED' : 'OPERATIONAL');
        let skillInfo = '';
        switch (shipType) {
            case 'Radarship': skillInfo = `Radar Scan skill. Cooldown: ${aiPlayer.skillCooldowns.Radarship} turns.`; break;
            case 'Repairship': skillInfo = `Repair skill. Uses left: ${aiPlayer.skillUses.Repairship}.`; break;
            case 'Commandship': skillInfo = `Relocate skill. Cooldown: ${aiPlayer.skillCooldowns.Commandship} turns.`; break;
            case 'Decoyship': skillInfo = `Place Decoy skill. Uses left: ${aiPlayer.skillUses.Decoyship}.`; break;
        }
        return `- ${ship.name}: ${status}. ${skillInfo}`;
    });
    const fleetStatusString = shipStatusStrings.join('\n');

    const prompt = `
You are a tactical battleship AI. Your goal is to sink the opponent's Mothership.
Your response must be a single, valid JSON object representing your action.

**Turn ${gameState.turn} Intelligence Report:**
*   **Your Fleet Status:**
${fleetStatusString}
*   **Your Defensive Grid ('O' is your ship, 'P' is permanent damage):**
\`\`\`
${ownGridString}
\`\`\`
*   **Your Offensive Grid (shots fired):**
\`\`\`
${gridString}
\`\`\`

**Action Priority List:**
1.  **Target Mode Attack:** If opponent grid has 'H', you MUST \`ATTACK\` a '.' cell adjacent to an 'H'.
2.  **Mothership Emergency Repair:** If your Mothership is damaged ('H') and Repair skill is available, you MUST \`REPAIR\` a damaged Mothership coordinate.
3.  **Hunt Mode Attack:** If no higher priority action is taken, you MUST \`ATTACK\` a '.' cell. Use a checkerboard pattern (x+y is even).
4.  **Advanced Tactics:** Consider using skills like Radar, Relocate, or Decoy if strategically advantageous.

**JSON Output Format (Select one):**
*   Attack: \`{"action": "ATTACK", "coords": {"x": <col>, "y": <row>}}\`
*   Radar: \`{"action": "SKILL", "shipType": "Radarship", "coords": {"x": <col>, "y": <row>}}\`
*   Repair: \`{"action": "SKILL", "shipType": "Repairship", "coords": {"x": <col>, "y": <row>}}\`
*   Decoy: \`{"action": "SKILL", "shipType": "Decoyship", "coords": {"x": <col>, "y": <row>}, "isHorizontal": <boolean>}\`
*   Relocate: \`{"action": "SKILL", "shipType": "Commandship", "shipToMove": "<ship_name>"}\`

Analyze the situation. Choose the highest-priority valid action. Return only the JSON.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        const sanitizedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const move = JSON.parse(sanitizedText);
        if (move.action && (move.action === "ATTACK" || move.action === "SKILL")) {
            return move;
        }
        throw new Error("Invalid move format from AI");
    } catch(e) {
        console.error("Error getting AI Tactical move from Gemini, falling back to random attack", e);
    }

    return {
        action: "ATTACK",
        coords: getRandomValidMove(shotsGrid, gridDimensions)
    };
};

// The main handler for the Netlify Function.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST' || !event.body) {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    let move;

    if (body.mode === 'tactical') {
      move = await fetchTacticalAIMove(body.aiPlayer, body.opponent, body.gameState);
    } else {
      move = await fetchClassicAIMove(body.shotsGrid, body.targetShips, body.gridDimensions);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move),
    };
  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process AI move.' }),
    };
  }
};
