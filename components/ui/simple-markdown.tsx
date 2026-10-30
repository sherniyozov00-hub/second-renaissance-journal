/** Renders paragraphs and **bold** only — enough for lesson bodies, with no HTML injection. */
export function SimpleMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para
            .split("**")
            .map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
        </p>
      ))}
    </div>
  );
}
