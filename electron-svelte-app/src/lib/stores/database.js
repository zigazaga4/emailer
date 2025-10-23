import initSqlJs from 'sql.js';
import { writable } from 'svelte/store';

/**
 * Database service for managing contacts using SQL.js (pure JavaScript SQLite)
 * This provides full portability across all platforms without native dependencies
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database and create tables if they don't exist
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize SQL.js
      const SQL = await initSqlJs({
        // Load the wasm binary from CDN or local path
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Check if we have saved database in localStorage
      const savedDb = localStorage.getItem('emailer_database');

      if (savedDb) {
        // Load existing database from localStorage
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(uint8Array);
        // Run migrations for existing database
        this.runMigrations();
      } else {
        // Create new database
        this.db = new SQL.Database();
        this.createTables();
      }

      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create database tables for contacts and lists
   */
  createTables() {
    const createContactsTable = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createListsTable = `
      CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createListMembershipsTable = `
      CREATE TABLE IF NOT EXISTS list_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        UNIQUE(list_id, contact_id)
      );
    `;

    const createWhatsappContactsTable = `
      CREATE TABLE IF NOT EXISTS whatsapp_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createWhatsappListsTable = `
      CREATE TABLE IF NOT EXISTS whatsapp_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createWhatsappListMembershipsTable = `
      CREATE TABLE IF NOT EXISTS whatsapp_list_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES whatsapp_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
        UNIQUE(list_id, contact_id)
      );
    `;

    this.db.run(createContactsTable);
    this.db.run(createListsTable);
    this.db.run(createListMembershipsTable);
    this.db.run(createWhatsappContactsTable);
    this.db.run(createWhatsappListsTable);
    this.db.run(createWhatsappListMembershipsTable);
    this.saveDatabase();
  }

  /**
   * Run database migrations for existing databases
   * This checks which tables exist and creates missing ones
   */
  runMigrations() {
    if (!this.db) return;

    try {
      // Check if lists table exists
      const tablesResult = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='lists'"
      );

      const listsTableExists = tablesResult.length > 0 && tablesResult[0].values.length > 0;

      if (!listsTableExists) {
        console.log('Running migration: Creating lists and list_memberships tables...');

        // Create lists table
        const createListsTable = `
          CREATE TABLE IF NOT EXISTS lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;

        // Create list_memberships table
        const createListMembershipsTable = `
          CREATE TABLE IF NOT EXISTS list_memberships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
            UNIQUE(list_id, contact_id)
          );
        `;

        this.db.run(createListsTable);
        this.db.run(createListMembershipsTable);
        this.saveDatabase();

        console.log('Migration completed successfully!');
      }

      // Check if whatsapp_contacts table exists
      const whatsappTablesResult = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='whatsapp_contacts'"
      );

      const whatsappTableExists = whatsappTablesResult.length > 0 && whatsappTablesResult[0].values.length > 0;

      if (!whatsappTableExists) {
        console.log('Running migration: Creating WhatsApp tables...');

        const createWhatsappContactsTable = `
          CREATE TABLE IF NOT EXISTS whatsapp_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;

        const createWhatsappListsTable = `
          CREATE TABLE IF NOT EXISTS whatsapp_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;

        const createWhatsappListMembershipsTable = `
          CREATE TABLE IF NOT EXISTS whatsapp_list_memberships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (list_id) REFERENCES whatsapp_lists(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
            UNIQUE(list_id, contact_id)
          );
        `;

        this.db.run(createWhatsappContactsTable);
        this.db.run(createWhatsappListsTable);
        this.db.run(createWhatsappListMembershipsTable);
        this.saveDatabase();

        console.log('WhatsApp migration completed successfully!');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Save database to localStorage for persistence
   */
  saveDatabase() {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const buffer = Array.from(data);
      localStorage.setItem('emailer_database', JSON.stringify(buffer));
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  /**
   * Add a new contact to the database
   * @param {string} name - Contact name
   * @param {string} email - Contact email
   * @returns {Object} The created contact
   */
  addContact(name, email) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT INTO contacts (name, email) VALUES (?, ?)'
      );
      stmt.run([name, email]);
      stmt.free();

      // Get the last inserted contact
      const result = this.db.exec(
        'SELECT * FROM contacts WHERE id = last_insert_rowid()'
      );

      this.saveDatabase();

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        return {
          id: row[0],
          name: row[1],
          email: row[2],
          created_at: row[3],
          updated_at: row[4]
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to add contact:', error);
      throw error;
    }
  }

  /**
   * Get all contacts from the database
   * @returns {Array} Array of contact objects
   */
  getAllContacts() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec('SELECT * FROM contacts ORDER BY name ASC');
      
      if (result.length === 0) return [];

      const contacts = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return contacts;
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return [];
    }
  }

  /**
   * Delete a contact by ID
   * @param {number} id - Contact ID
   * @returns {boolean} Success status
   */
  deleteContact(id) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('DELETE FROM contacts WHERE id = ?');
      stmt.run([id]);
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete contact:', error);
      return false;
    }
  }

  /**
   * Delete all contacts
   * @returns {boolean} Success status
   */
  deleteAllContacts() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('DELETE FROM contacts');
      stmt.run();
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete all contacts:', error);
      return false;
    }
  }

  /**
   * Update a contact
   * @param {number} id - Contact ID
   * @param {string} name - New name
   * @param {string} email - New email
   * @returns {boolean} Success status
   */
  updateContact(id, name, email) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'UPDATE contacts SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run([name, email, id]);
      stmt.free();
      
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to update contact:', error);
      return false;
    }
  }

  /**
   * Search contacts by name or email
   * @param {string} query - Search query
   * @returns {Array} Array of matching contacts
   */
  searchContacts(query) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        'SELECT * FROM contacts WHERE name LIKE ? OR email LIKE ? ORDER BY name ASC',
        [`%${query}%`, `%${query}%`]
      );

      if (result.length === 0) return [];

      const contacts = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return contacts;
    } catch (error) {
      console.error('Failed to search contacts:', error);
      return [];
    }
  }

  /**
   * Create a new list
   * @param {string} name - List name
   * @param {string} description - List description
   * @returns {Object} The created list
   */
  createList(name, description = '') {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT INTO lists (name, description) VALUES (?, ?)'
      );
      stmt.run([name, description]);
      stmt.free();

      const result = this.db.exec(
        'SELECT * FROM lists WHERE id = last_insert_rowid()'
      );

      this.saveDatabase();

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        return {
          id: row[0],
          name: row[1],
          description: row[2],
          created_at: row[3],
          updated_at: row[4]
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to create list:', error);
      throw error;
    }
  }

  /**
   * Get all lists
   * @returns {Array} Array of list objects
   */
  getAllLists() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec('SELECT * FROM lists ORDER BY name ASC');

      if (result.length === 0) return [];

      const lists = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        description: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return lists;
    } catch (error) {
      console.error('Failed to get lists:', error);
      return [];
    }
  }

  /**
   * Delete a list
   * @param {number} id - List ID
   * @returns {boolean} Success status
   */
  deleteList(id) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('DELETE FROM lists WHERE id = ?');
      stmt.run([id]);
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete list:', error);
      return false;
    }
  }

  /**
   * Add contact to list
   * @param {number} listId - List ID
   * @param {number} contactId - Contact ID
   * @returns {boolean} Success status
   */
  addContactToList(listId, contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT OR IGNORE INTO list_memberships (list_id, contact_id) VALUES (?, ?)'
      );
      stmt.run([listId, contactId]);
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to add contact to list:', error);
      return false;
    }
  }

  /**
   * Remove contact from list
   * @param {number} listId - List ID
   * @param {number} contactId - Contact ID
   * @returns {boolean} Success status
   */
  removeContactFromList(listId, contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'DELETE FROM list_memberships WHERE list_id = ? AND contact_id = ?'
      );
      stmt.run([listId, contactId]);
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to remove contact from list:', error);
      return false;
    }
  }

  /**
   * Get contacts in a list
   * @param {number} listId - List ID
   * @returns {Array} Array of contacts
   */
  getContactsInList(listId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        `SELECT c.* FROM contacts c
         INNER JOIN list_memberships lm ON c.id = lm.contact_id
         WHERE lm.list_id = ?
         ORDER BY c.name ASC`,
        [listId]
      );

      if (result.length === 0) return [];

      const contacts = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return contacts;
    } catch (error) {
      console.error('Failed to get contacts in list:', error);
      return [];
    }
  }

  /**
   * Get lists that contain a specific contact
   * @param {number} contactId - Contact ID
   * @returns {Array} Array of list IDs
   */
  getListsForContact(contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        'SELECT list_id FROM list_memberships WHERE contact_id = ?',
        [contactId]
      );

      if (result.length === 0) return [];

      return result[0].values.map(row => row[0]);
    } catch (error) {
      console.error('Failed to get lists for contact:', error);
      return [];
    }
  }

  /**
   * Add a new WhatsApp contact to the database
   * @param {string} name - Contact name
   * @param {string} phone - Contact phone number
   * @returns {Object} The created contact
   */
  addWhatsAppContact(name, phone) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT INTO whatsapp_contacts (name, phone) VALUES (?, ?)'
      );
      stmt.run([name, phone]);
      stmt.free();

      const result = this.db.exec(
        'SELECT * FROM whatsapp_contacts WHERE id = last_insert_rowid()'
      );

      this.saveDatabase();

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        return {
          id: row[0],
          name: row[1],
          phone: row[2],
          created_at: row[3],
          updated_at: row[4]
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to add WhatsApp contact:', error);
      throw error;
    }
  }

  /**
   * Get all WhatsApp contacts from the database
   * @returns {Array} Array of WhatsApp contacts
   */
  getAllWhatsAppContacts() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec('SELECT * FROM whatsapp_contacts ORDER BY name ASC');

      if (result.length === 0) return [];

      const contacts = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        phone: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return contacts;
    } catch (error) {
      console.error('Failed to get WhatsApp contacts:', error);
      return [];
    }
  }

  /**
   * Delete a WhatsApp contact
   * @param {number} id - Contact ID
   * @returns {boolean} Success status
   */
  deleteWhatsAppContact(id) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.run('DELETE FROM whatsapp_contacts WHERE id = ?', [id]);
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete WhatsApp contact:', error);
      return false;
    }
  }

  /**
   * Delete all WhatsApp contacts
   * @returns {boolean} Success status
   */
  deleteAllWhatsAppContacts() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.run('DELETE FROM whatsapp_contacts');
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete all WhatsApp contacts:', error);
      return false;
    }
  }

  /**
   * Update a WhatsApp contact
   * @param {number} id - Contact ID
   * @param {string} name - New name
   * @param {string} phone - New phone
   * @returns {boolean} Success status
   */
  updateWhatsAppContact(id, name, phone) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.run(
        'UPDATE whatsapp_contacts SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, phone, id]
      );
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to update WhatsApp contact:', error);
      return false;
    }
  }

  /**
   * Get all WhatsApp lists
   * @returns {Array} Array of WhatsApp lists
   */
  getAllWhatsAppLists() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec('SELECT * FROM whatsapp_lists ORDER BY name ASC');

      if (result.length === 0) return [];

      const lists = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        description: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return lists;
    } catch (error) {
      console.error('Failed to get WhatsApp lists:', error);
      return [];
    }
  }

  /**
   * Create a new WhatsApp list
   * @param {string} name - List name
   * @param {string} description - List description
   * @returns {Object} The created list
   */
  createWhatsAppList(name, description = '') {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT INTO whatsapp_lists (name, description) VALUES (?, ?)'
      );
      stmt.run([name, description]);
      stmt.free();

      const result = this.db.exec(
        'SELECT * FROM whatsapp_lists WHERE id = last_insert_rowid()'
      );

      this.saveDatabase();

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        return {
          id: row[0],
          name: row[1],
          description: row[2],
          created_at: row[3],
          updated_at: row[4]
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to create WhatsApp list:', error);
      throw error;
    }
  }

  /**
   * Delete a WhatsApp list
   * @param {number} id - List ID
   * @returns {boolean} Success status
   */
  deleteWhatsAppList(id) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.run('DELETE FROM whatsapp_lists WHERE id = ?', [id]);
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete WhatsApp list:', error);
      return false;
    }
  }

  /**
   * Add a WhatsApp contact to a list
   * @param {number} listId - List ID
   * @param {number} contactId - Contact ID
   * @returns {boolean} Success status
   */
  addWhatsAppContactToList(listId, contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT OR IGNORE INTO whatsapp_list_memberships (list_id, contact_id) VALUES (?, ?)'
      );
      stmt.run([listId, contactId]);
      stmt.free();
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to add WhatsApp contact to list:', error);
      return false;
    }
  }

  /**
   * Remove a WhatsApp contact from a list
   * @param {number} listId - List ID
   * @param {number} contactId - Contact ID
   * @returns {boolean} Success status
   */
  removeWhatsAppContactFromList(listId, contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.run(
        'DELETE FROM whatsapp_list_memberships WHERE list_id = ? AND contact_id = ?',
        [listId, contactId]
      );
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to remove WhatsApp contact from list:', error);
      return false;
    }
  }

  /**
   * Get WhatsApp contacts in a specific list
   * @param {number} listId - List ID
   * @returns {Array} Array of WhatsApp contacts
   */
  getWhatsAppContactsInList(listId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        `SELECT c.* FROM whatsapp_contacts c
         INNER JOIN whatsapp_list_memberships lm ON c.id = lm.contact_id
         WHERE lm.list_id = ?
         ORDER BY c.name ASC`,
        [listId]
      );

      if (result.length === 0) return [];

      const contacts = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        phone: row[2],
        created_at: row[3],
        updated_at: row[4]
      }));

      return contacts;
    } catch (error) {
      console.error('Failed to get WhatsApp contacts in list:', error);
      return [];
    }
  }

  /**
   * Get WhatsApp lists that contain a specific contact
   * @param {number} contactId - Contact ID
   * @returns {Array} Array of list IDs
   */
  getWhatsAppListsForContact(contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        'SELECT list_id FROM whatsapp_list_memberships WHERE contact_id = ?',
        [contactId]
      );

      if (result.length === 0) return [];

      return result[0].values.map(row => row[0]);
    } catch (error) {
      console.error('Failed to get WhatsApp lists for contact:', error);
      return [];
    }
  }
}

