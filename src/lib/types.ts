export type TileType = 'GO' | 'RAILROAD' | 'CHANCE' | 'CHEST' | 'TAX' | 'UTILITY' | 'JAIL' | 'PARKING' | 'GOTOJAIL' | 'STANDARD';

export type MainEvent = 'NONE' | 'CORNERS' | 'TAX_UTIL' | 'PICKUPS' | 'TRIPLE';

export type SpecialMode = 'NONE' | 'DROPS' | 'GATED';

export interface Decision {
    level: number;
    text: string;
    color: string;
    bg: string;
}

export interface Strategy {
    ev: number;
    hitChance: number;
}
