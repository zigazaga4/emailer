/**
 * Application Logger with SQLite Storage (Pure JavaScript)
 * Uses sql.js - pure JavaScript SQLite with no native dependencies
 * Stores all application logs in a SQLite database for debugging and monitoring
 */

import initSqlJs from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

class Logger {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.isInitialized = false;
    this.dbPath = null;
  }

  /**
   * Initialize the logger database
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: file => {
          // In production (packaged app), WASM file is in app.asar.unpacked
          // In development, it's in node_modules
          if (app.isPackaged) {
            return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file);
          } else {
            return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
          }
        }
      });

      // Create logs directory in user data
      const userDataPath = app.getPath('userData');
      const logsDir = path.join(userDataPath, 'logs');
      
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Database file path
      this.dbPath = path.join(logsDir, 'app-logs.db');

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
      } else {
        this.db = new this.SQL.Database();
      }

      // Create logs table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          level TEXT NOT NULL,
          category TEXT NOT NULL,
          message TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);`);

      // Save database to disk
      this.saveDatabase();

      this.isInitialized = true;
      console.log('[Logger] Initialized successfully with sql.js (pure JavaScript)');
    } catch (error) {
      console.error('[Logger] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Save database to disk
   */
  saveDatabase() {
    if (!this.db || !this.dbPath) return;

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      console.error('[Logger] Failed to save database:', error);
    }
  }

  /**
   * Log a message
   */
  log(level, category, message, details = null) {
    if (!this.isInitialized || !this.db) {
      console.warn('[Logger] Not initialized, skipping log');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const detailsJson = details ? JSON.stringify(details) : null;

      this.db.run(
        `INSERT INTO logs (timestamp, level, category, message, details) VALUES (?, ?, ?, ?, ?)`,
        [timestamp, level, category, message, detailsJson]
      );

      // Save to disk after each log
      this.saveDatabase();
    } catch (error) {
      console.error('[Logger] Failed to log message:', error);
    }
  }

  info(category, message, details = null) {
    this.log('info', category, message, details);
  }

  warn(category, message, details = null) {
    this.log('warn', category, message, details);
  }

  error(category, message, details = null) {
    this.log('error', category, message, details);
  }

  debug(category, message, details = null) {
    this.log('debug', category, message, details);
  }

  getLogs(options = {}) {
    if (!this.isInitialized || !this.db) {
      return [];
    }

    try {
      let query = 'SELECT * FROM logs WHERE 1=1';
      const params = [];

      if (options.level) {
        query += ' AND level = ?';
        params.push(options.level);
      }

      if (options.category) {
        query += ' AND category = ?';
        params.push(options.category);
      }

      if (options.search) {
        query += ' AND message LIKE ?';
        params.push(`%${options.search}%`);
      }

      query += ' ORDER BY id DESC LIMIT 1000';

      const stmt = this.db.prepare(query);
      stmt.bind(params);

      const logs = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        if (row.details) {
          try {
            row.details = JSON.parse(row.details);
          } catch (e) {
            // Keep as string
          }
        }
        logs.push(row);
      }
      stmt.free();

      return logs;
    } catch (error) {
      console.error('[Logger] Failed to get logs:', error);
      return [];
    }
  }

  getStats() {
    if (!this.isInitialized || !this.db) {
      return { total: 0, byLevel: [], byCategory: [] };
    }

    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM logs');
      totalStmt.step();
      const total = totalStmt.getAsObject().count;
      totalStmt.free();

      const levelStmt = this.db.prepare('SELECT level, COUNT(*) as count FROM logs GROUP BY level');
      const byLevel = [];
      while (levelStmt.step()) {
        byLevel.push(levelStmt.getAsObject());
      }
      levelStmt.free();

      const categoryStmt = this.db.prepare('SELECT category, COUNT(*) as count FROM logs GROUP BY category');
      const byCategory = [];
      while (categoryStmt.step()) {
        byCategory.push(categoryStmt.getAsObject());
      }
      categoryStmt.free();

      return { total, byLevel, byCategory };
    } catch (error) {
      console.error('[Logger] Failed to get stats:', error);
      return { total: 0, byLevel: [], byCategory: [] };
    }
  }

  clearOldLogs(daysToKeep = 30) {
    if (!this.isInitialized || !this.db) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = cutoffDate.toISOString();

      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM logs WHERE timestamp < ?');
      countStmt.bind([cutoffTimestamp]);
      countStmt.step();
      const count = countStmt.getAsObject().count;
      countStmt.free();

      this.db.run('DELETE FROM logs WHERE timestamp < ?', [cutoffTimestamp]);
      this.saveDatabase();

      return count;
    } catch (error) {
      console.error('[Logger] Failed to clear old logs:', error);
      return 0;
    }
  }

  close() {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

const logger = new Logger();
export default logger;
