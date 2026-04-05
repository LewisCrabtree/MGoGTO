<script lang="ts">
import { createPersistentState } from "$lib/state.svelte";
import { 
DICE_PROBS, 
TOTAL_SHIELDS, 
TOTAL_PICKUPS, 
TOTAL_SPECIAL_DROPS,
EV_MAX,
EV_MID
} from "$lib/constants";
import Controls from "$lib/components/Controls.svelte";
import Tile from "$lib/components/Tile.svelte";
import ResetModal from "$lib/components/ResetModal.svelte";

	// -------------------------------------------------------------------
	// STATE
	// -------------------------------------------------------------------
	const boardState = createPersistentState();
	
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let topBarHeight = $state(0);
	let showResetConfirm = $state(false);

	// -------------------------------------------------------------------
	// DERIVED LOGIC
	// -------------------------------------------------------------------
	const boardSize = $derived.by(() => {
		if (!containerWidth || !containerHeight) return 0;
		const availableHeight = containerHeight - topBarHeight - 40;
		const availableWidth = containerWidth - 40;
		const diamondFactor = Math.SQRT2;
		return Math.min(availableHeight / diamondFactor, availableWidth / diamondFactor, 600);
	});

	const boardValues = $derived.by(() => {
		const values = Array(40).fill(0);
		
		if (boardState.tournamentActive) [5, 15, 25, 35].forEach(i => values[i] += 120);
		
		if (boardState.mainEvent === "CORNERS") [0, 10, 20, 30].forEach(i => values[i] += 100);
		if (boardState.mainEvent === "TAX_UTIL") [4, 38, 12, 28].forEach(i => values[i] += 100);
		if (boardState.mainEvent === "TRIPLE") {
			[7, 22, 36, 2, 17, 33, 5, 15, 25, 35].forEach(i => values[i] += 80);
		}
		
		if (boardState.mainEvent === "PICKUPS") boardState.tokens.forEach((i: number) => values[i] += 100);

		if (boardState.specialMode === "DROPS") boardState.specialDrops.forEach((i: number) => values[i] += 80);
		if (boardState.specialMode === "GATED") {
			[5, 15, 25, 35].forEach(i => values[i] += 30);
			[7, 22, 36].forEach(i => values[i] += 20);
		}
		
		boardState.shields.forEach((i: number) => values[i] += 60);
		[7, 22, 36].forEach(i => values[i] += 20);
		
		return values;
	});

	const strategyMap = $derived.by(() => {
		return Array.from({ length: 40 }, (_, i) => {
			let ev = 0;
			let hitChance = 0;
			for (let r = 2; r <= 12; r++) {
				const val = boardValues[(i + r) % 40];
				ev += DICE_PROBS[r] * val;
				if (val >= 100) hitChance += DICE_PROBS[r];
			}
			return { ev, hitChance };
		});
	});

	const decisionMap = $derived.by(() => {
		return strategyMap.map(({ ev }) => {
			if (ev >= EV_MAX) return { level: 3, text: "MAX", color: "#ff4d4d", bg: "#ff4d4d" };
			if (ev >= EV_MID) return { level: 2, text: "MID", color: "#ffa502", bg: "#ffa502" };
			return { level: 0, text: "SKIP", color: "#6c757d", bg: "#ced4da" };
		});
	});

	const currentDecision = $derived(decisionMap[boardState.currentPosition]);
	const currentStrategy = $derived(strategyMap[boardState.currentPosition]);

	// -------------------------------------------------------------------
	// ACTIONS
	// -------------------------------------------------------------------
	function handleTileClick(i: number) {
		const isMissingShields = boardState.shields.size < TOTAL_SHIELDS;
		const isMissingTokens = boardState.mainEvent === "PICKUPS" && boardState.tokens.size < TOTAL_PICKUPS;
		const isMissingSpecialDrops = boardState.specialMode === "DROPS" && boardState.specialDrops.size < TOTAL_SPECIAL_DROPS;
		const isSetupMode = isMissingShields || isMissingTokens || isMissingSpecialDrops;

		if (isSetupMode) {
			if (boardState.shields.has(i)) { boardState.shields.delete(i); return; }
			if (boardState.mainEvent === "PICKUPS" && boardState.tokens.has(i)) { boardState.tokens.delete(i); return; }
			if (boardState.specialMode === "DROPS" && boardState.specialDrops.has(i)) { boardState.specialDrops.delete(i); return; }

			if (isMissingShields) {
				boardState.tokens.delete(i);
				boardState.specialDrops.delete(i);
				boardState.shields.add(i);
			} else if (isMissingTokens) {
				if (!boardState.shields.has(i) && !boardState.specialDrops.has(i)) boardState.tokens.add(i);
			} else if (isMissingSpecialDrops) {
				if (!boardState.shields.has(i) && !boardState.tokens.has(i)) boardState.specialDrops.add(i);
			}
			return;
		}

		boardState.currentPosition = i;
		if (boardState.mainEvent === "PICKUPS") boardState.tokens.delete(i);
		if (boardState.specialMode === "DROPS") boardState.specialDrops.delete(i);
		boardState.shields.delete(i);
	}
