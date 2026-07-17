/**
 * Минимальный markdown → HTML конвертер.
 * Не претендует на полноту, покрывает только то, что нужно для статей.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderInline(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
}

export function mdToHtml(md: string): string {
  const lines = md.split("\n")
  const html: string[] = []
  let inCodeBlock = false
  let codeLang = ""
  let codeBuf: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(
          `<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
        )
        codeBuf = []
        codeLang = ""
        inCodeBlock = false
      } else {
        inCodeBlock = true
        codeLang = line.slice(3).trim()
      }
      continue
    }
    if (inCodeBlock) {
      codeBuf.push(line)
      continue
    }

    // Empty line
    if (line.trim() === "") {
      // Close any open paragraph
      if (html.length > 0 && !html[html.length - 1].startsWith("<")) {
        // paragraph is implicitly closed by next block element
      }
      continue
    }

    // Headers
    const hMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      const level = hMatch[1].length
      html.push(`<h${level}>${renderInline(hMatch[2])}</h${level}>`)
      continue
    }

    // Unordered list
    if (line.match(/^-\s+(.+)/)) {
      const content = renderInline(line.replace(/^-\s+/, ""))
      if (html.length > 0 && html[html.length - 1] === "</ul>") {
        html.pop()
      }
      if (
        html.length === 0 ||
        !html[html.length - 1].startsWith("<li")
      ) {
        html.push("<ul>")
      }
      html.push(`<li>${content}</li>`)
      // Check next line to close ul
      const nextLine = lines[i + 1]?.trim()
      if (!nextLine || !nextLine.startsWith("- ")) {
        html.push("</ul>")
      }
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const content = renderInline(line.slice(2))
      html.push(`<blockquote>${content}</blockquote>`)
      continue
    }

    // Paragraph (default)
    html.push(`<p>${renderInline(line)}</p>`)
  }

  // Close unclosed code block
  if (inCodeBlock && codeBuf.length > 0) {
    html.push(
      `<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
    )
  }

  return html.join("\n")
}
