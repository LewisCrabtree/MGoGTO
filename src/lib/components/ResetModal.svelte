<script lang="ts">
    let { onconfirm, oncancel }: { onconfirm: () => void, oncancel: () => void } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={oncancel}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <h3>Reset Board?</h3>
        <p>This will clear all shields, pickups/drops, and your current position.</p>
        <div class="modal-actions">
            <button class="secondary" onclick={oncancel}>Cancel</button>
            <button class="contrast" onclick={onconfirm}>Reset</button>
        </div>
    </div>
</div>

<style>
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
</style>
