import DOMPurify from "dompurify";

interface ThemeProseProps {
  content: string;
}

export function ThemeProse({ content }: ThemeProseProps) {
  const sanitizedHtml = DOMPurify.sanitize(content);

  return (
    <div
      className="prose max-w-none"
      style={{
        fontFamily: "var(--theme-font-body)",
        color: "var(--theme-on-surface-variant)",
        lineHeight: "1.8",
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
