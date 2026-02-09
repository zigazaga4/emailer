/**
 * Email Tabs Store
 * Manages multiple email composer tabs with independent settings
 */

import { writable } from 'svelte/store';

/**
 * Email tab state
 * @typedef {Object} EmailTab
 * @property {string} id - Unique tab ID
 * @property {string} name - Tab display name
 * @property {string} fromAddress - Email address to send from
 * @property {number|null} selectedListId - Selected contact list ID
 * @property {boolean} isDirty - Has unsaved changes
 */

/**
 * Create initial tab
 * @param {string} id - Tab ID
 * @param {string} name - Tab name
 * @param {string} fromAddress - From email address
 * @returns {EmailTab}
 */
function createInitialTab(id, name, fromAddress = 'office@justhemis.com') {
  return {
    id,
    name,
    fromAddress,
    selectedListId: null,
    isDirty: false
  };
}

/**
 * Create the email tabs store
 */
function createEmailTabsStore() {
  const { subscribe, set, update } = writable({
    tabs: [createInitialTab('tab-1', 'Email 1')],
    activeTabId: 'tab-1',
    nextTabNumber: 2
  });

  return {
    subscribe,

    /**
     * Add a new tab
     * @param {string} fromAddress - From email address
     */
    addTab(fromAddress = 'office@justhemis.com') {
      update(state => {
        const newTabId = `tab-${state.nextTabNumber}`;
        const newTab = createInitialTab(newTabId, `Email ${state.nextTabNumber}`, fromAddress);
        return {
          ...state,
          tabs: [...state.tabs, newTab],
          activeTabId: newTabId,
          nextTabNumber: state.nextTabNumber + 1
        };
      });
    },

    /**
     * Close a tab
     * @param {string} tabId - Tab ID to close
     */
    closeTab(tabId) {
      update(state => {
        // Don't allow closing the last tab
        if (state.tabs.length === 1) {
          return state;
        }

        const tabIndex = state.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) {
          return state;
        }

        const newTabs = state.tabs.filter(t => t.id !== tabId);
        
        // If closing active tab, switch to another tab
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          // Switch to the tab before the closed one, or the first tab if closing the first tab
          const newIndex = tabIndex > 0 ? tabIndex - 1 : 0;
          newActiveTabId = newTabs[newIndex].id;
        }

        return {
          ...state,
          tabs: newTabs,
          activeTabId: newActiveTabId
        };
      });
    },

    /**
     * Set active tab
     * @param {string} tabId - Tab ID to activate
     */
    setActiveTab(tabId) {
      update(state => ({
        ...state,
        activeTabId: tabId
      }));
    },

    /**
     * Update tab name
     * @param {string} tabId - Tab ID
     * @param {string} name - New name
     */
    updateTabName(tabId, name) {
      update(state => ({
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === tabId ? { ...tab, name } : tab
        )
      }));
    },

    /**
     * Update tab from address
     * @param {string} tabId - Tab ID
     * @param {string} fromAddress - New from address
     */
    updateTabFromAddress(tabId, fromAddress) {
      update(state => ({
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === tabId ? { ...tab, fromAddress, isDirty: true } : tab
        )
      }));
    },

    /**
     * Update tab selected list
     * @param {string} tabId - Tab ID
     * @param {number|null} listId - Selected list ID
     */
    updateTabSelectedList(tabId, listId) {
      update(state => ({
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === tabId ? { ...tab, selectedListId: listId } : tab
        )
      }));
    },

    /**
     * Mark tab as dirty (has unsaved changes)
     * @param {string} tabId - Tab ID
     * @param {boolean} isDirty - Dirty state
     */
    setTabDirty(tabId, isDirty) {
      update(state => ({
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === tabId ? { ...tab, isDirty } : tab
        )
      }));
    },

    /**
     * Get tab by ID
     * @param {string} tabId - Tab ID
     * @returns {EmailTab|undefined}
     */
    getTab(tabId) {
      let result;
      subscribe(state => {
        result = state.tabs.find(t => t.id === tabId);
      })();
      return result;
    }
  };
}

export const emailTabsStore = createEmailTabsStore();

