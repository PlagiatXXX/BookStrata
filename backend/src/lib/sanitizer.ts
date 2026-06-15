import sanitizeHtml from "sanitize-html";

/**
 * Опции для санитизации HTML-контента новостей и подборок.
 * Разрешает безопасный набор тегов для форматирования текста.
 */
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4",
    "h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div",
    "dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p", "pre",
    "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn",
    "em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp",
    "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption",
    "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "img"
  ],
  allowedAttributes: {
    a: ["href", "name", "target"],
    img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
    "*": ["class"], // Классы для Tailwind-стилизации. Style-атрибут не нужен: TipTap-редактор генерирует HTML без inline-стилей (only class-based). Инлайн style = поверхность для CSS injection (position:fixed overlay, expression(), url(javascript:)).
    // ID запрещены во избежание DOM Clobbering.
  },
  // Запрещаем скрипты, фреймы и другие опасные элементы
  disallowedTagsMode: "discard",
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  allowProtocolRelative: true,
  enforceHtmlBoundary: false
};

/**
 * Функция для очистки HTML от вредоносного кода (XSS).
 * @param html - Исходный HTML-код
 * @returns Очищенный HTML-код
 */
export function sanitize(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, sanitizeOptions);
}
