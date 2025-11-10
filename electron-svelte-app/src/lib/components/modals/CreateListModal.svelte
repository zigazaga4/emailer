<script>
  import { X } from 'lucide-svelte';
  import { createList } from '../../stores/database.js';

  /**
   * Props for the CreateListModal component
   */
  let { isOpen = false, onClose = () => {} } = $props();

  /**
   * Form state
   */
  let listName = $state('');
  let listDescription = $state('');
  let error = $state('');

  /**
   * Handle form submission
   */
  function handleSubmit(event) {
    event.preventDefault();
    error = '';

    // Validate input
    if (!listName.trim()) {
      error = 'List name is required';
      return;
    }

    try {
      // Create the list
      createList(listName.trim(), listDescription.trim());

      // Reset form and close modal
      listName = '';
      listDescription = '';
      onClose();
    } catch (err) {
      console.error('Failed to create list:', err);
      error = err.message || 'Failed to create list. Please try again.';
    }
  }

  /**
   * Handle modal close
   */
  function handleClose() {
    listName = '';
    listDescription = '';
    error = '';
    onClose();
  }

  /**
   * Handle backdrop click
   */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title">Create New List</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <X size={24} />
        </button>
      </div>

      <form onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="list-name">List Name *</label>
          <input
            id="list-name"
            type="text"
            bind:value={listName}
            placeholder="e.g., Customers, Prospects, Team"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="list-description">Description (optional)</label>
          <textarea
            id="list-description"
            bind:value={listDescription}
            placeholder="Brief description of this list"
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <div class="modal-actions">
          <button type="button" class="cancel-button" onclick={handleClose}>
            Cancel
          </button>
          <button type="submit" class="submit-button">
            Create List
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }

  .modal-content {
    background-color: #2a2a2a;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid #444;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
  }

  .close-button {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: #444;
    color: #fff;
  }

  .close-button:active {
    transform: scale(0.95);
  }

  form {
    padding: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #ccc;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #444;
    border-radius: 8px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: #0066ff;
  }

  .form-input::placeholder,
  .form-textarea::placeholder {
    color: #777;
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .error-message {
    padding: 12px;
    background-color: #ff444422;
    border: 1px solid #ff4444;
    border-radius: 8px;
    color: #ff6666;
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .cancel-button,
  .submit-button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-button {
    background-color: #444;
    color: #fff;
  }

  .cancel-button:hover {
    background-color: #555;
  }

  .submit-button {
    background-color: #0066ff;
    color: #fff;
  }

  .submit-button:hover {
    background-color: #0052cc;
  }

  .submit-button:active,
  .cancel-button:active {
    transform: scale(0.98);
  }
</style>