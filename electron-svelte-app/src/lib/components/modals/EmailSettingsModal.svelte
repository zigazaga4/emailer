<script>
  /**
   * Email Settings Modal Component
   * Allows users to configure email sending settings (SendGrid)
   */

  import { X } from 'lucide-svelte';
  import { toastSuccess } from '../../stores/toastStore.js';

  let { isOpen = false, onClose = () => {} } = $props();

  // Available email addresses (aliases)
  const emailAddresses = [
    { value: 'office@justhemis.com', label: 'Main Office (office@justhemis.com)' },
    { value: 'uk@justhemis.com', label: 'UK Office (uk@justhemis.com)' },
    { value: 'usa@justhemis.com', label: 'USA Office (usa@justhemis.com)' },
    { value: 'canada@justhemis.com', label: 'Canada Office (canada@justhemis.com)' },
    { value: 'australia@justhemis.com', label: 'Australia Office (australia@justhemis.com)' }
  ];

  // Default slogan color (turquoise)
  const DEFAULT_SLOGAN_COLOR = '#40E0D0';

  // Load settings from localStorage or use defaults
  let settings = $state({
    fromAddress: localStorage.getItem('email_from_address') || 'office@justhemis.com',
    sloganColor: localStorage.getItem('email_slogan_color') || DEFAULT_SLOGAN_COLOR
  });

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    localStorage.setItem('email_from_address', settings.fromAddress);
    localStorage.setItem('email_slogan_color', settings.sloganColor);

    toastSuccess('Email settings saved successfully!');
    onClose();
  }

  /**
   * Reset slogan color to default
   */
  function resetSloganColor() {
    settings.sloganColor = DEFAULT_SLOGAN_COLOR;
  }

  /**
   * Handle modal close
   */
  function handleClose() {
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
        <h2 id="modal-title">Email Settings</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <X size={24} />
        </button>
      </div>

      <div class="modal-body">
        <!-- SendGrid Info -->
        <div class="info-note">
          <p><strong>SendGrid Email Service</strong></p>
          <p>Emails are sent via SendGrid API for reliable high-volume delivery.</p>
        </div>

        <!-- From Address Selection -->
        <div class="form-group">
          <label for="from-address">Send From:</label>
          <select id="from-address" bind:value={settings.fromAddress} class="modal-input">
            {#each emailAddresses as addr}
              <option value={addr.value}>{addr.label}</option>
            {/each}
          </select>
          <small>Select which office email to send from</small>
        </div>

        <div class="section-divider"></div>

        <!-- Email Template Branding -->
        <div class="form-section">
          <h3>Email Template Branding</h3>

          <div class="form-group">
            <label for="slogan-color">Slogan Color:</label>
            <div class="color-picker-row">
              <input
                id="slogan-color"
                type="color"
                bind:value={settings.sloganColor}
                class="color-picker"
              />
              <input
                type="text"
                bind:value={settings.sloganColor}
                class="color-hex-input"
                placeholder="#40E0D0"
                maxlength="7"
              />
              <button class="reset-color-btn" onclick={resetSloganColor} title="Reset to default">
                Reset
              </button>
            </div>
            <small>Choose the color for the slogan text in email headers</small>
          </div>

          <!-- Email Header Preview -->
          <div class="preview-section">
            <label>Preview:</label>
            <div class="email-preview">
              <div class="preview-header">
                <div class="preview-logo">
                  <img src="https://justhemis.com/logo.png" alt="Justhemis" width="80" />
                </div>
                <div class="preview-slogan" style="color: {settings.sloganColor};">
                  Your intelligent legal portal<br/>built for modern law
                </div>
              </div>
              <div class="preview-divider"></div>
              <div class="preview-body">
                <p>Your email content will appear here...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Display Names Info -->
        <div class="info-box">
          <strong>Email Display Names</strong>
          <p>Recipients will see a friendly display name:</p>
          <ul>
            <li>office@justhemis.com - "Justhemis Office"</li>
            <li>uk@justhemis.com - "Justhemis UK"</li>
            <li>usa@justhemis.com - "Justhemis USA"</li>
            <li>canada@justhemis.com - "Justhemis Canada"</li>
            <li>australia@justhemis.com - "Justhemis Australia"</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-button" onclick={handleClose}>Cancel</button>
        <button class="save-button" onclick={saveSettings}>Save Settings</button>
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
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
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
    padding: 8px;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
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

  .modal-body {
    padding: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #ccc;
    font-size: 0.9rem;
  }

  .modal-input {
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

  .modal-input:focus {
    border-color: #0066ff;
  }

  .modal-input::placeholder {
    color: #666;
  }

  select.modal-input {
    cursor: pointer;
  }

  select.modal-input option {
    background-color: #1e1e1e;
    color: #fff;
  }

  small {
    display: block;
    margin-top: 4px;
    color: #888;
    font-size: 0.85rem;
  }

  .info-box {
    background-color: #1e1e1e;
    border-left: 4px solid #0066ff;
    padding: 16px;
    margin-top: 20px;
    border-radius: 8px;
  }

  .info-box strong {
    display: block;
    margin-bottom: 8px;
    color: #fff;
    font-weight: 600;
  }

  .info-box p {
    margin: 8px 0;
    color: #ccc;
    font-size: 0.9rem;
  }

  .info-box ul {
    margin: 8px 0;
    padding-left: 20px;
    color: #aaa;
    font-size: 0.85rem;
  }

  .info-box li {
    margin: 4px 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 24px;
    border-top: 1px solid #444;
  }

  .cancel-button,
  .save-button {
    padding: 10px 20px;
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

  .save-button {
    background-color: #0066ff;
    color: white;
  }

  .save-button:hover {
    background-color: #0052cc;
  }

  .cancel-button:active,
  .save-button:active {
    transform: scale(0.98);
  }

  /* Custom scrollbar for modal content */
  .modal-content::-webkit-scrollbar {
    width: 10px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 5px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .info-note {
    background-color: #1e3a1e;
    border-left: 4px solid #4caf50;
    padding: 12px 16px;
    margin-bottom: 20px;
    border-radius: 4px;
  }

  .info-note p {
    margin: 4px 0;
    color: #e0e0e0;
    font-size: 0.9rem;
  }

  .info-note p:first-child {
    font-weight: 600;
    color: #4caf50;
  }

  /* Form Section Styling */
  .form-section {
    margin-bottom: 24px;
  }

  .form-section h3 {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
  }

  .section-divider {
    height: 1px;
    background-color: #444;
    margin: 24px 0;
  }

  /* Color Picker Styling */
  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .color-picker {
    width: 50px;
    height: 40px;
    padding: 0;
    border: 2px solid #444;
    border-radius: 8px;
    cursor: pointer;
    background: transparent;
  }

  .color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  .color-picker::-webkit-color-swatch {
    border-radius: 4px;
    border: none;
  }

  .color-hex-input {
    width: 100px;
    padding: 10px 12px;
    border: 1px solid #444;
    border-radius: 8px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 0.9rem;
    font-family: 'Consolas', 'Monaco', monospace;
    text-transform: uppercase;
  }

  .color-hex-input:focus {
    border-color: #0066ff;
    outline: none;
  }

  .reset-color-btn {
    padding: 10px 16px;
    border: 1px solid #444;
    border-radius: 8px;
    background-color: #333;
    color: #ccc;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-color-btn:hover {
    background-color: #444;
    color: #fff;
    border-color: #555;
  }

  /* Email Preview Styling */
  .preview-section {
    margin-top: 20px;
  }

  .preview-section > label {
    display: block;
    margin-bottom: 12px;
    font-weight: 500;
    color: #ccc;
    font-size: 0.9rem;
  }

  .email-preview {
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background-color: #ffffff;
  }

  .preview-logo {
    flex-shrink: 0;
  }

  .preview-logo img {
    display: block;
  }

  .preview-slogan {
    font-family: 'Great Vibes', cursive;
    font-size: 18px;
    text-align: right;
    line-height: 1.4;
    transition: color 0.2s ease;
  }

  .preview-divider {
    height: 1px;
    background-color: #e0e0e0;
    margin: 0 24px;
  }

  .preview-body {
    padding: 20px 24px;
    color: #333333;
    font-size: 14px;
  }

  .preview-body p {
    margin: 0;
    color: #666;
    font-style: italic;
  }

  /* Load Google Font for preview */
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
</style>
