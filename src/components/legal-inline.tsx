import type { LegalInline } from "@/lib/legal-content";

export function LegalInlineText({ spans }: { spans: LegalInline[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.type === "link" ? (
          <a
            key={`${span.href}-${i}`}
            href={span.href}
            className="font-medium text-[#E91E63] underline-offset-2 hover:underline"
          >
            {span.text}
          </a>
        ) : (
          <span key={i}>{span.text}</span>
        ),
      )}
    </>
  );
}
