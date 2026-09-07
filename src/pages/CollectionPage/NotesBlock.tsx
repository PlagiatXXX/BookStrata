interface NotesBlockProps {
  excerpt?: string | null;
  editorialNote?: string | null;
}

export function NotesBlock({ excerpt, editorialNote }: NotesBlockProps) {
  if (!excerpt && !editorialNote) return null;

  return (
    <article className="collection-glass-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="collection-section-title flex items-center gap-2">
            <span>Заметки кураторской коллегии</span>
          </div>
        </div>

        {excerpt && (
          <blockquote className="collection-blockquote mb-4">
            «{excerpt}»
          </blockquote>
        )}
      </div>

    </article>
  );
}
