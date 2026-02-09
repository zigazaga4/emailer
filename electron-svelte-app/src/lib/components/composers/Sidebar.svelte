<script>
  import {
    contactsStore,
    listsStore,
    listMembershipsVersion,
    deleteContact,
    deleteList,
    getContactsInList,
    whatsappContactsStore,
    whatsappListsStore,
    whatsappListMembershipsVersion,
    deleteWhatsAppContact,
    deleteWhatsAppList,
    getWhatsAppContactsInList
  } from '../../stores/database.js';
  import { emailSendingProgress } from '../../stores/emailSendingStore.js';
  import { confirm as confirmDialog } from '../../stores/dialogStore.js';

  /**
   * Props for the Sidebar component
   */
  let {
    activeTab = 'email',
    currentEmailTabId = null,
    selectedListId = $bindable(null),
    onAddContact = () => {},
    onImportContacts = () => {},
    onDeleteAll = () => {},
    onSelectContact = () => {},
    onCreateList = () => {},
    onManageLists = () => {},
    onSelectedListChange = () => {}
  } = $props();

  /**
   * Local state for search query
   */
  let searchQuery = $state('');

  /**
   * Selected contact ID
   */
  let selectedContactId = $state(null);

  /**
   * Get contact count for a list (reactive)
   * This accesses the listMembershipsVersion store to trigger reactivity
   */
  function getListContactCount(listId) {
    if (activeTab === 'messages') {
      $whatsappListMembershipsVersion;
      return getWhatsAppContactsInList(listId).length;
    } else {
      $listMembershipsVersion;
      return getContactsInList(listId).length;
    }
  }

  /**
   * Get the sending state for a contact
   * @param {number} contactId - Contact ID
   * @returns {string} 'waiting' | 'sending' | 'completed' | 'failed' | 'none'
   */
  function getContactSendingState(contactId) {
    const state = $emailSendingProgress;

    // For email tab, get the progress for the current tab
    if (activeTab === 'email' && currentEmailTabId) {
      const tabProgress = state.sendingTabs[currentEmailTabId];

      // Only show states if this tab is sending and the target list matches
      if (!tabProgress || !tabProgress.isSending || tabProgress.targetListId !== selectedListId) {
        return 'none';
      }

      // Check completed/failed first (these take priority over current)
      if (tabProgress.completedContactIds.has(contactId)) {
        return 'completed';
      }

      if (tabProgress.failedContactIds.has(contactId)) {
        return 'failed';
      }

      // Then check if it's the current contact being sent
      if (tabProgress.currentContactId === contactId) {
        return 'sending';
      }

      // Otherwise it's waiting
      return 'waiting';
    }

    return 'none';
  }

  /**
   * Check if a contact is being rate-limit retried
   * @param {number} contactId - Contact ID
   * @returns {boolean} True if this contact is currently being retried due to rate limit
   */
  function isRateLimitRetrying(contactId) {
    const state = $emailSendingProgress;

    if (activeTab === 'email' && currentEmailTabId) {
      const tabProgress = state.sendingTabs[currentEmailTabId];
      if (!tabProgress) return false;

      // Rate limit retry shows timer on the CURRENT contact being sent
      return tabProgress.isRateLimitRetrying &&
             tabProgress.currentContactId === contactId &&
             tabProgress.delayEndTime !== null;
    }

    return false;
  }

  /**
   * Check if a contact is the next one to be sent
   * @param {number} contactId - Contact ID
   * @returns {boolean} True if this is the next contact in queue
   */
  function isNextInQueue(contactId) {
    const state = $emailSendingProgress;
    const contactState = getContactSendingState(contactId);

    if (contactState !== 'waiting') {
      return false;
    }

    // For email tab, get the progress for the current tab
    if (activeTab === 'email' && currentEmailTabId) {
      const tabProgress = state.sendingTabs[currentEmailTabId];
      if (!tabProgress) return false;

      // Don't show "next in queue" timer if we're rate limit retrying (timer shows on current contact)
      if (tabProgress.isRateLimitRetrying) {
        return false;
      }

      // Get all contacts in the current list
      const contacts = tabProgress.targetListId !== null
        ? getContactsInList(tabProgress.targetListId)
        : $contactsStore;

      // Find the first contact that is still waiting
      for (const c of contacts) {
        const cState = getContactSendingState(c.id);
        if (cState === 'waiting') {
          return c.id === contactId;
        }
      }
    }

    return false;
  }

  /**
   * Get remaining seconds for the countdown
   * @returns {number} Remaining seconds, or 0 if no delay
   */
  function getRemainingSeconds() {
    const state = $emailSendingProgress;

    // For email tab, get the progress for the current tab
    if (activeTab === 'email' && currentEmailTabId) {
      const tabProgress = state.sendingTabs[currentEmailTabId];
      if (!tabProgress || !tabProgress.delayEndTime) {
        return 0;
      }

      const remaining = Math.max(0, Math.ceil((tabProgress.delayEndTime - Date.now()) / 1000));
      return remaining;
    }

    return 0;
  }

  /**
   * Reactive countdown that updates every second
   */
  let countdown = $state(0);

  $effect(() => {
    const state = $emailSendingProgress;

    // For email tab, get the progress for the current tab
    if (activeTab === 'email' && currentEmailTabId) {
      const tabProgress = state.sendingTabs[currentEmailTabId];

      if (tabProgress && tabProgress.delayEndTime) {
        // Update countdown immediately
        countdown = getRemainingSeconds();

        // Set up interval to update every second
        const interval = setInterval(() => {
          countdown = getRemainingSeconds();

          // Clear interval when countdown reaches 0
          if (countdown === 0) {
            clearInterval(interval);
          }
        }, 1000);

        // Cleanup interval on effect cleanup
        return () => clearInterval(interval);
      } else {
        countdown = 0;
      }
    } else {
      countdown = 0;
    }
  });



  /**
   * Get filtered contacts based on search query and selected list
   */
  function getFilteredContacts() {
    let contacts = activeTab === 'messages' ? $whatsappContactsStore : $contactsStore;

    // Filter by selected list
    if (selectedListId !== null) {
      contacts = activeTab === 'messages'
        ? getWhatsAppContactsInList(selectedListId)
        : getContactsInList(selectedListId);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      contacts = contacts.filter(contact => {
        const nameMatch = contact.name.toLowerCase().includes(query);
        if (activeTab === 'messages') {
          return nameMatch || contact.phone.toLowerCase().includes(query);
        } else {
          return nameMatch || contact.email.toLowerCase().includes(query);
        }
      });
    }

    return contacts;
  }

  /**
   * Handle list selection
   */
  function handleSelectList(listId) {
    selectedListId = listId;
    selectedContactId = null;
    onSelectContact(null);
    onSelectedListChange(listId);
  }
  
  /**
   * Handle contact selection
   * @param {Object} contact - The selected contact
   */
  function handleSelectContact(contact) {
    selectedContactId = contact.id;
    onSelectContact(contact);
  }
  
  /**
   * Handle list deletion
   * @param {Event} event - Click event
   * @param {number} listId - ID of list to delete
   */
  async function handleDeleteList(event, listId) {
    event.stopPropagation();

    const confirmed = await confirmDialog(
      'Are you sure you want to delete this list? Contacts in the list will not be deleted.',
      { title: 'Delete List', confirmText: 'Delete', dangerous: true }
    );
    if (confirmed) {
      if (activeTab === 'messages') {
        deleteWhatsAppList(listId);
      } else {
        deleteList(listId);
      }

      // If the deleted list was selected, switch to All Contacts
      if (selectedListId === listId) {
        selectedListId = null;
        onSelectedListChange(null);
      }
    }
  }

  /**
   * Handle contact deletion
   * @param {Event} event - Click event
   * @param {number} contactId - ID of contact to delete
   */
  async function handleDeleteContact(event, contactId) {
    event.stopPropagation();

    const confirmed = await confirmDialog(
      'Are you sure you want to delete this contact?',
      { title: 'Delete Contact', confirmText: 'Delete', dangerous: true }
    );
    if (confirmed) {
      if (activeTab === 'messages') {
        deleteWhatsAppContact(contactId);
      } else {
        deleteContact(contactId);
      }

      if (selectedContactId === contactId) {
        selectedContactId = null;
        onSelectContact(null);
      }
    }
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>Contacts</h2>
    <div class="header-actions">
      <button class="delete-all-button" onclick={() => onDeleteAll()} title="Delete all contacts" aria-label="Delete all contacts">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
      <button class="import-button" onclick={() => onImportContacts()} title="Import contacts from file" aria-label="Import contacts">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>
      <button class="add-button" onclick={() => onAddContact()} title="Add new contact" aria-label="Add new contact">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  </div>

  <!-- Lists Section -->
  <div class="lists-section">
    <div class="lists-header">
      <h3>Lists</h3>
      <button class="create-list-button" onclick={() => onCreateList()} title="Create new list" aria-label="Create new list">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
    <div class="lists-container">
      <div
        class="list-item {selectedListId === null ? 'selected' : ''}"
        onclick={() => handleSelectList(null)}
        onkeydown={(e) => e.key === 'Enter' && handleSelectList(null)}
        role="button"
        tabindex="0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span>All Contacts</span>
        <span class="list-count">{activeTab === 'messages' ? $whatsappContactsStore.length : $contactsStore.length}</span>
      </div>
      {#each (activeTab === 'messages' ? $whatsappListsStore : $listsStore) as list (list.id)}
        <div
          class="list-item {selectedListId === list.id ? 'selected' : ''}"
          onclick={() => handleSelectList(list.id)}
          onkeydown={(e) => e.key === 'Enter' && handleSelectList(list.id)}
          role="button"
          tabindex="0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>{list.name}</span>
          <span class="list-count">{getListContactCount(list.id)}</span>
          <button
            class="list-delete-button"
            onclick={(e) => handleDeleteList(e, list.id)}
            title="Delete list"
            aria-label="Delete list"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      {/each}
    </div>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="Search contacts..."
      bind:value={searchQuery}
      class="search-input"
    />
  </div>
  
  <div class="contacts-list">
    {#each getFilteredContacts() as contact (contact.id)}
      {@const sendingState = getContactSendingState(contact.id)}
      <div
        class="contact-item {selectedContactId === contact.id ? 'selected' : ''} {sendingState !== 'none' ? `sending-state-${sendingState}` : ''}"
        onclick={() => handleSelectContact(contact)}
        onkeydown={(e) => e.key === 'Enter' && handleSelectContact(contact)}
        role="button"
        tabindex="0"
      >
        <div class="contact-info">
          <div class="contact-avatar">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div class="contact-details">
            <div class="contact-name">{contact.name}</div>
            <div class="contact-email">{activeTab === 'messages' ? contact.phone : contact.email}</div>
          </div>
        </div>
        <div class="contact-actions">
          {#if sendingState === 'sending'}
            {#if isRateLimitRetrying(contact.id)}
              <!-- Rate limit retry - show countdown on current contact -->
              <div class="rate-limit-indicator" title="Rate limited - retrying in {countdown}s">
                <span class="rate-limit-time">{countdown}s</span>
              </div>
            {:else}
              <div class="sending-indicator" title="Sending email...">
                <svg class="spinner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
            {/if}
          {:else if sendingState === 'completed'}
            <div class="completed-indicator" title="Email sent successfully">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          {:else if sendingState === 'failed'}
            <div class="failed-indicator" title="Failed to send email">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
          {:else if sendingState === 'waiting'}
            {#if isNextInQueue(contact.id)}
              <div class="waiting-indicator next-in-queue" title="Time until next email">
                <span class="wait-time">{countdown}s</span>
              </div>
            {/if}
          {:else}
            <button
              class="manage-lists-button"
              onclick={(e) => { e.stopPropagation(); onManageLists(contact); }}
              title="Manage lists"
              aria-label="Manage lists"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button
              class="delete-button"
              onclick={(e) => handleDeleteContact(e, contact.id)}
              title="Delete contact"
              aria-label="Delete contact"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="empty-state">
        {#if searchQuery.trim() !== ''}
          <p>No contacts found</p>
        {:else}
          <p>No contacts yet</p>
          <p class="empty-hint">Click the + button to add your first contact</p>
        {/if}
      </div>
    {/each}
  </div>
</aside>

<style>
  .sidebar {
    width: 300px;
    height: 100vh;
    background-color: #1e1e1e;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .sidebar-header {
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333;
  }
  
  .sidebar-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .delete-all-button {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    border-radius: 8px;
    border: none !important;
    background-color: #ff4444 !important;
    color: white !important;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    padding: 0 !important;
    flex-shrink: 0;
  }

  .delete-all-button svg {
    display: block !important;
    flex-shrink: 0;
  }

  .delete-all-button:hover {
    background-color: #cc0000 !important;
  }

  .delete-all-button:active {
    transform: scale(0.95);
  }

  .import-button {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    border-radius: 8px;
    border: none !important;
    background-color: #444 !important;
    color: white !important;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    padding: 0 !important;
    flex-shrink: 0;
  }

  .import-button svg {
    display: block !important;
    flex-shrink: 0;
  }

  .import-button:hover {
    background-color: #555 !important;
  }

  .import-button:active {
    transform: scale(0.95);
  }

  .add-button {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    border-radius: 8px;
    border: none !important;
    background-color: #0066ff !important;
    color: white !important;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    padding: 0 !important;
    flex-shrink: 0;
  }

  .add-button svg {
    display: block;
    flex-shrink: 0;
  }

  .add-button:hover {
    background-color: #0052cc !important;
    border-color: transparent !important;
  }

  .add-button:active {
    transform: scale(0.95);
  }

  .add-button:focus,
  .add-button:focus-visible {
    outline: 2px solid #0066ff;
    outline-offset: 2px;
  }

  .lists-section {
    border-bottom: 1px solid #333;
    padding: 16px;
  }

  .lists-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .lists-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .create-list-button {
    width: 24px;
    height: 24px;
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
  }

  .create-list-button:hover {
    background-color: #444;
    color: #0066ff;
  }

  .lists-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
    color: #ccc;
    font-size: 0.9rem;
  }

  .list-item:hover {
    background-color: #2a2a2a;
  }

  .list-item.selected {
    background-color: #0066ff22;
    color: #0066ff;
    font-weight: 500;
  }

  .list-item svg {
    flex-shrink: 0;
  }

  .list-item span:first-of-type {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .list-count {
    font-size: 0.8rem;
    color: #666;
    background-color: #333;
    padding: 2px 8px;
    border-radius: 12px;
    min-width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .list-delete-button {
    display: none;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none;
    background-color: transparent;
    color: #888;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
    margin-left: auto;
  }

  .list-item:hover .list-delete-button {
    display: flex;
  }

  .list-delete-button:hover {
    background-color: #ff4444;
    color: white;
  }

  .list-item.selected .list-count {
    background-color: #0066ff33;
    color: #0066ff;
  }

  .search-box {
    padding: 16px;
    border-bottom: 1px solid #333;
  }
  
  .search-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #2a2a2a;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  
  .search-input:focus {
    border-color: #0066ff;
  }
  
  .search-input::placeholder {
    color: #888;
  }
  
  .contacts-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  
  .contact-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 4px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
  }
  
  .contact-item:hover {
    background-color: #2a2a2a;
  }
  
  .contact-item.selected {
    background-color: #0066ff22;
    border: 1px solid #0066ff;
  }
  
  .contact-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  
  .contact-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  
  .contact-details {
    flex: 1;
    min-width: 0;
  }
  
  .contact-name {
    font-weight: 500;
    color: #fff;
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .contact-email {
    font-size: 0.85rem;
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .contact-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .contact-item:hover .contact-actions {
    opacity: 1;
  }

  /* Sending state styles */
  .contact-item.sending-state-waiting {
    opacity: 0.5;
  }

  .contact-item.sending-state-sending {
    background-color: #0066ff22;
    border: 1px solid #0066ff;
  }

  .contact-item.sending-state-completed {
    opacity: 0.8;
  }

  .contact-item.sending-state-failed {
    opacity: 0.8;
  }

  /* Always show contact actions when in a sending state */
  .contact-item.sending-state-waiting .contact-actions,
  .contact-item.sending-state-sending .contact-actions,
  .contact-item.sending-state-completed .contact-actions,
  .contact-item.sending-state-failed .contact-actions {
    opacity: 1;
  }

  /* Sending indicators */
  .sending-indicator,
  .completed-indicator,
  .failed-indicator,
  .waiting-indicator,
  .rate-limit-indicator {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sending-indicator {
    color: #0066ff;
  }

  .rate-limit-indicator {
    background-color: #ff980022;
    color: #ff9800;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid #ff9800;
    animation: pulse-orange 1s ease-in-out infinite;
  }

  .rate-limit-time {
    font-size: 11px;
    font-weight: 600;
  }

  @keyframes pulse-orange {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(255, 152, 0, 0);
    }
  }

  .completed-indicator {
    color: #00cc66;
  }

  .failed-indicator {
    color: #ff4444;
  }

  .waiting-indicator {
    color: #888;
    min-width: 60px;
    justify-content: center;
  }

  .waiting-indicator.next-in-queue {
    background-color: #0066ff22;
    border-radius: 6px;
    padding: 4px 8px;
  }

  .wait-time {
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
    white-space: nowrap;
  }

  .next-in-queue .wait-time {
    color: #0066ff;
  }

  /* Spinner animation */
  .spinner-icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .manage-lists-button,
  .delete-button {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none !important;
    background-color: transparent !important;
    color: #888;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    padding: 0 !important;
  }

  .manage-lists-button svg,
  .delete-button svg {
    display: block !important;
    flex-shrink: 0;
  }

  .manage-lists-button:hover {
    background-color: #0066ff !important;
    color: white !important;
  }

  .delete-button:hover {
    background-color: #ff4444 !important;
    color: white !important;
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
  
  /* Custom scrollbar */
  .contacts-list::-webkit-scrollbar {
    width: 8px;
  }
  
  .contacts-list::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .contacts-list::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  
  .contacts-list::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>

