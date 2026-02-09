<script>
  /**
   * Rich Text Editor Component
   * TipTap-based WYSIWYG editor with formatting toolbar
   */

  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import TextAlign from '@tiptap/extension-text-align';
  import Link from '@tiptap/extension-link';
  import Image from '@tiptap/extension-image';
  import Placeholder from '@tiptap/extension-placeholder';
  import {
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon,
    Unlink,
    Image as ImageIcon,
    FileCode,
    Paperclip
  } from 'lucide-svelte';

  /**
   * Component props
   */
  let {
    content = $bindable(''),
    placeholder = 'Write your email message here...',
    onUpdate = null,
    onParamTrigger = null,
    showAttachButton = false,
    showHtmlImportButton = false,
    onAttach = null,
    onHtmlImport = null
  } = $props();

  /**
   * Editor instance
   */
  let editor = $state(null);
  let editorElement;
  let mounted = $state(false);

  /**
   * Link modal state
   */
  let showLinkModal = $state(false);
  let linkUrl = $state('');
  let linkInputRef;

  /**
   * Initialize TipTap editor on mount
   */
  onMount(() => {
    mounted = true;
    initEditor();
  });

  /**
   * Initialize the editor after element is ready
   */
  function initEditor() {
    if (!editorElement || editor) return;

    try {
      editor = new Editor({
        element: editorElement,
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2, 3, 4] }
          }),
          Underline,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
            alignments: ['left', 'center', 'right'],
            defaultAlignment: 'left'
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              target: '_blank',
              rel: 'noopener noreferrer'
            }
          }),
          Image.configure({
            inline: true,
            allowBase64: true
          }),
          Placeholder.configure({
            placeholder: placeholder
          })
        ],
        content: content || '',
        onUpdate: ({ editor: e }) => {
          content = e.getHTML();
          if (onUpdate) onUpdate(content);
        },
        editorProps: {
          handleKeyDown: (view, event) => {
            if (event.key === '{' && onParamTrigger) {
              const { from } = view.state.selection;
              const coords = view.coordsAtPos(from);
              setTimeout(() => {
                onParamTrigger({ top: coords.bottom, left: coords.left });
              }, 10);
            }
            return false;
          }
        }
      });
    } catch (err) {
      console.error('Failed to initialize TipTap editor:', err);
    }
  }

  /**
   * Re-init when element becomes available
   */
  $effect(() => {
    if (mounted && editorElement && !editor) {
      initEditor();
    }
  });

  /**
   * Cleanup editor on destroy
   */
  onDestroy(() => {
    if (editor) {
      editor.destroy();
      editor = null;
    }
  });

  /**
   * Open link modal
   */
  function openLinkModal() {
    linkUrl = '';
    showLinkModal = true;
    // Focus input after modal renders
    setTimeout(() => {
      if (linkInputRef) {
        linkInputRef.focus();
      }
    }, 50);
  }

  /**
   * Insert link from modal
   */
  function confirmLink() {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    showLinkModal = false;
    linkUrl = '';
  }

  /**
   * Cancel link modal
   */
  function cancelLink() {
    showLinkModal = false;
    linkUrl = '';
    if (editor) {
      editor.commands.focus();
    }
  }

  /**
   * Handle key press in link input
   */
  function handleLinkKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmLink();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelLink();
    }
  }

  /**
   * Remove link from selection
   */
  function removeLink() {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  }

  /**
   * Insert image from file input
   */
  function handleImageInsert(event) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      editor.chain().focus().setImage({ src: e.target.result }).run();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  /**
   * Get current heading level
   */
  function getCurrentHeadingLevel() {
    if (!editor) return 0;
    for (let level = 1; level <= 4; level++) {
      if (editor.isActive('heading', { level })) return level;
    }
    return 0;
  }

  /**
   * Set heading level
   */
  function setHeading(event) {
    if (!editor) return;
    const level = parseInt(event.target.value);
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  /**
   * Insert a parameter at cursor position
   */
  export function insertParameter(paramName) {
    if (!editor) return;

    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, '');
    const match = textBefore.match(/\{([^}]*)$/);

    // Parameter text to insert (plain text, styling handled by CSS)
    const paramText = `{param(${paramName})} `;

    if (match) {
      const deleteFrom = from - match[0].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent(paramText)
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent(paramText)
        .run();
    }
  }

  /**
   * Set HTML content
   */
  export function setHTML(html) {
    if (editor) {
      editor.commands.setContent(html);
    }
  }

  /**
   * Get HTML content
   */
  export function getHTML() {
    return editor?.getHTML() || '';
  }

  /**
   * Focus editor
   */
  export function focus() {
    editor?.commands.focus();
  }
