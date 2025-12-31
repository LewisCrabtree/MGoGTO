<script lang="ts">
	import { onMount } from 'svelte';

	// ═══════════════════════════════════════════════════════════════════
	// CONSTANTS
	// ═══════════════════════════════════════════════════════════════════
	const DICE_PROBS: Record<number, number> = {
		2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36,
		7: 6/36, 8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36
	};

	type TileType = 'GO' | 'RAILROAD' | 'CHANCE' | 'CHEST' | 'TAX' | 'UTILITY' | 'JAIL' | 'PARKING' | 'GOTOJAIL' | 'STANDARD';
	
	const BOARD_MAP: TileType[] = Array(40).fill('STANDARD');
	BOARD_MAP[0] = 'GO';
	BOARD_MAP[10] = 'JAIL';
	BOARD_MAP[20] = 'PARKING';
	BOARD_MAP[30] = 'GOTOJAIL';
	
	[5, 15, 25, 35].forEach(i => BOARD_MAP[i] = 'RAILROAD');
	[7, 22, 36].forEach(i => BOARD_MAP[i] = 'CHANCE');
	[2, 17, 33].forEach(i => BOARD_MAP[i] = 'CHEST');
	[4, 38].forEach(i => BOARD_MAP[i] = 'TAX');
	[12, 28].forEach(i => BOARD_MAP[i] = 'UTILITY');
	
	const TILE_ICONS: Record<TileType, string> = {
		GO: '🏁', RAILROAD: '🚂', CHANCE: '❓', CHEST: '📦',
		TAX: '💸', UTILITY: '💡', JAIL: '⚖️', PARKING: '🚗',
		GOTOJAIL: '👮', STANDARD: ''
	};

	// Base weights based on typical event points
	const BASE_WEIGHTS: Record<TileType, number> = {
		RAILROAD: 0, CHANCE: 0, CHEST: 0, TAX: 0,
		UTILITY: 0, JAIL: 0, PARKING: 0, GOTOJAIL: 0, GO: 0, STANDARD: 0
	};

	// ═══════════════════════════════════════════════════════════════════
	// STATE - Real Monopoly Go Event Types
	// ═══════════════════════════════════════════════════════════════════
	let currentPosition = $state(0);
	let tokens = $state(new Set<number>()); // Event pickups
	let specialDrops = $state(new Set<number>()); // Partners/Racers board drops
	let shields = $state(new Set<number>());
	
	let tournamentActive = $state(true); 
	let mainEvent = $state<'NONE' | 'CORNERS' | 'TAX_UTIL' | 'PICKUPS' | 'TRIPLE'>('NONE');
	type SpecialMode = 'NONE' | 'DROPS' | 'GATED';
	let specialMode = $state<SpecialMode>('NONE');
	
	const TOTAL_SHIELDS = 3;
	const TOTAL_PICKUPS = 7;
	const TOTAL_SPECIAL_DROPS = 8;

	// ═══════════════════════════════════════════════════════════════════
	// PERSISTENCE
	// ═══════════════════════════════════════════════════════════════════
	onMount(() => {
		const saved = localStorage.getItem('mgogto_state');
		if (saved) {
			try {
				const data = JSON.parse(saved);
				currentPosition = data.currentPosition ?? 0;
				tokens = new Set(data.tokens ?? []);
				specialDrops = new Set(data.specialDrops ?? []);
				shields = new Set(data.shields ?? []);
				tournamentActive = data.tournamentActive ?? true;
				mainEvent = data.mainEvent ?? 'NONE';
				specialMode = data.specialMode ?? 'NONE';
			} catch (e) {
				console.error('Failed to load state', e);
			}
		}
	});

	$effect(() => {
		const stateToSave = {
			currentPosition,
			tokens: Array.from(tokens),
			specialDrops: Array.from(specialDrops),
			shields: Array.from(shields),
			tournamentActive,
			mainEvent,
			specialMode
		};
		localStorage.setItem('mgogto_state', JSON.stringify(stateToSave));
	});

	// ═══════════════════════════════════════════════════════════════════
	// LAYOUT CONTROLLER
	// ═══════════════════════════════════════════════════════════════════
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let topBarHeight = $state(0);

	let boardSize = $derived.by(() => {
		if (!containerWidth || !containerHeight) return 0;
		
		const availableHeight = containerHeight - topBarHeight - 40; // 40px buffer
		const availableWidth = containerWidth - 40;
		
		// A rotated square of side S has a bounding box of S * sqrt(2)
		const diamondFactor = Math.SQRT2;
		
		// Max side length S such that S * sqrt(2) fits in available space
		const maxSideByHeight = availableHeight / diamondFactor;
		const maxSideByWidth = availableWidth / diamondFactor;
		
		return Math.min(maxSideByHeight, maxSideByWidth, 600); // Cap at 600px
	});

	// ═══════════════════════════════════════════════════════════════════
	// ALGORITHM - Strategy Heatmap
	// ═══════════════════════════════════════════════════════════════════
	let boardValues = $derived.by(() => {
		const values = Array(40).fill(0);
		
		// Tournament: Railroads (Always active in side events)
		if (tournamentActive) {
			[5, 15, 25, 35].forEach(i => values[i] += 120);
		}
		
		// Main Events (Top Bar)
		if (mainEvent === 'CORNERS') {
			[0, 10, 20, 30].forEach(i => values[i] += 100);
		}
		if (mainEvent === 'TAX_UTIL') {
			[4, 38, 12, 28].forEach(i => values[i] += 100);
		}
		if (mainEvent === 'TRIPLE') {
			[7, 22, 36].forEach(i => values[i] += 80); // Chance
			[2, 17, 33].forEach(i => values[i] += 80); // Chest
			[5, 15, 25, 35].forEach(i => values[i] += 80); // Railroad (Double dip!)
		}
		
		// Pickups (Tokens) - Only active during Pickup events
		if (mainEvent === 'PICKUPS') {
			tokens.forEach(i => values[i] += 100);
		}

		// Special Events (3rd layer)
		// - DROPS (Partners/Racers): board-spawn tokens on property tiles
		// - GATED (Peg-E/Dig): usually fueled by milestone rewards; model as extra value on key triggers
		if (specialMode === 'DROPS') {
			specialDrops.forEach(i => values[i] += 80);
		}
		if (specialMode === 'GATED') {
			[5, 15, 25, 35].forEach(i => values[i] += 30);
			[7, 22, 36].forEach(i => values[i] += 20);
		}
		
		// Shields (Dice refund) - Always active
		shields.forEach(i => values[i] += 60);
		
		// Chance "Hidden" Value (Probability of sending to Railroad/Corner)
		// Even if not in a Triple event, Chance is usually good
		[7, 22, 36].forEach(i => values[i] += 20);
		
		return values;
	});

	let strategyMap = $derived.by(() => {
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

	let decisionMap = $derived.by(() => {
		// Simple absolute EV cutoffs (no board-relative ranking).
		// If EV is low (e.g. tournament off), it's fine for nothing to be MID/MAX.
		const EV_MAX = 50;
		const EV_MID = 40;

		return Array.from({ length: 40 }, (_, pos) => {
			const { ev } = strategyMap[pos];
			if (ev >= EV_MAX) return { level: 3, text: 'MAX', color: '#ff4d4d', bg: '#ff4d4d' };
			if (ev >= EV_MID) return { level: 2, text: 'MID', color: '#ffa502', bg: '#ffa502' };
			return { level: 0, text: 'SKIP', color: '#6c757d', bg: '#ced4da' };
		});
	});

	function getDecision(pos: number) {
		return decisionMap[pos];
	}

	let currentDecision = $derived.by(() => getDecision(currentPosition));

	// ═══════════════════════════════════════════════════════════════════
	// UI LOGIC
	// ═══════════════════════════════════════════════════════════════════
	const boardSpaces = Array.from({ length: 40 }, (_, i) => i);
	
	function getGridArea(i: number) {
		if (i <= 10) return `${11 - i} / 1`; // 0: Bottom (11,1), 10: Left (1,1)
		if (i <= 20) return `1 / ${1 + (i - 10)}`; // 20: Top (1,11)
		if (i <= 30) return `${1 + (i - 20)} / 11`; // 30: Right (11,11)
		return `11 / ${11 - (i - 30)}`; // 31-39: Bottom row
	}

	function handleTileClick(i: number) {
		const isMissingShields = shields.size < TOTAL_SHIELDS;
		const isMissingTokens = mainEvent === 'PICKUPS' && tokens.size < TOTAL_PICKUPS;
		const isMissingSpecialDrops = specialMode === 'DROPS' && specialDrops.size < TOTAL_SPECIAL_DROPS;
		const isSetupMode = isMissingShields || isMissingTokens || isMissingSpecialDrops;

		// Placement eligibility for physical objects.
		// Allow on any tile so the tool can match real-world board spawns.
		const isPlaceableTile = true;

		// 1. Setup Mode: Strictly for placing/removing marks. No movement.
		if (isSetupMode) {
			// Allow removing existing marks, but only for active layers.
			// Shields are always meaningful, so let them be removed anytime during setup.
			if (shields.has(i)) {
				shields.delete(i);
				shields = new Set(shields);
				return;
			}
			if (mainEvent === 'PICKUPS' && tokens.has(i)) {
				tokens.delete(i);
				tokens = new Set(tokens);
				return;
			}
			if (specialMode === 'DROPS' && specialDrops.has(i)) {
				specialDrops.delete(i);
				specialDrops = new Set(specialDrops);
				return;
			}

			// Placement follows the event stack priority: Shields → Pickups → Special Drops.
			// Only one physical object can occupy a tile.
			if (!isPlaceableTile) return;

			if (isMissingShields) {
				// If this tile has an inactive-layer marker, don't let it block shield placement.
				// We enforce one-physical-object-per-tile by clearing the inactive marker.
				if (tokens.has(i)) {
					if (mainEvent === 'PICKUPS') return;
					tokens.delete(i);
					tokens = new Set(tokens);
				}
				if (specialDrops.has(i)) {
					if (specialMode === 'DROPS') return;
					specialDrops.delete(i);
					specialDrops = new Set(specialDrops);
				}
				shields.add(i);
				shields = new Set(shields);
				return;
			}

			if (isMissingTokens) {
				if (shields.has(i) || specialDrops.has(i)) return;
				tokens.add(i);
				tokens = new Set(tokens);
				return;
			}

			if (isMissingSpecialDrops) {
				if (shields.has(i) || tokens.has(i)) return;
				specialDrops.add(i);
				specialDrops = new Set(specialDrops);
				return;
			}

			return;
		}

		// 2. Normal Mode: Move the user and consume any existing mark
		currentPosition = i;
		
		const hasActiveToken = tokens.has(i) && mainEvent === 'PICKUPS';
		const hasActiveSpecialDrop = specialDrops.has(i) && specialMode === 'DROPS';
		const hasShield = shields.has(i);

		if (hasActiveToken || hasActiveSpecialDrop || hasShield) {
			if (hasActiveToken) tokens.delete(i);
			if (hasActiveSpecialDrop) specialDrops.delete(i);
			if (hasShield) shields.delete(i);
			tokens = new Set(tokens);
			specialDrops = new Set(specialDrops);
			shields = new Set(shields);
		}
	}

	function getTileClass(i: number) {
		const classes: string[] = [];
		const decision = getDecision(i);
		const type = BOARD_MAP[i];
		
		if (i === currentPosition) classes.push('current');
		if (tokens.has(i) && mainEvent === 'PICKUPS') classes.push('token-tile');
		if (specialDrops.has(i) && specialMode === 'DROPS') classes.push('special-drop-tile');
		if (shields.has(i)) classes.push('shield-tile');
		
		// Event highlights
		if (type === 'RAILROAD' && (tournamentActive || mainEvent === 'TRIPLE')) classes.push('train-tile');
		
		const isEventTile = 
			(mainEvent === 'CORNERS' && ['GO', 'JAIL', 'PARKING', 'GOTOJAIL'].includes(type)) ||
			(mainEvent === 'TAX_UTIL' && ['TAX', 'UTILITY'].includes(type)) ||
			(mainEvent === 'TRIPLE' && ['CHANCE', 'CHEST'].includes(type));
		
		if (isEventTile) classes.push('event-tile');
		
		// Heatmap coloring
		if (decision.level === 3) classes.push('heat-max');
		else if (decision.level === 2) classes.push('heat-mid');
		else if (decision.level === 0) classes.push('heat-skip');
		
		if (boardValues[i] >= 100) classes.push('high-value');
		return classes.join(' ');
	}

	let showResetConfirm = $state(false);

	function resetAll() {
		currentPosition = 0;
		tokens = new Set();
		specialDrops = new Set();
		shields = new Set();
		tournamentActive = true;
		mainEvent = 'NONE';
		specialMode = 'NONE';
		showResetConfirm = false;
	}
</script>

<main class="app-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
	<div class="top-controls" bind:clientHeight={topBarHeight}>
		<div class="event-selector">
			<button class="event-chip {mainEvent === 'NONE' ? 'active' : ''}" onclick={() => mainEvent = 'NONE'}>
				<span class="chip-icon">🚫</span>
				<span class="chip-label">None</span>
			</button>
			<button class="event-chip {mainEvent === 'CORNERS' ? 'active' : ''}" onclick={() => mainEvent = 'CORNERS'}>
				<span class="chip-icon">🚩</span>
				<span class="chip-label">Corners</span>
			</button>
			<button class="event-chip {mainEvent === 'TAX_UTIL' ? 'active' : ''}" onclick={() => mainEvent = 'TAX_UTIL'}>
				<span class="chip-icon">⚖️</span>
				<span class="chip-label">Tax/Util</span>
			</button>
			<button class="event-chip {mainEvent === 'TRIPLE' ? 'active' : ''}" onclick={() => mainEvent = 'TRIPLE'}>
				<span class="chip-icon">🎲</span>
				<span class="chip-label">Triple</span>
			</button>
			<button class="event-chip {mainEvent === 'PICKUPS' ? 'active' : ''}" onclick={() => mainEvent = 'PICKUPS'}>
				<span class="chip-icon">💎</span>
				<span class="chip-label">Pickups</span>
			</button>
		</div>
		<div class="divider"></div>
		<button class="tourney-toggle {tournamentActive ? 'active' : ''}" onclick={() => tournamentActive = !tournamentActive}>
			<span class="chip-icon">🏆</span>
			<span class="chip-label">Tourney</span>
		</button>
		<div class="divider"></div>
		<button
			class="tourney-toggle {specialMode !== 'NONE' ? 'active' : ''}"
			onclick={() => specialMode = (specialMode === 'NONE' ? 'DROPS' : specialMode === 'DROPS' ? 'GATED' : 'NONE')}
			title="Cycles: Off → Drops (Partners/Racers) → Gated (Peg-E/Dig)"
		>
			<span class="chip-icon">{specialMode === 'DROPS' ? '🎁' : specialMode === 'GATED' ? '⛏️' : '🚫'}</span>
			<span class="chip-label">{specialMode === 'DROPS' ? 'Drops' : specialMode === 'GATED' ? 'Gated' : 'Special'}</span>
		</button>
	</div>

	<div class="board-wrapper">
		<button class="clear-btn" onclick={() => showResetConfirm = true} title="Clear Board">reset</button>
		
		{#if showResetConfirm}
			<div class="modal-overlay" onclick={() => showResetConfirm = false}>
				<div class="modal-content" onclick={(e) => e.stopPropagation()}>
					<h3>Reset Board?</h3>
					<p>This will clear all shields, pickups/drops, and your current position.</p>
					<div class="modal-actions">
						<button class="secondary" onclick={() => showResetConfirm = false}>Cancel</button>
						<button class="contrast" onclick={resetAll}>Reset</button>
					</div>
				</div>
			</div>
		{/if}

		<div class="board" style="width: {boardSize}px; height: {boardSize}px; --board-size: {boardSize}px;">
			{#each boardSpaces as i}
				<button 
					class="tile {getTileClass(i)}"
					style="grid-area: {getGridArea(i)}"
					onclick={() => handleTileClick(i)}
					aria-label="Tile {i}"
				>
					{#if i === currentPosition}
						<span class="you">YOU</span>
					{:else if tokens.has(i) && mainEvent === 'PICKUPS'}
						<span class="icon">💎</span>
					{:else if specialDrops.has(i) && specialMode === 'DROPS'}
						<span class="icon">🎁</span>
					{:else if shields.has(i)}
						<span class="icon">🛡️</span>
					{:else if TILE_ICONS[BOARD_MAP[i]]}
						<span class="icon">{TILE_ICONS[BOARD_MAP[i]]}</span>
					{:else}
						<span class="num">{i}</span>
					{/if}
				</button>
			{/each}
			
			<div class="center-panel">
				<div class="center-content">
					{#if shields.size < TOTAL_SHIELDS}
						<div class="setup-hint">
							<span class="hint-icon">🛡️</span>
							<span class="hint-label">PLACE SHIELDS</span>
							<span class="hint-count">{TOTAL_SHIELDS - shields.size} LEFT</span>
						</div>
					{:else if mainEvent === 'PICKUPS' && tokens.size < TOTAL_PICKUPS}
						<div class="setup-hint">
							<span class="hint-icon">💎</span>
							<span class="hint-label">PLACE PICKUPS</span>
							<span class="hint-count">{TOTAL_PICKUPS - tokens.size} LEFT</span>
						</div>
					{:else if specialMode === 'DROPS' && specialDrops.size < TOTAL_SPECIAL_DROPS}
						<div class="setup-hint">
							<span class="hint-icon">🎁</span>
							<span class="hint-label">PLACE DROPS</span>
							<span class="hint-count">{TOTAL_SPECIAL_DROPS - specialDrops.size} LEFT</span>
						</div>
					{:else}
						<div class="live-stats">
							<div class="stat-decision {getDecision(currentPosition).level === 3 ? 'max' : getDecision(currentPosition).level === 2 ? 'mid' : 'skip'}">
								{getDecision(currentPosition).text}
							</div>
							<div class="stat-details">
								<span>EV {strategyMap[currentPosition].ev.toFixed(1)}</span>
								<span>{(strategyMap[currentPosition].hitChance * 100).toFixed(0)}% HIT</span>
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
		background-color: #11191f; /* Match Pico dark theme */
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		padding: 0.5rem;
		box-sizing: border-box;
	}

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

	.modal-overlay {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}
	.modal-content {
		background: #1a262f;
		padding: 1.5rem;
		border-radius: 16px;
		max-width: 300px;
		width: 90%;
		text-align: center;
		border: 1px solid rgba(255,255,255,0.1);
		box-shadow: 0 10px 30px rgba(0,0,0,0.5);
	}
	.modal-content h3 { margin-top: 0; font-size: 1.2rem; }
	.modal-content p { font-size: 0.8rem; opacity: 0.7; margin-bottom: 1.5rem; }
	.modal-actions { display: flex; gap: 0.5rem; }
	.modal-actions button { flex: 1; margin: 0; padding: 0.5rem; font-size: 0.8rem; font-weight: 700; }

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
	.tile > * {
		transform: rotate(45deg); /* Rotate content back to upright */
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
	.tile.current > * {
		transform: rotate(45deg) scale(1.3);
	}
	
	/* Heatmap Colors */
	.tile.heat-max { background: #ff4d4d !important; color: white; }
	.tile.heat-mid { background: #ffa502 !important; color: white; }
	.tile.heat-skip { background: #ced4da !important; color: #444; }
	
	.tile.heat-max .num, .tile.heat-mid .num { color: white; opacity: 0.7; }
	
	.tile.high-value::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: #fff; opacity: 0.5; }

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

	.tile.token-tile { border: 6px solid #ffc107 !important; }
	.tile.shield-tile { border: 6px solid #0dcaf0 !important; }
	.tile.special-drop-tile { border: 6px solid #c77dff !important; }

	.tile.event-tile { border: 6px solid #00d2ff !important; }
	.tile.train-tile { border: 6px solid #ffd700 !important; }
</style>
