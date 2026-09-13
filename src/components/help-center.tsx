"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LegalInlineText } from "@/components/legal-inline";
import type { HelpDocument } from "@/lib/legal-content";

export function HelpCenter({
  doc,
  searchLabel,
  searchPlaceholder,
  emptyLabel,
  contactEmail = "info@lieferway.de",
}: {
  doc: HelpDocument;
  searchLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  contactEmail?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const categories = useMemo(() => {
    if (!q) return doc.categories;
    return doc.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          const answer = item.answer
            .flatMap((block) =>
              block.type === "p"
                ? block.spans.map((s) => s.text)
                : block.items.flat().map((s) => s.text),
            )
            .join(" ")
            .toLowerCase();
          return item.question.toLowerCase().includes(q) || answer.includes(q) || cat.title.toLowerCase().includes(q);
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [doc.categories, q]);

  return (
    <div>
      <label className="sr-only" htmlFor="help-search">
        {searchLabel}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-[#E8E8EC] bg-white pl-10 pr-3 text-[15px] text-[#0F172A] outline-none ring-[#E91E63]/20 placeholder:text-[#9CA3AF] focus:border-[#E91E63] focus:ring-4"
        />
      </div>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {doc.categories.map((cat) => (
          <a
            key={cat.id}
            href={`#${cat.id}`}
            className="shrink-0 rounded-full border border-[#E8E8EC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0F172A] hover:border-[#F8BBD0] hover:bg-[#FCE4EC]"
          >
            {cat.title}
          </a>
        ))}
      </nav>

      {categories.length === 0 ? (
        <p className="mt-8 text-[15px] leading-relaxed text-[#64748B]">{emptyLabel}</p>
      ) : (
        categories.map((cat) => (
          <section key={cat.id} id={cat.id} className="mt-8 scroll-mt-24">
            <h2 className="font-display text-lg font-semibold tracking-tight text-[#0F172A]">{cat.title}</h2>
            <div className="mt-3 divide-y divide-[#F3F4F6] overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white">
              {cat.items.map((item) => (
                <details key={item.id} className="group px-4">
                  <summary className="cursor-pointer list-none py-4 text-[15px] font-semibold text-[#0F172A] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-3">
                      <span>{item.question}</span>
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-[#9CA3AF] transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <div className="space-y-3 pb-4 text-[15px] leading-relaxed text-[#111827]">
                    {item.answer.map((block, i) =>
                      block.type === "ul" ? (
                        <ul key={i} className="list-disc space-y-1.5 pl-5">
                          {block.items.map((spans, j) => (
                            <li key={j}>
                              <LegalInlineText spans={spans} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p key={i}>
                          <LegalInlineText spans={block.spans} />
                        </p>
                      ),
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))
      )}

      <aside className="mt-10 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-4 py-5">
        <h2 className="font-display text-base font-semibold text-[#0F172A]">Kontakt</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#111827]">
          Nicht gefunden? Schreiben Sie an{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-[#E91E63] underline-offset-2 hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </aside>
    </div>
  );
}
