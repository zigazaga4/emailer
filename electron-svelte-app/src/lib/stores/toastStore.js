/**
 * Toast Notification Store
 * Manages toast notifications to replace blocking alert() calls
 * which cause focus issues on Windows in Electron apps
 */

// Toast state - array of active toasts (using simple array, reactivity handled by subscribers)
let toasts = [];
let subscribers = [];

// Counter for unique toast IDs
let toastIdCounter = 0;

/**
 * Notify all subscribers of state change
 */
function notifySubscribers() {
  subscribers.forEach(callback => callback(toasts));
}

/**
 * Subscribe to toast changes
 * @param {Function} callback - Called with toasts array when it changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  subscribers.push(callback);
  callback(toasts); // Call immediately with current value
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
}

/**
 * Add a toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Toast options
 * @param {string} [options.type='info'] - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} [options.duration=4000] - Duration in ms (0 for persistent)
 * @returns {number} Toast ID for manual dismissal
 */
export function toast(message, options = {}) {
  const {
    type = 'info',
    duration = 4000
  } = options;

  const id = ++toastIdCounter;

  const newToast = {
    id,
    message,
    type,
    createdAt: Date.now()
  };

  toasts = [...toasts, newToast];
  notifySubscribers();

  // Auto-dismiss after duration (if not persistent)
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

/**
 * Show success toast
 * @param {string} message - Success message
 * @param {number} [duration=4000] - Duration in ms
 */
export function toastSuccess(message, duration = 4000) {
  return toast(message, { type: 'success', duration });
}

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {number} [duration=6000] - Duration in ms (longer for errors)
 */
export function toastError(message, duration = 6000) {
  return toast(message, { type: 'error', duration });
}

/**
 * Show warning toast
 * @param {string} message - Warning message
 * @param {number} [duration=5000] - Duration in ms
 */
export function toastWarning(message, duration = 5000) {
  return toast(message, { type: 'warning', duration });
}

/**
 * Show info toast
 * @param {string} message - Info message
 * @param {number} [duration=4000] - Duration in ms
 */
export function toastInfo(message, duration = 4000) {
  return toast(message, { type: 'info', duration });
}

/**
 * Dismiss a specific toast by ID
 * @param {number} id - Toast ID to dismiss
 */
export function dismissToast(id) {
  toasts = toasts.filter(t => t.id !== id);
  notifySubscribers();
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toasts = [];
  notifySubscribers();
}

/**
 * Get current toasts array
 * @returns {Array} Current toasts
 */
export function getToasts() {
  return toasts;
}

/**
 * Toast store object compatible with Svelte store contract
 */
export const toastStore = {
  subscribe,
  toast,
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts
};

export default toastStore;
