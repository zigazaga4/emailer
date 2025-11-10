<script>
  /**
   * Email Composer Component
   * Full-featured email composition interface with rich text editing
   */

  import { X } from 'lucide-svelte';
  import { sendEmail as sendEmailViaIPC } from '../../services/zoho-ipc.js';
  import { contactsStore, getContactsInList, listsStore, listMembershipsVersion } from '../../stores/database.js';
  import { emailSendingProgress } from '../../stores/emailSendingStore.js';
  import logger from '../../services/logger-ipc.js';

  /**
   * Component props
   */
  let { selectedListId = null } = $props();

  /**
   * Email form state
   */
  let subject = $state('');
  let body = $state('');
  let attachments = $state([]);

  /**
   * UI state
   */
  let isSending = $state(false);
  let showPreview = $state(false);
  let sendingProgress = $state({ current: 0, total: 0, currentEmail: '' });

  /**
   * Parameter autocomplete state
   */
  let showParamDropdown = $state(false);
  let paramDropdownPosition = $state({ top: 0, left: 0 });
  let paramSearchQuery = $state('');
  let selectedParamIndex = $state(0);
  let activeInputElement = $state(null);

  /**
   * Button customization modal state
   */
  let showButtonModal = $state(false);
  let showUnsubscribeModal = $state(false);
  let showLayoutModal = $state(false);
  let buttonConfig = $state({
    text: 'Click Here',
    url: 'https://example.com',
    backgroundColor: '#0066ff',
    textColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px'
  });
  let unsubscribeConfig = $state({
    text: 'Unsubscribe',
    url: 'https://example.com/unsubscribe',
    backgroundColor: '#777777',
    textColor: '#ffffff',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '14px'
  });
  let layoutConfig = $state({
    leftContent: '',
    rightContent: '',
    leftAlign: 'left',
    rightAlign: 'right',
    gap: '20px',
    padding: '20px 0',
    leftButtonType: 'none',
    rightButtonType: 'none',
    leftButtonText: 'Click Here',
    leftButtonUrl: 'https://example.com',
    leftButtonBg: '#0066ff',
    leftButtonColor: '#ffffff',
    rightButtonText: 'Unsubscribe',
    rightButtonUrl: 'https://example.com/unsubscribe',
    rightButtonBg: '#777777',
    rightButtonColor: '#ffffff'
  });

  let selectedImage = $state(null);
  let isResizingImage = $state(false);

  /**
   * Available parameters for email templates
   */
  const availableParams = [
    { name: 'name', description: 'Contact name' },
    { name: 'email', description: 'Contact email' }
  ];

  /**
   * Filtered parameters based on search query
   */
  let filteredParams = $derived.by(() => {
    const query = paramSearchQuery.toLowerCase();

    // If query is empty or matches "param", show all
    if (!query || 'param'.startsWith(query)) {
      return availableParams;
    }

    // Otherwise filter by parameter name
    return availableParams.filter(param =>
      param.name.toLowerCase().includes(query)
    );
  });

  /**
   * Text formatting state
   */
  let isBold = $state(false);
  let isItalic = $state(false);
  let isUnderline = $state(false);

  /**
   * Effect to attach image resize handlers when body changes
   */
  $effect(() => {
    if (body) {
      setTimeout(() => {
        attachImageResizeHandlers();
      }, 100);
    }
  });

  /**
   * Replace parameters in text with actual contact data
   * Handles both plain text {param(name)} and HTML with highlighting spans
   * @param {string} text - Text with {param(name)} placeholders (can be plain text or HTML)
   * @param {Object} contact - Contact object
   * @returns {string} Text with replaced parameters
   */
  function replaceParameters(text, contact) {
    // First, handle HTML with highlighting spans
    // Pattern: <span class="param-highlight">{param(<span class="param-name">name</span>)}</span>
    let result = text.replace(
      /<span class="param-highlight">\{param\(<span class="param-name">(\w+)<\/span>\)\}<\/span>/g,
      (match, paramName) => {
        const value = contact[paramName];
        return value !== undefined && value !== null ? String(value) : match;
      }
    );

    // Handle corrupted HTML where spans might be broken
    // Pattern: {param(<span class="param-name">name</span>)} or variations
    result = result.replace(
      /\{param\(<span class="param-name">(\w+)<\/span>\)\}/g,
      (match, paramName) => {
        const value = contact[paramName];
        return value !== undefined && value !== null ? String(value) : match;
      }
    );

    // Handle plain text parameters (for subject line and any plain text)
    // Pattern: {param(name)}
    result = result.replace(/\{param\((\w+)\)\}/g, (match, paramName) => {
      const value = contact[paramName];
      return value !== undefined && value !== null ? String(value) : match;
    });

    return result;
  }

  /**
   * Validate that all parameters were replaced
   * @param {string} text - Text to validate
   * @returns {Object} { isValid: boolean, unreplacedParams: Array }
   */
  function validateParameterReplacement(text) {
    const unreplacedParams = [];

    // Check for any remaining {param(...)} patterns
    const paramPattern = /\{param\((\w+)\)\}/g;
    let match;

    while ((match = paramPattern.exec(text)) !== null) {
      unreplacedParams.push(match[1]);
    }

    // Also check for span-wrapped params
    const spanParamPattern = /\{param\(<span class="param-name">(\w+)<\/span>\)\}/g;
    while ((match = spanParamPattern.exec(text)) !== null) {
      unreplacedParams.push(match[1]);
    }

    return {
      isValid: unreplacedParams.length === 0,
      unreplacedParams: [...new Set(unreplacedParams)]
    };
  }



  /**
   * Handle input in subject or body to detect { trigger
   * @param {Event} event - Input event
   */
  function handleInput(event) {
    const target = event.target;
    if (!target) return;

    // Get text content based on element type
    let text = '';
    let cursorPos = 0;

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      text = target.value || '';
      cursorPos = target.selectionStart || 0;
    } else if (target instanceof HTMLElement) {
      text = target.textContent || '';
      cursorPos = getCaretPosition(target);
    } else {
      return;
    }

    // Check if user is typing inside { } for parameters
    const beforeCursor = text.substring(0, cursorPos);

    // Match {param( or just { followed by any text
    const paramMatch = beforeCursor.match(/\{param\(([^)]*?)$/);
    const braceMatch = beforeCursor.match(/\{([^}]*?)$/);

    if (paramMatch || braceMatch) {
      // Store active element
      activeInputElement = target;

      // Extract search query
      if (paramMatch) {
        // User is typing inside {param(...)
        paramSearchQuery = paramMatch[1];
      } else if (braceMatch) {
        // User just typed { or is typing the command
        paramSearchQuery = braceMatch[1];
      }

      selectedParamIndex = 0;
      showParamDropdown = true;

      // Position dropdown near cursor
      if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rangeRect = range.getBoundingClientRect();
          paramDropdownPosition = {
            top: rangeRect.bottom + window.scrollY + 5,
            left: rangeRect.left + window.scrollX
          };
        } else {
          paramDropdownPosition = {
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX
          };
        }
      }
    } else {
      showParamDropdown = false;
      activeInputElement = null;
    }
  }

  /**
   * Get caret position in contenteditable element
   * @param {HTMLElement} element - The element
   * @returns {number} Caret position
   */
  function getCaretPosition(element) {
    let caretPos = 0;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretPos = preCaretRange.toString().length;
    }
    return caretPos;
  }

  /**
   * Insert parameter at cursor position
   * @param {string} paramName - Parameter name to insert
   * @param {HTMLElement} element - Target element
   */
  function insertParameter(paramName, element) {
    console.log('Inserting parameter:', paramName, 'into element:', element);

    // Check if it's the subject input or body editor
    const isSubject = element.tagName === 'INPUT';
    const isBody = element.contentEditable === 'true';

    if (isSubject && element instanceof HTMLInputElement) {
      // Handle subject input
      const text = subject;
      const cursorPos = element.selectionStart || text.length;
      const beforeCursor = text.substring(0, cursorPos);
      const match = beforeCursor.match(/\{([^}]*?)$/);

      if (match) {
        const startPos = cursorPos - match[0].length;
        const newText = text.substring(0, startPos) + `{param(${paramName})}` + text.substring(cursorPos);
        subject = newText;

        // Set cursor after inserted parameter
        setTimeout(() => {
          const newCursorPos = startPos + `{param(${paramName})}`.length;
          element.setSelectionRange(newCursorPos, newCursorPos);
          element.focus();
        }, 0);
      }
    } else if (isBody) {
      // Handle body contenteditable with highlighting
      const text = element.textContent || '';
      const cursorPos = getCaretPosition(element);
      const beforeCursor = text.substring(0, cursorPos);
      const match = beforeCursor.match(/\{([^}]*?)$/);

      if (match) {
        const startPos = cursorPos - match[0].length;
        const afterCursor = text.substring(cursorPos);

        // Create highlighted HTML with a space after to prevent formatting bleed
        const beforeText = text.substring(0, startPos);
        const highlightedParam = `<span class="param-highlight">{param(<span class="param-name">${paramName}</span>)}</span>`;

        // Update body with HTML - add a zero-width space after the span to break formatting
        element.innerHTML = beforeText + highlightedParam + '\u200B' + afterCursor;
        body = element.innerHTML;

        // Set cursor after inserted parameter (after the zero-width space)
        setTimeout(() => {
          // Find the span we just inserted and place cursor after it
          const spans = element.querySelectorAll('.param-highlight');
          if (spans.length > 0) {
            const lastSpan = spans[spans.length - 1];

            // Place cursor after the span and the zero-width space
            const nextNode = lastSpan.nextSibling;
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(nextNode, 1); // After the zero-width space
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }
          element.focus();
        }, 0);
      }
    }

    showParamDropdown = false;
    activeInputElement = null;
  }

  /**
   * Handle keyboard navigation in parameter dropdown
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleParamKeydown(event) {
    if (!showParamDropdown) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedParamIndex = Math.min(selectedParamIndex + 1, filteredParams.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedParamIndex = Math.max(selectedParamIndex - 1, 0);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (filteredParams[selectedParamIndex] && activeInputElement) {
        insertParameter(filteredParams[selectedParamIndex].name, activeInputElement);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      showParamDropdown = false;
      activeInputElement = null;
    }
  }

  /**
   * Apply text formatting to selected text
   * Note: execCommand is deprecated but still widely supported with no official replacement
   * @param {string} command - Format command (bold, italic, underline)
   */
  function applyFormatting(command) {
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(command, false, null);
    updateFormattingState();
  }

  /**
   * Update formatting button states based on current selection
   * Note: queryCommandState is deprecated but still widely supported with no official replacement
   */
  function updateFormattingState() {
    // eslint-disable-next-line deprecation/deprecation
    isBold = document.queryCommandState('bold');
    // eslint-disable-next-line deprecation/deprecation
    isItalic = document.queryCommandState('italic');
    // eslint-disable-next-line deprecation/deprecation
    isUnderline = document.queryCommandState('underline');
  }

  /**
   * Insert link into email body
   * Note: execCommand is deprecated but still widely supported with no official replacement
   */
  function insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('createLink', false, url);
    }
  }

  /**
   * Open button customization modal
   */
  function openButtonModal() {
    showParamDropdown = false;
    activeInputElement = null;
    showButtonModal = true;
  }

  /**
   * Open unsubscribe button modal
   */
  function openUnsubscribeModal() {
    showParamDropdown = false;
    activeInputElement = null;
    showUnsubscribeModal = true;
  }

  /**
   * Close button modal
   */
  function closeButtonModal() {
    showButtonModal = false;
  }

  /**
   * Close unsubscribe modal
   */
  function closeUnsubscribeModal() {
    showUnsubscribeModal = false;
  }

  /**
   * Open layout modal
   */
  function openLayoutModal() {
    showParamDropdown = false;
    activeInputElement = null;
    showLayoutModal = true;
  }

  /**
   * Close layout modal
   */
  function closeLayoutModal() {
    showLayoutModal = false;
  }

  /**
   * Generate button HTML based on type and configuration
   */
  function generateButtonHTML(type, text, url, bgColor, textColor) {
    if (type === 'none') return '';

    if (type === 'link') {
      return `
        <a href="${url}"
           style="display: inline-block;
                  background-color: ${bgColor};
                  color: ${textColor};
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: 600;
                  transition: opacity 0.2s;"
           onmouseover="this.style.opacity='0.8'"
           onmouseout="this.style.opacity='1'">
          ${text}
        </a>
      `;
    }

    if (type === 'unsubscribe') {
      return `
        <div style="padding: 15px 0;">
          <p style="color: #888; font-size: 12px; margin-bottom: 10px;">
            Don't want to receive these emails?
          </p>
          <a href="${url}"
             style="display: inline-block;
                    background-color: ${bgColor};
                    color: ${textColor};
                    padding: 8px 16px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    transition: opacity 0.2s;"
             onmouseover="this.style.opacity='0.8'"
             onmouseout="this.style.opacity='1'">
            ${text}
          </a>
        </div>
      `;
    }

    return '';
  }

  /**
   * Insert two-column layout into email body
   */
  function insertLayout() {
    const leftButton = generateButtonHTML(
      layoutConfig.leftButtonType,
      layoutConfig.leftButtonText,
      layoutConfig.leftButtonUrl,
      layoutConfig.leftButtonBg,
      layoutConfig.leftButtonColor
    );

    const rightButton = generateButtonHTML(
      layoutConfig.rightButtonType,
      layoutConfig.rightButtonText,
      layoutConfig.rightButtonUrl,
      layoutConfig.rightButtonBg,
      layoutConfig.rightButtonColor
    );

    const leftContent = layoutConfig.leftContent || leftButton || '<p style="color: #888; font-style: italic;">Left column content</p>';
    const rightContent = layoutConfig.rightContent || rightButton || '<p style="color: #888; font-style: italic;">Right column content</p>';

    const layoutHTML = `
      <div style="margin: ${layoutConfig.padding}; width: 100%; max-width: 100%;">
        <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 100%; padding: 10px; text-align: ${layoutConfig.leftAlign};">
              ${leftContent}
            </td>
          </tr>
          <tr>
            <td style="width: 100%; padding: 10px; text-align: ${layoutConfig.rightAlign};">
              ${rightContent}
            </td>
          </tr>
        </table>
      </div>
      <p><br></p>
    `;

    const bodyEditor = document.querySelector('.email-body-editor');
    if (bodyEditor instanceof HTMLElement) {
      bodyEditor.focus();
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('insertHTML', false, layoutHTML);
      body = bodyEditor.innerHTML;
    }

    // Reset layout config for next use
    layoutConfig.leftContent = '';
    layoutConfig.rightContent = '';
    layoutConfig.leftButtonType = 'none';
    layoutConfig.rightButtonType = 'none';

    closeLayoutModal();
  }

  /**
   * Insert custom button into email body
   */
  function insertCustomButton() {
    const buttonHTML = `
      <div style="margin: 20px 0; text-align: center;">
        <a href="${buttonConfig.url}"
           style="display: inline-block;
                  background-color: ${buttonConfig.backgroundColor};
                  color: ${buttonConfig.textColor};
                  padding: ${buttonConfig.padding};
                  text-decoration: none;
                  border-radius: ${buttonConfig.borderRadius};
                  font-size: ${buttonConfig.fontSize};
                  font-weight: 600;
                  transition: opacity 0.2s;"
           onmouseover="this.style.opacity='0.8'"
           onmouseout="this.style.opacity='1'">
          ${buttonConfig.text}
        </a>
      </div>
      <p><br></p>
    `;

    const bodyEditor = document.querySelector('.email-body-editor');
    if (bodyEditor instanceof HTMLElement) {
      bodyEditor.focus();
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('insertHTML', false, buttonHTML);
      body = bodyEditor.innerHTML;
    }

    closeButtonModal();
  }

  /**
   * Insert unsubscribe button into email body
   */
  function insertUnsubscribeButton() {
    const unsubscribeHTML = `
      <div style="margin: 30px 0; padding: 20px 0; text-align: center;">
        <p style="color: #888; font-size: 12px; margin-bottom: 10px;">
          Don't want to receive these emails anymore?
        </p>
        <a href="${unsubscribeConfig.url}"
           style="display: inline-block;
                  background-color: ${unsubscribeConfig.backgroundColor};
                  color: ${unsubscribeConfig.textColor};
                  padding: ${unsubscribeConfig.padding};
                  text-decoration: none;
                  border-radius: ${unsubscribeConfig.borderRadius};
                  font-size: ${unsubscribeConfig.fontSize};
                  font-weight: 500;
                  transition: opacity 0.2s;"
           onmouseover="this.style.opacity='0.8'"
           onmouseout="this.style.opacity='1'">
          ${unsubscribeConfig.text}
        </a>
      </div>
      <p><br></p>
    `;

    const bodyEditor = document.querySelector('.email-body-editor');
    if (bodyEditor instanceof HTMLElement) {
      bodyEditor.focus();
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('insertHTML', false, unsubscribeHTML);
      body = bodyEditor.innerHTML;
    }

    closeUnsubscribeModal();
  }
  
  /**
   * Handle file attachment
   * @param {Event} event - File input change event
   */
  function handleFileAttachment(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.files) {
      const files = Array.from(target.files);
      attachments = [...attachments, ...files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      }))];
    }
  }

  /**
   * Handle image insertion into email body
   * @param {Event} event - File input change event
   */
  function handleImageInsertion(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.files && target.files[0]) {
      const file = target.files[0];

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result;
        if (typeof imageUrl === 'string') {
          const img = new Image();
          img.onload = () => {
            const aspectRatio = img.height / img.width;
            const initialWidth = Math.min(400, img.width);
            const initialHeight = initialWidth * aspectRatio;

            const imageHTML = `
              <div style="margin: 20px 0; text-align: center; position: relative; display: inline-block;">
                <img src="${imageUrl}"
                     style="width: ${initialWidth}px; height: ${initialHeight}px; cursor: default; border: 2px solid transparent; display: block;"
                     class="resizable-image"
                     draggable="false"
                     alt="Inserted image" />
              </div>
              <p><br></p>
            `;

            const bodyEditor = document.querySelector('.email-body-editor');
            if (bodyEditor instanceof HTMLElement) {
              bodyEditor.focus();
              // eslint-disable-next-line deprecation/deprecation
              document.execCommand('insertHTML', false, imageHTML);
              body = bodyEditor.innerHTML;

              setTimeout(() => {
                attachImageResizeHandlers();
              }, 100);
            }
          };
          img.src = imageUrl;
        }
      };
      reader.readAsDataURL(file);

      target.value = '';
    }
  }

  /**
   * Handle HTML file import
   * @param {Event} event - File input change event
   */
  function handleHTMLImport(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.files && target.files[0]) {
      const file = target.files[0];

      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        alert('Please select an HTML file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const htmlContent = e.target?.result;
        if (typeof htmlContent === 'string') {
          const bodyEditor = document.querySelector('.email-body-editor');
          if (bodyEditor instanceof HTMLElement) {
            bodyEditor.focus();
            // eslint-disable-next-line deprecation/deprecation
            document.execCommand('insertHTML', false, htmlContent);
            body = bodyEditor.innerHTML;
          }
        }
      };
      reader.readAsText(file);

      target.value = '';
    }
  }

  /**
   * Attach resize handlers to all images in the editor
   */
  function attachImageResizeHandlers() {
    const bodyEditor = document.querySelector('.email-body-editor');
    if (!bodyEditor) return;

    const images = bodyEditor.querySelectorAll('img.resizable-image');
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        if (img.dataset.handlerAttached === 'true') return;
        img.dataset.handlerAttached = 'true';

        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let isResizing = false;

        const onMouseDown = (e) => {
          const rect = img.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;

          if (offsetX > rect.width - 30 && offsetY > rect.height - 30) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = img.width;
            startHeight = img.height;
            e.preventDefault();
            e.stopPropagation();

            img.style.border = '2px solid #0066ff';
            img.classList.add('resizing');
            selectedImage = img;
            isResizingImage = true;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }
        };

        const onMouseMove = (e) => {
          if (!isResizing) {
            const rect = img.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            if (offsetX > rect.width - 30 && offsetY > rect.height - 30) {
              img.style.cursor = 'nwse-resize';
            } else {
              img.style.cursor = 'default';
            }
            return;
          }

          const deltaX = e.clientX - startX;
          const aspectRatio = startHeight / startWidth;
          const newWidth = Math.max(100, Math.min(800, startWidth + deltaX));
          const newHeight = newWidth * aspectRatio;

          img.style.width = newWidth + 'px';
          img.style.height = newHeight + 'px';
          e.preventDefault();
        };

        const onMouseUp = () => {
          if (isResizing) {
            isResizing = false;
            img.style.border = '2px solid transparent';
            img.classList.remove('resizing');
            selectedImage = null;
            isResizingImage = false;

            const bodyEditor = document.querySelector('.email-body-editor');
            if (bodyEditor instanceof HTMLElement) {
              body = bodyEditor.innerHTML;
            }

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }
        };

        img.addEventListener('mousedown', onMouseDown);
        img.addEventListener('mousemove', onMouseMove);
      }
    });
  }
  
  /**
   * Remove attachment
   * @param {number} index - Index of attachment to remove
   */
  function removeAttachment(index) {
    attachments = attachments.filter((_, i) => i !== index);
  }
  
  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size string
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Generate random delay between min and max seconds
   * @param {number} minSeconds - Minimum delay in seconds
   * @param {number} maxSeconds - Maximum delay in seconds
   * @returns {number} Random delay in milliseconds
   */
  function getRandomDelay(minSeconds, maxSeconds) {
    const min = minSeconds * 1000;
    const max = maxSeconds * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get contacts to send emails to based on selected list
   * This is reactive to list membership changes
   * @returns {Array} Array of contacts
   */
  function getTargetContacts() {
    // Access the store to make this reactive to membership changes
    $listMembershipsVersion;

    if (selectedListId !== null) {
      return getContactsInList(selectedListId);
    }
    return $contactsStore;
  }

  /**
   * Get display name for current selection
   * @returns {string} Display name
   */
  function getSelectionDisplayName() {
    if (selectedListId !== null) {
      const list = $listsStore.find(l => l.id === selectedListId);
      return list ? `"${list.name}" list` : 'selected list';
    }
    return 'All Contacts';
  }

  /**
   * Handle email send to all contacts in selected list
   */
  async function handleSendToAll() {
    // Close parameter dropdown if open
    showParamDropdown = false;
    activeInputElement = null;

    // Validate form
    if (!subject.trim()) {
      alert('Please enter a subject');
      return;
    }

    if (!body.trim()) {
      alert('Please enter a message');
      return;
    }

    // Get contacts based on selected list
    const contacts = getTargetContacts();

    if (contacts.length === 0) {
      alert('No contacts found. Please add contacts first.');
      return;
    }

    const selectionName = getSelectionDisplayName();

    // Confirm before sending
    const confirmed = confirm(
      `Are you sure you want to send this email to ${contacts.length} contact(s) in ${selectionName}?\n\n` +
      `Emails will be sent with random delays between 50 seconds and 2 minutes.`
    );
    if (!confirmed) {
      return;
    }

    isSending = true;
    sendingProgress = { current: 0, total: contacts.length, currentEmail: '' };

    // Initialize the email sending progress store
    emailSendingProgress.startSending(selectedListId, contacts.length);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Log email sending start
    logger.info('email', `Starting email send to ${contacts.length} contacts in ${selectionName}`, {
      contactCount: contacts.length,
      listId: selectedListId,
      subject: subject.substring(0, 100)
    });

    try {
      console.log(`Sending email to ${contacts.length} contacts in ${selectionName}...`);

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        sendingProgress = {
          current: i + 1,
          total: contacts.length,
          currentEmail: contact.email
        };

        // Update store with current contact being sent
        emailSendingProgress.setCurrentContact(contact.id, i);

        try {
          console.log(`[${i + 1}/${contacts.length}] Sending to ${contact.name} (${contact.email})...`);

          // Replace parameters in subject and body with contact data
          const personalizedSubject = replaceParameters(subject.trim(), contact);
          const personalizedBody = replaceParameters(body, contact);

          // Validate parameter replacement
          const subjectValidation = validateParameterReplacement(personalizedSubject);
          const bodyValidation = validateParameterReplacement(personalizedBody);

          if (!subjectValidation.isValid || !bodyValidation.isValid) {
            const unreplacedParams = [
              ...subjectValidation.unreplacedParams,
              ...bodyValidation.unreplacedParams
            ];
            const errorMsg = `Failed to replace parameters for ${contact.name} (${contact.email}). ` +
              `Missing contact data for: ${unreplacedParams.join(', ')}. ` +
              `\n\nEmail sending stopped at contact ${i + 1} of ${contacts.length}.`;

            console.error('❌ Parameter replacement failed:', {
              contact: contact.name,
              email: contact.email,
              unreplacedParams
            });

            // Log parameter replacement failure
            logger.error('email', 'Parameter replacement failed', {
              contact: contact.name,
              email: contact.email,
              unreplacedParams,
              position: `${i + 1} of ${contacts.length}`
            });

            // Mark as failed
            emailSendingProgress.markFailed(contact.id);
            results.failed++;
            results.errors.push({
              contact: contact.name,
              email: contact.email,
              error: `Missing contact data for: ${unreplacedParams.join(', ')}`
            });

            // Stop sending and show error
            alert(errorMsg);
            throw new Error(errorMsg);
          }

          console.log(`Personalized subject: "${personalizedSubject}"`);
          console.log(`Parameters replaced for: ${contact.name}`);

          // Prepare email data
          const emailData = {
            to: contact.email,
            cc: '',
            bcc: '',
            subject: personalizedSubject,
            body: personalizedBody,
            format: 'html',
            askReceipt: false,
            attachments: attachments.length > 0 ? attachments : undefined
          };

          // Send email via IPC to main process
          await sendEmailViaIPC(emailData);

          results.success++;
          console.log(`✅ Sent to ${contact.email}`);

          // Log successful send
          logger.info('email', `Email sent successfully to ${contact.name}`, {
            to: contact.email,
            subject: personalizedSubject,
            position: `${i + 1} of ${contacts.length}`
          });

          // Mark contact as completed in the store
          emailSendingProgress.markCompleted(contact.id);

          // Random delay between 50 seconds and 2 minutes (50-120 seconds)
          // Only delay if there are more emails to send
          if (i < contacts.length - 1) {
            const delayMs = getRandomDelay(50, 120);
            const delaySec = Math.round(delayMs / 1000);
            console.log(`⏳ Waiting ${delaySec} seconds before next email...`);

            // Start the delay countdown in the store
            emailSendingProgress.startDelay(delayMs);

            await new Promise(resolve => setTimeout(resolve, delayMs));

            // Clear the delay countdown
            emailSendingProgress.clearDelay();
          }

        } catch (error) {
          results.failed++;
          results.errors.push({
            contact: contact.name,
            email: contact.email,
            error: error.message
          });
          console.error(`❌ Failed to send to ${contact.email}:`, error);

          // Log email send failure
          logger.error('email', `Failed to send email to ${contact.name}`, {
            to: contact.email,
            error: error.message,
            position: `${i + 1} of ${contacts.length}`
          });

          // Mark contact as failed in the store
          emailSendingProgress.markFailed(contact.id);

          // Still wait before next attempt even if this one failed
          if (i < contacts.length - 1) {
            const delayMs = getRandomDelay(50, 120);
            const delaySec = Math.round(delayMs / 1000);
            console.log(`⏳ Waiting ${delaySec} seconds before next email...`);

            // Start the delay countdown in the store
            emailSendingProgress.startDelay(delayMs);

            await new Promise(resolve => setTimeout(resolve, delayMs));

            // Clear the delay countdown
            emailSendingProgress.clearDelay();
          }
        }
      }

      // Log completion
      logger.info('email', 'Email sending batch completed', {
        total: contacts.length,
        success: results.success,
        failed: results.failed
      });

      // Show results
      let message = `Email sending complete!\n\n`;
      message += `✅ Successfully sent: ${results.success}\n`;
      if (results.failed > 0) {
        message += `❌ Failed: ${results.failed}\n\n`;
        message += `Failed contacts:\n`;
        results.errors.forEach(err => {
          message += `- ${err.contact} (${err.email}): ${err.error}\n`;
        });
      }

      alert(message);

      // Clear form if all succeeded
      if (results.failed === 0) {
        clearForm();
      }

      // Reset visual indicators after 5 seconds to allow users to see the results
      setTimeout(() => {
        emailSendingProgress.reset();
      }, 5000);

    } catch (error) {
      console.error('Failed to send emails:', error);

      // Log critical error
      logger.error('email', 'Email sending batch failed', {
        error: error.message,
        stack: error.stack
      });

      alert(`Failed to send emails: ${error.message}\n\nPlease check the console for details.`);

      // Reset visual indicators after error
      setTimeout(() => {
        emailSendingProgress.reset();
      }, 5000);
    } finally {
      isSending = false;
      sendingProgress = { current: 0, total: 0, currentEmail: '' };

      // End the sending operation in the store (but keep the visual states for 5 seconds)
      emailSendingProgress.endSending();
    }
  }
  
  /**
   * Clear the email form
   */
  function clearForm() {
    subject = '';
    body = '';
    attachments = [];
    showPreview = false;
  }
  
  /**
   * Save as draft
   */
  function saveDraft() {
    // Close parameter dropdown if open
    showParamDropdown = false;
    activeInputElement = null;

    console.log('Saving draft...');
    alert('Draft saved! (Note: Draft functionality not yet implemented)');
  }
  
  /**
   * Toggle preview mode
   */
  function togglePreview() {
    showPreview = !showPreview;
  }
