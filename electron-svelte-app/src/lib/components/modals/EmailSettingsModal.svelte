<script>
  /**
   * Email Settings Modal Component
   * Allows users to configure email provider (Zoho or cPanel)
   */

  import { X } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  // Load settings from localStorage or use defaults
  let settings = $state({
    provider: localStorage.getItem('email_provider') || 'zoho',
    cpanel: {
      host: localStorage.getItem('cpanel_host') || '',
      port: localStorage.getItem('cpanel_port') || '465',
      secure: localStorage.getItem('cpanel_secure') === 'true' || true,
      user: localStorage.getItem('cpanel_user') || '',
      pass: localStorage.getItem('cpanel_pass') || ''
    }
  });

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    localStorage.setItem('email_provider', settings.provider);
    localStorage.setItem('cpanel_host', settings.cpanel.host);
    localStorage.setItem('cpanel_port', settings.cpanel.port);
    localStorage.setItem('cpanel_secure', settings.cpanel.secure.toString());
    localStorage.setItem('cpanel_user', settings.cpanel.user);
    localStorage.setItem('cpanel_pass', settings.cpanel.pass);
    
    alert('Email settings saved successfully!');
    onClose();
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
        <!-- Email Provider Selection -->
        <div class="form-group">
          <label for="email-provider">Email Provider:</label>
          <select id="email-provider" bind:value={settings.provider} class="modal-input">
            <option value="zoho">Zoho Mail (justhemis@justhemis.com)</option>
            <option value="cpanel">cPanel SMTP (Custom)</option>
          </select>
        </div>

        {#if settings.provider === 'cpanel'}
          <div class="cpanel-settings">
            <h3>cPanel SMTP Configuration</h3>
            
            <div class="form-group">
              <label for="cpanel-host">SMTP Host:</label>
              <input
                id="cpanel-host"
                type="text"
                bind:value={settings.cpanel.host}
                placeholder="mail.yourdomain.com"
                class="modal-input"
              />
              <small>Usually mail.yourdomain.com</small>
            </div>

            <div class="form-group">
              <label for="cpanel-port">SMTP Port:</label>
              <select id="cpanel-port" bind:value={settings.cpanel.port} class="modal-input">
                <option value="465">465 (SSL)</option>
                <option value="587">587 (TLS)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="cpanel-secure">
                <input
                  id="cpanel-secure"
                  type="checkbox"
                  bind:checked={settings.cpanel.secure}
                />
                Use SSL/TLS
              </label>
              <small>Enable for ports 465 (SSL) or 587 (TLS)</small>
            </div>

            <div class="form-group">
              <label for="cpanel-user">Email Address:</label>
              <input
                id="cpanel-user"
                type="email"
                bind:value={settings.cpanel.user}
                placeholder="your-email@yourdomain.com"
                class="modal-input"
              />
            </div>

            <div class="form-group">
              <label for="cpanel-pass">Email Password:</label>
              <input
                id="cpanel-pass"
                type="password"
                bind:value={settings.cpanel.pass}
                placeholder="Your email password"
                class="modal-input"
              />
            </div>

            <div class="info-box">
              <strong>How to find your cPanel SMTP settings:</strong>
              <ol>
                <li>Log in to your cPanel account</li>
                <li>Go to "Email Accounts"</li>
                <li>Click "Connect Devices" next to your email</li>
                <li>Look for "Mail Client Manual Settings"</li>
              </ol>
            </div>
          </div>
        {:else}
          <div class="info-box">
            <strong>Zoho Mail Configuration:</strong>
            <p>Using hardcoded Zoho Mail account: <strong>justhemis@justhemis.com</strong></p>
            <p>No additional configuration needed.</p>
          </div>
        {/if}
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

  .cpanel-settings {
    margin-top: 20px;
  }

  .cpanel-settings h3 {
    margin: 0 0 16px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
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

  .info-box ol {
    margin: 8px 0;
    padding-left: 20px;
    color: #ccc;
    font-size: 0.9rem;
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
</style>

