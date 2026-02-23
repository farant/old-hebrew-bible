/**
 * Parses greek.txt, hebrew.txt, and latin.txt from a NT book directory
 * and produces a combined text.json organized by chapter/verse.
 *
 * Usage: bun run scripts/nt-build-text-json.ts new-testament/01_matthew
 *
 * Output format (flat array, consistent with OT old-hebrew.json):
 * [
 *   { "chapter": 1, "verse": 1, "greek": "...", "hebrew": "...", "latin": "..." },
 *   ...
 * ]
 */

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/nt-build-text-json.ts <book-dir>");
  console.error("  e.g. bun run scripts/nt-build-text-json.ts new-testament/01_matthew");
  process.exit(1);
}

const root = `${import.meta.dir}/..`;
const dir = `${root}/${bookDir}`;

type Verse = { chapter: number; verse: number; greek: string; hebrew: string; latin: string };

function parseTextFile(path: string): Map<string, string> {
  let text: string;
  try {
    text = require("fs").readFileSync(path, "utf-8") as string;
  } catch {
    return new Map();
  }
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    // Format: "Book Ch:V\ttext"
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const ref = line.slice(0, tab).trim();
    const content = line.slice(tab + 1).trim();
    // Extract just "Ch:V" from "Book Ch:V"
    const space = ref.lastIndexOf(" ");
    if (space === -1) continue;
    const cv = ref.slice(space + 1); // "1:1"
    map.set(cv, content);
  }
  return map;
}

const greekMap = parseTextFile(`${dir}/greek.txt`);
const hebrewMap = parseTextFile(`${dir}/hebrew.txt`);
const latinMap = parseTextFile(`${dir}/latin.txt`);

// Merge on the union of all chapter:verse keys
const allKeys = new Set([...greekMap.keys(), ...hebrewMap.keys(), ...latinMap.keys()]);

const verses: Verse[] = [...allKeys]
  .map(cv => {
    const [ch, v] = cv.split(":").map(Number);
    return {
      chapter: ch,
      verse: v,
      greek: greekMap.get(cv) ?? "",
      hebrew: hebrewMap.get(cv) ?? "",
      latin: latinMap.get(cv) ?? "",
    };
  })
  .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

const outPath = `${dir}/text.json`;
require("fs").writeFileSync(outPath, JSON.stringify(verses, null, 2) + "\n");

console.log(`${bookDir}/text.json — ${verses.length} verses`);

// Report any mismatches
const sources = { greek: greekMap, hebrew: hebrewMap, latin: latinMap };
for (const [name, map] of Object.entries(sources)) {
  const others = Object.entries(sources).filter(([n]) => n !== name);
  const unique = [...map.keys()].filter(k => others.every(([, m]) => !m.has(k)));
  if (unique.length) console.log(`  ⚠ ${name}-only verses: ${unique.join(", ")}`);
}
