


export enum GamePhase {
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  TURN_TRANSITION = 'TURN_TRANSITION',
}

export enum CellState {
  EMPTY = 'EMPTY',
  SHIP = 'SHIP',
  HIT = 'HIT',
  MISS = 'MISS',
  SUNK = 'SUNK',
  DECOY = 'DECOY',
  RADAR_CONTACT = 'RADAR_CONTACT',
  PERMANENT_DAMAGE = 'PERMANENT_DAMAGE',
}

export type ShipType = 'Mothership' | 'Radarship' | 'Repairship' | 'Commandship' | 'Decoyship';

export interface Ship {
  name: string;
  type: ShipType;
  length: number;
  positions: { x: number; y: number }[];
  isSunk: boolean;
  isDamaged: boolean;
}

export type Grid = CellState[][];

export type GameMode = 'CLASSIC' | 'SCORE_ATTACK' | 'TACTICAL';

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  grid: Grid;
  ships: Ship[];
  shots: { [key: string]: Grid }; // Key is opponent player ID, or "BATTLEFIELD"
  isReady: boolean;
  isEliminated: boolean;
  score: number;
  skillCooldowns: { [key in ShipType]?: number };
  skillUses: { [key in ShipType]?: number };
  decoyShip?: Ship;
}

export interface GameLogEntry {
  turn: number;
  playerId: string;
  playerName: string;
  targetId?: string | null;
  targetName?: string;
  coords?: { x: number; y: number };
  result: 'HIT' | 'MISS' | 'SUNK_SHIP' | 'SHOT_FIRED' | 'SKILL_USED';
  sunkShipName?: string;
  hitShipName?: string;
  message?: string;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerId: string | null;
  winner: string | null;
  maxPlayers: number;
  turn: number;
  gridDimensions: { rows: number; cols: number };
  shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged'>[];
  gameMode: GameMode;
  log: GameLogEntry[];
  setupPlayerIndex?: number;
  hasActedThisTurn: boolean;
  // Fields for Score Attack mode
  battlefieldGrid?: Grid;
  battlefieldShips?: Ship[];
  isFinalRound?: boolean;
  // Fields for Tactical Mode
  activeAction?: {
    playerId: string;
    type: 'ATTACK' | 'SKILL';
    shipType: ShipType;
    stage?: 'SELECT_SHIP' | 'PLACE_SHIP' | 'PLACE_DECOY';
    shipToMove?: Ship;
    isHorizontal?: boolean;
  } | null;
  radarScanResult?: {
    playerId: string;
    cells: {x: number, y: number}[];
  } | null;
  hitLog?: { [playerId: string]: { [coord: string]: number } }; // coord: 'x,y', value: turn number
  lastHitTurn?: { [shipName: string]: number };
}

export type PlayerId = string;