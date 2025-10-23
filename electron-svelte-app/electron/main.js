import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from './zoho-api.js';
import {
  sendWhatsAppMessage,
  fetchMessage,
  listMessages,
  getTwilioConfig,
  updateTwilioConfig
} from './twilio-api.js';

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
    show: false,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the appropriate URL based on environment
  if (isDevelopment) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools automatically in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html file
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Setup IPC handlers for Zoho API and Twilio WhatsApp API
 */
function setupIPCHandlers() {
  // Zoho Email API handlers
  ipcMain.handle('zoho:sendEmail', async (_event, emailData) => {
    try {
      console.log('[Main] Received sendEmail request');
      const result = await sendEmail(emailData);
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
}

/**
 * App ready event handler
 * Creates the main window when Electron has finished initialization
 */
app.whenReady().then(() => {
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