</script>

<main class="app-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
<div bind:clientHeight={topBarHeight}>
<Controls 
bind:mainEvent={boardState.mainEvent} 
bind:tournamentActive={boardState.tournamentActive} 
bind:specialMode={boardState.specialMode} 
/>
</div>

<div class="board-wrapper">
<button class="clear-btn" onclick={() => showResetConfirm = true}>reset</button>

{#if showResetConfirm}
<ResetModal onconfirm={() => { boardState.reset(); showResetConfirm = false; }} oncancel={() => showResetConfirm = false} />
{/if}

<div class="board" style="width: {boardSize}px; height: {boardSize}px; --board-size: {boardSize}px;">
{#each Array(40) as _, i}
<Tile 
index={i}
currentPosition={boardState.currentPosition}
tokens={boardState.tokens}
specialDrops={boardState.specialDrops}
shields={boardState.shields}
mainEvent={boardState.mainEvent}
specialMode={boardState.specialMode}
tournamentActive={boardState.tournamentActive}
decision={decisionMap[i]}
boardValue={boardValues[i]}
onclick={handleTileClick}
/>
{/each}

<div class="center-panel">
<div class="center-content">
					{#if boardState.shields.size < TOTAL_SHIELDS}
						<div class="setup-hint">
							<span class="hint-icon">???</span>
							<span class="hint-label">PLACE SHIELDS</span>
							<span class="hint-count">{TOTAL_SHIELDS - boardState.shields.size} LEFT</span>
						</div>
					{:else if boardState.mainEvent === "PICKUPS" && boardState.tokens.size < TOTAL_PICKUPS}
						<div class="setup-hint">
							<span class="hint-icon">??</span>
							<span class="hint-label">PLACE PICKUPS</span>
							<span class="hint-count">{TOTAL_PICKUPS - boardState.tokens.size} LEFT</span>
						</div>
					{:else if boardState.specialMode === "DROPS" && boardState.specialDrops.size < TOTAL_SPECIAL_DROPS}
						<div class="setup-hint">
							<span class="hint-icon">??</span>
							<span class="hint-label">PLACE DROPS</span>
							<span class="hint-count">{TOTAL_SPECIAL_DROPS - boardState.specialDrops.size} LEFT</span>
						</div>
					{:else}
<div class="live-stats">
<div class="stat-decision {currentDecision.level === 3 ? "max" : currentDecision.level === 2 ? "mid" : "skip"}">
{currentDecision.text}
</div>
<div class="stat-details">
<span>EV {currentStrategy.ev.toFixed(1)}</span>
<span>{(currentStrategy.hitChance * 100).toFixed(0)}% HIT</span>
</div>
</div>
{/if}

<div class="center-legend">
<div class="legend-item"><span class="dot max"></span> MAX</div>
<div class="legend-item"><span class="dot mid"></span> MID</div>
<div class="legend-item"><span class="dot skip"></span> SKIP</div>
</div>
</div>
</div>
</div>
</div>
</main>

<style>
:global(html, body) {
height: 100%;
margin: 0;
padding: 0;
overflow: hidden;
background-color: #11191f;
}

.app-container {
display: flex;
flex-direction: column;
height: 100vh;
padding: 0.5rem;
box-sizing: border-box;
}

.clear-btn { 
position: fixed;
bottom: 1.5rem;
left: 1.5rem;
background: rgba(0,0,0,0.5); 
border: 1px solid rgba(255,255,255,0.2); 
padding: 0.4rem 0.8rem; 
font-size: 0.7rem; 
font-weight: 800;
text-transform: uppercase;
letter-spacing: 1px;
cursor: pointer; 
opacity: 0.6; 
transition: all 0.2s; 
border-radius: 20px;
z-index: 100;
line-height: 1;
box-shadow: 0 4px 12px rgba(0,0,0,0.5);
color: white;
}
.clear-btn:hover { opacity: 1; background: rgba(0,0,0,0.8); transform: translateY(-2px); }

.board-wrapper { 
display: flex; 
justify-content: center; 
align-items: center;
padding: 0; 
overflow: visible;
width: 100%;
flex: 1;
position: relative;
}
.board { 
display: grid; 
grid-template-columns: repeat(11, 1fr); 
grid-template-rows: repeat(11, 1fr); 
gap: 2px; 
background: var(--pico-muted-border-color); 
padding: 3px; 
border-radius: 4px;
transform: rotate(-45deg);
margin: 0 auto;
flex-shrink: 0;
}

.center-panel { 
grid-column: 2 / 11; 
grid-row: 2 / 11; 
display: flex; 
align-items: center; 
justify-content: center; 
background: rgba(255,255,255,0.03); 
border-radius: 8px; 
pointer-events: none;
z-index: 1;
}

.center-content {
transform: rotate(45deg);
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
text-align: center;
pointer-events: auto;
padding: 0.5rem;
}

.setup-hint {
display: flex;
flex-direction: column;
align-items: center;
animation: pulse 2s infinite;
}
.hint-icon { font-size: 2rem; margin-bottom: 0.2rem; }
.hint-label { font-size: 0.7rem; font-weight: 800; color: #fff; letter-spacing: 1px; }
.hint-count { font-size: 0.6rem; opacity: 0.7; font-weight: 600; }

@keyframes pulse {
0% { transform: scale(1); opacity: 1; }
50% { transform: scale(1.05); opacity: 0.8; }
100% { transform: scale(1); opacity: 1; }
}

.live-stats {
display: flex;
flex-direction: column;
align-items: center;
gap: 0.2rem;
}
.stat-decision {
font-size: 2.2rem;
font-weight: 900;
line-height: 1;
text-shadow: 0 0 20px rgba(0,0,0,0.5);
}
.stat-decision.max { color: #ff4d4d; }
.stat-decision.mid { color: #ffcc00; }
.stat-decision.skip { color: #888; }

.stat-details {
display: flex;
gap: 0.8rem;
font-size: 0.7rem;
font-weight: 800;
opacity: 0.8;
background: rgba(0,0,0,0.2);
padding: 0.2rem 0.6rem;
border-radius: 20px;
}

.center-legend { 
display: flex; 
gap: 0.6rem; 
margin-top: 0.5rem; 
padding-top: 0.5rem; 
border-top: 1px solid rgba(255,255,255,0.1);
}
.legend-item {
display: flex;
align-items: center;
gap: 0.3rem;
font-size: 0.55rem;
font-weight: 700;
opacity: 0.6;
}
.dot { width: 6px; height: 6px; border-radius: 50%; }
.dot.max { background: #ff4d4d; box-shadow: 0 0 5px #ff4d4d; }
.dot.mid { background: #ffcc00; box-shadow: 0 0 5px #ffcc00; }
.dot.skip { background: #888; }
</style>

