<script>
  import { addContact, addContactToList, listsStore } from '../../stores/database.js';

  /**
   * Props for the AddContactModal component
   */
  let { isOpen = false, onClose = () => {} } = $props();

  /**
   * Form state
   */
  let name = $state('');
  let email = $state('');
  let selectedListId = $state('none');
  let error = $state('');
  let isSubmitting = $state(false);
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Handle form submission
   * Validates input and adds contact to database
   */
  async function handleSubmit() {
    error = '';

    // Validate name
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    // Validate email
    if (!email.trim()) {
      error = 'Email is required';
      return;
    }

    if (!isValidEmail(email.trim())) {
      error = 'Please enter a valid email address';
      return;
    }

    isSubmitting = true;

    try {
      // Add contact to database
      const newContact = addContact(name.trim(), email.trim());

      // Add to selected list if one was chosen
      if (selectedListId !== 'none' && newContact && newContact.id) {
        addContactToList(parseInt(selectedListId), newContact.id);
      }

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        error = 'A contact with this email already exists';
      } else {
        error = 'Failed to add contact. Please try again.';
      }
      console.error('Error adding contact:', err);
    } finally {
      isSubmitting = false;
    }
  }
  
  /**
   * Reset form fields
   */
  function resetForm() {
    name = '';
    email = '';
    selectedListId = 'none';
    error = '';
    isSubmitting = false;
  }
  
  /**
   * Handle modal close
   */
  function handleClose() {
    resetForm();
    onClose();
  }
  
  /**
   * Handle backdrop click
   * @param {Event} event - Click event
   */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
  
  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleClose();
    } else if (event.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add New Contact</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {#if error}
          <div class="error-message">
            {error}
          </div>
        {/if}
        
        <div class="form-group">
          <label for="contact-name">Name</label>
          <input
            id="contact-name"
            type="text"
            bind:value={name}
            placeholder="Enter contact name"
            disabled={isSubmitting}
          />
        </div>
        
        <div class="form-group">
          <label for="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            bind:value={email}
            placeholder="Enter email address"
            disabled={isSubmitting}
          />
        </div>

        <div class="form-group">
          <label for="contact-list">Add to List (Optional)</label>
          <select
            id="contact-list"
            bind:value={selectedListId}
            disabled={isSubmitting}
            class="form-select"
          >
            <option value="none">Don't add to any list</option>
            {#each $listsStore as list (list.id)}
              <option value={list.id}>{list.name}</option>
            {/each}
          </select>
        </div>

        <div class="modal-footer">
          <button 
            type="button" 
            class="button button-secondary" 
            onclick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="button button-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Contact'}
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
    animation: fadeIn 0.2s ease-out;
    pointer-events: auto;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .modal-content {
    background-color: #2a2a2a;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease-out;
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
  
  .modal-header {
    padding: 24px;
    border-bottom: 1px solid #444;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
  }
  
  .close-button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none !important;
    background-color: transparent !important;
    color: #888;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0 !important;
  }

  .close-button svg {
    display: block !important;
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: #444 !important;
    color: #fff !important;
  }
  
  .modal-body {
    padding: 24px;
  }
  
  .error-message {
    padding: 12px;
    margin-bottom: 20px;
    background-color: #ff444422;
    border: 1px solid #ff4444;
    border-radius: 8px;
    color: #ff6666;
    font-size: 0.9rem;
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
  
  .form-group input {
    width: 100%;
    padding: 12px;
    border: 1px solid #444;
    border-radius: 8px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  
  .form-group input:focus {
    border-color: #0066ff;
  }
  
  .form-group input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .form-group input::placeholder {
    color: #666;
  }

  .form-select {
    width: 100%;
    padding: 12px;
    border: 1px solid #444;
    border-radius: 8px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
    cursor: pointer;
  }

  .form-select:focus {
    border-color: #0066ff;
  }

  .form-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .form-select option {
    background-color: #1e1e1e;
    color: #fff;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }
  
  .button {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .button-secondary {
    background-color: #444;
    color: #fff;
  }
  
  .button-secondary:hover:not(:disabled) {
    background-color: #555;
  }
  
  .button-primary {
    background-color: #0066ff;
    color: white;
  }
  
  .button-primary:hover:not(:disabled) {
    background-color: #0052cc;
  }
  
  .button:active:not(:disabled) {
    transform: scale(0.98);
  }
</style>

