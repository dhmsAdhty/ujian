<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Tuliskan teks di sini...' },
  minHeight: { type: String, default: '160px' }
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    TextAlign.configure({ types: ['heading', 'paragraph'] })
  ],
  editorProps: {
    attributes: {
      class: 'rte-content',
      spellcheck: 'false'
    }
  },
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  }
})

// Sync when parent changes value (e.g. on edit load)
watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val || '', false)
    }
  }
)

const btn = (active, extra = '') =>
  `rte-btn ${active ? 'rte-btn--active' : ''} ${extra}`
</script>

<template>
  <div class="rte-wrapper">
    <!-- ── Toolbar ─────────────────────────────────── -->
    <div v-if="editor" class="rte-toolbar">
      <!-- History -->
      <button type="button" :class="btn(false)" title="Undo (Ctrl+Z)" @click="editor.chain().focus().undo().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
      </button>
      <button type="button" :class="btn(false)" title="Redo (Ctrl+Y)" @click="editor.chain().focus().redo().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>
      </button>

      <div class="rte-sep" />

      <!-- Text format -->
      <button type="button" :class="btn(editor.isActive('bold'))" title="Bold (Ctrl+B)" @click="editor.chain().focus().toggleBold().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive('italic'))" title="Italic (Ctrl+I)" @click="editor.chain().focus().toggleItalic().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive('underline'))" title="Underline (Ctrl+U)" @click="editor.chain().focus().toggleUnderline().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive('strike'))" title="Strikethrough" @click="editor.chain().focus().toggleStrike().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
      </button>

      <div class="rte-sep" />

      <!-- Superscript / Subscript -->
      <button type="button" :class="btn(editor.isActive('superscript'))" title="Superscript" @click="editor.chain().focus().toggleSuperscript().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19 14 5"/><path d="m14 19-10-14"/><path d="M20 12h-4l2.5-3.5a1.5 1.5 0 1 0-2.6-1.5"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive('subscript'))" title="Subscript" @click="editor.chain().focus().toggleSubscript().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5 14 19"/><path d="m14 5-10 14"/><path d="M20 22h-4l2.5-3.5a1.5 1.5 0 1 0-2.6-1.5"/></svg>
      </button>

      <div class="rte-sep" />

      <!-- Headings -->
      <button type="button" :class="btn(editor.isActive('heading', { level: 1 }))" title="Heading 1" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
        <span class="rte-label">H1</span>
      </button>
      <button type="button" :class="btn(editor.isActive('heading', { level: 2 }))" title="Heading 2" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
        <span class="rte-label">H2</span>
      </button>
      <button type="button" :class="btn(editor.isActive('heading', { level: 3 }))" title="Heading 3" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
        <span class="rte-label">H3</span>
      </button>

      <div class="rte-sep" />

      <!-- Lists -->
      <button type="button" :class="btn(editor.isActive('bulletList'))" title="Bullet List" @click="editor.chain().focus().toggleBulletList().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive('orderedList'))" title="Numbered List" @click="editor.chain().focus().toggleOrderedList().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive('blockquote'))" title="Blockquote" @click="editor.chain().focus().toggleBlockquote().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      </button>

      <div class="rte-sep" />

      <!-- Alignment -->
      <button type="button" :class="btn(editor.isActive({ textAlign: 'left' }))" title="Align Left" @click="editor.chain().focus().setTextAlign('left').run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive({ textAlign: 'center' }))" title="Align Center" @click="editor.chain().focus().setTextAlign('center').run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive({ textAlign: 'right' }))" title="Align Right" @click="editor.chain().focus().setTextAlign('right').run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
      </button>
      <button type="button" :class="btn(editor.isActive({ textAlign: 'justify' }))" title="Justify" @click="editor.chain().focus().setTextAlign('justify').run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
      </button>

      <div class="rte-sep" />

      <!-- Highlight & Color -->
      <label class="rte-btn rte-color-wrap" title="Warna Teks">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.828 2.828 0 1 0-4-4L4 16z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/></svg>
        <input
          type="color"
          class="rte-color-input"
          :value="editor.getAttributes('textStyle').color || '#1a1a2e'"
          @input="editor.chain().focus().setColor($event.target.value).run()"
          title="Warna Teks"
        />
      </label>
      <label class="rte-btn rte-color-wrap" title="Sorot Teks">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
        <input
          type="color"
          class="rte-color-input"
          :value="editor.getAttributes('highlight').color || '#ffe066'"
          @input="editor.chain().focus().setHighlight({ color: $event.target.value }).run()"
          title="Sorot Teks"
        />
      </label>

      <div class="rte-sep" />

      <!-- Code & HR -->
      <button type="button" :class="btn(editor.isActive('code'))" title="Inline Code" @click="editor.chain().focus().toggleCode().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </button>
      <button type="button" :class="btn(false)" title="Garis Pemisah" @click="editor.chain().focus().setHorizontalRule().run()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>
      </button>
      <button type="button" :class="btn(false, 'text-red-400 hover:text-red-600')" title="Hapus Format" @click="editor.chain().focus().clearNodes().unsetAllMarks().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><line x1="4" y1="20" x2="7" y2="17"/></svg>
      </button>
    </div>

    <!-- ── Editor area ─────────────────────────────── -->
    <div class="rte-body" :style="{ minHeight: minHeight }">
      <EditorContent :editor="editor" />
      <p v-if="editor && editor.isEmpty" class="rte-placeholder">{{ placeholder }}</p>
    </div>
  </div>