// Create singleton instance
const dbService = new DatabaseService();

// Create Svelte stores for contacts and lists
export const contactsStore = writable([]);
export const listsStore = writable([]);
// Store to trigger reactivity when list memberships change
export const listMembershipsVersion = writable(0);

// Create Svelte stores for WhatsApp contacts and lists
export const whatsappContactsStore = writable([]);
export const whatsappListsStore = writable([]);
// Store to trigger reactivity when WhatsApp list memberships change
export const whatsappListMembershipsVersion = writable(0);

/**
 * Initialize database and load contacts and lists
 */
export async function initDatabase() {
  await dbService.initialize();
  refreshContacts();
  refreshLists();
  refreshWhatsAppContacts();
  refreshWhatsAppLists();
}

/**
 * Refresh contacts store from database
 */
export function refreshContacts() {
  const contacts = dbService.getAllContacts();
  contactsStore.set(contacts);
}

/**
 * Refresh lists store from database
 */
export function refreshLists() {
  const lists = dbService.getAllLists();
  listsStore.set(lists);
}

/**
 * Add a new contact
 */
export function addContact(name, email) {
  const contact = dbService.addContact(name, email);
  refreshContacts();
  return contact;
}

/**
 * Delete a contact
 */
export function deleteContact(id) {
  const success = dbService.deleteContact(id);
  if (success) {
    refreshContacts();
    // Trigger list membership reactivity since CASCADE deletes memberships
    listMembershipsVersion.update(v => v + 1);
  }
  return success;
}

