import path from "path";
import { readdirSync } from "fs";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/merge-dialogue.ts <book-dir>");
  process.exit(1);
}

const bookConfig = await Bun.file(path.join(bookDir, "book.json")).json();
const dir = path.join(bookDir, "dialogue");
const files = readdirSync(dir)
  .filter((f: string) => f.startsWith("chapter-") && f.endsWith(".json"))
  .sort();

const allDialogue: any[] = [];
let totalEntries = 0;
let chaptersWithDialogue = 0;

for (const file of files) {
  const data = await Bun.file(path.join(dir, file)).json();
  if (data.dialogue && data.dialogue.length > 0) {
    chaptersWithDialogue++;
    for (const entry of data.dialogue) {
      allDialogue.push({
        chapter: data.chapter,
        ...entry,
      });
      totalEntries++;
    }
  }
}

// Collect all unique speakers
const speakerCounts = new Map<string, number>();
for (const d of allDialogue) {
  speakerCounts.set(d.speaker, (speakerCounts.get(d.speaker) || 0) + 1);
}

// Determine which speakers are divine (for red text)
const divineSpeakers = new Set([
  "god", "yhwh", "yhwh-god", "angel-of-yhwh", "angel-of-god",
]);

const merged = {
  book: bookConfig.name,
  description: "Comprehensive dialogue metadata for all speakers",
  divineSpeakers: [...divineSpeakers],
  totalEntries,
  speakers: Object.fromEntries(
    [...speakerCounts.entries()].sort((a, b) => b[1] - a[1])
  ),
  dialogue: allDialogue,
};

await Bun.write(path.join(bookDir, "output/dialogue.json"), JSON.stringify(merged, null, 2));

console.log(`Merged ${files.length} chapter files`);
console.log(`${totalEntries} dialogue entries across ${chaptersWithDialogue} chapters`);
console.log(`${speakerCounts.size} unique speakers:`);
for (const [speaker, count] of [...speakerCounts.entries()].sort((a, b) => b[1] - a[1])) {
  const divine = divineSpeakers.has(speaker) ? " *" : "";
  console.log(`  ${speaker}: ${count}${divine}`);
}
