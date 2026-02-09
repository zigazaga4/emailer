<script>
  /**
   * Dialog Container Component
   * Renders non-blocking confirmation, prompt, and alert dialogs
   * Replaces blocking browser dialogs which cause UI issues on Windows
   */

  import { X } from 'lucide-svelte';
  import * as dialogStore from '../../stores/dialogStore.js';

  /**
   * Dialog state from store
   */
  let dialog = $state({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    placeholder: '',
    inputValue: '',
    dangerous: false
  });

  /**
   * Input element reference for auto-focus
   */
  let inputRef = $state(null);

  /**
   * Subscribe to dialog store
   */
  $effect(() => {
    const unsubscribe = dialogStore.subscribe(state => {
      dialog = state;
    });
    return unsubscribe;
  });

  /**
   * Auto-focus input when prompt dialog opens
   */
  $effect(() => {
    if (dialog.isOpen && dialog.type === 'prompt' && inputRef) {
      setTimeout(() => {
        inputRef?.focus();
        inputRef?.select();
      }, 50);
    }
  });

  /**
   * Handle confirm action
   */
  function handleConfirm() {
    if (dialog.type === 'prompt') {
      dialogStore.closeDialog(dialog.inputValue);
    } else if (dialog.type === 'alert') {
      dialogStore.closeDialog();
    } else {
      dialogStore.closeDialog(true);
    }
  }

  /**
   * Handle cancel action
   */
  function handleCancel() {
    if (dialog.type === 'prompt') {
      dialogStore.closeDialog(null);
    } else {
      dialogStore.closeDialog(false);
    }
  }

  /**
   * Handle backdrop click
   */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && dialog.type !== 'prompt') {
      handleConfirm();
    }
  }

  /**
   * Handle input keydown for prompt
   */
  function handleInputKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }
</script>

{#if dialog.isOpen}
  <div
    class="dialog-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    tabindex="-1"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <h3 id="dialog-title">{dialog.title}</h3>
        {#if dialog.type !== 'alert'}
          <button class="close-button" onclick={handleCancel} aria-label="Close">
            <X size={20} />
          </button>
        {/if}
      </div>

      <div class="dialog-body">
        <p class="dialog-message">{dialog.message}</p>

        {#if dialog.type === 'prompt'}
          <input
            bind:this={inputRef}
            type="text"
            class="dialog-input"
            placeholder={dialog.placeholder}
            bind:value={dialog.inputValue}
            oninput={(e) => dialogStore.updateInputValue(e.target.value)}
            onkeydown={handleInputKeydown}
          />
        {/if}
      </div>

      <div class="dialog-footer">
        {#if dialog.type !== 'alert'}
          <button class="btn-cancel" onclick={handleCancel}>
            {dialog.cancelText}
          </button>
        {/if}
        <button
          class="btn-confirm"
          class:dangerous={dialog.dangerous}
          onclick={handleConfirm}
        >
          {dialog.confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: fadeIn 0.15s ease-out;
    pointer-events: auto;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dialog-content {
    background-color: #2a2a2a;
    border-radius: 12px;
    width: 90%;
    max-width: 450px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    animation: slideUp 0.2s ease-out;
    overflow: hidden;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    padding: 20px 24px 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .close-button {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background-color: transparent;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: #444;
    color: #fff;
  }

  .dialog-body {
    padding: 20px 24px;
  }

  .dialog-message {
    margin: 0;
    color: #ccc;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .dialog-input {
    width: 100%;
    margin-top: 16px;
    padding: 12px;
    border: 1px solid #444;
    border-radius: 8px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .dialog-input:focus {
    border-color: #0066ff;
  }

  .dialog-input::placeholder {
    color: #666;
  }

  .dialog-footer {
    padding: 16px 24px 24px 24px;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel,
  .btn-confirm {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background-color: #444;
    color: #fff;
  }

  .btn-cancel:hover {
    background-color: #555;
  }

  .btn-confirm {
    background-color: #0066ff;
    color: white;
  }

  .btn-confirm:hover {
    background-color: #0052cc;
  }

  .btn-confirm.dangerous {
    background-color: #dc2626;
  }

  .btn-confirm.dangerous:hover {
    background-color: #b91c1c;
  }

  .btn-cancel:active,
  .btn-confirm:active {
    transform: scale(0.98);
  }
</style>
