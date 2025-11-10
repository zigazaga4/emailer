import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from './email-handler.js';
import {
  sendWhatsAppMessage,
  fetchMessage,
  listMessages,
  getTwilioConfig,
  updateTwilioConfig
} from './twilio-api.js';
import logger from './logger.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Disable hardware acceleration to fix UI rendering issues on Windows/Linux
 * This prevents the UI from getting stuck or becoming unresponsive
 */
app.disableHardwareAcceleration();

/**
 * Main window instance
 */
let mainWindow = null;

/**
 * Determines if the app is running in development mode
 * @returns {boolean} True if in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Creates the main application window
 * Configures window properties and loads the appropriate content
 */
function createWindow() {
  console.log('[Main] Creating window...');
  console.log('[Main] isDevelopment:', isDevelopment);

  // Create the browser window with specified dimensions and properties
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Enable Node.js integration in the renderer process
      nodeIntegration: true,
      // Disable context isolation for simpler communication
      contextIsolation: false,
      // Enable web security
      webSecurity: true,
      // Disable hardware acceleration to fix UI rendering issues on Windows/Linux
      offscreen: false,
    },
    // Ensure proper rendering on all platforms
    backgroundColor: '#1e1e1e',
    show: true,
  });

  console.log('[Main] Window created and shown');

  // Load the appropriate URL based on environment
  if (isDevelopment) {
    // In development, load from Vite dev server
    const devUrl = 'http://localhost:5770';
    console.log('[Main] Loading dev URL:', devUrl);
    mainWindow.loadURL(devUrl).catch(err => {
      console.error('[Main] Failed to load URL:', err);
    });
    // Open DevTools automatically in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html file
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('[Main] Loading file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    console.log('[Main] Window closed');
    mainWindow = null;
  });

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription);
  });
}

/**
 * Setup IPC handlers for Email API and Twilio WhatsApp API
 */
function setupIPCHandlers() {
  // Email API handler - supports both Zoho and cPanel
  ipcMain.handle('zoho:sendEmail', async (_event, emailData, settings) => {
    try {
      console.log('[Main] Received sendEmail request');
      const result = await sendEmail(emailData, settings);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main] sendEmail error:', error);
      return { success: false, error: error.message };
    }
  });

  // Twilio WhatsApp API handlers

  // Send WhatsApp message
  ipcMain.handle('twilio:sendWhatsAppMessage', async (_event, messageData) => {
    try {
      console.log('[Main] Received sendWhatsAppMessage request');
      const result = await sendWhatsAppMessage(messageData);
      return result;
    } catch (error) {
      console.error('[Main] sendWhatsAppMessage error:', error);
      return { success: false, error: error.message };
    }
  });

  // Fetch a specific message by SID
  ipcMain.handle('twilio:fetchMessage', async (_event, messageSid) => {
    try {
      console.log('[Main] Received fetchMessage request');
      const result = await fetchMessage(messageSid);
      return result;
    } catch (error) {
      console.error('[Main] fetchMessage error:', error);
      return { success: false, error: error.message };
    }
  });

  // List messages with filters
  ipcMain.handle('twilio:listMessages', async (_event, filters) => {
    try {
      console.log('[Main] Received listMessages request');
      const result = await listMessages(filters);
      return result;
    } catch (error) {
      console.error('[Main] listMessages error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get Twilio configuration
  ipcMain.handle('twilio:getConfig', async (_event) => {
    try {
      console.log('[Main] Received getConfig request');
      const config = getTwilioConfig();
      return { success: true, data: config };
    } catch (error) {
      console.error('[Main] getConfig error:', error);
      return { success: false, error: error.message };
    }
  });

  // Update Twilio configuration
  ipcMain.handle('twilio:updateConfig', async (_event, config) => {
    try {
      console.log('[Main] Received updateConfig request');
      updateTwilioConfig(config);
      return { success: true };
    } catch (error) {
      console.error('[Main] updateConfig error:', error);
      return { success: false, error: error.message };
    }
  });

  // Logger API handlers

  // Log from renderer process
  ipcMain.handle('logs:log', async (_event, level, category, message, details) => {
    try {
      logger.log(level, category, message, details);
      return { success: true };
    } catch (error) {
      console.error('[Main] log error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get logs
  ipcMain.handle('logs:get', async (_event, options) => {
    try {
      const logs = logger.getLogs(options);
      return { success: true, data: logs };
    } catch (error) {
      console.error('[Main] getLogs error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get log statistics
  ipcMain.handle('logs:getStats', async (_event) => {
    try {
      const stats = logger.getStats();
      return { success: true, data: stats };
    } catch (error) {
      console.error('[Main] getStats error:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear old logs
  ipcMain.handle('logs:clearOld', async (_event, daysToKeep) => {
    try {
      const count = logger.clearOldLogs(daysToKeep);
      return { success: true, data: count };
    } catch (error) {
      console.error('[Main] clearOldLogs error:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * App ready event handler
 * Creates the main window when Electron has finished initialization
 */
app.whenReady().then(async () => {
  // Initialize logger (must await since it's async)
  await logger.initialize();
  logger.info('system', 'Application started');

  setupIPCHandlers();
  createWindow();

  // On macOS, re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed
 * Exception: On macOS, applications typically stay active until explicitly quit
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * App quit event handler
 * Clean up resources before quitting
 */
app.on('before-quit', () => {
  logger.info('system', 'Application shutting down');
  logger.close();
});
