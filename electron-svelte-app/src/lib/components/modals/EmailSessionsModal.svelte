<script>
  /**
   * Contact Email History Modal
   * Displays all contacts with their email history, templates used, and sessions
   */

  import { onMount } from 'svelte';
  import { X, Mail, ChevronDown, ChevronUp, Users } from 'lucide-svelte';
  import { emailLogsStore, getContactEmailStats } from '../../stores/emailSessionsStore.js';
  import { contactsStore } from '../../stores/database.js';

  /**
   * Component props
   */
  let { isOpen = $bindable(false) } = $props();

  /**
   * State
   */
  let contacts = $state([]);
  let contactsWithStats = $state([]);
  let expandedContacts = $state(new Set());
  let selectedContactId = $state(null);
  let contactLogs = $state([]);
  let loading = $state(true);

  /**
   * Load contacts and their stats on mount
   */
  onMount(async () => {
    await loadContactsWithStats();
  });

  /**
   * Load all contacts with their email statistics
   */
  async function loadContactsWithStats() {
    loading = true;

    contactsStore.subscribe(value => {
      contacts = value;
    })();

    const statsPromises = contacts.map(async (contact) => {
      const stats = await getContactEmailStats(contact.id);
      return {
        ...contact,
        stats: stats || { totalEmails: 0, successfulEmails: 0, failedEmails: 0 }
      };
    });

    contactsWithStats = await Promise.all(statsPromises);
    contactsWithStats = contactsWithStats.filter(c => c.stats.totalEmails > 0);

    loading = false;
  }

  /**
   * Toggle contact expansion
   */
  async function toggleContact(contactId) {
    const newExpanded = new Set(expandedContacts);
    if (newExpanded.has(contactId)) {
      newExpanded.delete(contactId);
      if (selectedContactId === contactId) {
        selectedContactId = null;
        contactLogs = [];
      }
    } else {
      newExpanded.add(contactId);
      await loadContactLogs(contactId);
    }
    expandedContacts = newExpanded;
  }

  /**
   * Load email logs for a specific contact
   */
  async function loadContactLogs(contactId) {
    selectedContactId = contactId;
    await emailLogsStore.loadLogsForContact(contactId);
    emailLogsStore.subscribe(value => {
      contactLogs = value;
    })();
  }

  /**
   * Close modal
   */
  function closeModal() {
    isOpen = false;
    selectedContactId = null;
    contactLogs = [];
    expandedContacts = new Set();
  }

  /**
   * Handle backdrop click to close modal
   */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  /**
   * Format date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  /**
   * Get session name from log
   */
  function getSessionInfo(log) {
    if (!log.sessionId) return 'N/A';
    return log.sessionName || `Session #${log.sessionId}`;
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="modal-container">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <Mail size={24} style="color: #60a5fa;" />
          <h2 class="modal-title">Contact Email History</h2>
        </div>
        <button onclick={closeModal} class="modal-close-btn" aria-label="Close">
          <X size={24} />
        </button>
      </div>

      <div class="modal-content">
        {#if loading}
          <div class="empty-state">
            <p style="font-size: 18px;">Loading contacts...</p>
          </div>
        {:else if contactsWithStats.length === 0}
          <div class="empty-state">
            <Mail size={64} style="opacity: 0.3; margin-bottom: 20px;" />
            <p style="font-size: 18px; margin-bottom: 8px;">No email history found</p>
            <p style="font-size: 14px; color: #666;">Start sending emails to see contact history</p>
          </div>
        {:else}
          <div class="contacts-list">
            {#each contactsWithStats as contact (contact.id)}
              <div class="contact-card">
                <div class="contact-header">
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                      <h3 class="contact-name">{contact.name}</h3>
                      <span style="font-size: 14px; color: #999;">{contact.email}</span>
                    </div>
                    <div class="contact-stats-inline">
                      <div class="stat-inline">
                        <span class="stat-inline-label">Total Emails:</span>
                        <span class="stat-inline-value">{contact.stats.totalEmails}</span>
                      </div>
                      <div class="stat-inline">
                        <span class="stat-inline-label">Successful:</span>
                        <span class="stat-inline-value" style="color: #4ade80;">{contact.stats.successfulEmails}</span>
                      </div>
                      <div class="stat-inline">
                        <span class="stat-inline-label">Failed:</span>
                        <span class="stat-inline-value" style="color: #f87171;">{contact.stats.failedEmails}</span>
                      </div>
                    </div>
                  </div>
                  <button onclick={() => toggleContact(contact.id)} class="expand-btn">
                    {#if expandedContacts.has(contact.id)}
                      <ChevronUp size={20} />
                    {:else}
                      <ChevronDown size={20} />
                    {/if}
                  </button>
                </div>

                {#if expandedContacts.has(contact.id) && selectedContactId === contact.id}
                  <div class="contact-details">
                    <h4 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #fff;">Email History</h4>
                    {#if contactLogs.length === 0}
                      <p style="text-align: center; padding: 20px; color: #999;">No email history found</p>
                    {:else}
                      <div class="email-history-list">
                        {#each contactLogs as log (log.id)}
                          <div class="email-history-item">
                            <div class="email-history-header">
                              <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                  <span class="email-subject">{log.subject}</span>
                                  {#if log.status === 'success'}
                                    <span class="status-badge" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; font-size: 11px; padding: 2px 8px;">Success</span>
                                  {:else}
                                    <span class="status-badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-size: 11px; padding: 2px 8px;">Failed</span>
                                  {/if}
                                </div>
                                <div class="email-meta">
                                  <span>From: {log.fromAddress}</span>
                                  {#if log.templateName}
                                    <span>Template: {log.templateName}</span>
                                  {/if}
                                  <span>Session: {getSessionInfo(log)}</span>
                                </div>
                              </div>
                              <div class="email-date">
                                {formatDate(log.sentAt)}
                              </div>
                            </div>
                            {#if log.status === 'failed' && log.errorMessage}
                              <div class="error-message">
                                Error: {log.errorMessage}
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
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

  .modal-container {
    background-color: #1e1e1e;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid #333;
    background-color: #242424;
  }

  .modal-title {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #fff;
  }

  .modal-close-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .modal-close-btn:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    background-color: #1e1e1e;
  }

  .modal-content::-webkit-scrollbar {
    width: 10px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 5px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #999;
  }

  .contacts-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .contact-card {
    background-color: #242424;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #333;
  }

  .contact-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
  }

  .contact-name {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .contact-stats-inline {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }

  .stat-inline {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .stat-inline-label {
    font-size: 13px;
    color: #999;
  }

  .stat-inline-value {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .expand-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .expand-btn:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .contact-details {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #333;
  }

  .email-history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .email-history-item {
    background-color: #1a1a1a;
    border-radius: 6px;
    padding: 14px;
    border: 1px solid #2a2a2a;
  }

  .email-history-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
  }

  .email-subject {
    font-size: 15px;
    font-weight: 500;
    color: #fff;
  }

  .email-meta {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #999;
    flex-wrap: wrap;
  }

  .email-date {
    font-size: 12px;
    color: #999;
    text-align: right;
    white-space: nowrap;
  }

  .error-message {
    margin-top: 10px;
    padding: 10px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
    color: #f87171;
    font-size: 12px;
    border-left: 3px solid #f87171;
  }
</style>

