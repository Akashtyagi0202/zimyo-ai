/**
 * _RichTextEditor — internal TipTap-based primitive.
 * Used by both standalone Editor.jsx (MessageRenderer type) and Form.jsx field type.
 *
 * Output is HTML string via onChange.
 *
 * config:
 *   toolbar:    array of tool ids (see TOOLBAR_TOOLS keys). Default = full set.
 *   placeholder: shown when empty (visual only — TipTap doesn't have built-in placeholder
 *                without an extra extension; we simulate with empty-state CSS hook).
 *   minHeight:  px, default 160
 *   readOnly:   boolean
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, List, ListOrdered,
  Quote, Undo, Redo, Link as LinkIcon,
} from 'lucide-react'

const DEFAULT_TOOLBAR = [
  'bold', 'italic', 'strike',
  '|',
  'h1', 'h2',
  'ul', 'ol',
  '|',
  'quote', 'code',
  '|',
  'undo', 'redo',
]

const TOOLBAR_TOOLS = {
  bold: {
    icon: Bold,
    title: 'Bold',
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  italic: {
    icon: Italic,
    title: 'Italic',
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  strike: {
    icon: Strikethrough,
    title: 'Strikethrough',
    isActive: (e) => e.isActive('strike'),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  h1: {
    icon: Heading1,
    title: 'Heading 1',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  h2: {
    icon: Heading2,
    title: 'Heading 2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  ul: {
    icon: List,
    title: 'Bullet list',
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  ol: {
    icon: ListOrdered,
    title: 'Ordered list',
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  quote: {
    icon: Quote,
    title: 'Quote',
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  code: {
    icon: Code,
    title: 'Code',
    isActive: (e) => e.isActive('codeBlock'),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  undo: {
    icon: Undo,
    title: 'Undo',
    isActive: () => false,
    run: (e) => e.chain().focus().undo().run(),
    canRun: (e) => e.can().undo(),
  },
  redo: {
    icon: Redo,
    title: 'Redo',
    isActive: () => false,
    run: (e) => e.chain().focus().redo().run(),
    canRun: (e) => e.can().redo(),
  },
  link: {
    icon: LinkIcon,
    title: 'Insert link (browser prompt)',
    isActive: (e) => e.isActive('link'),
    run: (e) => {
      const url = window.prompt('Enter URL')
      if (url === null) return
      if (url === '') {
        e.chain().focus().extendMarkRange('link').unsetLink?.().run()
        return
      }
      // StarterKit doesn't include link mark by default; safely degrade if missing.
      const cmd = e.chain().focus()
      if (typeof cmd.setLink === 'function') {
        cmd.setLink({ href: url }).run()
      } else {
        e.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run()
      }
    },
  },
}

export default function RichTextEditor({
  value = '',
  onChange,
  config = {},
  className = '',
}) {
  const {
    toolbar = DEFAULT_TOOLBAR,
    placeholder = 'Start typing…',
    minHeight = 160,
    readOnly = false,
  } = config

  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          'tiptap-surface prose prose-sm max-w-none focus:outline-none px-3 py-2.5 text-[14px] text-gray-800 leading-relaxed',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Keep external value in sync when it changes from outside (e.g. defaultValue swap)
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [readOnly, editor])

  if (!editor) return null

  return (
    <div className={`border border-gray-200 rounded-lg bg-white overflow-hidden ${className}`}>
      {!readOnly && (
        <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
          {toolbar.map((id, idx) => {
            if (id === '|') return <span key={`sep-${idx}`} className="w-px h-4 bg-gray-200 mx-1" />
            const tool = TOOLBAR_TOOLS[id]
            if (!tool) return null
            const Icon = tool.icon
            const active = tool.isActive(editor)
            const disabled = tool.canRun ? !tool.canRun(editor) : false
            return (
              <button
                key={id}
                type="button"
                onClick={() => tool.run(editor)}
                disabled={disabled}
                title={tool.title}
                className={`p-1.5 rounded-md transition-colors ${
                  active
                    ? 'bg-zimyo-100 text-zimyo-700'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            )
          })}
        </div>
      )}
      <div style={{ minHeight }} className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
