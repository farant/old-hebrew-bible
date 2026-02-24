# New Testament — Old Hebrew Translation Project

## Goal

Produce an Old Hebrew (Paleo Hebrew / Phoenician Unicode) translation of the New Testament, working in the Catholic tradition.

## Source Texts

Each book directory contains three source texts:

- **`latin.txt`** — Clementine Vulgate (1592). **This is the authoritative reference text.** Versification, content, and theology follow the Vulgate.
- **`greek.txt`** — SBLGNT (Society of Biblical Literature Greek New Testament). Modern critical Greek text, useful as a reference to the original language but NOT the governing text. Where SBLGNT diverges from the Vulgate, we follow the Vulgate.
- **`hebrew.txt`** — Delitzsch Hebrew NT (1877, 12th ed.). Franz Delitzsch's translation of the Greek NT into Hebrew. This is our starting point for the Hebrew text, which we will evaluate and revise.

**`text.json`** combines all three into a single file keyed by chapter/verse.

## Theological Orientation

- **Catholic tradition**. The Vulgate is the standard.
- We are NOT doing neutral textual criticism weighing manuscript traditions equally. We follow the Vulgate reading.
- **One exception**: where a non-Vulgate reading aligns better with the Septuagint (LXX) and is not a significant theological or content change, it may be preferred — since the broader project is oriented around the Septuagint tradition.
- Verses present in the Vulgate but absent from the SBLGNT (e.g., Matt 17:21, 18:11, 23:14) are **included** — they are part of the Catholic canon.

## Translation Notes Pipeline

### Phase 1 — Review pass (current phase)

For each book, agents review the text chapter-by-chapter and produce notes in `<book>/notes/chapter-NN.md`. Notes are **selective** — only flagging items that meet these criteria:

1. **Versification**: Does the Greek/Hebrew numbering match the Vulgate? Flag mismatches.
2. **Content alignment with Vulgate**: Flag where the Greek or Hebrew diverge from the Vulgate in content. Note whether the Delitzsch Hebrew follows a non-Vulgate reading (he often follows the Textus Receptus / Byzantine tradition, which usually but not always aligns with the Vulgate).
3. **Hebrew translation quality**: Evaluate Delitzsch's Hebrew against **biblical Hebrew** standards:
   - Modern/Mishnaic Hebrew where biblical Hebrew is expected
   - Unidiomatic or forced constructions
   - Word choices that could better reflect the source via biblical idiom
   - Positive notes where Delitzsch chose excellent biblical parallels
4. **Other**: Anything else important — OT allusions, theological significance, Septuagint connections.

Agents work in parallel, each taking a batch of chapters. Notes can be merged later.

### Phase 2 — Revision (future)

Use the review notes to produce a revised Hebrew text that:
- Aligns with Vulgate versification and content
- Replaces modern Hebrew with biblical Hebrew where possible
- Improves unidiomatic constructions
- Gets transliterated into Old Hebrew (Phoenician Unicode)

## Folder Structure

```
new-testament/
├── CLAUDE.md              # This file
├── download-texts.ts      # Downloads Greek + Hebrew source texts
├── extract-vulgate.ts     # Extracts Latin from Clementine Vulgate TSV
├── 01_matthew/
│   ├── greek.txt          # SBLGNT
│   ├── hebrew.txt         # Delitzsch
│   ├── latin.txt          # Clementine Vulgate
│   ├── text.json          # Combined chapter/verse/greek/hebrew/latin
│   └── notes/             # Review notes per chapter
│       ├── chapter-01.md
│       └── ...
├── 02_mark/
│   └── ...
└── 27_revelation/
    └── ...
```

## Scripts

```bash
# Download Greek (SBLGNT) and Hebrew (Delitzsch) for all books
bun run new-testament/download-texts.ts

# Extract Vulgate Latin into per-book files (requires /tmp/vul.tsv)
bun run new-testament/extract-vulgate.ts

# Build text.json for a specific book
bun run scripts/nt-build-text-json.ts new-testament/01_matthew
```

## Sources & Licensing

- SBLGNT: CC-BY-4.0, edited by Michael W. Holmes
- Delitzsch Hebrew NT: Public domain (1877/1901)
- Clementine Vulgate: Public domain (1592/1914 Hetzenauer edition)
