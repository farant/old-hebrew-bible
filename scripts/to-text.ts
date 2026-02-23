import path from "path";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/to-text.ts <book-dir>");
  process.exit(1);
}

const json = await Bun.file(path.join(bookDir, "output/old-hebrew.json")).json();

interface Verse {
  chapter: number;
  verse: number;
  original: string;
  oldHebrew: string;
}

const verses: Verse[] = json;
const lines: string[] = [];

let currentChapter = 0;

for (const v of verses) {
  if (v.chapter !== currentChapter) {
    if (currentChapter > 0) lines.push("");
    currentChapter = v.chapter;
    lines.push(`Chapter ${v.chapter}`);
    lines.push("");
  }
  const num = String(v.verse).padStart(2, " ");
  lines.push(`${num}  ${v.oldHebrew}`);
}

lines.push("");

const outPath = path.join(bookDir, "output/old-hebrew.txt");
await Bun.write(outPath, lines.join("\n"));
console.log(`Wrote ${verses.length} verses to ${outPath}`);
