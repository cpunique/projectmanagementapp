'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  className,
  editable = true,
}: RichTextEditorProps) => {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder,
        }),
        Link.configure({
          openOnClick: false,
        }),
      ],
      content: value,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
      editable,
      immediatelyRender: false,
    },
    [placeholder, editable]
  );

  // Update editor content when value prop changes (but not on every keystroke)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !editor) {
    return <div className={cn('w-full h-32 rounded-lg bg-gray-100 dark:bg-gray-700', className)} />;
  }

  return (
    <div className={cn('w-full', className)}>
      {editable && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );
};

interface ToolbarProps {
  editor: any;
}

const Toolbar = ({ editor }: ToolbarProps) => {
  const buttonClass =
    'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 text-sm font-medium';
  const activeButtonClass =
    'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';

  return (
    <div className="flex items-center gap-1 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 flex-wrap">
      {/* Bold */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(buttonClass, editor.isActive('bold') && activeButtonClass)}
        title="Bold (Ctrl+B)"
      >
        B
      </button>

      {/* Italic */}
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(buttonClass, editor.isActive('italic') && activeButtonClass)}
        title="Italic (Ctrl+I)"
      >
        I
      </button>

      {/* Underline (Code) */}
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
        className={cn(buttonClass, editor.isActive('codeBlock') && activeButtonClass)}
        title="Code Block"
      >
        {'<>'}
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Heading 1 */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(buttonClass, editor.isActive('heading', { level: 1 }) && activeButtonClass)}
        title="Heading 1"
      >
        H1
      </button>

      {/* Heading 2 */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(buttonClass, editor.isActive('heading', { level: 2 }) && activeButtonClass)}
        title="Heading 2"
      >
        H2
      </button>

      {/* Heading 3 */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(buttonClass, editor.isActive('heading', { level: 3 }) && activeButtonClass)}
        title="Heading 3"
      >
        H3
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Bullet List */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(buttonClass, editor.isActive('bulletList') && activeButtonClass)}
        title="Bullet List"
      >
        •
      </button>

      {/* Ordered List */}
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(buttonClass, editor.isActive('orderedList') && activeButtonClass)}
        title="Ordered List"
      >
        1.
      </button>

      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(buttonClass, editor.isActive('blockquote') && activeButtonClass)}
        title="Blockquote"
      >
        "
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Link */}
      <button
        onClick={() => {
          const url = prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={cn(buttonClass, editor.isActive('link') && activeButtonClass)}
        title="Add Link"
      >
        🔗
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Clear All Content */}
      <button
        onClick={() => {
          if (confirm('Clear all content? This cannot be undone.')) {
            editor.chain().focus().clearContent().run();
          }
        }}
        className={buttonClass}
        title="Clear All Content"
      >
        ✕
      </button>
    </div>
  );
};

export default RichTextEditor;
