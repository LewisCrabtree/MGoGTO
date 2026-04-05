<script lang="ts">
    import { BOARD_MAP, TILE_ICONS, CORNER_TILES, TAX_UTIL_TILES, TRIPLE_TILES } from '../constants';
    import type { Decision, MainEvent, SpecialMode } from '../types';

    let { 
        index, 
        currentPosition, 
        tokens, 
        specialDrops, 
        shields, 
        mainEvent, 
        specialMode, 
        tournamentActive,
        decision,
        boardValue,
        onclick
    }: {
        index: number,
        currentPosition: number,
        tokens: Set<number>,
        specialDrops: Set<number>,
        shields: Set<number>,
        mainEvent: MainEvent,
        specialMode: SpecialMode,
        tournamentActive: boolean,
        decision: Decision,
        boardValue: number,
        onclick: (i: number) => void
    } = $props();

    const type = $derived(BOARD_MAP[index]);

    function getGridArea(i: number) {
        if (i <= 10) return `${11 - i} / 1`;
        if (i <= 20) return `1 / ${1 + (i - 10)}`;
        if (i <= 30) return `${1 + (i - 20)} / 11`;
        return `11 / ${11 - (i - 30)}`;
    }

    let classes = $derived.by(() => {
        const list: string[] = [];
        if (index === currentPosition) list.push('current');
        if (tokens.has(index) && mainEvent === 'PICKUPS') list.push('token-tile');
        if (specialDrops.has(index) && specialMode === 'DROPS') list.push('special-drop-tile');
        if (shields.has(index)) list.push('shield-tile');
        
        if (type === 'RAILROAD' && (tournamentActive || mainEvent === 'TRIPLE')) list.push('train-tile');
        
        const isEventTile = 
            (mainEvent === 'CORNERS' && CORNER_TILES.includes(type)) ||
            (mainEvent === 'TAX_UTIL' && TAX_UTIL_TILES.includes(type)) ||
            (mainEvent === 'TRIPLE' && TRIPLE_TILES.includes(type));
        
        if (isEventTile) list.push('event-tile');
        
        if (decision.level === 3) list.push('heat-max');
        else if (decision.level === 2) list.push('heat-mid');
        else if (decision.level === 0) list.push('heat-skip');
        
        if (boardValue >= 100) list.push('high-value');
        return list.join(' ');
    });
</script>

<button 
    class="tile {classes}"
    style="grid-area: {getGridArea(index)}"
    onclick={() => onclick(index)}
    aria-label="Tile {index}"
>
    <div class="content">
        {#if index === currentPosition}
            <span class="you">YOU</span>
        {:else if tokens.has(index) && mainEvent === 'PICKUPS'}
            <span class="icon">💎</span>
        {:else if specialDrops.has(index) && specialMode === 'DROPS'}
            <span class="icon">🎁</span>
        {:else if shields.has(index)}
            <span class="icon">🛡️</span>
        {:else if TILE_ICONS[type]}
            <span class="icon">{TILE_ICONS[type]}</span>
        {:else}
            <span class="num">{index}</span>
        {/if}
    </div>
</button>

<style>
    .tile { 
        position: relative; 
        border: none; 
        background: var(--pico-card-background-color); 
        padding: 0; 
        margin: 0; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer; 
        transition: all 0.1s; 
    }
    .content {
        transform: rotate(45deg);
    }
    .tile .icon { font-size: calc(var(--board-size, 300px) / 25); }
    .tile .num { opacity: 0.4; font-size: calc(var(--board-size, 300px) / 50); font-weight: 700; }
    .tile .you { font-size: calc(var(--board-size, 300px) / 45); font-weight: 900; color: white; z-index: 10; }
    
    .tile.current { 
        background: var(--pico-primary) !important; 
        box-shadow: 0 0 15px var(--pico-primary); 
        z-index: 10; 
        border: 2px solid #fff;
    }
    .tile.current .content {
        transform: rotate(45deg) scale(1.3);
    }
    
    .tile.heat-max { background: #ff4d4d !important; color: white; }
    .tile.heat-mid { background: #ffa502 !important; color: white; }
    .tile.heat-skip { background: #ced4da !important; color: #444; }
    
    .tile.heat-max .num, .tile.heat-mid .num { color: white; opacity: 0.7; }
    
    .tile.high-value::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: #fff; opacity: 0.5; }

    .tile.token-tile { border: 6px solid #ffc107 !important; }
    .tile.shield-tile { border: 6px solid #0dcaf0 !important; }
    .tile.special-drop-tile { border: 6px solid #c77dff !important; }

    .tile.event-tile { border: 6px solid #00d2ff !important; }
    .tile.train-tile { border: 6px solid #ffd700 !important; }
</style>
