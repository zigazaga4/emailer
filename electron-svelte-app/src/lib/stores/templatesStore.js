/**
 * Email Templates Store
 * Manages email templates with subject, body, and attachments
 */

import { writable } from 'svelte/store';
import { database } from './database.js';

/**
 * Email template
 * @typedef {Object} EmailTemplate
 * @property {number} id - Template ID
 * @property {string} name - Template name
 * @property {string} subject - Email subject
 * @property {string} body - Email body (HTML)
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 */

/**
 * Create templates store
 */
function createTemplatesStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,

    /**
     * Load all templates from database
     */
    async loadTemplates() {
      const templates = await database.getAllTemplates();
      set(templates);
    },

    /**
     * Add a new template
     * @param {string} name - Template name
     * @param {string} subject - Email subject
     * @param {string} body - Email body
     */
    async addTemplate(name, subject, body) {
      const template = await database.addTemplate(name, subject, body);
      update(templates => [...templates, template]);
      return template;
    },

    /**
     * Update a template
     * @param {number} id - Template ID
     * @param {string} name - Template name
     * @param {string} subject - Email subject
     * @param {string} body - Email body
     */
    async updateTemplate(id, name, subject, body) {
      const success = await database.updateTemplate(id, name, subject, body);
      if (success) {
        update(templates => 
          templates.map(t => 
            t.id === id 
              ? { ...t, name, subject, body, updated_at: new Date().toISOString() }
              : t
          )
        );
      }
      return success;
    },

    /**
     * Delete a template
     * @param {number} id - Template ID
     */
    async deleteTemplate(id) {
      const success = await database.deleteTemplate(id);
      if (success) {
        update(templates => templates.filter(t => t.id !== id));
      }
      return success;
    },

    /**
     * Get template by ID
     * @param {number} id - Template ID
     * @returns {EmailTemplate|undefined}
     */
    getTemplate(id) {
      let result;
      subscribe(templates => {
        result = templates.find(t => t.id === id);
      })();
      return result;
    }
  };
}

export const templatesStore = createTemplatesStore();

