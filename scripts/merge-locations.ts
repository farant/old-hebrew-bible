import path from "path";
import { readdirSync } from "fs";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/merge-locations.ts <book-dir>");
  process.exit(1);
}

const bookConfig = await Bun.file(path.join(bookDir, "book.json")).json();
const dir = path.join(bookDir, "locations");
const files = readdirSync(dir)
  .filter((f: string) => f.startsWith("chapter-") && f.endsWith(".json"))
  .sort();

const allMentions: any[] = [];
let totalMentions = 0;
let chaptersWithLocations = 0;

for (const file of files) {
  const data = await Bun.file(path.join(dir, file)).json();
  if (data.mentions && data.mentions.length > 0) {
    chaptersWithLocations++;
    for (const mention of data.mentions) {
      allMentions.push({
        chapter: data.chapter,
        ...mention,
      });
      totalMentions++;
    }
  }
}

// Count unique locations referenced
const locationCounts = new Map<string, number>();
for (const m of allMentions) {
  locationCounts.set(m.location, (locationCounts.get(m.location) || 0) + 1);
}

const merged = {
  book: bookConfig.name,
  description: "Location mentions extracted from the text",
  totalMentions,
  uniqueLocations: locationCounts.size,
  locationFrequency: Object.fromEntries(
    [...locationCounts.entries()].sort((a, b) => b[1] - a[1])
  ),
  mentions: allMentions,
};

await Bun.write(path.join(bookDir, "output/locations.json"), JSON.stringify(merged, null, 2));

console.log(`Merged ${files.length} chapter files`);
console.log(`${totalMentions} location mentions across ${chaptersWithLocations} chapters`);
console.log(`${locationCounts.size} unique locations:`);
for (const [loc, count] of [...locationCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${loc}: ${count}`);
}
