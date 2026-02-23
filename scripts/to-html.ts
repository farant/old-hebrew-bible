import path from "path";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: bun run scripts/to-html.ts <book-dir>");
  process.exit(1);
}

const bookConfig = await Bun.file(path.join(bookDir, "book.json")).json();
const json = await Bun.file(path.join(bookDir, "output/old-hebrew.json")).json();
const dialogueData = await Bun.file(path.join(bookDir, "output/dialogue.json")).json();

// Divine speakers get red text
const divineSpeakers = new Set(dialogueData.divineSpeakers);

// Build dialogue lookup: "chapter:verse" → list of speech ranges
const dialogueLookup = new Map<string, Array<{ startWord: number; endWord: number; speaker: string }>>();
for (const entry of dialogueData.dialogue) {
  const key = `${entry.chapter}:${entry.verse}`;
  if (!dialogueLookup.has(key)) dialogueLookup.set(key, []);
  dialogueLookup.get(key)!.push(entry);
}

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

const verses: Verse[] = json;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderWords(words: Word[], chapter: number, verse: number): string {
  const speeches = dialogueLookup.get(`${chapter}:${verse}`) || [];

  // For each word, determine its speech info
  const wordInfos = words.map((w, i) => {
    const speech = speeches.find((s) => i >= s.startWord && i <= s.endWord);
    const isDivine = !!(speech && divineSpeakers.has(speech.speaker));
    const classes = ["word"];
    if (speech) classes.push("dialogue");
    if (isDivine) classes.push("red-text");
    const speakerAttr = speech
      ? ` data-speaker="${escapeHtml(speech.speaker)}"`
      : "";
    return {
      html: `<span class="${classes.join(" ")}" data-t="${escapeHtml(w.transliteration)}" data-d="${escapeHtml(w.definition)}"${speakerAttr}>${escapeHtml(w.oldHebrew)}</span>`,
      speaker: speech ? speech.speaker : null,
      isDivine,
    };
  });

  // Group consecutive same-speaker words into dialogue blocks
  const parts: string[] = [];
  let i = 0;
  while (i < wordInfos.length) {
    const info = wordInfos[i];
    if (info.speaker) {
      const blockHtmls: string[] = [info.html];
      const speaker = info.speaker;
      const isDivine = info.isDivine;
      let j = i + 1;
      while (j < wordInfos.length && wordInfos[j].speaker === speaker) {
        blockHtmls.push(wordInfos[j].html);
        j++;
      }
      const blockCls = isDivine ? "dialogue-block divine" : "dialogue-block";
      parts.push(
        `<span class="${blockCls}">${blockHtmls.join(" ")}</span>`
      );
      i = j;
    } else {
      parts.push(info.html);
      i++;
    }
  }

  return parts.join(" ");
}

// Group verses by chapter
const chapters = new Map<number, Verse[]>();
for (const v of verses) {
  if (!chapters.has(v.chapter)) chapters.set(v.chapter, []);
  chapters.get(v.chapter)!.push(v);
}

const chapterHtml: string[] = [];

