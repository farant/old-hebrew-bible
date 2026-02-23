// Shared Hebrew ↔ Old Hebrew (Phoenician) utilities
// Used by translate.ts and apply-lxx-diffs.ts

// Modern Hebrew consonants → Phoenician Unicode (Old Hebrew)
export const charMap: Record<string, string> = {
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

// Strip cantillation + nikkud + all combining marks
export function stripDiacritics(s: string): string {
  return s.replace(/[\u034F\u0591-\u05AF\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, "");
}

// Convert modern Hebrew text → Old Hebrew (Phoenician Unicode)
export function toOldHebrew(hebrewText: string): string {
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
