/**
 * Email Sessions Store
 * Manages email sending sessions and logs for tracking and analytics
 */

import { writable } from 'svelte/store';
import { database } from './database.js';

/**
 * Email session
 * @typedef {Object} EmailSession
 * @property {number} id - Session ID
 * @property {string|null} sessionName - Session name
 * @property {number|null} listId - List ID
 * @property {string|null} listName - List name
 * @property {number|null} templateId - Template ID
 * @property {string|null} templateName - Template name
 * @property {string} subject - Email subject
 * @property {string} fromAddress - From address
 * @property {number} totalContacts - Total contacts
 * @property {number} successfulSends - Successful sends
 * @property {number} failedSends - Failed sends
 * @property {string} startedAt - Start timestamp
 * @property {string|null} completedAt - Completion timestamp
 * @property {string} status - Session status (in_progress, completed, cancelled)
 */

/**
 * Email log entry
 * @typedef {Object} EmailLog
 * @property {number} id - Log ID
 * @property {number} sessionId - Session ID
 * @property {number} contactId - Contact ID
 * @property {string} contactName - Contact name
 * @property {string} contactEmail - Contact email
 * @property {string} subject - Email subject
 * @property {number|null} templateId - Template ID
 * @property {string|null} templateName - Template name
 * @property {string} fromAddress - From address
 * @property {string} status - Send status (success, failed)
 * @property {string|null} errorMessage - Error message if failed
 * @property {string} sentAt - Sent timestamp
 */

/**
 * Create email sessions store
 */
function createEmailSessionsStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,

    /**
     * Load all sessions from database
     */
    async loadSessions() {
      const sessions = await database.getAllEmailSessions();
      set(sessions);
    },

    /**
     * Create a new email session
     * @param {Object} sessionData - Session data
     * @returns {Promise<number>} Session ID
     */
    async createSession(sessionData) {
      const sessionId = await database.createEmailSession(sessionData);
      await this.loadSessions();
      return sessionId;
    },

    /**
     * Update session statistics
     * @param {number} sessionId - Session ID
     * @param {Object} stats - Statistics to update
     */
    async updateSession(sessionId, stats) {
      await database.updateEmailSession(sessionId, stats);
      await this.loadSessions();
    },

    /**
     * Get session by ID
     * @param {number} sessionId - Session ID
     * @returns {EmailSession|undefined}
     */
    getSession(sessionId) {
      let result;
      subscribe(sessions => {
        result = sessions.find(s => s.id === sessionId);
      })();
      return result;
    }
  };
}

/**
 * Create email logs store
 */
function createEmailLogsStore() {
  const { subscribe, set } = writable([]);

  return {
    subscribe,

    /**
     * Load logs for a specific session
     * @param {number} sessionId - Session ID
     */
    async loadLogsForSession(sessionId) {
      const logs = await database.getEmailLogsForSession(sessionId);
      set(logs);
    },

    /**
     * Load logs for a specific contact
     * @param {number} contactId - Contact ID
     */
    async loadLogsForContact(contactId) {
      const logs = await database.getEmailLogsForContact(contactId);
      set(logs);
    },

    /**
     * Log an email send
     * @param {Object} logData - Log data
     */
    async logEmail(logData) {
      await database.logEmailSend(logData);
    },

    /**
     * Clear logs
     */
    clear() {
      set([]);
    }
  };
}

export const emailSessionsStore = createEmailSessionsStore();
export const emailLogsStore = createEmailLogsStore();

/**
 * Get email statistics for a contact
 * @param {number} contactId - Contact ID
 * @returns {Promise<Object>} Statistics
 */
export async function getContactEmailStats(contactId) {
  return database.getContactEmailStats(contactId);
}

