import path from "path";
import { mkdirSync } from "fs";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/generate-refs.ts <book-dir>");
  process.exit(1);
}

const data = await Bun.file(path.join(bookDir, "output/old-hebrew.json")).json();
const redTextDir = path.join(bookDir, "red-text");
mkdirSync(redTextDir, { recursive: true });

const chapters = new Map<number, any[]>();
for (const v of data) {
  if (!chapters.has(v.chapter)) chapters.set(v.chapter, []);
  chapters.get(v.chapter)!.push(v);
}

for (const [ch, verses] of chapters) {
  let ref = "";
  for (const v of verses) {
    const words = v.words
      .map((w: any, i: number) => `[${i}]${w.transliteration}`)
      .join(" ");
    ref += `${ch}:${v.verse} ${words}\n`;
  }
  const pad = String(ch).padStart(2, "0");
  await Bun.write(path.join(redTextDir, `ref-${pad}.txt`), ref);
}

console.log(`Created reference files for ${chapters.size} chapters`);
