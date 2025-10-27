import { GoogleGenAI, Type } from "@google/genai";
import { Grid, CellState, Ship, Player, GameState, ShipType } from '../types';
// Fix: Import createEmptyGrid from gameLogic to resolve reference error.
import { createEmptyGrid } from "./gameLogic";

// This function assumes the API_KEY is set in the environment variables.
// Do not add any UI for managing the API key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


// Function to get a move from the Gemini API
export const getAIMove = async (shotsGrid: Grid, targetShips: Ship[], gridDimensions: { rows: number, cols: number }): Promise<{ x: number, y: number }> => {
  try {
    const gridString = shotsGrid.map(row => 
        row.map(cell => {
            if (cell === CellState.HIT) return 'H'; // Active hit
            if (cell === CellState.SUNK) return 'S'; // Sunk ship part
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

- **Grid Legend**:
  - \`.\` : Uncharted waters (valid target).
  - \`M\` : A confirmed miss.
  - \`H\` : A hit on an unsunk ship.
  - \`S\` : Part of a ship that has been sunk.

- **Remaining Enemy Ships**:
${unsunkShipsString}

- **Current Grid State**:
\`\`\`
${gridString}
\`\`\`

**STRATEGIC DIRECTIVES (You MUST follow these rules in order)**

1.  **TARGET MODE (Priority 1)**:
    - **Condition**: If there is at least one 'H' on the grid.
    - **Action**: Your goal is to destroy the ship you've found.
    - **Logic**:
        a. **Identify all 'H' cells.**
        b. **Check for lines**: If two or more 'H's are adjacent (e.g., (3,4) and (4,4)), you have determined the ship's orientation (horizontal in this case). Your **ONLY** valid moves are to fire at the ends of this line (e.g., (2,4) or (5,4)), provided they are valid \`.\` cells.
        c. **Single 'H'**: If you have one or more isolated 'H's (not in a line), pick one and fire at one of its valid, adjacent \`.\` cells (up, down, left, or right).
    - **Your move MUST be adjacent to an 'H'.**

2.  **HUNT MODE (Priority 2)**:
    - **Condition**: If there are NO 'H's on the grid.
    - **Action**: Your goal is to find a new ship.
    - **Logic**:
        a. **Parity Search (Checkerboard)**: You MUST only target cells \`(x, y)\` where \`(x + y)\` is even. This maximizes the efficiency of your search pattern. If all such cells are taken, you may target cells where \`(x + y)\` is odd.
        b. **Ship Probability**: Within the valid search cells, prioritize areas where the largest remaining ships can fit. Avoid firing in areas cluttered with 'M's where no large ships could possibly be.
        c. **Avoid Wasted Shots**: Do NOT fire adjacent to known misses ('M') or sunk ships ('S') unless absolutely necessary.

**OUTPUT INSTRUCTION**
Your response MUST be ONLY the coordinate of your next shot in the format "X,Y".
- X is the column index (0 to ${gridDimensions.cols - 1}).
- Y is the row index (0 to ${gridDimensions.rows - 1}).
- The chosen coordinate MUST be a '.' on the grid.

Example response: \`4,5\`

Analyze the grid and remaining ships, apply the strategy, and provide your single best move.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const text = response.text;
    if (!text) {
        console.error("Gemini response was empty. Falling back to a random move.");
        return getRandomValidMove(shotsGrid, gridDimensions);
    }

    const trimmedText = text.trim();
    const parts = trimmedText.split(',');

    if (parts.length === 2) {
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      if (!isNaN(x) && !isNaN(y) && x >= 0 && x < gridDimensions.cols && y >= 0 && y < gridDimensions.rows) {
        // A final check to ensure the AI doesn't pick a spot it already shot at
        if (shotsGrid.length > y && shotsGrid[y].length > x && shotsGrid[y][x] === CellState.EMPTY) {
            return { x, y };
        }
      }
    }
    
    // Fallback to random move if Gemini response is invalid or targets a used cell
    return getRandomValidMove(shotsGrid, gridDimensions);

  } catch (error) {
    console.error("Error fetching AI move from Gemini:", error);
    // Fallback to a random move in case of API error
    return getRandomValidMove(shotsGrid, gridDimensions);
  }
};

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

export const getAITacticalMove = async (aiPlayer: Player, opponent: Player, gameState: GameState): Promise<any> => {
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
    const shipStatusStrings: string[] = [];
    shipOrder.forEach(shipType => {
        const ship = aiPlayer.ships.find(s => s.type === shipType);
        if (!ship) return;
        
        const status = ship.isSunk ? 'SUNK' : (ship.isDamaged ? 'DAMAGED' : 'OPERATIONAL');
        let skillInfo = '';
        switch (shipType) {
            case 'Mothership':
                skillInfo = `Primary objective. If this ship is sunk, you lose.`;
                break;
            case 'Radarship':
                skillInfo = `Radar Scan skill. Cooldown: ${aiPlayer.skillCooldowns.Radarship} turns. (Base is 3T).`;
                break;
            case 'Repairship':
                skillInfo = `Repair skill. Uses left: ${aiPlayer.skillUses.Repairship}. Can't repair permanent damage ('P').`;
                break;
            case 'Commandship':
                skillInfo = `Relocate skill. Cooldown: ${aiPlayer.skillCooldowns.Commandship} turns. Can only move undamaged ships.`;
                break;
            case 'Decoyship':
                skillInfo = `Place Decoy skill. Uses left: ${aiPlayer.skillUses.Decoyship}.`;
                break;
        }
        shipStatusStrings.push(`- ${ship.name}: ${status}. ${skillInfo}`);
    });
    const fleetStatusString = shipStatusStrings.join('\n');

    const availableSkills: string[] = [];
    const radarShip = aiPlayer.ships.find(s => s.type === 'Radarship');
    if (radarShip && !radarShip.isSunk && (aiPlayer.skillCooldowns.Radarship ?? 0) === 0) {
        availableSkills.push('- Radarship: RADAR SCAN (READY)');
    }
    const repairShip = aiPlayer.ships.find(s => s.type === 'Repairship');
    if (repairShip && !repairShip.isSunk && (aiPlayer.skillUses.Repairship ?? 0) > 0) {
        availableSkills.push(`- Repairship: REPAIR (${aiPlayer.skillUses.Repairship} uses left)`);
    }
    const commandShip = aiPlayer.ships.find(s => s.type === 'Commandship');
    if (commandShip && !commandShip.isSunk && (aiPlayer.skillCooldowns.Commandship ?? 0) === 0 && aiPlayer.ships.some(s => !s.isDamaged && s.type !== 'Commandship')) {
        availableSkills.push('- Commandship: RELOCATE (READY)');
    }
    const decoyShip = aiPlayer.ships.find(s => s.type === 'Decoyship');
    if (decoyShip && !decoyShip.isSunk && (aiPlayer.skillUses.Decoyship ?? 0) > 0) {
        availableSkills.push(`- Decoyship: PLACE DECOY (${aiPlayer.skillUses.Decoyship} uses left)`);
    }
    const availableSkillsString = availableSkills.length > 0 ? availableSkills.join('\n') : 'No skills are available this turn.';


    const prompt = `
You are a tactical battleship AI. Your goal is to sink the opponent's Mothership.
Your response must be a single, valid JSON object representing your action, and nothing else.

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
*   **Available Skills This Turn:**
${availableSkillsString}

**Action Priority List (Top is highest priority):**
1.  **Target Mode Attack:** If opponent grid has 'H', you MUST \`ATTACK\` a '.' cell adjacent to an 'H'.
2.  **Mothership Emergency Repair:** If your Mothership is damaged ('H') and Repair skill is available, you MUST \`REPAIR\` a damaged Mothership coordinate. Do not target 'P' cells.
3.  **Radar Search:** If in Hunt Mode (no 'H' on opponent grid) and Radar is available, consider using \`RADAR SCAN\` on a 2x2 area with the most '.' cells.
4.  **Strategic Repair:** If another important ship (like Radarship) is damaged ('H') and Repair is available, consider using \`REPAIR\` on it. Do not target 'P' cells.
5.  **Hunt Mode Attack:** If no higher priority action is taken, you MUST \`ATTACK\` a '.' cell. Use a checkerboard pattern (x+y is even).
6.  **Advanced Tactics (Use if logical):**
    *   **Relocate Ship:** If Commandship is available and an important ship is being targeted, move an **undamaged ship** (not the Commandship itself) to safety.
    *   **Place Decoy:** If Decoy is available and opponent is concentrating fire, place a decoy nearby to misdirect them.

**JSON Output Format (Select one):**
*   **Attack:** \`{"action": "ATTACK", "coords": {"x": <col>, "y": <row>}}\`
*   **Radar:** \`{"action": "SKILL", "shipType": "Radarship", "coords": {"x": <col>, "y": <row>}}\`
*   **Repair:** \`{"action": "SKILL", "shipType": "Repairship", "coords": {"x": <col>, "y": <row>}}\`
*   **Decoy:** \`{"action": "SKILL", "shipType": "Decoyship", "coords": {"x": <col>, "y": <row>}, "isHorizontal": <boolean>}\`
*   **Relocate:** \`{"action": "SKILL", "shipType": "Commandship", "shipToMove": "<ship_name>"}\` (The game will place it automatically). Choose from your undamaged ships.

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
        
        const text = response.text;
        if (!text) throw new Error("Empty response");
        
        // Sanitize the response to remove markdown backticks
        const sanitizedText = text.replace(/```json/g, '').replace(/```/g, '');
        const move = JSON.parse(sanitizedText.trim());

        // Basic validation
        if (move.action && (move.action === "ATTACK" || move.action === "SKILL")) {
            return move;
        }
        throw new Error("Invalid move format");
    } catch(e) {
        console.error("Error getting AI Tactical move, falling back to random attack", e);
        return {
            action: "ATTACK",
            coords: getRandomValidMove(shotsGrid, gridDimensions)
        };
    }
};