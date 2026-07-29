/**
 * Markdown → plain text.
 *
 * WHY THIS EXISTS
 * Project and task descriptions are frequently written BY the AI assistant,
 * which returns Markdown whether or not we asked for it. A field like
 * `workspace.description` therefore arrives as `**PLC Telemetry System:** ...`
 * and, rendered as a raw string, shows the asterisks to the student — which
 * looks broken.
 *
 * Two different treatments are correct depending on context:
 *
 *   - Somewhere the text has room to breathe (a detail page header), render it
 *     properly with <Markdown>.
 *   - Somewhere it is a one- or two-line preview inside a card or list item,
 *     formatting is noise. Strip it to plain prose instead — a bold run inside
 *     a truncated card adds nothing and complicates the layout.
 *
 * This module covers the second case. It is deliberately lossy: the goal is
 * readable prose, not a faithful downgrade.
 */

/** Strip the Markdown syntax a language model typically emits. */
export function stripMarkdown(input: string): string {
  return (
    input
      // Fenced code blocks → keep the code, drop the fences.
      .replace(/```[a-zA-Z]*\n?/g, "")
      // Images before links, since ![alt](src) also matches the link pattern.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Headings, blockquotes and list bullets at line start.
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s{0,3}[-*+]\s+/gm, "")
      .replace(/^\s{0,3}\d+[.)]\s+/gm, "")
      // Horizontal rules become nothing rather than stray punctuation.
      .replace(/^\s{0,3}([-*_])\s*(\1\s*){2,}$/gm, "")
      // Emphasis. Bold first: **x** would otherwise leave a stray asterisk.
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      // Table alignment rows (|---|:--:|) carry no meaning once the table is
      // flattened, and would otherwise survive as a line of dashes.
      // NB: [ \t] rather than \s throughout. In multiline mode `\s*$` happily
      // consumes the trailing newline, which silently welds adjacent rows
      // together ("Part QtyESP32 2").
      .replace(/^[ \t]*\|?[ \t:|-]*\|[ \t:|-]*$/gm, "")
      // Remaining table pipes would read as a wall of punctuation.
      .replace(/^[ \t]*\|.*\|[ \t]*$/gm, (row) =>
        row.replace(/\|/g, " ").replace(/[ \t]{2,}/g, " ").trim(),
      )
      // Collapse the whitespace the removals leave behind.
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Plain-text preview capped at `max` characters, cut on a word boundary.
 *
 * Truncating mid-word looks like a rendering fault, so we step back to the
 * last space when one exists reasonably close to the limit.
 */
export function preview(input: string, max = 180): string {
  const text = stripMarkdown(input).replace(/\s*\n+\s*/g, " ");
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[.,;:!?-]+$/, "")}…`;
}
