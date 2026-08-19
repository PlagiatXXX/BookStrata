import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import "./WysiwygEditor.css";

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Загрузка изображения файлом; кнопка «Файл» видна только при переданном пропе */
  onUploadImage?: (base64: string) => Promise<{ imageUrl: string }>;
}

export function WysiwygEditor({ value, onChange, onUploadImage }: WysiwygEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  // Обновляем содержимое редактора при изменении value извне
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleFileSelect = async (file: File) => {
    if (!onUploadImage) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const { imageUrl } = await onUploadImage(reader.result as string);
          editor.chain().focus().setImage({ src: imageUrl }).run();
        } catch (error) {
          console.error(error);
          sileo.error({
            title: "Ошибка загрузки",
            description: "Не удалось загрузить изображение",
            duration: 4000,
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="wysiwyg-editor">
      <div className="tiptap-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title="Жирный"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title="Курсив"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title="Зачёркнутый"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
          title="Заголовок H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}
          title="Заголовок H3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
          title="Маркированный список"
        >
          • Список
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
          title="Нумерованный список"
        >
          1. Список
        </button>
        {onUploadImage && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Загрузить файл"
          >
            🖼️ Файл
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Введите URL изображения:");
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          title="Вставить изображение по URL"
        >
          🔗 По URL
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href;
            const url = window.prompt("Введите URL ссылки:", previousUrl);
            if (url === null) {
              editor.chain().focus().unsetLink().run();
            } else if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={editor.isActive("link") ? "is-active" : ""}
          title="Вставить ссылку"
        >
          🔗 Ссылка
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Очистить форматирование"
        >
          ✕ Очистить
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
