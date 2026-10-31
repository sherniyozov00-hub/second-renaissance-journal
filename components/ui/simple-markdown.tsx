function inline(text: string) {
  return text.split("**").map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part));
}

/**
 * Renders paragraphs, "## " headings, "- " lists and **bold** — enough for
 * lessons and static pages, with no HTML injection.
 */
export function SimpleMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-6 font-serif text-2xl font-bold text-ink">
              {inline(block.slice(3).trim())}
            </h2>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}
