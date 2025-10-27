
import { Ship } from './types';

export const SHIPS_CONFIG_DEFAULT: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'type' | 'hasBeenRepaired'>[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

export const SHIPS_CONFIG_LARGE: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'type' | 'hasBeenRepaired'>[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
  { name: 'Frigate', length: 3 },
  { name: 'Corvette', length: 2 },
  { name: 'Patrol Boat A', length: 2 },
  { name: 'Patrol Boat B', length: 2 },
  { name: 'Patrol Boat C', length: 2 },
];

export const SHIPS_CONFIG_TACTICAL: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired'>[] = [
    { name: 'Commandship', type: 'Commandship', length: 5 },
    { name: 'Decoyship', type: 'Decoyship', length: 4 },
    { name: 'Radarship', type: 'Radarship', length: 3 },
    { name: 'Repairship', type: 'Repairship', length: 3 },
    { name: 'Jamship', type: 'Jamship', length: 3 },
    { name: 'Mothership', type: 'Mothership', length: 2 },
];

export const getGameConfig = (playerCount: number, mode: 'CLASSIC' | 'SCORE_ATTACK' | 'TACTICAL') => {
    if (mode === 'TACTICAL') {
        return {
            gridDimensions: { rows: 12, cols: 12 },
            shipsConfig: SHIPS_CONFIG_TACTICAL,
        };
    }

    if (playerCount <= 2) {
        return {
            gridDimensions: { rows: 12, cols: 12 },
            shipsConfig: SHIPS_CONFIG_DEFAULT.map(s => ({...s, type: s.name as any})), // Inelegant but works for classic
        };
    }
    return {
        gridDimensions: { rows: 12, cols: 15 },
        shipsConfig: SHIPS_CONFIG_LARGE.map(s => ({...s, type: s.name as any})),
    };
};
