<script>
  import { listsStore, addContactToList, removeContactFromList, getListsForContact } from '../../stores/database.js';

  /**
   * Props for the ManageListsModal component
   */
  let { isOpen = false, contact = null, onClose = () => {} } = $props();

  /**
   * Local state for contact's lists
   */
  let contactListIds = $state([]);

  /**
   * Load contact's lists when modal opens or contact changes
   */
  $effect(() => {
    if (isOpen && contact) {
      contactListIds = getListsForContact(contact.id);
    }
  });

  /**
   * Check if contact is in a list
   */
  function isInList(listId) {
    return contactListIds.includes(listId);
  }

  /**
   * Toggle contact membership in a list
   */
  function toggleList(listId) {
    if (!contact) return;

    if (isInList(listId)) {
      removeContactFromList(listId, contact.id);
      contactListIds = contactListIds.filter(id => id !== listId);
    } else {
      addContactToList(listId, contact.id);
      contactListIds = [...contactListIds, listId];
    }
  }

  /**
   * Handle modal close
   */
  function handleClose() {
    contactListIds = [];
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

{#if isOpen && contact}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title">Manage Lists for {contact.name}</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#if $listsStore.length === 0}
          <div class="empty-state">
            <p>No lists available</p>
            <p class="empty-hint">Create a list first to organize your contacts</p>
          </div>
        {:else}
          <div class="lists-container">
            {#each $listsStore as list (list.id)}
              <div class="list-item">
                <label class="list-label">
                  <input
                    type="checkbox"
                    checked={isInList(list.id)}
                    onchange={() => toggleList(list.id)}
                    class="list-checkbox"
                  />
                  <div class="list-info">
                    <div class="list-name">{list.name}</div>
                    {#if list.description}
                      <div class="list-description">{list.description}</div>
                    {/if}
                  </div>
                </label>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button type="button" class="done-button" onclick={handleClose}>
          Done
        </button>
      </div>
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
    max-height: 80vh;
    display: flex;
    flex-direction: column;
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
    flex-shrink: 0;
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
  }

  .close-button:hover {
    background-color: #444;
    color: #fff;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #888;
  }

  .empty-state p {
    margin: 8px 0;
  }

  .empty-hint {
    font-size: 0.85rem;
    color: #666;
  }

  .lists-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .list-item {
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s;
  }

  .list-item:hover {
    background-color: #252525;
    border-color: #555;
  }

  .list-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }

  .list-checkbox {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    cursor: pointer;
    accent-color: #0066ff;
    flex-shrink: 0;
  }

  .list-info {
    flex: 1;
  }

  .list-name {
    font-weight: 500;
    color: #fff;
    margin-bottom: 4px;
  }

  .list-description {
    font-size: 0.85rem;
    color: #888;
    line-height: 1.4;
  }

  .modal-footer {
    padding: 24px;
    border-top: 1px solid #444;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .done-button {
    padding: 12px 32px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    background-color: #0066ff;
    color: #fff;
    transition: all 0.2s;
  }

  .done-button:hover {
    background-color: #0052cc;
  }

  .done-button:active {
    transform: scale(0.98);
  }

  .modal-body::-webkit-scrollbar {
    width: 8px;
  }

  .modal-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .modal-body::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }

  .modal-body::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>

