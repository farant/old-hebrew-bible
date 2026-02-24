import path from "path";
import { mkdirSync, existsSync } from "fs";
import { toOldHebrew } from "./hebrew-utils.ts";

// Parse CLI args
const args = process.argv.slice(2);
const tileFlag = args.find((a) => a.startsWith("--tiles="));
const tileSource = tileFlag ? tileFlag.split("=")[1] : "satellite";
const bookDir = args.find((a) => !a.startsWith("--"));

if (!bookDir) {
  console.error("Usage: bun run scripts/generate-maps.ts <book-dir> [--tiles=satellite|nolabels|osm]");
  process.exit(1);
}

// Tile URL templates
const TILE_URLS: Record<string, string> = {
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  nolabels: "https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
};

const MAX_ZOOM = 7;

if (!TILE_URLS[tileSource]) {
  console.error(`Unknown tile source: ${tileSource}. Use: satellite, nolabels, or osm`);
  process.exit(1);
}

console.log(`Tile source: ${tileSource} (max zoom: ${MAX_ZOOM})`);

const projectRoot = path.resolve(import.meta.dir, "..");

// ─── Load data ──────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  hebrew?: string;
  aliases: string[];
  lat: number;
  lon: number;
  confidence: string;
  notes: string;
  type: string;
}

interface Waypoint {
  location: string;
  chapter: number;
  verse: number;
  event: string;
}

interface Journey {
  id: string;
  traveler: string;
  description: string;
  waypoints: Waypoint[];
}

const gazetteer: { locations: Location[] } = await Bun.file(
  path.join(bookDir, "locations/locations.json")
).json();

const journeysData: { journeys: Journey[] } = await Bun.file(
  path.join(bookDir, "locations/journeys.json")
).json();

// Build location lookup
const locLookup = new Map<string, Location>();
for (const loc of gazetteer.locations) {
  locLookup.set(loc.id, loc);
}

// ─── Tile math (OSM slippy map) ────────────────────────────────────────────

const TILE_SIZE = 256;

function latLonToPixel(lat: number, lon: number, zoom: number): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  const px = ((lon + 180) / 360) * n * TILE_SIZE;
  const latRad = (lat * Math.PI) / 180;
  const py =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    TILE_SIZE;
  return { px, py };
}

function latLonToTileXY(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const { px, py } = latLonToPixel(lat, lon, zoom);
  return { x: Math.floor(px / TILE_SIZE), y: Math.floor(py / TILE_SIZE) };
}

interface BBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function fitZoom(bounds: BBox, targetW: number, targetH: number): number {
  for (let z = MAX_ZOOM; z >= 1; z--) {
    const tl = latLonToPixel(bounds.maxLat, bounds.minLon, z);
    const br = latLonToPixel(bounds.minLat, bounds.maxLon, z);
    const w = br.px - tl.px;
    const h = br.py - tl.py;
    if (w <= targetW * 0.85 && h <= targetH * 0.85) return z;
  }
  return 1;
}

function computeBBox(coords: { lat: number; lon: number }[]): BBox {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lon < minLon) minLon = c.lon;
    if (c.lon > maxLon) maxLon = c.lon;
  }
  // Add padding (15%)
  const latPad = (maxLat - minLat) * 0.15 || 0.5;
  const lonPad = (maxLon - minLon) * 0.15 || 0.5;
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };
}

// ─── Tile fetching + caching ────────────────────────────────────────────────

const tileDir = path.join(projectRoot, "data/tiles", tileSource);

async function fetchTile(z: number, x: number, y: number): Promise<Buffer> {
  const dir = path.join(tileDir, String(z), String(x));
  const filePath = path.join(dir, `${y}.png`);

  // Check cache
  if (existsSync(filePath)) {
    const bytes = await Bun.file(filePath).arrayBuffer();
    return Buffer.from(bytes);
  }

  // Fetch tile
  const urlTemplate = TILE_URLS[tileSource];
  const url = urlTemplate.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
  const resp = await fetch(url, {
    headers: { "User-Agent": "OldHebrewBible/1.0 (biblical study bible map generation)" },
  });

  if (!resp.ok) {
    console.error(`Failed to fetch tile ${z}/${x}/${y}: ${resp.status}`);
    // Return a blank tile buffer (transparent PNG placeholder)
    return Buffer.alloc(0);
  }

  const buf = Buffer.from(await resp.arrayBuffer());

  // Cache it
  mkdirSync(dir, { recursive: true });
  await Bun.write(filePath, buf);

  // Rate limit — 200ms between fetches
  await new Promise((r) => setTimeout(r, 200));

  return buf;
}

