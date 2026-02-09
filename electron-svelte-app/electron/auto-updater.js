/**
 * Auto-Updater Module
 * Handles automatic updates from GitHub releases by checking version numbers
 * Downloads updates directly from GitHub release assets
 */

import { app, dialog, shell } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

/**
 * GitHub repository configuration
 */
const GITHUB_OWNER = 'zigazaga4';
const GITHUB_REPO = 'emailer';

/**
 * Store reference to main window for dialogs
 */
let mainWindowRef = null;

/**
 * Compare two semantic version strings
 * @param {string} v1 - First version (e.g., "1.0.0")
 * @param {string} v2 - Second version (e.g., "1.0.1")
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const clean1 = v1.replace(/^v/, '');
  const clean2 = v2.replace(/^v/, '');

  const parts1 = clean1.split('.').map(Number);
  const parts2 = clean2.split('.').map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Fetch all releases from GitHub API and find the highest version
 * @returns {Promise<Object|null>} Highest version release object or null
 */
function fetchHighestVersionRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      method: 'GET',
      headers: {
        'User-Agent': 'Justhemis-Emailer-AutoUpdater',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const releases = JSON.parse(data);

          if (!Array.isArray(releases) || releases.length === 0) {
            console.log('[AutoUpdater] No releases found on GitHub');
            resolve(null);
            return;
          }

          // Filter out drafts and prereleases, then find highest version
          const validReleases = releases.filter(r => !r.draft && !r.prerelease);

          if (validReleases.length === 0) {
            console.log('[AutoUpdater] No valid releases found');
            resolve(null);
            return;
          }

          // Sort by version number (highest first)
          validReleases.sort((a, b) => {
            const versionA = a.tag_name.replace(/^v/, '');
            const versionB = b.tag_name.replace(/^v/, '');
            return compareVersions(versionB, versionA);
          });

          const highestRelease = validReleases[0];
          console.log('[AutoUpdater] Highest version release:', highestRelease.tag_name);
          resolve(highestRelease);
        } catch (error) {
          console.error('[AutoUpdater] Failed to parse releases:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[AutoUpdater] Failed to fetch releases:', error);
      reject(error);
    });

    req.end();
  });
}

/**
 * Get the appropriate asset for the current platform
 * @param {Object} release - GitHub release object
 * @returns {Object|null} Asset object or null
 */
function getAssetForPlatform(release) {
  const platform = process.platform;
  const assets = release.assets || [];

  console.log('[AutoUpdater] Looking for asset for platform:', platform);
  console.log('[AutoUpdater] Available assets:', assets.map(a => a.name).join(', '));

  for (const asset of assets) {
    const name = asset.name.toLowerCase();

    if (platform === 'linux') {
      // Prefer AppImage for Linux
      if (name.endsWith('.appimage')) {
        return asset;
      }
    } else if (platform === 'win32') {
      // Windows installer
      if (name.endsWith('.exe') && !name.includes('blockmap')) {
        return asset;
      }
    } else if (platform === 'darwin') {
      // macOS dmg
      if (name.endsWith('.dmg')) {
        return asset;
      }
    }
  }

  return null;
}

/**
 * Download file from URL with progress reporting
 * @param {string} url - Download URL
 * @param {string} destPath - Destination file path
 * @param {Function} onProgress - Progress callback (percent, transferred, total)
 * @returns {Promise<string>} Downloaded file path
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    console.log('[AutoUpdater] Downloading from:', url);
    console.log('[AutoUpdater] Saving to:', destPath);

    const file = fs.createWriteStream(destPath);

    const request = https.get(url, {
      headers: {
        'User-Agent': 'Justhemis-Emailer-AutoUpdater'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        console.log('[AutoUpdater] Redirecting to:', redirectUrl);
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = totalSize ? (downloadedSize / totalSize) * 100 : 0;
        onProgress(percent, downloadedSize, totalSize);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('[AutoUpdater] Download complete:', destPath);
        resolve(destPath);
      });
    });

    request.on('error', (error) => {
      fs.unlink(destPath, () => {}); // Delete partial file
      reject(error);
    });

    file.on('error', (error) => {
      fs.unlink(destPath, () => {}); // Delete partial file
      reject(error);
    });
  });
}

/**
 * Initialize auto-updater and set up event handlers
 * @param {BrowserWindow} mainWindow - The main application window
 */
export function initAutoUpdater(mainWindow) {
  console.log('[AutoUpdater] Initializing...');
  console.log('[AutoUpdater] Current version:', app.getVersion());
  console.log('[AutoUpdater] Platform:', process.platform);

  mainWindowRef = mainWindow;

  // Check for updates on startup (with delay to let app initialize)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);
}

/**
 * Check for updates by fetching all releases and comparing version numbers
 * @returns {Promise} Update check result
 */
