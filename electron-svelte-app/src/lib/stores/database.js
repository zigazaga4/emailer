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

    const createTemplatesTable = `
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createEmailSessionsTable = `
      CREATE TABLE IF NOT EXISTS email_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT,
        list_id INTEGER,
        list_name TEXT,
        template_id INTEGER,
        template_name TEXT,
        subject TEXT NOT NULL,
        from_address TEXT NOT NULL,
        total_contacts INTEGER NOT NULL DEFAULT 0,
        successful_sends INTEGER NOT NULL DEFAULT 0,
        failed_sends INTEGER NOT NULL DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        status TEXT NOT NULL DEFAULT 'in_progress',
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL,
        FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
      );
    `;

    const createEmailLogsTable = `
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        template_id INTEGER,
        template_name TEXT,
        from_address TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES email_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
      );
    `;

    this.db.run(createContactsTable);
    this.db.run(createListsTable);
    this.db.run(createListMembershipsTable);
    this.db.run(createWhatsappContactsTable);
    this.db.run(createWhatsappListsTable);
    this.db.run(createWhatsappListMembershipsTable);
    this.db.run(createTemplatesTable);
    this.db.run(createEmailSessionsTable);
    this.db.run(createEmailLogsTable);
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

      // Check if email_templates table exists
      const templatesTablesResult = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='email_templates'"
      );

      const templatesTableExists = templatesTablesResult.length > 0 && templatesTablesResult[0].values.length > 0;

      if (!templatesTableExists) {
        console.log('Running migration: Creating email_templates table...');

        const createTemplatesTable = `
          CREATE TABLE IF NOT EXISTS email_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;

        this.db.run(createTemplatesTable);
        this.saveDatabase();

        console.log('Email templates migration completed successfully!');
      }

      // Check if email_sessions table exists
      const emailSessionsResult = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='email_sessions'"
      );

      const emailSessionsTableExists = emailSessionsResult.length > 0 && emailSessionsResult[0].values.length > 0;

      if (!emailSessionsTableExists) {
        console.log('Running migration: Creating email_sessions and email_logs tables...');

        const createEmailSessionsTable = `
          CREATE TABLE IF NOT EXISTS email_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_name TEXT,
            list_id INTEGER,
            list_name TEXT,
            template_id INTEGER,
            template_name TEXT,
            subject TEXT NOT NULL,
            from_address TEXT NOT NULL,
            total_contacts INTEGER NOT NULL DEFAULT 0,
            successful_sends INTEGER NOT NULL DEFAULT 0,
            failed_sends INTEGER NOT NULL DEFAULT 0,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            status TEXT NOT NULL DEFAULT 'in_progress',
            FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL,
            FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
          );
        `;

        const createEmailLogsTable = `
          CREATE TABLE IF NOT EXISTS email_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            contact_name TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            template_id INTEGER,
            template_name TEXT,
            from_address TEXT NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES email_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
          );
        `;

        this.db.run(createEmailSessionsTable);
        this.db.run(createEmailLogsTable);
        this.saveDatabase();

        console.log('Email tracking migration completed successfully!');
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

  /**
   * Get all email templates
   * @returns {Array} Array of templates
   */
  getAllTemplates() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec('SELECT * FROM email_templates ORDER BY name ASC');

      if (result.length === 0) return [];

      const templates = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        subject: row[2],
        body: row[3],
        created_at: row[4],
        updated_at: row[5],
        fromAddress: 'office@justhemis.com'
      }));

      return templates;
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  /**
   * Add a new email template
   * @param {string} name - Template name
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @returns {Object} The created template
   */
  addTemplate(name, subject, body) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'INSERT INTO email_templates (name, subject, body) VALUES (?, ?, ?)'
      );
      stmt.run([name, subject, body]);
      stmt.free();

      const result = this.db.exec(
        'SELECT * FROM email_templates WHERE id = last_insert_rowid()'
      );

      this.saveDatabase();

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        return {
          id: row[0],
          name: row[1],
          subject: row[2],
          body: row[3],
          created_at: row[4],
          updated_at: row[5],
          fromAddress: 'office@justhemis.com'
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to add template:', error);
      throw error;
    }
  }

  /**
   * Update an email template
   * @param {number} id - Template ID
   * @param {string} name - Template name
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @returns {boolean} Success status
   */
  updateTemplate(id, name, subject, body) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'UPDATE email_templates SET name = ?, subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run([name, subject, body, id]);
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to update template:', error);
      return false;
    }
  }

  /**
   * Delete an email template
   * @param {number} id - Template ID
   * @returns {boolean} Success status
   */
  deleteTemplate(id) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('DELETE FROM email_templates WHERE id = ?');
      stmt.run([id]);
      stmt.free();

      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  }

  /**
   * Create a new email session
   * @param {Object} sessionData - Session data
   * @returns {number} Session ID
   */
  createEmailSession(sessionData) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        `INSERT INTO email_sessions (
          session_name, list_id, list_name, template_id, template_name,
          subject, from_address, total_contacts, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run([
        sessionData.sessionName || null,
        sessionData.listId || null,
        sessionData.listName || null,
        sessionData.templateId || null,
        sessionData.templateName || null,
        sessionData.subject,
        sessionData.fromAddress,
        sessionData.totalContacts,
        'in_progress'
      ]);
      stmt.free();

      const result = this.db.exec('SELECT last_insert_rowid()');
      this.saveDatabase();

      return result[0].values[0][0];
    } catch (error) {
      console.error('Failed to create email session:', error);
      throw error;
    }
  }

  /**
   * Update email session statistics
   * @param {number} sessionId - Session ID
   * @param {Object} stats - Statistics to update
   */
  updateEmailSession(sessionId, stats) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const updates = [];
      const values = [];

      if (stats.successfulSends !== undefined) {
        updates.push('successful_sends = ?');
        values.push(stats.successfulSends);
      }
      if (stats.failedSends !== undefined) {
        updates.push('failed_sends = ?');
        values.push(stats.failedSends);
      }
      if (stats.status !== undefined) {
        updates.push('status = ?');
        values.push(stats.status);
      }
      if (stats.completedAt !== undefined) {
        updates.push('completed_at = ?');
        values.push(stats.completedAt);
      }

      if (updates.length === 0) return;

      values.push(sessionId);

      const stmt = this.db.prepare(
        `UPDATE email_sessions SET ${updates.join(', ')} WHERE id = ?`
      );
      stmt.run(values);
      stmt.free();

      this.saveDatabase();
    } catch (error) {
      console.error('Failed to update email session:', error);
      throw error;
    }
  }

  /**
   * Log an email send attempt
   * @param {Object} logData - Log data
   */
  logEmailSend(logData) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        `INSERT INTO email_logs (
          session_id, contact_id, contact_name, contact_email,
          subject, template_id, template_name, from_address, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run([
        logData.sessionId,
        logData.contactId,
        logData.contactName,
        logData.contactEmail,
        logData.subject,
        logData.templateId || null,
        logData.templateName || null,
        logData.fromAddress,
        logData.status,
        logData.errorMessage || null
      ]);
      stmt.free();

      this.saveDatabase();
    } catch (error) {
      console.error('Failed to log email send:', error);
      throw error;
    }
  }

  /**
   * Get all email sessions
   * @returns {Array} Array of sessions
   */
  getAllEmailSessions() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        'SELECT * FROM email_sessions ORDER BY started_at DESC'
      );

      if (result.length === 0) return [];

      const sessions = result[0].values.map(row => ({
        id: row[0],
        sessionName: row[1],
        listId: row[2],
        listName: row[3],
        templateId: row[4],
        templateName: row[5],
        subject: row[6],
        fromAddress: row[7],
        totalContacts: row[8],
        successfulSends: row[9],
        failedSends: row[10],
        startedAt: row[11],
        completedAt: row[12],
        status: row[13]
      }));

      return sessions;
    } catch (error) {
      console.error('Failed to get email sessions:', error);
      return [];
    }
  }

  /**
   * Get email logs for a specific session
   * @param {number} sessionId - Session ID
   * @returns {Array} Array of email logs
   */
  getEmailLogsForSession(sessionId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        'SELECT * FROM email_logs WHERE session_id = ? ORDER BY sent_at ASC',
        [sessionId]
      );

      if (result.length === 0) return [];

      const logs = result[0].values.map(row => ({
        id: row[0],
        sessionId: row[1],
        contactId: row[2],
        contactName: row[3],
        contactEmail: row[4],
        subject: row[5],
        templateId: row[6],
        templateName: row[7],
        fromAddress: row[8],
        status: row[9],
        errorMessage: row[10],
        sentAt: row[11]
      }));

      return logs;
    } catch (error) {
      console.error('Failed to get email logs for session:', error);
      return [];
    }
  }

  /**
   * Get all email logs for a specific contact
   * @param {number} contactId - Contact ID
   * @returns {Array} Array of email logs
   */
  getEmailLogsForContact(contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        `SELECT el.*, es.session_name, es.started_at as session_started_at
         FROM email_logs el
         LEFT JOIN email_sessions es ON el.session_id = es.id
         WHERE el.contact_id = ?
         ORDER BY el.sent_at DESC`,
        [contactId]
      );

      if (result.length === 0) return [];

      const logs = result[0].values.map(row => ({
        id: row[0],
        sessionId: row[1],
        contactId: row[2],
        contactName: row[3],
        contactEmail: row[4],
        subject: row[5],
        templateId: row[6],
        templateName: row[7],
        fromAddress: row[8],
        status: row[9],
        errorMessage: row[10],
        sentAt: row[11],
        sessionName: row[12],
        sessionStartedAt: row[13]
      }));

      return logs;
    } catch (error) {
      console.error('Failed to get email logs for contact:', error);
      return [];
    }
  }

  /**
   * Get email statistics for a contact
   * @param {number} contactId - Contact ID
   * @returns {Object} Statistics object
   */
  getContactEmailStats(contactId) {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = this.db.exec(
        `SELECT
          COUNT(*) as total_emails,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_emails,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_emails
         FROM email_logs
         WHERE contact_id = ?`,
        [contactId]
      );

      if (result.length === 0 || result[0].values.length === 0) {
        return {
          totalEmails: 0,
          successfulEmails: 0,
          failedEmails: 0
        };
      }

      const row = result[0].values[0];
      return {
        totalEmails: row[0],
        successfulEmails: row[1],
        failedEmails: row[2]
      };
    } catch (error) {
      console.error('Failed to get contact email stats:', error);
      return {
        totalEmails: 0,
        successfulEmails: 0,
        failedEmails: 0
      };
    }
  }
}

// Create singleton instance
const dbService = new DatabaseService();

// Export database instance for use in other stores
export const database = dbService;

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

