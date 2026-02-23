const json = await Bun.file("genesis-old-hebrew.json").json();

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

function renderWords(words: Word[]): string {
  return words
    .map(
      (w) =>
        `<span class="word" data-t="${escapeHtml(w.transliteration)}" data-d="${escapeHtml(w.definition)}">${escapeHtml(w.oldHebrew)}</span>`
    )
    .join(" ");
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
        <span class="old-hebrew">${renderWords(v.words)}</span>
      </div>`
    )
    .join("\n");

  const paraSpans = chVerses
    .map(
      (v) =>
        `<sup class="verse-num-inline">${v.verse}</sup>${renderWords(v.words)}`
    )
    .join(" ");

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
  <title>Genesis — Old Hebrew</title>
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
      background: #fff;
      max-width: 7in;
      margin: 0 auto;
      padding: 0.5in;
    }

    header {
      text-align: center;
      margin-bottom: 2em;
      padding-bottom: 1.5em;
      border-bottom: 2px solid #333;
    }

    header h1 {
      font-size: 28px;
      letter-spacing: 0.05em;
      margin-bottom: 0.25em;
    }

    header .subtitle {
      font-size: 14px;
      color: #666;
      font-style: italic;
    }

    .toggle-bar {
      text-align: center;
      margin-bottom: 1.5em;
    }

    .toggle-btn {
      font-family: "Georgia", serif;
      font-size: 13px;
      padding: 0.4em 1.2em;
      border: 1px solid #999;
      background: #fff;
      color: #333;
      cursor: pointer;
      border-radius: 3px;
    }

    .toggle-btn:hover {
      background: #f0f0f0;
    }

    .toggle-btn.active {
      background: #333;
      color: #fff;
    }

    .chapter {
      margin-bottom: 2em;
    }

    .chapter h2 {
      font-size: 18px;
      margin-bottom: 0.75em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid #ccc;
      page-break-after: avoid;
    }

    .verse {
      margin-bottom: 0.6em;
      padding-right: 2.5em;
      position: relative;
    }

    .verse-num {
      position: absolute;
      right: 0;
      top: 0;
      font-size: 11px;
      color: #999;
      font-family: "Georgia", serif;
      min-width: 2em;
      text-align: left;
    }

    .old-hebrew {
      display: block;
      font-size: 16px;
      line-height: 1.9;
      direction: rtl;
    }

    .paragraph {
      text-align: start;
    }

    .verse-num-inline {
      font-family: "Georgia", serif;
      font-size: 10px;
      color: #999;
      margin: 0 0.15em;
      vertical-align: super;
    }

    /* Clickable words */
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

    /* Popover */
    .popover {
      position: absolute;
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

    /* Print styles */
    @media print {
      .toggle-bar, .popover {
        display: none;
      }

      body {
        padding: 0;
        max-width: none;
        font-size: 12px;
      }

      header {
        page-break-after: avoid;
      }

      .chapter h2 {
        page-break-after: avoid;
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
  <header>
    <h1>𐤁𐤓𐤀𐤔𐤉𐤕 — Genesis</h1>
    <div class="subtitle">The Book of Genesis in Old Hebrew</div>
    <div class="subtitle">Source: Leningrad Codex (UXLC)</div>
  </header>
  <div class="toggle-bar">
    <button class="toggle-btn active" data-mode="verse">Verse</button>
    <button class="toggle-btn" data-mode="para">Paragraph</button>
  </div>
  <div class="popover" id="popover"></div>
  <main>
${chapterHtml.join("\n")}
  </main>
  <script>
    // Old Hebrew letter data: [name, pictograph, meaning]
    const letterData = {
      '𐤀': ['Aleph',   'ox head',     'strength, leader, first'],
      '𐤁': ['Bet',     'house',       'household, family, in'],
      '𐤂': ['Gimel',   'camel',       'to carry, lift up, benefit'],
      '𐤃': ['Dalet',   'door',        'pathway, entrance, to move'],
      '𐤄': ['He',      'window',      'behold, reveal, breath'],
      '𐤅': ['Vav',     'hook',        'to secure, connect, and'],
      '𐤆': ['Zayin',   'weapon',      'to cut, nourish'],
      '𐤇': ['Chet',    'fence',       'to surround, protect'],
      '𐤈': ['Tet',     'basket',      'to surround, contain'],
      '𐤉': ['Yod',     'hand',        'work, deed, to make'],
      '𐤊': ['Kaf',     'palm',        'to open, cover, allow'],
      '𐤋': ['Lamed',   'goad',        'to teach, toward, authority'],
      '𐤌': ['Mem',     'water',       'chaos, mighty, blood'],
      '𐤍': ['Nun',     'fish',        'life, activity, offspring'],
      '𐤎': ['Samekh',  'support',     'to support, lean upon'],
      '𐤏': ['Ayin',    'eye',         'to see, know, experience'],
      '𐤐': ['Pe',      'mouth',       'to speak, word, breath'],
      '𐤑': ['Tsade',   'fishhook',    'to hunt, catch, righteous'],
      '𐤒': ['Qof',     'back of head','behind, last, horizon'],
      '𐤓': ['Resh',    'head',        'person, first, beginning'],
      '𐤔': ['Shin',    'teeth',       'to consume, destroy, sharp'],
      '𐤕': ['Tav',     'mark',        'sign, covenant, seal'],
    };

    // View toggle
    const buttons = document.querySelectorAll('.toggle-btn');
    const verseViews = document.querySelectorAll('.verse-view');
    const paraViews = document.querySelectorAll('.para-view');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        verseViews.forEach(el => el.hidden = mode === 'para');
        paraViews.forEach(el => el.hidden = mode === 'verse');
      });
    });

    // Popover
    const popover = document.getElementById('popover');
    let activeWord = null;

    function buildPopoverContent(word) {
      const pronunciation = word.dataset.t;
      const chars = [...word.textContent];
      const sepChar = '𐤟';

      const definition = word.dataset.d;

      let html = '<div class="popover-pronunciation">' + pronunciation + '</div>';
      if (definition) {
        html += '<div class="popover-definition">' + definition + '</div>';
      }

      let isFirst = true;
      for (const ch of chars) {
        if (ch === ' ') continue;

        // Word separator (maqaf)
        if (ch === sepChar) {
          html += '<div class="letter-separator">—</div>';
          isFirst = true;
          continue;
        }

        const info = letterData[ch];
        if (!info) continue;

        html += '<div class="letter-row">'
          + '<span class="letter-glyph">' + ch + '</span>'
          + '<span class="letter-name">' + info[0] + '</span>'
          + '<span class="letter-meaning">' + info[1] + ' — ' + info[2] + '</span>'
          + '</div>';
      }

      return html;
    }

    document.addEventListener('click', (e) => {
      const word = e.target.closest('.word');

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

      if (word && word.dataset.t) {
        word.classList.add('active');
        activeWord = word;

        popover.innerHTML = buildPopoverContent(word);
        popover.classList.add('visible');

        // Position below the word
        const rect = word.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // First pass: place it to measure
        popover.style.top = (rect.bottom + scrollY + 8) + 'px';
        popover.style.left = '0px';

        const popRect = popover.getBoundingClientRect();

        // Center horizontally on the word
        let left = rect.left + scrollX + (rect.width - popRect.width) / 2;

        // Keep on screen
        if (left < 8) left = 8;
        const maxLeft = document.documentElement.clientWidth - popRect.width - 8;
        if (left > maxLeft) left = maxLeft;

        let top = rect.bottom + scrollY + 8;

        // If it would go off the bottom of the viewport, try above
        if (rect.bottom + popRect.height + 16 > window.innerHeight) {
          top = rect.top + scrollY - popRect.height - 8;
        }

        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
      } else {
        popover.classList.remove('visible');
        activeWord = null;
      }
    });
  </script>
</body>
</html>
`;

await Bun.write("genesis-old-hebrew.html", html);
console.log(`Wrote ${verses.length} verses across ${chapters.size} chapters to genesis-old-hebrew.html`);
