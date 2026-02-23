- i call "paleo hebrew" characters "old hebrew"
- you can write old hebrew using phonecian unicode characters
- i want to translate the hebrew bible into old hebrew
- i am trying to translate the septuagint into old hebrew
- my plan is to have a masoretic hebrew text and then have a diff format that can be applied to that and transform it into an accurate old hebrew septuagint transformation
- this way we can always apply the diff to a clean masoretic text and it is clear the diffs we are making
- we are trying to be editorial neutral so we are not going to make choices between masoretic and septuagint textual traditions, we will just use the septuagint
- we are going to have a list of discrepencies between septuagint text and masoretic text with some kind of sourcing ideally that we will use to built our diff data structure
- sometimes we will have to choose the best interpretation between multiple versions of the septuagint text
- for our html output format i would like to have a "red text" so we want to have a data structure that lets us mark which words in which verses are a member of the Holy Trinity speaking

## Project Structure

```
old-hebrew-bible/
├── scripts/               # Generic tools (accept book-dir as CLI arg)
│   ├── hebrew-utils.ts    # Shared: charMap, toOldHebrew, stripDiacritics
│   ├── translate.ts       # Source Hebrew → old-hebrew.json + vocabulary.json
│   ├── to-html.ts         # old-hebrew.json → old-hebrew.html (paginated book)
│   ├── to-text.ts         # old-hebrew.json → old-hebrew.txt
│   ├── apply-lxx-diffs.ts # old-hebrew.json + diffs → lxx.json
│   ├── generate-refs.ts   # old-hebrew.json → red-text/ref-*.txt
│   ├── merge-dialogue.ts  # dialogue/chapter-*.json → output/dialogue.json
│   └── merge-red-text.ts  # red-text/chapter-*.json → output/red-text.json
├── data/                  # Shared reference data
│   └── strongs-hebrew-dictionary.js
├── old-testament/
│   ├── 01_genesis/        # Each book is a self-contained workspace
│   │   ├── book.json      # { name, oshbAbbrev, chapters, section }
│   │   ├── sources/       # modern-hebrew.txt, oshb.xml
│   │   ├── output/        # Generated: old-hebrew.json, .html, .txt, lxx.json, etc.
│   │   ├── red-text/      # Hand-curated chapter-*.json + generated ref-*.txt
│   │   ├── dialogue/      # Hand-curated chapter-*.json + speakers.json
│   │   ├── lxx-diffs/     # batch-*.json, schema.json, reports
│   │   └── research/      # septuagint-notes-messy.txt, etc.
│   ├── 02_exodus/ ... 54_4-maccabees/
│   └── (54 books total, including deuterocanonical/apocrypha)
└── new-testament/         # Future
```

### Running scripts

All scripts take a book directory as the first argument:
```bash
bun run scripts/translate.ts old-testament/01_genesis
bun run scripts/to-html.ts old-testament/01_genesis
bun run scripts/apply-lxx-diffs.ts old-testament/01_genesis
```

## Septuagint Diff Pipeline

Four-phase pipeline for producing LXX Old Hebrew text from the Masoretic base:

### Phase 1 — Research
Catalog divergences between LXX and MT with scholarly sourcing. Input: Steinmann (860-variant catalog), Wevers' Notes, Gottingen apparatus. Output: research notes in `<book>/research/`.

### Phase 2 — Translation
Convert each research note into a machine-applicable diff. Pin each divergence to specific word indices in `output/old-hebrew.json`. Use square script Hebrew in the diff `hebrew` field — Old Hebrew is derived automatically at application time. Output: diff files in `<book>/lxx-diffs/`.

Diff operations:
- `replace`: swap `target_words` (indices) with `new_words`
- `insert`: add `new_words` after `after_word` index (-1 for start of verse)
- `remove`: delete `target_words` (indices)

Each new_word has: `{ hebrew, transliteration, definition }`

Reference files (`<book>/red-text/ref-XX.txt`) show word indices per verse for targeting.

### Phase 3 — Application
`scripts/apply-lxx-diffs.ts` reads diff files and applies them to the Masoretic text. Mechanical — no judgment calls.

### Phase 4 — Review
Independent evaluation of both the diff AND the applied result:
1. **Scholarly accuracy**: Does the diff faithfully represent the LXX divergence?
2. **Mechanical correctness**: Did application produce well-formed text? Word order, transliterations, definitions all correct?

The reviewer comes in clean (separate agent, no prior context from translation) to avoid self-confirmation bias.