// ─── SVG generation ─────────────────────────────────────────────────────────

const MAP_W = 760;
const MAP_H = 780;
const TITLE_H = 36;
const ATTR_H = 14;

function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface MapSpec {
  id: string;
  title: string;
  insertBefore: number;
  journeys: string[];
  locations: string[];
}

async function generateMapSvg(spec: MapSpec): Promise<{ svg: string; journeyColors: string[] } | null> {
  // Collect all coordinates
  const allCoords: { lat: number; lon: number; id: string }[] = [];

  // From explicit locations
  for (const locId of spec.locations) {
    const loc = locLookup.get(locId);
    if (loc) allCoords.push({ lat: loc.lat, lon: loc.lon, id: loc.id });
  }

  // From journey waypoints
  const journeyObjs: Journey[] = [];
  for (const jId of spec.journeys) {
    const j = journeysData.journeys.find((jj) => jj.id === jId);
    if (!j) continue;
    journeyObjs.push(j);
    for (const wp of j.waypoints) {
      const loc = locLookup.get(wp.location);
      if (loc && !allCoords.find((c) => c.id === loc.id)) {
        allCoords.push({ lat: loc.lat, lon: loc.lon, id: loc.id });
      }
    }
  }

  if (allCoords.length === 0) return null;

  // Compute bounds and zoom
  const bbox = computeBBox(allCoords);
  const mapContentH = MAP_H - TITLE_H - ATTR_H;
  const zoom = fitZoom(bbox, MAP_W, mapContentH);

  // Compute pixel origin (top-left of the map area)
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;
  const centerPx = latLonToPixel(centerLat, centerLon, zoom);
  const originPx = centerPx.px - MAP_W / 2;
  const originPy = centerPx.py - mapContentH / 2;

  // Determine tile range
  const tileMinX = Math.floor(originPx / TILE_SIZE);
  const tileMaxX = Math.floor((originPx + MAP_W) / TILE_SIZE);
  const tileMinY = Math.floor(originPy / TILE_SIZE);
  const tileMaxY = Math.floor((originPy + mapContentH) / TILE_SIZE);

  // Fetch tiles
  const tileImages: string[] = [];
  for (let ty = tileMinY; ty <= tileMaxY; ty++) {
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      const buf = await fetchTile(zoom, tx, ty);
      if (buf.length === 0) continue;
      const b64 = buf.toString("base64");
      const imgX = tx * TILE_SIZE - originPx;
      const imgY = ty * TILE_SIZE - originPy + TITLE_H;
      tileImages.push(
        `    <image href="data:image/png;base64,${b64}" x="${imgX}" y="${imgY}" width="${TILE_SIZE}" height="${TILE_SIZE}"/>`
      );
    }
  }

  // Helper: lat/lon → SVG pixel coords
  function toSvgXY(lat: number, lon: number): { x: number; y: number } {
    const p = latLonToPixel(lat, lon, zoom);
    return { x: p.px - originPx, y: p.py - originPy + TITLE_H };
  }

  // Style variants based on tile source
  const isSatellite = tileSource === "satellite";
  const markerFill = isSatellite ? "#FFD700" : "#8B0000";
  const markerStroke = "white";
  const hebrewFill = isSatellite ? "#fff" : "#1a1a1a";
  const hebrewStroke = isSatellite ? "rgba(0,0,0,0.7)" : "rgba(250,248,244,0.8)";
  const englishFill = isSatellite ? "#eee" : "#333";
  const englishStroke = isSatellite ? "rgba(0,0,0,0.7)" : "rgba(250,248,244,0.8)";

  // Route color palette — visually distinct per journey
  const routePalette = isSatellite
    ? ["#FFD700", "#FF6B6B", "#7FDBFF", "#2ECC40", "#FF851B", "#F012BE", "#01FF70"]
    : ["#8B0000", "#1a5276", "#7d6608", "#1e8449", "#6c3483", "#b9770e", "#2e4053"];

  // Generate journey polylines + per-journey arrow markers
  const routeSvg: string[] = [];
  const arrowDefs: string[] = [];
  const journeyColors: string[] = []; // track for caption color dots
  for (let ji = 0; ji < journeyObjs.length; ji++) {
    const j = journeyObjs[ji];
    const color = routePalette[ji % routePalette.length];
    journeyColors.push(color);
    const arrowId = `arrow-${spec.id}-${ji}`;
    arrowDefs.push(
      `    <marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n      <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/>\n    </marker>`
    );
    const points: string[] = [];
    for (const wp of j.waypoints) {
      const loc = locLookup.get(wp.location);
      if (!loc) continue;
      const { x, y } = toSvgXY(loc.lat, loc.lon);
      const last = points[points.length - 1];
      const pt = `${x.toFixed(1)},${y.toFixed(1)}`;
      if (pt !== last) points.push(pt);
    }
    if (points.length >= 2) {
      routeSvg.push(
        `    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-mid="url(#${arrowId})" marker-end="url(#${arrowId})"/>`
      );
    }
  }

  // ── Label collision avoidance ──────────────────────────────────────────────
  // Estimate text bounding boxes and try multiple candidate positions per label.

  interface Rect { x: number; y: number; w: number; h: number }

  function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function overlapArea(a: Rect, b: Rect): number {
    const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return ox * oy;
  }

  // Approximate text width based on character count and font size
  function estimateTextWidth(text: string, fontSize: number): number {
    return text.length * fontSize * 0.6;
  }

  // Candidate positions relative to marker: [dx, dy, anchor]
  // Each places the label group (hebrew above english) at different offsets from the marker
  const candidateOffsets: Array<{ dx: number; dy: number; anchor: string }> = [
    { dx: 0, dy: -10, anchor: "middle" },    // above (default)
    { dx: 0, dy: 22, anchor: "middle" },      // below
    { dx: 12, dy: -4, anchor: "start" },      // right-above
    { dx: -12, dy: -4, anchor: "end" },        // left-above
    { dx: 12, dy: 12, anchor: "start" },       // right-below
    { dx: -12, dy: 12, anchor: "end" },        // left-below
    { dx: 0, dy: -26, anchor: "middle" },      // far above
    { dx: 0, dy: 36, anchor: "middle" },       // far below
  ];

  // Get bounding rect for a label group at a candidate position
  function getLabelRect(
    markerX: number, markerY: number,
    hebrewText: string, englishText: string,
    offset: { dx: number; dy: number; anchor: string }
  ): Rect {
    const hebrewW = hebrewText ? estimateTextWidth(hebrewText, 11) : 0;
    const englishW = estimateTextWidth(englishText, 9);
    const totalW = Math.max(hebrewW, englishW) + 6; // padding
    const totalH = hebrewText ? 28 : 14; // two lines or one

    let cx = markerX + offset.dx;
    let baseY = markerY + offset.dy;

    // Adjust x based on anchor
    let rectX: number;
    if (offset.anchor === "middle") rectX = cx - totalW / 2;
    else if (offset.anchor === "start") rectX = cx;
    else rectX = cx - totalW;

    return { x: rectX, y: baseY - totalH + 4, w: totalW, h: totalH };
  }

  // Placed label rects (including marker dots as obstacles)
  const occupiedRects: Rect[] = [];

  // Pre-populate with all marker dot positions as obstacles
  const markerPositions: Array<{ id: string; x: number; y: number }> = [];
  const placedIds = new Set<string>();
  for (const coord of allCoords) {
    if (placedIds.has(coord.id)) continue;
    placedIds.add(coord.id);
    const loc = locLookup.get(coord.id);
    if (!loc) continue;
    const { x, y } = toSvgXY(loc.lat, loc.lon);
    markerPositions.push({ id: coord.id, x, y });
    occupiedRects.push({ x: x - 5, y: y - 5, w: 10, h: 10 }); // marker dot
  }

  // Generate markers
  const markerSvg: string[] = [];
  for (const mp of markerPositions) {
    markerSvg.push(
      `    <circle cx="${mp.x.toFixed(1)}" cy="${mp.y.toFixed(1)}" r="4.5" fill="${markerFill}" stroke="${markerStroke}" stroke-width="1.5"/>`
    );
  }

  // Place labels with collision avoidance
  const labelSvg: string[] = [];

  for (const mp of markerPositions) {
    const loc = locLookup.get(mp.id)!;
    const hebrewLabel = loc.hebrew ? toOldHebrew(loc.hebrew) : "";

    // Try each candidate position, pick the one with least overlap
    let bestOffset = candidateOffsets[0];
    let bestOverlap = Infinity;

    for (const offset of candidateOffsets) {
      const rect = getLabelRect(mp.x, mp.y, hebrewLabel, loc.name, offset);

      // Skip if label goes out of map bounds
      if (rect.x < 2 || rect.x + rect.w > MAP_W - 2 ||
          rect.y < TITLE_H + 2 || rect.y + rect.h > MAP_H - ATTR_H - 2) {
        continue;
      }

      let totalOverlap = 0;
      for (const occ of occupiedRects) {
        totalOverlap += overlapArea(rect, occ);
      }

      if (totalOverlap < bestOverlap) {
        bestOverlap = totalOverlap;
        bestOffset = offset;
        if (totalOverlap === 0) break; // perfect — no overlap
      }
    }

    // Compute final label positions
    const rect = getLabelRect(mp.x, mp.y, hebrewLabel, loc.name, bestOffset);
    occupiedRects.push(rect);

    const lx = mp.x + bestOffset.dx;
    const anchor = bestOffset.anchor;

    if (hebrewLabel) {
      const hy = mp.y + bestOffset.dy - 2;
      labelSvg.push(
        `    <text x="${lx.toFixed(1)}" y="${hy.toFixed(1)}" text-anchor="${anchor}" font-family="'Noto Sans Phoenician', 'Segoe UI Historic', serif" font-size="11" fill="${hebrewFill}" stroke="${hebrewStroke}" stroke-width="3" paint-order="stroke">${escSvg(hebrewLabel)}</text>`
      );
    }

    const ey = mp.y + bestOffset.dy + (hebrewLabel ? 12 : 0);
    labelSvg.push(
      `    <text x="${lx.toFixed(1)}" y="${ey.toFixed(1)}" text-anchor="${anchor}" font-family="Georgia, 'Times New Roman', serif" font-size="9" fill="${englishFill}" stroke="${englishStroke}" stroke-width="3" paint-order="stroke">${escSvg(loc.name)}</text>`
    );
  }

  // Assemble SVG
  const svg = `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width:100%;height:auto;">
  <defs>
    <clipPath id="mapclip-${spec.id}">
      <rect x="0" y="${TITLE_H}" width="${MAP_W}" height="${mapContentH}"/>
    </clipPath>
${arrowDefs.join("\n")}
  </defs>
  <!-- Title bar -->
  <rect x="0" y="0" width="${MAP_W}" height="${TITLE_H}" fill="#faf8f4"/>
  <text x="${MAP_W / 2}" y="${TITLE_H - 10}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="14" font-weight="bold" fill="#1a1a1a">${escSvg(spec.title)}</text>
  <line x1="20" y1="${TITLE_H - 2}" x2="${MAP_W - 20}" y2="${TITLE_H - 2}" stroke="#d5d0c8" stroke-width="0.5"/>
  <!-- Tile grid -->
  <g clip-path="url(#mapclip-${spec.id})">
${tileImages.join("\n")}
    <!-- Subtle overlay for readability -->
    <rect x="0" y="${TITLE_H}" width="${MAP_W}" height="${mapContentH}" fill="${isSatellite ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.1)"}"/>
  </g>
  <!-- Journey routes -->
${routeSvg.join("\n")}
  <!-- Location markers -->
${markerSvg.join("\n")}
  <!-- Labels -->
${labelSvg.join("\n")}
  <!-- Attribution -->
  <text x="${MAP_W - 5}" y="${MAP_H - 3}" text-anchor="end" font-family="Arial, sans-serif" font-size="7" fill="#999">Map data \u00A9 OpenStreetMap contributors</text>
</svg>`;

  return { svg, journeyColors };
}

