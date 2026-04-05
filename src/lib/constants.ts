import type { TileType } from './types';

export const DICE_PROBS: Record<number, number> = {
    2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
    7: 6/36, 8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
};

export const BOARD_MAP: TileType[] = Array(40).fill('STANDARD');
BOARD_MAP[0] = 'GO';
BOARD_MAP[10] = 'JAIL';
BOARD_MAP[20] = 'PARKING';
BOARD_MAP[30] = 'GOTOJAIL';

[5, 15, 25, 35].forEach(i => BOARD_MAP[i] = 'RAILROAD');
[7, 22, 36].forEach(i => BOARD_MAP[i] = 'CHANCE');
[2, 17, 33].forEach(i => BOARD_MAP[i] = 'CHEST');
[4, 38].forEach(i => BOARD_MAP[i] = 'TAX');
[12, 28].forEach(i => BOARD_MAP[i] = 'UTILITY');

export const TILE_ICONS: Record<TileType, string> = {
    GO: '🏁', RAILROAD: '🚂', CHANCE: '❓', CHEST: '📦',
    TAX: '💸', UTILITY: '💡', JAIL: '⚖️', PARKING: '🚗',
    GOTOJAIL: '👮', STANDARD: ''
};

export const TOTAL_SHIELDS = 3;
export const TOTAL_PICKUPS = 7;
export const TOTAL_SPECIAL_DROPS = 8;

export const CORNER_TILES: TileType[] = ['GO', 'JAIL', 'PARKING', 'GOTOJAIL'];
export const TAX_UTIL_TILES: TileType[] = ['TAX', 'UTILITY'];
export const TRIPLE_TILES: TileType[] = ['CHANCE', 'CHEST'];

export const EV_MAX = 50;
export const EV_MID = 40;
