<script>
  import { onMount } from 'svelte';
  import { Settings, FileText, Plus, X, FileCode, Database } from 'lucide-svelte';
  import Sidebar from './lib/components/composers/Sidebar.svelte';
  import AddContactModal from './lib/components/modals/AddContactModal.svelte';
  import AddWhatsAppContactModal from './lib/components/modals/AddWhatsAppContactModal.svelte';
  import ImportContactsModal from './lib/components/modals/ImportContactsModal.svelte';
  import CreateListModal from './lib/components/modals/CreateListModal.svelte';
  import ManageListsModal from './lib/components/modals/ManageListsModal.svelte';
  import EmailSettingsModal from './lib/components/modals/EmailSettingsModal.svelte';
  import LogsModal from './lib/components/modals/LogsModal.svelte';
  import EmailSessionsModal from './lib/components/modals/EmailSessionsModal.svelte';
  import EmailComposer from './lib/components/composers/EmailComposer.svelte';
  import MessagesComposer from './lib/components/composers/MessagesComposer.svelte';
  import ToastContainer from './lib/components/ui/ToastContainer.svelte';
  import DialogContainer from './lib/components/ui/DialogContainer.svelte';
  import { initDatabase, deleteAllContacts, deleteAllWhatsAppContacts, database } from './lib/stores/database.js';
  import { emailTabsStore } from './lib/stores/emailTabsStore.js';
  import { emailSendingProgress } from './lib/stores/emailSendingStore.js';
  import { toastSuccess, toastError } from './lib/stores/toastStore.js';
  import { confirm as confirmDialog } from './lib/stores/dialogStore.js';

  /**
   * Application state
   */
  let activeTab = $state('email');
  let isAddModalOpen = $state(false);
  let isImportModalOpen = $state(false);
  let isCreateListModalOpen = $state(false);
  let isManageListsModalOpen = $state(false);
  let isEmailSettingsModalOpen = $state(false);
  let isLogsModalOpen = $state(false);
  let isEmailSessionsModalOpen = $state(false);
  let selectedContact = $state(null);
  let contactForListManagement = $state(null);
  let isLoading = $state(true);
  let currentSelectedListId = $state(null);

  /**
   * Templates state
   */
  let templatesList = $state([]);
  let selectedTemplate = $state(null);
  let isCreateTemplateModalOpen = $state(false);
  let newTemplateName = $state('');
  let saveTimeout = null;
  let isSavingTemplate = $state(false);
  let lastSavedTime = $state(null);

  /**
   * Initialize database on component mount
   */
  onMount(async () => {
    try {
      await initDatabase();
      // Load templates from database
      await loadTemplatesFromDatabase();
      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      isLoading = false;
    }
  });

  /**
   * Load templates from database
   */
  async function loadTemplatesFromDatabase() {
    try {
      const dbTemplates = database.getAllTemplates();
      templatesList = dbTemplates;
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  /**
   * Save template to database
   */
  async function saveTemplate(template) {
    try {
      isSavingTemplate = true;
      if (template.id && typeof template.id === 'number' && template.id > 1000000000000) {
        // New template (timestamp ID) - add to database
        const dbTemplate = database.addTemplate(template.name, template.subject, template.body);
        // Update the template with the database ID
        const index = templatesList.findIndex(t => t.id === template.id);
        if (index !== -1) {
          templatesList[index] = dbTemplate;
          if (selectedTemplate?.id === template.id) {
            selectedTemplate = dbTemplate;
          }
        }
      } else {
        // Existing template - update in database
        database.updateTemplate(template.id, template.name, template.subject, template.body);
      }
      lastSavedTime = new Date();
      setTimeout(() => {
        isSavingTemplate = false;
      }, 500);
    } catch (error) {
      console.error('Failed to save template:', error);
      toastError('Failed to save template: ' + error.message);
      isSavingTemplate = false;
    }
  }

  /**
   * Manual save function
   */
  async function manualSaveTemplate() {
    if (selectedTemplate) {
      await saveTemplate(selectedTemplate);
    }
  }

  /**
   * Delete template from database
   */
  async function deleteTemplateFromDatabase(templateId) {
    try {
      database.deleteTemplate(templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
      toastError('Failed to delete template: ' + error.message);
    }
  }

  /**
   * Auto-save template changes with debounce
   */
  $effect(() => {
    if (selectedTemplate) {
      // Clear existing timeout
      if (saveTimeout) clearTimeout(saveTimeout);

      // Set new timeout to save after 1 second of no changes
      saveTimeout = setTimeout(() => {
        saveTemplate(selectedTemplate);
      }, 1000);
    }
  });

  /**
   * Sync currentSelectedListId with active tab's selectedListId when tab changes
   */
  $effect(() => {
    if (activeTab === 'email') {
      const activeEmailTab = $emailTabsStore.tabs.find(t => t.id === $emailTabsStore.activeTabId);
      if (activeEmailTab) {
        currentSelectedListId = activeEmailTab.selectedListId;
      }
    }
  });

  /**
   * Handle opening the add contact modal
   */
  function handleAddContact() {
    isAddModalOpen = true;
  }

  /**
   * Handle closing the add contact modal
   */
  function handleCloseModal() {
    isAddModalOpen = false;
  }

  /**
   * Handle opening the import contacts modal
   */
  function handleImportContacts() {
    isImportModalOpen = true;
  }

  /**
   * Handle closing the import contacts modal
   */
  function handleCloseImportModal() {
    isImportModalOpen = false;
  }

  /**
   * Handle delete all contacts
   */
  async function handleDeleteAll() {
    const confirmed = await confirmDialog(
      'Are you sure you want to delete ALL contacts? This action cannot be undone!',
      { title: 'Delete All Contacts', confirmText: 'Delete All', dangerous: true }
    );
    if (confirmed) {
      if (activeTab === 'messages') {
        deleteAllWhatsAppContacts();
      } else {
        deleteAllContacts();
      }
      selectedContact = null;
    }
  }

  /**
   * Handle opening the create list modal
   */
  function handleCreateList() {
    isCreateListModalOpen = true;
  }

  /**
   * Handle closing the create list modal
   */
  function handleCloseCreateListModal() {
    isCreateListModalOpen = false;
  }

  /**
   * Handle opening the manage lists modal
   */
  function handleManageLists(contact) {
    contactForListManagement = contact;
    isManageListsModalOpen = true;
  }

  /**
   * Handle closing the manage lists modal
   */
  function handleCloseManageListsModal() {
    isManageListsModalOpen = false;
    contactForListManagement = null;
  }

  /**
   * Handle contact selection from sidebar
   */
  function handleSelectContact(contact) {
    selectedContact = contact;
  }

  /**
   * Handle selected list change from sidebar
   */
  function handleSelectedListChange(listId) {
    currentSelectedListId = listId;
    // Update active email tab's selected list
    if (activeTab === 'email') {
      emailTabsStore.updateTabSelectedList($emailTabsStore.activeTabId, listId);
    }
  }

  /**
   * Handle adding a new email tab
   */
  function handleAddEmailTab() {
    const fromAddress = localStorage.getItem('zoho_from_address') || 'office@justhemis.com';
    emailTabsStore.addTab(fromAddress);
  }

  /**
   * Handle closing an email tab
   */
  async function handleCloseEmailTab(tabId, event) {
    event.stopPropagation();

    const tab = $emailTabsStore.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Check if tab is sending
    const tabProgress = $emailSendingProgress.sendingTabs[tabId];
    const isSending = tabProgress && tabProgress.isSending;

    if (isSending) {
      const confirmed = await confirmDialog(
        'This tab is currently sending emails. Are you sure you want to close it?',
        { title: 'Close Tab', confirmText: 'Close', dangerous: true }
      );
      if (!confirmed) return;
    } else if (tab.isDirty) {
      const confirmed = await confirmDialog(
        'This tab has unsaved changes. Are you sure you want to close it?',
        { title: 'Close Tab', confirmText: 'Close' }
      );
      if (!confirmed) return;
    }

    emailTabsStore.closeTab(tabId);
  }

  /**
   * Handle switching email tabs
   */
  function handleSwitchEmailTab(tabId) {
    emailTabsStore.setActiveTab(tabId);
    // Update currentSelectedListId to match the tab's selected list
    const tab = $emailTabsStore.tabs.find(t => t.id === tabId);
    if (tab) {
      currentSelectedListId = tab.selectedListId;
    }
  }

  /**
   * Get short label for email address
   */
  function getShortEmailLabel(email) {
    if (email === 'office@justhemis.com') return 'Main';
    if (email === 'uk@justhemis.com') return 'UK';
    if (email === 'usa@justhemis.com') return 'USA';
    if (email === 'canada@justhemis.com') return 'CA';
    if (email === 'australia@justhemis.com') return 'AU';
    return email.split('@')[0];
  }

  /**
   * Handle opening email settings modal
   */
  function handleOpenEmailSettings() {
    isEmailSettingsModalOpen = true;
  }

  /**
   * Handle closing email settings modal
   */
  function handleCloseEmailSettings() {
    isEmailSettingsModalOpen = false;
  }

  /**
   * Handle opening logs modal
   */
  function handleOpenLogs() {
    isLogsModalOpen = true;
  }

  /**
   * Handle closing logs modal
   */
  function handleCloseLogs() {
    isLogsModalOpen = false;
  }

  /**
   * Handle opening email sessions modal
   */
  function handleOpenEmailSessions() {
    isEmailSessionsModalOpen = true;
  }

  /**
   * Handle closing email sessions modal
   */
  function handleCloseEmailSessions() {
    isEmailSessionsModalOpen = false;
  }
</script>

{#if isLoading}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <p>Loading Email Sender...</p>
  </div>
{:else}
  <div class="app-container">
    <div class="tabs-container">
      <button
        class="tab-button"
        class:active={activeTab === 'email'}
        onclick={() => activeTab = 'email'}
      >
        Email
      </button>
      <button
        class="tab-button"
        class:active={activeTab === 'messages'}
        onclick={() => activeTab = 'messages'}
      >
        Messages
      </button>
      <button
        class="tab-button"
        class:active={activeTab === 'templates'}
        onclick={() => activeTab = 'templates'}
      >
        <FileCode size={18} />
        Templates
      </button>
      <button
        class="settings-button"
        onclick={handleOpenEmailSettings}
        title="Email Settings"
      >
        <Settings size={20} />
      </button>
      <button
        class="settings-button"
        onclick={handleOpenEmailSessions}
        title="Email Sessions & Statistics"
      >
        <Database size={20} />
      </button>
      <button
        class="settings-button"
        onclick={handleOpenLogs}
        title="View Logs"
      >
        <FileText size={20} />
      </button>
    </div>

    <div class="content-wrapper">
      {#if activeTab !== 'templates'}
        <Sidebar
          activeTab={activeTab}
          currentEmailTabId={$emailTabsStore.activeTabId}
          bind:selectedListId={currentSelectedListId}
          onAddContact={handleAddContact}
          onImportContacts={handleImportContacts}
          onDeleteAll={handleDeleteAll}
          onSelectContact={handleSelectContact}
          onCreateList={handleCreateList}
          onManageLists={handleManageLists}
          onSelectedListChange={handleSelectedListChange}
        />
      {/if}

      <main class="main-content" class:full-width={activeTab === 'templates'}>
        {#if activeTab === 'email'}
          <!-- Email Tab Bar -->
          <div class="email-tabs-container">
            <div class="email-tabs-bar">
              <div class="tabs-list">
                {#each $emailTabsStore.tabs as tab (tab.id)}
                  {@const isActive = tab.id === $emailTabsStore.activeTabId}
                  {@const tabProgress = $emailSendingProgress.sendingTabs[tab.id]}
                  {@const isSending = tabProgress && tabProgress.isSending}
                  <div
                    class="email-tab"
                    class:active={isActive}
                    class:sending={isSending}
                    class:dirty={tab.isDirty}
                    onclick={() => handleSwitchEmailTab(tab.id)}
                    onkeydown={(e) => e.key === 'Enter' && handleSwitchEmailTab(tab.id)}
                    role="button"
                    tabindex="0"
                  >
                    <span class="tab-name">{tab.name}</span>
                    <span class="tab-from">{getShortEmailLabel(tab.fromAddress)}</span>
                    {#if isSending}
                      <span class="tab-status">
                        {tabProgress.currentIndex + 1}/{tabProgress.totalCount}
                      </span>
                    {/if}
                    {#if tab.isDirty}
                      <span class="tab-dirty-indicator">●</span>
                    {/if}
                    <button
                      class="tab-close"
                      onclick={(e) => handleCloseEmailTab(tab.id, e)}
                      aria-label="Close tab"
                    >
                      <X size={14} />
                    </button>
                  </div>
                {/each}
              </div>
              <button class="add-tab-btn" onclick={handleAddEmailTab} aria-label="Add new email tab">
                <Plus size={18} />
              </button>
            </div>

            <!-- Email Composer Instances (all kept alive, only active visible) -->
            <div class="email-tab-content">
              {#each $emailTabsStore.tabs as tab (tab.id)}
                <div class="email-composer-instance" class:active={tab.id === $emailTabsStore.activeTabId}>
                  <EmailComposer tabId={tab.id} selectedListId={tab.selectedListId} availableTemplates={templatesList} />
                </div>
              {/each}
            </div>
          </div>
        {:else if activeTab === 'messages'}
          <MessagesComposer selectedListId={currentSelectedListId} />
        {:else if activeTab === 'templates'}
          <div style="display: flex; height: 100%;">
            <!-- Templates List Sidebar -->
            <div style="width: 300px; border-right: 1px solid #333; background: #242424; display: flex; flex-direction: column;">
              <div style="padding: 20px; border-bottom: 1px solid #333;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #fff;">Email Templates</h2>
                <button
                  class="btn-primary"
                  onclick={() => {
                    newTemplateName = '';
                    isCreateTemplateModalOpen = true;
                  }}
                  style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; background: #0066ff; color: #fff; width: 100%;"
                >
                  <Plus size={18} />
                  New Template
                </button>
              </div>

              <div style="flex: 1; overflow-y: auto; padding: 10px;">
                {#if templatesList.length === 0}
                  <div style="text-align: center; padding: 40px 20px; color: #999;">
                    <p>No templates yet</p>
                    <p style="font-size: 14px; color: #666;">Click "New Template" to create one</p>
                  </div>
                {:else}
                  {#each templatesList as template (template.id)}
                    <div
                      role="button"
                      tabindex="0"
                      class="template-item"
                      class:active={selectedTemplate?.id === template.id}
                      onclick={() => selectedTemplate = template}
                      onkeydown={(e) => e.key === 'Enter' && (selectedTemplate = template)}
                      style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; border: 1px solid {selectedTemplate?.id === template.id ? '#0066ff' : 'transparent'}; background: {selectedTemplate?.id === template.id ? '#1a3a5a' : 'transparent'};"
                    >
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          {template.name}
                        </div>
                        <div style="font-size: 13px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          {template.subject || 'No subject'}
                        </div>
                      </div>
                      <button
                        onclick={async (e) => {
                          e.stopPropagation();
                          const confirmed = await confirmDialog(
                            `Delete template "${template.name}"?`,
                            { title: 'Delete Template', confirmText: 'Delete', dangerous: true }
                          );
                          if (confirmed) {
                            await deleteTemplateFromDatabase(template.id);
                            templatesList = templatesList.filter(t => t.id !== template.id);
                            if (selectedTemplate?.id === template.id) selectedTemplate = null;
                          }
                        }}
                        style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 6px; border-radius: 4px; display: flex; align-items: center; justify-content: center;"
                        aria-label="Delete template"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- Template Editor (EmailComposer) -->
            <div style="flex: 1; display: flex; flex-direction: column;">
              {#if selectedTemplate}
                <!-- Template Header with Save Button -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #333; background: #242424;">
                  <div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #fff;">
                      Editing: {selectedTemplate.name}
                    </h3>
                    {#if lastSavedTime}
                      <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">
                        Last saved: {lastSavedTime.toLocaleTimeString()}
                      </p>
                    {/if}
                  </div>
                  <button
                    class="btn-primary"
                    onclick={manualSaveTemplate}
                    disabled={isSavingTemplate}
                    style="display: flex; align-items: center; gap: 8px; padding: 8px 16px;"
                  >
                    {#if isSavingTemplate}
                      <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
                      Saving...
                    {:else}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      Save Template
                    {/if}
                  </button>
                </div>

                <EmailComposer
                  tabId="template-{selectedTemplate.id}"
                  isTemplateMode={true}
                  bind:subject={selectedTemplate.subject}
                  bind:body={selectedTemplate.body}
                  bind:fromAddress={selectedTemplate.fromAddress}
                />
              {:else}
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; padding: 40px;">
                  <FileCode size={64} style="color: #444; margin-bottom: 20px;" />
                  <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: #ccc;">Select a template to edit</h3>
                  <p style="margin: 0; font-size: 14px;">Or create a new template to get started</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </main>
    </div>

    {#if activeTab === 'messages'}
      <AddWhatsAppContactModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
      />
    {:else}
      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
      />
    {/if}

    <ImportContactsModal
      isOpen={isImportModalOpen}
      onClose={handleCloseImportModal}
      defaultListId={currentSelectedListId}
    />

    <CreateListModal
      isOpen={isCreateListModalOpen}
      onClose={handleCloseCreateListModal}
    />

    <ManageListsModal
      isOpen={isManageListsModalOpen}
      contact={contactForListManagement}
      onClose={handleCloseManageListsModal}
    />

    <EmailSettingsModal
      isOpen={isEmailSettingsModalOpen}
      onClose={handleCloseEmailSettings}
    />

    <LogsModal
      isOpen={isLogsModalOpen}
      onClose={handleCloseLogs}
    />

    <EmailSessionsModal
      bind:isOpen={isEmailSessionsModalOpen}
    />

    <!-- Toast notifications (replaces blocking alert() calls) -->
    <ToastContainer />

    <!-- Non-blocking dialog for confirmations (replaces blocking confirm() calls) -->
    <DialogContainer />
  </div>
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: #1e1e1e;
    color: #fff;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #333;
    border-top-color: #0066ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #1e1e1e;
    overflow: hidden;
  }

  .tabs-container {
    display: flex;
    background-color: #1a1a1a;
    border-bottom: 1px solid #333;
    padding: 0;
  }

  .tab-button {
    padding: 16px 32px;
    background-color: transparent;
    color: #999;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tab-button:hover {
    color: #fff;
    background-color: #242424;
  }

  .tab-button.active {
    color: #fff;
    border-bottom-color: #0066ff;
  }

  .settings-button {
    margin-left: auto;
    padding: 16px 24px;
    background-color: transparent;
    color: #999;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .settings-button:hover {
    color: #fff;
    background-color: #242424;
  }

  .content-wrapper {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    background-color: #242424;
    display: flex;
    flex-direction: column;
  }

  .main-content.full-width {
    width: 100%;
  }

  /* Custom scrollbar for main content */
  .main-content::-webkit-scrollbar {
    width: 10px;
  }

  .main-content::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  .main-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 5px;
  }

  .main-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Email Tabs Styles */
  .email-tabs-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .email-tabs-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .tabs-list {
    display: flex;
    gap: 6px;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .email-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px 8px 0 0;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-width: 120px;
    position: relative;
  }

  .email-tab:hover {
    background: rgba(255, 255, 255, 0.25);
    color: white;
  }

  .email-tab.active {
    background: white;
    color: #667eea;
    border-color: white;
    font-weight: 600;
  }

  .email-tab.sending {
    background: rgba(76, 175, 80, 0.3);
    border-color: #4caf50;
  }

  .email-tab.active.sending {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .tab-name {
    font-size: 13px;
    font-weight: 500;
  }

  .tab-from {
    font-size: 11px;
    opacity: 0.8;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .email-tab.active .tab-from {
    background: rgba(102, 126, 234, 0.1);
  }

  .tab-status {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    background: #4caf50;
    color: white;
    border-radius: 4px;
  }

  .tab-dirty-indicator {
    color: #ff9800;
    font-size: 16px;
    line-height: 1;
  }

  .email-tab.active .tab-dirty-indicator {
    color: #ff6f00;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 4px;
    color: currentColor;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-close:hover {
    background: rgba(244, 67, 54, 0.8);
    color: white;
  }

  .add-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-tab-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  .email-tab-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .email-composer-instance {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: none;
  }

  .email-composer-instance.active {
    display: block;
  }

  /* Spin animation for save button */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Create Template Modal */
  .create-template-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .create-template-modal {
    background: #242424;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .create-template-modal h3 {
    margin: 0 0 20px 0;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }

  .create-template-modal input {
    width: 100%;
    padding: 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    margin-bottom: 20px;
    box-sizing: border-box;
  }

  .create-template-modal input:focus {
    outline: none;
    border-color: #0066ff;
  }

  .create-template-modal-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
</style>

{#if isCreateTemplateModalOpen}
  <div
    class="create-template-modal-backdrop"
    onclick={(e) => e.target === e.currentTarget && (isCreateTemplateModalOpen = false)}
    onkeydown={(e) => e.key === 'Escape' && (isCreateTemplateModalOpen = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="create-template-modal">
      <h3>Create New Template</h3>
      <input
        type="text"
        bind:value={newTemplateName}
        placeholder="Template name"
        onkeydown={async (e) => {
          if (e.key === 'Enter' && newTemplateName.trim()) {
            const dbTemplate = database.addTemplate(newTemplateName.trim(), '', '');
            templatesList = [...templatesList, dbTemplate];
            selectedTemplate = dbTemplate;
            isCreateTemplateModalOpen = false;
          }
        }}
      />
      <div class="create-template-modal-buttons">
        <button
          class="btn-secondary"
          onclick={() => isCreateTemplateModalOpen = false}
        >
          Cancel
        </button>
        <button
          class="btn-primary"
          onclick={async () => {
            if (!newTemplateName.trim()) return;
            const dbTemplate = database.addTemplate(newTemplateName.trim(), '', '');
            templatesList = [...templatesList, dbTemplate];
            selectedTemplate = dbTemplate;
            isCreateTemplateModalOpen = false;
          }}
          disabled={!newTemplateName.trim()}
        >
          Create
        </button>
      </div>
    </div>
  </div>
{/if}
