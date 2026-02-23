/**
 * Phase 3 — Apply LXX diffs to the Masoretic Old Hebrew text.
 *
 * Usage: bun run scripts/apply-lxx-diffs.ts <book-dir>
 *
 * Reads output/old-hebrew.json and lxx-diffs/batch-*.json files,
 * applies each diff operation, and writes the result to output/lxx.json.
 */

import path from "path";
import { readdirSync } from "fs";
import { toOldHebrew } from "./hebrew-utils.ts";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/apply-lxx-diffs.ts <book-dir>");
  process.exit(1);
}

interface Word {
  oldHebrew: string;
  transliteration: string;
  definition: string;
}

interface DiffWord {
  hebrew: string;
  transliteration: string;
  definition: string;
}

interface Verse {
  chapter: number;
  verse: number;
  original: string;
  oldHebrew: string;
  words: Word[];
}

interface DiffOp {
  id: number;
  research_id: number;
  chapter: number;
  verse: number;
  op: "replace" | "insert" | "remove";
  target_words?: number[];
  after_word?: number;
  new_words?: DiffWord[];
  description: string;
  lxx_greek?: string;
  lxx_english?: string;
}

// Convert diff words (square Hebrew) to verse words (Old Hebrew)
function convertWords(diffWords: DiffWord[]): Word[] {
  return diffWords.map((dw) => ({
    oldHebrew: toOldHebrew(dw.hebrew),
    transliteration: dw.transliteration,
    definition: dw.definition,
  }));
}

// Load Masoretic text
const mt: Verse[] = await Bun.file(path.join(bookDir, "output/old-hebrew.json")).json();

// Load all diff batches
const diffDir = path.join(bookDir, "lxx-diffs");
const batchFiles = readdirSync(diffDir)
  .filter((f) => f.startsWith("batch-") && f.endsWith(".json"))
  .sort();

const allDiffs: DiffOp[] = [];
for (const file of batchFiles) {
  const data = await Bun.file(path.join(diffDir, file)).json();
  if (data.diffs) {
    allDiffs.push(...data.diffs);
  }
}

// Sort diffs by chapter, verse, then by descending word index
// (apply from right to left within a verse so indices stay valid)
allDiffs.sort((a, b) => {
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  if (a.verse !== b.verse) return a.verse - b.verse;
  const aIdx = a.target_words?.[0] ?? a.after_word ?? 0;
  const bIdx = b.target_words?.[0] ?? b.after_word ?? 0;
  return bIdx - aIdx; // descending so we apply from right to left
});

// Deep clone the MT text
const lxx: Verse[] = JSON.parse(JSON.stringify(mt));

// Build verse lookup
const verseLookup = new Map<string, Verse>();
for (const v of lxx) {
  verseLookup.set(`${v.chapter}:${v.verse}`, v);
}

const report: string[] = [];
let applied = 0;
let skipped = 0;

for (const diff of allDiffs) {
  const key = `${diff.chapter}:${diff.verse}`;
  const verse = verseLookup.get(key);

  if (!verse) {
    report.push(`SKIP diff ${diff.id}: verse ${key} not found`);
    skipped++;
    continue;
  }

  const before = verse.words.map((w) => w.transliteration).join(" ");

  try {
    switch (diff.op) {
      case "replace": {
        if (!diff.target_words || !diff.new_words) {
          throw new Error("replace requires target_words and new_words");
        }
        const newWords = convertWords(diff.new_words);
        // Sort target indices descending for safe splicing
        const sorted = [...diff.target_words].sort((a, b) => b - a);
        // Remove all target words except the first (lowest index)
        const lowest = Math.min(...diff.target_words);
        for (const idx of sorted) {
          if (idx !== lowest) {
            verse.words.splice(idx, 1);
          }
        }
        // Replace at the lowest index
        verse.words.splice(lowest, 1, ...newWords);
        break;
      }

      case "insert": {
        if (diff.after_word === undefined || !diff.new_words) {
          throw new Error("insert requires after_word and new_words");
        }
        const newWords = convertWords(diff.new_words);
        const insertAt = diff.after_word + 1;
        verse.words.splice(insertAt, 0, ...newWords);
        break;
      }

      case "remove": {
        if (!diff.target_words) {
          throw new Error("remove requires target_words");
        }
        // Sort descending for safe splicing
        const sorted = [...diff.target_words].sort((a, b) => b - a);
        for (const idx of sorted) {
          verse.words.splice(idx, 1);
        }
        break;
      }

      default:
        throw new Error(`Unknown op: ${diff.op}`);
    }

    // Rebuild the verse's oldHebrew string from words
    verse.oldHebrew = verse.words.map((w) => w.oldHebrew).join(" ");

    const after = verse.words.map((w) => w.transliteration).join(" ");
    report.push(
      `APPLIED diff ${diff.id} (${diff.op}) to ${key}: ${diff.description}`
    );
    report.push(`  BEFORE: ${before}`);
    report.push(`  AFTER:  ${after}`);
    applied++;
  } catch (err: any) {
    report.push(`ERROR diff ${diff.id} on ${key}: ${err.message}`);
    skipped++;
  }
}

// Write the LXX text
const lxxPath = path.join(bookDir, "output/lxx.json");
await Bun.write(lxxPath, JSON.stringify(lxx, null, 2));

// Write the report
const reportText = [
  `LXX Diff Application Report`,
  `===========================`,
  `Applied: ${applied}`,
  `Skipped: ${skipped}`,
  `Total diffs: ${allDiffs.length}`,
  ``,
  ...report,
].join("\n");

const reportPath = path.join(bookDir, "lxx-diffs/application-report.txt");
await Bun.write(reportPath, reportText);

console.log(`Applied ${applied} diffs (${skipped} skipped)`);
console.log(`Wrote ${lxxPath} and ${reportPath}`);
