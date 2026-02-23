const file = Bun.file("modern-hebrew-genesis.txt");
const text = await file.text();
const lines = text.split("\n");

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
      let hasShinDot = false;
      let hasSinDot = false;
      let vowel = "";
      let j = i + 1;
      while (j < chars.length) {
        const nc = chars[j].codePointAt(0)!;
        if (nc === 0x05bc) {
          hasDagesh = true;
        } else if (nc === 0x05c1) {
          hasShinDot = true;
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

interface Word {
  oldHebrew: string;
  transliteration: string;
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

  // Pair up old hebrew words with transliterations
  const words: Word[] = oldHebrewWords.map((oh, i) => ({
    oldHebrew: oh,
    transliteration: transliterations[i] || "",
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

const chapters = new Set(verses.map((v) => v.chapter)).size;
console.log(`Translated ${verses.length} verses across ${chapters} chapters`);
