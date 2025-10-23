<script>
  import { addWhatsAppContact } from '../../stores/database.js';

  /**
   * Props for the modal
   */
  let { isOpen = false, onClose = () => {} } = $props();

  /**
   * Form state
   */
  let name = $state('');
  let phone = $state('');
  let error = $state('');

  /**
   * Handle form submission
   */
  function handleSubmit(event) {
    event.preventDefault();
    error = '';

    // Validate inputs
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    if (!phone.trim()) {
      error = 'Phone number is required';
      return;
    }

    // Basic phone validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.trim())) {
      error = 'Phone must be in E.164 format (e.g., +1234567890)';
      return;
    }

    try {
      addWhatsAppContact(name.trim(), phone.trim());
      
      // Reset form
      name = '';
      phone = '';
      error = '';
      
      // Close modal
      onClose();
    } catch (err) {
      error = err.message || 'Failed to add contact';
    }
  }

  /**
   * Handle modal close
   */
  function handleClose() {
    name = '';
    phone = '';
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

  /**
   * Handle backdrop keyboard events
   */
  function handleBackdropKeydown(event) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add WhatsApp Contact</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <form onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="contact-name">Name</label>
          <input
            id="contact-name"
            type="text"
            bind:value={name}
            placeholder="Enter contact name"
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label for="contact-phone">Phone Number</label>
          <input
            id="contact-phone"
            type="tel"
            bind:value={phone}
            placeholder="+1234567890"
            autocomplete="off"
          />
          <small class="help-text">Use E.164 format: +[country code][number]</small>
        </div>

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <div class="modal-actions">
          <button type="button" class="cancel-button" onclick={handleClose}>
            Cancel
          </button>
          <button type="submit" class="submit-button">
            Add Contact
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
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #444;
  }

  .modal-header h2 {
    margin: 0;
    color: #fff;
    font-size: 20px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-button:hover {
    color: #fff;
  }

  form {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #ccc;
    font-weight: 500;
    font-size: 14px;
  }

  .form-group input {
    width: 100%;
    padding: 12px;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #25D366;
  }

  .help-text {
    display: block;
    margin-top: 6px;
    color: #888;
    font-size: 12px;
  }

  .error-message {
    padding: 12px;
    background-color: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    color: #ff6b6b;
    font-size: 14px;
    margin-bottom: 20px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #444;
  }

  .cancel-button,
  .submit-button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-button {
    background-color: transparent;
    color: #999;
    border: 1px solid #444;
  }

  .cancel-button:hover {
    background-color: #333;
    color: #fff;
  }

  .submit-button {
    background-color: #25D366;
    color: #fff;
  }

  .submit-button:hover {
    background-color: #20BA5A;
  }
</style>

