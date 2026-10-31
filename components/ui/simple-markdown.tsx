import { Fragment } from "react";

function inline(text: string) {
  return text.split("**").map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part));
}

/** Lines of one block: runs of "- " lines become a list, other lines a paragraph. */
function block(text: string) {
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push(<p key={`p${out.length}`}>{inline(para.join(" "))}</p>);
    if (list.length)
      out.push(
        <ul key={`l${out.length}`} className="list-disc space-y-1.5 pl-6">
          {list.map((l, j) => (
            <li key={j}>{inline(l)}</li>
          ))}
        </ul>,
      );
    para = [];
    list = [];
  };
  for (const line of text.split("\n")) {
    if (line.startsWith("- ")) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return out;
}

/**
 * Renders paragraphs, "## " headings, "- " lists and **bold** — enough for
 * lessons and static pages, with no HTML injection.
 */
export function SimpleMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((b, i) =>
        b.startsWith("## ") ? (
          <h2 key={i} className="mt-6 font-serif text-2xl font-bold text-ink">
            {inline(b.slice(3).trim())}
          </h2>
        ) : (
          <Fragment key={i}>{block(b)}</Fragment>
        ),
      )}
    </div>
  );
}
