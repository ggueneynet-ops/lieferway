import { readFile } from "node:fs/promises";
import path from "node:path";

export type LegalInline =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

export type LegalBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "lede"; text: string }
  | { type: "p"; spans: LegalInline[] }
  | { type: "ul"; items: LegalInline[][] };

export type HelpFaq = {
  id: string;
  question: string;
  answer: LegalInline[][];
};

export type HelpCategory = {
  id: string;
  title: string;
  items: HelpFaq[];
};

export type HelpDocument = {
  title: string;
  intro: LegalInline[];
  categories: HelpCategory[];
};

const LEGAL_DIR = path.join(process.cwd(), "docs/legal");

export async function loadLegalMarkdown(slug: "impressum" | "datenschutz" | "hilfe" | "partner-hilfe") {
  return readFile(path.join(LEGAL_DIR, `${slug}.md`), "utf8");
}

export function parseInline(raw: string): LegalInline[] {
  const spans: LegalInline[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    if (match.index > last) spans.push({ type: "text", text: raw.slice(last, match.index) });
    spans.push({ type: "link", text: match[1], href: match[2] });
    last = match.index + match[0].length;
  }
  if (last < raw.length) spans.push({ type: "text", text: raw.slice(last) });
  return spans.length ? spans : [{ type: "text", text: raw }];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

export function parseLegalMarkdown(md: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: LegalInline[][] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("- ")) {
        items.push(parseInline((lines[i] ?? "").slice(2).trim()));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() && !/^(#{1,3} |- )/.test(lines[i] ?? "")) {
      para.push((lines[i] ?? "").trim());
      i += 1;
    }
    const text = para.join(" ");
    if (/^Stand:/.test(text) && blocks.at(-1)?.type === "h1") {
      blocks.push({ type: "lede", text });
    } else {
      blocks.push({ type: "p", spans: parseInline(text) });
    }
  }
  return blocks;
}

export function parseHelpMarkdown(md: string): HelpDocument {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let title = "Hilfe";
  const introParts: string[] = [];
  const categories: HelpCategory[] = [];
  let category: HelpCategory | null = null;
  let faq: HelpFaq | null = null;
  let answerLines: string[] = [];

  const flushAnswer = () => {
    if (!faq || !category) return;
    const paragraphs = answerLines
      .join("\n")
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean)
      .map((p) => parseInline(p));
    faq.answer = paragraphs;
    category.items.push(faq);
    faq = null;
    answerLines = [];
  };

  for (const raw of lines) {
    if (raw.startsWith("# ")) {
      title = raw.slice(2).trim();
      continue;
    }
    if (raw.startsWith("## ")) {
      flushAnswer();
      category = { id: slugify(raw.slice(3)), title: raw.slice(3).trim(), items: [] };
      categories.push(category);
      continue;
    }
    if (raw.startsWith("### ")) {
      flushAnswer();
      const question = raw.slice(4).trim();
      faq = { id: slugify(question), question, answer: [] };
      continue;
    }
    if (!category) {
      if (raw.trim()) introParts.push(raw.trim());
      continue;
    }
    if (faq) answerLines.push(raw);
  }
  flushAnswer();

  return {
    title,
    intro: parseInline(introParts.join(" ")),
    categories,
  };
}

export function flattenFaqs(doc: HelpDocument): HelpFaq[] {
  return doc.categories.flatMap((c) => c.items);
}