// ─── Map placement algorithm ────────────────────────────────────────────────

function buildMapPlan(): MapSpec[] {
  const maps: MapSpec[] = [];

  // Group journeys by their first waypoint's chapter
  const journeysByStartChapter = new Map<number, Journey[]>();
  for (const j of journeysData.journeys) {
    if (j.waypoints.length < 2) continue;
    const startCh = j.waypoints[0].chapter;
    if (!journeysByStartChapter.has(startCh)) journeysByStartChapter.set(startCh, []);
    journeysByStartChapter.get(startCh)!.push(j);
  }

  // Walk through chapters and create map specs
  // We'll merge adjacent-chapter journeys
  const processedJourneys = new Set<string>();
  const chapters = [...journeysByStartChapter.keys()].sort((a, b) => a - b);

  for (const ch of chapters) {
    const chJourneys = journeysByStartChapter.get(ch)!;

    // Also grab journeys from ch+1 to merge
    const nextJourneys = journeysByStartChapter.get(ch + 1) || [];

    const toProcess = [...chJourneys, ...nextJourneys].filter(
      (j) => !processedJourneys.has(j.id)
    );

    if (toProcess.length === 0) continue;

    // Collect all unique locations from these journeys
    const locationSet = new Set<string>();
    const journeyIds: string[] = [];

    for (const j of toProcess) {
      journeyIds.push(j.id);
      processedJourneys.add(j.id);
      for (const wp of j.waypoints) {
        locationSet.add(wp.location);
      }
    }

    // Build a descriptive title
    let title: string;
    if (toProcess.length === 1) {
      title = toProcess[0].description;
    } else {
      // Find the primary traveler
      const travelers = [...new Set(toProcess.map((j) => j.traveler))];
      if (travelers.length === 1) {
        const t = travelers[0].charAt(0).toUpperCase() + travelers[0].slice(1).replace(/-/g, " ");
        title = `Journeys of ${t} (Chapters ${ch}–${toProcess[toProcess.length - 1].waypoints.slice(-1)[0].chapter})`;
      } else {
        title = `Journeys in Chapters ${ch}–${toProcess[toProcess.length - 1].waypoints.slice(-1)[0].chapter}`;
      }
    }

    // Use the combined ID from the first journey
    const id = toProcess.length === 1 ? toProcess[0].id : `map-ch-${ch}`;

    maps.push({
      id,
      title,
      insertBefore: ch,
      journeys: journeyIds,
      locations: [...locationSet],
    });
  }

  return maps;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const mapPlan = buildMapPlan();

console.log(`Map plan: ${mapPlan.length} maps to generate`);
for (const spec of mapPlan) {
  console.log(`  [ch ${spec.insertBefore}] ${spec.title} (${spec.journeys.length} journeys, ${spec.locations.length} locations)`);
}

// Generate SVGs
interface MapOutput {
  id: string;
  title: string;
  insertBefore: number;
  svg: string;
  caption: { traveler: string; description: string; color: string }[];
}

const mapsOutput: MapOutput[] = [];

for (const spec of mapPlan) {
  console.log(`Generating map: ${spec.id}...`);
  const result = await generateMapSvg(spec);
  if (result) {
    // Build caption from journey details with route colors
    const caption: { traveler: string; description: string; color: string }[] = [];
    let ci = 0;
    for (const jId of spec.journeys) {
      const j = journeysData.journeys.find((jj) => jj.id === jId);
      if (j) {
        const traveler = j.traveler.charAt(0).toUpperCase() + j.traveler.slice(1).replace(/-/g, " ");
        caption.push({ traveler, description: j.description, color: result.journeyColors[ci] || "#888" });
      }
      ci++;
    }
    mapsOutput.push({
      id: spec.id,
      title: spec.title,
      insertBefore: spec.insertBefore,
      svg: result.svg,
      caption,
    });
  }
}

// Write output
const outputDir = path.join(bookDir, "output");
mkdirSync(outputDir, { recursive: true });

await Bun.write(
  path.join(outputDir, "maps.json"),
  JSON.stringify({ maps: mapsOutput }, null, 2)
);

console.log(`\nGenerated ${mapsOutput.length} maps → output/maps.json`);
