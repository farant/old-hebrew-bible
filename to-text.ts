const json = await Bun.file("genesis-old-hebrew.json").json();

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

await Bun.write("genesis-old-hebrew.txt", lines.join("\n"));
console.log(`Wrote ${verses.length} verses to genesis-old-hebrew.txt`);
