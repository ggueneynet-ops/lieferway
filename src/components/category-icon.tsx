import { readFileSync } from "node:fs";
import { join } from "node:path";

const SLUG: Record<string, string> = {
  all: "alle",
  Alle: "alle",
  Türkisch: "tuerkisch",
  Italienisch: "italienisch",
  Burger: "burger",
  Sushi: "sushi",
  Pizza: "pizza",
  Gesund: "gesund",
  Vietnamesisch: "asiatisch",
  Deutsch: "deutsch",
};

export function categoryIconSlug(key: string) {
  return SLUG[key] ?? "alle";
}

/** Designer 24px stroke icons from public/icons/categories — stroke=currentColor. */
export function CategoryIcon({
  name,
  className = "size-6",
}: {
  name: string;
  className?: string;
}) {
  const slug = categoryIconSlug(name);
  const raw = readFileSync(join(process.cwd(), "public/icons/categories", `${slug}.svg`), "utf8");
  const svg = raw
    .replace("<svg ", `<svg class="${className}" `)
    .replace(/stroke-width="[^"]+"/, 'stroke-width="1.5"');
  return <span className="inline-flex text-inherit" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
}
