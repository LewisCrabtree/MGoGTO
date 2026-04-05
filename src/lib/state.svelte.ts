import { SvelteSet } from 'svelte/reactivity';
import type { MainEvent, SpecialMode } from './types';

export function createPersistentState() {
    let currentPosition = $state(0);
    let tokens = new SvelteSet<number>();
    let specialDrops = new SvelteSet<number>();
    let shields = new SvelteSet<number>();
    let tournamentActive = $state(true);
    let mainEvent = $state<MainEvent>('NONE');
    let specialMode = $state<SpecialMode>('NONE');

    const STORAGE_KEY = 'mgogto_state';

    function load() {
        if (typeof localStorage === 'undefined') return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                currentPosition = data.currentPosition ?? 0;
                if (data.tokens) data.tokens.forEach((i: number) => tokens.add(i));
                if (data.specialDrops) data.specialDrops.forEach((i: number) => specialDrops.add(i));
                if (data.shields) data.shields.forEach((i: number) => shields.add(i));
                tournamentActive = data.tournamentActive ?? true;
                mainEvent = data.mainEvent ?? 'NONE';
                specialMode = data.specialMode ?? 'NONE';
            } catch (e) {
                console.error('Failed to load state', e);
            }
        }
    }

    function save() {
        if (typeof localStorage === 'undefined') return;
        const stateToSave = {
            currentPosition,
            tokens: Array.from(tokens),
            specialDrops: Array.from(specialDrops),
            shields: Array.from(shields),
            tournamentActive,
            mainEvent,
            specialMode
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }

    // Initialize
    load();

    // Auto-save on changes
    $effect.root(() => {
        $effect(() => {
            save();
        });
    });

    return {
        get currentPosition() { return currentPosition; },
        set currentPosition(v) { currentPosition = v; },
        tokens,
        specialDrops,
        shields,
        get tournamentActive() { return tournamentActive; },
        set tournamentActive(v) { tournamentActive = v; },
        get mainEvent() { return mainEvent; },
        set mainEvent(v) { mainEvent = v; },
        get specialMode() { return specialMode; },
        set specialMode(v) { specialMode = v; },
        reset() {
            currentPosition = 0;
            tokens.clear();
            specialDrops.clear();
            shields.clear();
            tournamentActive = true;
            mainEvent = 'NONE';
            specialMode = 'NONE';
        }
    };
}
