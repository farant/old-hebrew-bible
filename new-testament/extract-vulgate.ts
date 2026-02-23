/**
 * Extracts NT books from the Clementine Vulgate TSV into per-book latin.txt files.
 *
 * Usage: bun run new-testament/extract-vulgate.ts
 *
 * Expects /tmp/vul.tsv to exist (downloaded from
 * https://raw.githubusercontent.com/theunpleasantowl/vul-complete/master/vul.tsv)
 */

import { readFileSync, writeFileSync } from "fs";

const NT_BOOKS = [
  { dir: "01_matthew",          vul: "Mt",    ref: "Matt" },
  { dir: "02_mark",             vul: "Mc",    ref: "Mark" },
  { dir: "03_luke",             vul: "Lc",    ref: "Luke" },
  { dir: "04_john",             vul: "Jo",    ref: "John" },
  { dir: "05_acts",             vul: "Act",   ref: "Acts" },
  { dir: "06_romans",           vul: "Rom",   ref: "Rom" },
  { dir: "07_1-corinthians",    vul: "1Cor",  ref: "1Cor" },
  { dir: "08_2-corinthians",    vul: "2Cor",  ref: "2Cor" },
  { dir: "09_galatians",        vul: "Gal",   ref: "Gal" },
  { dir: "10_ephesians",        vul: "Eph",   ref: "Eph" },
  { dir: "11_philippians",      vul: "Phlp",  ref: "Phil" },
  { dir: "12_colossians",       vul: "Col",   ref: "Col" },
  { dir: "13_1-thessalonians",  vul: "1Thes", ref: "1Thess" },
  { dir: "14_2-thessalonians",  vul: "2Thes", ref: "2Thess" },
  { dir: "15_1-timothy",        vul: "1Tim",  ref: "1Tim" },
  { dir: "16_2-timothy",        vul: "2Tim",  ref: "2Tim" },
  { dir: "17_titus",            vul: "Tit",   ref: "Titus" },
  { dir: "18_philemon",         vul: "Phlm",  ref: "Phlm" },
  { dir: "19_hebrews",          vul: "Hbr",   ref: "Heb" },
  { dir: "20_james",            vul: "Jac",   ref: "Jas" },
  { dir: "21_1-peter",          vul: "1Ptr",  ref: "1Pet" },
  { dir: "22_2-peter",          vul: "2Ptr",  ref: "2Pet" },
  { dir: "23_1-john",           vul: "1Jo",   ref: "1John" },
  { dir: "24_2-john",           vul: "2Jo",   ref: "2John" },
  { dir: "25_3-john",           vul: "3Jo",   ref: "3John" },
  { dir: "26_jude",             vul: "Jud",   ref: "Jude" },
  { dir: "27_revelation",       vul: "Apc",   ref: "Rev" },
];

const BASE_DIR = import.meta.dir;

// Build a lookup: vulgate abbrev → book config
const byVul = new Map(NT_BOOKS.map(b => [b.vul, b]));

// Parse the TSV — format: BookName \t Abbrev \t BookNum \t Chapter \t Verse \t Text
const tsv = readFileSync("/tmp/vul.tsv", "utf-8");
const bookLines = new Map<string, string[]>();
const seen = new Set<string>();

for (const line of tsv.split("\n")) {
  if (!line.trim()) continue;
  const cols = line.split("\t");
  if (cols.length < 6) continue;
  const [, abbrev, , chapter, verse, ...textParts] = cols;
  const book = byVul.get(abbrev);
  if (!book) continue;
  // Deduplicate — source TSV has triplicate entries
  const key = `${abbrev}:${chapter}:${verse}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const text = textParts.join("\t").trim();
  if (!bookLines.has(book.dir)) bookLines.set(book.dir, []);
  bookLines.get(book.dir)!.push(`${book.ref} ${chapter}:${verse}\t${text}`);
}

for (const book of NT_BOOKS) {
  const lines = bookLines.get(book.dir);
  if (!lines || lines.length === 0) {
    console.error(`  ✗ No verses found for ${book.dir} (vul: ${book.vul})`);
    continue;
  }
  const outPath = `${BASE_DIR}/${book.dir}/latin.txt`;
  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`  ✓ ${book.dir}/latin.txt (${lines.length} verses)`);
}

console.log("\nDone!");
