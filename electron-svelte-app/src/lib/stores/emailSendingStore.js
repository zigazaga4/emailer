/**
 * Email Sending Progress Store
 * Tracks the state of bulk email sending operations for multiple tabs
 */

import { writable } from 'svelte/store';

/**
 * Email sending progress state for a single tab
 * @typedef {Object} TabSendingProgress
 * @property {boolean} isSending - Whether sending is in progress
 * @property {number|null} currentContactId - ID of contact currently being sent to
 * @property {Set<number>} completedContactIds - Set of contact IDs that have been sent successfully
 * @property {Set<number>} failedContactIds - Set of contact IDs that failed to send
 * @property {number|null} targetListId - ID of the list being sent to (null for "All Contacts")
 * @property {number} totalCount - Total number of contacts to send to
 * @property {number} currentIndex - Current index in the sending process (0-based)
 * @property {number|null} delayEndTime - Timestamp when the current delay will end (null if not delaying)
 * @property {boolean} isRateLimitRetrying - Whether currently retrying due to rate limit (timer shows on current contact)
 */

/**
 * Global store state
 * @typedef {Object} EmailSendingState
 * @property {Object.<string, TabSendingProgress>} sendingTabs - Map of tab IDs to their sending progress
 */

/**
 * Create initial state
 */
function createInitialState() {
  return {
    sendingTabs: {}
  };
}

/**
 * Create the email sending progress store
 */
function createEmailSendingStore() {
  const { subscribe, set, update } = writable(createInitialState());

  return {
    subscribe,

    /**
     * Start a new sending operation for a tab
     * @param {string} tabId - ID of the tab that is sending
     * @param {number|null} listId - ID of the list being sent to (null for "All Contacts")
     * @param {number} totalCount - Total number of contacts to send to
     */
    startSending(tabId, listId, totalCount) {
      update(state => ({
        ...state,
        sendingTabs: {
          ...state.sendingTabs,
          [tabId]: {
            isSending: true,
            currentContactId: null,
            completedContactIds: new Set(),
            failedContactIds: new Set(),
            targetListId: listId,
            totalCount,
            currentIndex: 0,
            delayEndTime: null,
            isRateLimitRetrying: false
          }
        }
      }));
    },

    /**
     * Set the current contact being sent to for a tab
     * @param {string} tabId - ID of the tab
     * @param {number} contactId - ID of the contact
     * @param {number} index - Current index in the sending process
     */
    setCurrentContact(tabId, contactId, index) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              currentContactId: contactId,
              currentIndex: index
            }
          }
        };
      });
    },

    /**
     * Mark a contact as successfully sent for a tab
     * @param {string} tabId - ID of the tab
     * @param {number} contactId - ID of the contact
     */
    markCompleted(tabId, contactId) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        const newCompleted = new Set(state.sendingTabs[tabId].completedContactIds);
        newCompleted.add(contactId);
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              completedContactIds: newCompleted
            }
          }
        };
      });
    },

    /**
     * Mark a contact as failed for a tab
     * @param {string} tabId - ID of the tab
     * @param {number} contactId - ID of the contact
     */
    markFailed(tabId, contactId) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        const newFailed = new Set(state.sendingTabs[tabId].failedContactIds);
        newFailed.add(contactId);
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              failedContactIds: newFailed
            }
          }
        };
      });
    },

    /**
     * Start a delay countdown for a tab (normal delay between emails)
     * @param {string} tabId - ID of the tab
     * @param {number} delayMs - Delay duration in milliseconds
     */
    startDelay(tabId, delayMs) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              delayEndTime: Date.now() + delayMs,
              isRateLimitRetrying: false
            }
          }
        };
      });
    },

    /**
     * Start a rate limit retry countdown for a tab
     * Timer shows on CURRENT contact being retried, not next in queue
     * @param {string} tabId - ID of the tab
     * @param {number} delayMs - Delay duration in milliseconds
     */
    startRateLimitRetry(tabId, delayMs) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              delayEndTime: Date.now() + delayMs,
              isRateLimitRetrying: true
            }
          }
        };
      });
    },

    /**
     * Clear the delay countdown for a tab
     * @param {string} tabId - ID of the tab
     */
    clearDelay(tabId) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              delayEndTime: null,
              isRateLimitRetrying: false
            }
          }
        };
      });
    },

    /**
     * End the sending operation for a tab
     * @param {string} tabId - ID of the tab
     */
    endSending(tabId) {
      update(state => {
        if (!state.sendingTabs[tabId]) return state;
        return {
          ...state,
          sendingTabs: {
            ...state.sendingTabs,
            [tabId]: {
              ...state.sendingTabs[tabId],
              isSending: false,
              currentContactId: null,
              delayEndTime: null
            }
          }
        };
      });
    },

    /**
     * Get progress for a specific tab
     * @param {string} tabId - ID of the tab
     * @returns {TabSendingProgress|null}
     */
    getTabProgress(tabId) {
      let result = null;
      subscribe(state => {
        result = state.sendingTabs[tabId] || null;
      })();
      return result;
    },

    /**
     * Reset the store to initial state
     */
    reset() {
      set(createInitialState());
    }
  };
}

export const emailSendingProgress = createEmailSendingStore();

