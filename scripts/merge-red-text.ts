import path from "path";
import { readdirSync } from "fs";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/merge-red-text.ts <book-dir>");
  process.exit(1);
}

const bookConfig = await Bun.file(path.join(bookDir, "book.json")).json();
const dir = path.join(bookDir, "red-text");
const files = readdirSync(dir)
  .filter((f) => f.startsWith("chapter-") && f.endsWith(".json"))
  .sort();

const allSpeeches: any[] = [];
let totalSpeeches = 0;
let chaptersWithSpeech = 0;

for (const file of files) {
  const data = await Bun.file(path.join(dir, file)).json();
  if (data.speeches && data.speeches.length > 0) {
    chaptersWithSpeech++;
    for (const speech of data.speeches) {
      allSpeeches.push({
        chapter: data.chapter,
        ...speech,
      });
      totalSpeeches++;
    }
  }
}

const merged = {
  book: bookConfig.name,
  description: "Red text metadata marking words spoken by the Holy Trinity",
  totalSpeeches,
  speeches: allSpeeches,
};

await Bun.write(path.join(bookDir, "output/red-text.json"), JSON.stringify(merged, null, 2));

console.log(`Merged ${files.length} chapter files`);
console.log(`${totalSpeeches} speech entries across ${chaptersWithSpeech} chapters`);

// Print summary by speaker
const bySpeaker = new Map<string, number>();
for (const s of allSpeeches) {
  bySpeaker.set(s.speaker, (bySpeaker.get(s.speaker) || 0) + 1);
}
for (const [speaker, count] of [...bySpeaker.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${speaker}: ${count} entries`);
}