</template>

<style scoped>
/* ── Wrapper ────────────────────────────────────── */
.rte-wrapper {
  border: 1.5px solid #e2e0f0;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px 0 rgba(100,90,200,0.06);
}
.rte-wrapper:focus-within {
  border-color: #7c6ff7;
  box-shadow: 0 0 0 3px rgba(124,111,247,0.12);
}

/* ── Toolbar ────────────────────────────────────── */
.rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 8px 10px;
  background: linear-gradient(135deg, #f8f7ff 0%, #f1f0fb 100%);
  border-bottom: 1.5px solid #ede9fe;
}

.rte-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  color: #5b5b8a;
  cursor: pointer;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
  user-select: none;
}
.rte-btn:hover {
  background: #ede9fe;
  color: #5b21b6;
  transform: scale(1.07);
}
.rte-btn--active {
  background: #7c6ff7;
  color: #fff;
  border-color: #6d5ce7;
  box-shadow: 0 2px 6px rgba(109,92,231,0.3);
}
.rte-btn--active:hover {
  background: #6d5ce7;
  color: #fff;
}

.rte-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.rte-sep {
  width: 1px;
  height: 20px;
  background: #ddd6fe;
  margin: 0 4px;
  border-radius: 2px;
}

/* ── Color input ────────────────────────────────── */
.rte-color-wrap {
  position: relative;
  cursor: pointer;
  gap: 0;
}
.rte-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border: none;
}

/* ── Editor body ────────────────────────────────── */
.rte-body {
  position: relative;
  padding: 14px 16px;
}

.rte-placeholder {
  position: absolute;
  top: 14px;
  left: 16px;
  color: #aaa8c8;
  pointer-events: none;
  font-size: 14px;
  margin: 0;
}

/* ── ProseMirror content styles ─────────────────── */
.rte-body :deep(.rte-content) {
  outline: none;
  min-height: inherit;
  font-size: 15px;
  line-height: 1.75;
  color: #1e1b4b;
  caret-color: #7c6ff7;
}

.rte-body :deep(.rte-content p) { margin: 0 0 0.25em; }
.rte-body :deep(.rte-content h1) { font-size: 1.6em; font-weight: 800; margin: 0.5em 0 0.25em; color: #1e1b4b; }
.rte-body :deep(.rte-content h2) { font-size: 1.3em; font-weight: 700; margin: 0.5em 0 0.25em; color: #312e81; }
.rte-body :deep(.rte-content h3) { font-size: 1.1em; font-weight: 700; margin: 0.4em 0 0.2em; color: #4338ca; }
.rte-body :deep(.rte-content ul) { padding-left: 1.5em; list-style: disc; margin: 0.3em 0; }
.rte-body :deep(.rte-content ol) { padding-left: 1.5em; list-style: decimal; margin: 0.3em 0; }
.rte-body :deep(.rte-content li) { margin: 0.15em 0; }
.rte-body :deep(.rte-content blockquote) {
  border-left: 3px solid #7c6ff7;
  padding: 4px 14px;
  margin: 0.4em 0;
  color: #6b7280;
  background: #faf5ff;
  border-radius: 0 8px 8px 0;
}
.rte-body :deep(.rte-content code) {
  background: #f1f0fb;
  border-radius: 5px;
  padding: 1px 5px;
  font-family: 'Fira Mono', monospace;
  font-size: 0.88em;
  color: #5b21b6;
}
.rte-body :deep(.rte-content hr) {
  border: none;
  border-top: 2px solid #e0d9f9;
  margin: 0.75em 0;
}
.rte-body :deep(.rte-content mark) {
  border-radius: 3px;
  padding: 0 2px;
}
.rte-body :deep(.ProseMirror-focused) { outline: none; }
</style>
