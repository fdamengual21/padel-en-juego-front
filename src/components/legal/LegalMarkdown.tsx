import Markdown from "react-markdown";

interface LegalMarkdownProps {
  markdown: string;
  hideTitle?: boolean;
}

export default function LegalMarkdown({ markdown, hideTitle = false }: LegalMarkdownProps) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_li]:text-muted-foreground [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <Markdown components={hideTitle ? { h1: () => null } : undefined}>
        {markdown}
      </Markdown>
    </div>
  );
}
