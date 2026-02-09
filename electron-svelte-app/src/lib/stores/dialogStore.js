/**
 * Dialog Store
 * Manages non-blocking confirmation and prompt dialogs to replace blocking browser dialogs
 * Blocking confirm()/prompt()/alert() cause severe UI issues on Windows in Electron
 */

/**
 * Dialog state
 */
let dialogState = {
  isOpen: false,
  type: 'confirm', // 'confirm' | 'prompt' | 'alert'
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  placeholder: '',
  inputValue: '',
  dangerous: false, // If true, confirm button is red
  resolve: null
};

/**
 * Subscribers list
 */
let subscribers = [];

/**
 * Notify all subscribers of state change
 */
function notify() {
  subscribers.forEach(callback => callback(dialogState));
}

/**
 * Subscribe to state changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  subscribers.push(callback);
  callback(dialogState);
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
}

/**
 * Show a confirmation dialog (non-blocking replacement for confirm())
 * @param {string} message - Message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Dialog title
 * @param {string} options.confirmText - Confirm button text
 * @param {string} options.cancelText - Cancel button text
 * @param {boolean} options.dangerous - If true, confirm button is red
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export function confirm(message, options = {}) {
  return new Promise(resolve => {
    dialogState = {
      isOpen: true,
      type: 'confirm',
      title: options.title || 'Confirm',
      message,
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      placeholder: '',
      inputValue: '',
      dangerous: options.dangerous || false,
      resolve
    };
    notify();
  });
}

/**
 * Show a prompt dialog (non-blocking replacement for prompt())
 * @param {string} message - Message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Dialog title
 * @param {string} options.placeholder - Input placeholder
 * @param {string} options.defaultValue - Default input value
 * @param {string} options.confirmText - Confirm button text
 * @param {string} options.cancelText - Cancel button text
 * @returns {Promise<string|null>} Input value if confirmed, null if cancelled
 */
export function prompt(message, options = {}) {
  return new Promise(resolve => {
    dialogState = {
      isOpen: true,
      type: 'prompt',
      title: options.title || 'Input',
      message,
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      placeholder: options.placeholder || '',
      inputValue: options.defaultValue || '',
      dangerous: false,
      resolve
    };
    notify();
  });
}

/**
 * Show an alert dialog (non-blocking replacement for alert())
 * @param {string} message - Message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Dialog title
 * @param {string} options.confirmText - OK button text
 * @returns {Promise<void>}
 */
export function alert(message, options = {}) {
  return new Promise(resolve => {
    dialogState = {
      isOpen: true,
      type: 'alert',
      title: options.title || 'Alert',
      message,
      confirmText: options.confirmText || 'OK',
      cancelText: '',
      placeholder: '',
      inputValue: '',
      dangerous: false,
      resolve: () => resolve()
    };
    notify();
  });
}

/**
 * Close the dialog with a result
 * @param {boolean|string|null} result - Dialog result
 */
export function closeDialog(result) {
  const { resolve } = dialogState;
  dialogState = {
    ...dialogState,
    isOpen: false
  };
  notify();

  if (resolve) {
    resolve(result);
  }
}

/**
 * Update input value (for prompt dialogs)
 * @param {string} value - New input value
 */
export function updateInputValue(value) {
  dialogState = {
    ...dialogState,
    inputValue: value
  };
  notify();
}

/**
 * Get current dialog state (for reading)
 * @returns {Object} Current dialog state
 */
export function getState() {
  return { ...dialogState };
}

export default {
  subscribe,
  confirm,
  prompt,
  alert,
  closeDialog,
  updateInputValue,
  getState
};
