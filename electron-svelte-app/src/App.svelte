<script>
  import { onMount } from 'svelte';
  import { Settings, FileText } from 'lucide-svelte';
  import Sidebar from './lib/components/composers/Sidebar.svelte';
  import AddContactModal from './lib/components/modals/AddContactModal.svelte';
  import AddWhatsAppContactModal from './lib/components/modals/AddWhatsAppContactModal.svelte';
  import ImportContactsModal from './lib/components/modals/ImportContactsModal.svelte';
  import CreateListModal from './lib/components/modals/CreateListModal.svelte';
  import ManageListsModal from './lib/components/modals/ManageListsModal.svelte';
  import EmailSettingsModal from './lib/components/modals/EmailSettingsModal.svelte';
  import LogsModal from './lib/components/modals/LogsModal.svelte';
  import EmailComposer from './lib/components/composers/EmailComposer.svelte';
  import MessagesComposer from './lib/components/composers/MessagesComposer.svelte';
  import { initDatabase, deleteAllContacts, deleteAllWhatsAppContacts } from './lib/stores/database.js';

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
  let selectedContact = $state(null);
  let contactForListManagement = $state(null);
  let isLoading = $state(true);
  let currentSelectedListId = $state(null);

  /**
   * Initialize database on component mount
   */
  onMount(async () => {
    try {
      await initDatabase();
      isLoading = false;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      isLoading = false;
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
  function handleDeleteAll() {
    const confirmed = confirm('Are you sure you want to delete ALL contacts? This action cannot be undone!');
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
        class="settings-button"
        onclick={handleOpenEmailSettings}
        title="Email Settings"
      >
        <Settings size={20} />
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
      <Sidebar
        activeTab={activeTab}
        onAddContact={handleAddContact}
        onImportContacts={handleImportContacts}
        onDeleteAll={handleDeleteAll}
        onSelectContact={handleSelectContact}
        onCreateList={handleCreateList}
        onManageLists={handleManageLists}
        onSelectedListChange={handleSelectedListChange}
      />

      <main class="main-content">
        {#if activeTab === 'email'}
          <EmailComposer selectedListId={currentSelectedListId} />
        {:else}
          <MessagesComposer selectedListId={currentSelectedListId} />
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
</style>
