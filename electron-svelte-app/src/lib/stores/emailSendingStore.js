/**
 * Email Sending Progress Store
 * Tracks the state of bulk email sending operations
 */

import { writable } from 'svelte/store';

/**
 * Email sending progress state
 * @typedef {Object} EmailSendingProgress
 * @property {boolean} isSending - Whether sending is in progress
 * @property {number|null} currentContactId - ID of contact currently being sent to
 * @property {Set<number>} completedContactIds - Set of contact IDs that have been sent successfully
 * @property {Set<number>} failedContactIds - Set of contact IDs that failed to send
 * @property {number|null} targetListId - ID of the list being sent to (null for "All Contacts")
 * @property {number} totalCount - Total number of contacts to send to
 * @property {number} currentIndex - Current index in the sending process (0-based)
 * @property {number|null} delayEndTime - Timestamp when the current delay will end (null if not delaying)
 */

/**
 * Create initial state
 */
function createInitialState() {
  return {
    isSending: false,
    currentContactId: null,
    completedContactIds: new Set(),
    failedContactIds: new Set(),
    targetListId: null,
    totalCount: 0,
    currentIndex: 0,
    delayEndTime: null
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
     * Start a new sending operation
     * @param {number|null} listId - ID of the list being sent to (null for "All Contacts")
     * @param {number} totalCount - Total number of contacts to send to
     */
    startSending(listId, totalCount) {
      set({
        isSending: true,
        currentContactId: null,
        completedContactIds: new Set(),
        failedContactIds: new Set(),
        targetListId: listId,
        totalCount,
        currentIndex: 0,
        delayEndTime: null
      });
    },

    /**
     * Set the current contact being sent to
     * @param {number} contactId - ID of the contact
     * @param {number} index - Current index in the sending process
     */
    setCurrentContact(contactId, index) {
      update(state => ({
        ...state,
        currentContactId: contactId,
        currentIndex: index
      }));
    },

    /**
     * Mark a contact as successfully sent
     * @param {number} contactId - ID of the contact
     */
    markCompleted(contactId) {
      update(state => {
        const newCompleted = new Set(state.completedContactIds);
        newCompleted.add(contactId);
        return {
          ...state,
          completedContactIds: newCompleted
          // Don't clear currentContactId - let setCurrentContact handle it
        };
      });
    },

    /**
     * Mark a contact as failed
     * @param {number} contactId - ID of the contact
     */
    markFailed(contactId) {
      update(state => {
        const newFailed = new Set(state.failedContactIds);
        newFailed.add(contactId);
        return {
          ...state,
          failedContactIds: newFailed
          // Don't clear currentContactId - let setCurrentContact handle it
        };
      });
    },

    /**
     * Start a delay countdown
     * @param {number} delayMs - Delay duration in milliseconds
     */
    startDelay(delayMs) {
      update(state => ({
        ...state,
        delayEndTime: Date.now() + delayMs
      }));
    },

    /**
     * Clear the delay countdown
     */
    clearDelay() {
      update(state => ({
        ...state,
        delayEndTime: null
      }));
    },

    /**
     * End the sending operation
     */
    endSending() {
      update(state => ({
        ...state,
        isSending: false,
        currentContactId: null,
        delayEndTime: null
      }));
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

