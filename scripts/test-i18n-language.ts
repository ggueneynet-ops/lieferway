import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  LEGACY_LOCALE_COOKIE,
  LEGACY_LOCALE_STORAGE_KEY,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
} from "../src/lib/constants";
import {
  LANGUAGE_LABELS,
  LOCALES,
  dictionaries,
  parseLocale,
  suggestLocaleFromBrowser,
} from "../src/lib/i18n";
import {
  languageCookieWriter,
  readLanguageCookieValue,
  readStoredLanguageChoice,
} from "../src/lib/language-persist";

function main() {
  assert.equal(LOCALE_COOKIE, "lieferway_language");
  assert.equal(LOCALE_STORAGE_KEY, "lieferway_language");
  assert.equal(LEGACY_LOCALE_COOKIE, "lw_locale");
  assert.equal(LEGACY_LOCALE_STORAGE_KEY, "lw_locale");

  assert.deepEqual([...LOCALES], ["de", "en", "tr"]);
  assert.equal(parseLocale("de"), "de");
  assert.equal(parseLocale("EN"), "en");
  assert.equal(parseLocale("Tr"), "tr");
  assert.equal(parseLocale("fr"), "de");
  assert.equal(parseLocale(null), "de");

  assert.equal(suggestLocaleFromBrowser("de"), "de");
  assert.equal(suggestLocaleFromBrowser("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(suggestLocaleFromBrowser("tr-TR"), "tr");
  assert.equal(suggestLocaleFromBrowser("en-GB"), "en");
  assert.equal(suggestLocaleFromBrowser("fr-FR"), "en");
  assert.equal(suggestLocaleFromBrowser(""), "en");
  assert.equal(suggestLocaleFromBrowser(null), "en");

  assert.equal(LANGUAGE_LABELS.de, "Deutsch");
  assert.equal(LANGUAGE_LABELS.en, "English");
  assert.equal(LANGUAGE_LABELS.tr, "Türkçe");

  const deKeys = Object.keys(dictionaries.de).sort();
  const enKeys = Object.keys(dictionaries.en).sort();
  const trKeys = Object.keys(dictionaries.tr).sort();
  assert.deepEqual(enKeys, deKeys, "EN dictionary keys must match DE");
  assert.deepEqual(trKeys, deKeys, "TR dictionary keys must match DE");

  for (const locale of LOCALES) {
    assert.ok(dictionaries[locale].chooseLanguage);
    assert.ok(dictionaries[locale].language);
    assert.equal(dictionaries[locale].langNameDe, "Deutsch");
    assert.equal(dictionaries[locale].langNameEn, "English");
    assert.equal(dictionaries[locale].langNameTr, "Türkçe");
  }
  assert.equal(dictionaries.de.chooseLanguage, "Sprache wählen");
  assert.equal(dictionaries.en.chooseLanguage, "Choose language");
  assert.equal(dictionaries.tr.chooseLanguage, "Dil seç");

  assert.match(languageCookieWriter("tr"), /^lieferway_language=tr;path=\/;max-age=31536000;SameSite=Lax$/);
  assert.equal(readLanguageCookieValue("lw_plz=60311; lieferway_language=en"), "en");
  assert.equal(readLanguageCookieValue("lw_locale=tr; other=1"), "tr");
  assert.equal(readLanguageCookieValue("lieferway_language=en; lw_locale=de"), "en");
  assert.equal(
    readStoredLanguageChoice({
      cookieHeader: "lw_locale=tr",
      localStorageValue: null,
      legacyLocalStorageValue: "en",
    }),
    "tr",
  );
  assert.equal(
    readStoredLanguageChoice({
      cookieHeader: "",
      localStorageValue: "en",
      legacyLocalStorageValue: "de",
    }),
    "en",
  );
  assert.equal(
    readStoredLanguageChoice({
      cookieHeader: "",
      localStorageValue: null,
      legacyLocalStorageValue: "de",
    }),
    "de",
  );
  assert.equal(readStoredLanguageChoice({ cookieHeader: "", localStorageValue: null }), null);

  const root = path.join(import.meta.dirname, "..");
  for (const code of LOCALES) {
    const flag = path.join(root, "public/flags", `${code}.svg`);
    assert.ok(existsSync(flag), `missing flag ${code}`);
    const svg = readFileSync(flag, "utf8");
    assert.match(svg, /<svg /);
  }

  const srcRoot = path.join(root, "src");
  const leftover: string[] = [];
  const walk = [srcRoot];
  while (walk.length) {
    const dir = walk.pop()!;
    for (const entry of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const body = readFileSync(full, "utf8");
      if (body.includes("LocaleToggle") || body.includes("locale-toggle")) leftover.push(full);
    }
  }
  assert.deepEqual(leftover, [], `scattered LocaleToggle leftover: ${leftover.join(", ")}`);
  assert.equal(existsSync(path.join(srcRoot, "components/locale-toggle.tsx")), false);
  assert.ok(existsSync(path.join(srcRoot, "components/language-switcher.tsx")));
  assert.ok(existsSync(path.join(srcRoot, "components/first-visit-language-picker.tsx")));
  assert.ok(existsSync(path.join(srcRoot, "app/api/account/locale/route.ts")));

  const sameAsDe = { en: [] as string[], tr: [] as string[] };
  const allow = new Set([
    "brand",
    "city",
    "langNameDe",
    "langNameEn",
    "langNameTr",
    "payApple",
    "payGoogle",
    "payCard",
    "cvc",
    "email",
    "name",
    "partner",
    "items",
    "total",
    "open",
    "close",
    "eta",
    "qty",
    "paid",
    "login",
    "error",
    "search",
    "coupon",
    "notes",
    "rating",
    "add",
    "cart",
    "order",
    "password",
    "street",
    "postal",
    "demoHint",
    "demoHelp",
    "demoHelpCustomer",
    "demoHelpPartner",
    "demoHelpPassword",
    "couponHintLocal5",
    "couponHintStart5",
    "footerDemoNote",
    "fillDemo",
  ]);
  for (const key of deKeys) {
    if (allow.has(key)) continue;
    if (!dictionaries.de[key as keyof typeof dictionaries.de]) continue;
    if (dictionaries.en[key as keyof typeof dictionaries.en] === dictionaries.de[key as keyof typeof dictionaries.de]) {
      sameAsDe.en.push(key);
    }
    if (dictionaries.tr[key as keyof typeof dictionaries.tr] === dictionaries.de[key as keyof typeof dictionaries.de]) {
      sameAsDe.tr.push(key);
    }
  }

  console.log("i18n language selector ok");
  console.log(`dictionary keys: ${deKeys.length}`);
  console.log(`en same-as-de (non-allowlisted): ${sameAsDe.en.length}`);
  console.log(`tr same-as-de (non-allowlisted): ${sameAsDe.tr.length}`);
  if (sameAsDe.en.length) console.log("en leftovers:", sameAsDe.en.join(", "));
  if (sameAsDe.tr.length) console.log("tr leftovers:", sameAsDe.tr.join(", "));
}

main();
