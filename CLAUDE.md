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
│   ├── merge-red-text.ts  # red-text/chapter-*.json → output/red-text.json
│   └── merge-locations.ts # locations/chapter-*.json → output/locations.json
├── data/                  # Shared reference data
│   └── strongs-hebrew-dictionary.js
├── old-testament/
│   ├── 01_genesis/        # Each book is a self-contained workspace
│   │   ├── book.json      # { name, oshbAbbrev, chapters, section }
│   │   ├── sources/       # modern-hebrew.txt, oshb.xml
│   │   ├── output/        # Generated: old-hebrew.json, .html, .txt, lxx.json, etc.
│   │   ├── red-text/      # Hand-curated chapter-*.json + generated ref-*.txt
│   │   ├── dialogue/      # Hand-curated chapter-*.json + speakers.json
│   │   ├── locations/      # locations.json (gazetteer), chapter-*.json, journeys.json
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

## Red Text Pipeline (Divine Speech)

Identifies word-level ranges where the Holy Trinity speaks, for red-letter rendering in the HTML output.

### Data format
Each `<book>/red-text/chapter-XX.json` contains:
```json
{
  "chapter": 1,
  "speeches": [
    { "verse": 3, "speaker": "God", "startWord": 2, "endWord": 3, "englishText": "Let there be light" }
  ]
}
```
- `startWord`/`endWord`: 0-based inclusive word indices in the verse
- `speaker`: "God", "YHWH", "YHWH God", "Angel of YHWH", "Angel of God"

### Workflow
1. Run `bun run scripts/generate-refs.ts <book-dir>` to produce `red-text/ref-XX.txt` files showing word indices per verse
2. Fan out with sub-agents per chapter (or batches of chapters) — each agent reads the ref file and the biblical text to identify where divine speakers are speaking, producing a `chapter-XX.json`
3. Run `bun run scripts/merge-red-text.ts <book-dir>` to merge all chapter files into `output/red-text.json`

### Agent instructions for red text
Give each agent the ref file for their chapter(s) and ask them to identify every instance where a member of the Holy Trinity is speaking. They need to find the exact word boundaries (startWord/endWord) using the indexed word list from the ref file.

## Dialogue Pipeline (All Speakers)

Identifies word-level ranges for ALL dialogue in the text — every speaker, human or divine.

### Data format
Each `<book>/dialogue/chapter-XX.json` contains:
```json
{
  "chapter": 1,
  "dialogue": [
    { "verse": 3, "speaker": "god", "startWord": 2, "endWord": 3, "englishText": "Let there be light" }
  ]
}
```
- Same word-index format as red text
- `speaker`: lowercase kebab-case identifier (e.g. "god", "yhwh-god", "abraham", "jacobs-sons")
- A `speakers.json` file in the dialogue folder maps speaker IDs to display names

### Workflow
1. First create `<book>/dialogue/speakers.json` with all known speakers for the book
2. Fan out with sub-agents per chapter — each agent reads the ref file and biblical text, identifies every instance of quoted speech, attributes it to the correct speaker, and records the word boundaries
3. Run `bun run scripts/merge-dialogue.ts <book-dir>` to merge all chapter files into `output/dialogue.json`

### Agent instructions for dialogue
Give each agent the ref file and speakers list. They identify every quoted speech, attribute it to a speaker, and record precise word boundaries. For collective speakers (e.g. "Jacob's sons speaking together"), use a collective ID. For speeches that span verse boundaries, create separate entries per verse.

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

## Location & Journey Pipeline

Extracts geographic data from the biblical text for future map visualizations: a canonical gazetteer with lat/lon coordinates, word-level location mentions, and cross-chapter travel journeys.

### Data files

**Gazetteer** — `<book>/locations/locations.json`:
```json
{
  "locations": [
    {
      "id": "haran",
      "name": "Haran",
      "aliases": ["Haran", "Charan"],
      "lat": 36.86, "lon": 39.03,
      "confidence": "high",
      "notes": "Modern Harran, Turkey. Well-attested archaeological site.",
      "type": "city"
    }
  ]
}
```
- `id`: kebab-case canonical identifier used across mentions and journeys
- `confidence`: `"high"` (archaeological), `"medium"` (scholarly consensus), `"low"` (debated), `"unknown"`
- `type`: `"city"`, `"region"`, `"river"`, `"mountain"`, `"well"`, `"landmark"`, etc.

**Location mentions** — `<book>/locations/chapter-XX.json`:
```json
{
  "chapter": 12,
  "mentions": [
    { "verse": 6, "location": "shechem", "startWord": 5, "endWord": 5, "textRef": "place of Shechem" }
  ]
}
```
- Same 0-based word-index format as red text and dialogue pipelines
- `location`: references an ID from the gazetteer

**Journeys** — `<book>/locations/journeys.json`:
```json
{
  "journeys": [
    {
      "id": "abraham-haran-to-negev",
      "traveler": "abraham",
      "description": "Abraham's initial journey from Haran through Canaan",
      "waypoints": [
        { "location": "haran", "chapter": 12, "verse": 4, "event": "departed from Haran" },
        { "location": "shechem", "chapter": 12, "verse": 6, "event": "arrived at Shechem" }
      ]
    }
  ]
}
```
- Journeys can span multiple chapters
- `traveler`: lowercase ID matching dialogue speaker IDs where possible

### Workflow

**Pass 1 — Gazetteer + Mentions (fan out per chapter)**:
1. Create `<book>/locations/locations.json` with all known locations, coordinates, and confidence levels
2. Ensure ref files exist: `bun run scripts/generate-refs.ts <book-dir>`
3. Fan out sub-agents per chapter (or batches of 5 chapters) — each reads the ref file, identifies geographic references, records word-level mentions in `chapter-XX.json`
4. Run `bun run scripts/merge-locations.ts <book-dir>` to merge into `output/locations.json`

**Pass 2 — Journeys (whole-book analysis)**:
1. After location mentions are complete, an agent reads all chapter mention files
2. Identifies travel sequences — when a person moves between named locations
3. Groups into coherent journeys with traveler attribution and ordered waypoints
4. Writes `<book>/locations/journeys.json`

### Agent instructions for location mentions
Give each agent the ref file(s) and the gazetteer. They identify every geographic reference (place names, regions, rivers, mountains, wells) and record precise word boundaries. "haarets" (the earth) is NOT a location unless combined with a name (e.g. "erets kenaan"). Multi-word references span the full phrase (e.g. "erets kenaan" → startWord to endWord).