for (const [num, chVerses] of chapters) {
  const verseLines = chVerses
    .map(
      (v) =>
        `      <div class="verse">
        <span class="verse-num">${v.verse}</span>
        <span class="old-hebrew">${renderWords(v.words, num, v.verse)}</span>
      </div>`
    )
    .join("\n");

  const paraSpans = chVerses
    .map(
      (v) =>
        `<sup class="verse-num-inline">${v.verse}</sup>${renderWords(v.words, num, v.verse)}`
    )
    .join(" ");

  // Add spacer before each chapter except the first (for right-page alignment)
  if (num > 1) {
    chapterHtml.push(`    <div class="chapter-spacer" aria-hidden="true"></div>`);
  }

  chapterHtml.push(`    <section class="chapter">
      <h2>Chapter ${num}</h2>
      <div class="verse-view">
${verseLines}
      </div>
      <div class="para-view" hidden>
        <p class="paragraph old-hebrew">${paraSpans}</p>
      </div>
    </section>`);
}

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bookConfig.name} — Old Hebrew</title>
  <style>
    @page {
      size: letter;
      margin: 0.75in 0.85in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Noto Sans Phoenician", "Segoe UI Historic", serif;
      font-size: 14px;
      line-height: 1.8;
      color: #1a1a1a;
      background: #e8e4de;
      margin: 0;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Toolbar ── */
    .toolbar {
      flex: 0 0 auto;
      background: #faf8f4;
      text-align: center;
      padding: 0.5em 1em 0.4em;
      border-bottom: 1px solid #d5d0c8;
      direction: ltr;
    }

    .toolbar h1 {
      font-size: 20px;
      letter-spacing: 0.05em;
      margin-bottom: 0.1em;
      direction: rtl;
    }

    .toolbar .subtitle {
      font-size: 12px;
      color: #888;
      font-style: italic;
    }

    .toggle-bar {
      margin-top: 0.35em;
    }

    .toggle-btn {
      font-family: "Georgia", serif;
      font-size: 12px;
      padding: 0.25em 1em;
      border: 1px solid #bbb;
      background: #fff;
      color: #555;
      cursor: pointer;
      border-radius: 3px;
    }

    .toggle-btn:hover {
      background: #f0f0f0;
    }

    .toggle-btn.active {
      background: #555;
      color: #fff;
    }

    /* ── Book layout ── */
    .book-wrapper {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      padding: 0.4em;
      overflow: hidden;
    }

    .book-viewport {
      width: 9.8in;
      max-width: calc(100vw - 1em);
      height: calc(100vh - 7em);
      max-height: 7.5in;
      overflow: hidden;
      position: relative;
      background: #faf8f4;
      border-radius: 3px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.07);
    }

    /* Spine shadow */
    .book-viewport::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      background: linear-gradient(to right,
        transparent,
        rgba(0,0,0,0.04) 30%,
        rgba(0,0,0,0.06) 50%,
        rgba(0,0,0,0.04) 70%,
        transparent);
      pointer-events: none;
      z-index: 10;
    }

    .book-content {
      column-width: 4.2in;
      column-gap: 0.8in;
      column-fill: auto;
      height: 100%;
      padding: 0.4in 0.3in;
      box-sizing: border-box;
      transition: transform 0.35s ease;
      direction: ltr;
    }

    /* Chapter spacers for right-page alignment */
    .chapter-spacer {
      height: 0;
      overflow: hidden;
    }

    .chapter-spacer.active {
      break-after: column;
      -webkit-column-break-after: always;
    }

    /* ── Chapters ── */
    .chapter {
      break-before: column;
      -webkit-column-break-before: always;
    }

    .chapter:first-child {
      break-before: auto;
      -webkit-column-break-before: auto;
    }

    .chapter h2 {
      font-size: 16px;
      margin-bottom: 0.6em;
      padding-bottom: 0.25em;
      border-bottom: 1px solid #ccc;
      break-after: avoid;
      -webkit-column-break-after: avoid;
    }

    .verse {
      margin-bottom: 0.5em;
      padding-right: 2em;
      position: relative;
    }

    .verse-num {
      position: absolute;
      right: 0;
      top: 0;
      font-size: 10px;
      color: #999;
      font-family: "Georgia", serif;
      min-width: 1.8em;
      text-align: left;
    }

    .old-hebrew {
      display: block;
      font-size: 15px;
      line-height: 1.9;
      direction: rtl;
    }

    .paragraph {
      text-align: start;
    }

    .verse-num-inline {
      font-family: "Georgia", serif;
      font-size: 9px;
      color: #999;
      margin: 0 0.15em;
      vertical-align: super;
    }

    /* ── Clickable words ── */
    .word {
      cursor: pointer;
      border-radius: 3px;
      padding: 0 0.05em;
      transition: background 0.15s;
    }

    .word:hover {
      background: #f0ead6;
    }

    .word.active {
      background: #e8dfc0;
    }

    /* ── Dialogue blocks ── */
    .dialogue-block {
      background-image: linear-gradient(to top, rgba(184, 196, 212, 0.3) 0%, rgba(184, 196, 212, 0.3) 2.5px, transparent 2.5px);
      padding-bottom: 2px;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
    }

    .dialogue-block.divine {
      background-image: linear-gradient(to top, rgba(212, 160, 160, 0.3) 0%, rgba(212, 160, 160, 0.3) 2.5px, transparent 2.5px);
    }

    .dialogue-block .word:hover {
      background: #f0ead6;
    }

    .dialogue-block .word.active {
      background: #e8dfc0;
    }

    .dialogue-block.divine .word:hover {
      background: #fde8e8;
    }

    .dialogue-block.divine .word.active {
      background: #f5d0d0;
    }

    /* ── Red text ── */
    .word.red-text {
      color: #b22222;
    }

    .popover-speaker {
      font-size: 11px;
      color: #e88;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.4em;
    }

    /* ── Nav bar ── */
    .nav-bar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.2em;
      padding: 0.4em 1em;
      background: #faf8f4;
      border-top: 1px solid #d5d0c8;
      direction: ltr;
      user-select: none;
    }

    .nav-btn {
      font-family: "Georgia", serif;
      font-size: 18px;
      width: 2em;
      height: 2em;
      border: 1px solid #ccc;
      background: #fff;
      color: #555;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      line-height: 1;
    }

    .nav-btn:hover:not(:disabled) {
      background: #f0f0f0;
    }

    .nav-btn:disabled {
      opacity: 0.25;
      cursor: default;
    }

    #page-num {
      font-family: "Georgia", serif;
      font-size: 13px;
      color: #888;
      min-width: 5em;
      text-align: center;
    }

    /* ── Popover ── */
    .popover {
      position: fixed;
      background: #2a2a2a;
      color: #eee;
      font-family: "Georgia", serif;
      padding: 0.8em 1em;
      border-radius: 8px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;
      z-index: 100;
      direction: ltr;
      min-width: 200px;
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }

    .popover.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .popover-pronunciation {
      font-size: 17px;
      font-weight: bold;
      letter-spacing: 0.04em;
      margin-bottom: 0.6em;
      padding-bottom: 0.5em;
      border-bottom: 1px solid #555;
      color: #fff;
    }

    .letter-row {
      display: flex;
      align-items: baseline;
      gap: 0.6em;
      padding: 0.2em 0;
      font-size: 13px;
      line-height: 1.4;
    }

    .letter-row + .letter-row {
      border-top: 1px solid #3a3a3a;
    }

    .letter-glyph {
      font-family: "Noto Sans Phoenician", "Segoe UI Historic", serif;
      font-size: 20px;
      min-width: 1.4em;
      text-align: center;
      color: #f0ead6;
    }

    .letter-name {
      font-weight: bold;
      min-width: 4.5em;
      color: #ccc;
    }

    .letter-meaning {
      color: #999;
      font-style: italic;
    }

    .letter-separator {
      text-align: center;
      color: #555;
      font-size: 11px;
      padding: 0.15em 0;
    }

    .popover-definition {
      font-size: 12px;
      color: #bbb;
      line-height: 1.5;
      margin-bottom: 0.6em;
      padding-bottom: 0.5em;
      border-bottom: 1px solid #444;
    }

    /* ── Night mode ── */
    body.night {
      background: #1a1a1a;
      color: #d4d0c8;
    }

    body.night .toolbar {
      background: #252420;
      border-bottom-color: #3a3835;
    }

    body.night .toolbar .subtitle { color: #777; }

    body.night .toggle-btn {
      background: #333;
      border-color: #555;
      color: #aaa;
    }

    body.night .toggle-btn:hover { background: #444; }

    body.night .toggle-btn.active {
      background: #bbb;
      color: #222;
    }

    body.night .book-viewport {
      background: #2a2820;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
    }

    body.night .book-viewport::after {
      background: linear-gradient(to right,
        transparent,
        rgba(0,0,0,0.08) 30%,
        rgba(0,0,0,0.12) 50%,
        rgba(0,0,0,0.08) 70%,
        transparent);
    }

    body.night .chapter h2 {
      border-bottom-color: #444;
    }

    body.night .verse-num,
    body.night .verse-num-inline {
      color: #666;
    }

    body.night .word:hover { background: #3a3628; }
    body.night .word.active { background: #4a4530; }

    body.night .dialogue-block {
      background-image: linear-gradient(to top, rgba(140, 155, 175, 0.25) 0%, rgba(140, 155, 175, 0.25) 2.5px, transparent 2.5px);
    }

    body.night .dialogue-block.divine {
      background-image: linear-gradient(to top, rgba(180, 120, 120, 0.25) 0%, rgba(180, 120, 120, 0.25) 2.5px, transparent 2.5px);
    }

    body.night .dialogue-block .word:hover { background: #3a3628; }
    body.night .dialogue-block .word.active { background: #4a4530; }
    body.night .dialogue-block.divine .word:hover { background: #3a2828; }
    body.night .dialogue-block.divine .word.active { background: #4a3030; }

    body.night .word.red-text { color: #e05555; }

    body.night .nav-bar {
      background: #252420;
      border-top-color: #3a3835;
    }

    body.night .nav-btn {
      background: #333;
      border-color: #555;
      color: #aaa;
    }

    body.night .nav-btn:hover:not(:disabled) { background: #444; }
    body.night #page-num { color: #777; }

    /* Popover is already dark — just tweak slightly for night */
    body.night .popover {
      background: #1e1e1e;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }

    body.night .letter-glyph { color: #e8dfc0; }

    /* ── Print ── */
    @media print {
      .toolbar, .nav-bar, .popover {
        display: none !important;
      }

      body {
        overflow: visible;
        height: auto;
        display: block;
        background: #fff;
        padding: 0;
      }

      .book-wrapper {
        display: block;
        padding: 0;
      }

      .book-viewport {
        width: auto;
        max-width: none;
        height: auto;
        max-height: none;
        overflow: visible;
        box-shadow: none;
        border-radius: 0;
      }

      .book-viewport::after {
        display: none;
      }

      .book-content {
        columns: auto;
        column-width: auto;
        height: auto;
        padding: 0;
        transform: none !important;
        transition: none;
      }

      .chapter-spacer { display: none; }

      .chapter {
        break-before: auto;
        -webkit-column-break-before: auto;
        page-break-before: always;
        margin-bottom: 2em;
      }

      .chapter:first-child {
        page-break-before: auto;
      }

      .verse {
        page-break-inside: avoid;
      }

      .old-hebrew {
        font-size: 14px;
      }

      .word {
        cursor: default;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${bookConfig.name} — Old Hebrew</h1>
    <div class="subtitle">The Book of ${bookConfig.name} in Old Hebrew &middot; Source: Leningrad Codex (UXLC)</div>
    <div class="toggle-bar">
      <button class="toggle-btn active" data-mode="verse">Verse</button>
      <button class="toggle-btn" data-mode="para">Paragraph</button>
      <span style="display:inline-block;width:1.5em"></span>
      <button class="toggle-btn" id="night-toggle">Night</button>
    </div>
  </div>
  <div class="book-wrapper">
    <div class="book-viewport">
      <div class="book-content" id="book-content">
${chapterHtml.join("\n")}
      </div>
    </div>
  </div>
  <div class="nav-bar">
    <button class="nav-btn" id="nav-prev" title="Previous">\u2190</button>
    <span id="page-num"></span>
    <button class="nav-btn" id="nav-next" title="Next">\u2192</button>
  </div>
  <div class="popover" id="popover"></div>
  <script>
    // Old Hebrew letter data: [name, pictograph, meaning]
    var letterData = {
      '\\u{10900}': ['Aleph',   'ox head',     'strength, leader, first'],
      '\\u{10901}': ['Beth',    'house',       'household, family, in'],
      '\\u{10902}': ['Gimel',   'camel',       'to carry, lift up, benefit'],
      '\\u{10903}': ['Daleth',  'door',        'pathway, entrance, to move'],
      '\\u{10904}': ['He',      'window',      'behold, reveal, breath'],
      '\\u{10905}': ['Waw',     'hook',        'to secure, connect, and'],
      '\\u{10906}': ['Zayin',   'weapon',      'to cut, nourish'],
      '\\u{10907}': ['Heth',    'fence',       'to surround, protect'],
      '\\u{10908}': ['Teth',    'basket',      'to surround, contain'],
      '\\u{10909}': ['Yodh',    'hand',        'work, deed, to make'],
      '\\u{1090A}': ['Kaph',    'palm',        'to open, cover, allow'],
      '\\u{1090B}': ['Lamedh',  'goad',        'to teach, toward, authority'],
      '\\u{1090C}': ['Mem',     'water',       'chaos, mighty, blood'],
      '\\u{1090D}': ['Nun',     'fish',        'life, activity, offspring'],
      '\\u{1090E}': ['Samekh',  'support',     'to support, lean upon'],
      '\\u{1090F}': ['Ayin',    'eye',         'to see, know, experience'],
      '\\u{10910}': ['Pe',      'mouth',       'to speak, word, breath'],
      '\\u{10911}': ['Tsade',   'fishhook',    'to hunt, catch, righteous'],
      '\\u{10912}': ['Qoph',    'back of head','behind, last, horizon'],
      '\\u{10913}': ['Resh',    'head',        'person, first, beginning'],
      '\\u{10914}': ['Shin',    'teeth',       'to consume, destroy, sharp'],
      '\\u{10915}': ['Taw',     'mark',        'sign, covenant, seal'],
    };

    /* ── Pagination ── */
    var content = document.getElementById('book-content');
    var viewportEl = document.querySelector('.book-viewport');
    var pageNumEl = document.getElementById('page-num');
    var prevBtn = document.getElementById('nav-prev');
    var nextBtn = document.getElementById('nav-next');
    var currentSpread = 0;
    var totalSpreads = 1;
    var colW = 0;
    var colGap = 0;

    function recalcPagination() {
      // Reset transform to measure natural layout
      content.style.transition = 'none';
      content.style.transform = 'translateX(0)';
      void content.scrollWidth; // force reflow

      var cs = getComputedStyle(content);
      colW = parseFloat(cs.columnWidth) || (content.offsetWidth / 2);
      colGap = parseFloat(cs.columnGap) || 0;
      var totalW = content.scrollWidth;

      var totalCols = Math.max(1, Math.round((totalW + colGap) / (colW + colGap)));
      totalSpreads = Math.max(1, Math.ceil(totalCols / 2));

      if (currentSpread >= totalSpreads) currentSpread = totalSpreads - 1;
      if (currentSpread < 0) currentSpread = 0;

      goToSpread(currentSpread, false);
    }

    function goToSpread(n, animate) {
      if (animate === undefined) animate = true;
      currentSpread = Math.max(0, Math.min(n, totalSpreads - 1));
      var advance = 2 * (colW + colGap);

      if (!animate) content.style.transition = 'none';
      else content.style.transition = 'transform 0.35s ease';

      content.style.transform = 'translateX(' + -(currentSpread * advance) + 'px)';

      if (!animate) {
        void content.offsetHeight;
        content.style.transition = 'transform 0.35s ease';
      }

      pageNumEl.textContent = (currentSpread + 1) + ' / ' + totalSpreads;
      prevBtn.disabled = currentSpread === 0;
      nextBtn.disabled = currentSpread >= totalSpreads - 1;

      // Dismiss popover on navigation
      if (activeWord) {
        activeWord.classList.remove('active');
        activeWord = null;
      }
      popover.classList.remove('visible');
    }

    function nextSpread() {
      if (currentSpread < totalSpreads - 1) goToSpread(currentSpread + 1, true);
    }

    function prevSpread() {
      if (currentSpread > 0) goToSpread(currentSpread - 1, true);
    }

    /* ── View toggle ── */
    var buttons = document.querySelectorAll('.toggle-btn');
    var verseViews = document.querySelectorAll('.verse-view');
    var paraViews = document.querySelectorAll('.para-view');

    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.dataset.mode;
        buttons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        verseViews.forEach(function(el) { el.hidden = mode === 'para'; });
        paraViews.forEach(function(el) { el.hidden = mode === 'verse'; });
        currentSpread = 0;
        requestAnimationFrame(recalcPagination);
      });
    });

    /* ── Navigation ── */
    nextBtn.addEventListener('click', nextSpread);
    prevBtn.addEventListener('click', prevSpread);

    // Keyboard: right=next, left=prev, Home/End
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { nextSpread(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft')  { prevSpread(); e.preventDefault(); }
      else if (e.key === 'Home')  { goToSpread(0, true); e.preventDefault(); }
      else if (e.key === 'End')   { goToSpread(totalSpreads - 1, true); e.preventDefault(); }
    });

    // Resize handler
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(recalcPagination, 200);
    });

    /* ── Popover ── */
    var popover = document.getElementById('popover');
    var activeWord = null;

    function isWordVisible(word) {
      var wr = word.getBoundingClientRect();
      var vr = viewportEl.getBoundingClientRect();
      // Check the word is substantially within the viewport
      return wr.right > vr.left + 5 && wr.left < vr.right - 5 &&
             wr.bottom > vr.top + 5 && wr.top < vr.bottom - 5;
    }

    function buildPopoverContent(word) {
      var pronunciation = word.dataset.t;
      var chars = Array.from(word.textContent);
      var sepChar = '\\u{1091F}';

      var definition = word.dataset.d;
      var speaker = word.dataset.speaker;

      var h = '';
      if (speaker) {
        h += '<div class="popover-speaker">' + speaker + ' speaks</div>';
      }
      h += '<div class="popover-pronunciation">' + pronunciation + '</div>';
      if (definition) {
        h += '<div class="popover-definition">' + definition + '</div>';
      }

      for (var ci = 0; ci < chars.length; ci++) {
        var ch = chars[ci];
        if (ch === ' ') continue;

        if (ch === sepChar) {
          h += '<div class="letter-separator">&mdash;</div>';
          continue;
        }

        var info = letterData[ch];
        if (!info) continue;

        h += '<div class="letter-row">'
          + '<span class="letter-glyph">' + ch + '</span>'
          + '<span class="letter-name">' + info[0] + '</span>'
          + '<span class="letter-meaning">' + info[1] + ' &mdash; ' + info[2] + '</span>'
          + '</div>';
      }

      return h;
    }

    document.addEventListener('click', function(e) {
      var word = e.target.closest('.word');

      // Clicked same word — toggle off
      if (word && word === activeWord) {
        word.classList.remove('active');
        popover.classList.remove('visible');
        activeWord = null;
        return;
      }

      // Clear previous
      if (activeWord) {
        activeWord.classList.remove('active');
      }

      if (word && word.dataset.t && isWordVisible(word)) {
        word.classList.add('active');
        activeWord = word;

        popover.innerHTML = buildPopoverContent(word);
        popover.classList.add('visible');

        // Position below the word (fixed positioning)
        var rect = word.getBoundingClientRect();

        // First pass: place to measure
        popover.style.top = '0px';
        popover.style.left = '0px';
        var popRect = popover.getBoundingClientRect();

        // Center horizontally on the word
        var left = rect.left + (rect.width - popRect.width) / 2;
        if (left < 8) left = 8;
        var maxLeft = window.innerWidth - popRect.width - 8;
        if (left > maxLeft) left = maxLeft;

        var top = rect.bottom + 8;

        // If it would go off the bottom, try above
        if (top + popRect.height + 8 > window.innerHeight) {
          top = rect.top - popRect.height - 8;
        }

        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
      } else {
        popover.classList.remove('visible');
        activeWord = null;
      }
    });

    /* ── Night mode ── */
    var nightBtn = document.getElementById('night-toggle');
    // Respect system preference on load
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('night');
      nightBtn.textContent = 'Day';
    }
    nightBtn.addEventListener('click', function() {
      document.body.classList.toggle('night');
      nightBtn.textContent = document.body.classList.contains('night') ? 'Day' : 'Night';
    });

    /* ── Initialize ── */
    requestAnimationFrame(recalcPagination);
  </script>
</body>
</html>
`;

const outPath = path.join(bookDir, "output/old-hebrew.html");
await Bun.write(outPath, html);
console.log(`Wrote ${verses.length} verses across ${chapters.size} chapters to ${outPath}`);
