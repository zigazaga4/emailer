<script>
  import { X, RefreshCw, Trash2, Download } from 'lucide-svelte';

  // @ts-ignore - window.require is available in Electron renderer with nodeIntegration
  const { ipcRenderer } = window.require('electron');

  let { isOpen = false, onClose = () => {} } = $props();

  let logs = $state([]);
  let stats = $state({ total: 0, byLevel: [], byCategory: [] });
  let isLoading = $state(false);
  let filters = $state({
    level: '',
    category: '',
    search: ''
  });

  /**
   * Load logs from main process
   */
  async function loadLogs() {
    isLoading = true;
    try {
      // Convert reactive state to plain object for IPC
      const plainFilters = {
        level: filters.level,
        category: filters.category,
        search: filters.search
      };
      const result = await ipcRenderer.invoke('logs:get', plainFilters);
      if (result.success) {
        logs = result.data;
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Load statistics
   */
  async function loadStats() {
    try {
      const result = await ipcRenderer.invoke('logs:getStats');
      if (result.success) {
        stats = result.data;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  /**
   * Clear old logs
   */
  async function clearOldLogs() {
    if (!confirm('Clear logs older than 30 days?')) return;

    try {
      const result = await ipcRenderer.invoke('logs:clearOld', 30);
      if (result.success) {
        alert(`Cleared ${result.data} old log entries`);
        await loadLogs();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
      alert('Failed to clear logs');
    }
  }

  /**
   * Export logs to JSON
   */
  function exportLogs() {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `app-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get level color
   * @param {string} level - Log level
   * @returns {string} Color code
   */
  function getLevelColor(level) {
    switch (level) {
      case 'error': return '#ff4444';
      case 'warn': return '#ffaa00';
      case 'info': return '#00aaff';
      case 'debug': return '#888';
      default: return '#fff';
    }
  }

  /**
   * Format timestamp
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted timestamp
   */
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Handle backdrop keydown for accessibility
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleBackdropKeydown(e) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  /**
   * Handle backdrop click
   * @param {MouseEvent} e - Mouse event
   */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  /**
   * Handle filter change
   */
  function handleFilterChange() {
    loadLogs();
  }

  /**
   * Handle modal close
   */
  function handleClose() {
    onClose();
  }

  /**
   * Load data when modal opens
   */
  $effect(() => {
    if (isOpen) {
      loadLogs();
      loadStats();
    }
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Application Logs</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close modal">
          <X size={24} />
        </button>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-label">Total:</span>
          <span class="stat-value">{stats.total}</span>
        </div>
        {#each stats.byLevel as levelStat}
          <div class="stat">
            <span class="stat-label" style="color: {getLevelColor(levelStat.level)}">{levelStat.level}:</span>
            <span class="stat-value">{levelStat.count}</span>
          </div>
        {/each}
      </div>

      <div class="filters-bar">
        <select bind:value={filters.level} onchange={handleFilterChange} class="filter-select">
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>

        <select bind:value={filters.category} onchange={handleFilterChange} class="filter-select">
          <option value="">All Categories</option>
          <option value="email">Email</option>
          <option value="system">System</option>
          <option value="database">Database</option>
          <option value="logger">Logger</option>
        </select>

        <input
          type="text"
          bind:value={filters.search}
          oninput={handleFilterChange}
          placeholder="Search logs..."
          class="filter-input"
        />

        <button onclick={loadLogs} class="action-btn" title="Refresh">
          <RefreshCw size={18} />
        </button>

        <button onclick={clearOldLogs} class="action-btn" title="Clear old logs">
          <Trash2 size={18} />
        </button>

        <button onclick={exportLogs} class="action-btn" title="Export logs">
          <Download size={18} />
        </button>
      </div>

      <div class="modal-body">
        {#if isLoading}
          <div class="loading">Loading logs...</div>
        {:else if logs.length === 0}
          <div class="empty-state">No logs found</div>
        {:else}
          <div class="logs-list">
            {#each logs as log}
              <div class="log-entry" data-level={log.level}>
                <div class="log-header">
                  <span class="log-level" style="color: {getLevelColor(log.level)}">[{log.level.toUpperCase()}]</span>
                  <span class="log-category">[{log.category}]</span>
                  <span class="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                </div>
                <div class="log-message">{log.message}</div>
                {#if log.details}
                  <details class="log-details">
                    <summary>Details</summary>
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </details>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }

  .modal-content {
    background-color: #1e1e1e;
    border-radius: 12px;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid #333;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
  }

  .close-button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background-color: transparent;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
  }

  .close-button:hover {
    background-color: #444;
    color: #fff;
  }

  .close-button:active {
    transform: scale(0.95);
  }

  .stats-bar {
    display: flex;
    gap: 24px;
    padding: 16px 24px;
    background-color: #2a2a2a;
    border-bottom: 1px solid #333;
  }

  .stat {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #888;
    font-weight: 500;
  }

  .stat-value {
    font-size: 1rem;
    color: #fff;
    font-weight: 600;
  }

  .filters-bar {
    display: flex;
    gap: 12px;
    padding: 16px 24px;
    background-color: #252525;
    border-bottom: 1px solid #333;
  }

  .filter-select,
  .filter-input {
    padding: 8px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
  }

  .filter-select {
    min-width: 150px;
  }

  .filter-input {
    flex: 1;
  }

  .filter-select:focus,
  .filter-input:focus {
    border-color: #0066ff;
  }

  .action-btn {
    padding: 8px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #1e1e1e;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background-color: #2a2a2a;
    color: #fff;
    border-color: #666;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
  }

  .loading,
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #888;
    font-size: 1rem;
  }

  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .log-entry {
    background-color: #252525;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 12px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.85rem;
  }

  .log-entry[data-level="error"] {
    border-left: 3px solid #ff4444;
  }

  .log-entry[data-level="warn"] {
    border-left: 3px solid #ffaa00;
  }

  .log-entry[data-level="info"] {
    border-left: 3px solid #00aaff;
  }

  .log-header {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .log-level {
    font-weight: 600;
  }

  .log-category {
    color: #aaa;
  }

  .log-timestamp {
    color: #666;
    margin-left: auto;
  }

  .log-message {
    color: #fff;
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .log-details {
    margin-top: 8px;
  }

  .log-details summary {
    color: #0066ff;
    cursor: pointer;
    user-select: none;
    padding: 4px 0;
  }

  .log-details summary:hover {
    color: #3388ff;
  }

  .log-details pre {
    margin: 8px 0 0 0;
    padding: 12px;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    color: #aaa;
    overflow-x: auto;
    font-size: 0.8rem;
  }
</style>