/**
 * Delete all contacts
 */
export function deleteAllContacts() {
  const success = dbService.deleteAllContacts();
  if (success) {
    refreshContacts();
    // Trigger list membership reactivity since CASCADE deletes all memberships
    listMembershipsVersion.update(v => v + 1);
  }
  return success;
}

/**
 * Update a contact
 */
export function updateContact(id, name, email) {
  const success = dbService.updateContact(id, name, email);
  if (success) refreshContacts();
  return success;
}

/**
 * Search contacts
 */
export function searchContacts(query) {
  return dbService.searchContacts(query);
}

/**
 * Create a new list
 */
export function createList(name, description = '') {
  const list = dbService.createList(name, description);
  refreshLists();
  return list;
}

/**
 * Delete a list
 */
export function deleteList(id) {
  const success = dbService.deleteList(id);
  if (success) refreshLists();
  return success;
}

/**
 * Add contact to list
 */
export function addContactToList(listId, contactId) {
  const result = dbService.addContactToList(listId, contactId);
  // Increment version to trigger reactivity
  listMembershipsVersion.update(v => v + 1);
  return result;
}

/**
 * Remove contact from list
 */
export function removeContactFromList(listId, contactId) {
  const result = dbService.removeContactFromList(listId, contactId);
  // Increment version to trigger reactivity
  listMembershipsVersion.update(v => v + 1);
  return result;
}

