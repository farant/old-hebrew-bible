const file = Bun.file("modern-hebrew-genesis.txt");
const text = await file.text();
const lines = text.split("\n");

// ─── Load Strong's dictionary ───────────────────────────────────────────────
const strongsRaw = await Bun.file("strongs-hebrew-dictionary.js").text();
// Extract the JSON object: strip comments, var declaration, trailing semicolon, and module.exports
const strongsJson = strongsRaw
  .replace(/\/\*[\s\S]*?\*\//, "")           // strip block comment
  .replace(/var\s+\w+\s*=\s*/, "")           // strip var declaration
  .replace(/;\s*module\.exports[\s\S]*$/, "") // strip trailing module.exports
  .trim()
  .replace(/;$/, "");                         // strip trailing semicolon
const strongsDict: Record<string, { lemma: string; strongs_def: string; kjv_def: string }> =
  JSON.parse(strongsJson);

// ─── Load OSHB Genesis XML and build word → Strong's mapping ────────────────
const genXml = await Bun.file("Gen.xml").text();

// Parse all <w> elements with their lemma and text, grouped by verse
interface OshbWord {
  text: string;           // Hebrew text with slashes stripped
  consonants: string;     // Consonants only (for matching)
  strongsNums: string[];  // Strong's numbers from lemma attr
}

interface OshbVerse {
  chapter: number;
  verse: number;
  words: OshbWord[];
}

function hebrewConsonantsOnly(s: string): string {
  return s
    .replace(/\//g, "")
    .replace(/[\u034F\u0591-\u05AF\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, "")
    .replace(/[\u05C3\u05C0\u200F\u200E\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

const oshbVerses: OshbVerse[] = [];

// Extract verses with regex (avoid XML parser dependency)
const verseRe = /<verse\s+osisID="Gen\.(\d+)\.(\d+)">([\s\S]*?)<\/verse>/g;
let verseMatch;
while ((verseMatch = verseRe.exec(genXml)) !== null) {
  const chapter = parseInt(verseMatch[1]);
  const verse = parseInt(verseMatch[2]);
  const body = verseMatch[3];

  const words: OshbWord[] = [];
  const wordRe = /<w\s+lemma="([^"]*)"[^>]*>([^<]+)<\/w>/g;
  let wm;
  while ((wm = wordRe.exec(body)) !== null) {
    const lemmaAttr = wm[1];
    const wordText = wm[2];

    // Extract Strong's numbers: "b/7225" → ["7225"], "c/853" → ["853"]
    // Prefixes a,b,c,d,k,l,m,s are grammatical markers, not Strong's entries
    const strongsNums = lemmaAttr
      .split("/")
      .map((p) => p.trim().replace(/\s+[a-z]$/, "")) // strip trailing letter variants
      .filter((p) => /^\d+/.test(p))
      .map((p) => p.replace(/\D.*$/, "")); // keep just the number

    words.push({
      text: wordText.replace(/\//g, ""),
      consonants: hebrewConsonantsOnly(wordText),
      strongsNums,
    });
  }

  oshbVerses.push({ chapter, verse, words });
}

// Build a lookup: chapter:verse → list of OSHB words
const oshbLookup = new Map<string, OshbWord[]>();
for (const v of oshbVerses) {
  oshbLookup.set(`${v.chapter}:${v.verse}`, v.words);
}

// ─── Character mappings ─────────────────────────────────────────────────────

// Modern Hebrew consonants → Phoenician Unicode (Old Hebrew)
const charMap: Record<string, string> = {
  "א": "𐤀",
  "ב": "𐤁",
  "ג": "𐤂",
  "ד": "𐤃",
  "ה": "𐤄",
  "ו": "𐤅",
  "ז": "𐤆",
  "ח": "𐤇",
  "ט": "𐤈",
  "י": "𐤉",
  "כ": "𐤊",
  "ל": "𐤋",
  "מ": "𐤌",
  "נ": "𐤍",
  "ס": "𐤎",
  "ע": "𐤏",
  "פ": "𐤐",
  "צ": "𐤑",
  "ק": "𐤒",
  "ר": "𐤓",
  "ש": "𐤔",
  "ת": "𐤕",
  // Final forms → same Phoenician letter
  "ך": "𐤊",
  "ם": "𐤌",
  "ן": "𐤍",
  "ף": "𐤐",
  "ץ": "𐤑",
};

// Consonant transliteration: [without dagesh, with dagesh]
const consonantLatin: Record<string, [string, string]> = {
  "א": ["", ""],
  "ב": ["v", "b"],
  "ג": ["g", "g"],
  "ד": ["d", "d"],
  "ה": ["h", "h"],
  "ו": ["v", "v"],
  "ז": ["z", "z"],
  "ח": ["ch", "ch"],
  "ט": ["t", "t"],
  "י": ["y", "y"],
  "כ": ["kh", "k"],
  "ך": ["kh", "k"],
  "ל": ["l", "l"],
  "מ": ["m", "m"],
  "ם": ["m", "m"],
  "נ": ["n", "n"],
  "ן": ["n", "n"],
  "ס": ["s", "s"],
  "ע": ["", ""],
  "פ": ["f", "p"],
  "ף": ["f", "f"],
  "צ": ["ts", "ts"],
  "ץ": ["ts", "ts"],
  "ק": ["q", "q"],
  "ר": ["r", "r"],
  "ש": ["sh", "sh"],
  "ת": ["t", "t"],
};

// Nikkud → vowel sound
const vowelLatin: Record<number, string> = {
  0x05b0: "e",  // shva
  0x05b1: "e",  // hataf segol
  0x05b2: "a",  // hataf patach
  0x05b3: "o",  // hataf qamats
  0x05b4: "i",  // hiriq
  0x05b5: "ei", // tsere
  0x05b6: "e",  // segol
  0x05b7: "a",  // patach
  0x05b8: "a",  // qamats
  0x05b9: "o",  // holam
  0x05ba: "o",  // holam haser
  0x05bb: "u",  // qubutz
};

// ─── Text processing functions ──────────────────────────────────────────────

// Strip cantillation marks only (keep nikkud for transliteration)
function stripCantillation(s: string): string {
  return s.replace(/[\u034F\u0591-\u05AF]/g, "");
}

// Strip cantillation + nikkud + all combining marks
function stripDiacritics(s: string): string {
  return s.replace(/[\u034F\u0591-\u05AF\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, "");
}

// Strip directional formatting chars and UXLC textual notes like [t]
function cleanLine(s: string): string {
  return s
    .replace(/[\u200F\u200E\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\[[a-z]\]/g, "")
    .trim();
}

// Transliterate a single Hebrew word (with nikkud) to Latin pronunciation
function transliterateWord(word: string): string {
  const clean = stripCantillation(word);
  const chars = [...clean];
  let result = "";

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const code = ch.codePointAt(0)!;

    // Skip punctuation marks
    if (code === 0x05c3 || code === 0x05c0 || code === 0x05be) continue;

    // Is it a consonant?
    if (consonantLatin[ch]) {
      // Collect combining marks that follow this consonant
      let hasDagesh = false;
      let hasSinDot = false;
      let vowel = "";
      let j = i + 1;
      while (j < chars.length) {
        const nc = chars[j].codePointAt(0)!;
        if (nc === 0x05bc) {
          hasDagesh = true;
        } else if (nc === 0x05c1) {
          // shin dot — no action needed, default is shin
        } else if (nc === 0x05c2) {
          hasSinDot = true;
        } else if (vowelLatin[nc] !== undefined) {
          vowel = vowelLatin[nc];
        } else {
          break; // next base character
        }
        j++;
      }

      // Special: shin with sin dot → "s"
      if (ch === "ש") {
        result += hasSinDot ? "s" : "sh";
      }
      // Special: vav with dagesh and no vowel → shuruq ("u")
      else if (ch === "ו" && hasDagesh && !vowel) {
        result += "u";
        i = j - 1;
        continue;
      }
      // Special: vav with holam → holam male ("o"), not "vo"
      else if (ch === "ו" && vowel === "o") {
        result += "o";
        i = j - 1;
        continue;
      }
      // Normal consonant
      else {
        result += consonantLatin[ch][hasDagesh ? 1 : 0];
      }

      result += vowel;
      i = j - 1; // skip past the combining marks
    }
    // Standalone vowel (shouldn't happen often but just in case)
    else if (vowelLatin[code] !== undefined) {
      result += vowelLatin[code];
    }
  }

  return result;
}

// Transliterate a full verse text (handles spaces and maqaf)
function transliterateText(hebrewText: string): string[] {
  // Split on spaces, keeping maqaf-joined words together
  const rawWords = hebrewText
    .replace(/\u05C3/g, "")  // drop sof pasuq
    .replace(/\u05C0/g, "")  // drop paseq
    .split(/\s+/)
    .filter((w) => w.length > 0);

  return rawWords.map((w) => {
    // Handle maqaf-joined compound words
    const parts = w.split("\u05BE");
    return parts.map(transliterateWord).join("-");
  });
}

// Convert modern Hebrew text → Old Hebrew (Phoenician Unicode)
function toOldHebrew(hebrewText: string): string {
  const stripped = stripDiacritics(hebrewText);
  let result = "";
  for (const ch of stripped) {
    if (charMap[ch]) {
      result += charMap[ch];
    } else if (ch === "\u05BE") {
      // Maqaf (Hebrew hyphen) → Phoenician word separator
      result += "\u{1091F}";
    } else if (ch === " ") {
      result += " ";
    }
    // Drop sof pasuq (׃), paseq (׀), and any other marks
  }
  return result.replace(/ {2,}/g, " ").trim();
}

// Split Old Hebrew text into words (by spaces only, maqaf is inside words)
function splitOldHebrew(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

// Get consonants from our source text word (for matching against OSHB)
function ourConsonants(hebrewWord: string): string {
  return stripDiacritics(hebrewWord)
    .replace(/[\u05C3\u05C0\u05BE\u200F\u200E\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

// ─── Look up Strong's definition for a word ─────────────────────────────────
function getDefinition(strongsNums: string[]): string {
  const defs: string[] = [];
  for (const num of strongsNums) {
    const entry = strongsDict[`H${num}`];
    if (entry && entry.strongs_def) {
      let def = entry.strongs_def
        .replace(/\{([^}]+)\}/g, "$1") // unwrap {braces}
        .replace(/\s+/g, " ")
        .trim();
      defs.push(def);
    }
  }
  return defs.join("; ");
}

// ─── Match our words to OSHB words for a given verse ────────────────────────
// Our source splits on spaces and keeps maqaf-joined words together.
// OSHB splits every morpheme separately (including parts of maqaf words).
// We match by walking both lists and comparing consonants.
function matchWordsToStrongs(
  ourWords: string[],
  chapter: number,
  verse: number
): string[] {
  const oshbWords = oshbLookup.get(`${chapter}:${verse}`);
  if (!oshbWords) return ourWords.map(() => "");

  const definitions: string[] = [];
  let oi = 0; // oshb index

  for (const ourWord of ourWords) {
    // Our word may be multiple OSHB words joined by maqaf
    const parts = ourWord.split("\u05BE");
    const allNums: string[] = [];

    for (const part of parts) {
      const partCons = ourConsonants(part);
      // Accumulate OSHB words until their consonants match this part
      let accumulated = "";
      while (oi < oshbWords.length) {
        const ow = oshbWords[oi];
        accumulated += ow.consonants;
        allNums.push(...ow.strongsNums);
        oi++;
        if (accumulated === partCons) break;
        // If we've overshot, break to avoid runaway
        if (accumulated.length >= partCons.length) break;
      }
    }

    definitions.push(getDefinition(allNums));
  }

  return definitions;
}

// ─── Main processing ────────────────────────────────────────────────────────

interface Word {
  oldHebrew: string;
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

const verses: Verse[] = [];

for (const line of lines) {
  const cleaned = cleanLine(line);
  if (cleaned.includes("xxxx") || cleaned === "") continue;

  // Verse lines: "<verse>  ׃<chapter>   <text>"
  const match = cleaned.match(/^(\d+)\s+\u05C3(\d+)\s+(.+)$/);
  if (!match) continue;

  const verse = parseInt(match[1]);
  const chapter = parseInt(match[2]);
  let hebrewText = match[3].trim();

  // Strip trailing parashah markers (lone פ or ס after sof pasuq)
  hebrewText = hebrewText.replace(/\u05C3\s+[פס]\s*$/, "\u05C3");

  const oldHebrew = toOldHebrew(hebrewText);
  const oldHebrewWords = splitOldHebrew(oldHebrew);
  const transliterations = transliterateText(hebrewText);

  // Split original text the same way we split for transliteration
  const originalWords = hebrewText
    .replace(/\u05C3/g, "")
    .replace(/\u05C0/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const definitions = matchWordsToStrongs(originalWords, chapter, verse);

  // Pair up old hebrew words with transliterations and definitions
  const words: Word[] = oldHebrewWords.map((oh, i) => ({
    oldHebrew: oh,
    transliteration: transliterations[i] || "",
    definition: definitions[i] || "",
  }));

  verses.push({
    chapter,
    verse,
    original: hebrewText,
    oldHebrew,
    words,
  });
}

await Bun.write("genesis-old-hebrew.json", JSON.stringify(verses, null, 2));

// Build unique vocabulary with frequency counts and definitions
const vocabMap = new Map<string, { oldHebrew: string; transliteration: string; count: number; definition: string }>();
for (const v of verses) {
  for (const w of v.words) {
    if (!w.oldHebrew || !w.transliteration) continue;
    const existing = vocabMap.get(w.oldHebrew);
    if (existing) {
      existing.count++;
      // Keep the longer definition if we find one
      if (w.definition.length > existing.definition.length) {
        existing.definition = w.definition;
      }
    } else {
      vocabMap.set(w.oldHebrew, {
        oldHebrew: w.oldHebrew,
        transliteration: w.transliteration,
        count: 1,
        definition: w.definition,
      });
    }
  }
}

const vocabulary = [...vocabMap.values()].sort((a, b) =>
  a.transliteration.localeCompare(b.transliteration)
);

await Bun.write("vocabulary.json", JSON.stringify(vocabulary, null, 2));

const chapters = new Set(verses.map((v) => v.chapter)).size;
const withDefs = vocabulary.filter((v) => v.definition.length > 0).length;
console.log(`Translated ${verses.length} verses across ${chapters} chapters`);
console.log(`Vocabulary: ${vocabulary.length} unique words (${withDefs} with definitions)`);