</script>

<div class="email-composer">
  <div class="composer-header">
    <h2>Compose Email</h2>
    <div class="header-actions">
      <button class="btn-icon" onclick={togglePreview} title="Preview email" aria-label="Preview email">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
      <button class="btn-icon" onclick={saveDraft} title="Save draft" aria-label="Save draft">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
      </button>
    </div>
  </div>
  
  {#if showPreview}
    <div class="email-preview">
      <div class="preview-header">
        <h3>Email Preview</h3>
        <button class="btn-secondary" onclick={togglePreview}>Back to Edit</button>
      </div>
      <div class="preview-content">
        <div class="preview-field"><strong>To:</strong> All Contacts ({$contactsStore.length})</div>
        <div class="preview-field"><strong>Subject:</strong> {subject}</div>
        <div class="preview-body">{@html body}</div>
        {#if attachments.length > 0}
          <div class="preview-attachments">
            <strong>Attachments ({attachments.length}):</strong>
            {#each attachments as attachment}
              <div class="preview-attachment">{attachment.name} ({formatFileSize(attachment.size)})</div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="composer-body">
      <div class="email-fields">
        <div class="recipients-info">
          <div class="recipients-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>This email will be sent to <strong>{$contactsStore.length} contact(s)</strong></span>
          </div>
        </div>

        <div class="field-row" style="position: relative;">
          <label for="email-subject">Subject:</label>
          <input
            id="email-subject"
            type="text"
            bind:value={subject}
            oninput={handleInput}
            onkeydown={handleParamKeydown}
            placeholder="Email subject"
            class="field-input"
          />
          <div class="field-hint">
            💡 Type <code>{'{'}</code> to insert contact data. Example: <code class="param-example">{'{param(name)}'}</code> or <code class="param-example">{'{param(email)}'}</code>
          </div>
        </div>
      </div>

      <div class="editor-toolbar">
        <button 
          class="toolbar-btn {isBold ? 'active' : ''}" 
          onclick={() => applyFormatting('bold')}
          title="Bold"
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button 
          class="toolbar-btn {isItalic ? 'active' : ''}" 
          onclick={() => applyFormatting('italic')}
          title="Italic"
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button 
          class="toolbar-btn {isUnderline ? 'active' : ''}" 
          onclick={() => applyFormatting('underline')}
          title="Underline"
          aria-label="Underline"
        >
          <u>U</u>
        </button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" onclick={insertLink} title="Insert link" aria-label="Insert link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" onclick={openLayoutModal} title="Insert two-column layout" aria-label="Insert two-column layout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
        </button>
        <button class="toolbar-btn" onclick={openButtonModal} title="Insert custom button" aria-label="Insert custom button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="8" rx="2" ry="2"></rect>
            <path d="M12 8v8"></path>
          </svg>
        </button>
        <button class="toolbar-btn" onclick={openUnsubscribeModal} title="Insert unsubscribe button" aria-label="Insert unsubscribe button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
        <div class="toolbar-divider"></div>
        <label class="toolbar-btn" title="Insert image">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <input
            type="file"
            accept="image/*"
            onchange={handleImageInsertion}
            style="display: none;"
          />
        </label>
        <label class="toolbar-btn" title="Import HTML file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <input
            type="file"
            accept=".html,.htm"
            onchange={handleHTMLImport}
            style="display: none;"
          />
        </label>
        <label class="toolbar-btn" title="Attach file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
          <input
            type="file"
            multiple
            onchange={handleFileAttachment}
            style="display: none;"
          />
        </label>
      </div>

      <div
        class="email-body-editor"
        contenteditable="true"
        bind:innerHTML={body}
        oninput={handleInput}
        onkeyup={updateFormattingState}
        onkeydown={handleParamKeydown}
        onclick={updateFormattingState}
        placeholder="Write your email message here..."
        role="textbox"
        aria-label="Email body"
        aria-multiline="true"
        tabindex="0"
      ></div>

      {#if showParamDropdown}
        <div
          class="param-dropdown"
          style="top: {paramDropdownPosition.top}px; left: {paramDropdownPosition.left}px;"
        >
          <div class="param-dropdown-header">Insert Parameter</div>
          {#each filteredParams as param, index}
            <button
              class="param-option {index === selectedParamIndex ? 'selected' : ''}"
              onclick={() => {
                if (activeInputElement) {
                  insertParameter(param.name, activeInputElement);
                }
              }}
              onmouseenter={() => selectedParamIndex = index}
            >
              <span class="param-name">{'{param('}{param.name}{')}'}}</span>
              <span class="param-desc">{param.description}</span>
            </button>
          {/each}
          {#if filteredParams.length === 0}
            <div class="param-no-results">No parameters found</div>
          {/if}
        </div>
      {/if}

      {#if attachments.length > 0}
        <div class="attachments-list">
          <div class="attachments-header">
            <span>Attachments ({attachments.length})</span>
          </div>
          <div class="attachments-grid">
            {#each attachments as attachment, index}
              <div class="attachment-item">
                <div class="attachment-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                  </svg>
                </div>
                <div class="attachment-info">
                  <div class="attachment-name">{attachment.name}</div>
                  <div class="attachment-size">{formatFileSize(attachment.size)}</div>
                </div>
                <button
                  class="attachment-remove"
                  onclick={() => removeAttachment(index)}
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="composer-footer">
    <button
      class="btn-primary"
      onclick={handleSendToAll}
      disabled={isSending || getTargetContacts().length === 0}
    >
      {#if isSending}
        <span class="spinner"></span>
        {#if sendingProgress.total > 0}
          Sending {sendingProgress.current}/{sendingProgress.total}...
        {:else}
          Sending...
        {/if}
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        {#if selectedListId !== null}
          Send to {getSelectionDisplayName()} ({getTargetContacts().length})
        {:else}
          Send to All Contacts ({getTargetContacts().length})
        {/if}
      {/if}
    </button>
    <button class="btn-secondary" onclick={clearForm} disabled={isSending}>
      Clear
    </button>
  </div>

  {#if isSending && sendingProgress.currentEmail}
    <div class="sending-status">
      Sending to: {sendingProgress.currentEmail}
    </div>
  {/if}
</div>

{#if showButtonModal}
  <div
    class="modal-backdrop"
    onclick={(e) => e.target === e.currentTarget && closeButtonModal()}
    onkeydown={(e) => e.key === 'Escape' && closeButtonModal()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h3>Insert Custom Button</h3>
        <button class="modal-close-btn" onclick={closeButtonModal} aria-label="Close modal">
          <X size={20} />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="button-text">Button Text</label>
          <input
            id="button-text"
            type="text"
            bind:value={buttonConfig.text}
            placeholder="Click Here"
            class="modal-input"
          />
        </div>

        <div class="form-group">
          <label for="button-url">Button URL</label>
          <input
            id="button-url"
            type="url"
            bind:value={buttonConfig.url}
            placeholder="https://example.com"
            class="modal-input"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="button-bg-color">Background Color</label>
            <div class="color-input-wrapper">
              <input
                id="button-bg-color"
                type="color"
                bind:value={buttonConfig.backgroundColor}
                class="color-input"
              />
              <input
                type="text"
                bind:value={buttonConfig.backgroundColor}
                placeholder="#0066ff"
                class="color-text-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="button-text-color">Text Color</label>
            <div class="color-input-wrapper">
              <input
                id="button-text-color"
                type="color"
                bind:value={buttonConfig.textColor}
                class="color-input"
              />
              <input
                type="text"
                bind:value={buttonConfig.textColor}
                placeholder="#ffffff"
                class="color-text-input"
              />
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="button-padding">Padding</label>
            <input
              id="button-padding"
              type="text"
              bind:value={buttonConfig.padding}
              placeholder="12px 24px"
              class="modal-input"
            />
          </div>

          <div class="form-group">
            <label for="button-border-radius">Border Radius</label>
            <input
              id="button-border-radius"
              type="text"
              bind:value={buttonConfig.borderRadius}
              placeholder="8px"
              class="modal-input"
            />
          </div>

          <div class="form-group">
            <label for="button-font-size">Font Size</label>
            <input
              id="button-font-size"
              type="text"
              bind:value={buttonConfig.fontSize}
              placeholder="16px"
              class="modal-input"
            />
          </div>
        </div>

        <div class="button-preview">
          <p class="preview-label">Preview:</p>
          <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <a href={buttonConfig.url}
               style="display: inline-block;
                      background-color: {buttonConfig.backgroundColor};
                      color: {buttonConfig.textColor};
                      padding: {buttonConfig.padding};
                      text-decoration: none;
                      border-radius: {buttonConfig.borderRadius};
                      font-size: {buttonConfig.fontSize};
                      font-weight: 600;">
              {buttonConfig.text}
            </a>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={closeButtonModal}>Cancel</button>
        <button class="btn-primary" onclick={insertCustomButton}>Insert Button</button>
      </div>
    </div>
  </div>
{/if}

{#if showUnsubscribeModal}
  <div
    class="modal-backdrop"
    onclick={(e) => e.target === e.currentTarget && closeUnsubscribeModal()}
    onkeydown={(e) => e.key === 'Escape' && closeUnsubscribeModal()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h3>Insert Unsubscribe Button</h3>
        <button class="modal-close-btn" onclick={closeUnsubscribeModal} aria-label="Close modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="unsub-text">Button Text</label>
          <input
            id="unsub-text"
            type="text"
            bind:value={unsubscribeConfig.text}
            placeholder="Unsubscribe"
            class="modal-input"
          />
        </div>

        <div class="form-group">
          <label for="unsub-url">Unsubscribe URL</label>
          <input
            id="unsub-url"
            type="url"
            bind:value={unsubscribeConfig.url}
            placeholder="https://example.com/unsubscribe"
            class="modal-input"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="unsub-bg-color">Background Color</label>
            <div class="color-input-wrapper">
              <input
                id="unsub-bg-color"
                type="color"
                bind:value={unsubscribeConfig.backgroundColor}
                class="color-input"
              />
              <input
                type="text"
                bind:value={unsubscribeConfig.backgroundColor}
                placeholder="#666666"
                class="color-text-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="unsub-text-color">Text Color</label>
            <div class="color-input-wrapper">
              <input
                id="unsub-text-color"
                type="color"
                bind:value={unsubscribeConfig.textColor}
                class="color-input"
              />
              <input
                type="text"
                bind:value={unsubscribeConfig.textColor}
                placeholder="#ffffff"
                class="color-text-input"
              />
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="unsub-padding">Padding</label>
            <input
              id="unsub-padding"
              type="text"
              bind:value={unsubscribeConfig.padding}
              placeholder="8px 16px"
              class="modal-input"
            />
          </div>

          <div class="form-group">
            <label for="unsub-border-radius">Border Radius</label>
            <input
              id="unsub-border-radius"
              type="text"
              bind:value={unsubscribeConfig.borderRadius}
              placeholder="4px"
              class="modal-input"
            />
          </div>

          <div class="form-group">
            <label for="unsub-font-size">Font Size</label>
            <input
              id="unsub-font-size"
              type="text"
              bind:value={unsubscribeConfig.fontSize}
              placeholder="14px"
              class="modal-input"
            />
          </div>
        </div>

        <div class="button-preview">
          <p class="preview-label">Preview:</p>
          <div style="padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <p style="color: #888; font-size: 12px; margin-bottom: 10px; text-align: center;">
              Don't want to receive these emails anymore?
            </p>
            <div style="text-align: center;">
              <a href={unsubscribeConfig.url}
                 style="display: inline-block;
                        background-color: {unsubscribeConfig.backgroundColor};
                        color: {unsubscribeConfig.textColor};
                        padding: {unsubscribeConfig.padding};
                        text-decoration: none;
                        border-radius: {unsubscribeConfig.borderRadius};
                        font-size: {unsubscribeConfig.fontSize};
                        font-weight: 500;">
                {unsubscribeConfig.text}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={closeUnsubscribeModal}>Cancel</button>
        <button class="btn-primary" onclick={insertUnsubscribeButton}>Insert Unsubscribe</button>
      </div>
    </div>
  </div>
{/if}

<!-- Two-Column Layout Modal -->
{#if showLayoutModal}
  <div
    class="modal-backdrop"
    onclick={(e) => e.target === e.currentTarget && closeLayoutModal()}
    onkeydown={(e) => e.key === 'Escape' && closeLayoutModal()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content" role="document">
      <div class="modal-header">
        <h3>Insert Two-Section Layout</h3>
        <button class="modal-close-btn" onclick={closeLayoutModal} aria-label="Close modal">
          ✕
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="layout-left-content">Top Section Content (optional):</label>
          <textarea
            id="layout-left-content"
            bind:value={layoutConfig.leftContent}
            placeholder="Enter HTML or text for top section (leave empty to use button)"
            class="modal-input layout-textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="layout-left-button-type">Top Section Button:</label>
            <select id="layout-left-button-type" bind:value={layoutConfig.leftButtonType} class="modal-input">
              <option value="none">No Button</option>
              <option value="link">Link Button</option>
              <option value="unsubscribe">Unsubscribe Button</option>
            </select>
          </div>

          {#if layoutConfig.leftButtonType !== 'none'}
            <div class="form-group">
              <label for="layout-left-button-text">Button Text:</label>
              <input
                id="layout-left-button-text"
                type="text"
                bind:value={layoutConfig.leftButtonText}
                placeholder="Button text"
                class="modal-input"
              />
            </div>
          {/if}
        </div>

        {#if layoutConfig.leftButtonType !== 'none'}
          <div class="form-row">
            <div class="form-group">
              <label for="layout-left-button-url">Button URL:</label>
              <input
                id="layout-left-button-url"
                type="text"
                bind:value={layoutConfig.leftButtonUrl}
                placeholder="https://example.com"
                class="modal-input"
              />
            </div>

            <div class="form-group">
              <label for="layout-left-button-bg">Background Color:</label>
              <div class="color-input-wrapper">
                <input
                  id="layout-left-button-bg"
                  type="color"
                  bind:value={layoutConfig.leftButtonBg}
                  class="color-input"
                />
                <input
                  type="text"
                  bind:value={layoutConfig.leftButtonBg}
                  placeholder="#0066ff"
                  class="color-text-input"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="layout-left-button-color">Text Color:</label>
              <div class="color-input-wrapper">
                <input
                  id="layout-left-button-color"
                  type="color"
                  bind:value={layoutConfig.leftButtonColor}
                  class="color-input"
                />
                <input
                  type="text"
                  bind:value={layoutConfig.leftButtonColor}
                  placeholder="#ffffff"
                  class="color-text-input"
                />
              </div>
            </div>
          </div>
        {/if}

        <div class="form-group">
          <label for="layout-right-content">Bottom Section Content (optional):</label>
          <textarea
            id="layout-right-content"
            bind:value={layoutConfig.rightContent}
            placeholder="Enter HTML or text for bottom section (leave empty to use button)"
            class="modal-input layout-textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="layout-right-button-type">Bottom Section Button:</label>
            <select id="layout-right-button-type" bind:value={layoutConfig.rightButtonType} class="modal-input">
              <option value="none">No Button</option>
              <option value="link">Link Button</option>
              <option value="unsubscribe">Unsubscribe Button</option>
            </select>
          </div>

          {#if layoutConfig.rightButtonType !== 'none'}
            <div class="form-group">
              <label for="layout-right-button-text">Button Text:</label>
              <input
                id="layout-right-button-text"
                type="text"
                bind:value={layoutConfig.rightButtonText}
                placeholder="Button text"
                class="modal-input"
              />
            </div>
          {/if}
        </div>

        {#if layoutConfig.rightButtonType !== 'none'}
          <div class="form-row">
            <div class="form-group">
              <label for="layout-right-button-url">Button URL:</label>
              <input
                id="layout-right-button-url"
                type="text"
                bind:value={layoutConfig.rightButtonUrl}
                placeholder="https://example.com"
                class="modal-input"
              />
            </div>

            <div class="form-group">
              <label for="layout-right-button-bg">Background Color:</label>
              <div class="color-input-wrapper">
                <input
                  id="layout-right-button-bg"
                  type="color"
                  bind:value={layoutConfig.rightButtonBg}
                  class="color-input"
                />
                <input
                  type="text"
                  bind:value={layoutConfig.rightButtonBg}
                  placeholder="#666666"
                  class="color-text-input"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="layout-right-button-color">Text Color:</label>
              <div class="color-input-wrapper">
                <input
                  id="layout-right-button-color"
                  type="color"
                  bind:value={layoutConfig.rightButtonColor}
                  class="color-input"
                />
                <input
                  type="text"
                  bind:value={layoutConfig.rightButtonColor}
                  placeholder="#ffffff"
                  class="color-text-input"
                />
              </div>
            </div>
          </div>
        {/if}

        <div class="form-row">
          <div class="form-group">
            <label for="layout-left-align">Top Section Alignment:</label>
            <select id="layout-left-align" bind:value={layoutConfig.leftAlign} class="modal-input">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div class="form-group">
            <label for="layout-right-align">Bottom Section Alignment:</label>
            <select id="layout-right-align" bind:value={layoutConfig.rightAlign} class="modal-input">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="layout-padding">Padding:</label>
          <input
            id="layout-padding"
            type="text"
            bind:value={layoutConfig.padding}
            placeholder="e.g., 20px 0"
            class="modal-input"
          />
        </div>

        <div class="button-preview">
          <p class="preview-label">Preview:</p>
          <div style="background: #fff; padding: 20px; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td style="width: 100%; padding: 10px; text-align: {layoutConfig.leftAlign}; border: 1px dashed #ccc;">
                    {#if layoutConfig.leftContent}
                      {@html layoutConfig.leftContent}
                    {:else if layoutConfig.leftButtonType === 'link'}
                      {@html generateButtonHTML(layoutConfig.leftButtonType, layoutConfig.leftButtonText, layoutConfig.leftButtonUrl, layoutConfig.leftButtonBg, layoutConfig.leftButtonColor)}
                    {:else if layoutConfig.leftButtonType === 'unsubscribe'}
                      {@html generateButtonHTML(layoutConfig.leftButtonType, layoutConfig.leftButtonText, layoutConfig.leftButtonUrl, layoutConfig.leftButtonBg, layoutConfig.leftButtonColor)}
                    {:else}
                      <p style="color: #888; font-style: italic;">Top section content</p>
                    {/if}
                  </td>
                </tr>
                <tr>
                  <td style="width: 100%; padding: 10px; text-align: {layoutConfig.rightAlign}; border: 1px dashed #ccc;">
                    {#if layoutConfig.rightContent}
                      {@html layoutConfig.rightContent}
                    {:else if layoutConfig.rightButtonType === 'link'}
                      {@html generateButtonHTML(layoutConfig.rightButtonType, layoutConfig.rightButtonText, layoutConfig.rightButtonUrl, layoutConfig.rightButtonBg, layoutConfig.rightButtonColor)}
                    {:else if layoutConfig.rightButtonType === 'unsubscribe'}
                      {@html generateButtonHTML(layoutConfig.rightButtonType, layoutConfig.rightButtonText, layoutConfig.rightButtonUrl, layoutConfig.rightButtonBg, layoutConfig.rightButtonColor)}
                    {:else}
                      <p style="color: #888; font-style: italic;">Bottom section content</p>
                    {/if}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={closeLayoutModal}>Cancel</button>
        <button class="btn-primary" onclick={insertLayout}>Insert Layout</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .email-composer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #242424;
  }

  .composer-header {
    padding: 24px 32px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .composer-header h2 {
    margin: 0;
    color: #fff;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #444 !important;
    background-color: transparent !important;
    color: #888;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0 !important;
  }

  .btn-icon svg {
    display: block !important;
    flex-shrink: 0;
  }

  .btn-icon:hover {
    background-color: #333 !important;
    color: #fff !important;
    border-color: #555 !important;
  }

  .composer-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .email-fields {
    padding: 24px 32px;
    border-bottom: 1px solid #333;
  }

  .field-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    gap: 16px;
  }

  .field-row label {
    min-width: 60px;
    color: #aaa;
    font-weight: 500;
  }

  .field-input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
    min-width: 0;
  }

  .field-input:focus {
    border-color: #0066ff;
  }

  .field-input::placeholder {
    color: #666;
  }

  /* Monospace font for subject field to make parameters more visible */
  .field-input {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  /* Visual hint for parameter syntax */
  .field-hint {
    margin-top: 6px;
    font-size: 0.85rem;
    color: #888;
    line-height: 1.6;
  }

  .field-hint code {
    background-color: #333;
    color: #aaa;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    border: 1px solid #444;
  }

  .field-hint code.param-example {
    background-color: #0066ff22;
    color: #66b3ff;
    border: 1px solid #0066ff44;
    font-weight: 600;
  }

  .editor-toolbar {
    padding: 12px 32px;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: #1e1e1e;
  }

  .toolbar-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid transparent !important;
    background-color: transparent !important;
    color: #aaa;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-size: 0.95rem;
    padding: 0 !important;
  }

  .toolbar-btn svg {
    display: block !important;
    flex-shrink: 0;
  }

  .toolbar-btn:hover {
    background-color: #333 !important;
    color: #fff !important;
  }

  .toolbar-btn.active {
    background-color: #0066ff !important;
    color: #fff !important;
    border-color: #0066ff !important;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: #444;
    margin: 0 8px;
  }

  .email-body-editor {
    flex: 1;
    padding: 24px 32px;
    overflow-y: auto;
    color: #fff;
    font-size: 1rem;
    line-height: 1.6;
    outline: none;
    min-height: 300px;
  }

  .email-body-editor:empty:before {
    content: attr(placeholder);
    color: #666;
    pointer-events: none;
  }

  .email-body-editor {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Parameter highlighting */
  .email-body-editor :global(.param-highlight) {
    background-color: #0066ff33;
    border-radius: 4px;
    padding: 2px 4px;
    color: #66b3ff;
    border: 1px solid #0066ff66;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.95em;
  }

  .email-body-editor :global(.param-name) {
    color: #ff9966;
    font-weight: 600;
  }

  .attachments-list {
    padding: 16px 32px;
    border-top: 1px solid #333;
    background-color: #1e1e1e;
  }

  .attachments-header {
    margin-bottom: 12px;
    color: #aaa;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .attachments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    transition: border-color 0.2s;
  }

  .attachment-item:hover {
    border-color: #555;
  }

  .attachment-icon {
    color: #0066ff;
    flex-shrink: 0;
  }

  .attachment-info {
    flex: 1;
    min-width: 0;
  }

  .attachment-name {
    color: #fff;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-size {
    color: #888;
    font-size: 0.8rem;
  }

  .attachment-remove {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none !important;
    background-color: transparent !important;
    color: #888;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    padding: 0 !important;
  }

  .attachment-remove svg {
    display: block !important;
    flex-shrink: 0;
  }

  .attachment-remove:hover {
    background-color: #ff4444 !important;
    color: #fff !important;
  }

  .composer-footer {
    padding: 20px 32px;
    border-top: 1px solid #333;
    display: flex;
    gap: 12px;
    background-color: #1e1e1e;
  }

  .btn-primary {
    padding: 12px 24px !important;
    border-radius: 8px;
    border: none !important;
    background-color: #0066ff !important;
    color: white !important;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex !important;
    align-items: center;
    gap: 8px;
  }

  .btn-primary svg {
    display: block !important;
    flex-shrink: 0;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0052cc !important;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 12px 24px;
    border-radius: 8px;
    border: 1px solid #444;
    background-color: transparent;
    color: #aaa;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #333;
    color: #fff;
    border-color: #555;
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .email-preview {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .preview-header h3 {
    margin: 0;
    color: #fff;
    font-size: 1.3rem;
  }

  .preview-content {
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 12px;
    padding: 24px;
  }

  .preview-field {
    margin-bottom: 12px;
    color: #aaa;
    font-size: 0.95rem;
  }

  .preview-field strong {
    color: #fff;
    margin-right: 8px;
  }

  .preview-body {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #444;
    color: #fff;
    line-height: 1.6;
  }

  .preview-attachments {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #444;
    color: #aaa;
  }

  .preview-attachment {
    margin-top: 8px;
    padding: 8px 12px;
    background-color: #1e1e1e;
    border-radius: 6px;
    color: #fff;
    font-size: 0.9rem;
  }

  /* Custom scrollbar */
  .email-body-editor::-webkit-scrollbar,
  .email-preview::-webkit-scrollbar {
    width: 8px;
  }

  .email-body-editor::-webkit-scrollbar-track,
  .email-preview::-webkit-scrollbar-track {
    background: transparent;
  }

  .email-body-editor::-webkit-scrollbar-thumb,
  .email-preview::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }

  .email-body-editor::-webkit-scrollbar-thumb:hover,
  .email-preview::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Recipients info section */
  .recipients-info {
    padding: 16px;
    background: #2a2a2a;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #444;
  }

  .recipients-label {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #aaa;
    font-size: 14px;
  }

  .recipients-label svg {
    color: #00ff88;
    flex-shrink: 0;
  }

  .recipients-label strong {
    color: #00ff88;
  }

  /* Field hint */
  .field-hint {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
    font-style: italic;
  }

  .field-hint code {
    background: #333;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #00ff88;
  }

  /* Parameter dropdown */
  .param-dropdown {
    position: fixed;
    background: #2a2a2a;
    border: 1px solid #00ff88;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    min-width: 280px;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
  }

  .param-dropdown-header {
    padding: 12px 16px;
    border-bottom: 1px solid #444;
    font-size: 12px;
    font-weight: 600;
    color: #00ff88;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .param-option {
    width: 100%;
    padding: 12px 16px;
    background: transparent;
    border: none;
    color: #fff;
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background 0.2s;
  }

  .param-option:hover,
  .param-option.selected {
    background: #333;
  }

  .param-name {
    font-family: 'Courier New', monospace;
    color: #00ff88;
    font-size: 13px;
  }

  .param-desc {
    font-size: 12px;
    color: #888;
  }

  .param-no-results {
    padding: 20px;
    text-align: center;
    color: #888;
    font-size: 13px;
  }

  /* Sending status */
  .sending-status {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2a2a2a;
    border: 1px solid #00ff88;
    border-radius: 8px;
    padding: 12px 20px;
    color: #00ff88;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Modal styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background-color: #2a2a2a;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    padding: 24px;
    border-bottom: 1px solid #444;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    color: #fff;
    font-size: 1.3rem;
    font-weight: 600;
  }

  .modal-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background-color: transparent;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
  }

  .modal-close-btn:hover {
    background-color: #ff4444;
    color: #fff;
  }

  .modal-body {
    padding: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #aaa;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .modal-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .modal-input:focus {
    border-color: #0066ff;
  }

  .layout-textarea {
    resize: vertical;
    min-height: 80px;
    font-family: 'Courier New', monospace;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }

  .color-input-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .color-input {
    width: 50px;
    height: 40px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #1e1e1e;
    cursor: pointer;
    padding: 4px;
  }

  .color-text-input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background-color: #1e1e1e;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
    font-family: 'Courier New', monospace;
  }

  .color-text-input:focus {
    border-color: #0066ff;
  }

  .button-preview {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #444;
  }

  .preview-label {
    margin: 0 0 12px 0;
    color: #aaa;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .modal-footer {
    padding: 20px 24px;
    border-top: 1px solid #444;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  /* Custom scrollbar for modal */
  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Resizable image styles */
  :global(.email-body-editor img.resizable-image) {
    transition: border-color 0.2s;
    user-select: none;
    position: relative;
  }

  :global(.email-body-editor img.resizable-image:hover) {
    border-color: #0066ff !important;
    box-shadow: 0 0 0 1px rgba(0, 102, 255, 0.3);
  }

  :global(.email-body-editor img.resizable-image.resizing) {
    border-color: #0066ff !important;
    opacity: 0.8;
    box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.5);
  }

  /* Resize corner indicator */
  :global(.email-body-editor img.resizable-image:hover::after) {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, transparent 50%, #0066ff 50%);
    cursor: nwse-resize;
    pointer-events: none;
  }
</style>