/**
 * Get contacts in a list
 */
export function getContactsInList(listId) {
  return dbService.getContactsInList(listId);
}

/**
 * Get lists for a contact
 */
export function getListsForContact(contactId) {
  return dbService.getListsForContact(contactId);
}

/**
 * Refresh WhatsApp contacts store from database
 */
export function refreshWhatsAppContacts() {
  const contacts = dbService.getAllWhatsAppContacts();
  whatsappContactsStore.set(contacts);
}

/**
 * Refresh WhatsApp lists store from database
 */
export function refreshWhatsAppLists() {
  const lists = dbService.getAllWhatsAppLists();
  whatsappListsStore.set(lists);
}

/**
 * Add a new WhatsApp contact
 */
export function addWhatsAppContact(name, phone) {
  const contact = dbService.addWhatsAppContact(name, phone);
  refreshWhatsAppContacts();
  return contact;
}

/**
 * Delete a WhatsApp contact
 */
export function deleteWhatsAppContact(id) {
  const success = dbService.deleteWhatsAppContact(id);
  if (success) {
    refreshWhatsAppContacts();
    whatsappListMembershipsVersion.update(v => v + 1);
  }
  return success;
}

/**
 * Delete all WhatsApp contacts
 */
export function deleteAllWhatsAppContacts() {
  const success = dbService.deleteAllWhatsAppContacts();
  if (success) {
    refreshWhatsAppContacts();
    whatsappListMembershipsVersion.update(v => v + 1);
  }
  return success;
}

