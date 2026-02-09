<script>
  /**
   * Toast Container Component
   * Displays toast notifications in the bottom-right corner
   * Replaces blocking alert() calls which cause focus issues on Windows
   */

  import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-svelte';
  import { toastStore, dismissToast } from '../../stores/toastStore.js';

  /**
   * Get icon component based on toast type
   */
  function getIcon(type) {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
      default:
        return Info;
    }
  }
</script>

<div class="toast-container">
  {#each $toastStore as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      <div class="toast-icon">
        <svelte:component this={getIcon(toast.type)} size={20} />
      </div>
      <div class="toast-message">{toast.message}</div>
      <button
        class="toast-close"
        onclick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 50000;
    pointer-events: none;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 10px;
    background-color: #2a2a2a;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
    pointer-events: auto;
    animation: slideIn 0.25s ease-out;
    border: 1px solid #3a3a3a;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }

  .toast-success .toast-icon {
    color: #4ade80;
  }

  .toast-error .toast-icon {
    color: #f87171;
  }

  .toast-warning .toast-icon {
    color: #fbbf24;
  }

  .toast-info .toast-icon {
    color: #60a5fa;
  }

  .toast-message {
    flex: 1;
    color: #fff;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  }

  .toast-close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: #888;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
    margin: -4px -4px -4px 0;
  }

  .toast-close:hover {
    background-color: #3a3a3a;
    color: #fff;
  }

  /* Toast type specific border accents */
  .toast-success {
    border-left: 3px solid #4ade80;
  }

  .toast-error {
    border-left: 3px solid #f87171;
  }

  .toast-warning {
    border-left: 3px solid #fbbf24;
  }

  .toast-info {
    border-left: 3px solid #60a5fa;
  }
</style>
