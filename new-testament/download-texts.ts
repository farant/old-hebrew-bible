/**
 * Downloads SBLGNT Greek NT and Delitzsch Hebrew NT texts
 * into the per-book folder structure.
 *
 * Usage: bun run new-testament/download-texts.ts
 *
 * No third-party dependencies — uses native fetch + regex parsing.
 */

const NT_BOOKS = [
  { dir: "01_matthew",          sblgnt: "Matt",   obohu: "Mt",  chapters: 28 },
  { dir: "02_mark",             sblgnt: "Mark",   obohu: "Mk",  chapters: 16 },
  { dir: "03_luke",             sblgnt: "Luke",   obohu: "L",   chapters: 24 },
  { dir: "04_john",             sblgnt: "John",   obohu: "J",   chapters: 21 },
  { dir: "05_acts",             sblgnt: "Acts",   obohu: "Sk",  chapters: 28 },
  { dir: "06_romans",           sblgnt: "Rom",    obohu: "R",   chapters: 16 },
  { dir: "07_1-corinthians",    sblgnt: "1Cor",   obohu: "1K",  chapters: 16 },
  { dir: "08_2-corinthians",    sblgnt: "2Cor",   obohu: "2K",  chapters: 13 },
  { dir: "09_galatians",        sblgnt: "Gal",    obohu: "Ga",  chapters: 6 },
  { dir: "10_ephesians",        sblgnt: "Eph",    obohu: "Ef",  chapters: 6 },
  { dir: "11_philippians",      sblgnt: "Phil",   obohu: "Fp",  chapters: 4 },
  { dir: "12_colossians",       sblgnt: "Col",    obohu: "Ko",  chapters: 4 },
  { dir: "13_1-thessalonians",  sblgnt: "1Thess", obohu: "1Te", chapters: 5 },
  { dir: "14_2-thessalonians",  sblgnt: "2Thess", obohu: "2Te", chapters: 3 },
  { dir: "15_1-timothy",        sblgnt: "1Tim",   obohu: "1Tm", chapters: 6 },
  { dir: "16_2-timothy",        sblgnt: "2Tim",   obohu: "2Tm", chapters: 4 },
  { dir: "17_titus",            sblgnt: "Titus",  obohu: "Tit", chapters: 3 },
  { dir: "18_philemon",         sblgnt: "Phlm",   obohu: "Fm",  chapters: 1 },
  { dir: "19_hebrews",          sblgnt: "Heb",    obohu: "Zd",  chapters: 13 },
  { dir: "20_james",            sblgnt: "Jas",    obohu: "Jk",  chapters: 5 },
  { dir: "21_1-peter",          sblgnt: "1Pet",   obohu: "1P",  chapters: 5 },
  { dir: "22_2-peter",          sblgnt: "2Pet",   obohu: "2P",  chapters: 3 },
  { dir: "23_1-john",           sblgnt: "1John",  obohu: "1J",  chapters: 5 },
  { dir: "24_2-john",           sblgnt: "2John",  obohu: "2J",  chapters: 1 },
  { dir: "25_3-john",           sblgnt: "3John",  obohu: "3J",  chapters: 1 },
  { dir: "26_jude",             sblgnt: "Jude",   obohu: "Ju",  chapters: 1 },
  { dir: "27_revelation",       sblgnt: "Rev",    obohu: "Zj",  chapters: 22 },
];

const BASE_DIR = import.meta.dir;
const SBLGNT_RAW = "https://raw.githubusercontent.com/LogosBible/SBLGNT/master/data/sblgnt/text";
const OBOHU_BASE = "https://www.obohu.cz/bible/index.php";

// ── Greek (SBLGNT) ──────────────────────────────────────────────────

async function downloadGreek(book: typeof NT_BOOKS[number]) {
  const url = `${SBLGNT_RAW}/${book.sblgnt}.txt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Greek ${book.sblgnt}: ${res.status}`);
  const text = await res.text();
  const outPath = `${BASE_DIR}/${book.dir}/greek.txt`;
  await Bun.write(outPath, text);
  console.log(`  ✓ Greek: ${book.dir}/greek.txt`);
}

// ── Hebrew (Delitzsch via obohu.cz) ─────────────────────────────────

function parseHebrewVerses(html: string): { verse: number; text: string }[] {
  const verses: { verse: number; text: string }[] = [];
  // Match: <span id="v{N}"> ... <span class="textverseh">HEBREW</span>
  const re = /<span id="v(\d+)".*?<span class="textverseh">(.*?)<\/span>/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const verse = parseInt(m[1], 10);
    // Strip any remaining HTML tags from the text
    const text = m[2].replace(/<[^>]*>/g, "").trim();
    if (text) verses.push({ verse, text });
  }
  return verses;
}

async function downloadHebrewChapter(
  book: typeof NT_BOOKS[number],
  chapter: number
): Promise<{ verse: number; text: string }[]> {
  const url = `${OBOHU_BASE}?styl=HNTD&k=${book.obohu}&kap=${chapter}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Hebrew ${book.obohu} ch${chapter}: ${res.status}`);
  const html = await res.text();
  return parseHebrewVerses(html);
}

async function downloadHebrew(book: typeof NT_BOOKS[number]) {
  const allVerses: string[] = [];
  for (let ch = 1; ch <= book.chapters; ch++) {
    const verses = await downloadHebrewChapter(book, ch);
    for (const v of verses) {
      allVerses.push(`${book.sblgnt} ${ch}:${v.verse}\t${v.text}`);
    }
    // Be polite to the server
    await Bun.sleep(200);
  }
  const outPath = `${BASE_DIR}/${book.dir}/hebrew.txt`;
  await Bun.write(outPath, allVerses.join("\n") + "\n");
  console.log(`  ✓ Hebrew: ${book.dir}/hebrew.txt (${allVerses.length} verses)`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Allow filtering: bun run download-texts.ts matthew
  const filter = process.argv[2]?.toLowerCase();

  const books = filter
    ? NT_BOOKS.filter(b => b.dir.includes(filter))
    : NT_BOOKS;

  if (books.length === 0) {
    console.error(`No books matched filter: ${filter}`);
    process.exit(1);
  }

  console.log(`Downloading ${books.length} book(s)...\n`);

  // Download Greek texts in parallel (all from GitHub, fast)
  console.log("── Greek (SBLGNT) ──");
  await Promise.all(books.map(downloadGreek));

  // Download Hebrew texts sequentially (scraping, be polite)
  console.log("\n── Hebrew (Delitzsch) ──");
  for (const book of books) {
    await downloadHebrew(book);
  }

  console.log("\nDone!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
