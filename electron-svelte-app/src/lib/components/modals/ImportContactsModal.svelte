<script>
  import { X } from 'lucide-svelte';
  import { addContact, addContactToList, listsStore } from '../../stores/database.js';

  /**
   * Component props
   * @param {boolean} isOpen - Whether the modal is open
   * @param {Function} onClose - Callback when modal closes
   * @param {number|null} defaultListId - Default list ID to import contacts into
   */
  let { isOpen = false, onClose = () => {}, defaultListId = null } = $props();

  /**
   * Component state
   */
  let file = $state(null);
  let isProcessing = $state(false);
  let importResults = $state(null);
  let error = $state('');
  let selectedListId = $state('none');

  /**
   * Set the selected list ID to the default when modal opens
   */
  $effect(() => {
    if (isOpen) {
      // Use the default list ID if provided, otherwise 'none'
      selectedListId = defaultListId !== null ? String(defaultListId) : 'none';
    }
  });
  
  /**
   * Handle file selection
   * @param {Event} event - File input change event
   */
  function handleFileSelect(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
      file = target.files[0];
      error = '';
      importResults = null;
    }
  }
  
  /**
   * Parse contact data from text content
   * Extracts name from format: "3. Eversheds Sutherland"
   * Extracts email from format: "Email: info@blakemorgan.co.uk"
   * Handles multi-line contact entries with address, phone, etc.
   * @param {string} content - File content
   * @returns {Array} Array of contact objects
   */
  function parseContacts(content) {
    const contacts = [];
    const lines = content.split('\n');

    let currentName = null;
    let currentEmail = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and headers
      if (!line || line.startsWith('=') || line.includes('DIRECTORUL') || line.includes('FIRME DE') || line.includes('AVOCAȚI')) {
        continue;
      }

      // Match name pattern: number followed by dot/punctuation and name
      // Examples: "3. Eversheds Sutherland", "1.Carson McDowell", "2 - Company Name", "3) Name"
      // Permissive: allows various separators and spacing after the number
      const nameMatch = line.match(/^\s*\d+\s*[.\-)\]:\s]+\s*(.+)$/);
      if (nameMatch && nameMatch[1] && !nameMatch[1].includes('@')) {
        // If we have a previous contact, save it
        if (currentName && currentEmail) {
          contacts.push({
            name: currentName,
            email: currentEmail
          });
        }
        // Start new contact
        currentName = nameMatch[1].trim();
        currentEmail = null;
        continue;
      }

      // Match email pattern - with or without "Email:" prefix
      // First try with prefix: "Email: email@domain.com" or "E-mail: email@domain.com"
      // Then try just the email address on its own line
      const emailPrefixMatch = line.match(/^(?:e-?mail|email|e mail)[:\s]+\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i);
      const standaloneEmailMatch = line.match(/^([^\s@]+@[^\s@]+\.[^\s@]+)$/i);

      const extractedEmail = emailPrefixMatch ? emailPrefixMatch[1] : (standaloneEmailMatch ? standaloneEmailMatch[1] : null);

      if (extractedEmail) {
        currentEmail = extractedEmail.trim().toLowerCase();
        // If we have both name and email, we can save immediately
        if (currentName && currentEmail) {
          contacts.push({
            name: currentName,
            email: currentEmail
          });
          currentName = null;
          currentEmail = null;
        }
      }
    }

    // Don't forget the last contact if it exists
    if (currentName && currentEmail) {
      contacts.push({
        name: currentName,
        email: currentEmail
      });
    }

    return contacts;
  }
  
  /**
   * Process and import contacts from file
   */
  async function handleImport() {
    if (!file) {
      error = 'Please select a file first';
      return;
    }
    
    if (!file.name.endsWith('.txt')) {
      error = 'Please select a .txt file';
      return;
    }
    
    isProcessing = true;
    error = '';
    
    try {
      // Read file content
      const content = await file.text();
      
      // Parse contacts
      const contacts = parseContacts(content);
      
      if (contacts.length === 0) {
        error = 'No contacts found in the file. Please check the format.';
        isProcessing = false;
        return;
      }
      
      // Import contacts
      const results = {
        total: contacts.length,
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: []
      };

      for (const contact of contacts) {
        try {
          const newContact = await addContact(contact.name, contact.email);
          results.success++;

          // If a list is selected, add the contact to that list
          if (selectedListId !== 'none' && newContact && newContact.id) {
            addContactToList(parseInt(selectedListId), newContact.id);
          }
        } catch (err) {
          results.failed++;

          // Check if it's a duplicate email error
          const isDuplicate = err.message && err.message.includes('UNIQUE constraint failed');
          if (isDuplicate) {
            results.duplicates++;
          }

          results.errors.push({
            name: contact.name,
            email: contact.email,
            error: isDuplicate ? 'Email already exists in database' : err.message
          });
        }
      }

      importResults = results;
      
    } catch (err) {
      error = `Failed to read file: ${err.message}`;
    } finally {
      isProcessing = false;
    }
  }
  
  /**
   * Close modal and reset state
   */
  function handleClose() {
    file = null;
    error = '';
    importResults = null;
    selectedListId = 'none';
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
   * Handle escape key
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleClose();
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
    aria-labelledby="import-modal-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="import-modal-title">Import Contacts</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <X size={24} />
        </button>
      </div>
      
      <div class="modal-body">
        {#if error}
          <div class="error-message">
            {error}
          </div>
        {/if}
        
        {#if importResults}
          <div class="results-section">
            <h3>Import Results</h3>
            <div class="results-summary">
              <div class="result-item success">
                <span class="result-label">Successfully imported:</span>
                <span class="result-value">{importResults.success}</span>
              </div>
              {#if importResults.duplicates > 0}
                <div class="result-item duplicate">
                  <span class="result-label">Duplicates (skipped):</span>
                  <span class="result-value">{importResults.duplicates}</span>
                </div>
              {/if}
              {#if importResults.failed > importResults.duplicates}
                <div class="result-item failed">
                  <span class="result-label">Failed (other errors):</span>
                  <span class="result-value">{importResults.failed - importResults.duplicates}</span>
                </div>
              {/if}
            </div>
            
            {#if importResults.errors.length > 0}
              <div class="errors-list">
                <h4>Details:</h4>
                {#each importResults.errors as err}
                  <div class="error-item {err.error.includes('already exists') ? 'duplicate' : 'failed'}">
                    <strong>{err.name}</strong> ({err.email}): {err.error}
                  </div>
                {/each}
              </div>
            {/if}
            
            <button class="btn-primary" onclick={handleClose}>
              Done
            </button>
          </div>
        {:else}
          <div class="import-section">
            <div class="list-selection">
              <label for="import-list-select">Add imported contacts to list (Optional)</label>
              <select
                id="import-list-select"
                bind:value={selectedListId}
                disabled={isProcessing}
                class="list-select"
              >
                <option value="none">Don't add to any list</option>
                {#each $listsStore as list (list.id)}
                  <option value={list.id}>{list.name}</option>
                {/each}
              </select>
            </div>

            <div class="format-info">
              <h3>Expected Format</h3>
              <p>Your TXT file should contain contacts in this format:</p>
              <pre class="format-example">1. Company Name
Email: contact@example.com

2. Another Company
Email: info@company.com</pre>
            </div>

            <div class="file-input-section">
              <label for="file-input" class="file-input-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <span class="file-input-text">
                  {#if file}
                    {file.name}
                  {:else}
                    Click to select a TXT file
                  {/if}
                </span>
              </label>
              <input 
                id="file-input"
                type="file" 
                accept=".txt"
                onchange={handleFileSelect}
                style="display: none;"
              />
            </div>
            
            <div class="modal-actions">
              <button 
                class="btn-primary" 
                onclick={handleImport}
                disabled={!file || isProcessing}
              >
                {#if isProcessing}
                  <span class="spinner"></span>
                  Processing...
                {:else}
                  Import Contacts
                {/if}
              </button>
              <button class="btn-secondary" onclick={handleClose} disabled={isProcessing}>
                Cancel
              </button>
            </div>
          </div>
        {/if}
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
    padding: 20px;
    pointer-events: auto;
  }
  
  .modal-content {
    background-color: #2a2a2a;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: #444 !important;
    color: #fff !important;
  }

  .close-button:active {
    transform: scale(0.95);
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

  .list-selection {
    margin-bottom: 24px;
  }

  .list-selection label {
    display: block;
    margin-bottom: 8px;
    color: #ccc;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .list-select {
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

  .list-select:focus {
    border-color: #0066ff;
  }

  .list-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .list-select option {
    background-color: #1e1e1e;
    color: #fff;
  }

  .format-info {
    margin-bottom: 24px;
  }
  
  .format-info h3 {
    color: #fff;
    margin: 0 0 12px 0;
    font-size: 1.1rem;
  }
  
  .format-info p {
    color: #aaa;
    margin: 0 0 12px 0;
  }
  
  .format-example {
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 16px;
    color: #0066ff;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    overflow-x: auto;
    margin: 0;
  }
  
  .file-input-section {
    margin-bottom: 24px;
  }
  
  .file-input-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    border: 2px dashed #444;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    background-color: #1e1e1e;
  }
  
  .file-input-label:hover {
    border-color: #0066ff;
    background-color: #0066ff11;
  }
  
  .file-input-label svg {
    color: #0066ff;
    margin-bottom: 16px;
  }
  
  .file-input-text {
    color: #aaa;
    font-size: 1rem;
    text-align: center;
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  
  .btn-primary {
    padding: 12px 24px !important;
    border-radius: 8px;
    border: none !important;
    background-color: #0066ff !important;
    color: white !important;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex !important;
    align-items: center;
    gap: 8px;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #0052cc !important;
  }
  
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    padding: 12px 24px !important;
    border-radius: 8px;
    border: 1px solid #444 !important;
    background-color: transparent !important;
    color: #aaa !important;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #333 !important;
    color: #fff !important;
    border-color: #555 !important;
  }
  
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .results-section {
    text-align: center;
  }
  
  .results-section h3 {
    color: #fff;
    margin: 0 0 20px 0;
    font-size: 1.3rem;
  }
  
  .results-summary {
    background-color: #1e1e1e;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #333;
  }
  
  .result-item:last-child {
    border-bottom: none;
  }
  
  .result-label {
    color: #aaa;
    font-size: 1rem;
  }
  
  .result-value {
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .result-item.success .result-value {
    color: #00ff88;
  }

  .result-item.duplicate .result-value {
    color: #ffaa00;
  }

  .result-item.failed .result-value {
    color: #ff4444;
  }
  
  .errors-list {
    background-color: #1e1e1e;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    text-align: left;
  }
  
  .errors-list h4 {
    color: #aaa;
    margin: 0 0 12px 0;
    font-size: 1rem;
  }

  .error-item {
    padding: 8px;
    margin-bottom: 8px;
    border-radius: 4px;
    color: #aaa;
    font-size: 0.9rem;
  }

  .error-item.failed {
    background-color: #ff444422;
    border-left: 3px solid #ff4444;
  }

  .error-item.duplicate {
    background-color: #ffaa0022;
    border-left: 3px solid #ffaa00;
  }

  .error-item strong {
    color: #fff;
  }
  
  /* Custom scrollbar */
  .modal-content::-webkit-scrollbar {
    width: 8px;
  }
  
  .modal-content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .modal-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  
  .modal-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>

