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

export type HelpAnswerBlock =
  | { type: "p"; spans: LegalInline[] }
  | { type: "ul"; items: LegalInline[][] };

export type HelpFaq = {
  id: string;
  question: string;
  answer: HelpAnswerBlock[];
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

const IMPRESSUM_HEADINGS = new Set([
  "Angaben gemäß § 5 DDG",
  "Verbraucherstreitbeilegung",
  "Haftung für Inhalte",
  "Haftung für Links",
]);

/** Hilfe Q numbers → category title */
const HILFE_CATEGORY: Record<number, string> = {
  1: "Bestellung",
  2: "Lieferung",
  3: "Bestellung",
  4: "Stornierung & Rückerstattung",
  5: "Stornierung & Rückerstattung",
  6: "Stornierung & Rückerstattung",
  7: "Stornierung & Rückerstattung",
  8: "Bestellung",
  9: "Lieferung",
  10: "Zahlung",
  11: "Zahlung",
  12: "WayPoints",
  13: "WayPoints",
  14: "WayPoints",
  15: "WayPoints",
  16: "WayPoints",
  17: "Konto",
  18: "Konto",
  19: "Konto",
  20: "Support",
};

const PARTNER_CATEGORY: Record<number, string> = {
  1: "Bestellungen",
  2: "Provision",
  3: "Provision",
  4: "Bestellungen",
  5: "Bestellungen",
  6: "Bestellungen",
  7: "Rückerstattungen",
  8: "Rückerstattungen",
  9: "WayPoints",
  10: "WayPoints",
  11: "WayPoints",
  12: "WayPoints",
  13: "WayPoints",
  14: "WayPoints",
  15: "WayPoints",
  16: "Zahlungen",
  17: "Rückerstattungen",
  18: "Abrechnung",
  19: "Support",
};

const HILFE_ORDER = [
  "Bestellung",
  "Zahlung",
  "Stornierung & Rückerstattung",
  "Lieferung",
  "WayPoints",
  "Konto",
  "Support",
];

const PARTNER_ORDER = [
  "Bestellungen",
  "Provision",
  "Zahlungen",
  "Rückerstattungen",
  "WayPoints",
  "Abrechnung",
  "Support",
];

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

const NUMBERED_HEADING = /^(\d+)\.\s+(.+)$/;

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
    const numbered = line.trim().match(NUMBERED_HEADING);
    // Section title like "1. Verantwortlicher" (short, no trailing ?) — treat as h2
    if (numbered && !numbered[2].includes("?") && numbered[2].length < 80) {
      blocks.push({ type: "h2", text: `${numbered[1]}. ${numbered[2]}` });
      i += 1;
      continue;
    }
    if (IMPRESSUM_HEADINGS.has(line.trim())) {
      blocks.push({ type: "h2", text: line.trim() });
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
    // Keep address / label lines as separate short paragraphs (verbatim line breaks matter less as space)
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^(#{1,3} |- )/.test(lines[i] ?? "") &&
      !NUMBERED_HEADING.test((lines[i] ?? "").trim()) &&
      !IMPRESSUM_HEADINGS.has((lines[i] ?? "").trim())
    ) {
      para.push((lines[i] ?? "").trim());
      i += 1;
      // Address blocks: stop after blank — handled by outer empty check; keep consecutive non-empty as one para only if long prose
      // For impressum address, each line is short — join with newline as separate paragraphs for readability
      if (para.length === 1 && para[0].length < 60 && i < lines.length && (lines[i] ?? "").trim() && (lines[i] ?? "").length < 60) {
        // emit short line as its own paragraph, continue
        const text = para[0];
        if (/^Stand:/.test(text) && blocks.at(-1)?.type === "h1") {
          blocks.push({ type: "lede", text });
        } else {
          blocks.push({ type: "p", spans: parseInline(text) });
        }
        para.length = 0;
        continue;
      }
    }
    if (para.length) {
      const text = para.join(" ");
      if (/^Stand:/.test(text) && blocks.at(-1)?.type === "h1") {
        blocks.push({ type: "lede", text });
      } else {
        blocks.push({ type: "p", spans: parseInline(text) });
      }
    }
  }
  return blocks;
}

