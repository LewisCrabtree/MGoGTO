<script lang="ts">
    import type { MainEvent, SpecialMode } from '../types';

    let { 
        mainEvent = $bindable(), 
        tournamentActive = $bindable(), 
        specialMode = $bindable() 
    }: { 
        mainEvent: MainEvent, 
        tournamentActive: boolean, 
        specialMode: SpecialMode 
    } = $props();

    const events: { id: MainEvent, icon: string, label: string }[] = [
        { id: 'NONE', icon: '🚫', label: 'None' },
        { id: 'CORNERS', icon: '🚩', label: 'Corners' },
        { id: 'TAX_UTIL', icon: '⚖️', label: 'Tax/Util' },
        { id: 'TRIPLE', icon: '🎲', label: 'Triple' },
        { id: 'PICKUPS', icon: '💎', label: 'Pickups' }
    ];

    function cycleSpecialMode() {
        if (specialMode === 'NONE') specialMode = 'DROPS';
        else if (specialMode === 'DROPS') specialMode = 'GATED';
        else specialMode = 'NONE';
    }
</script>

<div class="top-controls">
    <div class="event-selector">
        {#each events as event}
            <button 
                class="event-chip {mainEvent === event.id ? 'active' : ''}" 
                onclick={() => mainEvent = event.id}
            >
                <span class="chip-icon">{event.icon}</span>
                <span class="chip-label">{event.label}</span>
            </button>
        {/each}
    </div>
    
    <div class="divider"></div>
    
    <button 
        class="tourney-toggle {tournamentActive ? 'active' : ''}" 
        onclick={() => tournamentActive = !tournamentActive}
    >
        <span class="chip-icon">🏆</span>
        <span class="chip-label">Tourney</span>
    </button>
    
    <div class="divider"></div>
    
    <button
        class="tourney-toggle {specialMode !== 'NONE' ? 'active' : ''}"
        onclick={cycleSpecialMode}
        title="Cycles: Off → Drops (Partners/Racers) → Gated (Peg-E/Dig)"
    >
        <span class="chip-icon">
            {specialMode === 'DROPS' ? '🎁' : specialMode === 'GATED' ? '⛏️' : '🚫'}
        </span>
        <span class="chip-label">
            {specialMode === 'DROPS' ? 'Drops' : specialMode === 'GATED' ? 'Gated' : 'Special'}
        </span>
    </button>
</div>

<style>
    .top-controls { 
        display: flex; 
        gap: 0.5rem; 
        margin-bottom: 0.5rem; 
        background: rgba(255,255,255,0.03); 
        padding: 0.3rem; 
        border-radius: 16px; 
        border: 1px solid var(--pico-muted-border-color);
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow-x: auto;
        scrollbar-width: none;
    }
    .top-controls::-webkit-scrollbar { display: none; }

    .event-selector { display: flex; gap: 0.25rem; }
    
    .event-chip, .tourney-toggle {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid transparent;
        padding: 0.2rem 0.4rem;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 50px;
        margin: 0;
    }

    .event-chip .chip-icon, .tourney-toggle .chip-icon { font-size: 1.1rem; line-height: 1; }
    .event-chip .chip-label, .tourney-toggle .chip-label { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; opacity: 0.6; margin-top: 2px; }

    .event-chip.active, .tourney-toggle.active {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
    }
    .event-chip.active .chip-label, .tourney-toggle.active .chip-label { opacity: 1; }

    .event-chip.active { color: #00d2ff; }
    .tourney-toggle.active { color: #ffd700; }

    .divider { width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 0 0.25rem; }
</style>
