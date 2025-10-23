<script>
  import { whatsappContactsStore, getWhatsAppContactsInList } from '../../stores/database.js';
  import { sendWhatsAppMessage } from '../../services/twilio-ipc.js';

  /**
   * Messages Composer Component
   * Template selector for WhatsApp messages
   */

  let { selectedListId = null } = $props();

  /**
   * Twilio WhatsApp sender number (Twilio Sandbox for testing)
   */
  const WHATSAPP_FROM = '+14155238886';

  /**
   * Available WhatsApp templates
   */
  const templates = [
    {
      id: 1,
      name: 'Justhemis – AI Legal Tech Platform',
      contentSid: 'HX5527ed173d880273de4ae17d8e12e056',
      content: `Justhemis – AI Legal Tech Platform

We invite you to experience the services of our new platform:

⚖️ Legislation Engine
🛡️ AI Defence and AI Voice Pleading for cases
📑 Intelligent Augmented Creation and Analysis of Legal Documents
📧 E-mail AI

🎁 £7 Gift to test the services

✅ No subscription • No login fees

For more details, press the button below.`
    }
  ];

  let selectedTemplateId = $state(null);
  let isSending = $state(false);
  let sendingProgress = $state({ current: 0, total: 0 });

  /**
   * Get selected template
   */
  function getSelectedTemplate() {
    return templates.find(t => t.id === selectedTemplateId);
  }

  /**
   * Get contacts to send to
   */
  function getTargetContacts() {
    if (selectedListId !== null) {
      return getWhatsAppContactsInList(selectedListId);
    }
    return $whatsappContactsStore;
  }

  /**
   * Handle template selection
   */
  function handleSelectTemplate(templateId) {
    selectedTemplateId = selectedTemplateId === templateId ? null : templateId;
  }

  /**
   * Handle sending to all contacts
   */
  async function handleSendToAll() {
    const template = getSelectedTemplate();
    if (!template) {
      alert('Please select a template');
      return;
    }

    const contacts = getTargetContacts();
    if (contacts.length === 0) {
      alert('No contacts to send to');
      return;
    }

    const confirmed = confirm(`Send template to ${contacts.length} contact(s)?`);
    if (!confirmed) return;

    isSending = true;
    sendingProgress = { current: 0, total: contacts.length };

    try {
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        sendingProgress.current = i + 1;

        console.log('Sending template to:', contact.phone);

        // Send WhatsApp template message via Twilio API
        await sendWhatsAppMessage({
          to: contact.phone,
          from: WHATSAPP_FROM,
          contentSid: template.contentSid
        });

        // Delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      alert(`Template sent to ${contacts.length} contact(s) successfully!`);
      selectedTemplateId = null;
    } catch (error) {
      console.error('Failed to send messages:', error);
      alert('Failed to send messages: ' + error.message);
    } finally {
      isSending = false;
      sendingProgress = { current: 0, total: 0 };
    }
  }
</script>

<div class="messages-composer">
  <div class="composer-header">
    <h2>WhatsApp Templates</h2>
    <div class="contact-count">
      {getTargetContacts().length} contact(s) selected
    </div>
  </div>

  <div class="composer-content">
    <div class="templates-section">
      <h3>Select a Template</h3>

      {#each templates as template (template.id)}
        <div class="template-card {selectedTemplateId === template.id ? 'selected' : ''}">
          <button
            class="template-header"
            onclick={() => handleSelectTemplate(template.id)}
            disabled={isSending}
          >
            <div class="template-name">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{template.name}</span>
            </div>
            <svg
              class="expand-icon {selectedTemplateId === template.id ? 'expanded' : ''}"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {#if selectedTemplateId === template.id}
            <div class="template-content">
              <div class="content-preview">
                {template.content}
              </div>

              {#if template.contentSid}
                <div class="template-info">
                  <small>Content SID: {template.contentSid}</small>
                </div>
              {:else}
                <div class="template-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>Template Content SID not configured</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if isSending}
      <div class="sending-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {(sendingProgress.current / sendingProgress.total) * 100}%"
          ></div>
        </div>
        <div class="progress-text">
          Sending {sendingProgress.current} of {sendingProgress.total}...
        </div>
      </div>
    {/if}

    <div class="composer-actions">
      <button
        class="send-button"
        onclick={handleSendToAll}
        disabled={isSending || !selectedTemplateId || getTargetContacts().length === 0}
      >
        {#if isSending}
          Sending...
        {:else}
          Send to All Contacts
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .messages-composer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #242424;
    color: #fff;
  }

  .composer-header {
    padding: 20px;
    border-bottom: 1px solid #333;
    background-color: #1e1e1e;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .composer-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .contact-count {
    color: #888;
    font-size: 14px;
  }

  .composer-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .templates-section h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #ccc;
  }

  .template-card {
    background-color: #1e1e1e;
    border: 2px solid #333;
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .template-card.selected {
    border-color: #25D366;
  }

  .template-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background-color: transparent;
    border: none;
    color: #fff;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .template-header:hover:not(:disabled) {
    background-color: #252525;
  }

  .template-header:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .template-name {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 500;
  }

  .expand-icon {
    transition: transform 0.2s;
  }

  .expand-icon.expanded {
    transform: rotate(180deg);
  }

  .template-content {
    padding: 0 16px 16px 16px;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .content-preview {
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 16px;
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.6;
    color: #ddd;
    margin-bottom: 12px;
  }

  .template-info {
    color: #888;
    font-size: 12px;
  }

  .template-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 4px;
    color: #fbbf24;
    font-size: 13px;
  }

  .sending-progress {
    margin: 20px 0;
    padding: 16px;
    background-color: #1e1e1e;
    border-radius: 8px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: #333;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background-color: #25D366;
    transition: width 0.3s ease;
  }

  .progress-text {
    text-align: center;
    color: #888;
    font-size: 14px;
  }

  .composer-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 20px;
    border-top: 1px solid #333;
    margin-top: 20px;
  }

  .send-button {
    padding: 12px 32px;
    background-color: #25D366;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .send-button:hover:not(:disabled) {
    background-color: #20BA5A;
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Scrollbar styling */
  .composer-content::-webkit-scrollbar {
    width: 10px;
  }

  .composer-content::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  .composer-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 5px;
  }

  .composer-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>