</script>

<div class="rich-text-editor">
  {#if editor}
    <div class="editor-toolbar">
      <select class="toolbar-select" value={getCurrentHeadingLevel()} onchange={setHeading}>
        <option value={0}>Normal</option>
        <option value={1}>Heading 1</option>
        <option value={2}>Heading 2</option>
        <option value={3}>Heading 3</option>
        <option value={4}>Heading 4</option>
      </select>

      <div class="toolbar-divider"></div>

      <button
        class="toolbar-btn"
        class:active={editor.isActive('bold')}
        onclick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
        aria-label="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        class="toolbar-btn"
        class:active={editor.isActive('italic')}
        onclick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
        aria-label="Italic"
      >
        <em>I</em>
      </button>
      <button
        class="toolbar-btn"
        class:active={editor.isActive('underline')}
        onclick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
        aria-label="Underline"
      >
        <u>U</u>
      </button>

      <div class="toolbar-divider"></div>

      <button
        class="toolbar-btn"
        class:active={editor.isActive('bulletList')}
        onclick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
        aria-label="Bullet list"
      >
        <span class="icon-wrapper"><List size={18} /></span>
      </button>
      <button
        class="toolbar-btn"
        class:active={editor.isActive('orderedList')}
        onclick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
        aria-label="Numbered list"
      >
        <span class="icon-wrapper"><ListOrdered size={18} /></span>
      </button>

      <div class="toolbar-divider"></div>

      <button
        class="toolbar-btn"
        class:active={editor.isActive({ textAlign: 'left' })}
        onclick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Align left"
        aria-label="Align left"
      >
        <span class="icon-wrapper"><AlignLeft size={18} /></span>
      </button>
      <button
        class="toolbar-btn"
        class:active={editor.isActive({ textAlign: 'center' })}
        onclick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Align center"
        aria-label="Align center"
      >
        <span class="icon-wrapper"><AlignCenter size={18} /></span>
      </button>
      <button
        class="toolbar-btn"
        class:active={editor.isActive({ textAlign: 'right' })}
        onclick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Align right"
        aria-label="Align right"
      >
        <span class="icon-wrapper"><AlignRight size={18} /></span>
      </button>

      <div class="toolbar-divider"></div>

      <button
        class="toolbar-btn"
        class:active={editor.isActive('link')}
        onclick={openLinkModal}
        title="Insert link"
        aria-label="Insert link"
      >
        <span class="icon-wrapper"><LinkIcon size={18} /></span>
      </button>
      {#if editor.isActive('link')}
        <button class="toolbar-btn" onclick={removeLink} title="Remove link" aria-label="Remove link">
          <span class="icon-wrapper"><Unlink size={18} /></span>
        </button>
      {/if}

      <div class="toolbar-divider"></div>

      <label class="toolbar-btn" title="Insert image" aria-label="Insert image">
        <span class="icon-wrapper"><ImageIcon size={18} /></span>
        <input type="file" accept="image/*" onchange={handleImageInsert} style="display: none;" />
      </label>

      {#if showHtmlImportButton && onHtmlImport}
        <label class="toolbar-btn" title="Import HTML" aria-label="Import HTML">
          <span class="icon-wrapper"><FileCode size={18} /></span>
          <input type="file" accept=".html,.htm" onchange={onHtmlImport} style="display: none;" />
        </label>
      {/if}

      {#if showAttachButton && onAttach}
        <label class="toolbar-btn" title="Attach file" aria-label="Attach file">
          <span class="icon-wrapper"><Paperclip size={18} /></span>
          <input type="file" multiple onchange={onAttach} style="display: none;" />
        </label>
      {/if}
    </div>
  {/if}

  <div class="editor-content" bind:this={editorElement}></div>
</div>

<!-- Link Modal -->
{#if showLinkModal}
  <div class="modal-overlay" onclick={cancelLink}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">Insert Link</div>
      <div class="modal-body">
        <input
          type="text"
          class="modal-input"
          placeholder="https://example.com"
          bind:value={linkUrl}
          bind:this={linkInputRef}
          onkeydown={handleLinkKeydown}
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" onclick={cancelLink}>Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick={confirmLink}>Insert</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rich-text-editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    /* min-height: 0 is critical for flexbox scroll containment on Windows */
    min-height: 0;
    background-color: #1e1e1e;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    background-color: #252525;
    border-bottom: 1px solid #333;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background-color: transparent;
    color: #ccc;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-btn :global(svg) {
    stroke: #ccc !important;
    color: #ccc !important;
  }

  .toolbar-btn:hover {
    background-color: #3a3a3a;
    color: #fff;
  }

  .toolbar-btn:hover :global(svg) {
    stroke: #fff !important;
    color: #fff !important;
  }

  .toolbar-btn.active {
    background-color: #0066ff;
    color: #fff;
  }

  .toolbar-btn.active :global(svg) {
    stroke: #fff !important;
    color: #fff !important;
  }

  .toolbar-select {
    padding: 6px 12px;
    background-color: #333;
    color: #fff;
    border: 1px solid #444;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    outline: none;
  }

  .toolbar-select:hover {
    background-color: #3a3a3a;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: #444;
    margin: 0 8px;
  }

  .editor-content {
    flex: 1;
    /* min-height: 0 enables proper scroll behavior in flex containers on Windows */
    min-height: 0;
    padding: 24px 32px;
    overflow-y: auto;
    color: #fff;
    font-size: 15px;
    line-height: 1.6;
  }

  .editor-content :global(.tiptap) {
    outline: none;
    min-height: 100%;
  }

  .editor-content :global(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: #666;
    pointer-events: none;
    float: left;
    height: 0;
  }

  .editor-content :global(h1) {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin: 16px 0 12px 0;
  }

  .editor-content :global(h2) {
    font-size: 24px;
    font-weight: 600;
    color: #fff;
    margin: 14px 0 10px 0;
  }

  .editor-content :global(h3) {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin: 12px 0 8px 0;
  }

  .editor-content :global(h4) {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin: 10px 0 6px 0;
  }

  .editor-content :global(p) {
    margin: 8px 0;
  }

  .editor-content :global(ul),
  .editor-content :global(ol) {
    margin: 12px 0;
    padding-left: 24px;
  }

  .editor-content :global(li) {
    margin: 6px 0;
  }

  .editor-content :global(li p) {
    margin: 0;
  }

  .editor-content :global(a) {
    color: #66b3ff;
    text-decoration: underline;
  }

  .editor-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .editor-content :global(.param-highlight) {
    display: inline;
    background-color: #0066ff33;
    border-radius: 4px;
    padding: 2px 6px;
    color: #66b3ff;
    border: 1px solid #0066ff66;
    font-family: monospace;
    font-size: 0.9em;
  }

  /* Icon wrapper for lucide icons */
  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
  }

  .icon-wrapper :global(svg) {
    stroke: #ccc;
  }

  .toolbar-btn:hover .icon-wrapper :global(svg) {
    stroke: #fff;
  }

  .toolbar-btn.active .icon-wrapper :global(svg) {
    stroke: #fff;
  }

  /* Link Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    min-width: 400px;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 16px;
  }

  .modal-body {
    margin-bottom: 20px;
  }

  .modal-input {
    width: 100%;
    padding: 12px 16px;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .modal-input:focus {
    border-color: #0066ff;
  }

  .modal-input::placeholder {
    color: #666;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .modal-btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .modal-btn-cancel {
    background-color: transparent;
    border: 1px solid #444;
    color: #ccc;
  }

  .modal-btn-cancel:hover {
    background-color: #333;
    border-color: #555;
  }

  .modal-btn-confirm {
    background-color: #0066ff;
    border: none;
    color: #fff;
  }

  .modal-btn-confirm:hover {
    background-color: #0055dd;
  }
</style>
