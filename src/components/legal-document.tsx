import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LegalInlineText } from "@/components/legal-inline";
import type { LegalBlock } from "@/lib/legal-content";

export function LegalDocument({
  title,
  blocks,
  chrome = "market",
}: {
  title: string;
  blocks: LegalBlock[];
  chrome?: "market" | "app";
}) {
  return (
    <>
      <SiteHeader chrome={chrome} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-12">
        {blocks.map((block, i) => {
          if (block.type === "h1") {
            return (
              <h1
                key={`h1-${i}`}
                className="font-display text-[1.75rem] font-semibold tracking-tight text-[#0F172A] sm:text-3xl"
              >
                {block.text}
              </h1>
            );
          }
          if (block.type === "lede") {
            return (
              <p key={`lede-${i}`} className="mt-2 text-[13px] text-[#64748B]">
                {block.text}
              </p>
            );
          }
          if (block.type === "h2") {
            return (
              <h2
                key={`h2-${i}`}
                className="mt-9 font-display text-lg font-semibold tracking-tight text-[#0F172A] first:mt-0"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "ul") {
            return (
              <ul key={`ul-${i}`} className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#111827]">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <LegalInlineText spans={item} />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={`p-${i}`} className="mt-3 text-[15px] leading-relaxed text-[#111827]">
              <LegalInlineText spans={block.spans} />
            </p>
          );
        })}
        <p className="sr-only">{title}</p>
      </main>
      <SiteFooter />
    </>
  );
}