export async function checkForUpdates() {
  console.log('[AutoUpdater] Checking for updates from GitHub (by version number)...');
  console.log('[AutoUpdater] Current app version:', app.getVersion());
  logger.info('updater', 'Checking for updates by version number');

  try {
    // Fetch all releases and find highest version
    const highestRelease = await fetchHighestVersionRelease();

    if (!highestRelease) {
      console.log('[AutoUpdater] No releases found');
      return null;
    }

    const currentVersion = app.getVersion();
    const latestVersion = highestRelease.tag_name.replace(/^v/, '');

    console.log('[AutoUpdater] Current version:', currentVersion);
    console.log('[AutoUpdater] Highest available version:', latestVersion);

    // Compare versions
    const comparison = compareVersions(latestVersion, currentVersion);

    if (comparison > 0) {
      // New version available
      console.log('[AutoUpdater] Update available! Current:', currentVersion, '-> Latest:', latestVersion);
      logger.info('updater', 'Update available', {
        currentVersion,
        latestVersion,
        releaseDate: highestRelease.published_at
      });

      // Find the appropriate asset for this platform
      const asset = getAssetForPlatform(highestRelease);

      if (!asset) {
        console.log('[AutoUpdater] No compatible asset found for this platform');
        dialog.showMessageBox(mainWindowRef, {
          type: 'info',
          title: 'Update Available',
          message: `Version ${latestVersion} is available!`,
          detail: 'No automatic installer available for your platform. Please download manually from GitHub.',
          buttons: ['Open GitHub', 'Later'],
          defaultId: 0,
          cancelId: 1
        }).then((result) => {
          if (result.response === 0) {
            shell.openExternal(highestRelease.html_url);
          }
        });
        return { updateAvailable: true, version: latestVersion, manualOnly: true };
      }

      // Show dialog asking user if they want to download
      const result = await dialog.showMessageBox(mainWindowRef, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${latestVersion}) is available!`,
        detail: `You are running version ${currentVersion}.\nDownload size: ${(asset.size / 1024 / 1024).toFixed(1)} MB\n\nWould you like to download and install it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      });

      if (result.response === 0) {
        // User chose to download
        console.log('[AutoUpdater] User chose to download update');
        console.log('[AutoUpdater] Asset:', asset.name, 'URL:', asset.browser_download_url);

        // Download to temp directory
        const tempDir = app.getPath('temp');
        const destPath = path.join(tempDir, asset.name);

        // Notify renderer about download starting
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('update-downloading', { version: latestVersion });
        }

        try {
          // Download with progress
          await downloadFile(asset.browser_download_url, destPath, (percent, transferred, total) => {
            console.log(`[AutoUpdater] Download progress: ${percent.toFixed(1)}%`);

            if (mainWindowRef && !mainWindowRef.isDestroyed()) {
              mainWindowRef.webContents.send('update-download-progress', {
                percent,
                transferred,
                total
              });
            }
          });

          console.log('[AutoUpdater] Download complete!');
          logger.info('updater', 'Update downloaded', { version: latestVersion, path: destPath });

          // Make executable on Linux
          if (process.platform === 'linux') {
            fs.chmodSync(destPath, 0o755);
          }

          // Show completion dialog
          const installResult = await dialog.showMessageBox(mainWindowRef, {
            type: 'info',
            title: 'Download Complete',
            message: 'Update downloaded successfully!',
            detail: `Version ${latestVersion} has been downloaded.\n\nFile saved to:\n${destPath}\n\nWould you like to open the folder?`,
            buttons: ['Open Folder', 'Close'],
            defaultId: 0,
            cancelId: 1
          });

          if (installResult.response === 0) {
            // Open the folder containing the downloaded file
            shell.showItemInFolder(destPath);
          }

        } catch (downloadError) {
          console.error('[AutoUpdater] Download failed:', downloadError);
          logger.error('updater', 'Download failed', { error: downloadError.message });

          dialog.showMessageBox(mainWindowRef, {
            type: 'error',
            title: 'Download Failed',
            message: 'Failed to download update',
            detail: downloadError.message,
            buttons: ['OK']
          });
        }
      }

      return { updateAvailable: true, version: latestVersion };
    } else {
      console.log('[AutoUpdater] Already on latest version:', currentVersion);
      logger.info('updater', 'Already on latest version', { currentVersion });
      return { updateAvailable: false, version: currentVersion };
    }
  } catch (error) {
    console.error('[AutoUpdater] Failed to check for updates:', error);
    logger.error('updater', 'Failed to check for updates', { error: error.message });
    throw error;
  }
}

/**
 * Get current app version
 * @returns {string} Current version
 */
export function getCurrentVersion() {
  return app.getVersion();
}

export default {
  initAutoUpdater,
  checkForUpdates,
  getCurrentVersion
};