function parseAnswerBlocks(rawLines: string[]): HelpAnswerBlock[] {
  const blocks: HelpAnswerBlock[] = [];
  let i = 0;
  const lines = rawLines;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
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
    while (i < lines.length && (lines[i] ?? "").trim() && !(lines[i] ?? "").startsWith("- ")) {
      para.push((lines[i] ?? "").trim());
      i += 1;
    }
    if (para.length) blocks.push({ type: "p", spans: parseInline(para.join(" ")) });
  }
  return blocks;
}

function buildCategories(
  faqs: { num: number; question: string; answer: HelpAnswerBlock[] }[],
  map: Record<number, string>,
  order: string[],
): HelpCategory[] {
  const byTitle = new Map<string, HelpFaq[]>();
  for (const title of order) byTitle.set(title, []);
  for (const faq of faqs) {
    const title = map[faq.num] ?? "Support";
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title)!.push({
      id: slugify(`${faq.num}-${faq.question}`),
      question: faq.question,
      answer: faq.answer,
    });
  }
  return order
    .filter((t) => (byTitle.get(t) ?? []).length > 0)
    .map((title) => ({ id: slugify(title), title, items: byTitle.get(title)! }));
}

/**
 * Parses owner verbatim Hilfe / Partner-Hilfe markdown:
 * `# Title`, intro paragraphs, then `N. Question?` + answer body.
 * Also still accepts ## / ### structured markdown if present.
 */
export function parseHelpMarkdown(md: string, kind: "hilfe" | "partner" = "hilfe"): HelpDocument {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let title = kind === "partner" ? "Partner-Hilfe" : "Hilfe";
  const introParts: string[] = [];
  const faqs: { num: number; question: string; answer: HelpAnswerBlock[] }[] = [];

  // Detect numbered Q&A format
  const hasNumbered = lines.some((l) => /^\d+\.\s+.+\?/.test(l.trim()) || /^\d+\.\s+Wie /.test(l.trim()) || /^\d+\.\s+Was /.test(l.trim()) || /^\d+\.\s+Kann /.test(l.trim()) || /^\d+\.\s+Wo /.test(l.trim()) || /^\d+\.\s+Wer /.test(l.trim()) || /^\d+\.\s+Welche /.test(l.trim()) || /^\d+\.\s+Warum /.test(l.trim()) || /^\d+\.\s+Wann /.test(l.trim()) || /^\d+\.\s+Fallen /.test(l.trim()) || /^\d+\.\s+Muss /.test(l.trim()));

  if (hasNumbered) {
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        i += 1;
        continue;
      }
      const qm = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (qm) {
        const num = Number(qm[1]);
        const question = qm[2].trim();
        i += 1;
        const answerLines: string[] = [];
        while (i < lines.length) {
          const next = lines[i] ?? "";
          if (/^\d+\.\s+/.test(next.trim())) break;
          answerLines.push(next);
          i += 1;
        }
        faqs.push({ num, question, answer: parseAnswerBlocks(answerLines) });
        continue;
      }
      if (line.trim() && faqs.length === 0) introParts.push(line.trim());
      i += 1;
    }
    const map = kind === "partner" ? PARTNER_CATEGORY : HILFE_CATEGORY;
    const order = kind === "partner" ? PARTNER_ORDER : HILFE_ORDER;
    return {
      title,
      intro: parseInline(introParts.join(" ")),
      categories: buildCategories(faqs, map, order),
    };
  }

  // Legacy ## / ### format
  const categories: HelpCategory[] = [];
  let category: HelpCategory | null = null;
  let faq: HelpFaq | null = null;
  let answerLines: string[] = [];

  const flushAnswer = () => {
    if (!faq || !category) return;
    faq.answer = parseAnswerBlocks(answerLines);
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
