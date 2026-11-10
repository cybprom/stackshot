import { snippetTokens, type SnippetToken } from "@/lib/site";

const TOKEN_CLASS: Record<SnippetToken["kind"], string> = {
  tag: "text-code-dim",
  attr: "text-code-tag",
  string: "text-code-string",
  plain: "",
};

/** The `<picture>` block, coloured. Both places it appears are always dark. */
export function SnippetCode({ snippet, id }: { snippet: string; id?: string }) {
  return (
    <pre id={id} className="site-code overflow-x-auto bg-code-surface p-4 leading-[1.75] text-code-ink sm:px-5">
      {snippetTokens(snippet).map((token, index) => (
        <span key={index} className={TOKEN_CLASS[token.kind]}>
          {token.text}
        </span>
      ))}
    </pre>
  );
}