/**
 * Update a WhatsApp contact
 */
export function updateWhatsAppContact(id, name, phone) {
  const success = dbService.updateWhatsAppContact(id, name, phone);
  if (success) refreshWhatsAppContacts();
  return success;
}

/**
 * Create a new WhatsApp list
 */
export function createWhatsAppList(name, description = '') {
  const list = dbService.createWhatsAppList(name, description);
  refreshWhatsAppLists();
  return list;
}

/**
 * Delete a WhatsApp list
 */
export function deleteWhatsAppList(id) {
  const success = dbService.deleteWhatsAppList(id);
  if (success) refreshWhatsAppLists();
  return success;
}

/**
 * Add WhatsApp contact to list
 */
export function addWhatsAppContactToList(listId, contactId) {
  const result = dbService.addWhatsAppContactToList(listId, contactId);
  whatsappListMembershipsVersion.update(v => v + 1);
  return result;
}

/**
 * Remove WhatsApp contact from list
 */
export function removeWhatsAppContactFromList(listId, contactId) {
  const result = dbService.removeWhatsAppContactFromList(listId, contactId);
  whatsappListMembershipsVersion.update(v => v + 1);
  return result;
}

/**
 * Get WhatsApp contacts in a list
 */
export function getWhatsAppContactsInList(listId) {
  return dbService.getWhatsAppContactsInList(listId);
}

/**
 * Get WhatsApp lists for a contact
 */
export function getWhatsAppListsForContact(contactId) {
  return dbService.getWhatsAppListsForContact(contactId);
}

export default dbService;

