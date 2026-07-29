import React from "react";

/**
 * Minimal Markdown renderer for AI output.
 *
 * WHY NOT react-markdown:
 * It plus remark-gfm is ~60 KB of JavaScript shipped to every student, and a
 * meaningful download on Zimbabwean mobile data — for a job that is a few
 * dozen lines. This handles exactly the subset language models actually
 * produce: headings, bold/italic, bullet and numbered lists, tables, code,
 * blockquotes and rules.
 *
 * SAFETY: no `dangerouslySetInnerHTML` anywhere. Every piece of text becomes a
 * React text node, so model output cannot inject markup — which matters
 * because this renders content produced by a third-party service.
 */

/** Inline: **bold**, *italic*, `code`, and bare URLs. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Split on the inline constructs, keeping the delimiters.
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|https?:\/\/\S+)/g;
  const parts = text.split(pattern);

  parts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push(
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2 &&
      !part.startsWith("**")
    ) {
      out.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      out.push(
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else if (/^https?:\/\//.test(part)) {
      out.push(
        <a
          key={key}
          href={part}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-2"
        >
          {part}
        </a>,
      );
    } else {
      out.push(<React.Fragment key={key}>{part}</React.Fragment>);
    }
  });

  return out;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

const isTableDivider = (line: string) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(line);

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { text: string; ordered: boolean }[] = [];
  let code: string[] | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`} className="leading-relaxed">
        {renderInline(paragraph.join(" "), `p${key}`)}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    const ordered = list[0].ordered;
    const items = list.map((item, i) => (
      <li key={i} className="leading-relaxed">
        {renderInline(item.text, `li${key}-${i}`)}
      </li>
    ));
    blocks.push(
      ordered ? (
        <ol key={`ol-${key++}`} className="ml-5 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={`ul-${key++}`} className="ml-5 list-disc space-y-1">
          {items}
        </ul>
      ),
    );
    list = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trim().startsWith("```")) {
      if (code === null) {
        flushAll();
        code = [];
      } else {
        blocks.push(
          <pre
            key={`code-${key++}`}
            className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed"
          >
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      }
      continue;
    }
    if (code !== null) {
      code.push(line);
      continue;
    }

    // Tables: a header row followed by a |---|---| divider
    if (line.includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushAll();
      const header = splitRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes("|")) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      blocks.push(
        // Tables are the one thing that genuinely needs to scroll on a phone —
        // squeezing five columns into 360px is unreadable.
        <div key={`t-${key++}`} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {header.map((h, hi) => (
                  <th key={hi} className="px-2 py-1.5 text-left font-semibold">
                    {renderInline(h, `th${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-2 py-1.5 align-top">
                      {renderInline(c, `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = j - 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      flushAll();
      blocks.push(<hr key={`hr-${key++}`} className="my-1 border-border/60" />);
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const text = renderInline(heading[2], `h${key}`);
      const cls =
        level <= 2
          ? "mt-2 text-base font-bold"
          : "mt-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground";
      blocks.push(
        <p key={`h-${key++}`} className={cls}>
          {text}
        </p>,
      );
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith("> ")) {
      flushAll();
      blocks.push(
        <p
          key={`q-${key++}`}
          className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
        >
          {renderInline(line.trimStart().slice(2), `q${key}`)}
        </p>,
      );
      continue;
    }

    // List items
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      list.push({
        text: (bullet?.[1] ?? numbered?.[1]) as string,
        ordered: Boolean(numbered),
      });
      continue;
    }

    // Blank line ends the current block
    if (line.trim() === "") {
      flushAll();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushAll();
  if (code) {
    blocks.push(
      <pre
        key={`code-${key++}`}
        className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs"
      >
        <code>{code.join("\n")}</code>
      </pre>,
    );
  }

  return <div className="space-y-2.5 text-sm">{blocks}</div>;
}
