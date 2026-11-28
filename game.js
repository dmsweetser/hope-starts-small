'use strict';
/* ============================== TEXT RESOURCE ============================== */
// All of the game's writing lives in text.js (loaded before this file).
// F() fills {placeholders} in a text.js template with live values.
function F(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}
if (typeof TEXT === 'undefined') {
  // text.js failed to load or has a syntax error: say so on the canvas
  // instead of dying silently on a black screen.
  const c0 = document.getElementById('game');
  if (c0) { const g0 = c0.getContext('2d'); g0.fillStyle = '#20242a'; g0.fillRect(0, 0, c0.width, c0.height); g0.fillStyle = '#f8f8f8'; g0.font = '11px monospace'; g0.fillText('text.js failed to load.', 14, 42); g0.fillText('Check text.js for a typo', 14, 62); g0.fillText('(a missing quote or comma).', 14, 78); }
  throw new Error('TEXT is undefined: text.js did not load');
}

/* HOPE STARTS SMALL — Chapter 1: SEEDS
   A tiny Pokémon-style tending game. Vanilla JS, no dependencies.
   All art is drawn in code from pixel maps. No image assets. */

// The book's Audible page — the game's funnel target.
const AUDIBLE_URL = 'https://www.audible.com/pd/Hope-Starts-Small-Audiobook/B0DZPCHT4M';
// The book's Amazon page — the title menu's second funnel link.
const BOOK_URL = 'https://www.amazon.com/dp/B0DXVKQHZ2';
const SAVE_KEY = 'hss-save-v1';
const TRIAL_OUTCOMES = {}; // trial kind -> {win(t), lose(t, fled)} — chapters register their outcomes here
const VW = 160, VH = 144, TILE = 16;

/* ============================== FONT (3x5) ============================== */
const FONT = {
'A':['.#.','#.#','###','#.#','#.#'],'B':['##.','#.#','##.','#.#','##.'],
'C':['.##','#..','#..','#..','.##'],'D':['##.','#.#','#.#','#.#','##.'],
'E':['###','#..','##.','#..','###'],'F':['###','#..','##.','#..','#..'],
'G':['.##','#..','#.#','#.#','.##'],'H':['#.#','#.#','###','#.#','#.#'],
'I':['###','.#.','.#.','.#.','###'],'J':['..#','..#','..#','#.#','.#.'],
'K':['#.#','#.#','##.','#.#','#.#'],'L':['#..','#..','#..','#..','###'],
'M':['#.#','###','###','#.#','#.#'],'N':['#.#','###','#.#','#.#','#.#'],
'O':['.#.','#.#','#.#','#.#','.#.'],'P':['##.','#.#','##.','#..','#..'],
'Q':['.#.','#.#','#.#','##.','..#'],'R':['##.','#.#','##.','#.#','#.#'],
'S':['.##','#..','.#.','..#','##.'],'T':['###','.#.','.#.','.#.','.#.'],
'U':['#.#','#.#','#.#','#.#','###'],'V':['#.#','#.#','#.#','#.#','.#.'],
'W':['#.#','#.#','#.#','###','#.#'],'X':['#.#','#.#','.#.','#.#','#.#'],
'Y':['#.#','#.#','.#.','.#.','.#.'],'Z':['###','..#','.#.','#..','###'],
'0':['###','#.#','#.#','#.#','###'],'1':['.#.','.#.','.#.','.#.','.#.'],
'2':['##.','..#','.#.','#..','###'],'3':['##.','..#','.#.','..#','##.'],
'4':['#.#','#.#','###','..#','..#'],'5':['###','#..','##.','..#','##.'],
'6':['.##','#..','##.','#.#','.#.'],'7':['###','..#','.#.','.#.','.#.'],
'8':['.#.','#.#','.#.','#.#','.#.'],'9':['.#.','#.#','##.','..#','##.'],
'.':['...','...','...','...','.#.'],',':['...','...','...','.#.','#..'],
"'":['.#.','.#.','...','...','...'],'!':['.#.','.#.','.#.','...','.#.'],
'?':['##.','..#','.#.','...','.#.'],':':['...','.#.','...','.#.','...'],
';':['...','.#.','...','.#.','#..'],'-':['...','...','###','...','...'],
'+':['...','.#.','###','.#.','...'],'/':['..#','..#','.#.','#..','#..'],
'(':['..#','.#.','.#.','.#.','..#'],')':['#..','.#.','.#.','.#.','#..'],
'>':['#..','.#.','..#','.#.','#..'],'<':['..#','.#.','#..','.#.','..#'],
'*':['#.#','.#.','#.#','...','...'],'%':['#.#','..#','.#.','#..','#.#'],
'=':['...','###','...','###','...'],'_':['...','...','...','...','###'],
'"':['#.#','#.#','...','...','...'],'&':['.#.','#.#','.#.','#.#','.##'],
'·':['...','...','.#.','...','...'],'—':['...','...','###','...','...'],
'…':['...','...','...','#.#','...'],'×':['...','#.#','.#.','#.#','...'],
'♥':['#.#','###','###','.#.','...'],'♪':['..#','..#','..#','#.#','##.'],
'▶':['#..','##.','###','##.','#..'],'▼':['###','###','.#.','.#.','...'],'←':['...','.#.','###','.#.','...'],
'↑':['.#.','###','.#.','.#.','.#.'],'↓':['.#.','.#.','.#.','###','.#.']
};
const ctx = document.getElementById('game').getContext('2d');
ctx.imageSmoothingEnabled = false;
// Daniel (Nov 26, 2026): double the pixels. The canvas bitmap is 320x288
// and every draw below happens in the game's 160x144 space under a 2x
// base transform — so the world, tiles and UI render exactly as designed,
// while character sprites are authored as true 32x32 maps and drawn into
// their 16x16 of game space at full detail (see charSprite).
ctx.setTransform(2, 0, 0, 2, 0, 0);

function textW(s, sc) { return s.length ? s.length * 4 * sc - sc : 0; }
function drawText(s, x, y, color, sc) {
  sc = sc || 1; s = String(s).toUpperCase();
  x = Math.round(x); y = Math.round(y); // fractional coords smear the 1px font into half-cut glyphs
  ctx.fillStyle = color;
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]]; if (!g) continue;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
      if (g[r][c] === '#') ctx.fillRect(x + i * 4 * sc + c * sc, y + r * sc, sc, sc);
  }
}
function wrapText(s, maxChars) {
  const words = String(s).split(' '), lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ============================== SPRITES ============================== */
function makeSprite(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = pal[rows[y][x]];
    if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  }
  return cv;
}
function tileCanvas(draw) {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
  draw(cv.getContext('2d')); return cv;
}
function dither(c, x, y, w, h, colA, colB) { // checkerboard dither fill
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    c.fillStyle = ((i + j) % 2 === 0) ? colA : colB; c.fillRect(i, j, 1, 1);
  }
}
const GRASS = '#58b93e', GRASS_D = '#3f9433', GRASS_L = '#7ed957';
const SHADOW = '#357a2a'; // the one cast-shadow tone for everything standing on grass
const TILES = {};
/* ================= ART OVERHAUL (Nov 27, 2026) =================
   GBA-era restyle, ported from the approved sample lab
   (hidden_files/art-sample/art.js): structured tuft-cluster grass in
   five tones, shaded buildings, soft ground shadows, dark outlines.
   Texture is placed by a deterministic per-tile hash — structured,
   never noise. Tile semantics and map geometry are unchanged. */
function tileHash(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 974634211) >>> 0; h = (h ^ (h >> 13)) >>> 0; h = Math.imul(h, 1274126177) >>> 0; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

/* ---- grass family: warm mid green, soft tone patches, one tuft
   cluster per tile in near-base tones — a quiet surface the cast
   stands on. (Calmed Nov 27, 2026 on Daniel's playtest verdict:
   the first overhaul's ground was too busy — three tufts a tile,
   loose sparkle pixels, and a two-frame sway on top. The tuft is
   now single and softer, the sparkles are gone, the grass is
   still. Structured texture remains; the noise does not.) ---- */
const G_BASE = '#6fbc42', G_LIGHT = '#8ad856', G_MID = '#57a233', G_DARK = '#468c28', G_DEEP = '#38731f';
const GT_D = '#4e9c31', GT_M = '#63ab3a', GT_L = '#77c24b'; // the tuft's calmer three tones
function grassTuft(c, x, y, flip) {
  c.fillStyle = GT_D; c.fillRect(x, y + 1, 1, 2); c.fillRect(x + 2, y + 1, 1, 2);
  c.fillStyle = GT_M; c.fillRect(x + 1, y, 1, 3);
  c.fillStyle = GT_L; c.fillRect(x + 1, y, 1, 1);
  if (flip) { c.fillStyle = GT_D; c.fillRect(x + 3, y + 2, 1, 1); }
}
function grassTile(seed, feature) {
  return tileCanvas(c => {
    c.fillStyle = G_BASE; c.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 2; i++) {
      const px = Math.floor(tileHash(seed, i, 1) * 12), py = Math.floor(tileHash(seed, i, 2) * 12);
      c.fillStyle = i ? G_MID : G_LIGHT;
      c.globalAlpha = 0.22;
      c.fillRect(px, py, 3, 2); c.fillRect(px + 1, py + 2, 2, 1); c.fillRect(px + 1, py - 1, 1, 1);
      c.globalAlpha = 1;
    }
    const px = 1 + Math.floor(tileHash(seed, 0, 3) * 11), py = 1 + Math.floor(tileHash(seed, 0, 4) * 12);
    grassTuft(c, px, py, false);
    if (feature === 'pebble') { c.fillStyle = '#a9b39a'; c.fillRect(11, 12, 2, 1); c.fillStyle = '#8a957c'; c.fillRect(11, 13, 2, 1); }
    if (feature === 'tuft') { grassTuft(c, 6, 5, false); }
    if (feature === 'mow') {
      c.globalAlpha = 0.10; c.fillStyle = G_LIGHT; c.fillRect(0, 0, 16, 4); c.fillRect(0, 8, 16, 4);
      c.fillStyle = G_MID; c.fillRect(0, 4, 16, 4); c.fillRect(0, 12, 16, 4); c.globalAlpha = 1;
    }
  });
}
TILES.grass = grassTile(11);
TILES.grass2 = grassTile(23);
TILES.grass3 = grassTile(37, 'pebble');
TILES.grass4 = grassTile(41, 'mow');
TILES.tuft = grassTile(53, 'tuft');
TILES.tuftB = grassTile(59, 'tuft');
function flowerTile(seed, cols) {
  const g = grassTile(seed);
  return tileCanvas(c => {
    c.drawImage(g, 0, 0);
    const pos = [[3, 4], [11, 6], [6, 12], [13, 11]];
    pos.forEach(([x, y], i) => {
      c.fillStyle = G_DEEP; c.fillRect(x, y + 2, 1, 1);
      c.fillStyle = cols[i % cols.length]; c.fillRect(x - 1, y, 2, 2); c.fillRect(x, y - 1, 1, 1);
      c.fillStyle = '#fff3b0'; c.fillRect(x, y, 1, 1);
    });
  });
}
TILES.flower = flowerTile(67, ['#ff6b9d', '#ffd94a', '#ffffff']);
TILES.flowerB = flowerTile(71, ['#ff6b9d', '#ffd94a', '#ffffff']);
TILES.flower2 = flowerTile(73, ['#b07fe8', '#ff9f43', '#3ec6b8']);
TILES.flower3 = flowerTile(79, ['#5b9bf0', '#ffffff', '#e0483e']);
TILES.lawn = tileCanvas(c => { // the neighbours' lawn: cooler, striped, immaculate
  for (let x = 0; x < 16; x += 4) { c.fillStyle = '#74c34a'; c.fillRect(x, 0, 4, 16); c.fillStyle = '#68b840'; c.fillRect(x + 2, 0, 2, 16); }
  c.fillStyle = '#57a233'; c.fillRect(13, 3, 1, 2); c.fillRect(2, 9, 1, 2);
});

/* ---- ground: sandy path, stepping stones, furrowed soil, porch ---- */
TILES.path = tileCanvas(c => {
  c.fillStyle = '#ecd28c'; c.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(tileHash(i, 3, 9) * 16), y = Math.floor(tileHash(i, 4, 9) * 16);
    c.fillStyle = i % 3 ? '#dcbc6e' : '#c9a24f'; c.fillRect(x, y, 1, 1);
  }
  c.fillStyle = '#c9a24f'; c.fillRect(4, 6, 2, 1); c.fillRect(11, 11, 2, 1);
  c.fillStyle = 'rgba(160,120,50,0.35)'; c.fillRect(0, 0, 1, 16); c.fillRect(15, 0, 1, 16);
});
TILES.pathStone = tileCanvas(c => {
  c.drawImage(TILES.path, 0, 0);
  const stone = (x, y) => {
    c.fillStyle = '#b9bfc7'; c.fillRect(x, y, 6, 5);
    c.fillStyle = '#dde3ea'; c.fillRect(x, y, 6, 1); c.fillRect(x, y, 1, 5);
    c.fillStyle = '#8f959e'; c.fillRect(x, y + 4, 6, 1); c.fillRect(x + 5, y, 1, 4);
    c.fillStyle = '#cdd3db'; c.fillRect(x + 2, y + 2, 2, 1);
  };
  stone(2, 2); stone(8, 9);
});
TILES.soil = tileCanvas(c => {
  c.fillStyle = '#8a5a30'; c.fillRect(0, 0, 16, 16);
  for (let r = 0; r < 4; r++) { const y = r * 4; c.fillStyle = '#a5713d'; c.fillRect(0, y, 16, 2); c.fillStyle = '#6f4520'; c.fillRect(0, y + 3, 16, 1); }
  for (let i = 0; i < 8; i++) { const x = Math.floor(tileHash(i, i * 3 + 1, 7) * 14), y = Math.floor(tileHash(i, 9, 7) * 15); c.fillStyle = '#bd8a4f'; c.fillRect(x, y, 2, 1); }
});
TILES.soilSprout = tileCanvas(c => {
  c.drawImage(TILES.soil, 0, 0);
  for (const [x, y] of [[3, 1], [8, 1], [13, 1], [5, 6], [11, 6], [3, 11], [9, 11], [14, 11]]) {
    c.fillStyle = '#2f7a24'; c.fillRect(x, y + 1, 1, 2);
    c.fillStyle = '#57a233'; c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1);
    c.fillStyle = '#7ed957'; c.fillRect(x, y - 1, 1, 1);
  }
});
TILES.porch = tileCanvas(c => {
  c.fillStyle = '#b0824a'; c.fillRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y += 4) {
    c.fillStyle = '#c99a5f'; c.fillRect(0, y, 16, 1);
    c.fillStyle = '#8a5f30'; c.fillRect(0, y + 3, 16, 1);
    c.fillStyle = '#a5713d'; c.fillRect(2 + (y * 3) % 9, y + 1, 4, 1);
    c.fillStyle = '#6f4520'; c.fillRect(3, y + 1, 1, 1); c.fillRect(13, y + 2, 1, 1);
  }
  c.fillStyle = '#b03030'; c.fillRect(5, 6, 6, 4); // the welcome mat
  c.fillStyle = '#d94f4f'; c.fillRect(5, 6, 6, 1); c.fillStyle = '#7e1f1f'; c.fillRect(5, 9, 6, 1); c.fillRect(6, 7, 4, 1);
});

/* ---- the house: shingled roof, sided walls, stone foundation ---- */
TILES.roof = tileCanvas(c => {
  c.fillStyle = '#3d74d6'; c.fillRect(0, 0, 16, 16);
  for (let r = 0; r < 5; r++) {
    const y = r * 3;
    c.fillStyle = '#5b90e8'; c.fillRect(0, y, 16, 1);
    c.fillStyle = '#2a529e'; c.fillRect(0, y + 2, 16, 1);
    c.fillStyle = '#2a529e';
    for (let x = (r % 2) * 4; x < 16; x += 8) c.fillRect(x, y, 1, 2);
  }
  c.fillStyle = '#8fb8f5'; c.fillRect(0, 0, 16, 1); // ridge light
  c.fillStyle = '#1e3a6e'; c.fillRect(0, 14, 16, 2); // eave shadow
  c.fillStyle = '#eef3f8'; c.fillRect(0, 15, 16, 1); // gutter
});
TILES.chimney = tileCanvas(c => {
  c.drawImage(TILES.roof, 0, 0);
  c.fillStyle = '#9aa0a8'; c.fillRect(5, 2, 7, 2); c.fillStyle = '#c3c9d1'; c.fillRect(5, 2, 7, 1);
  c.fillStyle = '#b85c38'; c.fillRect(6, 4, 5, 12);
  c.fillStyle = '#d97b4a'; c.fillRect(6, 4, 1, 12);
  c.fillStyle = '#8a3d20'; c.fillRect(10, 4, 1, 12); c.fillRect(6, 7, 5, 1); c.fillRect(6, 11, 5, 1);
  c.fillStyle = '#e8edf2'; c.fillRect(2, 0, 2, 2); c.fillRect(12, 1, 2, 1); // wisp of smoke, still
});
TILES.wall = tileCanvas(c => {
  c.fillStyle = '#9cc4ee'; c.fillRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y += 4) {
    c.fillStyle = '#c4e0fa'; c.fillRect(0, y, 16, 1);
    c.fillStyle = '#6f9fd8'; c.fillRect(0, y + 3, 16, 1);
  }
  c.fillStyle = '#aed2f5'; c.fillRect(7, 1, 1, 2); c.fillRect(12, 9, 1, 2); c.fillRect(3, 13, 1, 2);
});
TILES.wallBase = tileCanvas(c => {
  c.drawImage(TILES.wall, 0, 0);
  c.fillStyle = '#878d95'; c.fillRect(0, 10, 16, 6);
  c.fillStyle = '#aab0b8'; c.fillRect(1, 11, 5, 3); c.fillRect(8, 11, 6, 3);
  c.fillStyle = '#767c84'; c.fillRect(1, 14, 5, 1); c.fillRect(8, 14, 6, 1); c.fillRect(6, 11, 1, 4); c.fillRect(14, 11, 1, 4);
  c.fillStyle = '#5f646c'; c.fillRect(0, 10, 16, 1);
  c.fillStyle = 'rgba(30,60,25,0.30)'; c.fillRect(0, 15, 16, 1); // ground shade at the foot
});
TILES.window = tileCanvas(c => {
  c.drawImage(TILES.wall, 0, 0);
  c.fillStyle = '#f7f7f2'; c.fillRect(2, 2, 12, 11);
  c.fillStyle = '#ccd2d8'; c.fillRect(2, 11, 12, 2); c.fillRect(12, 2, 2, 11);
  const grad = c.createLinearGradient(0, 3, 0, 12); grad.addColorStop(0, '#cfeaff'); grad.addColorStop(1, '#7fb2e8');
  c.fillStyle = grad; c.fillRect(4, 4, 8, 7);
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(5, 4, 2, 5); c.fillRect(6, 4, 1, 7); // sky shine
  c.fillStyle = '#f2a7bb'; c.fillRect(4, 4, 2, 7); c.fillRect(10, 4, 2, 7); // curtains
  c.fillStyle = '#d97b96'; c.fillRect(5, 5, 1, 6); c.fillRect(10, 5, 1, 6);
  c.fillStyle = '#f7f7f2'; c.fillRect(7, 4, 2, 7); c.fillRect(4, 7, 8, 1); // muntins
  c.fillStyle = '#20242a'; c.fillRect(2, 2, 12, 1); c.fillRect(2, 12, 12, 1); c.fillRect(2, 2, 1, 11); c.fillRect(13, 2, 1, 11);
  c.fillStyle = '#e8ecf1'; c.fillRect(1, 13, 14, 2); c.fillStyle = '#9db6cc'; c.fillRect(1, 14, 14, 1);
  c.fillStyle = '#2f7a24'; c.fillRect(3, 12, 10, 1); // flower box
  c.fillStyle = '#ff6b9d'; c.fillRect(4, 11, 1, 1); c.fillRect(11, 11, 1, 1);
  c.fillStyle = '#ffd94a'; c.fillRect(7, 11, 2, 1); c.fillStyle = '#ffffff'; c.fillRect(9, 12, 1, 1);
});
TILES.door = tileCanvas(c => {
  c.drawImage(TILES.wall, 0, 0);
  c.fillStyle = '#37b24d'; c.fillRect(0, 0, 16, 2); c.fillStyle = '#2b8a3e'; c.fillRect(0, 2, 16, 1); // awning
  c.fillStyle = '#5cc46a'; c.fillRect(2, 0, 2, 2); c.fillRect(7, 0, 2, 2); c.fillRect(12, 0, 2, 2);
  c.fillStyle = '#f7f7f2'; c.fillRect(3, 3, 10, 13); c.fillStyle = '#ccd2d8'; c.fillRect(11, 3, 2, 13);
  c.fillStyle = '#a5662c'; c.fillRect(4, 4, 8, 12);
  c.fillStyle = '#bd7c38'; c.fillRect(4, 4, 1, 12); c.fillStyle = '#8a4f1f'; c.fillRect(11, 4, 1, 12);
  c.fillStyle = '#ffe9a8'; c.fillRect(5, 5, 6, 3); c.fillStyle = '#fff6cf'; c.fillRect(6, 5, 2, 2); // door glass
  c.fillStyle = '#8a4f1f'; c.fillRect(5, 9, 6, 2); c.fillRect(5, 12, 6, 3); // panels
  c.fillStyle = '#ffd94a'; c.fillRect(10, 10, 2, 2); // knob
  c.fillStyle = '#2f7a24'; c.fillRect(6, 9, 3, 1); c.fillRect(6, 11, 3, 1); c.fillRect(6, 10, 1, 1); c.fillRect(8, 10, 1, 1); // wreath
  c.fillStyle = '#54c95e'; c.fillRect(7, 9, 1, 1); c.fillStyle = '#e0483e'; c.fillRect(6, 9, 1, 1); c.fillRect(8, 11, 1, 1);
  c.fillStyle = '#f7f7f2'; c.fillRect(0, 4, 1, 12); c.fillRect(15, 4, 1, 12); // porch posts
  c.fillStyle = '#ccd2d8'; c.fillRect(1, 4, 1, 12); c.fillRect(14, 8, 1, 8);
  c.fillStyle = '#20242a'; c.fillRect(13, 3, 1, 1);
  c.fillStyle = '#ff6b9d'; c.fillRect(12, 4, 1, 1); c.fillRect(14, 4, 1, 1); // hanging basket
  c.fillStyle = '#2f7a24'; c.fillRect(12, 5, 3, 1); c.fillStyle = '#8a5a30'; c.fillRect(12, 6, 3, 2);
});

/* ---- fences & yard furniture ---- */
function fenceGround(c) {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.28)'; c.fillRect(0, 13, 16, 3); // soft ground shadow
}
TILES.fenceH = tileCanvas(c => {
  fenceGround(c);
  c.fillStyle = '#e3e6e0'; c.fillRect(0, 6, 16, 2); c.fillRect(0, 11, 16, 2); // rails behind
  c.fillStyle = '#c3c9cd'; c.fillRect(0, 7, 16, 1); c.fillRect(0, 12, 16, 1);
  for (const x of [1, 6, 12]) { // pickets: lit left, white face, shaded right
    c.fillStyle = '#ffffff'; c.fillRect(x + 1, 2, 1, 1);
    c.fillStyle = '#f7f7f2'; c.fillRect(x, 3, 3, 12);
    c.fillStyle = '#ffffff'; c.fillRect(x, 3, 1, 12);
    c.fillStyle = '#ccd2d8'; c.fillRect(x + 2, 3, 1, 12);
    c.fillStyle = '#8a919c'; c.fillRect(x + 1, 6, 1, 1); c.fillRect(x + 1, 11, 1, 1); // nails
  }
});
TILES.fenceV = tileCanvas(c => {
  fenceGround(c);
  c.fillStyle = 'rgba(30,60,25,0.28)'; c.fillRect(10, 0, 6, 13);
  c.fillStyle = '#e3e6e0'; c.fillRect(4, 2, 2, 12); c.fillRect(11, 2, 2, 12);
  c.fillStyle = '#f7f7f2'; c.fillRect(6, 1, 5, 14);
  c.fillStyle = '#ffffff'; c.fillRect(6, 1, 1, 14);
  c.fillStyle = '#ccd2d8'; c.fillRect(9, 1, 2, 14);
  c.fillStyle = '#8a919c'; c.fillRect(8, 0, 2, 1);
});
TILES.gate = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.25)'; c.fillRect(1, 14, 14, 2);
  c.fillStyle = '#a5713d'; c.fillRect(1, 2, 14, 13);
  c.fillStyle = '#bd8a4f'; c.fillRect(1, 2, 2, 13); c.fillRect(6, 2, 1, 13);
  c.fillStyle = '#8a5a30'; c.fillRect(1, 6, 14, 1); c.fillRect(1, 11, 14, 1);
  c.fillStyle = '#6f4520'; c.fillRect(13, 2, 2, 13); c.fillRect(7, 2, 1, 13);
  c.fillStyle = '#3a3f46'; c.fillRect(12, 8, 3, 2); c.fillRect(1, 3, 2, 2); // latch + hinge
});
TILES.bench = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.25)'; c.fillRect(0, 11, 16, 2);
  c.fillStyle = '#e0b273'; c.fillRect(0, 3, 16, 1);
  c.fillStyle = '#a5713d'; c.fillRect(0, 4, 16, 2); c.fillRect(0, 7, 16, 2);
  c.fillStyle = '#d9ab68'; c.fillRect(0, 7, 16, 1);
  c.fillStyle = '#bd8a4f'; c.fillRect(2, 4, 5, 1); c.fillRect(9, 7, 4, 1); // grain light
  c.fillStyle = '#8a5a30'; c.fillRect(0, 6, 16, 1); c.fillRect(0, 9, 16, 1);
  c.fillStyle = '#3a3f46'; c.fillRect(0, 4, 1, 6); c.fillRect(15, 4, 1, 6); // iron ends
  c.fillStyle = '#6f4520'; c.fillRect(2, 10, 2, 2); c.fillRect(12, 10, 2, 2);
  c.fillStyle = '#5f3717'; c.fillRect(0, 12, 16, 4); // mulched bed at the base
  c.fillStyle = '#8a5a30'; c.fillRect(2, 13, 2, 1); c.fillRect(8, 14, 2, 1); c.fillRect(13, 13, 2, 1);
  c.fillStyle = '#54c95e'; c.fillRect(5, 12, 1, 1); c.fillRect(11, 14, 1, 1);
});
TILES.compost = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = '#6f4520'; c.fillRect(1, 4, 14, 12);
  c.fillStyle = '#8a5a30'; c.fillRect(1, 4, 14, 2); c.fillRect(1, 9, 14, 1); c.fillRect(1, 13, 14, 1);
  c.fillStyle = '#bd8a4f'; c.fillRect(1, 4, 14, 1);
  c.fillStyle = '#4a7c2f'; c.fillRect(4, 2, 3, 3); c.fillRect(9, 1, 4, 3); c.fillRect(12, 3, 2, 2);
  c.fillStyle = '#67c24e'; c.fillRect(5, 1, 2, 2); c.fillRect(10, 0, 2, 2);
  c.fillStyle = '#8a5a30'; c.fillRect(6, 3, 2, 1); c.fillRect(11, 2, 1, 1);
});

/* ---- weeds (pass 8): drawn OVER a grass tile, decor layer. The common
   tuft is a yellow-green fan, quite unlike the lawn's own thin tufts; the
   deep-rooted one is taller, darker, and shows its root flare. ---- */
const WEED_TUFT = makeSprite([
'................',
'................',
'.....y....y.....',
'....l.l..l.l....',
'....l..l.l..l...',
'.....l.lll.l....',
'..y...lll...y...',
'...l..lll..d....',
'....l.llldd.....',
'.....lllldd.....',
'....dddddddd....',
'...dddddddddd...',
'.......rr.......',
'................',
'................',
'................',
], { y: '#a8b83e', l: '#7a9a2e', d: '#4a7c2f', r: '#6f4520' });
const WEED_DEEP = makeSprite([
'..d.......d.....',
'..d..s...d..s...',
'...d.d..d..d....',
'....d.dDD.d.....',
'..d..dDDD...d...',
'...d.dDDD.d.....',
'....dDDDDD......',
'..d.dDDDDDD.d...',
'...dDDDDDDDD....',
'....ddddddd.....',
'...ddddddddd....',
'..dDDDDDDDDDD...',
'.....R.R.R......',
'......RRR.......',
'................',
'................',
], { D: '#2e5d24', d: '#3f7030', s: '#c9a83e', R: '#5a3a1e' });

/* ---- beds, bushes and the small props ---- */
function bedTile(cols) {
  return tileCanvas(c => {
    c.fillStyle = '#6f4520'; c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#7d4e24'; c.fillRect(1, 1, 14, 14);
    c.fillStyle = '#5f3717'; c.fillRect(3, 4, 2, 1); c.fillRect(11, 9, 2, 1); c.fillRect(6, 13, 2, 1);
    c.fillStyle = '#2f7a24'; c.fillRect(2, 2, 6, 5); c.fillRect(9, 2, 5, 4); c.fillRect(3, 8, 5, 5); c.fillRect(9, 8, 5, 6); c.fillRect(6, 5, 4, 4);
    c.fillStyle = '#54c95e'; c.fillRect(3, 3, 3, 2); c.fillRect(10, 3, 2, 2); c.fillRect(4, 9, 3, 2); c.fillRect(11, 10, 2, 2); c.fillRect(7, 6, 2, 1);
    c.fillStyle = '#7ed957'; c.fillRect(4, 3, 1, 1); c.fillRect(10, 9, 1, 1);
    [[3, 3], [11, 4], [6, 9], [12, 11], [4, 12], [8, 5]].forEach(([x, y], i) => {
      c.fillStyle = cols[i % cols.length]; c.fillRect(x, y, 2, 2); c.fillStyle = '#fff3b0'; c.fillRect(x, y, 1, 1);
    });
  });
}
TILES.bedA = bedTile(['#ff6b9d', '#ffffff', '#ffd94a']);
TILES.bedB = bedTile(['#b07fe8', '#ff9f43', '#3ec6b8']);
TILES.bush = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.30)'; c.fillRect(2, 13, 12, 2);
  c.fillStyle = '#2c6e24'; c.fillRect(3, 4, 10, 9); c.fillRect(2, 6, 12, 6);
  c.fillStyle = '#3f9433'; c.fillRect(4, 3, 8, 8); c.fillRect(3, 5, 10, 5);
  c.fillStyle = '#57b84a'; c.fillRect(5, 4, 4, 3); c.fillRect(9, 7, 3, 2);
  c.fillStyle = '#83d95f'; c.fillRect(6, 4, 2, 1); c.fillRect(10, 6, 1, 1);
  c.fillStyle = '#e0483e'; c.fillRect(5, 8, 1, 1); c.fillRect(9, 10, 1, 1); c.fillRect(12, 7, 1, 1); c.fillRect(7, 6, 1, 1);
});
TILES.birdbath = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.30)'; c.fillRect(3, 13, 10, 2);
  c.fillStyle = '#8f959e'; c.fillRect(7, 8, 3, 5); c.fillRect(5, 13, 7, 1);
  c.fillStyle = '#b9bfc7'; c.fillRect(7, 8, 1, 5);
  c.fillStyle = '#6f747c'; c.fillRect(5, 8, 7, 1);
  c.fillStyle = '#cdd3db'; c.fillRect(1, 4, 14, 3); c.fillRect(2, 3, 12, 1);
  c.fillStyle = '#6fb7ef'; c.fillRect(3, 4, 10, 1); c.fillStyle = '#a8dcff'; c.fillRect(4, 4, 4, 1);
  c.fillStyle = '#eef3f8'; c.fillRect(1, 7, 14, 1);
});
TILES.mailbox = tileCanvas(c => {
  c.drawImage(TILES.fenceH, 0, 0);
  c.fillStyle = '#6f4520'; c.fillRect(7, 8, 2, 7); c.fillStyle = '#8a5a30'; c.fillRect(7, 8, 1, 7);
  c.fillStyle = '#3b6fe0'; c.fillRect(4, 3, 9, 5);
  c.fillStyle = '#5b90e8'; c.fillRect(4, 3, 9, 1); c.fillStyle = '#a8dcff'; c.fillRect(5, 4, 3, 1);
  c.fillStyle = '#2a529e'; c.fillRect(4, 7, 9, 1); c.fillRect(11, 3, 2, 5);
  c.fillStyle = '#e0483e'; c.fillRect(12, 0, 1, 3); c.fillRect(11, 0, 2, 1); // flag up
  c.fillStyle = '#20242a'; c.fillRect(5, 5, 1, 1);
});
TILES.crate = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.28)'; c.fillRect(1, 14, 14, 2);
  c.fillStyle = '#a5713d'; c.fillRect(2, 8, 12, 7); c.fillRect(4, 2, 9, 6);
  c.fillStyle = '#c99a5f'; c.fillRect(2, 8, 12, 1); c.fillRect(4, 2, 9, 1);
  c.fillStyle = '#bd8a4f'; c.fillRect(3, 10, 4, 1); c.fillRect(6, 4, 3, 1);
  c.fillStyle = '#6f4520'; c.fillRect(2, 11, 12, 1); c.fillRect(4, 5, 9, 1);
  c.fillRect(3, 9, 1, 5); c.fillRect(12, 9, 1, 5); c.fillRect(5, 3, 1, 4); c.fillRect(11, 3, 1, 4);
});
TILES.can = tileCanvas(c => {
  c.drawImage(TILES.grass, 0, 0);
  c.fillStyle = 'rgba(30,60,25,0.28)'; c.fillRect(4, 13, 9, 2);
  c.fillStyle = '#37b24d'; c.fillRect(5, 8, 7, 5);
  c.fillStyle = '#5cc46a'; c.fillRect(5, 8, 7, 1); c.fillStyle = '#2b8a3e'; c.fillRect(5, 12, 7, 1); c.fillRect(10, 8, 2, 5);
  c.fillRect(3, 10, 2, 1); c.fillRect(12, 9, 3, 1);
  c.fillStyle = '#2b8a3e'; c.fillRect(2, 9, 1, 2); c.fillRect(14, 8, 1, 2);
  c.fillStyle = '#ffd94a'; c.fillRect(8, 10, 1, 1);
});
TILES.fenceBloom = tileCanvas(c => {
  c.drawImage(TILES.fenceH, 0, 0);
  c.fillStyle = '#5f3717'; c.fillRect(0, 14, 16, 2);
  c.fillStyle = '#2f7a24'; c.fillRect(2, 13, 3, 2); c.fillRect(9, 13, 4, 2); c.fillRect(14, 14, 2, 1);
  for (const [x, y, col] of [[1, 12, '#ff6b9d'], [6, 13, '#ffd94a'], [11, 12, '#b07fe8'], [14, 13, '#ffffff']]) {
    c.fillStyle = col; c.fillRect(x, y, 2, 2); c.fillStyle = '#fff3b0'; c.fillRect(x, y, 1, 1);
  }
});
TILES.fenceVine = tileCanvas(c => {
  c.drawImage(TILES.fenceV, 0, 0);
  c.fillStyle = '#2f7a24'; c.fillRect(5, 10, 3, 2); c.fillRect(6, 7, 3, 2); c.fillRect(5, 4, 2, 2); c.fillRect(7, 12, 2, 2);
  c.fillStyle = '#54c95e'; c.fillRect(6, 9, 1, 1); c.fillRect(7, 6, 1, 1); c.fillRect(6, 3, 1, 1);
  c.fillStyle = '#ff6b9d'; c.fillRect(8, 5, 1, 1);
});
/* tree: a 48x56 volumetric canopy, drawn anchored bottom-centre on its
   tile (the trunk's base sits at the tile's bottom-middle). Layers: dark
   silhouette, mid clusters, lit clusters toward the sun (top-left), a
   bright crown, a shaded belly; the trunk tapers into a root flare. */
const TREE = (() => {
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 56;
  const c = cv.getContext('2d');
  const blobs = [
    [24, 20, 15], [12, 26, 10], [36, 26, 10], [17, 12, 10], [31, 12, 10],
    [24, 30, 12], [10, 34, 7], [38, 34, 7], [24, 8, 8],
  ];
  const inside = (x, y, shrink, dx, dy) => blobs.some(([bx, by, r]) => {
    const rr = r - shrink; if (rr <= 0) return false;
    const ddx = x - (bx + dx), ddy = y - (by + dy); return ddx * ddx + ddy * ddy <= rr * rr;
  });
  for (let y = 0; y < 44; y++) for (let x = 0; x < 48; x++) {
    if (!inside(x, y, 0, 0, 0)) continue;
    let col = '#2c6e24'; // silhouette / edge tone
    if (inside(x, y, 2.5, -1, -1)) col = '#3f9433';
    if (inside(x, y, 5, -2, -2)) col = '#57b84a';
    if (inside(x, y, 8.5, -3, -3)) col = '#83d95f';
    if (y > 30 && !inside(x, y + 3, 0, 0, 0)) col = '#24591d'; // shaded belly
    if (col === '#57b84a' && tileHash(x, y, 31) > 0.82) col = '#3f9433'; // leaf-cluster breakup
    if (col === '#3f9433' && tileHash(x, y, 37) > 0.86) col = '#2c6e24';
    if (col === '#83d95f' && tileHash(x, y, 41) > 0.7) col = '#57b84a';
    c.fillStyle = col; c.fillRect(x, y, 1, 1);
  }
  // trunk: shaded right, lit left, root flare at the base
  for (let y = 36; y < 56; y++) {
    const w = y < 50 ? 3 : 3 + Math.floor((y - 49) / 2);
    const x0 = 24 - Math.floor(w / 2);
    c.fillStyle = '#7a4a26'; c.fillRect(x0, y, w, 1);
    c.fillStyle = '#96602f'; c.fillRect(x0, y, 1, 1);
    c.fillStyle = '#54341a'; c.fillRect(x0 + w - 1, y, 1, 1);
  }
  c.fillStyle = '#54341a'; c.fillRect(20, 54, 2, 1); c.fillRect(27, 54, 2, 1);
  return cv;
})();

/* ============================== CHARACTERS ============================== */
/* Art overhaul (Nov 27, 2026): the whole cast is drawn at the GBA
   sample's proportions — adults 16x24, Oma 16x22, the kids 16x19,
   Alvin 20x18 — feet anchored by charSprite via set.w/set.h. */
const SKIN = '#f9c27d', HAIR = '#6d3f18', EYE = '#191c21';
/* k = outline, S/H/B = shaded side of skin/hair/shirt */
const FRANK_PAL = { k: '#282521', G: '#2da53d', g: '#207c2c', L: '#4fd161', s: '#f9c27d', S: '#e5a156', h: '#7d441a', H: '#5d300f', l: '#995a20', e: '#1e1b17', b: '#2774e7', B: '#1951ad', p: '#214492', P: '#183370', o: '#6d3f18', O: '#502b0e', w: '#f8f8f8' };
const FRANK_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kLLGGGGGgk...',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'...kssssssssk...',
'...ksesssesSk...',
'...kssssSSsSk...',
'....khhhhhhk....',
'..khhlhhhhHhhk..',
'..khhhhhhhhhk...',
'...kkhSSShk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'..kkbbbbbbbbkk..',
'..kbkbbbbbbkBk..',
'..ksbkbbbbkBsk..',
'..kSSkbbbbkSSk..',
'....kppppppk....',
'....kppkkPPk....',
'....kppk.kPPk...',
'....kook.koOk...',
], FRANK_PAL);
const FRANK_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kLLGGGGGgk...',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'...kssssssssk...',
'...ksesssesSk...',
'...kssssSSsSk...',
'....khhhhhhk....',
'..khhlhhhhHhhk..',
'..khhhhhhhhhk...',
'...kkhSSShk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'..kkbbbbbbbbkk..',
'..kbkbbbbbbkBk..',
'..ksbkbbbbkBsk..',
'..kSSkbbbbkSSk..',
'....kppppppk....',
'....kppkkPPk....',
'...kppk..kPPk...',
'...koook..kOOk..',
], FRANK_PAL);
const FRANK_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....kGGGGGGk....',
'...kGGGGGGGGk...',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'...khhhhhhhhk...',
'...khhhhhhhhk...',
'...khhhhhhhhk...',
'...khhsssshhk...',
'....kssssssk....',
'.....kbbbk......',
'....kbbbbbbk....',
'..kkbbbbbbbbkk..',
'..kbkbbbbbbkBk..',
'..ksbkbbbbkBsk..',
'..ksskbbbbkssk..',
'....kbbbbbbk....',
'....kbbbbbbk....',
'....kppppppk....',
'....kppkkPPk....',
'....kppk.kPPk...',
'....kook.koOk...',
], FRANK_PAL);
const FRANK_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....kGGGGGGk....',
'...kGGGGGGGGk...',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'...khhhhhhhhk...',
'...khhhhhhhhk...',
'...khhhhhhhhk...',
'...khhsssshhk...',
'....kssssssk....',
'.....kbbbk......',
'....kbbbbbbk....',
'..kkbbbbbbbbkk..',
'..kbkbbbbbbkBk..',
'..ksbkbbbbkBsk..',
'..ksskbbbbkssk..',
'....kbbbbbbk....',
'....kbbbbbbk....',
'....kppppppk....',
'....kppkkPPk....',
'...kppk..kPPk...',
'...koook..kOOk..',
], FRANK_PAL);
const FRANK_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kGGGGGGGGkkk.',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'....kssssssk....',
'....kssssseSk...',
'....kssssSSkk...',
'....khhhhhhhk...',
'...khhhhhhhhhk..',
'...khhhhhhhhhk..',
'....kkhhhhk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'...kbbbbbbbbk...',
'...kbbbbbbBbk...',
'...ksbbbbbbBk...',
'....kbbbbbbk....',
'....kppppppk....',
'....kpppPPPk....',
'.....kppkPPk....',
'.....kookOOk....',
], FRANK_PAL);
const FRANK_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kGGGGGGGGkkk.',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'....kssssssk....',
'....kssssseSk...',
'....kssssSSkk...',
'....khhhhhhhk...',
'...khhhhhhhhhk..',
'...khhhhhhhhhk..',
'....kkhhhhk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'...kbbbbbbbbk...',
'...kbbbbbbBbk...',
'...ksbbbbbbBk...',
'....kbbbbbbk....',
'....kppppppk....',
'....kpppPPPk....',
'....kppk.kPPk...',
'...koook..kOOk..',
], FRANK_PAL);
const FRANK_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kLLGGGGGgk...',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'...kssssssssk...',
'...ksSsssSsSk...',
'...kssssSSsSk...',
'....khhhhhhk....',
'..khhlhhhhHhhk..',
'..khhhhhhhhhk...',
'...kkhSSShk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'..kkbbbbbbbbkk..',
'..kbkbbbbbbkBk..',
'..ksbkbbbbkBsk..',
'..kSSkbbbbkSSk..',
'....kppppppk....',
'....kppkkPPk....',
'....kppk.kPPk...',
'....kook.koOk...',
], FRANK_PAL);
const FRANK_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kLLGGGGGgk...',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'...kssssssssk...',
'...ksesssesSk...',
'...kssssSSsSk...',
'....khhhhhhk....',
'..khhlhhhhHhhk..',
'..khhhOOOhhhk...',
'...kkhSSShk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'..kkbbbbbbbbkk..',
'..kbkbbbbbbkBk..',
'..ksbkbbbbkBsk..',
'..kSSkbbbbkSSk..',
'....kppppppk....',
'....kppkkPPk....',
'....kppk.kPPk...',
'....kook.koOk...',
], FRANK_PAL);
const FRANK_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kGGGGGGGGkkk.',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'....kssssssk....',
'....kssssSsSk...',
'....kssssSSkk...',
'....khhhhhhhk...',
'...khhhhhhhhhk..',
'...khhhhhhhhhk..',
'....kkhhhhk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'...kbbbbbbbbk...',
'...kbbbbbbBbk...',
'...ksbbbbbbBk...',
'....kbbbbbbk....',
'....kppppppk....',
'....kpppPPPk....',
'.....kppkPPk....',
'.....kookOOk....',
], FRANK_PAL);
const FRANK_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....kLLLLLLk....',
'...kGGGGGGGGkkk.',
'...kGGGGGGGGk...',
'...kggggggggk...',
'....kkkkkkkk....',
'....kssssssk....',
'....kssssseSk...',
'....kssssSSkk...',
'....khhhhhhhk...',
'...khhhhhhhhhk..',
'...khhhOOhhhk...',
'....kkhhhhk.....',
'.....kbbbk......',
'....kbbbbbbk....',
'...kbbbbbbbbk...',
'...kbbbbbbBbk...',
'...ksbbbbbbBk...',
'....kbbbbbbk....',
'....kppppppk....',
'....kpppPPPk....',
'.....kppkPPk....',
'.....kookOOk....',
], FRANK_PAL);
const FRANK_SET = { down: [FRANK_DOWN, FRANK_DOWN2], up: [FRANK_UP, FRANK_UP2], side: [FRANK_SIDE, FRANK_SIDE2], blinkDown: FRANK_DOWN_BLINK, blinkSide: FRANK_SIDE_BLINK, talkDown: FRANK_DOWN_TALK, talkSide: FRANK_SIDE_TALK, w: 16, h: 24 };
const CONSTANCE_PAL = { k: '#282521', s: '#f9c27d', S: '#e5a156', h: '#8d5420', H: '#724015', l: '#a76a2d', e: '#1e1b17', d: '#1aa191', D: '#127d6f', L: '#36cbb6', w: '#f8f8f8', o: '#3a2a17', m: '#7c3222' };
const CONSTANCE_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssmmssk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddLLLLddk...',
'..kddkddddkddk..',
'..kddkddddkddk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], CONSTANCE_PAL);
const CONSTANCE_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssmmssk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddLLLLddk...',
'..kddkddddkddk..',
'..kddkddddkddk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'....koo...koo...',
], CONSTANCE_PAL);
const CONSTANCE_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'....khhhhhhk....',
'....kddddddk....',
'...kddLLLLddk...',
'..kddkddddkddk..',
'..kddkddddkddk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], CONSTANCE_PAL);
const CONSTANCE_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'....khhhhhhk....',
'....kddddddk....',
'...kddLLLLddk...',
'..kddkddddkddk..',
'..kddkddddkddk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'....koo...koo...',
], CONSTANCE_PAL);
const CONSTANCE_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhsseshk....',
'...khhsssshk....',
'....khssmmk.....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'.....koo.koo....',
], CONSTANCE_PAL);
const CONSTANCE_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhsseshk....',
'...khhsssshk....',
'....khssmmk.....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo...koo...',
], CONSTANCE_PAL);
const CONSTANCE_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khsSSsshHk...',
'...khsssssshHk..',
'....kssmmssk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddLLLLddk...',
'..kddkddddkddk..',
'..kddkddddkddk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], CONSTANCE_PAL);
const CONSTANCE_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddLLLLddk...',
'..kddkddddkddk..',
'..kddkddddkddk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], CONSTANCE_PAL);
const CONSTANCE_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhssSshk....',
'...khhsssshk....',
'....khssmmk.....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'.....koo.koo....',
], CONSTANCE_PAL);
const CONSTANCE_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhsseshk....',
'...khhsssshk....',
'....khssoosk....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'.....koo.koo....',
], CONSTANCE_PAL);
const CONSTANCE_SET = { down: [CONSTANCE_DOWN, CONSTANCE_DOWN2], up: [CONSTANCE_UP, CONSTANCE_UP2], side: [CONSTANCE_SIDE, CONSTANCE_SIDE2], blinkDown: CONSTANCE_DOWN_BLINK, blinkSide: CONSTANCE_SIDE_BLINK, talkDown: CONSTANCE_DOWN_TALK, talkSide: CONSTANCE_SIDE_TALK, w: 16, h: 24 };
const JEREMIAH_PAL = { k: '#191c21', s: SKIN, S: '#e09e58', h: '#4b2b16', H: '#392009', e: EYE, t: '#2667f5', T: '#1a3fa3', j: '#1d4381', w: '#e8e8e8', o: '#332416', m: '#7c3222' };
const JEREMIAH_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssoossk....',
'....kssssssk....',
'.....ktttk......',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kjjjjjjk....',
'....kjjk.kjjk...',
'....kwwk.kwwk...',
], JEREMIAH_PAL);

const JEREMIAH_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssoossk....',
'....kssssssk....',
'.....ktttk......',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kjjjjjjk....',
'...kjjk..kjjk...',
'...kwwwk..kwwk..',
], JEREMIAH_PAL);

const JEREMIAH_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'....khhhhhhk....',
'....khsssshhk...',
'.....ktttk......',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kjjjjjjk....',
'....kjjk.kjjk...',
'....kwwk.kwwk...',
], JEREMIAH_PAL);

const JEREMIAH_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'....khhhhhhk....',
'....khsssshhk...',
'.....ktttk......',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kjjjjjjk....',
'...kjjk..kjjk...',
'...kwwwk..kwwk..',
], JEREMIAH_PAL);

const JEREMIAH_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssmmk.....',
'....khssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kjjjjjjk....',
'.....kjjkjjk....',
'.....kwwkwwk....',
], JEREMIAH_PAL);

const JEREMIAH_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssmmk.....',
'....khssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kjjjjjjk....',
'....kjjk.kjjk...',
'...kwwwk..kwwk..',
], JEREMIAH_PAL);

const JEREMIAH_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksSsssSsSk...',
'...kssssssSSk...',
'....kssoossk....',
'....kssssssk....',
'.....ktttk......',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kjjjjjjk....',
'....kjjk.kjjk...',
'....kwwk.kwwk...',
], JEREMIAH_PAL);

const JEREMIAH_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssooosk....',
'....kssssssk....',
'.....ktttk......',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kjjjjjjk....',
'....kjjk.kjjk...',
'....kwwk.kwwk...',
], JEREMIAH_PAL);

const JEREMIAH_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhsssSk.....',
'...khhssssk.....',
'....khssmmk.....',
'....khssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kjjjjjjk....',
'.....kjjkjjk....',
'.....kwwkwwk....',
], JEREMIAH_PAL);

const JEREMIAH_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssook.....',
'....khssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kjjjjjjk....',
'.....kjjkjjk....',
'.....kwwkwwk....',
], JEREMIAH_PAL);

const JEREMIAH_SET = { down: [JEREMIAH_DOWN, JEREMIAH_DOWN2], up: [JEREMIAH_UP, JEREMIAH_UP2], side: [JEREMIAH_SIDE, JEREMIAH_SIDE2], blinkDown: JEREMIAH_DOWN_BLINK, blinkSide: JEREMIAH_SIDE_BLINK, talkDown: JEREMIAH_DOWN_TALK, talkSide: JEREMIAH_SIDE_TALK, w: 16, h: 19 };

/* THE PASTOR — an unnamed guest (role only), in for the one evening the
   whole field has been pointing at: the October tasting. A dark suit, and
   the little white tab at his throat that says the rest. */
const PASTOR_PAL = { k: '#191c21', s: SKIN, S: '#e09e58', h: '#574c42', H: '#433c31', e: EYE, t: '#2f333d', T: '#1f2229', j: '#23252c', w: '#f4f1e6', o: '#332416', m: '#7c3222' };
const PASTOR_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....ktwwwwtk....',
'..kkttttttttkk..',
'..ktkttjtttkTk..',
'..ktkttjtttkTk..',
'..kstkttjtkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkTTk....',
'....kjjk.jTTk...',
'....kook.kTok...',
], PASTOR_PAL);

const PASTOR_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....ktwwwwtk....',
'..kkttttttttkk..',
'..ktkttjtttkTk..',
'..ktkttjtttkTk..',
'..kstkttjtkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkTTk....',
'...kjjk..jTTk...',
'...koook..kTOk..',
], PASTOR_PAL);

const PASTOR_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'....khhhhhhk....',
'....khsssshhk...',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkTTk....',
'....kjjk.jTTk...',
'....kook.kTok...',
], PASTOR_PAL);

const PASTOR_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'....khhhhhhk....',
'....khsssshhk...',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkTTk....',
'...kjjk..jTTk...',
'...koook..kTOk..',
], PASTOR_PAL);

const PASTOR_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssmmk.....',
'....khssssk.....',
'.....kksskk.....',
'....ktwwtk......',
'...kttttttk.....',
'...ktttjttTk....',
'...ktttjttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjTTk....',
'.....kjjkTTk....',
'.....kookTOk....',
], PASTOR_PAL);

const PASTOR_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssmmk.....',
'....khssssk.....',
'.....kksskk.....',
'....ktwwtk......',
'...kttttttk.....',
'...ktttjttTk....',
'...ktttjttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjTTk....',
'....kjjk.jTTk...',
'...koook..kTOk..',
], PASTOR_PAL);

const PASTOR_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksSsssSsSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....ktwwwwtk....',
'..kkttttttttkk..',
'..ktkttjtttkTk..',
'..ktkttjtttkTk..',
'..kstkttjtkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkTTk....',
'....kjjk.jTTk...',
'....kook.kTok...',
], PASTOR_PAL);

const PASTOR_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssooosk....',
'....kssssssk....',
'.....kksskk.....',
'....ktwwwwtk....',
'..kkttttttttkk..',
'..ktkttjtttkTk..',
'..ktkttjtttkTk..',
'..kstkttjtkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkTTk....',
'....kjjk.jTTk...',
'....kook.kTok...',
], PASTOR_PAL);

const PASTOR_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhsssSk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssmmk.....',
'....khssssk.....',
'.....kksskk.....',
'....ktwwtk......',
'...kttttttk.....',
'...ktttjttTk....',
'...ktttjttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjTTk....',
'.....kjjkTTk....',
'.....kookTOk....',
], PASTOR_PAL);

const PASTOR_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssook.....',
'....khssssk.....',
'.....kksskk.....',
'....ktwwtk......',
'...kttttttk.....',
'...ktttjttTk....',
'...ktttjttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjTTk....',
'.....kjjkTTk....',
'.....kookTOk....',
], PASTOR_PAL);

const PASTOR_SET = { down: [PASTOR_DOWN, PASTOR_DOWN2], up: [PASTOR_UP, PASTOR_UP2], side: [PASTOR_SIDE, PASTOR_SIDE2], blinkDown: PASTOR_DOWN_BLINK, blinkSide: PASTOR_SIDE_BLINK, talkDown: PASTOR_DOWN_TALK, talkSide: PASTOR_SIDE_TALK, w: 16, h: 24 };
const ZOEY_PAL = { k: '#191c21', s: '#f5c89b', S: '#e09e58', h: '#7d4515', H: '#61330d', e: EYE, d: '#ef5b97', D: '#c63c76', l: '#59416c', w: '#f8f8f8', o: '#332416', m: '#7c3222' };
const ZOEY_DOWN = makeSprite([
'......kDkDk.....',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..kddkddddkddk..',
'..kskddddddksk..',
'...kdddDDdddk...',
'..kdddddDDdddk..',
'..kkkkkkkkkkkk..',
'....klk..klk....',
'....koo..koo....',
], ZOEY_PAL);

const ZOEY_DOWN2 = makeSprite([
'......kDkDk.....',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..kddkddddkddk..',
'..kskddddddksk..',
'...kdddDDdddk...',
'..kdddddDDdddk..',
'..kkkkkkkkkkkk..',
'.....klk.klk....',
'....koo...koo...',
], ZOEY_PAL);

const ZOEY_UP = makeSprite([
'......kDkDk.....',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'....khhhhhhk....',
'....kddddddk....',
'...kddddddddk...',
'..kddkddddkddk..',
'..kskddddddksk..',
'...kdddDDdddk...',
'..kdddddDDdddk..',
'..kkkkkkkkkkkk..',
'....klk..klk....',
'....koo..koo....',
], ZOEY_PAL);

const ZOEY_UP2 = makeSprite([
'......kDkDk.....',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'....khhhhhhk....',
'....kddddddk....',
'...kddddddddk...',
'..kddkddddkddk..',
'..kskddddddksk..',
'...kdddDDdddk...',
'..kdddddDDdddk..',
'..kkkkkkkkkkkk..',
'.....klk.klk....',
'....koo...koo...',
], ZOEY_PAL);

const ZOEY_SIDE = makeSprite([
'.....kDkDk......',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssesk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssHk....',
'....kkssskk.....',
'....kddddk......',
'...kddddddk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'...kdddddDddk...',
'..kkkkkkkkkkkk..',
'.....klk.klk....',
'.....koo.koo....',
], ZOEY_PAL);

const ZOEY_SIDE2 = makeSprite([
'.....kDkDk......',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssesk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssHk....',
'....kkssskk.....',
'....kddddk......',
'...kddddddk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'...kdddddDddk...',
'..kkkkkkkkkkkk..',
'....klk..klk....',
'....koo...koo...',
], ZOEY_PAL);

const ZOEY_DOWN_BLINK = makeSprite([
'......kDkDk.....',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khsSSsshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..kddkddddkddk..',
'..kskddddddksk..',
'...kdddDDdddk...',
'..kdddddDDdddk..',
'..kkkkkkkkkkkk..',
'....klk..klk....',
'....koo..koo....',
], ZOEY_PAL);

const ZOEY_DOWN_TALK = makeSprite([
'......kDkDk.....',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssooosk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..kddkddddkddk..',
'..kskddddddksk..',
'...kdddDDdddk...',
'..kdddddDDdddk..',
'..kkkkkkkkkkkk..',
'....klk..klk....',
'....koo..koo....',
], ZOEY_PAL);

const ZOEY_SIDE_BLINK = makeSprite([
'.....kDkDk......',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhsssSk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssHk....',
'....kkssskk.....',
'....kddddk......',
'...kddddddk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'...kdddddDddk...',
'..kkkkkkkkkkkk..',
'.....klk.klk....',
'.....koo.koo....',
], ZOEY_PAL);

const ZOEY_SIDE_TALK = makeSprite([
'.....kDkDk......',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssesk.....',
'...khhssssk.....',
'....khssook.....',
'...khhssssHk....',
'....kkssskk.....',
'....kddddk......',
'...kddddddk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'...kdddddDddk...',
'..kkkkkkkkkkkk..',
'.....klk.klk....',
'.....koo.koo....',
], ZOEY_PAL);

const ZOEY_SET = { down: [ZOEY_DOWN, ZOEY_DOWN2], up: [ZOEY_UP, ZOEY_UP2], side: [ZOEY_SIDE, ZOEY_SIDE2], blinkDown: ZOEY_DOWN_BLINK, blinkSide: ZOEY_SIDE_BLINK, talkDown: ZOEY_DOWN_TALK, talkSide: ZOEY_SIDE_TALK, w: 16, h: 19 };
const OMA_PAL = { k: '#191c21', s: '#eeb984', S: '#d6944e', h: '#d8d8d8', H: '#a8a8a8', e: EYE, g: '#79a1b6', t: '#7951a9', T: '#57397f', w: '#f7ebce', l: '#45325d', o: '#332416', m: '#7c3222' };
const OMA_DOWN = makeSprite([
'......kkkk......',
'....kkhhhhkk....',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khssssshHk...',
'...khssssssHk...',
'...khgeggeghHk..',
'...khssssshHk...',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttwwttkTk..',
'..kstkwwwwkTsk..',
'....kwwwwwwk....',
'....kttwwttk....',
'...kllllllllk...',
'...kllllllllk...',
'..kllllllllllk..',
'....ksk..ksk....',
'....koo..koo....',
], OMA_PAL);

const OMA_DOWN2 = makeSprite([
'......kkkk......',
'....kkhhhhkk....',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khssssshHk...',
'...khssssssHk...',
'...khgeggeghHk..',
'...khssssshHk...',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttwwttkTk..',
'..kstkwwwwkTsk..',
'....kwwwwwwk....',
'....kttwwttk....',
'...kllllllllk...',
'...kllllllllk...',
'..kllllllllllk..',
'.....ksk.ksk....',
'....koo...koo...',
], OMA_PAL);

const OMA_UP = makeSprite([
'......kkkk......',
'....kkhhhhkk....',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'....khhhhhhk....',
'....khsssshhk...',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'...kllllllllk...',
'...kllllllllk...',
'..kllllllllllk..',
'....ksk..ksk....',
'....koo..koo....',
], OMA_PAL);

const OMA_UP2 = makeSprite([
'......kkkk......',
'....kkhhhhkk....',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'....khhhhhhk....',
'....khsssshhk...',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'...kllllllllk...',
'...kllllllllk...',
'..kllllllllllk..',
'.....ksk.ksk....',
'....koo...koo...',
], OMA_PAL);

const OMA_SIDE = makeSprite([
'....kkkk........',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhgsegk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttwwttTk....',
'...kttwwttTk....',
'....ktwwttTk....',
'....kswwttTk....',
'....kttttTtk....',
'...klllllllTk...',
'...klllllllTk...',
'..kllllllllk....',
'.....ksk.ksk....',
'.....koo.koo....',
], OMA_PAL);

const OMA_SIDE2 = makeSprite([
'....kkkk........',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhgsegk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttwwttTk....',
'...kttwwttTk....',
'....ktwwttTk....',
'....kswwttTk....',
'....kttttTtk....',
'...klllllllTk...',
'...klllllllTk...',
'..kllllllllk....',
'....ksk..ksk....',
'....koo...koo...',
], OMA_PAL);

const OMA_DOWN_BLINK = makeSprite([
'......kkkk......',
'....kkhhhhkk....',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khssssshHk...',
'...khssssssHk...',
'...khgsggsghHk..',
'...khssssshHk...',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttwwttkTk..',
'..kstkwwwwkTsk..',
'....kwwwwwwk....',
'....kttwwttk....',
'...kllllllllk...',
'...kllllllllk...',
'..kllllllllllk..',
'....ksk..ksk....',
'....koo..koo....',
], OMA_PAL);

const OMA_DOWN_TALK = makeSprite([
'......kkkk......',
'....kkhhhhkk....',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khssssshHk...',
'...khssssssHk...',
'...khgeggeghHk..',
'...khssssshHk...',
'....kssooosk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttwwttkTk..',
'..kstkwwwwkTsk..',
'....kwwwwwwk....',
'....kttwwttk....',
'...kllllllllk...',
'...kllllllllk...',
'..kllllllllllk..',
'....ksk..ksk....',
'....koo..koo....',
], OMA_PAL);

const OMA_SIDE_BLINK = makeSprite([
'....kkkk........',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhgssgk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttwwttTk....',
'...kttwwttTk....',
'....ktwwttTk....',
'....kswwttTk....',
'....kttttTtk....',
'...klllllllTk...',
'...klllllllTk...',
'..kllllllllk....',
'.....ksk.ksk....',
'.....koo.koo....',
], OMA_PAL);

const OMA_SIDE_TALK = makeSprite([
'....kkkk........',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhgsegk.....',
'...khhssssk.....',
'....khssook.....',
'...khhssssk.....',
'....kkssskk.....',
'....kttttk......',
'...kttwwttTk....',
'...kttwwttTk....',
'....ktwwttTk....',
'....kswwttTk....',
'....kttttTtk....',
'...klllllllTk...',
'...klllllllTk...',
'..kllllllllk....',
'.....ksk.ksk....',
'.....koo.koo....',
], OMA_PAL);

const OMA_SET = { down: [OMA_DOWN, OMA_DOWN2], up: [OMA_UP, OMA_UP2], side: [OMA_SIDE, OMA_SIDE2], blinkDown: OMA_DOWN_BLINK, blinkSide: OMA_SIDE_BLINK, talkDown: OMA_DOWN_TALK, talkSide: OMA_SIDE_TALK, w: 16, h: 22 };
const MOM_PAL = { k: '#191c21', s: '#f3c396', S: '#e0a064', h: '#8c5327', H: '#70401a', e: EYE, t: '#b57c18', T: '#8e5c10', w: '#f7ebce', l: '#5e4721', o: '#332416', m: '#7c3222' };
const FRIEND_PAL = { k: '#191c21', s: '#e0a064', S: '#bc8036', h: '#272727', H: '#161616', e: '#191c21', t: '#537840', T: '#416233', j: '#373737', o: '#25201b', m: '#7c3222' };
const PASTORWIFE_PAL = { k: '#191c21', s: '#f5c89b', S: '#e09e58', h: '#8b662d', l: '#b28b52', e: '#191c21', m: '#7c3222', d: '#a22b55', D: '#5e213a', L: '#f7ebce', o: '#332416' };
const MOM_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kttttttk....',
'...ktttwwtttk...',
'..kttkttttkttk..',
'..khhtttttthhk..',
'..kskttttttksk..',
'....kttttttk....',
'....ktttTTtk....',
'....kttttttk....',
'....kttttttk....',
'....kttTTttk....',
'....kllllllk....',
'....kllkkolk....',
'....kllk.lolk...',
'....kook.kook...',
], MOM_PAL);

const MOM_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kttttttk....',
'...ktttwwtttk...',
'..kttkttttkttk..',
'..khhtttttthhk..',
'..kskttttttksk..',
'....kttttttk....',
'....ktttTTtk....',
'....kttttttk....',
'....kttttttk....',
'....kttTTttk....',
'....kllllllk....',
'....kllkkolk....',
'...kllk..lolk...',
'...koook..kook..',
], MOM_PAL);

const MOM_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'....khhhhhhk....',
'....kttttttk....',
'...kttttttttk...',
'..kttkttttkttk..',
'..khhtttttthhk..',
'..kskttttttksk..',
'....kttttttk....',
'....ktttTTtk....',
'....kttttttk....',
'....kttttttk....',
'....kttTTttk....',
'....kllllllk....',
'....kllkkolk....',
'....kllk.lolk...',
'....kook.kook...',
], MOM_PAL);

const MOM_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'...khhhhhhhHk...',
'....khhhhhhk....',
'....kttttttk....',
'...kttttttttk...',
'..kttkttttkttk..',
'..khhtttttthhk..',
'..kskttttttksk..',
'....kttttttk....',
'....ktttTTtk....',
'....kttttttk....',
'....kttttttk....',
'....kttTTttk....',
'....kllllllk....',
'....kllkkolk....',
'...kllk..lolk...',
'...koook..kook..',
], MOM_PAL);

const MOM_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssesk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssHk....',
'....kkssskk.....',
'....kttttk......',
'...ktttttttk....',
'...kttttttTk....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kttttTtk....',
'....kttttTtk....',
'...kttttttTk....',
'...kttttTTtk....',
'....kllllllk....',
'....klllollk....',
'.....kllkolk....',
'.....kookook....',
], MOM_PAL);

const MOM_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssesk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssHk....',
'....kkssskk.....',
'....kttttk......',
'...ktttttttk....',
'...kttttttTk....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kttttTtk....',
'....kttttTtk....',
'...kttttttTk....',
'...kttttTTtk....',
'....kllllllk....',
'....klllollk....',
'....kllk.lolk...',
'...koook..kook..',
], MOM_PAL);

const MOM_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khsSSsshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kttttttk....',
'...ktttwwtttk...',
'..kttkttttkttk..',
'..khhtttttthhk..',
'..kskttttttksk..',
'....kttttttk....',
'....ktttTTtk....',
'....kttttttk....',
'....kttttttk....',
'....kttTTttk....',
'....kllllllk....',
'....kllkkolk....',
'....kllk.lolk...',
'....kook.kook...',
], MOM_PAL);

const MOM_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khssssshHk...',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssooosk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kttttttk....',
'...ktttwwtttk...',
'..kttkttttkttk..',
'..khhtttttthhk..',
'..kskttttttksk..',
'....kttttttk....',
'....ktttTTtk....',
'....kttttttk....',
'....kttttttk....',
'....kttTTttk....',
'....kllllllk....',
'....kllkkolk....',
'....kllk.lolk...',
'....kook.kook...',
], MOM_PAL);

const MOM_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhsssSk.....',
'...khhssssk.....',
'....khssmmk.....',
'...khhssssHk....',
'....kkssskk.....',
'....kttttk......',
'...ktttttttk....',
'...kttttttTk....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kttttTtk....',
'....kttttTtk....',
'...kttttttTk....',
'...kttttTTtk....',
'....kllllllk....',
'....klllollk....',
'.....kllkolk....',
'.....kookook....',
], MOM_PAL);

const MOM_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssesk.....',
'...khhssssk.....',
'....khssook.....',
'...khhssssHk....',
'....kkssskk.....',
'....kttttk......',
'...ktttttttk....',
'...kttttttTk....',
'...kttttttTk....',
'....kttttTtk....',
'....ksttttTk....',
'....kttttTtk....',
'....kttttTtk....',
'...kttttttTk....',
'...kttttTTtk....',
'....kllllllk....',
'....klllollk....',
'.....kllkolk....',
'.....kookook....',
], MOM_PAL);
const FRIEND_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkook....',
'....kjjk.jook...',
'....kook.kook...',
], FRIEND_PAL);
const FRIEND_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkook....',
'...kjjk..jook...',
'...koook..kook..',
], FRIEND_PAL);
const FRIEND_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'....khhhhhhk....',
'....khsssshhk...',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkook....',
'....kjjk.jook...',
'....kook.kook...',
], FRIEND_PAL);
const FRIEND_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'....khhhhhhk....',
'....khsssshhk...',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkook....',
'...kjjk..jook...',
'...koook..kook..',
], FRIEND_PAL);
const FRIEND_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssmmk.....',
'....khssssk.....',
'.....kksskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'...kttttttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjook....',
'.....kjjkook....',
'.....kookook....',
], FRIEND_PAL);
const FRIEND_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssmmk.....',
'....khssssk.....',
'.....kksskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'...kttttttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjook....',
'....kjjk.jook...',
'...koook..kook..',
], FRIEND_PAL);
const FRIEND_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksSsssSsSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssoossk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkook....',
'....kjjk.jook...',
'....kook.kook...',
], FRIEND_PAL);
const FRIEND_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhhhhhHHk...',
'...khssssshHk...',
'...ksssssssSk...',
'...ksesssesSk...',
'...kssssssSSk...',
'....kssssssk....',
'....kssooosk....',
'....kssssssk....',
'.....kksskk.....',
'....kttttttk....',
'..kkttttttttkk..',
'..ktkttttttkTk..',
'..ktkttttttkTk..',
'..kstkttttkTsk..',
'....kttttttk....',
'....kttTTttk....',
'....kjjjjjjk....',
'....kjjkkook....',
'....kjjk.jook...',
'....kook.kook...',
], FRIEND_PAL);
const FRIEND_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhsssSk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssmmk.....',
'....khssssk.....',
'.....kksskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'...kttttttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjook....',
'.....kjjkook....',
'.....kookook....',
], FRIEND_PAL);
const FRIEND_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khhhhhhHHk...',
'...khhssssHk....',
'...khhssssk.....',
'...khhssssk.....',
'...khhssesk.....',
'...khhssssk.....',
'....khssssk.....',
'....khssook.....',
'....khssssk.....',
'.....kksskk.....',
'....kttttk......',
'...kttttttk.....',
'...kttttttTk....',
'...kttttttTk....',
'....ksttttTk....',
'....kttttTtk....',
'...kttttTTtk....',
'....kjjjjjjk....',
'....kjjjjook....',
'.....kjjkook....',
'.....kookook....',
], FRIEND_PAL);
const PASTORWIFE_DOWN = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssmmssk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..khhkddddkhhk..',
'..khhkddddkhhk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], PASTORWIFE_PAL);
const PASTORWIFE_DOWN2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssmmssk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..khhkddddkhhk..',
'..khhkddddkhhk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'....koo...koo...',
], PASTORWIFE_PAL);
const PASTORWIFE_UP = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'....khhhhhhk....',
'....kddddddk....',
'...kddddddddk...',
'..khhkddddkhhk..',
'..khhkddddkhhk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], PASTORWIFE_PAL);
const PASTORWIFE_UP2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'...khhhhhhhhHk..',
'....khhhhhhk....',
'....kddddddk....',
'...kddddddddk...',
'..khhkddddkhhk..',
'..khhkddddkhhk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'....koo...koo...',
], PASTORWIFE_PAL);
const PASTORWIFE_SIDE = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhsseshk....',
'...khhsssshk....',
'....khssmmk.....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'.....koo.koo....',
], PASTORWIFE_PAL);
const PASTORWIFE_SIDE2 = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhsseshk....',
'...khhsssshk....',
'....khssmmk.....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo...koo...',
], PASTORWIFE_PAL);
const PASTORWIFE_DOWN_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khsSSsshHk...',
'...khsssssshHk..',
'....kssmmssk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..khhkddddkhhk..',
'..khhkddddkhhk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], PASTORWIFE_PAL);
const PASTORWIFE_DOWN_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khsssssshHk..',
'...khseSeshHk...',
'...khsssssshHk..',
'....kssoossk....',
'...khhsssshhHk..',
'....kksssskk....',
'....kddddddk....',
'...kddddddddk...',
'..khhkddddkhhk..',
'..khhkddddkhhk..',
'..kskddddddksk..',
'....kddddddk....',
'....kdddDDdk....',
'...kdddDDdddk...',
'...kddddDDddk...',
'..kdddddDDdddk..',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'....ksk..ksk....',
'....koo..koo....',
], PASTORWIFE_PAL);
const PASTORWIFE_SIDE_BLINK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhssSshk....',
'...khhsssshk....',
'....khssmmk.....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'.....koo.koo....',
], PASTORWIFE_PAL);
const PASTORWIFE_SIDE_TALK = makeSprite([
'................',
'.....kkkkkk.....',
'....khhhhhhk....',
'...khllllllhk...',
'...khhssssshk...',
'...khhsseshk....',
'...khhsssshk....',
'....khssoosk....',
'...khhsssshk....',
'....kkssskk.....',
'....kddddk......',
'...kddLLddk.....',
'...kdddddDk.....',
'...kdddddDk.....',
'....kddddDdk....',
'....ksddddDk....',
'....kddddDdk....',
'....kddddDdk....',
'...kdddddDddk...',
'...kdddddDddk...',
'..kddddddDDddk..',
'..kkkkkkkkkkkk..',
'.....ksk.ksk....',
'.....koo.koo....',
], PASTORWIFE_PAL);

const MOM_SET = { down: [MOM_DOWN, MOM_DOWN2], up: [MOM_UP, MOM_UP2], side: [MOM_SIDE, MOM_SIDE2], blinkDown: MOM_DOWN_BLINK, blinkSide: MOM_SIDE_BLINK, talkDown: MOM_DOWN_TALK, talkSide: MOM_SIDE_TALK, w: 16, h: 24 };
const FRIEND_SET = { down: [FRIEND_DOWN, FRIEND_DOWN2], up: [FRIEND_UP, FRIEND_UP2], side: [FRIEND_SIDE, FRIEND_SIDE2], blinkDown: FRIEND_DOWN_BLINK, blinkSide: FRIEND_SIDE_BLINK, talkDown: FRIEND_DOWN_TALK, talkSide: FRIEND_SIDE_TALK, w: 16, h: 24 };
const PASTORWIFE_SET = { down: [PASTORWIFE_DOWN, PASTORWIFE_DOWN2], up: [PASTORWIFE_UP, PASTORWIFE_UP2], side: [PASTORWIFE_SIDE, PASTORWIFE_SIDE2], blinkDown: PASTORWIFE_DOWN_BLINK, blinkSide: PASTORWIFE_SIDE_BLINK, talkDown: PASTORWIFE_DOWN_TALK, talkSide: PASTORWIFE_SIDE_TALK, w: 16, h: 24 };
const LILY_PAL = { k: '#191c21', p: '#f38199', P: '#ef5b97', s: '#f5c89b', e: EYE, t: '#768a9d', w: '#353b47' };
const LILY_STROLLER = makeSprite([
'................................',
'................................',
'................................',
'................................',
'.........kkkkkkkkkkkkkk.........',
'.......kkppppppppppppppkk.......',
'.....kkppppppppppppppppppkk.....',
'....kppppppppppppppppppppppk....',
'...kpppPPPssssssssssssPPPpppk...',
'....kppPPPsssssssssssPPPpppk....',
'....kppPPPsssesssesssPPPpppk....',
'....kppPPPsssssssssssPPPpppk....',
'...kpppPPPPPPPPPPPPPPPPPPpppk...',
'....kkkkkkkkkkkkkkkkkkkkkkkk....',
'...kkPPPppppppppppppppppPPPkk...',
'...kkpppppppwwppppwwpppppppkk...',
'...kkppppppppppPPPPppPPPPPPkk...',
'...kkPPPPPPPPPPPPPPPPPPPPPPkk...',
'....kkkkkkkkkkkkkkkkkkkkkkkk....',
'......kttk............kttk......',
'......kttk............kttk......',
'......kkkkkkkkkkkkkkkk..........',
'....kkwwwwkk........kkwwwwkk....',
'....kwwtwwwk........kwwwwtwk....',
'....kwwtwwwk........kwwwwtwk....',
'....kkwwwwkk........kkwwwwkk....',
'.....kkkkkk..........kkkkkk.....',
'................................',
'................................',
'................................',
'................................',
'................................',
], LILY_PAL);


/* Alvin: tan short coat, floppy darker ears, green collar with a tag.
   Side sprite faces right (charSprite flips it for left); the two frames
   wag his tail and stride his legs. */
const ALVIN_PAL = { k: '#282521', t: '#e9a24a', T: '#c4802e', L: '#f8c27c', D: '#8d5420', d: '#724015', m: '#f8dfa6', n: '#1e1b17', g: '#28c143', G: '#1d8d34', y: '#ffd94a' };
const ALVIN_DOWN = makeSprite([
'.....kkkkkkkkkk.....',
'..kkkttttttttttkkk..',
'..kDDkttLLttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDktntttnttkDDk..',
'..kDDkttttttttkDDk..',
'..kddkttmmmmttkddk..',
'...kkttmmnnmmttkk...',
'....kttmmmmmmttk....',
'....ktttmmnnmttk....',
'...kggggggggggggk...',
'...kgggggyyGGGGgk...',
'..kttttttttttttttk..',
'..ktttLLttttttTTTk..',
'..ktttLLttttttTTTk..',
'..kttkttttttttkttk..',
'..kkkk........kkkk..',
], ALVIN_PAL);
const ALVIN_DOWN2 = makeSprite([
'.....kkkkkkkkkk.....',
'.kkkkttttttttttkkkk.',
'.kDDDkttLLttttkDDDk.',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDktntttnttkDDk..',
'..kDDkttttttttkDDk..',
'..kddkttmmmmttkddk..',
'...kkttmmnnmmttkk...',
'....kttmmmmmmttk....',
'....ktttmmnnmttk....',
'...kggggggggggggk...',
'...kggggggyyGGGGk...',
'..kttttttttttttttk..',
'..ktttLLttttttTTTk..',
'..ktttLLttttttTTTk..',
'..kttkttttttttkttk..',
'..kkkk........kkkk..',
], ALVIN_PAL);
const ALVIN_UP = makeSprite([
'.....kkkkkkkkkk.....',
'..kkkttttttttttkkk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'...kkttttttttttkk...',
'....kttttttttttk....',
'....kttttttttttk....',
'...kggggggggggggk...',
'...kGGGGGGGGGGGGk...',
'..kttttttttttttttk..',
'..ktttttttttttTTTk..',
'..ktttttttttttTTTk..',
'..kttkttttttttkttk..',
'..kkkk........kkkk..',
], ALVIN_PAL);
const ALVIN_UP2 = makeSprite([
'.....kkkkkkkkkk.....',
'.kkkkttttttttttkkkk.',
'.kDDDkttLLttttkDDDk.',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'...kkttttttttttkk...',
'....kttttttttttk....',
'....kttttttttttk....',
'...kggggggggggggk...',
'...kGGGGGGGGGGGGk...',
'..kttttttttttttttk..',
'..ktttttttttttTTTk..',
'..ktttttttttttTTTk..',
'..kttktttkktttkttk..',
'..kkkk........kkkk..',
], ALVIN_PAL);
const ALVIN_SIDE = makeSprite([
'....................',
'..............kkkkk.',
'..kk.........kDDtttk',
'..kttk.......kDDtLtk',
'..kttk.......kDDttnk',
'...kk.......kDDtttk.',
'....kkkkk...kDttmmmm',
'..kttttttkkkttmmmmmn',
'.kttttttttttttmmmdk.',
'.ktttttttttttkmmk...',
'.ktttttttttttkggggk.',
'..kttttttttttktytk..',
'..kttttttttttttttk..',
'..ktttttttttttTTTk..',
'...kktttttttttkkk...',
'.....ktk....ktk.....',
'.....ktk....ktk.....',
'.....kkk....kkk.....',
], ALVIN_PAL);
const ALVIN_SIDE2 = makeSprite([
'....................',
'..............kkkkk.',
'...kk........kDDtttk',
'..kttk.......kDDtLtk',
'..kttk.......kDDttnk',
'...kk.......kDDtttk.',
'....kkkkk...kDttmmmm',
'..kttttttkkkttmmmmmn',
'.kttttttttttttmmmdk.',
'.ktttttttttttkmmk...',
'.ktttttttttttkggggk.',
'..kttttttttttktytk..',
'..kttttttttttttttk..',
'..ktttttttttttTTTk..',
'...kktttttttttkkk...',
'....ktk..ktk.ktk....',
'....ktk..ktk..ktk...',
'....kkk...kkk..kkk..',
], ALVIN_PAL);
const ALVIN_SIT_DOWN = makeSprite([
'.....kkkkkkkkkk.....',
'..kkkttttttttttkkk..',
'..kDDkttLLttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDktntttnttkDDk..',
'..kDDkttttttttkDDk..',
'..kddkttmmmmttkddk..',
'...kkttmmnnmmttkk...',
'....kttmmmmmmttk....',
'....ktttmmnnmttk....',
'...kggggggggggggk...',
'...kgggggyyGGGGgk...',
'..kkttttttttttttkk..',
'.kttttttttttttttttk.',
'.kttttLLttttttTTTtk.',
'.kttttttkttkttttttk.',
'..kkkkkkkkkkkkkkkk..',
], ALVIN_PAL);
const ALVIN_SIT_UP = makeSprite([
'.....kkkkkkkkkk.....',
'..kkkttttttttttkkk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'..kDDkttttttttkDDk..',
'...kkttttttttttkk...',
'....kttttttttttk....',
'....kttttttttttk....',
'...kggggggggggggk...',
'...kGGGGGGGGGGGGk...',
'..kkttttttttttttkk..',
'.kttttttttttttttttk.',
'.kttttttttttttTTTTk.',
'.kttttttkttkttttttk.',
'..kkkkkkkkkkkkkkkk..',
], ALVIN_PAL);
const ALVIN_SIT_SIDE = makeSprite([
'..............kkkkk.',
'.............kDDtttk',
'.............kDDtLtk',
'.............kDDttnk',
'............kDDtttk.',
'............kDttmmmm',
'............kttmmmmn',
'............kttmmmdk',
'...........kttmmk...',
'..........ktkggggk..',
'.........ktttttyk...',
'.......kkttttttk....',
'.....ktttttttttk....',
'....ktttttttttttk...',
'...kttttttttttttk...',
'...kttttttttktk.....',
'..kttttttttktk......',
'..kkkkkkkkkkkkk.....',
], ALVIN_PAL);
const ALVIN_SET = { down: [ALVIN_DOWN, ALVIN_DOWN2], up: [ALVIN_UP, ALVIN_UP2], side: [ALVIN_SIDE, ALVIN_SIDE2], sitDown: ALVIN_SIT_DOWN, sitUp: ALVIN_SIT_UP, sitSide: ALVIN_SIT_SIDE, w: 20, h: 18 };
/* small deer for the yard */
const DEER_SMALL = makeSprite([
'................................',
'................................',
'....a.....a.....................',
'...a.a...a.a....................',
'....a.....a.....................',
'....a.....a.....................',
'...kkkkkkkkkk...................',
'..khhhhhhhhhkhmhk...............',
'..khhhwehhhhk...................',
'..khhhhhhhhhk...................',
'..kmmmmmmhhhk...................',
'..eemmmmmmk.....................',
'....khhhhkbbbbbbbbbbbbbbk.......',
'.....khhhhhhhhhhhhhhhhhhhhk.....',
'.....kbbbbbbwwbbbbbbbbbbbbk.....',
'.....kbbbbbbbbbbbbbbbbbbbbktt...',
'.....kbbbbbbbbbbbbwwbbbbbbk.....',
'.....kaaaattttttttttttaaaak.....',
'.....kaaaaaaaaaaaaaaaaaaaak.....',
'......kkkkkkkkkkkkkkkkkkkk......',
'.......kbbak...........kbbak....',
'.......kbbak...........kbbak....',
'.......kbbak...........kbbak....',
'.......kbbak...........kbbak....',
'.......kbbak...........kbbak....',
'.......kbbak...........kbbak....',
'.......kaaak...........kaaak....',
'.......kbbak...........kbbak....',
'.......kkkk............kkkk.....',
'.......kkkk............kkkk.....',
'................................',
'................................',
], { a: '#8d5420', h: '#d6a25e', e: '#191c21', b: '#bd7a38', t: '#eddebb', k: '#191c21', m: '#eddebb', w: '#eddebb' });

/* ============================== POTS (16x16, sit on the bench) ============================== */
/* ============================== POTS (16x16, sit on the bench) ============================== */
/* Terracotta with a lit rim and shaded foot (art overhaul, Nov 27, 2026 —
   ported from the approved sample lab). Stage 0 is the empty pot, 1 the
   sown seeds, 2 the sprout, 3 the seedling. */
function potBaseDraw(c) {
  c.fillStyle = '#e08a52'; c.fillRect(3, 7, 10, 2); // rim, lit
  c.fillStyle = '#c96f3f'; c.fillRect(3, 9, 10, 1);
  c.fillStyle = '#b85c33'; c.fillRect(4, 10, 8, 5);
  c.fillStyle = '#8a3d20'; c.fillRect(10, 10, 2, 5); c.fillRect(4, 14, 8, 1); // shade + foot shadow
  c.fillStyle = '#e8a06a'; c.fillRect(4, 10, 1, 4);
  c.fillStyle = '#4a2c14'; c.fillRect(4, 7, 8, 1); // soil
  c.fillStyle = '#5f3717'; c.fillRect(5, 7, 3, 1);
}
function potLeaves(c, pts, big) {
  for (const [x, y] of pts) {
    c.fillStyle = '#2f7a24'; c.fillRect(x, y + 1, 2, 1);
    c.fillStyle = big ? '#57b84a' : '#3f9433'; c.fillRect(x, y, 2, 1);
    c.fillStyle = '#7ed957'; c.fillRect(x, y, 1, 1);
  }
}
const POT_EMPTY = tileCanvas(c => { potBaseDraw(c); });
const POT_SEED = tileCanvas(c => { potBaseDraw(c); c.fillStyle = '#d9c9a0'; c.fillRect(6, 6, 1, 1); c.fillRect(9, 6, 1, 1); c.fillRect(7, 7, 1, 1); });
const POT_SPROUT = tileCanvas(c => { potBaseDraw(c); c.fillStyle = '#2f7a24'; c.fillRect(7, 3, 1, 4); potLeaves(c, [[5, 2], [8, 1]], false); });
const POT_SEEDLING = tileCanvas(c => { potBaseDraw(c); c.fillStyle = '#2f7a24'; c.fillRect(7, 1, 1, 6); c.fillRect(5, 3, 1, 2); c.fillRect(9, 2, 1, 2); potLeaves(c, [[3, 2], [6, 0], [9, 1], [5, 4], [8, 3]], true); });
const POT_SPRITES = [POT_EMPTY, POT_SEED, POT_SPROUT, POT_SEEDLING];

/* ============================== BATTLE SPRITES ============================== */
/* wild deer, side profile facing left, drawn at 2x on the trial screen:
   wedge neck in body colour with a light throat stripe, arched back,
   two-segment legs, far side shaded. 32x24. */
const DEER_BIG = makeSprite([
'........................a.......................................',
'........................a.aa....................................',
'....................a....aa.....................................',
'.....................a..aa......................................',
'................a....a.aa.......................................',
'................a.....aa........................................',
'.................a...aa.........................................',
'....................aa..........................................',
'..................aaa...........................................',
'........kkkkkkkkkkkkk...........................................',
'.......khhhhhhhhhhhhhhk.........................................',
'......khhhhhhhhhhhhhhhhkkhhhhk..................................',
'......khhhhhhhhhhhhhhhhkkhbbbhk.................................',
'.....khhhhhweehhhhhhhhk.khhhhk..................................',
'.....khhhhheeehhhhhhhk...kk.....................................',
'....khhhhhhhhhhhhhhhk...........................................',
'....khhhhhhbbbbbbbk.............................................',
'...khhhhhhhhhbbbbkkwhhhk........................................',
'...kmmmmmmkhhhhhhkkwhbbbhk......................................',
'..keemmmmmmkhhhhhhkkwhbbbbk.....................................',
'...kmmmmmmkhhhhhhhkwhbbbbbk.....................................',
'....kmmmmkhhhhhhhhkwhbbbbbk.....................................',
'..........khhhhkkwhbbbbbbbBk....................................',
'...............kwhbbbbbbbbbBk...................................',
'...............kwhbbbbbbbbbbBkhhhhhhhhhhhhhhhhhhk...............',
'................kwbbbbbbbbbbbBkbbbbbbbbbbbbbbbbbbhhhhk..........',
'................kwbbbbbbbbbbbbBkbbbbbbbbbbbbbbbbbbbbbbhhhkttk...',
'.................kbbbbbbbbbbbbBkbbbbbbbbbbbbbbbbbbbbbbbbkttk....',
'.................kbbbbbbbbbbwwwbbbbbbbbbbbbbbbbbbbbbbbbkttk.....',
'.................kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbkttk....',
'.................kBBBBBBBBBBBBBBBBBBBBBBBBwwwBBBBBBBBBBBktk.....',
'.................kbbbbbbbbttttttttttttttttttttttbbbbbbbbk.......',
'.................kBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBk.......',
'..................kBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBk........',
'...................kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.........',
'......................kbbbBk...kBBBBk........kBBBBk.kbbhhk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kaaaak...kaaaak........kaaaak.kaaaak......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kkkkk....kkkkk.........kkkkk..kkkkk.......',
'......................kkkkk....kkkkk.........kkkkk..kkkkk.......',
], { a: '#8d5420', h: '#d6a25e', e: '#191c21', b: '#bd7a38', B: '#8d5420', w: '#eddebb', t: '#eddebb', k: '#191c21', m: '#eddebb' });
/* alarmed variant: ear flattened back, white tail flagged high —
   shown once the deer's Pressure runs low (and as an idle ear-flicker) */
const DEER_BIG2 = makeSprite([
'........................a.......................................',
'........................a.aa....................................',
'....................a....aa.....................................',
'.....................a..aa......................................',
'................a....a.aa.......................................',
'................a.....aa........................................',
'.................a...aa.........................................',
'....................aa..........................................',
'..................aaa...........................................',
'........kkkkkkkkkkkkk...........................................',
'.......khhhhhhhhhhhhhhk.........................................',
'......khhhhhhhhhhhhhhhhk........................................',
'......khhhhhhhhhhhhhhhhk........................................',
'.....khhhhhweeehhhhhhhkkhhhhhk..................................',
'.....khhhhheeeehhhhhhk.khbbbhk..................................',
'....khhhhhhhhhhhhhhhk...kkkkk...................................',
'....khhhhhhbbbbbbbk.............................................',
'...khhhhhhhhhbbbbkkwhhhk........................................',
'...kmmmmmmkhhhhhhkkwhbbbhk......................................',
'..keemmmmmmkhhhhhhkkwhbbbbk.....................................',
'...kmmmmmmkhhhhhhhkwhbbbbbk.....................................',
'....kmmmmkhhhhhhhhkwhbbbbbk..............................kttk...',
'..........khhhhkkwhbbbbbbbBk.............................kttk...',
'...............kwhbbbbbbbbbBk............................kttk...',
'...............kwhbbbbbbbbbbBkhhhhhhhhhhhhhhhhhhk........kttk...',
'................kwbbbbbbbbbbbBkbbbbbbbbbbbbbbbbbbhhhhk...kttk...',
'................kwbbbbbbbbbbbbBkbbbbbbbbbbbbbbbbbbbbbbhhhkttk...',
'.................kbbbbbbbbbbbbBkbbbbbbbbbbbbbbbbbbbbbbbbk.......',
'.................kbbbbbbbbbbwwwbbbbbbbbbbbbbbbbbbbbbbbbk........',
'.................kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk.......',
'.................kBBBBBBBBBBBBBBBBBBBBBBBBwwwBBBBBBBBBBBk.......',
'.................kbbbbbbbbttttttttttttttttttttttbbbbbbbbk.......',
'.................kBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBk.......',
'..................kBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBk........',
'...................kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.........',
'......................kbbbBk...kBBBBk........kBBBBk.kbbhhk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kaaaak...kaaaak........kaaaak.kaaaak......',
'......................kbbbBk...kBBBBk........kBBBBk.kbbbBk......',
'......................kkkkk....kkkkk.........kkkkk..kkkkk.......',
'......................kkkkk....kkkkk.........kkkkk..kkkkk.......',
], { a: '#8d5420', h: '#d6a25e', e: '#191c21', b: '#bd7a38', B: '#8d5420', w: '#eddebb', t: '#eddebb', k: '#191c21', m: '#eddebb' });
/* Alvin, big side profile for the trial screen (28x20, drawn at 2x):
   sturdy pit-type build, deep chest, floppy ear, green collar with tag,
   tail up and curved. He faces right, toward the deer. */
const ALVIN_BIG = makeSprite([
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'....kLLLk...............................................',
'....kttttk............................kkkkkkkkkkkk......',
'.....kttttk..........................kdddktttttttttk....',
'......kttttk........................kddddkttttttttk.....',
'......kttttk........................kddddkttttttttk.....',
'.......kttttk......................kdddTdkttttttttk.....',
'.......kttttk......................kdddTdkttttttttk.....',
'........kttttk....................kddddddkteettttttk....',
'........kttttk....................kddddddkteettttttk....',
'.............k........kttttttttttttttkdddktttttttttk....',
'.......kLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLddkdtttttttttk....',
'......kLLLLLLLLLLLLLLLLLLttttttttttttttkdddttttttmmmmk..',
'......kttttttttttttttttttttttttttttttttkddttttttmmmmmnnk',
'......kttttttttttttttttttttttttttttttttkddttttmmmmmmmk..',
'......kttttttttttttttttttttttttttttttttkttttmmmmkkkk....',
'......kttttttttttttttttttttttttttttttttkttttttttttk.....',
'......kttttttttttttttttttttttttttttttttktttttttttk......',
'......ktttttttttttttttttttttttttttttkgggggggk...........',
'......ktttttttttttttttttttttttttttttkgggygggk...........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTttttttttttttttk..........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmk..........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmmmmmk..........',
'.......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmmmk...........',
'........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk............',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kTTTTk..........kTTTTk....kTTTTk....',
'........kmmmmmk.....kmmmmmk.........kmmmmmk....kmmmmmk..',
'........kmmmmmk.....kmmmmmk.........kmmmmmk....kmmmmmk..',
'........kkkkkk......kkkkkk..........kkkkkk.....kkkkkk...',
], ALVIN_PAL);
/* bark frame: head raised, mouth wide open, tongue out */
const ALVIN_BIG_BARK = makeSprite([
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'....kLLLk...............................................',
'....kttttk..............................kdddktttttt.....',
'.....kttttk..........................kdddktttttttttk....',
'......kttttk........................kddddkttttttttk.....',
'......kttttk........................kddddkttttttttk.....',
'.......kttttk......................kdddTdkttttttttk.....',
'.......kttttk......................kdddTdkttttttttk.....',
'........kttttk....................kddddddkteettttttk....',
'........kttttk....................kddddddkteettttttk....',
'.............k........kttttttttttttttkdddktttttttttk....',
'.......kLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLddkdtttttttttk....',
'......kLLLLLLLLLLLLLLLLLLttttttttttttttkdddttttttmmmmk..',
'......kttttttttttttttttttttttttttttttttkddttttttmmmmmnnk',
'......kttttttttttttttttttttttttttttttttkddttttmmmmmmmk..',
'......kttttttttttttttttttttttttttttttttktttmmmkkkk......',
'......kttttttttttttttttttttttttttttttttktttkrrrk........',
'......kttttttttttttttttttttttttttttttttkttttttttk.......',
'......ktttttttttttttttttttttttttttttkgggggggk...........',
'......ktttttttttttttttttttttttttttttkgggygggk...........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTttttttttttttttk..........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmk..........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmmmmmk..........',
'.......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmmmk...........',
'........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk............',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kttttk..........kTTTTk....kttttk....',
'.........kTTTTk.....kTTTTk..........kTTTTk....kTTTTk....',
'........kmmmmmk.....kmmmmmk.........kmmmmmk....kmmmmmk..',
'........kmmmmmk.....kmmmmmk.........kmmmmmk....kmmmmmk..',
'........kkkkkk......kkkkkk..........kkkkkk.....kkkkkk...',
], ALVIN_PAL);
/* lunge frame: body stretched low and forward, front legs reaching,
   hind legs driving, tail streaming behind */
const ALVIN_BIG_LUNGE = makeSprite([
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'........................................................',
'....kLLLk.............................kkkkkkkkkkkk......',
'....kttttk...........................kdddktttttttttk....',
'.....kttttk.........................kddddkttttttttk.....',
'......kttttk........................kddddkttttttttk.....',
'......kttttk.......................kdddTdkttttttttk.....',
'.......kttttk......................kdddTdkttttttttk.....',
'.......kttttkk....................kddddddkteettttttk....',
'........kttttk....................kddddddkteettttttk....',
'........kttttk........kttttttttttttttkdddktttttttttk....',
'.......kLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLddkdtttttttttk....',
'......kLLLLLLLLLLLLLLLLLLttttttttttttttkdddttttttmmmmk..',
'......kttttttttttttttttttttttttttttttttkddttttttmmmmmnnk',
'......kttttttttttttttttttttttttttttttttkddttttmmmmmmmk..',
'......kttttttttttttttttttttttttttttttttkttttmmmmkkkk....',
'......kttttttttttttttttttttttttttttttttkttttttttttk.....',
'......kttttttttttttttttttttttttttttttttktttttttttk......',
'......ktttttttttttttttttttttttttttttkgggggggk...........',
'......ktttttttttttttttttttttttttttttkgggygggk...........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTttttttttttttttk..........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmk..........',
'......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmmmmmk..........',
'.......kTTTTTTTTTTTTTTTTTTTTTTTTTTTTmmmmmmmmk...........',
'........kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk............',
'......kTTTTk.............................kttttk.........',
'......kTTTTk.............................kttttk.........',
'......kTTTTk.............................kttttk.........',
'......kTTTTk.............................kttttk.........',
'......kTTTTk.............................kttttk.........',
'......kTTTTk.............................kttttk.........',
'......kTTTTk.............................kTTTTk.........',
'.........kTTTTk.....kTTTTk..........kTTTTk....kTTTTk....',
'.....kmmmmmk.............................kmmmmmk........',
'.....kmmmmmk.............................kmmmmmk........',
'.....kkkkkk..............................kkkkkk.........',
], ALVIN_PAL);
/* butterflies that wander the yard (ambient, never saved) */
const BUTTERFLY_A = makeSprite([
'w......w',
'ww....ww',
'WwwbbwwW',
'..bbbb..',
'........',
], { w: '#ffb347', W: '#e0892a', b: '#20242a' });
const BUTTERFLY_B = makeSprite([
'........',
'...bb...',
'..bbbb..',
'wwwbbwww',
'WW....WW',
], { w: '#ffb347', W: '#e0892a', b: '#20242a' });
const BUTTERFLY2_A = makeSprite([
'w......w',
'ww....ww',
'WwwbbwwW',
'..bbbb..',
'........',
], { w: '#b07fe8', W: '#8f5cc9', b: '#20242a' });
const BUTTERFLY2_B = makeSprite([
'........',
'...bb...',
'..bbbb..',
'wwwbbwww',
'WW....WW',
], { w: '#b07fe8', W: '#8f5cc9', b: '#20242a' });
/* ============================== MAP: DEERBROOK BACKYARD (24x18) ============================== */
/* l lawn(neighbour) f fenceV v fenceVine H fenceH F fenceBloom G gate T tree U bush
   R roof c chimney W wall i window D door g grass u grass2 o/O/Q flower beds p path
   j stepping stone P porch B bench C compost s/S tilled plot b birdbath M mailbox
   K crates w watering can. Gameplay geometry (house, door, porch, path column,
   bench row, compost, gate, deer tile, spawn clearing) is unchanged from the
   first slice; pass 3 only redressed tiles and added solid yard props (bush,
   birdbath, mailbox, crates) on spots that were already obstacles or corners. */
const MAP = [
'nnnnnnnnnnnnnnnnnnnnnnnn',
'nfRRRRcRRRRRRRRRRRRRRRfn',
'nfWWiWWWWWWWWWWiWWWWWWfn',
'nfEEEEEEEEEDEEEEEEEEEEfn',
'nfOoQgogouoPoouoQgouoofn',
'nfAAogugQggpgugoguYYgofn',
'nfAATggugggpggguggYYogfn',
'nfgugggAAoopgggYYgggTgfn',
'nfoogugggggjgQggguggogfn',
'nvogggougggpgugggggOgufn',
'nfQogggggBBBBBBggggoggfn',
'nfoguYYggggpgggwggggCgfn',
'nfggUggooggpggggAAgggKfn',
'nfgsSsSggggpggugggUgggfn',
'nfgSsSsgoogpggggggooggvn',
'nfuggugggggjggggggguggfn',
'nfbogggggggpggggggggogfn',
'nfFFFFHHHHMGGHHHHHHHHFfn',
];
const MAP_W = 24, MAP_H = 18;
function snowify(img, alpha) {
  try {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(232,240,248,' + alpha + ')'; g.fillRect(0, 0, c.width, c.height);
    return c;
  } catch (e) { return null; }
}
const SNOW_TILES = {};
let SNOW_TREE = null;
function buildSnow() {
  for (const k of ['grass', 'grass2', 'grass3', 'grass4', 'tuft', 'tuftB', 'flower', 'flowerB', 'flower2', 'flower3', 'path', 'pathStone', 'soil', 'bedA', 'bedB', 'fenceBloom', 'can']) if (TILES[k]) SNOW_TILES[k] = snowify(TILES[k], 0.66);
  /* the overhaul's saturated props take a lighter frost dusting, so a
     winter scene holds together (art overhaul, Nov 27, 2026) */
  for (const k of ['bench', 'compost', 'bush', 'crate', 'can', 'mailbox', 'birdbath', 'gate', 'fenceH', 'fenceV', 'fenceVine', 'porch', 'lawn', 'soilSprout']) if (TILES[k] && !SNOW_TILES[k]) SNOW_TILES[k] = snowify(TILES[k], 0.38);
  SNOW_TREE = snowify(TREE, 0.45);
}
const TILEMAP = { n: 'lawn', f: 'fenceV', v: 'fenceVine', H: 'fenceH', F: 'fenceBloom', G: 'gate', R: 'roof', c: 'chimney', W: 'wall', E: 'wallBase', i: 'window', D: 'door', g: 'grass', u: 'grass2', o: 'flower', O: 'flower2', Q: 'flower3', p: 'path', j: 'pathStone', P: 'porch', B: 'bench', C: 'compost', T: 'grass', s: 'soil', S: 'soilSprout', U: 'bush', b: 'birdbath', M: 'mailbox', K: 'crate', w: 'can', A: 'bedA', Y: 'bedB' };
const SOLID = new Set(['n', 'f', 'v', 'H', 'F', 'G', 'R', 'c', 'W', 'E', 'i', 'D', 'B', 'C', 'T', 'U', 'b', 'M', 'K']);
/* Areas: the yard is the first of several maps. Each area has its own rows,
   dimensions, and (optionally) its own solid set; movement, camera and
   rendering all read the current area, so a new place is data, not surgery. */
let area = 'yard';
const HOUSE_MAP = [
  'HHHHHHHHHHHHHHHHHHHH',
  'HaaaaaaaazzkrrkzzzzH',
  'HzzzzzzzzzzzzzzzzzzH',
  'HzzzzzzzzzzzzzzzzzzH',
  'HzzzZzzzzzzzzzzzzzzH',
  'HzzZZZzzzeeeezzzzzzH',
  'HhzzZZzzzeeeezzzzzzH',
  'HzzZZZzzzzzzzzzzzzzH',
  'HzzzzzzzzzzzzzzzzzzH',
  'HzzzzzzzzzzzzzzzzzzH',
  'HzzzzzzzzzzzzzzzzzxH',
  'HzzzzzzzzzzzzzzzzzzH',
  'HHHHHHHHHHDHHHHHHHHH',
];
const HOUSE_SOLID = new Set(['H', 'a', 'r', 'k', 'h', 'e', 'x', 'f']);
const BARNOUT_MAP = [
  'TTpTTTTTTTTTTTTTTTTTTTTTTT',
  'TpgggggggggggggggggggggggT',
  'TpggggggRRRRRRRRggRRRgRRRT',
  'TpggggggWWiWWWiWggWWWgWWWT',
  'TpggggggEEEEEDEEgEDEgEDEET',
  'TpgggggugggggggggggggggggT',
  'TpgggggggggggggggggggggggT',
  'TpgogggggggggggggggggggggT',
  'TpggggggggggggggggsssssggT',
  'TpggbgggggggggggggsssssggT',
  'TppppppppppppgggggsssssggT',
  'TgggggggggggggggggsssssggT',
  'TffffffffffffGfffffffffffT',
  'TssssssssssssssssssssssssT',
  'TssssssssssssssssssssssssT',
  'TssssssssssssssssssssssssT',
  'TssssssssssssssssssssssssT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTT',
];
const BARNIN_MAP = [
  'HHHHHHHHHHHHHHHH',
  'HaaaaaaazzkkzzzH',
  'HzzzzzzzzzzzzzzH',
  'HzzZZzzzzzzzzzzH',
  'HzzZZzzzeeeezzzH',
  'HzzzzzzzeeeezzxH',
  'HzzzzzzzzzzzzzzH',
  'HzzzzzzzzzzzzzzH',
  'HzzjzzzzzzzzzmzH',
  'HzzzzzzzzzzzzzzH',
  'HHHHHHHHHHHHHHHH',
];
const OMA_MAP = [
  'HHHHHHHHHHHH',
  'HaaaaazzzzkH',
  'HzzzzzzzzzzH',
  'HzzZZzzzzzzH',
  'HzzZZzzzeeeH',
  'HzzzzzzzzzzH',
  'HmmzzzzzzzzH',
  'HHHHHHDHHHHH',
];
const GREEN_MAP = [
  'HHHHHHHHHHHH',
  'HaaaaaaaaaaH',
  'HzzzzzzzzzzH',
  'HzzzzzzzzzhH',
  'HzzzzzzzzzzH',
  /* The centre aisle (x=6, under the door): the south bench once ran
     wall to wall, and the stove room beyond it could be reached only
     by being placed there — a hand player at the door could never
     reach the stove, and a traveled morning at the stove could never
     leave. Found by the area-transition audit, Nov 27, 2026. */
  'HaaaaazaaaaH',
  'HzzzzzzzzzzH',
  'HzzzzzzzzzzH',
  'HHHHHHDHHHHH',
];
/* 'x' (the stairs) is deliberately NOT solid here: the barn's stairs
   tile is its exit (EXITS.barnIn), and a solid exit tile can never be
   stood on — which soft-locked the barn interior until Nov 26, 2026
   (the stairs' facing dialogue was flavour-only and transported no
   one). Only barnIn has an 'x' among these areas; the town house
   keeps its own solid set, stairs included, since its stairs are
   flavour and lead nowhere. */
const IN_SOLID = new Set(['H', 'a', 'r', 'k', 'h', 'e', 'm', 'f', 'j']);
const AREAS = {
  yard: { rows: MAP, w: MAP_W, h: MAP_H, name: TEXT.areas.deerbrook },
  house: { rows: HOUSE_MAP, w: 20, h: 13, name: TEXT.areas.theHouse, solid: HOUSE_SOLID },
  barnOut: { rows: BARNOUT_MAP, w: 26, h: 18, name: TEXT.areas.berryhill },
  barnIn: { rows: BARNIN_MAP, w: 16, h: 11, name: TEXT.areas.theBarnUpstairs, solid: IN_SOLID },
  oma: { rows: OMA_MAP, w: 12, h: 8, name: TEXT.areas.theDownstairs, solid: IN_SOLID },
  green: { rows: GREEN_MAP, w: 12, h: 9, name: TEXT.areas.theGreenhouse, solid: IN_SOLID },
};
let AW = MAP_W, AH = MAP_H;
let npcList = []; // runtime NPCs in the current area: {id,tx,ty,dir,set,name}
function curArea() { return AREAS[area]; }
function mapChar(x, y) { const a = curArea(); if (x < 0 || y < 0 || x >= a.w || y >= a.h) return 'f'; return a.rows[y][x]; }
function isSolid(x, y) {
  const a = curArea();
  if ((a.solid || SOLID).has(mapChar(x, y))) return true;
  // Two interiors DRAW props onto floor tiles; a drawing Frank can
  // walk through is a lie (Daniel, Nov 26, 2026: he walked under the
  // moving boxes in the town house). Solid exactly while drawn:
  const s = G.save, w = s && s.world;
  if (!w) return false;
  if (area === 'house' && w.ch === 2 && w.step >= 5 && (w.flags.trips || 0) < 3 && y === 10 && x >= 15 && x <= 17) return true; // the moving boxes
  if (area === 'barnIn' && s.wine && s.wine.jar && x === 9 && y === 2) return true; // the fermenting jar on the counter
  return false;
}
function setArea(name, tx, ty) {
  area = name; const a = curArea(); AW = a.w; AH = a.h;
  if (name === 'oma' && G.save && G.save.world.flags.alvinDown) { alvin.tx = 3; alvin.ty = 5; syncPixels(alvin); }
  if (name === 'barnOut') { constance.tx = 11; constance.ty = 6; }
  if (name === 'yard') { constance.tx = 13; constance.ty = 5; }
  G.save.world.area = name;
  player.tx = tx; player.ty = ty; syncPixels(player);
  alvin.tx = tx; alvin.ty = Math.min(AH - 1, ty + 1); syncPixels(alvin);
  alvinTarget = null;
  layoutNPCs();
  saveGame();
  onEnterArea(name);
}
function onEnterArea(name) {
  const s = G.save; if (!s) return;
  const w = s.world;
  if (name === 'barnOut' && w.ch === 3 && w.step === 1 && !w.flags.visited) {
    w.flags.visited = true; w.step = 2; saveGame();
    say(TEXT.berry.thePlaceOutsideBerryhill);
  }
}
function exitsFor(a) { return EXITS[a] ? EXITS[a]() : []; }
const EXITS = { // area -> () => [{x,y,to,tx,ty}] (state-dependent)
  house: () => [{ x: 10, y: 12, to: 'yard', tx: 10, ty: 5 }],
  barnOut: () => {
    /* The road home arrives INSIDE the yard gate at (11,16) — the mirror of
       the trip out. (It once arrived at (11,1): a roof tile, solid on all
       four sides — stepping off the road walled Frank into the roof and
       the autosave kept him there. Found by the area-transition audit.) */
    const ex = [{ x: 2, y: 0, to: 'yard', tx: 11, ty: 16 }];
    if (G.save.world.ch >= 3 && (G.save.world.flags.buildStep || 0) >= 3) ex.push({ x: 20, y: 11, to: 'green', tx: 6, ty: 7 });
    return ex;
  },
  barnIn: () => [G.save.world.flags.stairsBuilt ? { x: 14, y: 5, to: 'oma', tx: 10, ty: 5 } : { x: 14, y: 5, to: 'barnOut', tx: 13, ty: 5 }],
  oma: () => {
    const ex = [{ x: 6, y: 7, to: 'barnOut', tx: 18, ty: 5 }];
    if (G.save.world.flags.stairsBuilt) ex.push({ x: 10, y: 6, to: 'barnIn', tx: 14, ty: 6 });
    return ex;
  },
  green: () => [{ x: 6, y: 8, to: 'barnOut', tx: 20, ty: 11 }],
};
/* Interior doors are DELIBERATE (Daniel's playtest, Nov 26, 2026): every
   interior entry drops Frank one tile from the exit, so a brushed door
   tile was a constant accidental exit — worst in the Chapter 2 house.
   Inside these areas, stepping on the exit tile only shows the way;
   pressing A on it is the way out. Outdoor roads still exit on the step. */
const DELIBERATE_EXITS = new Set(['house', 'barnIn', 'oma', 'green']);
/* NPCs: simple folk, placed by chapter and step. Sets are palettes for the
   little figure drawer; Constance uses her real sprite set. */
const NPC_SETS = {
  jeremiah: { skin: '#e8b98a', hair: '#4a2f1d', top: '#3b6fe0', legs: '#2a4a7f', h: 15 },
  zoey: { skin: '#f0c8a0', hair: '#7a4a21', top: '#e06a9a', legs: '#e06a9a', h: 12 },
  oma: { skin: '#eec39b', hair: '#d8d8d8', top: '#7a5aa0', legs: '#4a3a5e', h: 13 },
  friend: { skin: '#d9a06b', hair: '#2a2a2a', top: '#5a7a4a', legs: '#3a3a3a', h: 15 },
  pastor: { skin: '#e8b98a', hair: '#5a5148', top: '#3a3f4a', legs: '#2a2d33', h: 15 },
  pastorwife: { skin: '#f0c8a0', hair: '#8a6a3a', top: '#a03a5e', legs: '#5e2a3f', h: 14 },
  mom: { skin: '#eec39b', hair: '#9a8a7a', top: '#b07f2a', legs: '#5e4a2a', h: 14 },
};
function npcsFor(a) {
  const s = G.save, w = s.world, list = [];
  if (!s || w.ch < 2) return list;
  // Winter staging (Daniel, Nov 26, 2026): the season skip was
  // season-blind — the children, and the baby in her stroller, stood
  // in the yard in deep snow as if it were summer. In winter the
  // children are IN the house; nobody parks a baby in the snow.
  const winterNow = seasonOf(s.day).idx === 3;
  if (a === 'yard' && w.ch === 2) {
    if (!winterNow) {
      if (w.step >= 1) list.push({ id: 'jeremiah', tx: 14, ty: 12, dir: 'left', set: 'jeremiah', name: 'JEREMIAH' });
      if (w.step >= 2) {
        list.push({ id: 'zoey', tx: 6, ty: 13, dir: 'down', set: 'zoey', name: 'ZOEY' });
        list.push({ id: 'lily', tx: 12, ty: 6, dir: 'down', set: 'lily', name: 'LILY' });
      }
    }
  }
  if (w.ch === 8 && w.flags.momDay === s.day && a === 'barnOut') list.push({ id: 'mom', tx: 10, ty: 6, dir: 'down', set: 'mom', name: 'MOM' });
  if (w.ch >= 5) {
    if (a === 'oma') list.push({ id: 'oma', tx: 5, ty: 4, dir: 'down', set: 'oma', name: 'OMA' });
    if (a === 'barnOut' && hashDay(s.day) % 3 === 0 && !winterNow) list.push({ id: 'oma', tx: 16, ty: 6, dir: 'down', set: 'oma', name: 'OMA' });
    if (a === 'barnIn' && w.ch === 5) list.push({ id: 'constance', tx: 4, ty: 3, dir: 'down', set: 'constance', name: 'CONSTANCE' });
    if (a === 'barnIn' && w.ch === 10 && w.step === 5) { // the tasting: the pastor at the table, Constance beside Frank — as the book has it
      list.push({ id: 'pastor', tx: 7, ty: 4, dir: 'right', set: 'pastor', name: 'PASTOR' });
      list.push({ id: 'constance', tx: 12, ty: 4, dir: 'left', set: 'constance', name: 'CONSTANCE' });
    }
  }
  if (w.ch === 3) {
    if (a === 'barnOut' && !winterNow) {
      list.push({ id: 'zoey', tx: 5, ty: 9, dir: 'down', set: 'zoey', name: 'ZOEY' });
      list.push({ id: 'lily', tx: 6, ty: 9, dir: 'down', set: 'lily', name: 'LILY' });
    }
    if (a === 'barnIn') {
      list.push({ id: 'constance', tx: 4, ty: 3, dir: 'down', set: 'constance', name: 'CONSTANCE' });
      if (w.step === 7) list.push({ id: 'jeremiah', tx: 9, ty: 3, dir: 'down', set: 'jeremiah', name: 'JEREMIAH' });
      if (winterNow) { // the children keep to the barn office in the cold
        list.push({ id: 'zoey', tx: 6, ty: 3, dir: 'down', set: 'zoey', name: 'ZOEY' });
        list.push({ id: 'lily', tx: 8, ty: 3, dir: 'down', set: 'lily', name: 'LILY' });
      }
    }
    if (a === 'green' && w.step >= 8) list.push({ id: 'jeremiah', tx: 5, ty: 4, dir: 'down', set: 'jeremiah', name: 'JEREMIAH' });
  }
  if (a === 'house' && w.ch === 2) {
    list.push({ id: 'constance', tx: 5, ty: 4, dir: 'down', set: 'constance', name: 'CONSTANCE' });
    if (w.step === 1) list.push({ id: 'jeremiah', tx: 8, ty: 3, dir: 'down', set: 'jeremiah', name: 'JEREMIAH' });
    if (w.flags.omaVisit) list.push({ id: 'oma', tx: 11, ty: 4, dir: 'down', set: 'oma', name: 'OMA' });
    if (winterNow) { // the children, in from the snow — the stroller by their mother
      if (w.step >= 2) {
        list.push({ id: 'jeremiah', tx: 8, ty: 3, dir: 'down', set: 'jeremiah', name: 'JEREMIAH' });
        list.push({ id: 'zoey', tx: 10, ty: 3, dir: 'down', set: 'zoey', name: 'ZOEY' });
        list.push({ id: 'lily', tx: 13, ty: 3, dir: 'down', set: 'lily', name: 'LILY' });
      }
    }
  }
  return list;
}
function drawNPCFigure(n, sx, sy, talking) {
  if (n.set === 'constance') { charSprite({ px: sx + camX, py: sy + camY, dir: n.dir || 'down', moving: false, blinkOff: 1.9, talk: talking }, CONSTANCE_SET); return; }
  if (n.set === 'lily') { // the stroller, with its supervisor aboard
    ctx.fillStyle = 'rgba(20,26,20,0.25)';
    ctx.fillRect(sx + 2, sy + 13, 12, 2); ctx.fillRect(sx + 3, sy + 15, 10, 1);
    ctx.drawImage(LILY_STROLLER, sx, sy, 16, 16);
    return;
  }
  const NPC_SPRITE_SETS = { jeremiah: [JEREMIAH_SET, 0.7], zoey: [ZOEY_SET, 1.3], oma: [OMA_SET, 2.2], mom: [MOM_SET, 0.4], pastor: [PASTOR_SET, 1.6], friend: [FRIEND_SET, 1.0], pastorwife: [PASTORWIFE_SET, 2.6] };
  const npcSet = NPC_SPRITE_SETS[n.set];
  if (npcSet) { charSprite({ px: sx + camX, py: sy + camY, dir: n.dir || 'down', moving: false, blinkOff: npcSet[1], talk: talking }, npcSet[0]); return; }
  const P = NPC_SETS[n.set] || NPC_SETS.jeremiah;
  const bob = 0;
  ctx.fillStyle = P.legs; ctx.fillRect(sx + 5, sy + P.h - 4 + bob, 2, 4); ctx.fillRect(sx + 9, sy + P.h - 4 + bob, 2, 4);
  ctx.fillStyle = P.top; ctx.fillRect(sx + 4, sy + 6 + bob, 8, P.h - 9);
  ctx.fillStyle = P.skin; ctx.fillRect(sx + 5, sy + 1 + bob, 6, 5);
  ctx.fillStyle = P.hair; ctx.fillRect(sx + 5, sy + bob, 6, 2);
  if (n.set === 'oma') { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(sx + 7, sy - 2 + bob, 3, 2); } // the bun
  if (talking && Math.floor(perfNow * 7) % 2 === 0) { ctx.fillStyle = '#7a3b2e'; ctx.fillRect(sx + 7, sy + 4 + bob, 2, 1); }
}

function npcTalk(npc) {
  const s = G.save, w = s.world;
  if (npc.id === 'constance') {
    if (w.ch === 10 && w.step === 5) {
      return say(TEXT.talk.constanceAPastorA);
    }
    const lines = TEXT.talk.constanceTheHouseIs;
    return say(lines[s.day % lines.length]);
  }
  if (npc.id === 'jeremiah') {
    if (w.ch === 2 && w.step === 1 && !w.flags.carried) {
      w.flags.carried = true; saveGame();
      return say(TEXT.talk.jeremiahICanCarry);
    }
    if (w.jeremiahDay !== s.day) {
      const target = s.plants.find(p => !p.memorial && p.stage >= 1 && !p.watered);
      if (target) {
        return say(TEXT.talk.jeremiahIsAroundAsk, which => {
          if (which === 0) { w.jeremiahDay = s.day; waterPlant(target); say(F(TEXT.talk.jeremiahWatersNameCarefully, { name: target.name })); }
        }, TEXT.talk.askHim);
      }
    }
    const lines = TEXT.talk.jeremiahIHelpWith;
    return say(lines[s.day % lines.length]);
  }
  if (npc.id === 'zoey') {
    const lines = TEXT.talk.zoeyIHaveRanked;
    return say(lines[s.day % lines.length]);
  }
  if (npc.id === 'lily') {
    const lines = TEXT.talk.lilySupervisesFromThe;
    return say(lines[s.day % lines.length]);
  }
  if (npc.id === 'mom') {
    if (w.ch === 8 && w.step === 1 && !w.flags.momDone) {
      const n = (w.flags.sortCount || 0) + 1;
      if (n >= 10) {
        w.flags.momDone = true; w.step = 2; saveGame();
        return say(TEXT.talk.theTenthPlantShe);
      }
      w.flags.sortCount = n; saveGame();
      const kinds = TEXT.talk.aVolunteerTomatoAll;
      return say(F(TEXT.talk.plantNOf10, { n: n, v: kinds[(n - 1) % kinds.length] }), which => {
        say((which === 0 ? TEXT.talk.momKeptGoodHalf : TEXT.talk.momPulledGoodThe));
      }, TEXT.talk.keepIt);
    }
    return say(TEXT.talk.momTheFieldLooks);
  }
  if (npc.id === 'oma') {
    if (w.ch === 2) return say(TEXT.talk.omaIBroughtMy);
    if (w.ch === 5 && w.step === 4 && !s.promise) {
      return say(TEXT.talk.omaFrankSitNo, () => { s.promise = true; saveGame(); completeChapter(5); });
    }
    if (w.ch === 9 && w.step === 0 && !w.flags.forsythiaReady) {
      w.flags.forsythiaReady = true; saveGame();
      return say(TEXT.talk.omaTheForsythiaFrank);
    }
    if (w.ch === 8 && w.step === 4 && !w.flags.butterflyReady) {
      w.flags.butterflyReady = true; saveGame();
      return say(TEXT.talk.omaTheButterflyBush);
    }
    // a small request, once a day: water a named plant she has been watching
    if (w.omaReqDay !== s.day) {
      const target = s.plants.find(p => !p.memorial && p.stage >= 1 && !p.watered && p.name === (w.flags.omaReq || ''));
      if (target && target.watered) { /* unreachable guard */ }
      if (w.flags.omaReq) {
        const p = s.plants.find(q => q.name === w.flags.omaReq);
        if (p && p.watered) {
          w.omaReqDay = s.day; w.flags.omaReq = null; s.goodDirt++; saveGame();
          return say([F(TEXT.talk.omaYouWateredName, { name: p.name }), TEXT.talk.omaHereFromYour]);
        }
      }
      const dry = s.plants.filter(p => !p.memorial && p.stage >= 1 && !p.watered);
      if (dry.length && !w.flags.omaReq) {
        const pick = dry[s.day % dry.length];
        w.flags.omaReq = pick.name; saveGame();
        return say([F(TEXT.talk.omaNameIsThirsty, { name: pick.name }), TEXT.talk.omaWaterItAnd]);
      }
    }
    if (w.ch >= 5 && !w.flags.opaHeard) {
      w.flags.opaHeard = true; saveGame();
      return say(TEXT.faith.opaExchange); // Opa, in memory: the thread's most delicate beat
    }
    const stories = [TEXT.talk.omaYourOpaKept, TEXT.talk.omaWhenTheAdmiral, TEXT.talk.omaAskMeAbout, TEXT.faith.omaTightMonth];
    return say(stories[s.day % stories.length]);
  }
  if (npc.id === 'pastor') {
    return say(TEXT.talk.pastorIHaveHeard);
  }
  say(TEXT.talk.line);
}

function areaInteract(f) {
  if (area === 'house') return houseInteract(f);
  if (area === 'barnOut') return barnInteract(f);
  if (area === 'barnIn') return barnInInteract(f);
  if (area === 'oma') return omaInteract(f);
  if (area === 'green') return greenInteract(f);
}
const BERRY_CONSTANCE = TEXT.berry.constance;
function barnInteract(f) {
  const s = G.save, w = s.world, ch = mapChar(f.x, f.y);
  if (f.x === constance.tx && f.y === constance.ty) {
    constance.dir = ({ up: 'down', down: 'up', left: 'right', right: 'left' })[player.dir];
    return say(BERRY_CONSTANCE[s.day % BERRY_CONSTANCE.length]);
  }
  if (f.x === 13 && f.y === 4) { // the barn door
    if (w.ch === 7) {
      return say(TEXT.barn.theBarnDoorInside, which => {
        if (which === 0) say(TEXT.barn.whereDoesAlvinWatch, watch => {
          w.watchRow = ['NURSERY', 'ROW1', 'ROWS', null][watch];
          saveGame();
          say((watch === 3 ? TEXT.barn.noWatchTonightThe : F(TEXT.barn.alvinTakesTheWatch, { watch: TEXT.barn.nursery[watch] })), () => { fading = 'dawn'; fade = 1; setTimeout(dawn, 350); });
        }, TEXT.barn.theNursery);
        if (which === 1) { setArea('barnIn', 14, 6); }
      }, TEXT.barn.rest);
    }
    return say(TEXT.barn.theBarnDoorHome, which => {
      if (which === 0) restDay();
      else if (which === 1) setArea('barnIn', 14, 6);
    }, TEXT.barn.rest);
  }
  if (f.x === 18 && f.y === 4) { // the downstairs door
    return say(TEXT.barn.theDownstairsDoorIt, which => { if (which === 0) setArea('oma', 6, 6); }, TEXT.barn.goIn);
  }
  if (f.x === 22 && f.y === 4) {
    if (w.ch === 4 && w.step === 3 && !w.flags.fenceNotes) {
      w.flags.fenceNotes = true; saveGame();
      return say(TEXT.barn.theFenceProblemAs);
    }
    if (w.ch === 4 && w.step === 2) {
      w.step = 3; saveGame();
      return say([...TEXT.barn.aLetterFromThe, TEXT.faith.ordinanceClause]); // some no's are also answers
    }
    return say(TEXT.barn.theGoodShedSound);
  }
  if (f.x === 13 && f.y === 12) { // the field gate
    if (w.ch >= 4) {
      if (player.ty >= 13) {
        const offerClimbBack = () => say(TEXT.barn.backToTheYard, which => { if (which === 0) { player.tx = 13; player.ty = 11; syncPixels(player); alvin.tx = 13; alvin.ty = 12; syncPixels(alvin); } }, TEXT.barn.climbBack);
        /* The gate is the field's only way out, so its two special
           dialogues must never seal it (area-transition audit, Nov 27,
           2026): the planting dialogue fires only when the planting can
           actually happen — the same condition the canonical run plants
           on — and until then the gate is a gate, so the field work the
           list names (tarp, fence, mulch) can be done and LEFT from;
           and the frost watch, once its business is done, hands Frank
           the climb-back offer itself instead of leaving him inside. */
        if (w.ch === 6 && w.step === 5 && plantingGate().length === 0) return say(TEXT.barn.thePlantingGateThe, which => { if (which === 0) doPlanting(); if (which === 1) say([TEXT.barn.theListAsThe, ...(plantingGate().length ? plantingGate().map(m => '— ' + m) : TEXT.barn.nothingItIsTime)]); }, TEXT.barn.plantingDay);
        if (w.ch === 9 && w.step === 2) {
          const rowsWithPlants = [1, 2, 3, 4, 5, 6, 7].filter(rn => rowHasBushes(rn));
          if (rowsWithPlants.length) {
            const opts = rowsWithPlants.map(rn => F(TEXT.barn.watchRowRn, { rn: rn }));
            return say(F(TEXT.barn.theFrostWatchOne, { v: (w.flags.watchTonight ? F(TEXT.barn.rowWatchtonight, { watchTonight: w.flags.watchTonight }) : "UNSET") }), which => {
              if (which < rowsWithPlants.length) { w.flags.watchTonight = rowsWithPlants[which]; saveGame(); say(F(TEXT.barn.rowWhichTonightAlvin, { which: rowsWithPlants[which] }), () => offerClimbBack()); }
              else offerClimbBack();
            }, [...opts, TEXT.barn.leaveItUnset]);
          }
        }
        return offerClimbBack();
      }
      return say(TEXT.barn.theFieldGateIt, which => { if (which === 0) { player.tx = 13; player.ty = 13; syncPixels(player); alvin.tx = 13; alvin.ty = 12; syncPixels(alvin); if (w.ch === 4 && w.step === 0) stakeField(); } }, TEXT.barn.enterTheField);
    }
    return say(TEXT.barn.theFieldGateFirst);
  }
  if (w.ch === 5 && w.step >= 1 && !w.flags.patchCleared && f.x >= 23 && f.x <= 24 && f.y >= 6 && f.y <= 7) return patchInteract();
  if (w.ch === 8 && (w.step || 0) >= 2 && !w.flags.proudBurned && f.x === 24 && f.y === 11) return proudWeedInteract();
  if (w.ch >= 8 && f.x === 4 && f.y === 10) return burnPileInteract();
  if (w.ch >= 8 && (w.step || 0) >= 3 && !w.flags.strawDone && ((f.x === 4 || f.x === 5) && f.y === 5)) return strawberryInteract();
  if (w.ch >= 8 && w.flags.butterflyReady && !w.flags.butterflyPlanted && f.x === 19 && f.y === 5) return butterflyPlant();
  if (w.ch === 9 && w.step === 0 && w.flags.forsythiaReady && !w.flags.forsythiaPlanted && f.x === 17 && f.y === 5) return forsythiaPlant();
  if (w.ch === 11 && w.flags.proudShoot && f.x === 24 && f.y === 11) {
    return say(TEXT.barn.theProudWeedS, which => {
      w.flags.proudShoot = false; w.flags.proudChoice = (which === 0 ? TEXT.barn.pulled : TEXT.barn.letStand); saveGame();
      say((which === 0 ? TEXT.barn.pulledWithANod : TEXT.barn.letStandThenThe));
    }, TEXT.barn.pullIt);
  }
  if (w.ch >= 6 && f.y === 12) return fenceInteract(f);
  if (w.ch >= 6 && f.y >= 13) return fieldInteract(f);
  if (w.ch >= 4 && (f.x === 6 || f.x === 7) && f.y === 5) return irisInteract();
  if (f.x >= 18 && f.x <= 22 && f.y >= 8 && f.y <= 11) { // the greenhouse site
    if (w.ch === 3 && w.step === 6 && (w.flags.buildStep || 0) < 3) {
      if (w.flags.buildDay === s.day) return say(TEXT.barn.enoughBuildingForOne);
      const stage = TEXT.barn.theFrame[(w.flags.buildStep || 0)];
      return say(F(TEXT.barn.theGreenhouseSiteStaked, { stage: stage }), which => { if (which === 0) buildGreenhouse(); }, [F(TEXT.barn.buildStage, { stage: stage }), TEXT.register.notYet]);
    }
    if ((w.flags.buildStep || 0) >= 3) return say(TEXT.barn.theGreenhouseGlassAnd);
    return say(TEXT.barn.aLevelPatchOf);
  }
  if (ch === 'T') return say(TEXT.barn.thePineLineThe);
  if (ch === 'b') return say(TEXT.barn.aBirdbathInheritedWith);
  return say(TEXT.barn.berryhillTheNameIs);
}
function buildGreenhouse() {
  const s = G.save, w = s.world;
  w.flags.buildDay = s.day;
  w.flags.buildStep = (w.flags.buildStep || 0) + 1;
  saveGame();
  if (w.flags.buildStep === 1) return say(TEXT.barn.dayOneTheFrame);
  if (w.flags.buildStep === 2) return say(TEXT.barn.dayTwoTheShell);
  s.field.heater = true; w.step = 7; layoutNPCs();
  return say(TEXT.barn.dayThreeTheHeater);
}
function barnInInteract(f) {
  const s = G.save, w = s.world, ch = mapChar(f.x, f.y);
  if (ch === 'j') return openRegister(); // the journal lives on the office desk now, as well as the porch
  if (ch === 'a') {
    if (f.x === 1) { // the shelf end: carrying and watering live here
      if (w.ch === 3 && w.step === 7 && s.plants.some(p => p.location === 'OFFICE' && !p.memorial)) {
        return say(TEXT.barnIn.theOfficeShelfFull, which => {
          if (which === 0) carryPlants();
          else if (which === 1) waterLocation('OFFICE');
        }, TEXT.barnIn.carryALoadTo);
      }
      return say(TEXT.barnIn.theOfficeShelfThe, which => { if (which === 0) waterLocation('OFFICE'); }, TEXT.barnIn.waterTheShelf);
    }
    if (f.x >= 2 && f.x <= 7) {
      const p = sixPlants().find(q => q.location === 'OFFICE' && q.slot === f.x - 2);
      if (p) return potInteract(p);
      return say(TEXT.barnIn.anEmptySpotOn);
    }
  }
  if (ch === 'x') { // the stairs: down to the yard door, or — once built — to Oma's
    if (w.ch === 5 && w.step === 0 && !w.flags.stairsBuilt) {
      if (w.flags.stairsDay != null && w.flags.stairsDay < s.day) { w.flags.stairsBuilt = true; saveGame(); return say(TEXT.barnIn.theStairsAreDone); }
      if (w.flags.stairsDay === s.day) return say(TEXT.barnIn.theStairsAreHalf);
      return say(TEXT.barnIn.theStairProjectA, which => { if (which === 0) { w.flags.stairsDay = s.day; saveGame(); say(TEXT.barnIn.workBeginsSawdustLevels); } }, TEXT.barnIn.buildTheStairs);
    }
    return say(TEXT.barnIn.theStairsUpAnd);
  }
  if (ch === 'k' && w.ch === 11 && !s.wine.jar && s.wine.poundsByYear[seasonOf(s.day).year]) {
    return say(F(TEXT.barnIn.theBarnKitchenIn, { toFixedVal: (s.wine.poundsByYear[seasonOf(s.day).year] || 0).toFixed(1), length: s.wine.batches.length }), which => {
      startBatchTwo([0.3, 0.55, 0.65, 0.8, 1.0][which]);
    }, TEXT.barnIn.aSpoon030);
  }
  if (ch === 'k' && w.ch === 10 && w.step === 0 && !s.wine.jar) {
    return say(TEXT.barnIn.theBarnKitchenA, which => { if (which === 0) startBatchOne(); }, TEXT.barnIn.startBatchOne);
  }
  if (ch === 'k' && w.ch === 10 && w.step === 3 && !s.wine.jar) {
    const pts = Math.max(10, Math.round((s.wine.poundsByYear[seasonOf(s.day).year] || 0) * 2));
    return say(F(TEXT.barnIn.batchTwoTheField, { pts: pts }), which => {
      const ratios = [0.1, 0.3, 0.55, 0.65, 0.8, 1.0, 1.35];
      startBatchTwo(ratios[which]);
    }, TEXT.barnIn.aDash010);
  }
  if (ch === 'k' && s.wine.jar) {
    const j = s.wine.jar;
    if (j.phase === 'done') return say(F(TEXT.barnIn.batchBatchDoneAnd, { batch: j.batch, verdict: j.verdict }), which => { if (which === 0) bottleJar(); }, TEXT.barnIn.bottleIt);
    if (j.phase === 'open') return say(F(TEXT.barnIn.theJarOpenAnd, { days: j.days, v: (j.swishDay === s.day ? j.swishes : 0) }), which => { if (which === 0) swishJar(); }, TEXT.barnIn.swishIt);
    return say(F(TEXT.barnIn.theJarSealedDay, { days: j.days, v: (j.batch === 1 ? 14 : 28), v2: (j.sealCheckDay ? F(TEXT.barnIn.vDaySAgo, { v: s.day - j.sealCheckDay }) : "NEVER") }), which => { if (which === 0) sealCheck(); }, TEXT.barnIn.topUpTheSeal);
  }
  if (ch === 'k' && w.ch === 6 && w.flags.pipeFound && !s.field.pipe) {
    return say(TEXT.barnIn.amongTheBarnS, which => { if (which === 0) turnValve(); }, TEXT.barnIn.turnIt);
  }
  if (ch === 'e' && w.ch === 10 && w.step === 5) return tasting();
  if (ch === 'e' && w.ch === 11) return say(TEXT.barnIn.theTableTheYear, which => { if (which === 0) shareStand(); }, TEXT.barnIn.shareTheSurplus);
  if (ch === 'e') return say(TEXT.barnIn.theTableItMade);
  if (ch === 'k') return say(TEXT.barnIn.theCounterTheKettle);
  if (ch === 'm') return say(TEXT.barnIn.theBedMovingHouse);
  return say(TEXT.barnIn.upstairsInTheBarn);
}
function waterLocation(loc) {
  let n = 0;
  const s = G.save;
  if (loc === 'GREENHOUSE' && s.world.ch === 6 && s.world.step <= 3) s.world.flags.mitWaterDay = s.day;
  for (const p of s.plants) if (!p.memorial && !p.gone && p.location === loc && p.stage >= 1 && !p.watered) { waterPlant(p); n++; }
  if (s.company && !s.company.gone && s.company.n > 0 && s.company.loc === loc && !s.company.watered) { s.company.watered = true; if (s.company.health === 3) s.company.lastRescue = s.day; n++; }
  if (s.nursery && s.nursery.stock > 0 && loc === 'GREENHOUSE' && !s.nursery.watered) { s.nursery.watered = true; n++; }
  saveGame();
  say((n ? F(TEXT.carry.wateredAllOfThem, { n: n }) : TEXT.carry.everyoneHereIsAlready));
}
function carryPlants() {
  const s = G.save, w = s.world;
  const load = s.plants.filter(p => p.location === 'OFFICE' && !p.memorial).slice(0, 6);
  if (!load.length) return;
  for (const p of load) { p.location = 'GREENHOUSE'; p.slot = null; }
  saveGame();
  const left = s.plants.filter(p => p.location === 'OFFICE' && !p.memorial).length;
  if (!left) {
    if (s.company && s.company.loc === 'OFFICE') s.company.loc = 'GREENHOUSE'; // the Company rides over with the loads
    w.step = 8; layoutNPCs();
    return say([...TEXT.carry.theLastLoadGoes, TEXT.faith.movingHands]);
  }
  say([F(TEXT.carry.aLoadGoesOver, { joinVal: load.map(p => p.name).join(", ") }), F(TEXT.carry.leftStillWaitOn, { left: left })]);
}
function greenInteract(f) {
  const s = G.save, w = s.world, ch = mapChar(f.x, f.y);
  if (ch === 'H' && w.ch === 5 && !s.field.protoWire) {
    return say(TEXT.greenhouse.theGlassAndA, which => { if (which === 0) { s.field.protoWire = true; saveGame(); say(TEXT.greenhouse.theWirePrototypeA); } }, TEXT.greenhouse.fitTheWire);
  }
  if (ch === 'h') {
    if (w.ch >= 6) {
      return say(F(TEXT.greenhouse.theStoveAndAbove, { v: (s.field.vent ? TEXT.greenhouse.open : TEXT.greenhouse.shut) }), which => {
        if (which === 0) { if (!w.flags.heaterLit) { w.flags.heaterLit = true; saveGame(); say(TEXT.greenhouse.litTheStoveSettles); } else say(TEXT.greenhouse.theStoveTicksWith); }
        if (which === 1) { s.field.vent = !s.field.vent; saveGame(); say((s.field.vent ? TEXT.greenhouse.theVentCreaksOpen : TEXT.greenhouse.theVentComesDown)); }
      }, [(w.flags.heaterLit ? TEXT.greenhouse.stoveLit : TEXT.greenhouse.lightTheStove), (s.field.vent ? TEXT.greenhouse.closeTheVent : TEXT.greenhouse.openTheVent), TEXT.greenhouse.leaveIt]);
    }
    if (w.flags.heaterLit) return say(TEXT.greenhouse.theStoveTicksWith_2);
    return say(TEXT.greenhouse.theLittleStoveCold, which => { if (which === 0) { w.flags.heaterLit = true; saveGame(); say(TEXT.greenhouse.litTheStoveSettles); } }, TEXT.greenhouse.lightTheStove_2);
  }
  if (ch === 'a') {
    if (w.ch === 11 && s.tray.ready) {
      return say(F(TEXT.greenhouse.theTrayStratifiedThrough, { n: s.tray.n }), which => { if (which === 0) potUpLT(); }, TEXT.greenhouse.potThemUp);
    }
    if (w.ch === 6 && w.step === 4 && w.flags.repotReady) return repot();
    if (w.ch === 6 && w.step <= 3) {
      const comp = s.company && !s.company.gone && s.company.n > 0 && s.company.loc === 'GREENHOUSE' ? s.company : null;
      const choices = comp ? [TEXT.greenhouse.waterThemAll[0], TEXT.greenhouse.waterThemAll[1], TEXT.greenhouse.feedTheCompany, TEXT.greenhouse.waterThemAll[2]] : TEXT.greenhouse.waterThemAll;
      return say(TEXT.greenhouse.theBenchesEveryLeaf, which => {
        if (which === 0) waterLocation('GREENHOUSE');
        if (which === 1) {
          const weak = s.plants.filter(p => !p.memorial && !p.gone && p.location === 'GREENHOUSE').sort((a, b) => b.health - a.health)[0];
          if (!weak) return say(TEXT.greenhouse.noOneHereTo);
          if (s.goodDirt <= 0) return say(F(TEXT.greenhouse.nameIsTheWeakest, { name: weak.name }));
          feedDirt(weak); say(F(TEXT.greenhouse.goodDirtForName, { name: weak.name }));
        }
        if (which === 2 && comp) {
          if (s.goodDirt <= 0) return say(TEXT.greenhouse.noOneHereTo);
          s.goodDirt--; comp.dirtFed = true; if (comp.health > 0) comp.health--; w.flags.mitDirtDay = s.day; saveGame();
          say(TEXT.greenhouse.goodDirtForTheCompany);
        }
      }, choices);
    }
    return say(TEXT.greenhouse.theBenchesEveryPlant, which => { if (which === 0) waterLocation('GREENHOUSE'); }, TEXT.greenhouse.waterTheBenches);
  }
  return say(TEXT.greenhouse.theGreenhouseItSmells);
}
function omaInteract(f) {
  const s = G.save, w = s.world, ch = mapChar(f.x, f.y);
  if (w.flags.alvinDown && f.x === alvin.tx && f.y === alvin.ty) {
    return say(TEXT.oma.alvinDownstairsOccupyingThe, () => { w.flags.alvinDown = false; saveGame(); });
  }
  if (ch === 'a' && f.x === 2) return say(TEXT.oma.thePhotographOnOma);
  if (ch === 'a') return say(TEXT.oma.omaSShelfEverything);
  if (ch === 'm') return say(TEXT.oma.theBedMadeWith);
  if (ch === 'e') return say(TEXT.oma.aSmallTableFor);
  return say(TEXT.oma.theDownstairsItsOwn);
}
function chooseLoadOrder(order) {
  const s = G.save;
  s.world.flags.loadOrder = order; s.world.step = 5;
  if (order === 'plants') {
    for (const p of s.plants) if (!p.memorial && (p.location === 'BENCH' || p.location === 'WINDOW')) p.location = 'OFFICE';
    if (s.company) s.company.loc = 'OFFICE';
    s.world.flags.plantsMoved = true; saveGame();
    say(TEXT.carry.thePlantsRideFirst);
  } else {
    saveGame();
    say(TEXT.carry.theFurnitureRidesFirst);
  }
}
function stakeField() {
  const s = G.save, w = s.world;
  w.flags.staked = true; w.step = 1; saveGame();
  say(TEXT.field.stakingDayTwelveRows);
}
function irisInteract() {
  const s = G.save, w = s.world;
  const irises = s.plants.filter(p => p.location === 'GARDEN' && p.variety === 'IRIS');
  if (!irises.length) {
    const made = [];
    for (let i = 0; i < 3; i++) {
      const p = freshPlant(allocName(s.plants), { variety: 'IRIS', stage: 4, location: 'GARDEN', gardenState: 'NEW', sownDay: 1, history: TEXT.plants.inheritedWithThePlace });
      s.plants.push(p); made.push(p.name);
      if (!s.dex.garden.includes('IRIS')) s.dex.garden.push('IRIS');
    }
    if (w.ch === 4 && w.step === 1) w.step = 2;
    saveGame();
    return say([TEXT.iris.irisesInheritedWithThe, F(TEXT.iris.frankNamesThemOn, { joinVal: made.join(", ") }), TEXT.iris.theyGoInThe, ...TEXT.faith.irisGlory]);
  }
  const dry = irises.filter(p => !p.watered);
  if (dry.length) return say(TEXT.iris.theIrisesADrink, which => { if (which === 0) { dry.forEach(waterPlant); say(TEXT.iris.wateredTheIrisesStand); } }, TEXT.iris.waterThem);
  return say(TEXT.iris.theIrisesWateredAnd);
}
function patchInteract() {
  const s = G.save, w = s.world;
  // "OMA IS COMING. MAKE READY." (step 1) is the patch work beginning:
  // starting it is what moves the chapter to CLEAR THE PATCH (step 2).
  // Until Nov 27, 2026 nothing in the game made this step turn — the
  // patch only answered at step 2, and no road led there.
  if (w.ch === 5 && (w.step || 0) < 2) { w.step = 2; saveGame(); }
  if (!w.flags.patchWeeds) {
    w.flags.patchWeeds = true; w.flags.patchPulls = 0; saveGame();
    return say(TEXT.patch.behindTheGoodShed);
  }
  if ((w.flags.patchPulls || 0) < 8) {
    w.flags.patchPulls++; saveGame();
    if (w.flags.patchPulls >= 8) return say(TEXT.patch.theLastWeedComes);
    return say(F(TEXT.patch.weedPatchpullsOf8, { patchPulls: w.flags.patchPulls }));
  }
  if (!s.field.protoNet) {
    s.field.protoNet = true; saveGame();
    return say(TEXT.patch.theNettingPrototypeA);
  }
  const planted = s.plants.filter(p => !p.gone && p.location === 'GARDEN' && p.variety === TEXT.plants.blackberry);
  if (planted.length < 2) {
    const p = freshPlant(allocName(s.plants), { variety: 'BLACKBERRY', stage: 3, location: 'GARDEN', gardenState: 'NEW', sownDay: s.day, history: TEXT.plants.rescuedFromThePatch });
    s.plants.push(p);
    if (!s.dex.garden.includes(TEXT.plants.blackberry)) s.dex.garden.push(TEXT.plants.blackberry);
    if (planted.length === 1) { w.step = 3; }
    saveGame();
    return say(F(TEXT.patch.plantedInRealGround, { name: p.name, v: (planted.length === 1 ? "" : TEXT.patch.oneMoreCaneWaits) }));
  }
  return say(TEXT.patch.theBlackberriesNettedNamed);
}
function ch5Dawn(ev) {
  const s = G.save, w = s.world;
  // some mornings, Alvin is simply downstairs
  if (w.ch === 5 && w.step >= 1 && hashDay(s.day) % 3 === 1 && !w.flags.alvinDown) w.flags.alvinDown = true;
  if (w.step === 0 && w.flags.stairsDay != null && w.flags.stairsDay < s.day && !w.flags.stairsBuilt) { w.flags.stairsBuilt = true; saveGame(); }
  if (w.step === 0 && w.flags.stairsBuilt) { w.step = 1; return TEXT.dawns.theStairsAreDone; }
  if (w.step === 3 && !w.flags.patchTrialDone) {
    w.flags.patchTrialDone = true;
    const bb = s.plants.filter(p => !p.memorial && !p.gone && p.location === 'GARDEN' && p.variety === TEXT.plants.blackberry);
    startTrial({ foe: 'WEEDS', kind: 'weedsPatch', pressure: 35, vigor: 26, plantsList: bb.length ? bb : sixPlants(), msg: TEXT.trials.thePatchFightsBack });
    return null;
  }
  if (w.step === 3 && w.flags.patchTrialDone && w.flags.patchWeedsBack) {
    w.flags.patchWeedsBack = false;
    const bb = s.plants.filter(p => !p.memorial && !p.gone && p.location === 'GARDEN' && p.variety === TEXT.plants.blackberry);
    startTrial({ foe: 'WEEDS', kind: 'weedsPatch', pressure: 35, vigor: 26, plantsList: bb.length ? bb : sixPlants(), msg: TEXT.trials.theWeedsReturnAs });
    return null;
  }
  return null;
}
TRIAL_OUTCOMES.weedsPatch = {
  win(t) {
    const w = G.save.world; w.step = 4; saveGame();
    say(TEXT.trials.thePatchSettlesThe);
  },
  lose(t, fled) {
    const s = G.save, w = s.world;
    if (fled) { say(TEXT.trials.alvinBacksOffThe); return; }
    for (const p of t.plantsList || []) if (!p.memorial) { p.stage = Math.max(2, p.stage - 1); if (p.health < 3) p.health++; }
    w.flags.patchWeedsBack = true; w.flags.patchTrialDone = false;
    saveGame();
    say(TEXT.trials.thePatchWinsThe);
  },
};
function fenceInteract(f) {
  const s = G.save, w = s.world;
  const seg = Math.min(3, Math.floor((f.x - 1) / 6));
  const built = s.field.fenceSeg.filter(Boolean).length;
  if (player.ty >= 13 && s.field.pipe) {
    return say(TEXT.fence.theFenceLineAnd, which => {
      if (which === 0) { if (projUse()) { for (const r of s.cropRows) r.watered = true; for (const p of s.plants) if (!p.memorial && p.location.startsWith('ROW')) waterPlant(p); say(TEXT.fence.theValveTurnsSomewhere); } }
      if (which === 1) fenceSegDialogue(seg, built);
    }, TEXT.fence.openTheValveAll);
  }
  return fenceSegDialogue(seg, built);
}
function fenceSegDialogue(seg, built) {
  const s = G.save, w = s.world;
  if (s.field.fenceSeg[seg]) {
    if (s.field.pipe && !s.field.fenceIrr[seg]) return say(F(TEXT.fence.segmentSeg1Stands, { seg: seg }), which => { if (which === 0 && projUse()) { s.field.fenceIrr[seg] = 1; s.field.irrigation = s.field.fenceIrr.filter(Boolean).length; saveGame(); say(TEXT.fence.lineRunTheFence); } }, TEXT.fence.runTheLine);
    return say(F(TEXT.fence.segmentSeg1Of, { seg: seg }));
  }
  const free = built === 0 && s.field.protoNet && s.field.protoWire;
  return say(F(TEXT.fence.fenceSegmentSeg1, { seg: seg, v: (free ? TEXT.fence.theTwoPrototypesNet : TEXT.fence.postsWireAndA) }), which => { if (which === 0) buildFenceSeg(seg); }, TEXT.fence.buildIt);
}
function buildFenceSeg(seg) {
  const s = G.save;
  if (s.field.fenceSeg[seg]) return;
  const built = s.field.fenceSeg.filter(Boolean).length;
  const free = built === 0 && s.field.protoNet && s.field.protoWire;
  if (!free && !projUse()) return;
  s.field.fenceSeg[seg] = 1; s.field.fence = s.field.fenceSeg.filter(Boolean).length; saveGame();
  say(F(TEXT.fence.segmentSeg1Stands_2, { seg: seg, fence: s.field.fence }));
}
function digPipe() {
  const s = G.save, w = s.world;
  if (!projUse()) return;
  w.flags.pipeFound = true; saveGame();
  say(TEXT.pipe.fourFeetDownA);
}
function turnValve() {
  const s = G.save, w = s.world;
  w.flags.valveWrong = (w.flags.valveWrong || 0) + 1;
  if (w.flags.valveWrong < 2) return say(TEXT.pipe.somewhereATapSings);
  s.field.pipe = true; saveGame();
  say(TEXT.pipe.constanceArrivingWithA);
}
function orderMulch() {
  const s = G.save, w = s.world;
  w.flags.mulchComing = s.day + 1; saveGame();
  say(TEXT.tarp.orderedItWillArrive);
}
function layTarp(bi) {
  const s = G.save, w = s.world;
  if (!projUse()) return;
  s.field.tarp[bi] = (w.flags.tarpPlaced || 0) >= 4 && !w.flags.tarpTorn ? 4 : 1;
  if (s.field.tarp[bi] === 4) { w.flags.tarpTorn = true; say(TEXT.tarp.theTarpTearsOn); }
  else say(TEXT.tarp.tarpDownTheDark);
  w.flags.tarpPlaced = (w.flags.tarpPlaced || 0) + 1; s.field.tarpDay[bi] = s.day; saveGame();
}
function patchTarp(bi) {
  const s = G.save;
  if (!projUse()) return;
  s.field.tarp[bi] = 1; s.field.tarpDay[bi] = s.day; saveGame();
  say(TEXT.tarp.patchedTheDarkResumes);
}
function moveTarp(bi) {
  const s = G.save;
  if (!projUse()) return;
  s.field.tarp[bi] = 3; saveGame();
  say(F(TEXT.tarp.tarpMovedAndFolded, { bi: bi, length: s.field.tarp.filter(t => t === 3).length }));
}
/* VERTICAL ROWS (Nov 28, 2026): the field's twelve rows run north–south.
   Row rn's crop column is x = 2*rn-1; the lane to its east, x = 2*rn, is
   the walking strip between this row and the next — and the strip where
   weed patches grow. A row's bushes stand down its column, four to a
   column, then spill into the lane. */
function rowCropX(rn) { return 2 * rn - 1; }
function rowLaneX(rn) { return 2 * rn; }
function fieldRowAt(x, y) { if (y < 13 || y > 16 || x < 1 || x > 24) return 0; return Math.ceil(x / 2); }
function rowBushPos(rn, idx) { const col = idx < 4 ? rowCropX(rn) : rowLaneX(rn); return { x: col, y: 13 + (idx % 4) }; }
function fieldInteract(f) {
  const s = G.save, w = s.world;
  if (w.ch === 6 && w.step < 5) return say(TEXT.field.theFieldWaitingOn);
  if ((f.x === 23 || f.x === 24) && f.y === 16) { // the bad shed corner: dig here
    if (s.field.pipe) return say(TEXT.field.theOldBuriedLine);
    if (!w.flags.pipeFound) {
      return say(TEXT.field.theBadShedS, which => { if (which === 0) digPipe(); }, TEXT.field.dig);
    }
    return say(TEXT.field.thePipeIsFound);
  }
  if (f.x === 1 && f.y === 13) { // the mulch pile
    if (!w.flags.mulchComing && s.field.mulch < 3) return say(TEXT.field.theMulchPileIs, which => { if (which === 0) orderMulch(); }, TEXT.field.arrangeADelivery);
    return say(F(TEXT.field.theMulchPileMulch, { mulch: s.field.mulch }));
  }
  const fw0 = weedAt(f.x, f.y, 'field'); // a weed patch in the lane ahead: pull it
  if (fw0) return pullWeed(fw0);
  const uw0 = weedAt(player.tx, player.ty, 'field'); // or one under Frank's own boots
  if (uw0) return pullWeed(uw0);
  const bands = [[1, 5], [6, 10], [11, 15], [16, 19], [20, 24]];
  const bi = bands.findIndex(([a, b]) => f.x >= a && f.x <= b);
  const rn = fieldRowAt(f.x, f.y) || 1; // the row this tile belongs to (1..12) — rows run vertically
  const row = s.cropRows[rn - 1];
  const inRow = s.plants.filter(p => !p.memorial && !p.gone && p.row === rn);
  const sec = Math.floor((rn - 1) / 2), lv = s.field.weedLv[sec] || 0;
  if (inRow.length || (row.bushCount || 0) > 0) {
    const opts = [];
    if ((w.ch === 10 && w.step === 2) || (w.ch === 11 && seasonOf(s.day).idx === 1)) opts.push(TEXT.field.harvestTheRow);
    if (w.ch >= 10 && seasonOf(s.day).idx === 3) opts.push(TEXT.field.pruneTheRow);
    if (lv > 0) opts.push(F(TEXT.field.pullTheWeedsLevel, { lv: lv }));
    opts.push(TEXT.field.waterTheRow);
    if (!row.mulched) opts.push(TEXT.field.mulchIt3Carts);
    else if (s.compost >= 9 && row.yieldRating < 3) opts.push(TEXT.field.feedTheRow9);
    opts.push(TEXT.greenhouse.leaveIt);
    return say(inRow.length ? F(TEXT.field.rowRnLengthBushes, { rn: rn, length: inRow.length + (row.bushCount || 0), v: (row.mulched ? "MULCHED. " : "UNMULCHED. "), v2: (lv > 0 ? F(TEXT.field.weedsAtLevelLv, { lv: lv }) : TEXT.field.theSectionIsClean), joinVal: inRow.map(p => p.name).slice(0, 4).join(", "), v3: (inRow.length > 4 ? TEXT.field.line : "") }) : F(TEXT.field.rowCountHead, { rn: rn, n: row.bushCount || 0, v: (row.mulched ? " MULCHED." : " UNMULCHED."), v2: (lv > 0 ? F(TEXT.field.weedsAtLevelLv, { lv: lv }) : TEXT.field.theSectionIsClean) }), which => {
      const pick = opts[which];
      if (pick === TEXT.field.harvestTheRow) harvestRow(rn);
      else if (pick === TEXT.field.pruneTheRow) pruneRow(rn);
      else if (pick && pick.startsWith('PULL')) pullWeeds(sec);
      else if (pick === TEXT.field.waterTheRow) { inRow.forEach(waterPlant); row.watered = true; if (w.ch === 9 && w.step <= 2) { (w.flags.blossomWatered = w.flags.blossomWatered || {})[rn] = true; } saveGame(); say(F(TEXT.field.rowRnWateredBush, { rn: rn })); }
      else if (pick === TEXT.field.mulchIt3Carts) mulchRow(rn);
      else if (pick === TEXT.field.feedTheRow9) feedRow(rn);
    }, opts);
  }
  const st = s.field.tarp[bi] || 0;
  if (st === 0) return say(F(TEXT.field.tarpSectionBi1, { bi: bi }), which => { if (which === 0) layTarp(bi); }, TEXT.field.layTheTarp);
  if (st === 4) return say(TEXT.field.theTornSectionA, which => { if (which === 0) patchTarp(bi); }, TEXT.field.patchIt);
  if (st === 1) return say(F(TEXT.field.theTarpCooksDay, { minVal: Math.min(4, s.day - (s.field.tarpDay[bi] || s.day)) }));
  if (st === 2) return say(TEXT.field.cookedThroughWhatLives, which => { if (which === 0) moveTarp(bi); }, TEXT.field.moveTheTarp);
  // clear ground: the row work that remains
  if (lv > 0) return say(F(TEXT.field.emptyGroundRowRn, { rn: rn, lv: lv }), which => { if (which === 0) pullWeeds(sec); }, TEXT.field.pullTheWeeds);
  if (w.ch === 11 && !inRow.length && !(row.bushCount > 0)) {
    if (s.nursery && s.nursery.stock > 0 && s.nursery.stage >= 3) return say(F(TEXT.field.emptyGroundRowRn_2, { rn: rn, length: s.nursery.stock }), which => { if (which === 0) plantNurseryRow(rn); }, TEXT.field.plantTheNurseryStock);
  }
  if (row && !row.mulched) return say(F(TEXT.field.clearGroundRowRn, { rn: rn }), which => { if (which === 0) mulchRow(rn); }, TEXT.field.mulchIt3Carts_2);
  return say(F(TEXT.field.rowRnReadyThe, { rn: rn }));
}
function mulchRow(rn) {
  const s = G.save;
  if (s.field.mulch < 3) return say(F(TEXT.field.notEnoughMulchThe, { mulch: s.field.mulch }));
  if (!projUse()) return;
  if (!projUse()) return;
  s.field.mulch -= 3; s.cropRows[rn - 1].mulched = true; saveGame();
  say(F(TEXT.field.rowRnMulchedThree, { rn: rn }));
}
function plantingGate() {
  const s = G.save, w = s.world, missing = [];
  if (s.day - (w.flags.repotDay || 0) < 5) missing.push(F(TEXT.planting.recoveryVOf5, { v: s.day - (w.flags.repotDay || 0) }));
  // the gate names no specific plant beyond the Favorites' own recovery:
  // the surviving six, recovered; the Company, recovered and grown
  const declining = sixPlants().filter(p => !p.memorial && p.health >= 2);
  if (declining.length) missing.push(F(TEXT.planting.nameVStillDeclining, { name: declining[0].name, v: (declining.length > 1 ? F(TEXT.planting.andVMoreAre, { v: declining.length - 1 }) : " IS") }));
  if (s.company && !s.company.gone && s.company.n > 0) {
    if (s.company.health >= 2) missing.push(TEXT.planting.companyDeclining);
    else if (s.company.stage < 3) missing.push(TEXT.planting.companyTooYoung);
  }
  if (s.field.tarp.filter(t => t === 3).length < 4) missing.push(F(TEXT.planting.tarpLengthOf4, { length: s.field.tarp.filter(t => t === 3).length }));
  if (s.field.fenceSeg.filter(Boolean).length < 3) missing.push(F(TEXT.planting.fenceLengthOf4, { length: s.field.fenceSeg.filter(Boolean).length }));
  const unmulched = [0, 1, 2, 3, 4, 5, 6].filter(i => !s.cropRows[i].mulched);
  if (unmulched.length) missing.push(F(TEXT.planting.mulchRowsJoinvalStill, { joinVal: unmulched.map(i => i + 1).join(", ") }));
  return missing;
}
function doPlanting() {
  const s = G.save, w = s.world;
  const missing = plantingGate();
  if (missing.length) return say([TEXT.planting.notYetTheField, ...missing.map(m => '— ' + m)]);
  // Row 1 is the surviving six, one at a time — and the gift bush at the
  // row's end. The shipped backfill is retired (spec A5): a gap in Row 1
  // is honest, and the marker stone already honours an empty place.
  const six = sixPlants().filter(p => !p.memorial && !p.gone).sort((a, b) => a.slot - b.slot);
  const general = six.find(p => p.name === 'GENERAL');
  const rowOne = [];
  if (general) { rowOne.push(general); for (const p of six) if (p !== general) rowOne.push(p); }
  else for (const p of six) rowOne.push(p);
  const gift = s.plants.find(p => p.giftName && !p.memorial && p.location === 'GREENHOUSE');
  if (gift) rowOne.push(gift);
  const lines = [...TEXT.planting.plantingDayTheAuger];
  if (!general && sixPlants().some(p => p.name === 'GENERAL' && (p.gone || p.memorial))) {
    w.flags.markerStone = true;
    lines.push(TEXT.planting.atTheHeadOf, TEXT.planting.constanceHeGuardsThe);
  }
  rowOne.forEach((p, i) => { p.location = 'ROW1'; p.row = 1; p.plantedDay = s.day; p.slot = i; if (!p.history.includes(TEXT.plants.plantedInRow1)) p.history.push(TEXT.plants.plantedInRow1); });
  w.flags.bookend = rowOne.length ? rowOne[0].name : null;
  if (general) lines.push(TEXT.planting.theGeneralGoesIn);
  // the Company goes into rows 2–7 as counts, by variety; the youngest
  // share stays behind as the founding Nursery stock
  const c = s.company;
  if (c && !c.gone && c.n > 0) {
    const plantable = Math.min(c.n, 36);
    const per = []; let left = plantable;
    for (let i = 0; i < 6; i++) { const take = Math.ceil(left / (6 - i)); per.push(take); left -= take; }
    const varsLeft = Object.assign({}, c.vars);
    per.forEach((take, i) => {
      if (take <= 0) return;
      const rn = i + 2, row = s.cropRows[rn - 1];
      row.bushCount = (row.bushCount || 0) + take;
      row.plantedDay = s.day;
      row.stage = Math.max(row.stage || 0, c.stage);
      row.wintered = c.wintered; row.chill = c.chill || 0;
      let best = null, bestN = -1;
      for (const v of Object.keys(varsLeft)) if (varsLeft[v] > bestN) { bestN = varsLeft[v]; best = v; }
      row.variety = best || 'CHANDLER';
      if (best) varsLeft[best] = Math.max(0, varsLeft[best] - take);
      row.history.push(F(TEXT.register.rowPlantedWith, { joinVal: take + ' OF THE COMPANY' }));
    });
    const rest = c.n - plantable;
    c.plantedOut = per.map((t, i) => [i + 2, t]).filter(x => x[1] > 0);
    if (rest > 0) s.nursery = freshNursery({ stock: rest, stage: Math.max(2, c.stage - 1), health: c.health });
    c.n = 0; c.gone = true;
    lines.push(TEXT.planting.theCompanyGoesInto);
  }
  lines.push(...TEXT.faith.plantingHandover); // the thread's summit: the growing is not his to do
  lines.push(TEXT.planting.andInTheHeat, TEXT.planting.frankGoInWhen);
  w.step = 6; saveGame();
  say(lines);
}
function repot() {
  const s = G.save, w = s.world;
  const lines = [...TEXT.planting.theFriendAgainRolling, TEXT.faith.crisisDiagnosis];
  const fed = w.flags.fedNames || [];
  let sixDied = null;
  if (!w.flags.mitAny) {
    const weak = sixPlants().filter(p => !p.memorial && !p.gone).sort((a, b) => (b.health - a.health) || (a.tended - b.tended))[0];
    if (weak) { weak.health = 3; }
  }
  for (const p of s.plants.filter(q => q.location === 'GREENHOUSE')) {
    if (p.memorial || p.gone) continue;
    if (p.health >= 3) {
      if (fed.includes(p.name)) { p.health = 2; lines.push(F(TEXT.planting.nameWasFedIn, { name: p.name })); }
      else if (p.firstSix && w.flags.mitAny) { p.health = 2; lines.push(F(TEXT.planting.constanceSHandsFind, { name: p.name })); }
      else { killPlant(p, TEXT.plants.theHardSpring); if (p.firstSix) sixDied = p; }
    }
  }
  if (sixDied) lines.push(F(TEXT.planting.constanceQuietlyOverName, { name: sixDied.name }));
  // the crisis takes the Company by count (spec A5): survivors run
  // ~55–65%, scaled by the player's mitigation, read at dawn as a number
  if (s.company && !s.company.gone && s.company.n > 0) {
    const c = s.company;
    const loss = Math.min(c.n, Math.round(c.n * (w.flags.mitAny ? 0.35 : 0.45)));
    c.n -= loss;
    if (s.germ) s.germ.lost = (s.germ.lost || 0) + loss;
    if (loss > 0) lines.push(F(w.flags.mitAny ? TEXT.planting.companyTollRescued : TEXT.planting.companyToll, { n: loss, left: c.n }));
    if (!c.history.includes(TEXT.plants.theHardSpring)) c.history.push(TEXT.plants.theHardSpring);
    if (c.n <= 0) { c.n = 0; c.gone = true; }
  }
  const survivors = s.plants.filter(p => !p.memorial && !p.gone && p.location === 'GREENHOUSE');
  for (const p of survivors) if (!p.history.includes(TEXT.plants.theHardSpring)) p.history.push(TEXT.plants.theHardSpring);
  const gift = freshPlant(allocName(s.plants), { variety: 'CHANDLER', stage: 4, location: 'GREENHOUSE', sownDay: s.day, giftName: true, history: TEXT.plants.aGiftFromA });
  s.plants.push(gift);
  lines.push(F(TEXT.planting.andBeforeTheFriend, { name: gift.name }));
  lines.push(TEXT.faith.giftThanks);
  lines.push(TEXT.planting.theGlassHouseBreathes);
  w.flags.repotDay = s.day; w.flags.repotReady = false; w.step = 5; saveGame();
  say(lines);
}
function ch6Opening() {
  say(TEXT.openings.thePromiseIsWritten);
}
function ch6Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.step <= 2) { // a crisis dawn: the glass house is an oven with a garden in it
    const slipped = [];
    const gh = s.plants.filter(p => !p.memorial && p.location === 'GREENHOUSE');
    gh.forEach((p, i) => {
      if (s.field.vent) return;
      if ((w.flags.wasWatered || {})[p.name]) return;
      if (hashDay(s.day * 31 + i) % 5 < 2 && p.health < 3) { p.health++; slipped.push(p.name); }
    });
    let companySlipped = false;
    if (s.company && !s.company.gone && s.company.n > 0 && s.company.loc === 'GREENHOUSE' && !s.field.vent && !w.flags.companyWatered) {
      if (hashDay(s.day * 31 + 7) % 5 < 2 && s.company.health < 3) { s.company.health++; companySlipped = true; }
    }
    // an unmitigated night — vent shut, nothing watered — always costs
    // the weakest of the six a step; the census used to guarantee it
    if (!slipped.length && !s.field.vent && !Object.keys(w.flags.wasWatered || {}).length && gh.length) {
      const weak = gh.slice().sort((a, b) => b.health - a.health)[0];
      if (weak && weak.health < 3) { weak.health++; slipped.push(weak.name); }
    }
    if (Object.keys(w.flags.wasWatered || {}).length || s.field.vent || w.flags.mitDirtDay === s.day - 1) w.flags.mitAny = true;
    w.step++;
    const hints = TEXT.dawns.waterThemTheBench;
    const lines = [F(TEXT.dawns.theGlassHouseIs, { v: (slipped.length ? F(TEXT.dawns.joinvalVSlippedIn, { joinVal: slipped.slice(0, 3).join(", "), v: (slipped.length > 3 ? " AND MORE" : "") }) : TEXT.dawns.theyHeldThisTime) }), hints[(w.step - 1) % 3], F(TEXT.dawns.theCrisisHasThree, { step: w.step })];
    if (companySlipped) lines.splice(1, 0, TEXT.dawn.companySlipped);
    return lines;
  }
  if (w.step === 3) {
    w.step = 4; w.flags.repotReady = true; saveGame();
    return TEXT.dawns.aTruckRollsUp;
  }
  if (w.step === 6) { // the first night
    const rowOne = s.plants.filter(p => !p.memorial && p.row === 1);
    const complete = s.field.fenceSeg.filter(Boolean).length >= 4;
    const weak = rowOne.slice().sort((a, b) => b.health - a.health)[0];
    startTrial({ foe: 'DEER', kind: 'deerFirstNight', pressure: complete ? 40 : 55, vigor: 30, graze: !complete, plantsList: rowOne.length ? rowOne : sixPlants(), msg: F(TEXT.trials.theFirstNightThe, { v: (weak ? F(TEXT.trials.nameIsVTonight, { name: weak.name, v: HEALTH_NAMES[weak.health] }) : TEXT.trials.theRow) }) });
    return null;
  }
  if (w.step === 7) { completeChapter(6); return null; }
  return null;
}
TRIAL_OUTCOMES.deerFirstNight = {
  win(t) {
    const w = G.save.world; w.step = 7; saveGame();
    say(TEXT.trials.theHerdTurnsAt);
  },
  lose(t, fled) {
    const s = G.save, w = s.world;
    const lines = TEXT.trials.theHerdGetsIn;
    for (const p of (t.plantsList || [])) {
      if (p.memorial) continue;
      p.dirtCredit = 0;
      if (p.health >= 3) { killPlant(p, TEXT.plants.theFirstNight); lines.push(F(TEXT.trials.nameDidNotSurvive, { name: p.name })); }
      else p.health++;
    }
    if (s.cropRows[1]) s.cropRows[1].mowed = true;
    const seg = s.field.fenceSeg.findIndex(x => x);
    if (seg >= 0) { s.field.fenceSeg[seg] = 0; s.field.fence = s.field.fenceSeg.filter(Boolean).length; w.flags.breach = true; }
    lines.push(TEXT.trials.aRowIsMowed);
    w.step = 7; saveGame();
    say(lines);
  },
};
/* Decision 7: the Barber strikes the Nursery stock by count — each
   strike shears one stock plant, written on the Nursery page as a
   SHORN line. The trial itself is unchanged. */
function barberStrike() {
  const s = G.save, n = s.nursery;
  if (!n || n.stock <= 0) return null;
  n.stock--;
  n.history.push(TEXT.register.shornLine);
  saveGame();
  return n;
}
function ch7Opening() {
  say(TEXT.openings.theFieldSettlesInto);
}
function ch7Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.step === 0) {
    w.step = 1;
    const gift = s.plants.find(p => p.giftName && !p.memorial);
    const lines = [...TEXT.dawns.fallIsComingInto];
    if (gift) { if (!gift.history.includes(TEXT.plants.firstFallTurnedFirst)) gift.history.push(TEXT.plants.firstFallTurnedFirst); lines.push(TEXT.dawns.theGiftBushTurns); }
    const p = barberStrike();
    if (p) lines.push(TEXT.dawn.nurseryShorn, TEXT.dawns.constanceWhateverItIs);
    return lines;
  }
  if (w.step === 1) {
    if (w.watchRow === 'NURSERY') {
      w.flags.watchRight = (w.flags.watchRight || 0) + 1;
      if (w.flags.watchRight >= 2) {
        w.step = 2;
        startTrial({ foe: 'BARBER', kind: 'barber', pressure: 30, vigor: 24, plantsList: [], msg: TEXT.trials.twoQuietNightsUnder });
        return null;
      }
      return TEXT.dawns.aQuietNightIn;
    }
    const p = barberStrike();
    w.flags.strikes = (w.flags.strikes || 0) + 1;
    if ((w.flags.strikes || 0) >= 2) {
      w.step = 2;
      startTrial({ foe: 'BARBER', kind: 'barber', pressure: 40, vigor: 24, plantsList: [], msg: TEXT.trials.itComesInDaylight });
      return null;
    }
    return [(p ? TEXT.dawn.shornAgainNursery : TEXT.dawns.aQuietNight), TEXT.dawns.setTheWatchWhere];
  }
  if (w.step === 3) { completeChapter(7); return null; }
  return null;
}
TRIAL_OUTCOMES.barber = {
  win(t) {
    const w = G.save.world; w.step = 3; w.flags.barberKnown = true; saveGame();
    say(TEXT.trials.itIsGoneOver);
  },
  lose(t, fled) {
    const s = G.save, w = s.world;
    const n = s.nursery;
    let lost = false;
    if (n && n.stock > 0 && !fled) { n.stock--; n.history.push(TEXT.register.stockLostLine); lost = true; }
    w.step = 1; w.flags.strikes = 1; saveGame();
    say([F(TEXT.trials.itSlipsAwayBetween, { v: (lost ? TEXT.register.stockLostLine : "") }), TEXT.trials.itWillComeAgain]);
  },
};
function pullWeeds(sec) {
  const s = G.save, w = s.world;
  const lv = s.field.weedLv[sec] || 0;
  if (lv <= 0) return say(TEXT.field.thisSectionIsClean);
  if (!projUse()) return;
  const pay = [0, 1, 2, 4][lv];
  s.field.weedLv[sec] = lv - 1; s.compost += pay; saveGame();
  if (w.ch === 8 && !w.flags.taught) {
    w.flags.taught = true; saveGame();
    return say([TEXT.field.constanceKneelingLikeA, F(TEXT.field.constanceDownLeverageThe, { pay: pay })]);
  }
  say(F(TEXT.field.pulledRootsAndAll, { sec: sec, v: lv - 1, pay: pay }));
}
function feedRow(rn) {
  const s = G.save;
  if (s.compost < 9) return say(F(TEXT.field.aRowFeedingTakes, { compost: s.compost }));
  s.compost -= 9;
  const row = s.cropRows[rn - 1];
  row.yieldRating = Math.min(3, row.yieldRating + 1); row.fedStamp = seasonKey();
  if (row.rowHealth > 0) row.rowHealth--; // good dirt is the row's rescue medicine too (spec A3)
  saveGame();
  say(F(TEXT.field.rowRnFedNine, { rn: rn, yieldRating: row.yieldRating }));
}
function proudWeedInteract() {
  const s = G.save, w = s.world;
  if (w.flags.proudChopped) return say(TEXT.field.theProudWeedLies);
  if (w.flags.chopDay !== s.day) { w.flags.chops = 0; w.flags.chopDay = s.day; }
  w.flags.chops = (w.flags.chops || 0) + 1; saveGame();
  if (w.flags.chops >= 3) {
    w.flags.proudChopped = true; saveGame();
    return say(TEXT.field.threeChopsAndThe);
  }
  return say(F(TEXT.field.chopChopsOf3, { chops: w.flags.chops }));
}
function burnPileInteract() {
  const s = G.save, w = s.world;
  if (w.ch === 8 && w.flags.proudChopped && !w.flags.proudBurned) {
    w.flags.proudBurned = true; w.flags.proudRoots = true; w.step = 3; saveGame();
    return say(TEXT.field.theBurnPileAt);
  }
  return say(TEXT.field.theBurnPileEvery);
}
function strawberryInteract() {
  const s = G.save, w = s.world;
  const have = s.plants.filter(p => !p.gone && p.variety === TEXT.plants.strawberry);
  if (have.length >= 4) { w.flags.strawDone = true; if (w.step === 3) w.step = 4; saveGame(); return say(TEXT.field.theStrawberryPatchFour); }
  const p = freshPlant(allocName(s.plants), { variety: 'STRAWBERRY', stage: 3, location: 'GARDEN', gardenState: 'NEW', sownDay: s.day, runners: true, history: TEXT.plants.aFoundingClumpOf });
  s.plants.push(p);
  if (!s.dex.garden.includes(TEXT.plants.strawberry)) s.dex.garden.push(TEXT.plants.strawberry);
  if (have.length + 1 >= 4) { w.flags.strawDone = true; w.step = 4; }
  saveGame();
  return say(F(TEXT.field.strawberryClumpLength1, { length: have.length, name: p.name }));
}
function butterflyPlant() {
  const s = G.save, w = s.world;
  const p = freshPlant('LAMPLIGHT', { variety: 'BUTTERFLY', stage: 4, location: 'GARDEN', gardenState: 'NEW', sownDay: 1, giftName: true, history: TEXT.plants.opaNamedItIn });
  s.plants.push(p);
  if (!s.dex.garden.includes(TEXT.plants.butterfly)) s.dex.garden.push(TEXT.plants.butterfly);
  w.flags.butterflyPlanted = true; w.step = 5; saveGame();
  return say(TEXT.field.theButterflyBushGoes);
}
function ch8Opening() {
  const s = G.save, w = s.world;
  if (s.field.weedLv.every(v => v === 0)) s.field.weedLv = [2, 3, 1, 2, 0, 3];
  say(TEXT.openings.theFieldIsPlanted);
}
function ch8Dawn(ev) {
  const s = G.save, w = s.world, so = seasonOf(s.day);
  // the clear week is judged on how the field ENDED yesterday, before today's regrowth
  if (w.step === 5) {
    if (s.field.weedLv.every(v => v === 0)) {
      w.flags.clearStreak = (w.flags.clearStreak || 0) + 1;
      if (w.flags.clearStreak >= 7) { completeChapter(8); return null; }
      return [F(TEXT.dawns.everySectionAtZero, { clearStreak: w.flags.clearStreak })];
    }
    w.flags.clearStreak = 0;
  }

  // the war itself: regrowth and pressure, in growing weather
  const seasonName = SEASON_NAMES[so.idx];
  if (seasonName !== 'WINTER') {
    const tick = seasonName === 'FALL' ? s.day % 7 === 0 : s.day % 4 === 0;
    if (tick) for (let i = 0; i < 6; i++) {
      const pinned = s.cropRows[i * 2].mulched && s.cropRows[i * 2 + 1].mulched;
      const cur = s.field.weedLv[i] || 0;
      s.field.weedLv[i] = pinned ? (cur === 0 ? 1 : cur) : Math.min(3, cur + 1); // mulch pins a section at 1: it may sprout, never climb
    }
    w.flags.lv3since = w.flags.lv3since || [null, null, null, null, null, null];
    for (let i = 0; i < 6; i++) {
      if (s.field.weedLv[i] >= 3) {
        if (w.flags.lv3since[i] == null) w.flags.lv3since[i] = s.day;
        else if (s.day - w.flags.lv3since[i] >= 7) {
          // the section's weekly harm steps its rows' health — and, at
          // CRITICAL, costs a bush (spec A5); Row 1's Favorites still
          // feel it by name, as they feel everything
          for (const rn of [i * 2 + 1, i * 2 + 2]) rowStepHarm(s.cropRows[rn - 1], rn, TEXT.dawn.theWeeds, ev);
          const inSec = s.plants.filter(p => !p.memorial && !p.gone && p.row && Math.floor((p.row - 1) / 2) === i).sort((a, b) => b.health - a.health)[0];
          if (inSec && inSec.health < 3) inSec.health++;
          w.flags.lv3since[i] = s.day;
        }
      } else w.flags.lv3since[i] = null;
    }
  }
  if (w.step === 0) { // the long war opens in person
    const worst = s.field.weedLv.indexOf(Math.max(...s.field.weedLv));
    const plantsList = s.plants.filter(p => !p.memorial && p.row && Math.floor((p.row - 1) / 2) === worst);
    startTrial({ foe: 'WEEDS', kind: 'weedsLongWar', pressure: 30, vigor: 34, waves: [30, 25], plantsList: plantsList.length ? plantsList : sixPlants(), msg: F(TEXT.trials.theLongWarIn, { worst: worst }) });
    return null;
  }
  if (w.step === 1 && !w.flags.momDone && w.flags.momDay == null) {
    w.flags.momDay = s.day; saveGame();
    return TEXT.dawns.aCarInThe;
  }
  return null;
}
TRIAL_OUTCOMES.weedsLongWar = {
  win(t) {
    const s = G.save, w = s.world;
    s.field.weedLv = s.field.weedLv.map(v => Math.max(0, v - 1));
    w.step = 1; saveGame();
    say(TEXT.trials.theLineBreaksTwice);
  },
  lose(t, fled) {
    say(TEXT.trials.theTideKeepsThe);
  },
};
function forsythiaPlant() {
  const s = G.save, w = s.world;
  const p = freshPlant('VESPER', { variety: 'FORSYTHIA', stage: 4, location: 'GARDEN', gardenState: 'NEW', sownDay: s.day, giftName: true, history: TEXT.plants.omaNamedItFrank });
  s.plants.push(p);
  if (!s.dex.garden.includes(TEXT.plants.forsythia)) s.dex.garden.push(TEXT.plants.forsythia);
  w.flags.forsythiaPlanted = true; w.step = 1; saveGame();
  return say(TEXT.field.theForsythiaGoesIn);
}
function ch9Opening() {
  say(TEXT.openings.yearThreePutsOn);
}
function ch9Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.step === 1 && !w.flags.forsythiaBloomed) {
    w.flags.forsythiaBloomed = true;
    const f = s.plants.find(p => p.variety === TEXT.plants.forsythia);
    if (f) f.stage = 5;
    for (const p of s.plants) if (!p.memorial && p.row && p.stage === 4) { p.stage = 5; if (!p.blossomDay) p.blossomDay = s.day; }
    for (const r of s.cropRows) if ((r.bushCount || 0) > 0 && r.stage === 4) r.stage = 5;
    saveGame();
    return TEXT.dawns.firstYellow;
  }
  if (w.step === 1 && !w.flags.spectacular) {
    // the spectacular one is the Favorite, when she stands in a row
    // (ONE FAVORITE, Nov 27, 2026) — and HOPE was always preferred here
    const living = favPlants().filter(p => p.row);
    const all = s.plants.filter(p => isFav(p) && p.row);
    const mostAll = all.slice().sort((a, b) => b.tended - a.tended)[0];
    let target = living.slice().sort((a, b) => (b.tended - a.tended) || (a.slot || 0) - (b.slot || 0))[0];
    const hope = living.find(p => p.name === 'HOPE');
    if (hope && living.length && hope.tended >= (target ? target.tended : 0)) target = hope;
    if (!target) { w.step = 2; return null; }
    if (target.stage < 5) { target.stage = 5; if (!target.blossomDay) target.blossomDay = s.day; }
    if (!target.history.includes(TEXT.plants.coveredInBlossomSpring)) target.history.push(TEXT.plants.coveredInBlossomSpring);
    w.flags.spectacular = target.name; w.step = 2; saveGame();
    const lines = [];
    if (mostAll && mostAll.memorial) lines.push(F(TEXT.dawns.theMostTendedOf, { name: mostAll.name }));
    lines.push(F(TEXT.dawns.andThenNameFound, { name: target.name }));
    if (target.history.includes(TEXT.plants.theHardSpring)) { lines.push(TEXT.dawns.constanceQuietlyThatOne); lines.push(TEXT.faith.spectacularClause); }
    lines.push(TEXT.dawns.itIsWrittenIn);
    lines.push(TEXT.dawns.andOnTheWind);
    return lines;
  }
  if (w.step === 2) {
    const night = (w.flags.frostNight || 0) + 1;
    if (night > 3) { // the reckoning: the account first, the card at the next dawn
      if (w.flags.reckoned) { completeChapter(9); return null; }
      w.flags.reckoned = true;
      const lines = [...TEXT.dawns.theReckoningOfThe];
      const losses = s.plants.filter(p => p.memorial && p.cause === TEXT.plants.theLateFrost);
      if (losses.length) lines.push(F(TEXT.dawns.firstTheLossesBy, { joinVal: losses.map(p => p.name).join(", ") }));
      for (let rn = 1; rn <= 7; rn++) {
        const row = s.cropRows[rn - 1];
        if (!rowHasBushes(rn)) continue;
        const watched = (w.flags.watchedRows || []).includes(rn);
        let fs = watched ? ((w.flags.frostResult || {})[rn] === 'win' ? 90 : 40) : 50;
        if (!watched) {
          if (rn === 1) { const weak = s.plants.filter(p => !p.memorial && p.row === 1).sort((a, b) => b.health - a.health)[0]; if (weak && weak.health < 3) weak.health++; }
          else rowStepHarm(row, rn, TEXT.dawn.theLateFrostRow, ev); // crop rows take the hardest night at row scale
        }
        if ((w.flags.blossomWatered || {})[rn]) fs += 20;
        row.fruitSet = Math.max(10, Math.min(100, fs));
      }
      saveGame();
      lines.push(TEXT.dawns.theFruitSetIs);
      // Favorite #10: the frost survivor — a crop-row bush that entered a
      // frost night DECLINING or worse and lived is named on the spot
      if (!w.flags.frostSurvivorNamed) {
        const seen = w.flags.frostRowHealth || {};
        const cand = [2, 3, 4, 5, 6, 7].filter(rn => (seen[rn] || 0) >= 2 && (s.cropRows[rn - 1].bushCount || 0) > 0);
        if (cand.length) {
          cand.sort((a, b) => (seen[b] - seen[a]) || (a - b));
          const p = splitFavoriteFromRow(cand[0], 'frost');
          if (p) { w.flags.frostSurvivorNamed = p.name; lines.push(F(TEXT.field.frostSurvivorNamed, { rn: cand[0], name: p.name })); }
        }
      }
      lines.push(TEXT.faith.reckoningWater); // trust, shown as a man picking up the can
      return lines;
    }
    w.flags.frostNight = night;
    // remember how each crop row entered the night — the reckoning asks
    w.flags.frostRowHealth = w.flags.frostRowHealth || {};
    for (let rn = 2; rn <= 7; rn++) { const row = s.cropRows[rn - 1]; if ((row.bushCount || 0) > 0) w.flags.frostRowHealth[rn] = Math.max(w.flags.frostRowHealth[rn] || 0, row.rowHealth || 0); }
    const watch = w.flags.watchTonight;
    w.flags.watchTonight = null;
    if (watch) {
      w.flags.watchedRows = [...(w.flags.watchedRows || []), watch];
      const inRow = s.plants.filter(p => !p.memorial && p.row === watch);
      const weak = inRow.slice().sort((a, b) => b.health - a.health)[0];
      startTrial({ foe: 'FROST', kind: 'frostBlossom', pressure: 45, vigor: 32, snap: true, row: watch, plantsList: (watch === 1 ? (inRow.length ? inRow : sixPlants()) : []), msg: F(TEXT.trials.theLateFrostNight, { night: night, watch: watch, v: (weak ? F(TEXT.trials.andNameIsV, { name: weak.name, v: HEALTH_NAMES[weak.health] }) : "") }) });
      return null;
    }
    saveGame();
    return [F(TEXT.dawns.nightNightOfThe, { night: night }), TEXT.dawns.theFruitSetWill];
  }
  return null;
}
TRIAL_OUTCOMES.frostBlossom = {
  win(t) {
    const s = G.save, w = s.world;
    const rn = t.row || (t.plantsList && t.plantsList[0] && t.plantsList[0].row) || 1;
    (w.flags.frostResult = w.flags.frostResult || {})[rn] = 'win'; saveGame();
    say([F(TEXT.trials.theFrostBreaksOn, { rn: rn }), TEXT.trials.alvinComesInWith]);
  },
  lose(t, fled) {
    const s = G.save, w = s.world;
    const rn = t.row || (t.plantsList && t.plantsList[0] && t.plantsList[0].row) || 1;
    (w.flags.frostResult = w.flags.frostResult || {})[rn] = 'lose';
    const lines = [F(TEXT.trials.theFrostTakesRow, { rn: rn })];
    if (!fled) {
      if (t.plantsList && t.plantsList.length) {
        // Row 1 stakes Favorites: individual outcomes, as shipped
        const weak = t.plantsList.filter(p => !p.memorial).sort((a, b) => b.health - a.health)[0];
        for (const p of t.plantsList) {
          if (p.memorial) continue;
          p.health++;
          if (p.health >= 4 || (p === weak && p.health >= 3)) { killPlant(p, TEXT.plants.theLateFrost); lines.push(F(TEXT.trials.nameDidNotSurvive_2, { name: p.name })); }
        }
      } else {
        // a crop row stakes the row: a health step — and a bush only if
        // the row entered the night CRITICAL (spec A5)
        const row = s.cropRows[rn - 1];
        if (row) { if ((row.rowHealth || 0) >= 3) loseRowBush(row, rn, TEXT.dawn.theLateFrostRow, null); else row.rowHealth++; }
      }
    }
    saveGame();
    say(lines);
  },
};
function pruneRow(rn) {
  const s = G.save, year = seasonOf(s.day).year;
  const row = s.cropRows[rn - 1];
  if (row.prunedYear === year) return say(F(TEXT.field.rowRnIsPruned, { rn: rn }));
  if (!projUse()) return;
  row.prunedYear = year; saveGame();
  say((rn === 1 ? TEXT.field.row1PrunedAll : F(TEXT.field.rowRnPrunedKeep, { rn: rn })));
}
function plantNurseryRow(rn) {
  const s = G.save;
  const n = s.nursery;
  const row = s.cropRows[rn - 1];
  if (!n || n.stock <= 0 || n.stage < 3) return say(TEXT.field.theNurseryShelfHolds);
  const take = Math.min(n.stock, 12 - (row.bushCount || 0) - s.plants.filter(p => !p.memorial && !p.gone && p.row === rn).length);
  if (take <= 0) return say(TEXT.field.theNurseryShelfHolds);
  n.stock -= take;
  row.bushCount = (row.bushCount || 0) + take;
  if (row.plantedDay == null) row.plantedDay = s.day;
  row.stage = Math.max(row.stage || 0, n.stage);
  if (!row.variety) row.variety = 'CHANDLER';
  row.history.push(F(TEXT.register.rowPlantedWith, { joinVal: take + ' FROM THE NURSERY' }));
  saveGame();
  say(F(TEXT.field.lengthBushesGoInto, { length: take, rn: rn }));
}
function sowTrayLT() {
  const s = G.save, w = s.world;
  if (s.tray.n > 0) return say(TEXT.field.theTrayIsAlready);
  if (seasonOf(s.day).idx !== 3) return say(TEXT.field.theTrayIsSown);
  s.tray.n = 40; s.tray.sownDay = s.day; s.tray.stratDays = 0; s.tray.ready = false; saveGame();
  say(TEXT.field.fortySeedsIntoThe);
}
function potUpLT() {
  const s = G.save;
  if (!s.nursery) s.nursery = freshNursery();
  const made = Math.min(12 - s.nursery.stock, s.tray.n);
  if (made <= 0) return say(TEXT.field.theNurseryShelfHolds);
  s.nursery.stock += made;
  if (!s.nursery.history.includes(TEXT.plants.sownInTheLong)) s.nursery.history.push(TEXT.plants.sownInTheLong);
  s.tray.n -= made; s.tray.pottedTotal += made;
  if (s.tray.n <= 0) { s.tray.ready = false; s.tray.n = 0; }
  saveGame();
  say(F(TEXT.field.madePottedUpAnd, { made: made }));
}
function shareStand() {
  const s = G.save, w = s.world, year = seasonOf(s.day).year;
  if (w.flags.standYear === year) return say(TEXT.field.theStandHasShared);
  const lbs = Math.floor((s.wine.poundsByYear[year] || 0) * 0.25);
  if (lbs <= 0) return say(TEXT.field.noSurplusYetThis);
  s.wine.shared = (s.wine.shared || 0) + lbs; w.flags.standYear = year; saveGame();
  say(F(TEXT.field.lbsLbsGoDown, { lbs: lbs, shared: s.wine.shared }));
}
function ltOpening() {
  const s = G.save, w = s.world;
  w.flags.ltStartYear = seasonOf(s.day).year; saveGame();
  say(TEXT.openings.theStoryIsDone);
}
function ltDawn(ev) {
  const s = G.save, w = s.world, so = seasonOf(s.day);
  const pre = [];
  if (w.flags.wineNote) { pre.push(w.flags.wineNote); w.flags.wineNote = null; }
  if (s.tray.n > 0 && !s.tray.ready) {
    if (so.idx === 3) s.tray.stratDays = (s.tray.stratDays || 0) + 1;
    if ((s.tray.stratDays || 0) >= 10 && so.idx === 0) { s.tray.ready = true; pre.push(TEXT.dawns.theTrayInThe); }
  }
  if (pre.length && w.flags.seasonChanged == null) { saveGame(); return pre; }
  if (w.flags.seasonChanged != null) {
    const idx = w.flags.seasonChanged; w.flags.seasonChanged = null; saveGame();
    if (idx === 0) { // spring
      for (const p of s.plants) if (!p.memorial && p.row && p.stage === 4) { p.stage = 5; if (!p.blossomDay) p.blossomDay = s.day; p.fruitSetOk = true; }
      for (let rn = 1; rn <= 12; rn++) { const row = s.cropRows[rn - 1]; if (row.prunedYear === so.year - 1) { row.yieldRating = Math.min(3, (row.yieldRating || 1) + 1); row.prunedYear = null; } if (rowHasBushes(rn)) { row.fruitSet = 60; if (row.stage >= 4) row.fruitSetOk = true; if (row.stage === 4) row.stage = 5; } }
      const lines = TEXT.dawns.springAgainTrueAs;
      if (w.flags.proudRoots && !w.flags.proudShoot) { w.flags.proudShoot = true; lines.push(TEXT.dawns.byTheFenceOne); }
      if (!w.flags.goats && !w.flags.goatAppeal && so.year >= (w.flags.ltStartYear || so.year) + 1) { w.flags.goatAppeal = 'filed'; lines.push(TEXT.dawns.aLetterComesFrom); }
      else if (w.flags.goatAppeal === 'filed') { w.flags.goatAppeal = 'heard'; lines.push(TEXT.dawns.theAppealIsHeard); }
      else if (w.flags.goatAppeal === 'heard' && !w.flags.goats) { w.flags.goats = true; lines.push(TEXT.dawns.theAppealSucceedsTwo); }
      saveGame();
      return [...pre, ...lines];
    }
    if (idx === 1) { // summer
      for (const p of s.plants) if (!p.memorial && p.row && p.stage === 5) { p.stage = 6; if (!p.fruitDay) p.fruitDay = s.day; }
      for (let rn = 1; rn <= 12; rn++) if (rowHasBushes(rn)) { const row = s.cropRows[rn - 1]; row.ripeDay = s.day; if (row.stage === 5) row.stage = 6; }
      saveGame();
      return TEXT.dawns.summerTheFieldTurns;
    }
    if (idx === 2) { // fall
      const lines = TEXT.dawns.fallTheGiftBush;
      if (s.wine.batches.some(b => b.year === so.year)) lines.push(TEXT.dawns.theYearSWine);
      saveGame();
      return lines;
    }
    if (idx === 3) { // winter: the bushes rest back to wood
      for (const p of s.plants) if (!p.memorial && p.row && p.stage === 6) p.stage = 4;
      for (const r of s.cropRows) if ((r.bushCount || 0) > 0 && r.stage === 6) r.stage = 4;
      saveGame();
      return TEXT.dawns.winterTheFieldSleeps;
    }
  }
  // the Long Tending's springs re-run the frost-survivor check (spec A1):
  // last spring's frost candidate, if it entered DECLINING or worse and
  // lived, is named at this dawn
  if (w.flags.ltFrostCandidate != null && !w.flags.frostSurvivorNamed) {
    const rn = w.flags.ltFrostCandidate; w.flags.ltFrostCandidate = null;
    if ((w.flags.ltFrostHealth || 0) >= 2 && (s.cropRows[rn - 1].bushCount || 0) > 0) {
      const p = splitFavoriteFromRow(rn, 'frost');
      if (p) { w.flags.frostSurvivorNamed = p.name; saveGame(); return [F(TEXT.field.frostSurvivorNamed, { rn: rn, name: p.name })]; }
    }
  }
  // Favorite #12: Alvin's plant — the dog settles beside one row bush,
  // dawn after dawn, until the pattern is undeniable and Frank notices
  if (!w.flags.alvinPlantNamed) {
    if (w.flags.alvinSitRow == null) {
      const cand = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(rn => (s.cropRows[rn - 1].bushCount || 0) >= 2);
      if (cand.length) { cand.sort((a, b) => (s.cropRows[b - 1].bushCount - s.cropRows[a - 1].bushCount) || (a - b)); w.flags.alvinSitRow = cand[0]; w.flags.alvinSitDays = 0; }
    }
    if (w.flags.alvinSitRow != null) {
      w.flags.alvinSitDays = (w.flags.alvinSitDays || 0) + 1;
      if (w.flags.alvinSitDays >= 5) {
        const rn = w.flags.alvinSitRow;
        const p = splitFavoriteFromRow(rn, 'alvin');
        if (p) { w.flags.alvinPlantNamed = p.name; saveGame(); return [F(TEXT.field.alvinPlantNamed, { rn: rn, name: p.name })]; }
        w.flags.alvinSitRow = null; w.flags.alvinSitDays = 0;
      }
    }
  }
  if (so.idx === 0 && hashDay(s.day) % 7 === 0) { // a spring frost night
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(rn => rowHasBushes(rn));
    if (rows.length) {
      const rn = rows[hashDay(s.day) % rows.length];
      const inRow = s.plants.filter(p => !p.memorial && p.row === rn);
      if (rn >= 2) { w.flags.ltFrostCandidate = rn; w.flags.ltFrostHealth = s.cropRows[rn - 1].rowHealth || 0; }
      startTrial({ foe: 'FROST', kind: 'frostBlossom', pressure: 45, vigor: 32, snap: true, row: rn, plantsList: (rn === 1 ? inRow : []), msg: F(TEXT.trials.aLateFrostIn, { rn: rn }) });
      return null;
    }
  }
  if (hashDay(s.day) % 11 === 0) { // deer scouts, in the small hours
    const rowOne = s.plants.filter(p => !p.memorial && p.row === 1);
    startTrial({ foe: 'DEER', kind: 'deerScoutsLT', pressure: 15, vigor: 30, plantsList: rowOne.length ? rowOne : sixPlants(), msg: TEXT.trials.scoutsAtTheFence });
    return null;
  }
  if (!w.flags.stamp900 && Object.values(s.wine.poundsByYear).some(v => v >= 900)) {
    w.flags.stamp900 = true; saveGame();
    return TEXT.dawns.nineHundredPoundsThe;
  }
  return null;
}
TRIAL_OUTCOMES.deerScoutsLT = {
  win(t) { say(TEXT.trials.theScoutsLeaveWith); },
  lose(t, fled) { say(TEXT.trials.theScoutsGrazeThe); },
};
function ch4Opening() {
  say(TEXT.openings.theGlassHouseIs);
}
function ch4Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.step === 2 && !w.flags.scoutsDone) {
    w.flags.scoutsDone = true;
    startTrial({ foe: 'DEER', kind: 'deerScouts', pressure: 30, vigor: 22, graze: true, plantsList: sixPlants(), msg: TEXT.trials.scoutsTwoDeerAt });
    return null;
  }
  if (w.step === 3) {
    if (w.flags.fenceNotes) { completeChapter(4); return null; }
    return TEXT.dawns.theFenceWillNot;
  }
  return null;
}
TRIAL_OUTCOMES.deerScouts = {
  win(t) { say(TEXT.trials.theScoutsRetreatTo); },
  lose(t, fled) { say(TEXT.trials.theScoutsGrazeA); },
};
function ch5Opening() {
  say(TEXT.openings.winterPlansBecomeSpring);
}

function ch3Opening() {
  say(TEXT.openings.theRentalIsSmall);
}
function ch3Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.step === 0) { w.step = 1; return TEXT.dawns.aBarnLandA; }
  if (w.step === 2) { w.step = 3; return null; } // a day of thinking it over
  if (w.step === 3) {
    w.step = 4;
    return TEXT.dawns.oneMoreHouseFails;
  }
  if (w.step === 5) {
    if (w.flags.loadOrder === 'furniture' && !w.flags.plantsMoved) {
      w.flags.plantsMoved = true;
      for (const p of s.plants) if (!p.memorial && (p.location === 'BENCH' || p.location === 'WINDOW')) { p.wateredDays = Math.max(0, p.wateredDays - 1); p.location = 'OFFICE'; }
      if (s.company) { s.company.loc = 'OFFICE'; s.company.wateredDays = Math.max(0, s.company.wateredDays - 1); }
      w.step = 6; saveGame();
      return TEXT.dawns.thePlantsSpentThe;
    }
    if (w.flags.loadOrder === 'plants') { w.step = 6; return TEXT.dawns.theFurnitureArrivesOn; }
  }
  if (w.step === 8) { startGlassTrial(); return null; }
  if (w.step === 9) {
    completeChapter(3);
    return null;
  }
  return null;
}
function startGlassTrial() {
  const s = G.save;
  const gp = s.plants.filter(p => !p.memorial && p.location === 'GREENHOUSE');
  startTrial({ foe: 'FROST', kind: 'frostGlass', pressure: 35, vigor: 28, snap: true, plantsList: gp.length ? gp : sixPlants(), msg: TEXT.trials.theFirstNightIn });
}
TRIAL_OUTCOMES.frostGlass = {
  win(t) {
    G.save.world.step = 9; saveGame();
    say(TEXT.trials.theGlassHoldsThe);
  },
  lose(t, fled) {
    const s = G.save, w = s.world;
    if (fled) { say(TEXT.trials.alvinBacksOffThe_2); return; }
    w.step = 9;
    for (const p of t.plantsList || []) { if (!p.memorial) { p.wateredDays = 0; p.dirtCredit = 0; if (p.health < 3) p.health++; } }
    saveGame();
    say(TEXT.trials.theColdFoundA);
  },
};

function houseInteract(f) {
  const s = G.save, w = s.world, ch = mapChar(f.x, f.y);
  // the moving boxes stand on floor tiles in the corner
  if (w.ch === 2 && w.step === 5 && f.y === 10 && f.x >= 15 && f.x <= 17 && (w.flags.trips || 0) < 3) {
    if (w.flags.tripDay === s.day) return say(TEXT.house.oneTripADay);
    return say(TEXT.house.boxesBooksJarsAnd, which => { if (which === 0) storageTrip(); }, TEXT.house.loadTheVan);
  }
  if (ch === 'r' && w.ch === 11 && seasonOf(s.day).idx === 3 && s.tray.n === 0) return sowTrayLT();
  if (ch === 'r') { // the fridge
    if (w.ch === 2 && w.step === 1 && !w.flags.fridgeTray) {
      return say(TEXT.house.theSecondPacketBlueberry, which => { if (which === 0) fridgeSeeds(); }, TEXT.house.putTheSeedsIn);
    }
    if (w.flags.fridgeTray && !s.tray.ready) return say(F(TEXT.house.theTraySleepsIn, { stratDays: s.tray.stratDays }));
    if (s.tray.ready) return say(TEXT.house.theFridgeIsJust);
    return say(TEXT.house.theFridgeHumsInside);
  }
  if (ch === 'a') { // the window shelf
    if (f.x === 1) { // the tray end
      if (s.tray.ready && s.tray.n > 0) {
        return say(F(TEXT.house.theTrayNSprouts, { n: s.tray.n }), which => {
          if (which === 0) potUp();
          else if (which === 1) waterShelf();
        }, TEXT.house.potUpASprout);
      }
      if (s.tray.ready) return say(TEXT.house.theTrayIsEmpty, which => { if (which === 0) waterShelf(); }, TEXT.barnIn.waterTheShelf);
      if (w.flags.fridgeTray) return say(TEXT.house.anEmptyTrayWaiting);
      return say(TEXT.house.aTrayOfPeat);
    }
    if (f.x >= 2 && f.x <= 7) { // a member of the six, in window order
      const p = sixPlants().find(q => q.location === 'WINDOW' && q.slot === f.x - 2);
      if (p) return potInteract(p);
      return say(TEXT.house.anEmptySpotOn);
    }
    // the grow-light end
    if (w.flags.coldComing && !w.flags.blanket) {
      return say(TEXT.house.theOldWoolBlanket, which => {
        if (which === 0) { w.flags.blanket = true; saveGame(); say(TEXT.house.tuckedInTheShelf); }
      }, TEXT.house.tuckTheBlanketIn);
    }
    return say(TEXT.house.theGrowLightHums);
  }
  if (ch === 'e') { // the dining table
    if (w.ch === 2 && w.step === 8) {
      return say(TEXT.house.theSalePapersEverything, which => { if (which === 0) signSale(); }, TEXT.house.signThePapers);
    }
    if (w.flags.omaVisit) return say(TEXT.house.omaAtTheTable);
    return say(TEXT.house.theTableWhereSeeds);
  }
  if (ch === 'h') return say(TEXT.house.theFireplaceFrankReads);
  if (ch === 'k') return say(TEXT.house.theCounterAKettle);
  if (ch === 'x') return say(TEXT.house.upstairsBedroomsBoxesAnd);
  return say(TEXT.house.theHouseHoldingIts);
}
function waterShelf() {
  let n = 0;
  const s = G.save;
  for (const p of s.plants) if (!p.memorial && !p.gone && p.location === 'WINDOW' && p.stage >= 1 && !p.watered) { waterPlant(p); n++; }
  if (s.company && !s.company.gone && s.company.n > 0 && s.company.loc === 'WINDOW' && !s.company.watered) { s.company.watered = true; n++; }
  saveGame();
  say((n ? F(TEXT.house.theWholeShelfEnd, { n: n }) : TEXT.house.everyoneOnTheShelf));
}
function fridgeSeeds() {
  const s = G.save, w = s.world;
  w.flags.fridgeTray = true; s.tray.sownDay = s.day; saveGame();
  say(TEXT.house.intoTheFridgeThey);
}
function storageTrip() {
  const s = G.save, w = s.world;
  w.flags.tripDay = s.day; w.flags.trips = (w.flags.trips || 0) + 1; saveGame();
  if (w.flags.trips >= 3) {
    w.step = 6; layoutNPCs();
    return say(TEXT.house.theLastLoadGoes);
  }
  const lines = [F(TEXT.house.loadTripsOf3, { trips: w.flags.trips }), TEXT.house.theHouseGetsEmptier];
  if (w.flags.trips === 2) lines.push(TEXT.faith.greatEmptying); // gratitude as habit, under load
  say(lines);
}
function potUp() {
  const s = G.save, w = s.world;
  if (!s.tray.ready || s.tray.n <= 0) return;
  // REVISION (Nov 27, 2026): potting-up makes the Company — one collective
  // record. Names follow knowledge; the field will teach Frank who they
  // are, one at a time, as things happen to them (spec A2).
  const variety = (s.tray.pottedTotal % 2 === 0 ? 'ECHO' : 'CHANDLER');
  if (!s.company) s.company = freshCompany({ loc: 'WINDOW' });
  s.company.n++;
  s.company.vars[variety] = (s.company.vars[variety] || 0) + 1;
  s.tray.n--; s.tray.pottedTotal++;
  dexAdd('SPROUT', variety);
  saveGame();
  if (s.tray.pottedTotal === 1) {
    return say([TEXT.house.companyFirst, TEXT.house.companyFirst2, TEXT.house.companyFirst3, F(TEXT.house.companyFirst4, { n: s.tray.n })]);
  }
  if (s.tray.n === 0) return finishPotting();
  toast(F(TEXT.house.companyToast, { n: s.tray.n }));
}
function finishPotting() {
  const s = G.save, w = s.world;
  for (const p of sixPlants()) if (p.location === 'BENCH' && !p.memorial) p.location = 'WINDOW';
  if (s.company) s.company.loc = 'WINDOW';
  s.germ = { sown: 96, potted: s.tray.pottedTotal, lost: 0 };
  w.step = 8; saveGame(); layoutNPCs();
  say([TEXT.house.companyLast, F(TEXT.house.theRegisterRecordsThe, { pottedTotal: s.tray.pottedTotal }), TEXT.house.constanceNowTheHouse]);
}
function signSale() {
  const s = G.save;
  say(TEXT.house.thePapersAreSigned, () => completeChapter(2));
}

function renderArea() {
  ctx.fillStyle = '#17110c'; ctx.fillRect(0, 0, VW, VH);
  camX = Math.round(Math.max(0, Math.min(AW * TILE - VW, player.px + 8 - VW / 2)));
  camY = Math.round(Math.max(0, Math.min(AH * TILE - VH, player.py + 8 - VH / 2)));
  const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
  for (let ty = y0; ty <= y0 + 9; ty++) for (let tx = x0; tx <= x0 + 10; tx++) {
    if (tx < 0 || ty < 0 || tx >= AW || ty >= AH) continue;
    drawAreaTile(mapChar(tx, ty), tx * TILE - camX, ty * TILE - camY, tx, ty);
  }
  const spk = (mode === 'dialogue' && dlg) ? dlg.lines[dlg.idx] : null;
  const spkName = spk && dlg.chars < spk.text.length ? spk.name : null;
  player.talk = spkName === 'FRANK';
  const ents = [];
  for (const n of npcList) ents.push({ y: n.ty * TILE, draw: () => drawNPCFigure(n, n.tx * TILE - camX, n.ty * TILE - camY, spkName === n.name) });
  if (!alvinAway()) ents.push({ y: alvin.py, draw: () => charSprite(alvin, ALVIN_SET) });
  ents.push({ y: player.py, draw: () => charSprite(player, FRANK_SET) });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  drawAreaProps();
  ctx.fillStyle = 'rgba(20,26,20,0.8)'; ctx.fillRect(2, 2, 34, 9);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(2, 10, 34, 1);
  drawText(F(TEXT.hud.dayDay, { day: G.save.day }), 4, 4, '#ffffff', 1);
}
/* field bushes and goats for the Berryhill overlay (art overhaul,
   Nov 27, 2026): little shaded sprites where flat rects used to be */
const FIELD_BUSH = tileCanvas(c => {
  c.fillStyle = 'rgba(30,60,25,0.30)'; c.fillRect(2, 13, 12, 2);
  c.fillStyle = '#2c6e24'; c.fillRect(3, 5, 10, 8); c.fillRect(2, 7, 12, 5);
  c.fillStyle = '#3f9433'; c.fillRect(4, 4, 8, 7); c.fillRect(3, 6, 10, 4);
  c.fillStyle = '#57b84a'; c.fillRect(5, 5, 4, 3); c.fillRect(9, 7, 3, 2);
  c.fillStyle = '#83d95f'; c.fillRect(6, 5, 2, 1); c.fillRect(10, 6, 1, 1);
});
const FIELD_BUSH_DRY = tileCanvas(c => {
  c.fillStyle = 'rgba(30,60,25,0.30)'; c.fillRect(2, 13, 12, 2);
  c.fillStyle = '#5d6e2a'; c.fillRect(3, 5, 10, 8); c.fillRect(2, 7, 12, 5);
  c.fillStyle = '#7a8a3a'; c.fillRect(4, 4, 8, 7); c.fillRect(3, 6, 10, 4);
  c.fillStyle = '#9aa84e'; c.fillRect(5, 5, 4, 3); c.fillRect(9, 7, 3, 2);
  c.fillStyle = '#c2cc74'; c.fillRect(6, 5, 2, 1); c.fillRect(10, 6, 1, 1);
});
const GOAT_PAL = { k: '#282521', w: '#f4eede', W: '#dbd4bd', e: '#1e1b17', h: '#cdc1a4' };
const GOAT = makeSprite([
'..............',
'.kk...........',
'kwwk..........',
'kweewk.kkkk...',
'.kwwwwwwwwwk..',
'..kwwwwwwwwk..',
'..kwwWWwwwwk..',
'..kwk.kw.kwk..',
'..kwk.kw.kwk..',
'..kkk.kk.kkk..',
'..............',
], GOAT_PAL);
const GOAT_GRAZE = makeSprite([
'..............',
'..............',
'..kkkk........',
'.kwwwwkkk.....',
'.kwwwwwwwwwk..',
'..kwwwwwwwwk..',
'..kwwWWwwwwk..',
'..kwk.kw.kwk..',
'..kwk.kw.kwk..',
'..kkk.kk.kkk..',
'....kwek......',
], GOAT_PAL);
function renderBerry() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  camX = Math.round(Math.max(0, Math.min(AW * TILE - VW, player.px + 8 - VW / 2)));
  camY = Math.round(Math.max(0, Math.min(AH * TILE - VH, player.py + 8 - VH / 2)));
  const winter = seasonOf(G.save.day).idx === 3;
  const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
  for (let ty = y0; ty <= y0 + 9; ty++) for (let tx = x0; tx <= x0 + 10; tx++) {
    if (tx < 0 || ty < 0 || tx >= AW || ty >= AH) continue;
    const ch = mapChar(tx, ty), sx = tx * TILE - camX, sy = ty * TILE - camY;
    let base = TILES.grass;
    if (ch === 'g') { const h = (tx * 31 + ty * 17) % 9; base = h === 0 ? TILES.tuft : h === 4 ? TILES.grass3 : h === 6 ? TILES.grass4 : h === 7 ? TILES.grass2 : TILES.grass; }
    if (winter && SNOW_TILES.grass) base = SNOW_TILES[base === TILES.tuft ? 'tuft' : base === TILES.tuftB ? 'tuftB' : base === TILES.grass3 ? 'grass3' : base === TILES.grass4 ? 'grass4' : base === TILES.grass2 ? 'grass2' : 'grass'] || base;
    ctx.drawImage(base, sx, sy);
    let t = TILES[TILEMAP[ch]];
    if (ch === 'o') t = TILES.flower;
    if (winter && SNOW_TILES[TILEMAP[ch]]) t = SNOW_TILES[TILEMAP[ch]];
    if (t && TILEMAP[ch] !== 'grass') ctx.drawImage(t, sx, sy);
    if (ch === 'T') { // soft ground shadow, then the canopy anchored bottom-centre on its tile
      ctx.fillStyle = 'rgba(30,60,25,0.30)';
      ctx.beginPath(); ctx.ellipse(sx + 10, sy + 14, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(winter && SNOW_TREE ? SNOW_TREE : TREE, sx - 16, sy - 40);
    }
    if (ch === 's' && ty >= 13) { // the field: combed soil, waiting for stakes
      ctx.fillStyle = 'rgba(90,58,30,0.35)'; ctx.fillRect(sx, sy + 3, TILE, 1); ctx.fillRect(sx, sy + 10, TILE, 1);
    }
  }
  { // chapter 6 field furniture: tarp bands, fence run, mulch pile, the bad shed, planted rows
    const s6 = G.save, w6 = s6.world;
    if (w6.ch >= 6) {
      const bands = [[1, 5], [6, 10], [11, 15], [16, 19], [20, 24]];
      bands.forEach(([x0, x1], bi) => {
        const st = s6.field.tarp[bi] || 0;
        if (st === 1 || st === 4) { ctx.fillStyle = 'rgba(32,36,42,0.55)'; ctx.fillRect(x0 * TILE - camX, 13 * TILE - camY, (x1 - x0 + 1) * TILE, 4 * TILE); ctx.fillStyle = 'rgba(200,210,225,0.35)'; ctx.fillRect(x0 * TILE - camX, 13 * TILE - camY, (x1 - x0 + 1) * TILE, 1); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0 * TILE - camX, 17 * TILE - camY - 1, (x1 - x0 + 1) * TILE, 1); }
        if (st === 2) { ctx.fillStyle = 'rgba(32,36,42,0.3)'; ctx.fillRect(x0 * TILE - camX, 13 * TILE - camY, (x1 - x0 + 1) * TILE, 4 * TILE); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x0 * TILE - camX + 2, 13 * TILE - camY + 2, 6, 2); }
        if (st === 3) { ctx.fillStyle = 'rgba(122,90,160,0.25)'; ctx.fillRect(x0 * TILE - camX, 13 * TILE - camY, (x1 - x0 + 1) * TILE, 4 * TILE); }
      });
      ctx.fillStyle = 'rgba(60,35,10,0.30)'; ctx.fillRect(1 * TILE - camX + 2, 13 * TILE - camY + 20, 12, 2); // the mulch pile's shade
      ctx.fillStyle = '#8a6f45'; ctx.fillRect(1 * TILE - camX + 3, 13 * TILE - camY + 14, 10, 8); // the mulch pile
      ctx.fillStyle = '#a8895c'; ctx.fillRect(1 * TILE - camX + 4, 13 * TILE - camY + 13, 6, 3);
      ctx.fillStyle = '#5d4a30'; ctx.fillRect(1 * TILE - camX + 5, 13 * TILE - camY + 10, 6, 5);
      ctx.fillStyle = '#c9a86a'; ctx.fillRect(1 * TILE - camX + 6, 13 * TILE - camY + 11, 2, 1); ctx.fillRect(1 * TILE - camX + 9, 13 * TILE - camY + 16, 2, 1);
      if (s6.world.flags.goats) { // the goats, in their pen by the good shed
        ctx.fillStyle = 'rgba(30,60,25,0.28)'; ctx.fillRect(23 * TILE - camX + 3, 5 * TILE - camY + 14, 11, 2); ctx.fillRect(24 * TILE - camX + 5, 6 * TILE - camY + 14, 11, 2);
        ctx.drawImage(GOAT, 23 * TILE - camX + 2, 5 * TILE - camY + 4);
        ctx.drawImage(GOAT_GRAZE, 24 * TILE - camX + 4, 6 * TILE - camY + 4);
      }
      if (s6.world.flags.proudShoot) { ctx.fillStyle = '#3f7a2e'; ctx.fillRect(24 * TILE - camX + 7, 11 * TILE - camY + 16, 2, 8); }
      if (s6.world.ch >= 8) { // the burn pile, and the proud weed while it stands
        ctx.fillStyle = 'rgba(30,25,20,0.30)'; ctx.fillRect(4 * TILE - camX + 3, 10 * TILE - camY + 21, 12, 2);
        ctx.fillStyle = '#38322a'; ctx.fillRect(4 * TILE - camX + 4, 10 * TILE - camY + 16, 10, 6);
        ctx.fillStyle = '#5d4a30'; ctx.fillRect(4 * TILE - camX + 6, 10 * TILE - camY + 12, 6, 5);
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(4 * TILE - camX + 7, 10 * TILE - camY + 12, 4, 2); // ash on top
        ctx.fillStyle = '#c3c9d1'; ctx.fillRect(4 * TILE - camX + 8, 10 * TILE - camY + 12, 2, 1);
        if ((s6.world.step || 0) >= 2 && !s6.world.flags.proudBurned) {
          const pw = 24 * TILE - camX, ph = 11 * TILE - camY;
          ctx.fillStyle = '#2e5a22'; ctx.fillRect(pw + 7, ph + 2, 3, 28);
          ctx.fillStyle = '#3f7a2e'; ctx.fillRect(pw + 2, ph + 6, 13, 4); ctx.fillRect(pw + 3, ph + 14, 11, 4);
          ctx.fillStyle = '#57b84a'; ctx.fillRect(pw + 3, ph + 6, 5, 2); ctx.fillRect(pw + 4, ph + 14, 5, 2); // lit leaf tops
          ctx.fillStyle = '#2c6e24'; ctx.fillRect(pw + 1, ph + 20, 15, 5); ctx.fillRect(pw + 3, ph + 25, 11, 3); // its skirts
          ctx.fillStyle = '#57b84a'; ctx.fillRect(pw + 2, ph + 20, 6, 2);
          ctx.fillStyle = '#c94a6b'; ctx.fillRect(pw + 6, ph, 5, 5); // one poisonous flower, showing off
        }
      }
      // the tumbledown bad shed at the field's back corner
      ctx.fillStyle = '#4a4238'; ctx.fillRect(23 * TILE - camX, 16 * TILE - camY + 6, 2 * TILE, 10);
      ctx.fillStyle = '#38322a'; ctx.fillRect(23 * TILE - camX + 8, 16 * TILE - camY + 6, 1, 10); ctx.fillRect(23 * TILE - camX + 16, 16 * TILE - camY + 6, 1, 10); ctx.fillRect(23 * TILE - camX + 24, 16 * TILE - camY + 6, 1, 10); // plank seams
      ctx.fillStyle = '#5d5347'; ctx.fillRect(23 * TILE - camX + 2, 16 * TILE - camY + 8, 5, 3); // one board still honest
      ctx.fillStyle = '#38322a'; ctx.fillRect(23 * TILE - camX - 2, 16 * TILE - camY + 2, 2 * TILE + 4, 5);
      ctx.fillStyle = '#575046'; ctx.fillRect(23 * TILE - camX - 2, 16 * TILE - camY + 2, 2 * TILE + 4, 1); // roof lip, lit
      // the fence's second run, segment by segment
      for (let sg = 0; sg < 4; sg++) if (s6.field.fenceSeg[sg]) {
        ctx.fillStyle = '#e3ddc9'; ctx.fillRect((1 + sg * 6) * TILE - camX, 12 * TILE - camY + 12, 6 * TILE, 2);
        ctx.fillStyle = '#b3ab94'; ctx.fillRect((1 + sg * 6) * TILE - camX, 12 * TILE - camY + 13, 6 * TILE, 1);
        ctx.fillStyle = '#8a6f45'; ctx.fillRect((1 + sg * 6) * TILE - camX + 2, 12 * TILE - camY + 10, 3, 6); ctx.fillRect((1 + sg * 6 + 5) * TILE - camX + 11, 12 * TILE - camY + 10, 3, 6); // its posts
      }
      if (s6.world.ch === 9 && (s6.world.step === 1 || s6.world.step === 2)) { // bees, working the blossom
        ctx.fillStyle = '#ffd94a';
        for (let bi2 = 0; bi2 < 4; bi2++) {
          const bx = (3 + bi2 * 6) * TILE - camX + 8 + Math.sin(perfNow / 280 + bi2 * 2.1) * 5, by = 14 * TILE - camY + 6 + Math.cos(perfNow / 340 + bi2) * 3;
          ctx.fillRect(bx, by, 3, 2); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(bx + 1, by - 1, 1, 1); ctx.fillStyle = '#ffd94a';
        }
      }
      // planted rows: little bushes, in their rows
      for (const p of s6.plants) {
        if (p.memorial || !p.location.startsWith('ROW')) continue;
        const rn = p.row || 1, idx = s6.plants.filter(q => q.row === rn && !q.memorial).indexOf(p);
        const bp = rowBushPos(rn, idx);
        const px = bp.x * TILE - camX, py = bp.y * TILE - camY;
        ctx.drawImage(p.health >= 2 ? FIELD_BUSH_DRY : FIELD_BUSH, px, py);
      }
      // the rows' counted bushes draw after their Favorites
      for (let rn2 = 1; rn2 <= 12; rn2++) {
        const row2 = s6.cropRows[rn2 - 1];
        if (!row2 || !(row2.bushCount > 0)) continue;
        const favN = s6.plants.filter(q => q.row === rn2 && !q.memorial).length;
        for (let bi3 = 0; bi3 < row2.bushCount; bi3++) {
          const idx = favN + bi3;
          const bp = rowBushPos(rn2, idx);
          const px = bp.x * TILE - camX, py = bp.y * TILE - camY;
          ctx.drawImage((row2.rowHealth || 0) >= 2 ? FIELD_BUSH_DRY : FIELD_BUSH, px, py);
        }
      }
    }
  }
  // field weed patches: a decor layer in the lanes between the rows
  for (const w of (G.save.weeds || [])) {
    if ((w.area || 'yard') !== 'field') continue;
    const sx = w.x * TILE - camX, sy = w.y * TILE - camY;
    if (sx < -16 || sy < -16 || sx > VW || sy > VH) continue;
    ctx.drawImage(w.deep ? WEED_DEEP : WEED_TUFT, sx, sy);
  }
  if (G.save.world.flags.staked) { // corner stakes and string over the field
    ctx.fillStyle = '#e8e2d2';
    for (const [sx2, sy2] of [[1, 13], [24, 13], [1, 16], [24, 16]]) ctx.fillRect(sx2 * TILE - camX + 6, sy2 * TILE - camY + 2, 3, 8);
    ctx.fillStyle = 'rgba(232,226,210,0.5)';
    for (let r2 = 0; r2 < 12; r2++) ctx.fillRect((2 * r2 + 1) * TILE - camX + 7, 13 * TILE - camY + 8, 1, 4 * TILE - 8); // strings run down the rows
  }
  if (G.save.world.ch >= 4) { // the inherited irises by the barn wall
    const ix = 6 * TILE - camX, iy = 5 * TILE - camY;
    ctx.fillStyle = '#2c6e24'; ctx.fillRect(ix + 2, iy + 8, 12, 6); ctx.fillRect(ix + 18, iy + 8, 12, 6);
    ctx.fillStyle = '#57b84a'; ctx.fillRect(ix + 3, iy + 8, 4, 2); ctx.fillRect(ix + 19, iy + 8, 4, 2); ctx.fillRect(ix + 8, iy + 9, 3, 2); ctx.fillRect(ix + 24, iy + 9, 3, 2); // lit leaf blades
    ctx.fillStyle = '#7a5aa0'; ctx.fillRect(ix + 4, iy + 3, 3, 5); ctx.fillStyle = '#9a7cc0'; ctx.fillRect(ix + 4, iy + 3, 3, 1); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(ix + 20, iy + 3, 3, 5); ctx.fillStyle = '#ffd94a'; ctx.fillRect(ix + 12, iy + 4, 3, 4); ctx.fillStyle = '#fff3b0'; ctx.fillRect(ix + 12, iy + 4, 3, 1);
  }
  if (G.save.world.ch === 5 && (G.save.world.step || 0) >= 1 && !G.save.world.flags.patchCleared) { // the bramble patch
    const bx = 23 * TILE - camX, by = 6 * TILE - camY;
    ctx.fillStyle = '#2e4a26'; ctx.fillRect(bx + 1, by + 4, 30, 26);
    ctx.fillStyle = '#3f7a2e'; for (let i = 0; i < 6; i++) ctx.fillRect(bx + 3 + i * 5, by + 2 + (i % 3) * 3, 3, 8);
    ctx.fillStyle = '#57b84a'; for (let i = 0; i < 5; i++) ctx.fillRect(bx + 4 + i * 6, by + 8 + (i % 2) * 7, 4, 3); // lit leaf clusters
    ctx.fillStyle = '#24591d'; for (let i = 0; i < 4; i++) ctx.fillRect(bx + 5 + i * 7, by + 22 + (i % 2) * 3, 5, 3); // shaded depths
    ctx.fillStyle = '#20242a'; for (let i = 0; i < 4; i++) ctx.fillRect(bx + 6 + i * 7, by + 20 + (i % 2) * 4, 2, 2); // old berries, watching
  }
  // the greenhouse, in its three acts: site, frame and shell, glass house
  const bs = G.save.world.flags.buildStep || 0;
  if (G.save.world.ch >= 3) {
    const gx = 18 * TILE - camX, gy = 8 * TILE - camY;
    if (bs === 1) { ctx.strokeStyle = '#8a6f45'; ctx.fillStyle = '#8a6f45'; for (let i = 0; i < 5; i++) ctx.fillRect(gx + i * 16 + 2, gy + 2, 3, 44); ctx.fillRect(gx + 2, gy + 2, 78, 3); }
    else if (bs === 2) { ctx.fillStyle = 'rgba(190,220,245,0.5)'; ctx.fillRect(gx + 2, gy + 2, 76, 44); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(gx + 8, gy + 6, 10, 3); ctx.fillRect(gx + 22, gy + 12, 8, 2); ctx.fillStyle = '#8a6f45'; for (let i = 0; i < 5; i++) ctx.fillRect(gx + i * 16 + 2, gy + 2, 3, 44); ctx.fillRect(gx + 2, gy + 2, 78, 3); ctx.fillRect(gx + 2, gy + 24, 78, 2); }
    else if (bs >= 3) { ctx.fillStyle = 'rgba(190,220,245,0.65)'; ctx.fillRect(gx + 2, gy + 2, 76, 44); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(gx + 8, gy + 6, 12, 3); ctx.fillRect(gx + 26, gy + 14, 9, 2); ctx.fillRect(gx + 52, gy + 8, 10, 3); ctx.fillStyle = '#e8f4fc'; for (let i = 0; i < 5; i++) ctx.fillRect(gx + i * 16 + 2, gy + 2, 2, 44); ctx.fillRect(gx + 2, gy + 2, 78, 2); ctx.fillStyle = 'rgba(90,110,130,0.35)'; ctx.fillRect(gx + 2, gy + 40, 78, 6); ctx.fillStyle = '#5e4c36'; ctx.fillRect(gx + 36, gy + 34, 10, 12); ctx.fillStyle = '#8a6f45'; ctx.fillRect(gx + 36, gy + 34, 10, 2); }
  }
  const spk = (mode === 'dialogue' && dlg) ? dlg.lines[dlg.idx] : null;
  const spkName = spk && dlg.chars < spk.text.length ? spk.name : null;
  player.talk = spkName === 'FRANK';
  const ents = [];
  ents.push({ y: constance.py, draw: () => charSprite({ px: constance.tx * TILE, py: constance.ty * TILE, dir: constance.dir, moving: false, blinkOff: 1.9, talk: spkName === 'CONSTANCE' }, CONSTANCE_SET) });
  for (const n of npcList) ents.push({ y: n.ty * TILE, draw: () => drawNPCFigure(n, n.tx * TILE - camX, n.ty * TILE - camY, spkName === n.name) });
  if (!alvinAway()) ents.push({ y: alvin.py, draw: () => charSprite(alvin, ALVIN_SET) });
  ents.push({ y: player.py, draw: () => charSprite(player, FRANK_SET) });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  ctx.fillStyle = 'rgba(20,26,20,0.8)'; ctx.fillRect(2, 2, 34, 9);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(2, 10, 34, 1);
  drawText(F(TEXT.hud.dayDay, { day: G.save.day }), 4, 4, '#ffffff', 1);
}
function drawAreaTile(ch, sx, sy, tx, ty) {
  if (area === 'house' || area === 'barnIn' || area === 'oma') return drawHouseTile(ch, sx, sy, tx, ty);
  if (area === 'green') return drawGreenTile(ch, sx, sy, tx, ty);
  ctx.fillStyle = '#2a2f26'; ctx.fillRect(sx, sy, TILE, TILE);
}
function drawGreenTile(ch, sx, sy, tx, ty) {
  // gravel-and-earth floor: furrowed soil tones with pebble flecks
  ctx.drawImage(TILES.soil, sx, sy);
  ctx.fillStyle = 'rgba(60,35,10,0.28)'; ctx.fillRect(sx, sy + 12, TILE, 1);
  ctx.fillStyle = 'rgba(255,240,200,0.20)'; ctx.fillRect(sx + 3, sy + 4, 2, 1); ctx.fillRect(sx + 10, sy + 9, 2, 1);
  if (ch === 'z' || ch === 'D') { if (ch === 'D') { // the door mat, woven green
    ctx.fillStyle = '#5e7a4a'; ctx.fillRect(sx + 1, sy + 4, 14, 9);
    ctx.fillStyle = '#6d8a56'; ctx.fillRect(sx + 2, sy + 5, 12, 7);
    ctx.fillStyle = '#4a6339'; ctx.fillRect(sx + 3, sy + 6, 10, 5);
    ctx.fillStyle = '#3d552e'; ctx.fillRect(sx + 1, sy + 4, 14, 1); ctx.fillRect(sx + 1, sy + 12, 14, 1);
  } return; }
  if (ch === 'H') { // glass: pale panes in a white frame, sky showing through
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + 16); grad.addColorStop(0, '#dceefb'); grad.addColorStop(1, '#a8cdea');
    ctx.fillStyle = grad; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(sx + 2, sy + 2, 5, 5); ctx.fillRect(sx + 3, sy + 3, 2, 2); // sky shine
    ctx.fillStyle = 'rgba(127,178,232,0.5)'; ctx.fillRect(sx + 9, sy + 10, 5, 4); // reflected green depths
    ctx.fillStyle = '#f4f8fc'; ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy + 15, TILE, 1); ctx.fillRect(sx, sy, 1, TILE); ctx.fillRect(sx + 15, sy, 1, TILE);
    ctx.fillStyle = '#c8d6e2'; ctx.fillRect(sx, sy + 15, TILE, 1);
    return;
  }
  if (ch === 'a') { // a bench: slatted wood at working height, shaded legs
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx + 1, sy + 13, 14, 2);
    ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx, sy + 6, TILE, 4);
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx, sy + 6, TILE, 1);
    ctx.fillStyle = '#6e5836'; ctx.fillRect(sx, sy + 8, TILE, 1);
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx + 2, sy + 10, 2, 6); ctx.fillRect(sx + 12, sy + 10, 2, 6);
    return;
  }
  if (ch === 'h') { // the little stove: iron body, pipe, a fire door that glows when lit
    ctx.fillStyle = 'rgba(60,35,10,0.30)'; ctx.fillRect(sx + 2, sy + 14, 12, 2);
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(sx + 2, sy + 5, 12, 11);
    ctx.fillStyle = '#565e6c'; ctx.fillRect(sx + 2, sy + 5, 12, 2); ctx.fillRect(sx + 2, sy + 5, 2, 11); // lit top + edge
    ctx.fillStyle = '#20242a'; ctx.fillRect(sx + 2, sy + 15, 12, 1);
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(sx + 7, sy - 4, 3, 9);
    ctx.fillStyle = '#454b58'; ctx.fillRect(sx + 7, sy - 4, 1, 9);
    const lit = G.save.world.flags.heaterLit;
    ctx.fillStyle = lit ? '#e07b2a' : '#20242a'; ctx.fillRect(sx + 5, sy + 9, 6, 4);
    if (lit) { ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx + 7, sy + 10, 2, 2); ctx.fillStyle = '#fff3b0'; ctx.fillRect(sx + 7, sy + 10, 1, 1); }
    ctx.fillStyle = '#8a919c'; ctx.fillRect(sx + 10, sy + 10, 1, 2); // latch
    return;
  }
}
function drawHouseTile(ch, sx, sy, tx, ty) {
  // warm plank floor everywhere first: lit board tops, dark seams,
  // staggered joints and the odd knot — placed by the tile hash
  const fh = tileHash(tx, ty, 21);
  ctx.fillStyle = '#a06a3c'; ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = fh > 0.5 ? 'rgba(255,220,160,0.06)' : 'rgba(60,30,0,0.06)'; ctx.fillRect(sx, sy, TILE, TILE); // board tone drifts tile to tile
  ctx.fillStyle = '#b57f4a'; ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy + 8, TILE, 1);
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(sx, sy + 7, TILE, 1); ctx.fillRect(sx, sy + 15, TILE, 1);
  if (fh > 0.35) ctx.fillStyle = '#7d5327', ctx.fillRect(sx + ((tx * 7 + ty * 3) % 9), sy, 1, 7);
  if (fh < 0.65) ctx.fillStyle = '#7d5327', ctx.fillRect(sx + ((tx * 5 + ty * 11) % 13), sy + 8, 1, 7);
  if (fh > 0.72) { ctx.fillStyle = '#8a5a30'; ctx.fillRect(sx + 3 + Math.floor(fh * 10) % 9, sy + 3, 2, 1); }
  if (ch === 'z') return;
  if (ch === 'Z') { // the rug: deep red, double border, a worn diamond at its heart
    ctx.fillStyle = '#8e3b34'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#6e2a24'; ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy + 15, TILE, 1); ctx.fillRect(sx, sy, 1, TILE); ctx.fillRect(sx + 15, sy, 1, TILE);
    ctx.fillStyle = '#c9853e'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, 1); ctx.fillRect(sx + 2, sy + 13, TILE - 4, 1); ctx.fillRect(sx + 2, sy + 2, 1, TILE - 4); ctx.fillRect(sx + 13, sy + 2, 1, TILE - 4);
    ctx.fillStyle = '#a34a41'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#c9853e'; ctx.fillRect(sx + 7, sy + 6, 2, 2); ctx.fillRect(sx + 6, sy + 7, 4, 1); ctx.fillRect(sx + 7, sy + 8, 2, 1);
    ctx.fillStyle = 'rgba(232,226,210,0.20)'; ctx.fillRect(sx + 5, sy + 5, 3, 1); // worn sheen
    return;
  }
  if (ch === 'H') { // interior wall: warm cream over panelled wainscot, baseboard below
    ctx.fillStyle = '#6b5136'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#e9dcbe'; ctx.fillRect(sx, sy, TILE, 9);
    ctx.fillStyle = '#f4ecd4'; ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillStyle = 'rgba(160,130,80,0.25)'; ctx.fillRect(sx + 3, sy + 2, 1, 6); ctx.fillRect(sx + 11, sy + 2, 1, 6); // faint paper stripes
    ctx.fillStyle = '#cbb894'; ctx.fillRect(sx, sy + 9, TILE, 1); // chair rail
    ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx, sy + 10, TILE, 5);
    ctx.fillStyle = '#75582f'; ctx.fillRect(sx + 2, sy + 11, 4, 3); ctx.fillRect(sx + 10, sy + 11, 4, 3); // panels
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx, sy + 15, TILE, 1); // baseboard shade
    return;
  }
  if (ch === 'a') { // the window shelf: a bright framed window over pale wood
    ctx.fillStyle = '#f7f7f2'; ctx.fillRect(sx, sy, TILE, 10);
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + 9); grad.addColorStop(0, '#cfeaff'); grad.addColorStop(1, '#8fc0f0');
    ctx.fillStyle = grad; ctx.fillRect(sx + 2, sy + 1, 12, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(sx + 3, sy + 2, 3, 4); // sky shine
    ctx.fillStyle = '#7fb2e8'; ctx.fillRect(sx + 10, sy + 5, 3, 3); // far hill through the glass
    ctx.fillStyle = '#f7f7f2'; ctx.fillRect(sx + 7, sy + 1, 2, 8); ctx.fillRect(sx + 2, sy + 4, 12, 1); // muntins
    ctx.fillStyle = '#20242a'; ctx.fillRect(sx + 1, sy, 1, 10); ctx.fillRect(sx + 14, sy, 1, 10); ctx.fillRect(sx, sy + 9, TILE, 1);
    ctx.fillStyle = '#a8895c'; ctx.fillRect(sx, sy + 10, TILE, 6); // the shelf board
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx, sy + 10, TILE, 1);
    ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx, sy + 14, TILE, 2);
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx, sy + 13, TILE, 1); // shade under the board
    return;
  }
  if (ch === 'r') { // the fridge: tall, white, humming faintly with importance
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx + 2, sy + 14, 13, 2); // floor shade
    ctx.fillStyle = '#eef1f4'; ctx.fillRect(sx + 1, sy - 6, 14, 22);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 2, sy - 5, 3, 20); // lit left face
    ctx.fillStyle = '#c9ced4'; ctx.fillRect(sx + 13, sy - 6, 2, 22); ctx.fillRect(sx + 1, sy + 3, 14, 1); // shaded edge + door split
    ctx.fillStyle = '#8a919c'; ctx.fillRect(sx + 12, sy - 3, 2, 5); ctx.fillRect(sx + 12, sy + 5, 2, 7); // handles
    ctx.fillStyle = '#20242a'; ctx.fillRect(sx + 1, sy - 6, 14, 1); ctx.fillRect(sx + 1, sy + 15, 14, 1);
    ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx + 3, sy - 4, 4, 5); // a note, held by a magnet
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(sx + 3, sy - 4, 4, 1);
    ctx.fillStyle = '#b03030'; ctx.fillRect(sx + 4, sy - 5, 2, 2);
    return;
  }
  if (ch === 'k') { // kitchen counter: speckled stone top, panelled wood front
    ctx.fillStyle = '#7a6248'; ctx.fillRect(sx, sy + 4, TILE, 12);
    ctx.fillStyle = '#8a7154'; ctx.fillRect(sx + 2, sy + 8, 5, 6); ctx.fillRect(sx + 9, sy + 8, 5, 6); // cabinet panels
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx + 3, sy + 9, 10, 1); ctx.fillRect(sx, sy + 15, TILE, 1);
    ctx.fillStyle = '#d8cfc0'; ctx.fillRect(sx, sy + 2, TILE, 4);
    ctx.fillStyle = '#efe9dc'; ctx.fillRect(sx, sy + 2, TILE, 1);
    ctx.fillStyle = '#b8ab94'; ctx.fillRect(sx + 3, sy + 4, 2, 1); ctx.fillRect(sx + 9, sy + 3, 2, 1); ctx.fillRect(sx + 12, sy + 5, 2, 1); // stone speckle
    ctx.fillStyle = 'rgba(60,35,10,0.30)'; ctx.fillRect(sx, sy + 6, TILE, 1); // shade under the top
    return;
  }
  if (ch === 'j') { // Frank's desk, and the journal that lives on it now
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx + 1, sy + 14, 14, 2);
    ctx.fillStyle = '#7a6248'; ctx.fillRect(sx, sy + 5, TILE, 11);
    ctx.fillStyle = '#8a7154'; ctx.fillRect(sx, sy + 5, TILE, 2);
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx, sy + 14, TILE, 2); ctx.fillRect(sx + 2, sy + 9, 4, 4); // drawer front
    ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx + 3, sy + 10, 1, 1); // drawer knob
    ctx.fillStyle = '#8a2f2a'; ctx.fillRect(sx + 3, sy + 1, 9, 5); // the journal
    ctx.fillStyle = '#a33327'; ctx.fillRect(sx + 3, sy + 1, 9, 1);
    ctx.fillStyle = '#f8f0d8'; ctx.fillRect(sx + 4, sy + 2, 7, 3);
    ctx.fillStyle = '#8a919c'; ctx.fillRect(sx + 5, sy + 3, 5, 1);
    ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx + 13, sy + 4, 3, 1); ctx.fillRect(sx + 15, sy + 4, 1, 1); // the pencil
    return;
  }
  if (ch === 'h') { // the fireplace: brick, mantel, logs and a living flame
    ctx.fillStyle = '#7a4636'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#8a5340'; ctx.fillRect(sx, sy, TILE, 2); // mantel shelf, lit
    ctx.fillStyle = '#5e3427'; ctx.fillRect(sx + 1, sy + 5, 6, 1); ctx.fillRect(sx + 9, sy + 5, 6, 1); ctx.fillRect(sx + 5, sy + 9, 6, 1); // mortar lines
    ctx.fillStyle = '#20242a'; ctx.fillRect(sx + 3, sy + 6, 10, 10); // firebox
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx + 5, sy + 13, 7, 2); ctx.fillRect(sx + 6, sy + 12, 5, 1); // logs
    const fl = Math.floor(perfNow * 6) % 2;
    ctx.fillStyle = '#e07b2a'; ctx.fillRect(sx + 5, sy + 10 - fl, 6, 5 + fl);
    ctx.fillStyle = '#ffd94a'; ctx.fillRect(sx + 7, sy + 11 - fl, 2, 3 + fl);
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(sx + 7, sy + 12 - fl, 1, 1);
    return;
  }
  if (ch === 'e') { // the dining table: a cloth runner band that tiles
    // along the table's length — wood above and below, cream between,
    // with the red pinstripes that mark the runner's edges
    ctx.fillStyle = '#8a5f38'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#a5713d'; ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy + 15, TILE, 1);
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(sx, sy + 3, TILE, 10);
    ctx.fillStyle = '#f7f3e6'; ctx.fillRect(sx, sy + 3, TILE, 2); // lit fold
    ctx.fillStyle = '#b03030'; ctx.fillRect(sx, sy + 5, TILE, 1); ctx.fillRect(sx, sy + 11, TILE, 1); // pinstripes
    ctx.fillStyle = '#c9bfa8'; ctx.fillRect(sx, sy + 12, TILE, 1);
    return;
  }
  if (ch === 'm') { // a bed, made up neat: pillow, folded blanket, frame
    ctx.fillStyle = 'rgba(60,35,10,0.22)'; ctx.fillRect(sx + 1, sy + 14, 14, 2);
    ctx.fillStyle = '#7a4636'; ctx.fillRect(sx, sy + 2, TILE, 12);
    ctx.fillStyle = '#5e3427'; ctx.fillRect(sx, sy + 13, TILE, 1);
    ctx.fillStyle = '#f4f1e6'; ctx.fillRect(sx + 1, sy + 3, TILE - 2, 4); // pillow
    ctx.fillStyle = '#d8d2c0'; ctx.fillRect(sx + 1, sy + 6, TILE - 2, 1);
    ctx.fillStyle = '#8e3b34'; ctx.fillRect(sx + 1, sy + 7, TILE - 2, 6); // blanket
    ctx.fillStyle = '#a34a41'; ctx.fillRect(sx + 1, sy + 7, TILE - 2, 2); // its folded top
    ctx.fillStyle = '#c9853e'; ctx.fillRect(sx + 1, sy + 10, TILE - 2, 1); // a woven stripe
    return;
  }
  if (ch === 'x') { // stairs: lit treads, shaded risers
    ctx.fillStyle = '#6b5136'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#a8895c'; ctx.fillRect(sx, sy, TILE, 3); ctx.fillRect(sx, sy + 5, TILE, 3); ctx.fillRect(sx, sy + 10, TILE, 3);
    ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx, sy + 3, TILE, 2); ctx.fillRect(sx, sy + 8, TILE, 2); ctx.fillRect(sx, sy + 13, TILE, 2);
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx, sy + 4, TILE, 1); ctx.fillRect(sx, sy + 9, TILE, 1); ctx.fillRect(sx, sy + 14, TILE, 1);
    return;
  }
  if (ch === 'D') { // the door mat: woven, bordered, worn bright in the middle
    ctx.fillStyle = '#5e7a4a'; ctx.fillRect(sx + 1, sy + 4, 14, 9);
    ctx.fillStyle = '#6d8a56'; ctx.fillRect(sx + 2, sy + 5, 12, 7);
    ctx.fillStyle = '#4a6339'; ctx.fillRect(sx + 3, sy + 6, 10, 5);
    ctx.fillStyle = '#7ea065'; ctx.fillRect(sx + 6, sy + 7, 4, 3); // the worn patch
    ctx.fillStyle = '#3d552e'; ctx.fillRect(sx + 1, sy + 4, 14, 1); ctx.fillRect(sx + 1, sy + 12, 14, 1);
    return;
  }
}

function drawAreaProps() {
  if (area === 'barnIn' && G.save.wine.jar) { // the jar, breathing on the kitchen counter
    const jx = 9 * TILE - camX, jy = 2 * TILE - camY;
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(jx + 2, jy + 14, 12, 2); // the jar's shade on the counter
    ctx.fillStyle = '#b8c8ce'; ctx.fillRect(jx + 3, jy + 4, 10, 12);
    ctx.fillStyle = '#8fa5ad'; ctx.fillRect(jx + 11, jy + 4, 2, 12); ctx.fillRect(jx + 3, jy + 14, 10, 2); // glass in shade
    ctx.fillStyle = G.save.wine.jar.phase === 'done' ? '#7a2f4a' : '#a03a54'; ctx.fillRect(jx + 4, jy + 8, 8, 7);
    ctx.fillStyle = '#e8c39a'; ctx.fillRect(jx + 5, jy + 2, 6, 3); // the cork
    ctx.fillStyle = '#a5713d'; ctx.fillRect(jx + 9, jy + 2, 2, 3); // its shaded side
    ctx.fillStyle = '#f4f8fc'; ctx.fillRect(jx + 4, jy + 5, 1, 5); // the glint down the glass
  }
  if (area === 'barnIn') { // Frank's office: the six on the shelf, the company as small pots
    const s2 = G.save;
    for (const p of s2.plants) {
      if (p.location !== 'OFFICE' || p.memorial) continue;
      if (p.slot != null && p.slot < 6) {
        const sx = (2 + p.slot) * TILE - camX, sy = 1 * TILE - camY;
        ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], sx, sy - 1, 14, 14);
        if (p.watered) { ctx.fillStyle = '#3b6fe0'; ctx.fillRect(sx + 11, sy - 4, 2, 3); }
      }
    }
    if (s2.company && !s2.company.gone && s2.company.n > 0 && s2.company.loc === 'OFFICE') {
      const c = s2.company, pots = Math.min(9, c.n);
      for (let i = 0; i < pots; i++) {
        const sx = (11 + (i % 3)) * TILE - camX, sy = (2 + Math.floor(i / 3)) * TILE - camY;
        ctx.drawImage(POT_SPRITES[Math.min(c.stage, 3)], sx + 3, sy + 3, 10, 10);
        if (c.watered) { ctx.fillStyle = '#3b6fe0'; ctx.fillRect(sx + 11, sy - 1, 2, 3); }
      }
    }
    return;
  }
  if (area === 'green') { // the benches, north and south
    const s2 = G.save;
    const gp = s2.plants.filter(p => p.location === 'GREENHOUSE' && !p.memorial && !p.gone);
    if (s2.company && !s2.company.gone && s2.company.n > 0 && s2.company.loc === 'GREENHOUSE') gp.push({ stage: s2.company.stage, watered: s2.company.watered, health: s2.company.health });
    if (s2.nursery && s2.nursery.stock > 0) gp.push({ stage: s2.nursery.stage, watered: s2.nursery.watered, health: s2.nursery.health });
    gp.slice(0, 19).forEach((p, i) => {
      const north = i < 10;
      let bx = 1 + (i % 10);
      if (!north && bx >= 6) bx += 1; // the centre aisle: no pot sits in the walkway
      const sx = bx * TILE - camX, sy = (north ? 1 : 5) * TILE - camY;
      ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], sx + 1, sy - 1, 13, 13);
      if (p.watered) { ctx.fillStyle = '#3b6fe0'; ctx.fillRect(sx + 11, sy - 4, 2, 3); }
      if (p.health >= 2) { ctx.fillStyle = '#e0483e'; ctx.fillRect(sx + 12, sy + 9, 3, 3); }
    });
    return;
  }
  if (area === 'oma' && G.save.world.flags.stairsBuilt) { // the new stairs, in the corner
    const sx = 10 * TILE - camX, sy = 6 * TILE - camY;
    ctx.fillStyle = '#6b5136'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx, sy + 10, TILE, 3); ctx.fillRect(sx, sy + 5, TILE, 3); ctx.fillRect(sx, sy, TILE, 3);
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy + 5, TILE, 1); ctx.fillRect(sx, sy + 10, TILE, 1); // lit tread edges
    ctx.fillStyle = '#4c3a22'; ctx.fillRect(sx, sy + 15, TILE, 1); // the last riser's shade
  }
  if (area === 'oma') { // the photograph on the shelf, facing the room
    const sx = 2 * TILE - camX, sy = 1 * TILE - camY;
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx + 3, sy + 1, 9, 8);
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx + 4, sy + 2, 7, 6); // the gilt inner frame
    ctx.fillStyle = '#dceefb'; ctx.fillRect(sx + 5, sy + 3, 5, 2);
    ctx.fillStyle = '#bcd9f2'; ctx.fillRect(sx + 5, sy + 5, 5, 2);
    ctx.fillStyle = '#3f7a2e'; ctx.fillRect(sx + 5, sy + 7, 5, 1); // the field they stood in
    ctx.fillStyle = '#e8c39a'; ctx.fillRect(sx + 6, sy + 5, 1, 1); ctx.fillRect(sx + 8, sy + 5, 1, 1); // the two of them
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(sx + 6, sy + 6, 1, 1); ctx.fillRect(sx + 8, sy + 6, 1, 1);
    return;
  }
  if (area !== 'house') return;
  const s = G.save;
  // plants on the window shelf, in their slots; the tray at the west end.
  // Anchoring rule for every placed-plant display (Daniel, Nov 26, 2026:
  // the shelf sprouts floated): a pot reads as SITTING when its bowl's
  // underside overlaps the surface's top edge — the narrow foot alone
  // touching leaves it hovering on a point. Shelf/bench pots draw low
  // enough for the bowl to meet the board.
  for (const p of s.plants) {
    if (p.location !== 'WINDOW' || p.memorial) continue;
    const sx = (2 + (p.slot || 0)) * TILE - camX, sy = 1 * TILE - camY;
    ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], sx, sy - 1, 14, 14);
    if (p.watered) { ctx.fillStyle = '#3b6fe0'; ctx.fillRect(sx + 11, sy - 4, 2, 3); }
    if (p.husk) { ctx.fillStyle = '#5a5148'; ctx.fillRect(sx + 3, sy + 2, 8, 3); }
  }
  if (s.tray.n > 0 || s.world.flags.fridgeTray) {
    const sx = 1 * TILE - camX, sy = 1 * TILE - camY;
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx + 2, sy + 11, 13, 2); // the tray's shade
    ctx.fillStyle = '#5e4c36'; ctx.fillRect(sx + 1, sy + 6, 14, 6);
    ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx + 1, sy + 6, 14, 1); // its lit rim
    ctx.fillStyle = s.tray.ready ? '#7ed957' : '#c9b18a';
    for (let i = 0; i < 5; i++) ctx.fillRect(sx + 2 + i * 3, sy + 4, 2, 3);
  }
  // the great emptying: boxes multiply, then vanish, as the trips are made
  const trips = s.world.flags.trips || 0;
  if (s.world.ch === 2 && s.world.step >= 5 && trips < 3) {
    for (let i = 0; i < 3 - trips; i++) {
      const sx = (15 + i) * TILE - camX, sy = 10 * TILE - camY;
      ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx + 2, sy + 13, 13, 2);
      ctx.fillStyle = '#b08d57'; ctx.fillRect(sx + 1, sy + 3, 13, 11);
      ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx + 1, sy + 3, 13, 2); // lit top flaps
      ctx.fillStyle = '#8a6f45'; ctx.fillRect(sx + 1, sy + 8, 13, 1); ctx.fillRect(sx + 7, sy + 3, 1, 11);
      ctx.fillStyle = '#96762f'; ctx.fillRect(sx + 6, sy + 3, 3, 2); // the tape cross
    }
  }
  if (s.world.ch === 2 && s.world.step >= 8) { // the sale papers wait on the table
    const sx = 10 * TILE - camX, sy = 5 * TILE - camY;
    ctx.fillStyle = 'rgba(60,35,10,0.25)'; ctx.fillRect(sx + 4, sy + 11, 10, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 3, sy + 5, 10, 7);
    ctx.fillStyle = '#8a919c'; ctx.fillRect(sx + 5, sy + 7, 6, 1); ctx.fillRect(sx + 5, sy + 9, 6, 1);
    ctx.fillStyle = '#b03030'; ctx.fillRect(sx + 10, sy + 9, 2, 2); // a red seal, waiting
  }
}

function layoutNPCs() { npcList = npcsFor(area); }

/* ============================== STATE ============================== */
const STAGE_NAMES = TEXT.names.empty;
const MAX_VIGOR = [0, 0, 22, 28, 36, 32, 40]; // Blossom dips: a flowering bush is tender
/* Seasons: 56-day years, 14-day seasons (spec 0.1). Everything seasonal —
   growth gates, chill, rain, the yard's snow — reads this one function. */
const SEASON_NAMES = TEXT.names.spring;
function seasonOf(day) {
  const doy = ((day - 1) % 56) + 1;
  return { year: Math.floor((day - 1) / 56) + 1, idx: Math.floor((doy - 1) / 14), dos: ((doy - 1) % 14) + 1, doy };
}
function hashDay(n) { let x = (n * 374761393 + 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return (x ^ (x >>> 16)) >>> 0; }
const SIX_VARIETY = ['ECHO', 'ECHO', 'CHANDLER', 'CHANDLER', 'CHANDLER', 'CHANDLER'];
const HEALTH_NAMES = TEXT.names.fine;
const DRY_THRESH = { pot: [2, 3, 4], garden: [4, 6, 8], field: [5, 8, 11] }; // dry days to STRESSED/DECLINING/CRITICAL, by housing
/* Frank's naming pools, in the order he reaches for them: the ranks he has
   not used, the virtues he has not used, then the deep bench of good names.
   A trailing 2 is an honour suffix — ADMIRAL2 is christened ADMIRAL II. */
const NAME_POOLS = TEXT.names.pools;
function allocName(plants) {
  const used = new Set(plants.filter(p => !p.memorial).map(p => p.name));
  for (const pool of NAME_POOLS) for (const raw of pool) {
    const nm = (raw.endsWith('2') ? F(TEXT.misc.slicevalIi, { sliceVal: raw.slice(0, -1) }) : raw);
    if (!used.has(nm)) return nm;
  }
  let n = plants.length + 1;
  while (used.has('PLANT ' + n)) n++;
  return F(TEXT.misc.plantN, { n: n });
}
/* Every plant is an individual with a name Frank gave it (roll call order —
   Constance noted, correctly, that it is alphabetical). A plant lives on the
   bench; the register is a journal of lives, never a storage box. */
const PLANT_NAMES = TEXT.names.admiral;
function freshPlant(name, o) {
  o = o || {};
  return Object.assign({
    name, variety: 'CHANDLER', stage: 0, wateredDays: 0, watered: false, vigor: 0, tended: 0,
    sownDay: null, sproutedDay: null, seedlingDay: null, bushDay: null, blossomDay: null, fruitDay: null,
    location: 'BENCH', slot: null, row: null,
    dirt: false, dirtCredit: 0, // good dirt: a permanent mark + banked growth credit
    health: 0, dryDays: 0, critSince: null, warnedDay: null, lastRescue: null,
    wintered: false, chill: 0, history: [], harvestByYear: {},
    memorial: false, diedDay: null, cause: null, husk: false, firstHarvestDay: null, firstHarvestLbs: null,
    firstSix: false, gardenState: null, giftName: false, fruitSetOk: false,
    fav: false, gone: false, // REVISION (Nov 27, 2026): the two tiers — a Favorite, or a garden plant gone (a register line, not a memorial)
    home: null, succName: null, succDay: null, ofLine: null, // Decision 11-A: where the Favorite lived, who succeeded her, whose line a successor carries
  }, o);
}
/* Old saves stored pots as bare stage ints, then as {stage, waterDays, ...}
   objects. Bring any of them up to the v2 plant shape, inventing nothing
   the player did: stage days fall back to day 1, names to the roll call. */
function migratePot(p, i) {
  if (typeof p === 'number') p = { stage: p };
  p = p || {};
  const st = p.stage | 0;
  return freshPlant((typeof p.name === 'string' && p.name.trim()) ? p.name : PLANT_NAMES[i], {
    variety: SIX_VARIETY[i], stage: st,
    wateredDays: p.wateredDays != null ? p.wateredDays : (p.waterDays || 0),
    watered: !!p.watered, vigor: p.vigor || 0, tended: p.tended || 0,
    sownDay: p.sownDay != null ? p.sownDay : (st >= 1 ? 1 : null),
    sproutedDay: p.sproutedDay != null ? p.sproutedDay : (st >= 2 ? 1 : null),
    seedlingDay: p.seedlingDay != null ? p.seedlingDay : (st >= 3 ? 1 : null),
    location: 'BENCH', slot: i, firstSix: true,
    dirt: !!p.dirt, dirtCredit: p.dirtCredit || 0,
  });
}
function freshRow() {
  return {
    yieldRating: 1, fruitSet: 0, wateredDays: 0, watered: false, poundsByYear: {},
    // REVISION (Nov 27, 2026): the row's whole truth — a collective record
    bushCount: 0, rowHealth: 0, dryDays: 0, warnedDay: null, history: [],
    variety: null, plantedDay: null, stage: 0, fruitSetOk: false, chill: 0, wintered: false, foundingRoll: null,
  };
}
/* The Company: the potted sprouts of chapter 2, one collective record —
   counted, staged, watered and worried over as a body, never a census.
   Plant-shaped where the dawn engine needs it to be. */
function freshCompany(o) {
  return Object.assign({
    n: 0, stage: 2, wateredDays: 0, watered: false, health: 0, dryDays: 0,
    warnedDay: null, chill: 0, wintered: false, fruitSetOk: false,
    vars: { ECHO: 0, CHANDLER: 0 }, loc: 'WINDOW', roll: [], history: [], gone: false, plantedOut: null,
  }, o || {});
}
/* The Nursery: collective stock for rows 8–12, on the same pattern. */
function freshNursery(o) {
  return Object.assign({
    stock: 0, stage: 2, wateredDays: 0, watered: false, health: 0, dryDays: 0, history: [],
    warnedDay: null, chill: 0, wintered: false, fruitSetOk: false,
  }, o || {});
}
let G = null; // game state (serializable part in G.save)
function newSave() {
  const s = attachPotsAlias({
    v: 3, day: 1, seedsLeft: 6, tea: 3, teaBrewedDay: 0,
    plants: PLANT_NAMES.map((n, i) => freshPlant(n, { variety: SIX_VARIETY[i], location: 'BENCH', slot: i, firstSix: true, fav: n === 'HOPE' })), // ONE FAVORITE (Nov 27, 2026): the founding Favorite is HOPE
    company: null, nursery: null,
    tray: { n: 0, watered: false, sownDay: null, stratDays: 0, ready: false, pottedTotal: 0 },
    dex: { blueberry: [], garden: [], cells: [] },
    deerBeaten: false, deerPresent: false, chapterDone: false,
    tutorial: 0, // 0 intro dialogue, 1 plant, 2 water, 3 done
    constanceLine: 0,
    weeds: [], compost: 0, goodDirt: 0, weedLineSeen: false, cornerLineSeen: false,
    world: { ch: 1, step: 0, flags: {}, area: 'yard', proj: 0, projDay: 1, lastSeason: 0, rainToday: false, jeremiahDay: 0, omaReqDay: 0, watchRow: null, alvinDown: false },
    cropRows: [], field: { tarp: [0, 0, 0, 0, 0], tarpDay: [0, 0, 0, 0, 0], fence: 0, fenceSeg: [0, 0, 0, 0], fenceIrr: [0, 0, 0, 0], protoNet: false, protoWire: false, pipe: false, irrigation: false, mulch: 0, weedLv: [0, 0, 0, 0, 0, 0], vent: false, heater: false },
    wine: { jar: null, batches: [], honey: 6, pounds: 0, poundsByYear: {}, shared: 0 },
    germ: null, promise: false,
    player: { x: 10, y: 6, dir: 'down' },
  });
  for (let i = 0; i < 12; i++) s.cropRows.push(freshRow());
  return s;
}
function ensureV2(s) {
  attachPotsAlias(s);
  if (!s.world) s.world = { ch: 1, step: 0, flags: {}, area: 'yard', proj: 0, projDay: 1, lastSeason: 0, rainToday: false, jeremiahDay: 0, omaReqDay: 0, watchRow: null, alvinDown: false };
  if (!s.world.flags) s.world.flags = {};
  if (!s.field) s.field = { tarp: [0, 0, 0, 0, 0], tarpDay: [0, 0, 0, 0, 0], fence: 0, protoNet: false, protoWire: false, pipe: false, irrigation: false, mulch: 0, weedLv: [0, 0, 0, 0, 0, 0], vent: false, heater: false };
  if (!Array.isArray(s.field.fenceSeg) || s.field.fenceSeg.length !== 4) s.field.fenceSeg = [0, 0, 0, 0];
  if (!Array.isArray(s.field.fenceIrr) || s.field.fenceIrr.length !== 4) s.field.fenceIrr = [0, 0, 0, 0];
  if (typeof s.field.mulch !== 'number') s.field.mulch = 0;
  for (const r of s.cropRows) if (r.mulched === undefined) r.mulched = false;
  if (!s.wine) s.wine = { jar: null, batches: [], honey: 6, pounds: 0, poundsByYear: {}, shared: 0 };
  if (!s.tray) s.tray = { n: 0, watered: false, sownDay: null, stratDays: 0, ready: false, pottedTotal: 0 };
  if (!Array.isArray(s.cropRows) || s.cropRows.length !== 12) { const old = s.cropRows || []; s.cropRows = []; for (let i = 0; i < 12; i++) s.cropRows.push(Object.assign(freshRow(), old[i] || {})); }
  if (!Array.isArray(s.plants) || !s.plants.length) s.plants = PLANT_NAMES.map((n, i) => freshPlant(n, { variety: SIX_VARIETY[i], location: 'BENCH', slot: i, firstSix: true }));
  s.plants = s.plants.map((p, i) => Object.assign(freshPlant(p.name || PLANT_NAMES[i] || 'PLANT', { firstSix: !!p.firstSix }), p));
  if (!s.dex) s.dex = { blueberry: [], garden: [], cells: [] };
  if (!Array.isArray(s.dex.blueberry)) s.dex.blueberry = [];
  if (!Array.isArray(s.dex.garden)) s.dex.garden = [];
  if (!Array.isArray(s.dex.cells)) s.dex.cells = [];
  s.weeds = Array.isArray(s.weeds) ? s.weeds.filter(w => w && Number.isInteger(w.x) && Number.isInteger(w.y)).map(w => ({ x: w.x, y: w.y, deep: !!w.deep, area: w.area === 'field' ? 'field' : 'yard' })) : [];
  if (typeof s.compost !== 'number') s.compost = 0;
  if (typeof s.goodDirt !== 'number') s.goodDirt = 0;
  if (s.germ === undefined) s.germ = null;
  if (s.promise === undefined) s.promise = false;
  if (!s.player) s.player = { x: 10, y: 6, dir: 'down' };
  return s;
}
function migrateSaveV1(s1) {
  const s = newSave();
  for (const k of ['day', 'seedsLeft', 'tea', 'teaBrewedDay', 'deerBeaten', 'deerPresent', 'chapterDone', 'tutorial', 'constanceLine', 'compost', 'goodDirt', 'weedLineSeen', 'cornerLineSeen']) if (s1[k] !== undefined) s[k] = s1[k];
  if (s1.player) s.player = s1.player;
  s.plants = (s1.pots || []).map((p, i) => migratePot(p, i));
  if (s1.dex && Array.isArray(s1.dex.blueberry)) s.dex.blueberry = s1.dex.blueberry.slice();
  if (Array.isArray(s1.weeds)) s.weeds = s1.weeds;
  if (s.chapterDone) { s.world.ch = 2; s.world.step = 0; }
  return ensureV3(s);
}
/* v3 shape insurance (REVISION, Nov 27, 2026): the two collective records
   and the extended row records, backfilled without inventing history. */
function ensureV3(s) {
  if (s.company === undefined) s.company = null;
  if (s.nursery === undefined) s.nursery = null;
  if (s.company) s.company = Object.assign(freshCompany(), s.company);
  if (s.nursery) s.nursery = Object.assign(freshNursery(), s.nursery);
  if (Array.isArray(s.cropRows)) s.cropRows = s.cropRows.map(r => Object.assign(freshRow(), r));
  for (const p of s.plants || []) {
    if (p.fav === undefined) p.fav = false;
    if (p.gone === undefined) p.gone = false;
    if (p.home === undefined) p.home = null;
    if (p.succName === undefined) p.succName = null;
    if (p.succDay === undefined) p.succDay = null;
    if (p.ofLine === undefined) p.ofLine = null;
  }
  enforceOneFavorite(s);
  return s;
}
/* ONE FAVORITE (Nov 27, 2026): the circle is one. A save that still
   carries the old twelve-wide circle keeps a single Favorite — HOPE if
   she lives, else her living successor, else the first living founding
   Favorite; a memorial still awaiting succession outranks a closed
   line. The rest are demoted to named plants, each with the change
   written on its own card. Idempotent: once one flag stands, a no-op. */
function enforceOneFavorite(s) {
  const plants = s.plants || [];
  const flagged = plants.filter(p => p.fav);
  if (!flagged.length) {
    // a founding repair, silently: HOPE was always meant to be the one
    const hope = plants.find(p => p.firstSix && p.name === 'HOPE' && !p.memorial && !p.gone);
    if (hope) hope.fav = true;
    return;
  }
  if (flagged.length === 1) return;
  const living = flagged.filter(p => !p.memorial && !p.gone);
  const keeper =
    living.find(p => p.name === 'HOPE') ||
    living.find(p => p.ofLine === 'HOPE') ||
    living.find(p => p.firstSix) ||
    living[0] ||
    flagged.find(p => p.memorial && !p.succName && p.ofLine === 'HOPE') ||
    flagged.find(p => p.memorial && !p.succName) ||
    flagged.find(p => p.name === 'HOPE') ||
    flagged[0];
  for (const p of flagged) {
    if (p === keeper) continue;
    p.fav = false;
    if (!p.memorial && !(p.history || []).includes(TEXT.register.demotedLine)) p.history.push(TEXT.register.demotedLine);
  }
}
/* Save migration v2 -> v3 (spec A6): Favorites are determined by rule —
   the first six, gift-named story plants, and Row 1's living, taken in
   bench order to the cap of twelve. Every other living individual folds
   into its row or collective with its name read into the founding roll;
   its harvests sum into the row's pounds. Memorials are preserved
   verbatim and never count against the cap. Field totals do not move. */
function migrateSaveV2toV3(s2) {
  const s = ensureV2(s2);
  s.cropRows = s.cropRows.map(r => Object.assign(freshRow(), r));
  const planted = s.plants.some(p => p.row != null) || (s.world && s.world.ch >= 7);
  const quals = s.plants.filter(p => !p.memorial && (p.firstSix || p.giftName || p.row === 1));
  quals.sort((a, b) => ((a.slot != null ? a.slot : 999) - (b.slot != null ? b.slot : 999)));
  const keep = new Set(quals.slice(0, 12));
  for (const p of keep) p.fav = true;
  const folded = [], nurseryNames = [];
  for (const p of s.plants) {
    if (p.memorial || keep.has(p) || p.location === 'GARDEN') continue;
    folded.push(p);
    if (p.row != null) {
      const row = s.cropRows[p.row - 1];
      row.bushCount = (row.bushCount || 0) + 1;
      (row.foundingRoll = row.foundingRoll || []).push(p.name);
      for (const y of Object.keys(p.harvestByYear || {})) row.poundsByYear[y] = Math.round(((row.poundsByYear[y] || 0) + (p.harvestByYear[y] || 0)) * 10) / 10;
      if (row.plantedDay == null) row.plantedDay = p.plantedDay;
      if (!row.variety) row.variety = p.variety;
      if ((p.stage || 0) > (row.stage || 0)) row.stage = p.stage;
    } else if (planted) {
      if (!s.nursery) s.nursery = freshNursery();
      s.nursery.stock++;
      nurseryNames.push(p.name);
      if ((p.stage || 0) > s.nursery.stage) s.nursery.stage = p.stage;
    } else {
      if (!s.company) s.company = freshCompany({ loc: p.location || 'WINDOW' });
      s.company.n++;
      s.company.roll.push(p.name);
      s.company.vars[p.variety] = (s.company.vars[p.variety] || 0) + 1;
      if ((p.stage || 0) > s.company.stage) s.company.stage = p.stage;
      if ((p.health || 0) > s.company.health) s.company.health = p.health;
    }
  }
  for (const row of s.cropRows) if (row.foundingRoll && row.foundingRoll.length) row.history.push(F(TEXT.register.rowPlantedWith, { joinVal: row.foundingRoll.join(", ") }));
  if (nurseryNames.length && s.nursery) s.nursery.history.push(F(TEXT.register.nurseryStockedWith, { joinVal: nurseryNames.join(", ") }));
  s.plants = s.plants.filter(p => !folded.includes(p));
  s.v = 3;
  return ensureV3(s);
}
function normalizeSave(obj) {
  if (!obj) return newSave();
  if (obj.v === 1 && Array.isArray(obj.pots)) return migrateSaveV1(obj);
  if (obj.v === 2 && Array.isArray(obj.plants)) return migrateSaveV2toV3(obj);
  return ensureV3(ensureV2(obj));
}
function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {} }
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const s = JSON.parse(raw);
    if (s && s.v === 2 && Array.isArray(s.plants)) {
      // one-time backup of the pre-migration save, kept under its own key
      try { if (!localStorage.getItem('hss-save-v1-v2backup')) localStorage.setItem('hss-save-v1-v2backup', raw); } catch (e) {}
    }
    if (s && (s.v === 3 || s.v === 2) && Array.isArray(s.plants)) return normalizeSave(s);
    if (s && s.v === 1 && Array.isArray(s.pots)) return migrateSaveV1(s);
  } catch (e) {}
  return null;
}
function sixPlants() { return G.save.plants.filter(p => p.firstSix); }
/* Back-compat alias: older tooling (and the shipped smoke suite) pokes
   save.pots for the six. A non-enumerable getter keeps it out of the
   serialized save while always pointing at the living six. */
function attachPotsAlias(s) {
  if (!Object.getOwnPropertyDescriptor(s, 'pots')) {
    Object.defineProperty(s, 'pots', { enumerable: false, configurable: true, get() { return s.plants.filter(p => p.firstSix); } });
  }
  return s;
}
function plantsAt(loc) { return G.save.plants.filter(p => !p.memorial && !p.gone && (loc === 'ROW' ? p.row != null : p.location === loc)); }
function livingPlants() { return G.save.plants.filter(p => !p.memorial && !p.gone); }
/* ==================== THE TWO TIERS (REVISION, Nov 27, 2026) ====================
   A plant is a Favorite (individual: name, card, health ladder, memorial)
   or it is counted — in the Company, the Nursery, or a row's bushCount.
   ONE FAVORITE (Nov 27, 2026): the circle is one — HOPE, and her line
   after her. Named plants keep their cards; the ceremony is hers alone. */
const FAV_CAP = 1;
function isFav(p) { return !!(p && p.fav); }
function favPlants() { return G.save.plants.filter(p => isFav(p) && !p.memorial && !p.gone); }
function favCount() { return favPlants().length; }
function makeFavorite(p) { if (p && !p.memorial) { p.fav = true; } return p; }
function fieldBushes() {
  let n = 0;
  for (const r of G.save.cropRows) n += (r.bushCount || 0);
  for (const p of G.save.plants) if (!p.memorial && !p.gone && p.row != null) n++;
  return n;
}
function rowHasBushes(rn) { const r = G.save.cropRows[rn - 1]; return !!((r && (r.bushCount || 0) > 0) || G.save.plants.some(p => !p.memorial && !p.gone && p.row === rn)); }
/* A row pays for neglect in bushes, never below one (Decision 4): the
   loss is written in the row's own page and spoken at dawn. */
function loseRowBush(row, rn, cause, ev) {
  if (!row || (row.bushCount || 0) <= 1) { row.rowHealth = 2; return false; }
  row.bushCount--;
  row.rowHealth = 2; // the row has paid; the warning cycle restarts honestly
  row.history.push(F(TEXT.dawn.rowLostBush, { rn: rn, cause: cause }));
  if (ev) ev.ups.push(F(TEXT.dawn.rowLostBush, { rn: rn, cause: cause }));
  return true;
}
/* One step down the row's ladder; at CRITICAL a further step costs a bush. */
function rowStepHarm(row, rn, cause, ev) {
  if (!row || !(row.bushCount > 0)) return;
  if (row.rowHealth >= 3) loseRowBush(row, rn, cause, ev);
  else row.rowHealth++;
}
/* A named plant is born at a beat: one bush splits out of its row's
   count, named from Frank's pools, its card opening with the line that
   earned it. No menu, ever. (ONE FAVORITE: the beat names it; it does
   not join the circle — the circle is one, and it is HOPE's line.) */
function splitFavoriteFromRow(rn, kind) {
  const s = G.save, row = s.cropRows[rn - 1];
  if (!row || (row.bushCount || 0) < 1) return null;
  row.bushCount--;
  const linesFor = { frost: TEXT.plants.namedAtTheReckoning, fruit: TEXT.plants.namedAtFirstPicking, alvin: TEXT.plants.namedByAlvin };
  const p = freshPlant(allocName(s.plants), {
    variety: row.variety || 'CHANDLER', stage: (kind === 'fruit' ? 6 : Math.max(4, row.stage || 4)), location: 'ROW' + rn, row: rn,
    sownDay: row.plantedDay, bushDay: row.plantedDay, plantedDay: s.day,
    health: row.rowHealth || 0, wintered: !!row.wintered, chill: row.chill || 0, fruitSetOk: !!row.fruitSetOk,
    history: (linesFor[kind] || []).slice(),
  });
  if (p.stage >= 5) p.blossomDay = s.day;
  if (p.stage >= 6) p.fruitDay = s.day;
  s.plants.push(p);
  row.history.push(F(TEXT.register.rowNamedNote, { name: p.name }));
  return p;
}
function housingOf(p) { return p.row != null ? 'field' : p.location === 'GARDEN' ? 'garden' : 'pot'; }
function dexAdd(stageName, variety) {
  if (!G.save.dex.blueberry.includes(stageName)) G.save.dex.blueberry.push(stageName);
  if (variety) { const cell = variety + ':' + stageName; if (!G.save.dex.cells.includes(cell)) G.save.dex.cells.push(cell); }
}
function anyStageAtLeast(n) { return sixPlants().some(p => p.stage >= n); }
function strongestPot() {
  let best = -1, bi = -1;
  sixPlants().forEach((p, i) => { if (p.stage >= 2 && p.stage > best) { best = p.stage; bi = i; } });
  return bi;
}


/* ============================== SETTINGS ============================== */
/* Persisted separately from the game save, so starting a New Game (which
   overwrites the save) never resets the player's control preferences. */
const SETTINGS_KEY = 'hss-settings-v1';
const settings = { stick: 'auto', music: true }; // stick: auto | always | off; music: theme on/off
try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  const v = s && (s.stick || s.pad); // 'pad' was the D-pad-era field name; migrate it forward
  if (['auto', 'always', 'off'].includes(v)) settings.stick = v;
  if (s && s.music === false) settings.music = false;
} catch (e) {}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ stick: settings.stick, music: settings.music })); } catch (e) {} }

/* ============================== THEME SONG ============================== */
/* "This Is My Father's World" — the tune TERRA BEATA (Franklin L.
   Sheppard, Alleluia, 1915; traditional English melody). Public domain;
   tune only, no words anywhere in the game. The arrangement below is
   the game's own (soft lead, simple bass, gentle chord pads), and it is
   generated from theme.mid — the Standard MIDI File in the repo root is
   the source of truth (see tests/make-theme.js, which writes both).
   Melody verified note-for-note Nov 26, 2026 against Hymnary.org's
   TERRA BEATA tune record (Eb major; incipit 12353 21234 65326) and the
   1919 printing as engraved at piano.org (opening Eb4 F4 G4 Bb4 G4 F4
   Eb4 F4 G4; second half opens on Bb4 and peaks on Eb5; lowest note
   Bb3; the Amen moves Ab -> Eb). Playback data is [note, beats] pairs
   on one shared 69-beat timeline; 0 / [] is a rest. */
const THEME = {
  bpm: 88, beats: 69,
  melody: [[63,0.5],[65,0.5],[67,1],[70,1],[67,1],[65,1],[63,3],[65,0.5],[67,0.5],[68,1],[72,1],[70,1],[67,1],[65,3],[72,0.5],[70,0.5],[67,1],[67,1],[65,1],[63,1],[67,2],[65,0.5],[63,0.5],[58,1],[63,1],[65,1],[67,1],[70,1],[65,1],[67,1],[63,2],[70,0.5],[75,0.5],[70,1],[72,1],[74,1],[75,3],[75,0.5],[74,0.5],[72,1],[68,1],[67,1],[70,1],[70,3],[72,0.5],[70,0.5],[67,1],[67,1],[65,1],[63,1],[67,2],[65,0.5],[63,0.5],[58,1],[63,1],[65,1],[67,1],[70,1],[65,1],[67,1],[63,2],[68,2],[63,2]],
  bass: [[0,1],[39,2],[46,2],[39,2],[46,2],[44,2],[51,2],[44,2],[48,2],[39,2],[46,2],[39,3],[46,1],[39,2],[46,2],[39,2],[43,2],[0,0.5],[39,2],[46,1.5],[39,2],[43,2],[44,2],[48,2],[44,2],[44,2],[39,2],[46,2],[39,3],[46,1],[39,2],[46,2],[39,4],[44,2],[39,2]],
  chords: [[[],1],[[55,58,63],4],[[55,58,63],4],[[56,60,63],4],[[56,60,63],4],[[55,58,63],4],[[55,58,63],4],[[55,58,63],4],[[55,58,63],4],[[],0.5],[[55,58,63],3.5],[[55,58,63],4],[[56,60,63],4],[[56,60,63],4],[[55,58,63],4],[[55,58,63],4],[[55,58,63],4],[[55,58,63],4],[[56,60,63],2],[[55,58,63],2]],
};
/* The three voices merged into one beat-sorted event list, once. */
const THEME_SEQ = (() => {
  const ev = [];
  const add = (stream, kind) => {
    let b = 0;
    for (const [n, d] of stream) {
      if (Array.isArray(n)) { for (const nn of n) if (nn) ev.push({ beat: b, kind, note: nn, dur: d }); }
      else if (n) ev.push({ beat: b, kind, note: n, dur: d });
      b += d;
    }
  };
  add(THEME.melody, 'melody'); add(THEME.bass, 'bass'); add(THEME.chords, 'chord');
  ev.sort((a, b) => a.beat - b.beat);
  return ev;
})();
/* WebAudio chiptune playback, title screen only. Browsers refuse audio
   before a user gesture, so nothing is created until the player's first
   key/touch/click anywhere; themeSync() (called every frame) then starts
   and stops the loop as the mode and the MUSIC setting demand. */
let themeCtx = null, themeMaster = null, themeTimer = null, themePlaying = false;
let themeIdx = 0, themeLoopStart = 0, userGestured = false;
const themeDbg = { scheduled: 0 }; // notes scheduled since boot (read via __hss)
for (const evName of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(evName, () => {
    userGestured = true;
    if (themeCtx && themeCtx.state === 'suspended') themeCtx.resume();
  }, { passive: true });
}
function themePlayNote(t, e) {
  const spb = 60 / THEME.bpm;
  const osc = themeCtx.createOscillator(), g = themeCtx.createGain();
  const conf = e.kind === 'melody' ? { type: 'triangle', peak: 0.5, atk: 0.012 }
    : e.kind === 'bass' ? { type: 'triangle', peak: 0.36, atk: 0.012 }
    : { type: 'square', peak: 0.11, atk: 0.09 }; // chord pads breathe in slowly
  osc.type = conf.type;
  osc.frequency.value = 440 * Math.pow(2, (e.note - 69) / 12);
  const dur = Math.max(0.06, e.dur * spb * (e.kind === 'chord' ? 1 : 0.92));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(conf.peak, t + conf.atk);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g); g.connect(themeMaster);
  osc.start(t); osc.stop(t + dur + 0.05);
}
function themeTick() {
  if (!themeCtx) return;
  const spb = 60 / THEME.bpm, ahead = themeCtx.currentTime + 0.18;
  while (themePlaying) {
    const e = THEME_SEQ[themeIdx], t = themeLoopStart + e.beat * spb;
    if (t > ahead) break;
    if (t >= themeCtx.currentTime - 0.05) { themePlayNote(t, e); themeDbg.scheduled++; }
    themeIdx++;
    if (themeIdx >= THEME_SEQ.length) { themeIdx = 0; themeLoopStart += THEME.beats * spb; }
  }
}
function themeStart() {
  if (themePlaying || !userGestured) return;
  if (!themeCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    themeCtx = new AC();
    themeMaster = themeCtx.createGain(); themeMaster.gain.value = 0.4; // quiet under everything
    themeMaster.connect(themeCtx.destination);
  }
  if (themeCtx.state === 'suspended') themeCtx.resume();
  themeMaster.gain.setTargetAtTime(0.4, themeCtx.currentTime, 0.05);
  themeIdx = 0; themeLoopStart = themeCtx.currentTime + 0.06;
  themeTimer = setInterval(themeTick, 40);
  themePlaying = true;
}
function themeStop() {
  if (themeTimer) { clearInterval(themeTimer); themeTimer = null; }
  if (themeMaster && themeCtx) themeMaster.gain.setTargetAtTime(0.0001, themeCtx.currentTime, 0.03);
  themePlaying = false;
}
function themeSync() {
  const want = mode === 'title' && settings.music;
  if (want && !themePlaying) themeStart();
  else if (!want && themePlaying) themeStop();
}

/* ============================== INPUT ============================== */
const keys = {};
let btnA = false, btnB = false, padA = false, padB = false, padStart = false;
let padDir = { x: 0, y: 0 }, touchA = false, touchB = false, menuBtnHit = false;
let prevA = false, prevB = false, prevStart = false;
const Input = {
  dir: { x: 0, y: 0 }, aHit: false, bHit: false, startHit: false,
  poll() {
    let x = 0, y = 0;
    if (keys['arrowleft'] || keys['a']) x -= 1;
    if (keys['arrowright'] || keys['d']) x += 1;
    if (keys['arrowup'] || keys['w']) y -= 1;
    if (keys['arrowdown'] || keys['s']) y += 1;
    // gamepad
    let gp = null;
    try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p) { gp = p; break; } } catch (e) {}
    padA = padB = padStart = false;
    if (gp) {
      const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
      if (b(14)) x -= 1; if (b(15)) x += 1; if (b(12)) y -= 1; if (b(13)) y += 1;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.4) x -= 1; if (ax > 0.4) x += 1; if (ay < -0.4) y -= 1; if (ay > 0.4) y += 1;
      padA = b(0); padB = b(1); padStart = b(9);
    }
    // the on-screen stick commits to a single cardinal: it feeds the same axes
    if (x === 0 && y === 0 && (padDir.x || padDir.y)) { x = padDir.x; y = padDir.y; }
    // diagonals from any source collapse to one axis (tile movement is 4-way)
    if (x !== 0 && y !== 0) { if (this.dir.x !== 0 && this.dir.y === 0) y = 0; else x = 0; }
    this.dir.x = Math.sign(x); this.dir.y = Math.sign(y);
    const aNow = btnA || padA || touchA, bNow = btnB || padB || touchB;
    const sNow = padStart || !!keys['p'] || menuBtnHit;
    menuBtnHit = false; // consumed: one press of the deck MENU button = one Start edge
    this.aHit = aNow && !prevA; this.bHit = bNow && !prevB; this.startHit = sNow && !prevStart;
    prevA = aNow; prevB = bNow; prevStart = sNow;
  }
};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === 'z' || k === 'enter') btnA = true;
  if (k === 'x' || k === 'escape') btnB = true;
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase(); keys[k] = false;
  if (k === 'z' || k === 'enter') btnA = false;
  if (k === 'x' || k === 'escape') btnB = false;
});
let padToastShown = false;
window.addEventListener('gamepadconnected', () => { if (!padToastShown) { padToastShown = true; toast(TEXT.toasts.gamepadConnected); } });
/* Touch controls: an ANALOG STICK + a MENU button + A/B buttons in the page
   deck below the screen (never over the canvas, so they can't cover
   dialogue). Visibility follows settings.stick: always | off | auto.
   The stick is rigorous about direction: it reads a continuous vector, but
   movement only ever commits to ONE cardinal —
     · magnitude < 0.35 (deadzone): no movement, commitment cleared;
     · magnitude >= 0.5: commit to the nearest cardinal (90° sectors);
     · hysteresis: a commitment holds until the angle moves at least 15°
       past the sector boundary (60° from the committed sector's centre),
       so jitter near a boundary never flickers the direction;
     · diagonals never reach the game; release stops movement at once. */
const deckEl = document.getElementById('deck');
const consoleEl = document.getElementById('console');
// Daniel (Nov 26, 2026): the game fills the available browser area. The
// stage scales uniformly — the 160:144 aspect never changes — and always
// takes the EXACT fit: the largest size that fits the window, so the
// stage touches the limiting edge at every viewport size (an earlier
// whole-number-scale preference left visible letterbox; Daniel's word
// overruled it). Letterboxing remains only on the non-limiting axis.
function fitStage() {
  // Portrait (Daniel's Android phone, Nov 26, 2026; reshaped Nov 27,
  // 2026): in portrait with the deck in play, the console takes the
  // full width at the unchanged aspect and rides at the foot of the
  // device, the deck hugging its controls directly under the screen
  // (the .fill CSS). An earlier cut stretched the deck into the whole
  // remaining height — a slab with the controls floating in it — and
  // Daniel was not a fan. Everywhere else the exact fit below stands.
  const portrait = window.innerHeight > window.innerWidth;
  const fill = portrait && !deckEl.hidden;
  consoleEl.classList.toggle('fill', fill);
  if (fill) { consoleEl.classList.toggle('deck-overlay', false); consoleEl.style.width = window.innerWidth + 'px'; return; }
  // Landscape with the deck in play (Daniel, Nov 27, 2026): the deck
  // overlays the viewport's bottom corners (the .deck-overlay CSS)
  // instead of reserving a slab under the screen, so the screen scales
  // to the full viewport height.
  const overlay = !deckEl.hidden;
  consoleEl.classList.toggle('deck-overlay', overlay);
  const deckH = overlay ? 0 : deckEl.offsetHeight;
  const availW = window.innerWidth - 8, availH = window.innerHeight - deckH - 8; // 8: the console's borders
  const scale = Math.min(availW / 160, availH / 144);
  consoleEl.style.width = (Math.max(160, Math.floor(160 * scale)) + 8) + 'px'; // +8 so the SCREEN is exactly 160 x scale
}
window.addEventListener('resize', fitStage);
const coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
/* Touch detection, hardened: (pointer: coarse) alone can miss on real
   Android browsers/WebViews, which left the deck hidden on a touch
   phone under 'auto'. Any one of the three signals is enough; an
   explicit CONTROLS choice ('always'/'off') still wins outright. */
const touchCapable = coarsePointer || (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
let touchSeen = false;
const stickDebug = { dir: null, mag: 0 }; // exposed via __hss for the smoke test
function stickShouldShow() {
  return settings.stick === 'always' || (settings.stick === 'auto' && (touchSeen || touchCapable));
}
function applyStickPref() { deckEl.hidden = !stickShouldShow(); fitStage(); }
window.addEventListener('touchstart', () => { if (!touchSeen) { touchSeen = true; applyStickPref(); } }, { passive: true });
(function () {
  const base = document.getElementById('stickBase');
  const knob = document.getElementById('stickKnob');
  const ticks = {
    up: base.querySelector('.tick.up'), right: base.querySelector('.tick.right'),
    down: base.querySelector('.tick.down'), left: base.querySelector('.tick.left'),
  };
  const DEAD = 0.35, COMMIT = 0.5, HYST = (45 + 15) * Math.PI / 180; // 15° past the boundary
  const SECTORS = ['right', 'down', 'left', 'up']; // index = round(angle / 90°), screen coords (y down)
  const CENTER = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const UNIT = { right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 } };
  let active = false, committed = null;
  function sectorOf(a) { let i = Math.round(a / (Math.PI / 2)) % 4; if (i < 0) i += 4; return SECTORS[i]; }
  function angDist(a, b) { const d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; }
  function showTicks() { for (const k in ticks) ticks[k].classList.toggle('on', k === committed); }
  function setKnob(x, y) { knob.style.transform = 'translate(-50%,-50%) translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; }
  function updateStick(cx, cy) {
    const r = base.getBoundingClientRect(), rad = r.width / 2;
    const dx = cx - (r.left + rad), dy = cy - (r.top + rad);
    const dist = Math.hypot(dx, dy), mag = Math.min(1, dist / rad), ang = Math.atan2(dy, dx);
    if (mag < DEAD) committed = null;
    else if (mag >= COMMIT) {
      const cand = sectorOf(ang);
      if (!committed) committed = cand;
      else if (cand !== committed && angDist(ang, CENTER[committed]) > HYST) committed = cand;
    }
    // 0.35..0.5 is the grey band: an existing commitment holds, none is created
    padDir = committed ? UNIT[committed] : { x: 0, y: 0 };
    stickDebug.dir = committed; stickDebug.mag = Math.round(mag * 100) / 100;
    // the knob follows the thumb, clamped to the base; once a direction is
    // committed its offset snaps toward that cardinal (cross-axis damped)
    const travel = Math.max(4, rad - 25);
    let kx = dx, ky = dy;
    if (dist > travel) { kx = dx / dist * travel; ky = dy / dist * travel; }
    if (committed) {
      const u = UNIT[committed];
      const par = kx * u.x + ky * u.y;        // along the committed axis
      const per = kx * -u.y + ky * u.x;       // across it
      kx = u.x * par + -u.y * per * 0.3;
      ky = u.y * par + u.x * per * 0.3;
    }
    setKnob(kx, ky); showTicks();
  }
  function endStick() {
    active = false; committed = null; padDir = { x: 0, y: 0 };
    stickDebug.dir = null; stickDebug.mag = 0;
    setKnob(0, 0); showTicks();
  }
  base.addEventListener('pointerdown', e => {
    e.preventDefault(); active = true;
    try { base.setPointerCapture(e.pointerId); } catch (err) {}
    updateStick(e.clientX, e.clientY);
  });
  base.addEventListener('pointermove', e => { if (active) updateStick(e.clientX, e.clientY); });
  base.addEventListener('pointerup', endStick);
  base.addEventListener('pointercancel', endStick);
  base.addEventListener('lostpointercapture', endStick);
  const bind = (id, set) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); set(true); });
    el.addEventListener('pointerup', () => set(false));
    el.addEventListener('pointerleave', () => set(false));
    el.addEventListener('pointercancel', () => set(false));
  };
  bind('btnA', v => touchA = v); bind('btnB', v => touchB = v);
  // the deck's MENU button is a Start press: P and gamepad Start still work
  document.getElementById('btnMenu').addEventListener('pointerdown', e => { e.preventDefault(); menuBtnHit = true; });
  applyStickPref();
})();

/* ============================== RUNTIME / UI STATE ============================== */
let mode = 'title'; // title | chapters | overworld | dialogue | trial | card | register | menu | controls
let titleSel = 0, chapterSel = 0, fade = 0, fading = null;
let toastMsg = '', toastT = 0;
function toast(m) { toastMsg = m; toastT = 2.2; }
const player = { tx: 10, ty: 6, px: 160, py: 96, dir: 'down', moving: false, mx: 0, my: 0, mt: 0, stepAlt: false };
const alvin = { tx: 9, ty: 7, px: 144, py: 112, dir: 'down', moving: false, mx: 0, my: 0, mt: 0, wag: true };
const constance = { tx: 12, ty: 6, dir: 'left' };
/* Seconds per tile step, shared by Frank, Alvin and every NPC amble —
   one constant, so the whole world walks in step. Daniel (Nov 26,
   2026): "Make walking slower" — 0.13 (≈7.7 tiles/s) → 0.17
   (≈5.9 tiles/s), one deliberate step he can call up or down after
   playing it. Walking only: dialogue, trials and day length keep
   their own timing. */
const STEP_T = 0.17;
let camX = 0, camY = 0;
function syncPixels(e) { e.px = e.tx * TILE; e.py = e.ty * TILE; }
function faceName(dx, dy) { return dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down'; }

/* ============================== DIALOGUE ============================== */
let dlg = null; // {lines:[{name,text}], idx, chars, timer, cb, choice, sel}
let dlgTapRow = -1, dlgTapFor = null; // a tapped choice row (canvas pointer), consumed by dlgUpdate
/* A choice of three or more cannot ride the A:/B: footer — only the
   first two options were ever drawn or reachable, and the rest were
   decoration (dialogue-choice fix, Nov 27, 2026). Three or more opens
   as a list in the game's own menu idiom instead: a cursor and a
   highlight, the window following the selection as the register index
   does, A to choose, and rows that answer a tap. Two-option prompts
   keep the A:/B: footer they have always had. */
const DLG_WIN = 5, DLG_PITCH = 12;
function dlgListOpen() { return !!(dlg && dlg.choice && dlg.choice.length > 2 && dlg.idx === dlg.lines.length - 1 && dlg.chars >= dlg.lines[dlg.idx].text.length); }
function dlgListStart() { const n = dlg.choice.length; return Math.max(0, Math.min(dlg.sel - (DLG_WIN - 1), n - DLG_WIN)); }
function dlgListGeom() { const rows = Math.min(DLG_WIN, dlg.choice.length); const h = rows * DLG_PITCH + 7; return { x: 4, y: 103 - h, w: 152, h, rows }; }
function say(lines, cb, choice) {
  const raw = Array.isArray(lines) ? lines : [lines];
  // a leading "FRANK:" / "CONSTANCE:" / "PASTOR:" becomes a speaker name tag
  // on the box, so the characterization reads without shouting prefixes
  const parsed = raw.map(l => {
    const m = String(l).match(/^(FRANK|CONSTANCE|PASTOR):\s*/);
    return m ? { name: m[1], text: String(l).slice(m[0].length) } : { name: null, text: String(l) };
  });
  dlg = { lines: parsed, idx: 0, chars: 0, timer: 0, cb: cb || null, choice: choice || null, sel: 0 };
  dlgTapRow = -1; dlgTapFor = null;
  mode = 'dialogue';
}
function dlgUpdate(dt) {
  if (!dlg) return;
  const line = dlg.lines[dlg.idx].text;
  dlg.timer += dt;
  const total = line.length;
  if (dlg.chars < total) { dlg.chars = Math.min(total, Math.floor(dlg.timer * 45)); }
  if (dlgListOpen()) {
    // the list: every option reachable — cursor by stick, keys or pad
    // (all feed Input.dir, so menuNavHit hears each), A chooses, and a
    // tap on a row chooses it outright. B does nothing here: with
    // three or more options it must never fire the second by reflex.
    if (dlgTapRow >= 0 && dlgTapFor === dlg) { const t = dlgTapRow; dlgTapRow = -1; dlgTapFor = null; if (t < dlg.choice.length) { endDlg(t); return; } }
    if (menuNavHit('up')) dlg.sel = (dlg.sel + dlg.choice.length - 1) % dlg.choice.length;
    if (menuNavHit('down')) dlg.sel = (dlg.sel + 1) % dlg.choice.length;
    if (Input.aHit) { endDlg(dlg.sel); return; }
    return;
  }
  if (Input.aHit) {
    if (dlg.chars < total) { dlg.chars = total; dlg.timer = total / 45; }
    else if (dlg.choice && dlg.idx === dlg.lines.length - 1) { endDlg(0); }
    else if (dlg.idx < dlg.lines.length - 1) { dlg.idx++; dlg.chars = 0; dlg.timer = 0; }
    else endDlg(0);
  } else if (Input.bHit && dlg.choice && dlg.idx === dlg.lines.length - 1 && dlg.chars >= total) {
    endDlg(1);
  }
}
function endDlg(which) {
  const cb = dlg.cb; dlg = null; dlgTapRow = -1; dlgTapFor = null; if (mode === 'dialogue') mode = 'overworld';
  if (cb) cb(which);
}
function drawBox(y, h) {
  ctx.fillStyle = '#20242a'; ctx.fillRect(2, y, VW - 4, h);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(4, y + 2, VW - 8, h - 4);
  ctx.fillStyle = '#dfe9f5'; ctx.fillRect(4, y + 2, VW - 8, 1); // a breath of shadow under the top edge
  ctx.fillStyle = '#20242a'; // corner rivets
  ctx.fillRect(6, y + 4, 1, 1); ctx.fillRect(VW - 7, y + 4, 1, 1);
  ctx.fillRect(6, y + h - 5, 1, 1); ctx.fillRect(VW - 7, y + h - 5, 1, 1);
}
function drawPanel(x, y, w, h) { // the house panel: dark frame, gold trim, paper face
  ctx.fillStyle = '#20242a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
}
function drawDlg() {
  drawBox(102, 40);
  const cur = dlg.lines[dlg.idx];
  const line = cur.text;
  if (cur.name) { // speaker name tag straddling the box's top edge, in their colour
    const w = textW(cur.name, 1) + 6;
    ctx.fillStyle = '#20242a'; ctx.fillRect(8, 97, w, 10);
    ctx.fillStyle = (cur.name === 'CONSTANCE' ? TEXT.screens.n7fd1c8 : TEXT.screens.ffd94a); ctx.fillRect(9, 98, w - 2, 8);
    drawText(cur.name, 11, 100, '#20242a', 1);
  }
  const wrapped = wrapText(line.slice(0, dlg.chars), 36);
  wrapped.slice(0, 4).forEach((l, i) => drawText(l, 8, 107 + i * 8, '#20242a', 1));
  if (dlg.chars >= line.length) {
    if (dlgListOpen()) { drawDlgList(); drawText(TEXT.screens.chooseHint, 8, 135, '#5a6270', 1); }
    else if (dlg.choice && dlg.idx === dlg.lines.length - 1) drawText(F(TEXT.screens.aChoiceBChoice2, { choice: dlg.choice[0], choice2: dlg.choice[1] }), 8, 135, '#b03030', 1);
    else if (Math.floor(perfNow * 2) % 2 === 0) drawText('▼', 148, 133, '#20242a', 1);
  }
}
function drawDlgList() {
  const g = dlgListGeom(), start = dlgListStart();
  ctx.fillStyle = '#20242a'; ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(g.x + 2, g.y + 2, g.w - 4, g.h - 4);
  dlg.choice.slice(start, start + g.rows).forEach((label, i) => {
    const y = g.y + 5 + i * DLG_PITCH, idx = start + i;
    if (idx === dlg.sel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, y - 3, 142, 12); drawText('▶', 11, y, '#b03030', 1); }
    drawText(String(label).slice(0, 32), 20, y, '#20242a', 1);
  });
  if (start + g.rows < dlg.choice.length) drawText('▼', 148, g.y + g.h - 10, '#5a6270', 1); // more below the window
}

/* ============================== OVERWORLD ============================== */
const DEER_POS = { x: 18, y: 8 };
const MORNING_LINES = TEXT.dawn.aNewDayThe;
const MORNING_FORE = TEXT.dawn.alvinStaredAtThe;
const CONSTANCE_LINES = TEXT.talk.constanceSixPotsAnd;
function objective() {
  const s = G.save, w = s.world;
  if (w.flags.alvinDown) return TEXT.objectives.alvinIsDownstairsKeeping;
  if (w.ch === 2) return TEXT.objectives.tendTheSixThe[w.step] || TEXT.objectives.tendTheShelf;
  if (w.ch === 3) return TEXT.objectives.goAndLookQuietly[w.step] || TEXT.objectives.settleIn;
  if (w.ch === 4) return TEXT.objectives.stakeTheField[w.step] || TEXT.objectives.walkTheField;
  if (w.ch === 5) return TEXT.objectives.buildTheStairsDown[w.step] || TEXT.objectives.tendEveryone;
  if (w.ch === 6) return TEXT.objectives.somethingIsWrongIn[w.step] || TEXT.objectives.tendTheField;
  if (w.ch === 7) return TEXT.objectives.somethingIsCuttingThe;
  if (w.ch === 8) return TEXT.objectives.theLongWarPull[w.step] || TEXT.objectives.theLongWar;
  if (w.ch === 9) return TEXT.objectives.aForsythiaForOma[w.step] || TEXT.objectives.tendTheBlossom;
  if (w.ch === 10) return TEXT.objectives.batchOneARehearsal[w.step] || TEXT.objectives.makeTheWine;
  if (w.ch === 11) return TEXT.objectives.theLongTendingEvery;
  if (s.tutorial === 1) return TEXT.objectives.theGrandPlanSix;
  if (s.tutorial === 2) return TEXT.objectives.aDrinkForEach;
  if (s.chapterDone) return TEXT.objectives.freeTendingBerryhillComes;
  if (s.deerPresent && !s.deerBeaten) return TEXT.objectives.aDeerIsIn;
  if (!anyStageAtLeast(3)) return TEXT.objectives.waterThePotsDaily;
  if (!s.deerBeaten) return TEXT.objectives.faceTheDeerTo;
  return TEXT.objectives.waterThePotsDaily;
}
function frontTile(e) {
  const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[e.dir];
  return { x: e.tx + d[0], y: e.ty + d[1] };
}
function entityBlocked(x, y, self) {
  if (isSolid(x, y)) return true;
  if (self !== player && x === player.tx && y === player.ty) return true;
  if (self !== alvin && x === alvin.tx && y === alvin.ty && !alvinAway()) return true;
  if ((area === 'yard' || area === 'barnOut') && x === constance.tx && y === constance.ty) return true;
  if (area === 'yard' && G.save.deerPresent && !G.save.deerBeaten && x === DEER_POS.x && y === DEER_POS.y) return true;
  if (npcList.some(n => n.tx === x && n.ty === y)) return true;
  return false;
}
function alvinAway() { return !!(G && G.save.world.flags.alvinDown && area !== 'oma'); }
function stepEntity(e, dx, dy, dt) {
  if (!e.moving) {
    if ((dx || dy) && !entityBlocked(e.tx + dx, e.ty + dy, e)) {
      e.moving = true; e.mx = dx; e.my = dy; e.mt = 0; e.dir = faceName(dx, dy);
    } else if (dx || dy) e.dir = faceName(dx, dy);
  }
  if (e.moving) {
    e.mt += dt / STEP_T;
    const t = Math.min(1, e.mt);
    e.px = (e.tx + e.mx * t) * TILE; e.py = (e.ty + e.my * t) * TILE;
    if (t >= 1) { e.tx += e.mx; e.ty += e.my; e.moving = false; e.px = e.tx * TILE; e.py = e.ty * TILE; return true; }
  }
  return false;
}
/* Daniel (Nov 26): "let the user displace Alvin automatically so he doesn't
   block." When Frank steps into the tile Alvin is standing on, Alvin hops
   aside in the same instant: to a side tile when one is walkable (never the
   tile ahead of Frank — he'd only be pushed again), and if he is boxed in,
   as in a 1-wide column, he and Frank simply swap tiles. He can only land
   where he could legally walk — the same solidity test as movement — and
   never on Constance or the deer. No input, no pause: Frank's step proceeds. */
function displaceAlvin(fdx, fdy) {
  const ox = alvin.tx, oy = alvin.ty;
  const sides = [[ox - fdy, oy - fdx], [ox + fdy, oy + fdx]];
  for (const [x, y] of sides) {
    if (isSolid(x, y)) continue;
    if (x === constance.tx && y === constance.ty) continue;
    if (G.save.deerPresent && !G.save.deerBeaten && x === DEER_POS.x && y === DEER_POS.y) continue;
    alvin.tx = x; alvin.ty = y; alvin.dir = faceName(x - ox, y - oy);
    syncPixels(alvin);
    return;
  }
  // boxed in: swap with Frank — he is leaving that tile this very step
  alvin.tx = player.tx; alvin.ty = player.ty; alvin.dir = faceName(-fdx, -fdy);
  syncPixels(alvin);
}
function stepPlayer(dx, dy, dt) {
  if (!player.moving && !alvin.moving && (dx || dy) &&
      player.tx + dx === alvin.tx && player.ty + dy === alvin.ty) {
    displaceAlvin(dx, dy);
  }
  return stepEntity(player, dx, dy, dt);
}
let alvinTarget = null;
let playerIdleT = 0; // how long Frank has stood still (drives Alvin's sit)
let diagX = true; // diagonal stick input alternates axes per step (staircase)
function overworldUpdate(dt) {
  if (fade > 0) { fade -= dt * 2; if (fade < 0) fade = 0; }
  // Constance idles between watching the yard and checking on the pots
  if (area === 'yard') constance.dir = (perfNow % 9 < 6.5) ? 'left' : 'down';
  const dx0 = Input.dir.x, dy0 = Input.dir.y;
  playerIdleT = (!player.moving && !dx0 && !dy0) ? playerIdleT + dt : 0;
  alvin.sit = playerIdleT > 3.5 && !alvin.moving &&
    Math.abs(alvin.tx - player.tx) + Math.abs(alvin.ty - player.ty) <= 3;
  let dx = dx0, dy = dy0;
  if (dx && dy) { if (diagX) dy = 0; else dx = 0; } // tile grid is 4-way: one axis per step
  const wasMoving = player.moving;
  let stepped = stepPlayer(dx, dy, dt);
  if (!stepped && !player.moving && dx0 && dy0) {
    stepped = stepPlayer(dx0 - dx, dy0 - dy, dt); // preferred axis blocked: try the other
  }
  if (stepped) {
    const ex = exitsFor(area).find(e => e.x === player.tx && e.y === player.ty);
    if (ex && DELIBERATE_EXITS.has(area)) { toast((mapChar(player.tx, player.ty) === 'x' ? TEXT.toasts.theStairsPressA : TEXT.toasts.theDoorPressA)); }
    else if (ex) { setArea(ex.to, ex.tx, ex.ty); return; }
    player.stepAlt = !player.stepAlt;
    if (dx0 && dy0) diagX = !diagX;
    alvinTarget = { x: player.tx - lastStep.dx, y: player.ty - lastStep.dy }; // tile the player just left
  }
  if (!wasMoving && player.moving) lastStep = { dx: player.mx, dy: player.my };
  // Alvin follows toward the tile the player vacated
  if (!alvin.moving && alvinTarget && !alvinAway()) {
    const ddx = alvinTarget.x - alvin.tx, ddy = alvinTarget.y - alvin.ty;
    if (ddx || ddy) {
      let mx = 0, my = 0;
      if (Math.abs(ddx) >= Math.abs(ddy) && ddx) mx = Math.sign(ddx); else if (ddy) my = Math.sign(ddy);
      if ((mx || my) && entityBlocked(alvin.tx + mx, alvin.ty + my, alvin)) {
        if (mx && ddy) { mx = 0; my = Math.sign(ddy); } else if (my && ddx) { my = 0; mx = Math.sign(ddx); } else { mx = 0; my = 0; }
      }
      if ((mx || my) && !entityBlocked(alvin.tx + mx, alvin.ty + my, alvin)) {
        alvin.moving = true; alvin.mx = mx; alvin.my = my; alvin.mt = 0; alvin.dir = faceName(mx, my);
      } else if (Math.abs(player.tx - alvin.tx) + Math.abs(player.ty - alvin.ty) > 6) {
        alvin.tx = player.tx; alvin.ty = player.ty + 1;
        if (entityBlocked(alvin.tx, alvin.ty, alvin)) { alvin.tx = player.tx; alvin.ty = player.ty; }
        syncPixels(alvin);
      }
    }
  }
  if (alvin.moving) {
    alvin.mt += dt / STEP_T; const t = Math.min(1, alvin.mt);
    alvin.px = (alvin.tx + alvin.mx * t) * TILE; alvin.py = (alvin.ty + alvin.my * t) * TILE;
    if (t >= 1) { alvin.tx += alvin.mx; alvin.ty += alvin.my; alvin.moving = false; syncPixels(alvin); }
  }
  if (Input.aHit && !player.moving) interact();
  if (Input.startHit) { mode = 'menu'; menuSel = 0; }
  // DRAWING DISCIPLINE: the camera is INTEGER-SNAPPED, always. A fractional
  // camera draws every tile at a fractional offset, and GPU rasterisers
  // blend the tiles' edge columns into the black clear colour — dark seams
  // across the yard that appear only while moving (Daniel's "weird black
  // lines", Nov 26). With an integer camera every tile, prop and shadow
  // lands on whole pixels and no seam can form on any rasteriser.
  camX = Math.round(Math.max(0, Math.min(AW * TILE - VW, player.px + 8 - VW / 2)));
  camY = Math.round(Math.max(0, Math.min(AH * TILE - VH, player.py + 8 - VH / 2)));
}
let lastStep = { dx: 0, dy: 1 };
let menuSel = 0;

function potIndexAt(x, y) { return (y === 10 && x >= 9 && x <= 14) ? x - 9 : -1; }
function interact() {
  const f = frontTile(player), s = G.save;
  // Deliberate interior doors: standing on an interior exit tile, A is
  // the way out — walking onto the tile alone never leaves (see EXITS).
  if (DELIBERATE_EXITS.has(area)) {
    // Standing on the exit tile, A is the way out — NO exceptions. The
    // ch5 stair build once claimed this press too (facing AND standing),
    // and since the stairs are the barn's only exit while the build
    // finishes at a dawn reachable only by resting OUTSIDE, walking
    // into the barn in ch5 step 0 was a soft-lock (Daniel, Nov 27,
    // 2026 — the exit audit missed it: it ran in a late-game save, and
    // the suite's ch5 passage advances the day by hook from inside).
    const ex = exitsFor(area).find(e => e.x === player.tx && e.y === player.ty);
    if (ex) { setArea(ex.to, ex.tx, ex.ty); return; }
    // Facing the exit tile works too — the barn's stairs are naturally
    // used from the tile below them. EXCEPT while those stairs are
    // being BUILT (ch5 step 0): facing them is the work site, so A
    // falls through to the build dialogue (barnInInteract 'x'), and
    // the way out is the standing press above, like any door.
    const stairsBuildLive = area === 'barnIn' && s.world.ch === 5 && s.world.step === 0 && !s.world.flags.stairsBuilt;
    if (!stairsBuildLive) {
      const fx = exitsFor(area).find(e => e.x === f.x && e.y === f.y);
      if (fx) { setArea(fx.to, fx.tx, fx.ty); return; }
    }
  }
  const npc = npcList.find(n => n.tx === f.x && n.ty === f.y);
  if (npc) return npcTalk(npc);
  if (area !== 'yard') return areaInteract(f);
  const pi = potIndexAt(f.x, f.y);
  if (pi >= 0) { const bp = sixPlants().find(p => p.location === 'BENCH' && p.slot === pi); if (bp) return potInteract(bp); return say(TEXT.yard.theBenchIsEmpty); }
  if (f.x === 11 && f.y === 3) { // house door
    if (s.world.ch === 3 && s.world.step === 4) {
      return say(TEXT.yard.theDoorTheTruck, which => {
        if (which === 0) restDay();
        else if (which === 1) {
          say(TEXT.yard.whatRidesFirst, sub => chooseLoadOrder(sub === 0 ? 'furniture' : 'plants'), TEXT.yard.furnitureFirst);
        }
        else if (which === 2) setArea('house', 10, 11);
      }, TEXT.yard.rest);
    }
    if (s.world.ch >= 2) {
      return say(TEXT.yard.theDoorInsideSmells, which => {
        if (which === 0) restDay();
        else if (which === 1) setArea('house', 10, 11);
      }, TEXT.barn.rest);
    }
    return say(TEXT.yard.restUntilMorning, which => { if (which === 0) restDay(); }, TEXT.yard.rest_2);
  }
  if (f.x === 11 && f.y === 4) { // Frank's garden journal sits on the porch
    return openRegister();
  }
  if (f.x === constance.tx && f.y === constance.ty) {
    constance.dir = ({ up: 'down', down: 'up', left: 'right', right: 'left' })[player.dir];
    const line = CONSTANCE_LINES[s.constanceLine % CONSTANCE_LINES.length]; s.constanceLine++;
    return say(line);
  }
  if (s.deerPresent && !s.deerBeaten && f.x === DEER_POS.x && f.y === DEER_POS.y) {
    if (strongestPot() < 0) return say(TEXT.yard.alvinIsReadyTo);
    return say(TEXT.yard.wildDeerAppeared, () => startTrial());
  }
  const fw = weedAt(f.x, f.y); // a weed in front of Frank: pull it
  if (fw) return pullWeed(fw);
  const ch = mapChar(f.x, f.y);
  if (ch === 'C') { // the compost corner: tea still brews here, and now compost becomes GOOD DIRT
    const cornerFirst = !s.cornerLineSeen;
    if (cornerFirst) s.cornerLineSeen = true;
    const conLine = TEXT.yard.constanceHeCursesThe;
    if (s.compost >= 3) {
      const lines = [F(TEXT.yard.theCompostCornerCompost, { compost: s.compost }), TEXT.yard.makeGoodDirtFor];
      if (cornerFirst) lines.push(conLine);
      saveGame();
      return say(lines, which => {
        if (which === 0) {
          s.compost -= 3; s.goodDirt++; saveGame();
          say(F(TEXT.yard.goodDirtRichAnd, { goodDirt: s.goodDirt }));
        }
      }, TEXT.yard.makeIt);
    }
    const lines = [];
    if (s.teaBrewedDay !== s.day && s.tea < 3) { s.tea++; s.teaBrewedDay = s.day; lines.push(F(TEXT.yard.youBrewAQuick, { tea: s.tea })); }
    lines.push(F(TEXT.yard.compostCompost3Makes, { compost: s.compost }));
    if (cornerFirst) lines.push(conLine);
    saveGame();
    return say(lines);
  }
  if (ch === 'G') {
    if (s.world.ch >= 3) return say(TEXT.yard.theRoadToBerryhill, which => { if (which === 0) setArea('barnOut', 2, 1); }, TEXT.yard.goToBerryhill);
    return say(TEXT.yard.theGateSticksBeyond);
  }
  if (ch === 'T') return say(TEXT.yard.tooMuchShadeHere);
  const uw = weedAt(player.tx, player.ty); // or the weed under Frank's own boots
  if (uw) return pullWeed(uw);
}
function potInteract(p) {
  const s = G.save;
  if (p.memorial) return clearHusk(p);
  if (p.stage === 0) {
    if (s.seedsLeft <= 0) return say(TEXT.house.noSeedsLeftIn);
    p.stage = 1; p.sownDay = s.day; s.seedsLeft--; dexAdd('SEED', p.variety); saveGame();
    if (s.tutorial === 1 && sixPlants().every(q => q.stage >= 1)) {
      s.tutorial = 2; saveGame();
      return say(TEXT.house.plantedSixLittlePromises);
    }
    return say(TEXT.house.anotherSeedTuckedInto);
  }
  if (!p.watered) {
    waterPlant(p); saveGame();
    if (s.tutorial === 2 && sixPlants().every(q => q.watered)) {
      s.tutorial = 3; saveGame();
      return say(TEXT.house.constanceNowWeWait);
    }
    return say((p.stage === 1 ? TEXT.house.youWaterTheSeed : F(TEXT.house.youWaterTheV, { v: STAGE_NAMES[p.stage] })));
  }
  if (s.goodDirt > 0) { // a watered pot can be fed: the good dirt goes in
    return say([F(TEXT.house.nameIsWateredAnd, { name: p.name }), F(TEXT.house.feedNameTheGood, { name: p.name, goodDirt: s.goodDirt })], which => {
      if (which === 0) {
        feedDirt(p);
        say(F(TEXT.house.goodDirtForName, { name: p.name }));
      }
    }, TEXT.house.feedIt);
  }
  return say(TEXT.house.alreadyWateredTodayWaiting);
}

/* Watering a plant: sets its flag, and — if it stands CRITICAL — records
   the rescue the mortality doctrine asks about at dawn (spec 2.8). */
function projUse() {
  const w = G.save.world;
  if (w.proj >= 3) { say(TEXT.yard.enoughTheDayHas); return false; }
  w.proj++;
  if (w.proj === 3) say(TEXT.yard.oneMoreThingThen);
  saveGame();
  return true;
}
function waterPlant(p) {
  p.watered = true;
  if (p.health === 3) p.lastRescue = G.save.day;
  saveGame();
}
function feedDirt(p) { // good dirt: +8 Vigor, +1 growth credit, one health step up
  const s = G.save;
  s.goodDirt--; p.dirt = true; p.dirtCredit = (p.dirtCredit || 0) + 1; p.vigor += 8;
  if (s.world.ch === 6 && s.world.step <= 4 && p.location === 'GREENHOUSE') { (s.world.flags.fedNames = s.world.flags.fedNames || []).push(p.name); s.world.flags.mitDirtDay = s.day; }
  if (p.health > 0) p.health--;
  if (p.health === 3) p.lastRescue = s.day;
  saveGame();
}
function killPlant(p, cause) {
  if (!p || p.memorial || p.gone) return;
  // Decision 3, as the ONE FAVORITE ruling (Nov 27, 2026) extends it:
  // every death but the Favorite's is a register line — the plant is
  // gone, written plainly on its own card — and the full ceremony (the
  // back-page memorial, the husk) belongs to the one Favorite alone.
  if (!isFav(p)) {
    p.health = 4; p.gone = true; p.diedDay = G.save.day; p.cause = (cause || TEXT.plants.itWasNotWatered); p.watered = false;
    saveGame();
    return;
  }
  p.home = { location: p.location, row: p.row, slot: p.slot }; // Decision 11-A: her place, kept for her successor
  p.health = 4; p.memorial = true; p.diedDay = G.save.day; p.cause = (cause || TEXT.plants.itWasNotWatered); p.husk = true; p.watered = false;
  saveGame();
}
/* Clearing a husk: one interact, and the plant goes to the compost —
   nothing in this yard is wasted (spec 2.8). */
function clearHusk(p) {
  p.husk = false; p.location = 'MEMORIAL'; p.row = null; p.slot = null;
  G.save.compost += 2; saveGame();
  const lines = [F(TEXT.plants.frankClearsWhatIs, { name: p.name }), TEXT.plants.intoTheCompostIt, TEXT.plants.n2Compost];
  if (isFav(p)) lines.push(TEXT.faith.huskHope); // the seed goes into the ground in hope, not despair
  return say(lines);
}
function growthCheck(p, so, ev) {
  const eff = () => p.wateredDays + (p.dirtCredit || 0);
  const spend = need => { const use = Math.max(0, Math.ceil(need - p.wateredDays)); p.dirtCredit = Math.max(0, (p.dirtCredit || 0) - use); p.wateredDays = 0; };
  if (p.stage === 1 && eff() >= 2) { spend(2); p.stage = 2; p.sproutedDay = G.save.day; ev.sprouted = true; dexAdd('SPROUT', p.variety); }
  else if (p.stage === 2 && eff() >= 3) { spend(3); p.stage = 3; p.seedlingDay = G.save.day; ev.seedled = true; dexAdd('SEEDLING', p.variety); }
  else if (p.stage === 3 && eff() >= 8 && p.wintered) { spend(8); p.stage = 4; p.bushDay = G.save.day; dexAdd('BUSH', p.variety); }
  else if (p.stage === 4 && so.idx === 0 && p.chill >= (p.variety === 'CLIMAX' ? 6 : 10) && eff() >= 3) { spend(3); p.stage = 5; p.blossomDay = G.save.day; dexAdd('BLOSSOM', p.variety); }
  else if (p.stage === 5 && p.fruitSetOk && eff() >= 6) { spend(6); p.stage = 6; p.fruitDay = G.save.day; dexAdd('FRUITING', p.variety); }
}
/* One plant's dawn (spec 2.8): water climbs the ladder, neglect descends
   it by housing thresholds, winter banks chill, and death — only from
   CRITICAL, only after a warned dawn spent unrescued — is carried out. */
function plantDawn(p, so, ev) {
  if (p.memorial || p.gone) return;
  const s = G.save, housing = housingOf(p);
  const winter = so.idx === 3;
  const rowW = p.row != null && s.cropRows[p.row - 1].watered; // rows are 1-based; cropRows is not (fixed Nov 28, 2026)
  const wasWatered = p.watered || rowW;
  if (p.health === 3 && p.warnedDay != null && p.warnedDay < s.day && !wasWatered) {
    killPlant(p, (p.dryDays >= DRY_THRESH[housing][2] ? TEXT.plants.aDrySpellAnd : (p.cause || TEXT.plants.itFailedAndWas)));
    ev.deaths.push(p.name);
    return;
  }
  if (wasWatered) {
    p.dryDays = 0;
    if (p.health > 0) p.health--;
    p.tended++;
    let pace = 1;
    if (winter) pace = housing === 'pot' ? 0.5 : 0;
    if (pace > 0 && p.stage >= 1) { p.wateredDays += pace; growthCheck(p, so, ev); }
  } else if (p.stage >= 1 && s.world.ch >= 2 && (!winter || housing === 'pot')) {
    // the health ladder arrives with Sprouts (spec 2.8, tutorial form);
    // in the Seeds chapter a dry pot simply waits, as it always has
    p.dryDays++;
    const th = DRY_THRESH[housing];
    const implied = (p.dryDays >= th[0] ? 1 : 0) + (p.dryDays >= th[1] ? 1 : 0) + (p.dryDays >= th[2] ? 1 : 0);
    if (implied > p.health) { p.health = implied; if (implied === 3) p.critSince = s.day; }
  }
  if (winter && p.stage >= 3) p.chill++;
  p.watered = false;
  p.vigor = MAX_VIGOR[p.stage] || 0;
}
/* The collective dawn: the Company and the Nursery climb and descend
   the same ladder as a plant, on pot thresholds — but their deaths are
   count losses, reported plainly, never named (spec A2/A3). */
function collectiveGrowth(c, so) {
  if (c.stage === 1 && c.wateredDays >= 2) { c.wateredDays = 0; c.stage = 2; }
  else if (c.stage === 2 && c.wateredDays >= 3) { c.wateredDays = 0; c.stage = 3; }
  else if (c.stage === 3 && c.wateredDays >= 8 && c.wintered) { c.wateredDays = 0; c.stage = 4; }
  else if (c.stage === 4 && so.idx === 0 && (c.chill || 0) >= 10 && c.wateredDays >= 3) { c.wateredDays = 0; c.stage = 5; }
  else if (c.stage === 5 && c.fruitSetOk && c.wateredDays >= 6) { c.wateredDays = 0; c.stage = 6; }
}
function collectiveDawn(c, so, ev, onDeath) {
  if (!c) return;
  const s = G.save, winter = so.idx === 3;
  const wasWatered = c.watered;
  if (c.health === 3 && c.warnedDay != null && c.warnedDay < s.day && !wasWatered) {
    onDeath();
    c.warnedDay = null; c.watered = false;
    return;
  }
  if (wasWatered) {
    c.dryDays = 0;
    if (c.health > 0) c.health--;
    if (!winter && c.stage >= 1) { c.wateredDays += 1; collectiveGrowth(c, so); }
  } else if (c.stage >= 1 && s.world.ch >= 2 && !winter) {
    c.dryDays++;
    const th = DRY_THRESH.pot;
    const implied = (c.dryDays >= th[0] ? 1 : 0) + (c.dryDays >= th[1] ? 1 : 0) + (c.dryDays >= th[2] ? 1 : 0);
    if (implied > c.health) c.health = implied;
  }
  if (winter && c.stage >= 3) c.chill = (c.chill || 0) + 1;
  c.watered = false;
}
function companyDawn(so, ev) {
  const s = G.save, c = s.company;
  if (!c || c.gone || c.n <= 0) return;
  s.world.flags.companyWatered = !!c.watered; // the crisis dawns read this before it resets
  collectiveDawn(c, so, ev, () => {
    const loss = Math.min(c.n, Math.max(1, Math.round(c.n * 0.2)));
    c.n -= loss; c.health = 2;
    if (c.n <= 0) { c.n = 0; c.gone = true; }
    ev.ups.push(F(TEXT.dawn.companyLost, { n: loss }));
  });
}
function nurseryDawn(so, ev) {
  const s = G.save, n = s.nursery;
  if (!n || n.stock <= 0) return;
  collectiveDawn(n, so, ev, () => {
    const loss = Math.min(n.stock, Math.max(1, Math.round(n.stock * 0.25)));
    n.stock -= loss; n.health = 2;
    ev.ups.push(F(TEXT.dawn.stockLost, { n: loss }));
  });
}
/* One row's dawn: irrigation and rain climb its ladder one step; dry
   days descend it on the field thresholds; a CRITICAL row left
   unrescued pays a bush (floor 1) and restarts at DECLINING. */
function rowDawn(row, rn, so, ev) {
  const s = G.save, winter = so.idx === 3;
  if (!((row.bushCount || 0) > 0)) { row.watered = false; return; }
  const wasWatered = row.watered;
  if (row.rowHealth === 3 && row.warnedDay != null && row.warnedDay < s.day && !wasWatered) {
    loseRowBush(row, rn, TEXT.dawn.aDrySpell, ev);
    row.warnedDay = null; row.watered = false;
    return;
  }
  if (wasWatered) {
    row.dryDays = 0;
    if (row.rowHealth > 0) row.rowHealth--;
    if (!winter && row.stage >= 1) { row.wateredDays++; collectiveGrowth(row, so); }
  } else if (!winter && s.world.ch >= 2) {
    row.dryDays = (row.dryDays || 0) + 1;
    const th = DRY_THRESH.field;
    const implied = (row.dryDays >= th[0] ? 1 : 0) + (row.dryDays >= th[1] ? 1 : 0) + (row.dryDays >= th[2] ? 1 : 0);
    if (implied > row.rowHealth) row.rowHealth = implied;
  }
  if (winter && row.stage >= 3) row.chill = (row.chill || 0) + 1;
  row.watered = false;
}
const SEASON_LINES = TEXT.dawn.springTheYearTurns;
function restDay() {
  fading = 'dawn'; fade = 1;
  setTimeout(() => { dawn(); }, 350);
}
function dawn() {
  const s = G.save, w = s.world;
  const prev = seasonOf(s.day);
  s.day++;
  const so = seasonOf(s.day);
  w.proj = 0; w.projDay = s.day;
  // Berryhill weather (from ch. 3): a deterministic rain about a day in five
  w.rainToday = w.ch >= 3 && so.idx !== 3 && (hashDay(s.day) % 5 === 0);
  if (w.rainToday) {
    for (const p of s.plants) if (!p.memorial && housingOf(p) !== 'pot') p.watered = true;
    for (const r of s.cropRows) r.watered = true;
  }
  const ev = { sprouted: false, seedled: false, deaths: [], ups: [] };
  const anyWatered = s.plants.some(p => p.watered) || s.cropRows.some(r => r.watered);
  for (const p of s.plants) plantDawn(p, so, ev);
  companyDawn(so, ev);
  nurseryDawn(so, ev);
  s.cropRows.forEach((r, i) => rowDawn(r, i + 1, so, ev));
  if (s.tray.n > 0) { if (s.tray.watered) s.tray.stratDays++; s.tray.watered = false; }
  wineDawn();
  const failing = [];
  for (const p of s.plants) if (!p.memorial && !p.gone && p.health === 3) { p.warnedDay = s.day; failing.push(p.name); }
  const rowFailing = [];
  s.cropRows.forEach((r, i) => { if ((r.bushCount || 0) > 0 && r.rowHealth === 3) { r.warnedDay = s.day; rowFailing.push(i + 1); } });
  const companyFailing = !!(s.company && !s.company.gone && s.company.n > 0 && s.company.health === 3);
  if (companyFailing) s.company.warnedDay = s.day;
  const nurseryFailing = !!(s.nursery && s.nursery.stock > 0 && s.nursery.health === 3);
  if (nurseryFailing) s.nursery.warnedDay = s.day;
  if (w.ch <= 2) spawnWeeds(anyWatered ? 3 : 2);
  if (w.ch >= 7 || (w.ch === 6 && w.step >= 6)) spawnFieldWeeds(2); // the lanes between the rows, once there are rows
  if (sixPlants().some(p => p.stage >= 2) && !s.deerBeaten && !s.deerPresent) s.deerPresent = true;
  let seasonLine = null;
  if (so.idx !== prev.idx) {
    seasonLine = SEASON_LINES[so.idx];
    if (so.idx === 0) {
      for (const p of s.plants) if (p.stage >= 3) p.wintered = true;
      if (s.company && s.company.stage >= 3) s.company.wintered = true;
      if (s.nursery && s.nursery.stage >= 3) s.nursery.wintered = true;
      for (const r of s.cropRows) if ((r.stage || 0) >= 3) r.wintered = true;
    }
    w.lastSeason = so.idx;
  }
  chapterDawnPrep(ev);
  saveGame();
  fading = null;
  if (checkChapter()) return;
  const beat = chapterDawn(ev);
  layoutNPCs();
  if (mode === 'card' || mode === 'trial') return;
  let lines = [];
  if (ev.deaths.length) lines.push(F(TEXT.dawn.inTheNightQuietly, { joinVal: ev.deaths.join(", ") }));
  if (ev.ups.length) lines.push(...ev.ups);
  if (failing.length) lines.push(F(TEXT.dawn.vIsFailingWater, { v: failing[0] }));
  for (const rn of rowFailing) lines.push(F(TEXT.dawn.rowFailing, { rn: rn }));
  if (companyFailing) lines.push(TEXT.dawn.companyFailing);
  if (nurseryFailing) lines.push(TEXT.dawn.nurseryFailing);
  if (seasonLine) lines.push(seasonLine);
  if (w.rainToday) lines.push(TEXT.dawn.rainInTheNight);
  if (beat) lines = lines.concat(beat);
  if (!lines.length) {
    let line;
    if (ev.sprouted && s.deerPresent && !s.deerBeaten && w.ch === 1) line = TEXT.dawn.somethingSproutedButAlvin;
    else if (ev.sprouted) line = TEXT.dawn.twoSmallLeavesIn;
    else if (ev.seedled) line = TEXT.dawn.aSproutBecameA;
    else if (w.ch >= 3) line = BERRY_MORNING[Math.floor(hashDay(s.day) % BERRY_MORNING.length)];
    else if (s.day >= 2 && !s.deerBeaten && w.ch === 1) line = MORNING_FORE[Math.floor(Math.random() * MORNING_FORE.length)];
    else line = MORNING_LINES[Math.floor(Math.random() * MORNING_LINES.length)];
    lines = [line];
    if (ev.sprouted && w.ch === 1 && !w.flags.sproutThanks) { w.flags.sproutThanks = true; lines.push(TEXT.faith.firstSprout); }
  }
  const soNow = seasonOf(s.day); // chapter beats may move the calendar (a summer passes)
  lines.unshift('DAY ' + s.day + ' · ' + SEASON_NAMES[soNow.idx] + ', YEAR ' + soNow.year + '.');
  say(lines);
}
const BERRY_MORNING = TEXT.berry.morning;
function wineVerdict(j) {
  const careless = (j.careSteps || 0) >= 2;
  if (j.index < 0.5) return TEXT.wine.tart;
  if (j.index > 1.2) return TEXT.wine.sweetAsCandy;
  if (j.index <= 0.8) return (careless ? TEXT.wine.honest : TEXT.wine.lovely);
  return (careless ? TEXT.wine.honest : TEXT.wine.sweet);
}
function wineDawn() {
  const s = G.save, w = s.world, j = s.wine.jar;
  if (!j || j.phase === 'done') return;
  if (j.phase === 'open') {
    if (j.swishDay !== s.day - 1 || (j.swishes || 0) < 1) {
      j.neglect = (j.neglect || 0) + 1;
      if (j.neglect === 3) { j.careSteps = Math.min(2, (j.careSteps || 0) + 1); w.flags.wineNote = TEXT.wine.aMoldScareOn; }
    }
    j.swishes = 0;
    j.days++;
    if (j.days >= 3) { j.phase = 'sealed'; j.days = 0; j.sealCheckDay = s.day; w.flags.wineNote = TEXT.wine.theJarIsSealed_2; }
  } else if (j.phase === 'sealed') {
    j.days++;
    if (s.day - (j.sealCheckDay != null ? j.sealCheckDay : s.day) >= 7) {
      j.sealMiss = (j.sealMiss || 0) + 1; j.sealCheckDay = s.day;
      if (j.sealMiss >= 2) { j.careSteps = Math.min(2, (j.careSteps || 0) + 1); j.sealMiss = 0; w.flags.wineNote = TEXT.wine.theSealRanDry; }
      else w.flags.wineNote = TEXT.wine.theSealWaterSits;
    }
    const need = j.batch === 1 ? 14 : 28;
    if (j.days >= need) { j.phase = 'done'; j.verdict = wineVerdict(j); w.flags.wineNote = F(TEXT.wine.theJarIsDone, { batch: j.batch }); }
  }
  j.care = 'ABC'[j.careSteps || 0];
  saveGame();
}
function freshJar(batch, index) {
  return { batch, phase: 'open', days: 0, index, careSteps: 0, care: 'A', swishes: 0, swishDay: null, neglect: 0, sealCheckDay: null, sealMiss: 0, verdict: null };
}
function startBatchOne() {
  const s = G.save, w = s.world;
  s.wine.jar = freshJar(1, 0.1); w.flags.batch1 = 'fermenting'; w.step = 1; saveGame();
  say(TEXT.wine.batchOneTheRehearsal);
}
function startBatchTwo(index) {
  const s = G.save, w = s.world;
  const n = s.wine.batches.length + 1;
  s.wine.jar = freshJar(n, index); w.flags.batch2 = 'fermenting'; if (w.ch === 10) w.step = 4; saveGame();
  say([F(TEXT.wine.batchNTheField, { n: n, toFixedVal: index.toFixed(2) }), TEXT.wine.twentyEightDaysSealed]);
}
function swishJar() {
  const s = G.save, j = s.wine.jar;
  if (!j || j.phase !== 'open') return say(TEXT.wine.theJarIsSealed);
  if (j.swishDay !== s.day) { j.swishDay = s.day; j.swishes = 0; }
  if (j.swishes >= 3) return say(TEXT.wine.thriceSwishedTodayThe);
  j.swishes++; saveGame();
  say(F(TEXT.wine.swishSwishesOf3, { swishes: j.swishes }));
}
function sealCheck() {
  const s = G.save, j = s.wine.jar;
  if (!j || j.phase !== 'sealed') return say(F(TEXT.wine.noSealToCheck, { v: (j ? TEXT.wine.stillOpen : TEXT.wine.notBrewing) }));
  j.sealCheckDay = s.day; j.sealMiss = 0; saveGame();
  say(TEXT.wine.sealWaterToppedMeniscus);
}
function bottleJar() {
  const s = G.save, w = s.world, j = s.wine.jar;
  if (!j || j.phase !== 'done') return say(TEXT.wine.notYetTheJar);
  const entry = { n: j.batch, verdict: j.verdict, index: j.index, care: j.care, year: seasonOf(s.day).year };
  s.wine.batches.push(entry);
  s.wine.jar = null;
  if (w.ch === 10 && j.batch === 1) {
    w.flags.batch1 = 'bottled'; w.step = 2; saveGame();
    return say(TEXT.wine.batchOneBottledAnd);
  }
  if (w.ch === 10 && j.batch === 2) {
    w.flags.batch2 = 'bottled'; w.step = 5; saveGame(); layoutNPCs();
    return say([F(TEXT.wine.batchTwoBottledThe, { verdict: entry.verdict }), TEXT.wine.theTastingIsSet]);
  }
  saveGame();
  say(F(TEXT.wine.batchNBottledVerdict, { n: entry.n, verdict: entry.verdict }));
}
function perBushLbs() {
  const yr = seasonOf(G.save.day).year;
  const years = Object.keys(G.save.wine.poundsByYear).filter(y => +y !== yr).length; // fruiting years before this one
  return Math.min(8, 2 + 1.5 * years);
}
function harvestRow(rn) {
  const s = G.save, w = s.world, year = seasonOf(s.day).year;
  const row = s.cropRows[rn - 1];
  if (row.harvestedYear === year) return say(F(TEXT.field.rowRnIsPicked, { rn: rn }));
  if (row.fruitFell === year) return say(F(TEXT.field.rowRnSFruit, { rn: rn }));
  const ripe = s.plants.filter(p => !p.memorial && !p.gone && p.row === rn && p.stage >= 6);
  const countRipe = (row.bushCount || 0) > 0 && (row.stage || 0) >= 6;
  if (!ripe.length && !countRipe) return say(F(TEXT.field.rowRnIsNot, { rn: rn }));
  if (!projUse()) return;
  const base = perBushLbs();
  let total = 0;
  const lines = [];
  if (rn === 1 && w.ch === 10 && !w.flags.harvestThanks) { w.flags.harvestThanks = true; lines.push(TEXT.faith.harvestThanks); }
  // Favorite #11: the first to fruit — at the first picking of a crop
  // row in the wine chapter, Frank names the bush that fed them first
  if (rn >= 2 && w.ch === 10 && !w.flags.firstFruitNamed && countRipe) {
    const p = splitFavoriteFromRow(rn, 'fruit');
    if (p) { w.flags.firstFruitNamed = p.name; lines.push(F(TEXT.field.firstFruitNamed, { name: p.name })); ripe.push(p); }
  }
  for (const p of ripe) {
    const lbs = Math.round(base * (0.6 + 0.2 * (row.yieldRating || 1)) * ((row.fruitSet || 60) / 100) * (0.85 + (hashDay(s.day * 7 + p.name.length * 13) % 30) / 100) * 10) / 10;
    total += lbs;
    p.harvestByYear[year] = Math.round(((p.harvestByYear[year] || 0) + lbs) * 10) / 10;
    if (!p.firstHarvestDay) { p.firstHarvestDay = s.day; p.firstHarvestLbs = lbs; }
    lines.push(F(TEXT.field.nameTofixedvalLbsInto, { name: p.name, toFixedVal: lbs.toFixed(1) }));
  }
  if (countRipe) {
    // the row yields as a body: bushCount × the per-bush ramp, at the
    // row's rating and fruit-set (spec A5) — the shipped sum's expectation
    const rowLbs = Math.round((row.bushCount || 0) * base * (0.6 + 0.2 * (row.yieldRating || 1)) * ((row.fruitSet || 60) / 100) * (0.85 + (hashDay(s.day * 7 + rn * 13) % 30) / 100) * 10) / 10;
    total += rowLbs;
    lines.push(F(TEXT.field.rowHarvestedCount, { rn: rn, toFixedVal: rowLbs.toFixed(1) }));
  }
  total = Math.round(total * 10) / 10;
  row.poundsByYear[year] = Math.round(((row.poundsByYear[year] || 0) + total) * 10) / 10;
  s.wine.pounds += total; s.wine.poundsByYear[year] = Math.round(((s.wine.poundsByYear[year] || 0) + total) * 10) / 10;
  row.harvestedYear = year; saveGame();
  if (rn === 1) {
    const gone = s.plants.filter(p => p.memorial && p.firstSix && p.row === 1);
    for (const g of gone) lines.push(F(TEXT.field.theEmptyPlaceWhere, { name: g.name }));
    lines.push(TEXT.field.lilyFeriesTheSmall);
  }
  lines.push(F(TEXT.field.rowRnHarvestedTofixedval, { rn: rn, toFixedVal: total.toFixed(1), toFixedVal2: s.wine.poundsByYear[year].toFixed(1) }));
  if (w.ch === 10 && !w.flags.q900) {
    w.flags.q900 = true; saveGame();
    lines.push(TEXT.field.frankAtTheFence, TEXT.field.atThisManyBushes);
  }
  say(lines);
}
function tasting() {
  const s = G.save, w = s.world;
  const b = s.wine.batches[s.wine.batches.length - 1];
  const lines = TEXT.wine.aLateOctoberEvening;
  if (b && b.verdict === TEXT.wine.lovely) lines.push(TEXT.wine.theWineIsPoured, TEXT.wine.pastorLovelyOneWord, TEXT.wine.constanceYouCanTaste);
  else if (b && b.verdict === TEXT.wine.sweetAsCandy) lines.push(TEXT.wine.theWineIsPoured_2, TEXT.wine.pastorTheChildrenAt, TEXT.wine.constanceYouHaveMade);
  else if (b && b.verdict === TEXT.wine.tart) lines.push(TEXT.wine.theWineIsPoured_3, TEXT.wine.pastorItWouldWake, TEXT.wine.constanceItIsThe);
  else lines.push(TEXT.wine.theWineIsPoured_4, TEXT.wine.pastorItIsAn, TEXT.wine.constanceItTastesLike);
  lines.push(TEXT.faith.sharedCounts); // what was given away counts as yield in this house
  lines.push(TEXT.wine.constanceRaisesHerGlass);
  lines.push(TEXT.wine.andAtTheEnd, TEXT.wine.frankNextYearAnd);
  lines.push(TEXT.faith.settlement); // he did his part, sealed it, and waited on what he could not hurry
  say(lines, () => completeChapter(10));
}
function ch10Opening() {
  say(TEXT.openings.summerAndTheField);
}
function ch10Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.flags.wineNote) { const note = w.flags.wineNote; w.flags.wineNote = null; saveGame(); return [note]; }
  if (w.step === 2 && !w.flags.ripened) {
    w.flags.ripened = true;
    for (const p of s.plants) if (!p.memorial && p.row && p.stage === 5) { p.stage = 6; if (!p.fruitDay) p.fruitDay = s.day; }
    for (let rn = 1; rn <= 12; rn++) { const row = s.cropRows[rn - 1]; if (rowHasBushes(rn)) { row.ripeDay = s.day; if (row.stage === 5) row.stage = 6; } }
    saveGame();
    return TEXT.dawns.theFieldTurnsBerry;
  }
  if (w.step === 2) {
    const year = seasonOf(s.day).year, lines = [];
    for (let rn = 1; rn <= 12; rn++) {
      const row = s.cropRows[rn - 1];
      if (row.ripeDay && row.harvestedYear !== year && row.fruitFell !== year && s.day - row.ripeDay > 5) { row.fruitFell = year; lines.push(F(TEXT.dawns.rowRnSFruit, { rn: rn })); }
    }
    const open = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(rn => rowHasBushes(rn) && s.cropRows[rn - 1].harvestedYear !== year && s.cropRows[rn - 1].fruitFell !== year);
    if (!open.length) { w.step = 3; saveGame(); lines.push(F(TEXT.dawns.theHarvestIsIn, { toFixedVal: (s.wine.poundsByYear[year] || 0).toFixed(1) })); }
    if (lines.length) return lines;
  }
  return null;
}
function chapterDawnPrep(ev) { const w = G.save.world; if (w.ch === 2) ch2DawnPrep(ev); if (w.ch >= 3) { G.save.world.flags.heaterLit = false; } if (w.ch >= 6) ch6DawnPrep(); }
function seasonKey() { const so = seasonOf(G.save.day); return so.year * 4 + so.idx; }
function ch6DawnPrep() {
  const s = G.save, w = s.world;
  w.flags.wasWatered = {};
  for (const p of s.plants) if (p.watered && p.location === 'GREENHOUSE') w.flags.wasWatered[p.name] = true;
  for (let i = 0; i < 5; i++) if (s.field.tarp[i] === 1 && s.day - (s.field.tarpDay[i] || 0) >= 4) s.field.tarp[i] = 2;
  if (w.flags.mulchComing && w.flags.mulchComing <= s.day) { s.field.mulch += 8; w.flags.mulchComing = null; }
  if (w.ch >= 8) {
    if (w.flags.seasonKey == null) w.flags.seasonKey = seasonKey();
    if (w.flags.seasonKey !== seasonKey()) {
      w.flags.seasonKey = seasonKey();
      for (const r of s.cropRows) if (r.fedStamp != null && r.fedStamp !== seasonKey()) { r.yieldRating = Math.max(0, r.yieldRating - 1); r.fedStamp = null; }
      w.flags.seasonChanged = seasonOf(s.day).idx;
      for (const p of s.plants) if (!p.memorial && p.location === 'GARDEN') {
        p.gardenSeasons = (p.gardenSeasons || 0) + 1;
        if (p.gardenSeasons >= 4) p.gardenState = 'FLOURISHING'; else if (p.gardenSeasons >= 2) p.gardenState = 'ESTABLISHED';
      }
    }
  }
}
function ch2DawnPrep(ev) {
  const s = G.save, w = s.world;
  // stratification: the fridge tray banks one day per winter day
  if (w.flags.fridgeTray && !s.tray.ready && seasonOf(s.day).idx === 3) s.tray.stratDays++;
}
function ch2Opening() {
  say(TEXT.openings.fallIsComingOn);
}
function ch2Dawn(ev) {
  const s = G.save, w = s.world;
  if (w.step === 0) {
    if (s.day < 36) s.day = 36; // the summer passes, the way summers do
    w.step = 1;
    return TEXT.dawns.theSummerPassesThe;
  }
  if (w.step === 1) {
    if (w.flags.fridgeTray && w.flags.carried) { w.step = 2; return null; }
    if (!w.flags.fridgeTray) return TEXT.dawns.theSeedsWaitIn;
    return null;
  }
  if (w.step === 2) { w.step = 3; return TEXT.dawns.theFirstHouseA; }
  if (w.step === 3) { w.step = 4; return TEXT.dawns.theSecondHouseHad; }
  if (w.step === 4) {
    w.step = 5; w.flags.omaVisit = true; w.flags.trips = 0;
    return TEXT.dawns.theThirdHousePerfect;
  }
  if (w.step === 5) { w.flags.omaVisit = false; return null; }
  if (w.step === 6) {
    // the winter deepens until the tray has had its ten cold days
    if (s.tray.stratDays < 10) { if (s.day < 54) s.day = 54; s.tray.stratDays = 12; }
    s.tray.ready = true; s.tray.n = 40;
    w.step = 7; w.flags.frostIn = 2;
    return TEXT.dawns.inTheNightIn;
  }
  if (w.step === 7) {
    if (w.flags.frostIn > 0 && !w.flags.frostDone) {
      w.flags.frostIn--;
      if (w.flags.frostIn === 1) { w.flags.coldComing = true; return TEXT.dawns.theRadioSaysA; }
      if (w.flags.frostIn === 0) { startFrostTrial(); return null; }
    }
    return null;
  }
  return null;
}
function startFrostTrial() {
  const s = G.save, w = s.world;
  // Decision 8: the tutorial's cold finds the Company first (a count
  // loss); named mortality is taught through the six alone.
  if (!w.flags.blanket && s.company && s.company.health === 0) s.company.health = 1;
  saveGame();
  startTrial({ foe: 'FROST', kind: 'frostTray', pressure: 25, vigor: 22, plantsList: sixPlants(), msg: TEXT.trials.theColdComesFor });
}
TRIAL_OUTCOMES.frostTray = {
  win(t) {
    G.save.world.flags.frostDone = true; G.save.world.flags.coldComing = false; saveGame();
    say(TEXT.trials.theFreezeBreaksAgainst);
  },
  lose(t, fled) {
    const s = G.save, w = s.world;
    if (fled) { w.flags.frostIn = 1; saveGame(); return say(TEXT.trials.alvinBacksOffTo); }
    w.flags.frostDone = true; w.flags.coldComing = false;
    for (const p of sixPlants()) { if (!p.memorial) { if (p.health < 3) p.health++; p.wateredDays = Math.max(0, p.wateredDays - 1); } }
    const lines = [...TEXT.trials.theColdGotIn];
    if (s.company && s.company.n > 0) {
      const loss = Math.min(s.company.n, 4);
      s.company.n -= loss;
      if (s.germ) s.germ.lost = (s.germ.lost || 0) + loss;
      lines.push(F(TEXT.trials.companyColdLoss, { n: loss }));
    }
    saveGame();
    say(lines);
  },
};

function chapterDawn(ev) { const w = G.save.world; if (w.ch === 2) return ch2Dawn(ev); if (w.ch === 3) return ch3Dawn(ev); if (w.ch === 4) return ch4Dawn(ev); if (w.ch === 5) return ch5Dawn(ev); if (w.ch === 6) return ch6Dawn(ev); if (w.ch === 7) return ch7Dawn(ev); if (w.ch === 8) return ch8Dawn(ev); if (w.ch === 9) return ch9Dawn(ev); if (w.ch === 10) return ch10Dawn(ev); if (w.ch === 11) return ltDawn(ev); return null; }

const CHAPTER_INFO = TEXT.cards.chapters;
let cardChapter = 1;
function completeChapter(n) {
  const w = G.save.world;
  if (n === 1) G.save.chapterDone = true;
  w.ch = n + 1; w.step = 0; saveGame();
  cardChapter = n; mode = 'card'; cardSel = 0;
}
function checkChapter() {
  const s = G.save;
  if (s.world.ch === 1 && !s.chapterDone && s.deerBeaten && anyStageAtLeast(3)) { completeChapter(1); return true; }
  return false;
}

let cardSel = 0;

/* ============================== WEEDS -> COMPOST -> GOOD DIRT ============================== */
/* The yard's second loop (Daniel, Nov 26): weeds creep in at dawn, Frank
   pulls them for compost, and three compost makes one GOOD DIRT for a
   chosen pot. Weeds are pure opportunity — decor layer, non-solid,
   never harmful: they cannot block a step or hurt a plant. */
const WEED_CAP = 6;
const WEED_TILES = new Set(['g', 'u']); // open grass only — never paths, the bench, the garden plot, flower beds, or the house apron (rows above 5)
function weedAt(x, y, area) { return (G.save.weeds || []).find(w => w.x === x && w.y === y && (w.area || 'yard') === (area || 'yard')) || null; }
function spawnWeeds(count) {
  const s = G.save;
  if (!Array.isArray(s.weeds)) s.weeds = [];
  const taken = new Set(s.weeds.map(w => w.x + ',' + w.y));
  const blocked = new Set([player.tx + ',' + player.ty, alvin.tx + ',' + alvin.ty, constance.tx + ',' + constance.ty]);
  if (s.deerPresent && !s.deerBeaten) blocked.add(DEER_POS.x + ',' + DEER_POS.y);
  const spots = [];
  for (let y = 5; y < MAP_H; y++) for (let x = 1; x < MAP_W - 1; x++) {
    if (!WEED_TILES.has(mapChar(x, y))) continue;
    const k = x + ',' + y;
    if (taken.has(k) || blocked.has(k)) continue;
    spots.push({ x, y });
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
  while (count > 0 && s.weeds.length < WEED_CAP && spots.length) {
    const sp = spots.pop();
    s.weeds.push({ x: sp.x, y: sp.y, deep: Math.random() < 0.2, area: 'yard' }); // about 1 in 5 is deep-rooted
    count--;
  }
}
/* Field weed patches (Nov 28, 2026): the lanes between the vertical
   rows grow patches of their own, under the yard loop's rules — dawn
   spawning, decor only, never solid, pulled for compost (deep-rooted
   pays double). The bad shed's dig corner (24,16) is never seeded. */
const FIELD_WEED_CAP = 8;
function spawnFieldWeeds(count) {
  const s = G.save;
  if (!Array.isArray(s.weeds)) s.weeds = [];
  const taken = new Set(s.weeds.filter(w => w.area === 'field').map(w => w.x + ',' + w.y));
  const blocked = new Set();
  if (area === 'barnOut') { blocked.add(player.tx + ',' + player.ty); blocked.add(alvin.tx + ',' + alvin.ty); }
  const spots = [];
  for (let x = 2; x <= 24; x += 2) for (let y = 13; y <= 16; y++) {
    if (x === 24 && y === 16) continue;
    const k = x + ',' + y;
    if (taken.has(k) || blocked.has(k)) continue;
    spots.push({ x, y });
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
  let have = s.weeds.filter(w => w.area === 'field').length;
  while (count > 0 && have < FIELD_WEED_CAP && spots.length) {
    const sp = spots.pop();
    s.weeds.push({ x: sp.x, y: sp.y, deep: Math.random() < 0.2, area: 'field' });
    have++; count--;
  }
}
/* Pull feedback: the tuft arcs away and a "+N COMPOST" note floats up.
   Both are timed off perfNow at draw time, so they need no update loop. */
let floaters = []; // {x, y, text, t0} in world pixels
let tosses = [];   // {x, y, deep, t0} in tiles
function pullWeed(w) {
  const s = G.save;
  s.weeds = s.weeds.filter(q => q !== w);
  const gain = w.deep ? 2 : 1;
  s.compost += gain;
  floaters.push({ x: w.x * TILE + 8, y: w.y * TILE + 4, text: '+' + gain + ' COMPOST', t0: perfNow });
  tosses.push({ x: w.x, y: w.y, deep: w.deep, t0: perfNow });
  saveGame();
  if (!s.weedLineSeen) {
    s.weedLineSeen = true; saveGame();
    say(TEXT.yard.frankAhAWeed);
  }
}

/* intro: original dialogue only */
function startIntro() {
  player.tx = 11; player.ty = 6; player.dir = 'left'; syncPixels(player);
  alvin.tx = 10; alvin.ty = 7; syncPixels(alvin);
  constance.tx = 12; constance.ty = 6; constance.dir = 'left';
  say(TEXT.openings.constanceYourSeedsCame, () => { G.save.tutorial = 1; saveGame(); });
}

/* ============================== TRIAL: WILD DEER ============================== */
/* Alvin is the only actor on the player's side: his HP is the defended
   garden's old Vigor value, and the moves map 1:1 from the old plant slots
   (LUNGE = the GROW slot's 6, as Pressure damage; GUARD = WATER's shield;
   DIG IN = MULCH's armor; BARK unchanged). The pots are scenery he defends:
   lose, and the deer gets past him and nibbles the strongest sprout back. */
let trial = null;
const MOVES = TEXT.trials.moves;
/* Trials, generalized (spec 2.5): Alvin's moves never change; the foe,
   the stakes and the outcome do. cfg: {foe, kind, pressure, vigor, pot
   (index into the six, for the snapshot), plantsList, msg, graze, snap,
   row}. With no cfg this is the chapter-1 deer, exactly as shipped. */
// TRIAL_OUTCOMES is declared at the top of the file (chapters register into it)
function startTrial(cfg) {
  cfg = cfg || {};
  const foe = cfg.foe || 'DEER';
  let pot = cfg.pot != null ? cfg.pot : strongestPot();
  if (pot < 0) pot = 0;
  const p = sixPlants()[pot];
  trial = {
    foe, kind: cfg.kind || 'deer',
    pot, pressure: cfg.pressure || 30, maxPressure: cfg.pressure || 30,
    phase: 'intro', msg: (cfg.msg || TEXT.trials.alvinLeapsInFront), timer: 0,
    menu: 0, moveSel: 0, shield: false, armor: false, over: false, result: null,
    vigor: cfg.vigor || MAX_VIGOR[p.stage], maxVigor: cfg.vigor || MAX_VIGOR[p.stage], anim: null,
    plantsList: cfg.plantsList || null, row: cfg.row != null ? cfg.row : null,
    turn: 0, foeTurns: 0, telly: null, snapUsed: false, snap: !!cfg.snap,
    foeArmor: foe === 'WEEDS', graze: !!cfg.graze, grazeStreak: 0, grazeLands: 0,
    lastMove: null, sameMove: 0, wave: cfg.wave || 1, waves: cfg.waves || null, cfgRef: cfg,
    watch: cfg.watch || null,
  };
  mode = 'trial';
}

function trialSetMsg(m, phase) { trial.msg = m; trial.phase = phase || 'wait'; trial.timer = 0; }
function trialUpdate(dt) {
  const t = trial;
  t.timer += dt;
  if (t.phase === 'wait' && Input.aHit && t.timer > 0.25) t.timer = 2; // a brisk player may tap through the result message
  if (t.phase === 'intro' && t.timer > 1.1) { t.phase = 'menu'; t.menu = 0; t.sel = 0; }
  else if (t.phase === 'wait' && t.timer > 1.15) {
    if (t.over) return endTrial();
    if (t.foeTurn) { t.foeTurn = false; foeAct(); }
    else { t.phase = 'menu'; t.menu = 0; t.sel = 0; t.anim = null; }
  }
  if (t.phase === 'menu' || t.phase === 'moves' || t.phase === 'plants' || t.phase === 'bag') {
    if (Input.bHit && t.phase !== 'menu') { t.phase = 'menu'; t.sel = 0; return; }
    const n = (t.phase === 'menu' || t.phase === 'moves') ? 4 : 1; // PLANTS is a peek, BAG has one item
    if (Input.dir.y < 0 || Input.dir.x < 0) { /* handled on hit below */ }
    if (menuNavHit('up')) t.sel = (t.sel || 0) - (t.phase === 'menu' || t.phase === 'moves' ? 2 : 1);
    if (menuNavHit('down')) t.sel = (t.sel || 0) + (t.phase === 'menu' || t.phase === 'moves' ? 2 : 1);
    if (menuNavHit('left')) t.sel = (t.sel || 0) - 1;
    if (menuNavHit('right')) t.sel = (t.sel || 0) + 1;
    if (t.sel === undefined) t.sel = 0;
    t.sel = ((t.sel % n) + n) % n;
    if (Input.aHit) trialChoose();
  }
}
let navPrev = { x: 0, y: 0 };
function menuNavHit(which) {
  const d = Input.dir; let hit = false;
  if (which === 'up') hit = d.y < 0 && navPrev.y >= 0;
  if (which === 'down') hit = d.y > 0 && navPrev.y <= 0;
  if (which === 'left') hit = d.x < 0 && navPrev.x >= 0;
  if (which === 'right') hit = d.x > 0 && navPrev.x <= 0;
  return hit;
}
function trialChoose() {
  const t = trial, s = G.save;
  if (t.phase === 'menu') {
    if (t.sel === 0) { t.phase = 'moves'; t.sel = 0; }
    else if (t.sel === 1) { t.phase = 'plants'; t.sel = 0; }
    else if (t.sel === 2) { t.phase = 'bag'; t.sel = 0; }
    else { trialSetMsg((t.foe === 'DEER' ? TEXT.trials.youBackAwaySlowly : TEXT.trials.alvinBacksOffSlowly)); t.over = true; t.result = 'flee'; }
    return;
  }
  if (t.phase === 'plants') { t.phase = 'menu'; t.sel = 0; return; } // a peek costs no turn
  if (t.phase === 'bag') {
    if (s.tea > 0) {
      s.tea--; t.vigor = Math.min(t.maxVigor, t.vigor + 10);
      trialSetMsg(TEXT.trials.usedCompostTeaAlvin); t.foeTurn = true;
    } else trialSetMsg(TEXT.trials.noTeaLeftBrew);
    return;
  }
  // moves — all Alvin's; the numbers bend a little by foe (spec 2.5)
  const mv = MOVES[t.sel];
  if (mv === t.lastMove) t.sameMove++; else { t.lastMove = mv; t.sameMove = 1; }
  t.turn++;
  const pdmg = base => {
    let d = base;
    if (t.foe === 'BARBER' && mv === TEXT.trials.moves[0]) d = Math.ceil(base / 2);
    if (t.foe === 'WEEDS' && t.foeArmor && (mv === TEXT.trials.moves[0] || mv === TEXT.trials.moves[3])) d = Math.max(1, base - 2);
    if (t.foe === 'WEEDS' && mv === TEXT.trials.moves[3]) d = 2;
    return d;
  };
  const foeName = (t.foe === 'DEER' ? TEXT.trials.theDeer : (t.foe === 'FROST' ? TEXT.trials.theCold : (t.foe === 'WEEDS' ? TEXT.trials.theWeeds : TEXT.trials.theBarber)));
  if (mv === TEXT.trials.moves[0]) {
    t.anim = 'lunge';
    t.pressure = Math.max(0, t.pressure - pdmg(6));
    if (t.pressure <= 0) { trialSetMsg(F(TEXT.trials.alvinLungesFoenameBreaks, { foeName: foeName })); t.over = true; t.result = 'win'; saveGame(); return; }
    trialSetMsg(F(TEXT.trials.alvinLungesFoenameStaggers, { foeName: foeName }));
  }
  else if (mv === TEXT.trials.moves[1]) { t.shield = true; trialSetMsg(TEXT.trials.alvinPlantsHisPaws); }
  else if (mv === TEXT.trials.moves[2]) {
    t.armor = true;
    if (t.foe === 'WEEDS') {
      if (t.foeArmor) { t.foeArmor = false; t.pressure = Math.max(0, t.pressure - 4); trialSetMsg(TEXT.trials.alvinTearsAtThe); if (t.pressure <= 0) { t.over = true; t.result = 'win'; saveGame(); return; } }
      else { t.pressure = Math.max(0, t.pressure - 4); trialSetMsg(TEXT.trials.alvinDigsInAmong); if (t.pressure <= 0) { t.over = true; t.result = 'win'; saveGame(); return; } }
    } else trialSetMsg(TEXT.trials.alvinDigsInNothing);
  }
  else if (mv === TEXT.trials.moves[3]) {
    t.anim = 'bark';
    t.pressure = Math.max(0, t.pressure - pdmg(8));
    if (t.pressure <= 0) { trialSetMsg(F(TEXT.trials.alvinBarksHisBrave, { foeName: foeName })); t.over = true; t.result = 'win'; saveGame(); return; }
    const flinchP = t.foe === 'BARBER' ? 0.45 : t.foe === 'WEEDS' ? 0 : 0.3;
    if (Math.random() < flinchP) { trialSetMsg(F(TEXT.trials.alvinUsedBarkFoename, { foeName: foeName })); saveGame(); return; } // foe loses turn
    trialSetMsg(F(TEXT.trials.alvinUsedBarkFoename_2, { foeName: foeName }));
  }
  t.foeTurn = true;
}
function foeAct() {
  const t = trial;
  if (t.foe === 'FROST') return frostAct();
  if (t.foe === 'WEEDS') return weedsAct();
  if (t.foe === 'BARBER') return barberAct();
  return deerAct();
}
function foeHit(dmg, name, flavor) {
  const t = trial;
  if (t.armor) dmg = Math.max(1, dmg - 2);
  if (t.shield) { dmg = Math.floor(dmg / 2); t.shield = false; }
  t.vigor = Math.max(0, t.vigor - dmg);
  trialSetMsg((flavor ? flavor.replace("%D", dmg) : F(TEXT.trials.foeUsedNameIt, { foe: t.foe, name: name, dmg: dmg })));
  if (t.vigor <= 0) { t.over = true; t.result = 'lose'; }
  t.foeTurn = false;
}
function frostAct() {
  const t = trial; t.foeTurns++;
  // SETTLE: the cold exploits a repeated move (spec 2.5)
  if (t.sameMove >= 3) { t.pressure += 5; t.sameMove = 0; trialSetMsg(TEXT.trials.theColdSettlesInto); t.foeTurn = false; return; }
  if (t.telly) {
    const kind = t.telly; t.telly = null;
    if (kind === TEXT.trials.snap) { t.snapUsed = true; foeHit(t.kind === 'frostBlossom' ? 10 : 9, TEXT.trials.snap, TEXT.trials.theColdSnapsShut); }
    else foeHit(6, TEXT.trials.gust, TEXT.trials.theGustHitsLike);
    return;
  }
  if (t.snap && !t.snapUsed && t.foeTurns % 4 === 3) { t.telly = 'SNAP'; foeHit(5, TEXT.trials.creep, TEXT.trials.theColdCreepsIn); return; }
  if (t.foeTurns % 3 === 0) { t.telly = 'GUST'; foeHit(4, TEXT.trials.creep, TEXT.trials.theColdCreepsIn_2); return; }
  foeHit(4, TEXT.trials.creep);
}
function weedsAct() {
  const t = trial; t.foeTurns++;
  if (Math.random() < 0.45) { t.pressure += 4; trialSetMsg(TEXT.trials.theWeedsCreepA); t.foeTurn = false; return; }
  foeHit(t.kind === 'weedsWar' ? 7 : 5, TEXT.trials.choke);
}
function barberAct() {
  const t = trial; t.foeTurns++;
  if (t.foeTurns % 3 === 0) { t.pressure += 5; trialSetMsg(TEXT.trials.theBarberIsGone); t.foeTurn = false; return; }
  if (t.shield) { t.shield = false; trialSetMsg(TEXT.trials.aSnipInThe); t.foeTurn = false; return; }
  foeHit(3, TEXT.trials.snip);
}

function deerAct() {
  const t = trial;
  const r = Math.random();
  let dmg, name;
  if (t.graze && r >= 0.85) { // GRAZE: no wound — the deer settles in to eat
    t.grazeStreak++; t.grazeLands++;
    if (t.grazeStreak >= 2) { t.pressure += 3; trialSetMsg(TEXT.trials.theDeerSettlesIn); }
    else trialSetMsg(TEXT.trials.theDeerLowersIts);
    t.foeTurn = false;
    return;
  }
  if (r < 0.5) { dmg = 7; name = TEXT.trials.nibble; }
  else if (r < 0.8) { dmg = 4; name = TEXT.trials.stomp; }
  else { dmg = 2; name = TEXT.trials.stare; }
  t.grazeStreak = 0;
  if (t.armor) dmg = Math.max(1, dmg - 2);
  if (t.shield) { dmg = Math.floor(dmg / 2); t.shield = false; }
  t.vigor = Math.max(0, t.vigor - dmg);
  if (name === TEXT.trials.stare) trialSetMsg(F(TEXT.trials.deerUsedStareIt, { dmg: dmg }));
  else trialSetMsg(F(TEXT.trials.deerUsedNameIt, { name: name, dmg: dmg }));
  if (t.vigor <= 0) { t.over = true; t.result = 'lose'; }
  t.foeTurn = false;
}
function endTrial() {
  const t = trial, s = G.save; trial = null; mode = 'overworld';
  if (t.kind === 'deer') {
    if (t.result === 'win') {
      s.deerBeaten = true; s.deerPresent = false; saveGame();
      say([].concat(TEXT.trials.theYardIsSafe, TEXT.faith.tenantYard), () => { checkChapter(); });
    } else if (t.result === 'lose') {
      const p = sixPlants()[t.pot];
      if (p.stage > 1) { p.stage--; if (p.stage < 3) p.seedlingDay = null; if (p.stage < 2) p.sproutedDay = null; }
      p.wateredDays = 0; p.vigor = MAX_VIGOR[p.stage] || 0;
      saveGame();
      say(TEXT.trials.theDeerGotPast, () => { fading = 'dawn'; fade = 1; setTimeout(dawn, 350); });
    }
    return;
  }
  if (t.result === 'win' && t.waves && t.wave < t.waves.length) {
    const cfg = Object.assign({}, t.cfgRef, { wave: t.wave + 1, pressure: t.waves[t.wave], vigor: t.maxVigor, msg: TEXT.trials.theSecondWaveComes });
    startTrial(cfg);
    return;
  }
  const oc = TRIAL_OUTCOMES[t.kind];
  if (oc) {
    if (t.result === 'win') oc.win(t);
    else oc.lose(t, t.result === 'flee');
  }
}

function trialPlantsList() { return trial && trial.plantsList ? trial.plantsList : sixPlants(); }
function trialSnapshot() {
  if (!trial) return null;
  const p = sixPlants()[trial.pot];
  return { actor: 'ALVIN', foe: trial.foe, kind: trial.kind, pressure: trial.pressure, maxPressure: trial.maxPressure, vigor: trial.vigor, maxVigor: trial.maxVigor, pot: trial.pot, stage: p.stage, phase: trial.phase, over: trial.over, result: trial.result, msg: trial.msg, wave: trial.wave, plants: trialPlantsList().map(q => q.name + ':' + q.stage) };
}

/* ============================== RENDER: TITLE / CHAPTERS ============================== */
let titleConfirm = false;
function hasSaveFile() { return !!loadSave(); }
function titleLabels() { return hasSaveFile() ? ['NEW GAME', 'CONTINUE', 'CHAPTERS', 'TIME TRAVEL', 'CONTROLS'] : ['NEW GAME', 'CHAPTERS', 'TIME TRAVEL', 'CONTROLS']; }
function titleUpdate() {
  const items = titleLabels().length;
  if (titleConfirm) {
    if (Input.aHit) { titleConfirm = false; startNewGame(); }
    if (Input.bHit) titleConfirm = false;
    return;
  }
  if (menuNavHit('up')) titleSel = (titleSel + items - 1) % items;
  if (menuNavHit('down')) titleSel = (titleSel + 1) % items;
  if (Input.aHit) {
    const pick = titleLabels()[titleSel];
    if (pick === 'NEW GAME') { if (hasSaveFile()) titleConfirm = true; else startNewGame(); }
    else if (pick === 'CONTINUE') continueGame();
    else if (pick === 'CHAPTERS') { mode = 'chapters'; }
    else if (pick === 'TIME TRAVEL') openTravel();
    else if (pick === TEXT.controls.controls) openControls('title');
  }
}
function startNewGame() {
  G.save = newSave(); titleSel = 0; area = 'yard'; AW = MAP_W; AH = MAP_H; npcList = [];
  player.tx = 11; player.ty = 6; syncPixels(player);
  alvin.tx = 10; alvin.ty = 7; syncPixels(alvin);
  mode = 'overworld'; startIntro();
}
function continueGame() {
  const s = loadSave(); if (!s) return;
  G.save = s;
  area = AREAS[s.world.area] ? s.world.area : 'yard';
  AW = curArea().w; AH = curArea().h;
  player.tx = s.player.x; player.ty = s.player.y; player.dir = s.player.dir || 'down'; syncPixels(player);
  layoutNPCs();
  alvin.tx = s.player.x; alvin.ty = Math.min(MAP_H - 1, s.player.y + 1); syncPixels(alvin);
  constance.tx = 13; constance.ty = 5;
  mode = 'overworld';
  toast(F(TEXT.toasts.welcomeBackDayDay, { day: s.day }));
}
function drawSceneBanner(y0, seedling) {
  ctx.fillStyle = '#7ec8f7'; ctx.fillRect(0, y0, VW, 30);
  ctx.fillStyle = '#a8dcff'; ctx.fillRect(0, y0 + 30, VW, 8);
  // clouds
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(52, y0 + 5, 20, 4); ctx.fillRect(56, y0 + 3, 11, 2); ctx.fillRect(104, y0 + 10, 15, 3);
  ctx.fillStyle = '#dfe9f5'; ctx.fillRect(52, y0 + 9, 20, 1); ctx.fillRect(104, y0 + 13, 15, 1);
  // sun (top-centre, clear of the tree), with a pale haze behind it
  ctx.fillStyle = '#a8dcff'; ctx.fillRect(73, y0, 18, 18);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(76, y0 + 2, 12, 12);
  ctx.fillStyle = '#ffec9e'; ctx.fillRect(79, y0 + 5, 6, 6);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(81, y0, 2, 2); ctx.fillRect(81, y0 + 14, 2, 2); ctx.fillRect(72, y0 + 7, 2, 2); ctx.fillRect(90, y0 + 7, 2, 2);
  // ground: the yard's own grass tiles, then the picket fence line
  for (let gx = 0; gx < VW; gx += 16) {
    ctx.drawImage(gx % 32 ? TILES.grass2 : TILES.grass, gx, y0 + 32);
    ctx.drawImage(gx % 48 ? TILES.grass : TILES.grass2, gx, y0 + 48);
  }
  for (let gx = 0; gx < VW; gx += 16) ctx.drawImage(TILES.fenceH, gx, y0 + 30);
  // the little blue house, left — built from the yard's own tiles now,
  // with a shaded brick chimney and its first smoke
  ctx.drawImage(TILES.roof, 4, y0 + 10); ctx.drawImage(TILES.roof, 20, y0 + 10);
  ctx.drawImage(TILES.window, 4, y0 + 26); ctx.drawImage(TILES.door, 20, y0 + 26);
  ctx.fillStyle = '#b85c38'; ctx.fillRect(28, y0 + 3, 5, 8);
  ctx.fillStyle = '#d97b4a'; ctx.fillRect(28, y0 + 3, 1, 8);
  ctx.fillStyle = '#8a3d20'; ctx.fillRect(32, y0 + 3, 1, 8);
  ctx.fillStyle = '#c3c9d1'; ctx.fillRect(27, y0 + 2, 7, 2);
  ctx.fillStyle = '#e8edf2'; ctx.fillRect(35, y0 + 1, 3, 2); ctx.fillRect(39, y0 + 2, 2, 2);
  // the tree, right — the yard's volumetric canopy, scaled to the banner
  ctx.drawImage(TREE, 114, y0 - 4, 36, 42);
  // the house and tree throw soft shadows onto the grass, like everything else
  ctx.fillStyle = '#2f7a24';
  ctx.fillRect(5, y0 + 38, 40, 2); ctx.fillRect(8, y0 + 40, 34, 1);
  ctx.fillRect(123, y0 + 38, 24, 2); ctx.fillRect(127, y0 + 40, 16, 1);
  // a scatter of little flowers and tufts in the banner grass
  for (const [fx, fc] of [[8, '#ff5d8f'], [52, '#ffd94a'], [66, '#ffffff'], [104, '#ff5d8f'], [148, '#ffd94a']]) {
    ctx.fillStyle = fc; ctx.fillRect(fx, y0 + 51, 2, 2);
  }
  ctx.fillStyle = '#3f9433';
  for (const tx of [22, 44, 88, 118, 138]) { ctx.fillRect(tx, y0 + 46, 1, 2); ctx.fillRect(tx + 2, y0 + 47, 1, 2); }
  // the family out in the yard: Frank among his pots, Constance by the
  // tree with Alvin at her heel — each on a little ground shadow
  const folkShadow = (x) => { ctx.fillStyle = '#2f7a24'; ctx.fillRect(x + 2, y0 + 58, 12, 2); };
  folkShadow(47); ctx.drawImage((perfNow % 3.7) < 0.13 ? FRANK_DOWN_BLINK : FRANK_DOWN, 47, y0 + 35, 16, 24);
  folkShadow(118); ctx.drawImage(((perfNow + 1.9) % 3.7) < 0.13 ? CONSTANCE_DOWN_BLINK : CONSTANCE_DOWN, 118, y0 + 35, 16, 24);
  for (let i = 0; i < 6; i++) ctx.drawImage(seedling ? POT_SEEDLING : POT_SPROUT, 14 + i * 17, y0 + 44, 13, 13);
  folkShadow(138); ctx.drawImage(Math.floor(perfNow * 3) % 2 ? ALVIN_DOWN2 : ALVIN_DOWN, 136, y0 + 42, 20, 18);
}
function renderTitle() {
  ctx.fillStyle = '#274e13'; ctx.fillRect(0, 0, VW, VH);
  drawSceneBanner(0, false);
  // the dark lower field carries a whisper of the banner's grass dressing
  // so the plaque and menu don't float on a void
  ctx.fillStyle = '#2c5236';
  for (const tx of [8, 26, 128, 146]) { ctx.fillRect(tx, 112, 1, 2); ctx.fillRect(tx + 2, 113, 1, 2); }
  for (const tx of [16, 138]) { ctx.fillRect(tx, 88, 1, 2); ctx.fillRect(tx + 2, 89, 1, 2); }
  ctx.fillStyle = '#3f6a45'; ctx.fillRect(10, 126, 2, 2); ctx.fillRect(148, 104, 2, 2);
  // the plaque casts a soft shadow, and wears a fine inner frame line.
  // The whole title composition rides four units higher than it first
  // did: with a save present the list now runs five deep (NEW GAME /
  // CONTINUE / CHAPTERS / TIME TRAVEL / CONTROLS — TIME TRAVEL added
  // Nov 27, 2026), so the pitch is six and the list starts at y=101.
  // The last row still ends at y=130 of 144, clear of the strip the
  // HTML book plaques overlay at the screen's foot — at the old pitch
  // the fourth row fell into that strip and CONTROLS hid behind the
  // plaques outright on Daniel's phone (Nov 27, 2026).
  ctx.fillStyle = 'rgba(10,20,13,0.5)'; ctx.fillRect(17, 63, 132, 34);
  ctx.fillStyle = '#14251a'; ctx.fillRect(14, 60, 132, 34);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(14, 60, 132, 1); ctx.fillRect(14, 93, 132, 1); ctx.fillRect(14, 60, 1, 34); ctx.fillRect(145, 60, 1, 34);
  ctx.fillStyle = '#2c5236'; ctx.fillRect(17, 63, 126, 1); ctx.fillRect(17, 90, 126, 1); ctx.fillRect(17, 63, 1, 28); ctx.fillRect(142, 63, 1, 28);
  drawText(TEXT.screens.hopeStarts, 80 - textW(TEXT.screens.hopeStarts, 2) / 2 + 1, 65, '#14251a', 2);
  drawText(TEXT.screens.hopeStarts, 80 - textW(TEXT.screens.hopeStarts, 2) / 2, 64, '#ffffff', 2);
  drawText('SMALL', 80 - textW('SMALL', 2) / 2 + 1, 79, '#7a4a21', 2);
  drawText('SMALL', 80 - textW('SMALL', 2) / 2, 78, TEXT.screens.ffd94a, 2);
  const chW = textW(TEXT.screens.chapter1Seeds, 1);
  drawText(TEXT.screens.chapter1Seeds, 80 - chW / 2, 97, '#cfe8cf', 1);
  ctx.fillStyle = '#ffd94a'; // two short gold rules flank the chapter line
  ctx.fillRect(80 - chW / 2 - 11, 99, 6, 1); ctx.fillRect(80 + chW / 2 + 5, 99, 6, 1);
  titleLabels().forEach((l, i) => {
    const y = 101 + i * 6;
    if (i === titleSel) { ctx.fillStyle = 'rgba(10,20,13,0.45)'; ctx.fillRect(38, y - 1, 80, 6); } // the chosen row sits on a soft plate
    if (i === titleSel) drawText('▶', 42, y, TEXT.screens.ffd94a, 1);
    drawText(l, 50, y, i === titleSel ? '#ffffff' : '#9fc79f', 1);
  });
  // a thin gold frame around the whole scene
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(0, 0, VW, 1); ctx.fillRect(0, VH - 1, VW, 1); ctx.fillRect(0, 0, 1, VH); ctx.fillRect(VW - 1, 0, 1, VH);
  // the theme song's one visible trace: a small note in the corner — dim
  // and breathing until the first touch wakes the audio, gold while it
  // plays, absent entirely when MUSIC is off
  if (settings.music) {
    const col = themePlaying ? '#ffd94a' : (Math.floor(perfNow * 1.5) % 2 ? '#8fce8f' : '#5d8a5d');
    drawText('♪', 150, 134, col, 1);
  }
  if (titleConfirm) {
    drawBox(48, 34);
    drawText(TEXT.screens.eraseYourSaveAnd, 80 - textW(TEXT.screens.eraseYourSaveAnd, 1) / 2, 54, '#20242a', 1);
    drawText(TEXT.screens.startOver, 80 - textW(TEXT.screens.startOver, 1) / 2, 63, '#20242a', 1);
    drawText(TEXT.screens.aYesBNo, 80 - textW(TEXT.screens.aYesBNo, 1) / 2, 74, '#b03030', 1);
  }
}
function renderChapters() {
  ctx.fillStyle = '#1d3a26'; ctx.fillRect(0, 0, VW, VH);
  drawText(TEXT.screens.theJournal, 80 - textW(TEXT.screens.theJournal, 2) / 2, 8, '#ffffff', 2);
  drawText(TEXT.screens.whatTheFieldRemembers, 80 - textW(TEXT.screens.whatTheFieldRemembers, 1) / 2, 21, '#9fc79f', 1);
  const ch = G.save ? G.save.world.ch : 1;
  const rows = [];
  for (let n = 1; n <= 10; n++) rows.push({ n, info: CHAPTER_INFO[n] });
  rows.push({ n: 11, info: { name: TEXT.cards.theLongTending, teaser: TEXT.cards.noLastPageJust } });
  rows.slice(0, 11).forEach((r, i) => {
    const y = 30 + i * 8;
    const done = r.n < ch || (r.n === 11 && ch === 11);
    const current = r.n === ch;
    const col = done ? '#cfe8cf' : current ? '#ffd94a' : '#5f7263';
    const label = (r.n === 11 ? '∞' : r.n) + ' · ' + r.info.name;
    drawText(label.slice(0, 22), 10, y, col, 1);
    drawText(done ? 'LIVED' : current ? 'NOW' : '—', 132, y, col, 1);
  });
  const cur = rows[Math.min(ch, 11) - 1];
  if (cur && ch <= 11) {
    const t = wrapText(cur.info.teaser, 36).slice(0, 2);
    t.forEach((l, i) => drawText(l, 80 - textW(l, 1) / 2, 121 + i * 7, '#9fc79f', 1));
  }
  drawText(TEXT.screens.bBack, 126, 8, '#9fc79f', 1);
}

function chaptersUpdate() { if (Input.bHit || Input.aHit) mode = 'title'; }

/* ============================== RENDER: OVERWORLD ============================== */
function drawSprite(img, x, y, flip, w, h) { // w/h: draw into this game-space size (hi-res maps into their 16x16)
  if (flip) { ctx.save(); ctx.translate(x + (w || img.width), y); ctx.scale(-1, 1); if (w) ctx.drawImage(img, 0, 0, w, h); else ctx.drawImage(img, 0, 0); ctx.restore(); }
  else if (w) ctx.drawImage(img, x, y, w, h);
  else ctx.drawImage(img, x, y);
}
function charSprite(e, set) {
  const frames = e.dir === 'down' ? set.down : e.dir === 'up' ? set.up : set.side;
  // two-frame walk cycle while moving; Alvin (e.wag) also wags slowly at rest
  const anim = e.moving || e.wag;
  const rate = set === ALVIN_SET ? (e.moving ? 9 : 3) : (e.moving ? 7 : 3); // Alvin trots
  let img = anim ? frames[Math.floor(perfNow * rate) % frames.length] : frames[0];
  // idle blink: standing still, front- or side-facing, the eyes close for a
  // beat every few seconds — each character on their own phase (blinkOff)
  if (!e.moving && !e.wag) {
    const blinkImg = e.dir === 'down' ? set.blinkDown : (e.dir === 'left' || e.dir === 'right') ? set.blinkSide : null;
    if (blinkImg && (perfNow + (e.blinkOff || 0)) % 3.7 < 0.13) img = blinkImg;
  }
  // talking: while this character's dialogue line is still typing out, the
  // mouth opens and closes — the open-mouth frame swaps in on a ~7 Hz beat
  if (e.talk && !e.moving) {
    const talkImg = e.dir === 'down' ? set.talkDown : (e.dir === 'left' || e.dir === 'right') ? set.talkSide : null;
    if (talkImg && Math.floor(perfNow * 7) % 2 === 0) img = talkImg;
  }
  // Alvin sits when Frank has been standing still a while and he has
  // settled nearby — a dog waiting on his person
  if (e.sit && !e.moving && set.sitDown) {
    img = e.dir === 'down' ? set.sitDown : e.dir === 'up' ? set.sitUp : set.sitSide;
  }
  // a soft ground shadow under every character, the same grounding the
  // banner folk and the trial cast already get (translucent, so it reads
  // as shade on path and garden tiles too, not just grass)
  const shx = Math.round(e.px - camX), shy = Math.round(e.py - camY);
  ctx.fillStyle = 'rgba(20,26,20,0.25)';
  if ((set.w || 16) > 16) { ctx.fillRect(shx - 1, shy + 13, 18, 2); ctx.fillRect(shx, shy + 15, 16, 1); }
  else { ctx.fillRect(shx + 2, shy + 13, 12, 2); ctx.fillRect(shx + 3, shy + 15, 10, 1); }
  // overhaul sets (set.w/set.h) are taller than a tile: the figure draws
  // upward from the tile's bottom edge, feet planted where they always
  // were; legacy sets still draw as 32x32 art in a 16x16 of game space
  const dw = set.w || 16, dh = set.h || 16;
  drawSprite(img, shx + Math.round((16 - dw) / 2), shy + 16 - dh, e.dir === 'left', dw, dh);
}
function renderOverworld() {
  if (area === 'barnOut') return renderBerry();
  if (area !== 'yard') return renderArea();
  camX = Math.round(Math.max(0, Math.min(AW * TILE - VW, player.px + 8 - VW / 2)));
  camY = Math.round(Math.max(0, Math.min(AH * TILE - VH, player.py + 8 - VH / 2)));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
  for (let ty = y0; ty <= y0 + 9; ty++) for (let tx = x0; tx <= x0 + 10; tx++) {
    if (tx < 0 || ty < 0 || tx >= AW || ty >= AH) continue;
    const ch = mapChar(tx, ty), sx = tx * TILE - camX, sy = ty * TILE - camY;
    // the ground is still (Nov 27, 2026): the old two-frame tuft/flower
    // sway made the whole yard shimmer — Daniel's verdict was 'too much'
    const winter = seasonOf(G.save.day).idx === 3;
    let base = TILES.grass; // plain grass tiles get a hashed variety so the lawn isn't flat
    if (ch === 'g') { const h = (tx * 31 + ty * 17) % 9; base = h === 0 ? TILES.tuft : h === 4 ? TILES.grass3 : h === 6 ? TILES.grass4 : h === 7 ? TILES.grass2 : TILES.grass; }
    if (winter && SNOW_TILES.grass) base = SNOW_TILES[base === TILES.tuft ? 'tuft' : base === TILES.tuftB ? 'tuftB' : base === TILES.grass3 ? 'grass3' : base === TILES.grass4 ? 'grass4' : base === TILES.grass2 ? 'grass2' : 'grass'] || base;
    ctx.drawImage(base, sx, sy);
    let t = TILES[TILEMAP[ch]];
    if (ch === 'o') t = TILES.flower;
    if (winter && SNOW_TILES[TILEMAP[ch]]) t = SNOW_TILES[TILEMAP[ch]];
    if (t && TILEMAP[ch] !== 'grass') ctx.drawImage(t, sx, sy);
    if (ch === 'T') {
      ctx.fillStyle = 'rgba(30,60,25,0.30)'; // the canopy's soft ground shadow
      ctx.beginPath(); ctx.ellipse(sx + 10, sy + 14, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(winter && SNOW_TREE ? SNOW_TREE : TREE, sx - 16, sy - 40);
      // now and then a leaf lets go and spirals down the canopy
      const lt = (perfNow * 0.22 + tx * 0.37 + ty * 0.11) % 1;
      if (lt < 0.7) {
        const lx = Math.round(sx + 8 + Math.sin(lt * 9 + tx) * 9), ly = Math.round(sy - 22 + lt * 34);
        ctx.fillStyle = lt < 0.35 ? '#54c95e' : '#7ed957';
        ctx.fillRect(lx, ly, 2, 1); ctx.fillRect(lx, ly + 1, 1, 1);
      }
    }
    if (ch === 'c') { // chimney smoke: three puffs rising, growing, drifting off
      for (let i = 0; i < 3; i++) {
        const ph = (perfNow * 0.45 + i / 3) % 1;
        const px = Math.round(sx + 8 + Math.sin(ph * 5 + i * 2) * 1.5 + ph * 3);
        const py = Math.round(sy - 2 - ph * 15);
        const sz = 2 + Math.floor(ph * 3);
        ctx.fillStyle = ph < 0.5 ? '#e8edf2' : '#c9ced4';
        ctx.fillRect(px, py, sz, sz);
      }
    }
    if (ch === 'b') { // birdbath: a sparkle, then a ripple, then still water
      const ph = (Math.floor(perfNow * 2) + tx * 3 + ty) % 3;
      if (ph === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 7, sy + 3, 1, 3); ctx.fillRect(sx + 6, sy + 4, 3, 1);
      } else if (ph === 1) {
        ctx.fillStyle = '#a8dcff';
        ctx.fillRect(sx + 5, sy + 5, 6, 1); ctx.fillRect(sx + 6, sy + 4, 4, 1);
      }
    }
  }
  // Frank's garden journal, lying open on the porch boards by the door —
  // small and flat, tucked to the side of the walkway, pencil beside it
  {
    const jx = 11 * TILE - camX + 1, jy = 4 * TILE - camY + 9;
    ctx.fillStyle = '#96682f'; ctx.fillRect(jx, jy + 4, 10, 2); // porch-board shadow under the book
    ctx.fillStyle = '#8a2f2a'; ctx.fillRect(jx, jy, 9, 5); // red-cloth cover
    ctx.fillStyle = '#f8f0d8'; ctx.fillRect(jx + 1, jy + 1, 7, 3); // the open pages
    ctx.fillStyle = '#8a919c'; ctx.fillRect(jx + 2, jy + 2, 5, 1); // a line of his handwriting
    ctx.fillStyle = '#ffd94a'; ctx.fillRect(jx + 10, jy + 3, 3, 1); ctx.fillRect(jx + 13, jy + 3, 1, 1); // the pencil
  }
  // weeds: a decor layer over the grass, under everything that walks
  for (const w of (G.save.weeds || [])) {
    if ((w.area || 'yard') !== 'yard') continue;
    const sx = w.x * TILE - camX, sy = w.y * TILE - camY;
    if (sx < -16 || sy < -16 || sx > VW || sy > VH) continue;
    ctx.drawImage(w.deep ? WEED_DEEP : WEED_TUFT, sx, sy);
  }
  // a pulled weed arcs up and away, gone in half a second
  tosses = tosses.filter(t => perfNow - t.t0 < 0.45);
  for (const t of tosses) {
    const k = (perfNow - t.t0) / 0.45;
    const sx = t.x * TILE - camX + Math.round(k * 9), sy = t.y * TILE - camY - Math.round(Math.sin(k * Math.PI) * 9);
    if (sx < -16 || sy < -16 || sx > VW || sy > VH) continue;
    ctx.drawImage(t.deep ? WEED_DEEP : WEED_TUFT, sx, sy);
  }
  // the bench throws a soft shadow onto the grass below it
  ctx.fillStyle = SHADOW; ctx.fillRect(9 * TILE - camX, 11 * TILE - camY, 6 * TILE, 2);
  // pots on the bench (only plants that still live there)
  sixPlants().forEach(p => {
    if (p.location !== 'BENCH') return;
    const i = p.slot, sx = (9 + i) * TILE - camX, sy = 10 * TILE - camY;
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(sx + 3, sy + 9, 10, 2); // the pot's shadow on the bench slats
    ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], sx, sy - 2);
    if (p.husk) { ctx.fillStyle = '#5a5148'; ctx.fillRect(sx + 4, sy + 2, 8, 3); }
    if (p.dirt) { // good dirt reads as a dark, rich cap of soil in the pot
      ctx.fillStyle = '#3d2412'; ctx.fillRect(sx + 4, sy + 7, 8, 2);
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx + 5, sy + 7, 2, 1); ctx.fillRect(sx + 9, sy + 8, 2, 1);
    }
    if (p.watered) { // a fat droplet, still beaded on the soil, with a glint
      const bob = Math.floor(perfNow * 2) % 2;
      ctx.fillStyle = '#3b6fe0';
      ctx.fillRect(sx + 12, sy - 5 + bob, 2, 3); ctx.fillRect(sx + 13, sy - 7 + bob, 1, 2);
      ctx.fillStyle = '#a8dcff'; ctx.fillRect(sx + 12, sy - 4 + bob, 1, 1);
    }
  });

  // winter: the bench wears a cold frame (Daniel, Nov 26, 2026 — the
  // tender pots sat out in the snow as if it were summer). The six
  // stay on the bench, as the story has them until spring, but
  // visibly sheltered: a glass lean-to over them, snow on its roof.
  if (seasonOf(G.save.day).idx === 3 && sixPlants().some(p => p.location === 'BENCH' && !p.memorial)) {
    const fx = 9 * TILE - camX, fy = 10 * TILE - camY, fw = 6 * TILE;
    ctx.fillStyle = '#5e4c36';
    ctx.fillRect(fx + 1, fy - 7, 3, 19); ctx.fillRect(fx + fw - 4, fy - 7, 3, 19); // posts
    ctx.fillRect(fx, fy - 8, fw, 3); // top rail
    ctx.fillStyle = 'rgba(207,228,247,0.25)';
    ctx.fillRect(fx + 2, fy - 5, fw - 4, 16); // the pane, over the pots
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(fx, fy - 10, fw, 2); // snow on the roof
    ctx.fillRect(fx + 8, fy - 11, 18, 1); ctx.fillRect(fx + fw - 30, fy - 11, 20, 1);
  }

  // entities sorted by y — each stands on a soft contact shadow
  const contactShadow = (px, py) => {
    ctx.fillStyle = SHADOW;
    ctx.fillRect(Math.round(px - camX) + 5, Math.round(py - camY) + 13, 10, 2);
    ctx.fillRect(Math.round(px - camX) + 4, Math.round(py - camY) + 14, 12, 1);
  };
  // dialogue: whoever is speaking gets the talking mouth while their line types
  const spk = (mode === 'dialogue' && dlg) ? dlg.lines[dlg.idx] : null;
  const spkName = spk && dlg.chars < spk.text.length ? spk.name : null;
  player.talk = spkName === 'FRANK';
  const ents = [];
  ents.push({ y: constance.py, draw: () => { contactShadow(constance.tx * TILE, constance.ty * TILE); charSprite({ px: constance.tx * TILE, py: constance.ty * TILE, dir: constance.dir, moving: false, blinkOff: 1.9, talk: spkName === 'CONSTANCE' }, CONSTANCE_SET); } });
  if (G.save.deerPresent && !G.save.deerBeaten) ents.push({ y: DEER_POS.y * TILE, draw: () => { contactShadow(DEER_POS.x * TILE, DEER_POS.y * TILE); const bob = Math.floor(perfNow * 1.5) % 2; ctx.drawImage(DEER_SMALL, DEER_POS.x * TILE - camX, DEER_POS.y * TILE - camY + bob, 16, 16); } });
  ents.push({ y: alvin.py, draw: () => { contactShadow(alvin.px, alvin.py); charSprite(alvin, ALVIN_SET); } });
  ents.push({ y: player.py, draw: () => { contactShadow(player.px, player.py); charSprite(player, FRANK_SET); } });
  for (const n of npcList) ents.push({ y: n.ty * TILE, draw: () => { contactShadow(n.tx * TILE, n.ty * TILE); drawNPCFigure(n, n.tx * TILE - camX, n.ty * TILE - camY, spkName === n.name); } });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  // two butterflies wander the flower beds (pure ambience), each with the
  // little shadow that gives its flutter height
  for (const bf of [
    { cx: 7.5, cy: 13.5, s1: 0.33, s2: 0.47, ph: 0, A: BUTTERFLY_A, B: BUTTERFLY_B },
    { cx: 17.5, cy: 12.0, s1: 0.27, s2: 0.39, ph: 2.4, A: BUTTERFLY2_A, B: BUTTERFLY2_B },
  ]) {
    const bx = Math.round((bf.cx + Math.sin(perfNow * bf.s1 + bf.ph) * 3.2) * TILE - camX);
    const by = Math.round((bf.cy + Math.cos(perfNow * bf.s2 + bf.ph) * 1.4) * TILE - camY - 8 + Math.sin(perfNow * 2.2 + bf.ph) * 2);
    if (bx > -10 && by > -10 && bx < VW && by < VH) {
      ctx.fillStyle = '#4cab36'; ctx.fillRect(bx + 1, by + 12, 5, 1);
      ctx.drawImage(Math.floor(perfNow * 6 + bf.ph) % 2 ? bf.A : bf.B, bx, by);
    }
  }
  // HUD (no persistent objective banner: it overlapped the bench/pots at the
  // bottom of the frame. The objective lives in the pause menu, and the
  // tutorial steps are taught through dialogue.)
  ctx.fillStyle = 'rgba(20,26,20,0.8)'; ctx.fillRect(2, 2, 34, 9);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(2, 10, 34, 1); // gold trim, matching the panels
  drawText(F(TEXT.hud.dayDay, { day: G.save.day }), 4, 4, '#ffffff', 1);
  // compost floaters from pulled weeds: rise, hold, fade inside a second
  floaters = floaters.filter(f => perfNow - f.t0 < 1.1);
  for (const f of floaters) {
    const age = perfNow - f.t0;
    ctx.globalAlpha = age < 0.7 ? 1 : Math.max(0, 1 - (age - 0.7) / 0.4);
    drawText(f.text, f.x - camX - textW(f.text, 1) / 2, f.y - camY - Math.round(age * 9), '#ffffff', 1);
    ctx.globalAlpha = 1;
  }
}

/* ============================== RENDER: TRIAL ============================== */
function drawPatch(cx, cy, w) {
  ctx.fillStyle = '#3f9433';
  ctx.fillRect(cx - w / 2 + 4, cy, w - 8, 5); ctx.fillRect(cx - w / 2, cy + 2, w, 5); ctx.fillRect(cx - w / 2 + 6, cy + 6, w - 12, 3);
  ctx.fillStyle = '#58b93e'; ctx.fillRect(cx - w / 2 + 8, cy + 2, w - 16, 2);
}
function drawBar(x, y, w, frac, col) {
  ctx.fillStyle = '#20242a'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, Math.round(w * frac)), 3);
}
function renderTrial() {
  const t = trial;
  ctx.fillStyle = '#7ec8f7'; ctx.fillRect(0, 0, VW, 62);
  ctx.fillStyle = '#a8dcff'; ctx.fillRect(0, 56, VW, 6);
  ctx.fillStyle = '#58b93e'; ctx.fillRect(0, 62, VW, 82);
  // soft two-tone patches so the ground reads as turf, not a flat fill
  ctx.fillStyle = '#54b04a';
  for (const [px, py, pw] of [[8, 70, 26], [58, 88, 34], [118, 68, 30], [30, 96, 22], [96, 94, 26], [140, 86, 18]]) {
    ctx.fillRect(px, py, pw, 4); ctx.fillRect(px + 3, py - 2, pw - 6, 2); ctx.fillRect(px + 3, py + 4, pw - 6, 2);
  }
  ctx.fillStyle = '#4cab36'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 37) % 160, 66 + (i * 23) % 34, 2, 2);
  // clouds and a low hill line on the horizon
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(14, 8, 20, 4); ctx.fillRect(18, 5, 11, 3); ctx.fillRect(120, 14, 16, 3); ctx.fillRect(123, 11, 9, 3);
  ctx.fillStyle = '#dfe9f5'; ctx.fillRect(14, 12, 20, 1); ctx.fillRect(120, 17, 16, 1);
  ctx.fillStyle = '#8fd07a';
  ctx.fillRect(0, 50, 66, 12); ctx.fillRect(8, 46, 50, 4); ctx.fillRect(18, 42, 30, 4);
  ctx.fillRect(102, 52, 58, 10); ctx.fillRect(110, 48, 42, 4); ctx.fillRect(120, 44, 24, 4);
  drawPatch(118, 52, 64);
  // ground shadows: under the deer, and under Alvin in front of the bench
  ctx.fillStyle = '#357a2a';
  ctx.fillRect(100, 55, 46, 3); ctx.fillRect(104, 54, 38, 1);
  ctx.fillRect(26, 97, 44, 3); ctx.fillRect(30, 96, 36, 1);
  // the deer idles with a slow bob, ear twitching between two frames;
  // once its Pressure runs low the white tail stays flagged (alarmed)
  const dbob = Math.floor(perfNow * 1.5) % 2;
  // a fresh hit from Alvin makes the foe flinch for a beat
  const flinch = (t.phase === 'wait' && t.timer < 0.25 && (t.anim === 'lunge' || t.anim === 'bark')) ? (Math.floor(perfNow * 20) % 2 ? 1 : -1) : 0;
  if (t.foe === 'FROST') { // a low bank of glittering cold, breathing frost
    const pu = Math.sin(perfNow * 1.3) * 2;
    ctx.fillStyle = '#dceefb'; ctx.fillRect(92 + flinch, 26 + pu, 52, 22); ctx.fillRect(100 + flinch, 18 + pu, 36, 10);
    ctx.fillStyle = '#bcd9f2'; ctx.fillRect(98 + flinch, 34 + pu, 40, 4); ctx.fillRect(106 + flinch, 22 + pu, 20, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(104 + flinch, 28 + pu, 4, 2); ctx.fillRect(124 + flinch, 38 + pu, 3, 2); ctx.fillRect(134 + flinch, 24 + pu, 2, 2);
    ctx.fillStyle = '#9fc6ea'; ctx.fillRect(92 + flinch, 45 + pu, 52, 3); // the bank's shaded base
    ctx.fillStyle = '#9fc6ea'; for (let i = 0; i < 5; i++) ctx.fillRect(96 + ((i * 13 + Math.floor(perfNow * 9)) % 46) + flinch, 44 + pu + (i % 3), 2, 2);
  } else if (t.foe === 'WEEDS') { // a mat of roots and ambition
    ctx.fillStyle = '#3f7a2e'; ctx.fillRect(90 + flinch, 34, 56, 14);
    ctx.fillStyle = '#2f5a24'; ctx.fillRect(90 + flinch, 44, 56, 4); // the root mat in shade
    for (let i = 0; i < 7; i++) { const wx = 94 + i * 8 + flinch, wh = 10 + (i * 7) % 12; ctx.fillStyle = i % 2 ? '#4cab36' : '#67c24e'; ctx.fillRect(wx, 34 - wh + (i % 2) * 2, 3, wh); }
    ctx.fillStyle = '#6a4a26'; ctx.fillRect(96 + flinch, 44, 44, 2); ctx.fillRect(104 + flinch, 47, 30, 1);
  } else if (t.foe === 'BARBER') { // never quite seen: a neat shadow, and shears
    const sh = Math.floor(perfNow * 0.8) % 3;
    ctx.fillStyle = '#20242a'; ctx.fillRect(108 + flinch + sh, 22, 18, 24); ctx.fillRect(112 + flinch + sh, 14, 10, 9);
    ctx.fillStyle = '#c9ced4'; ctx.fillRect(126 + flinch + sh, 26, 8, 2); ctx.fillRect(126 + flinch + sh, 31, 8, 2);
    ctx.fillStyle = '#20242a'; ctx.fillRect(124 + flinch + sh, 27, 3, 4);
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(125 + flinch + sh, 23, 1, 22); // a rim of light on the shadow's edge
  } else {
    const deerImg = (t.pressure <= 10 || dbob) ? DEER_BIG2 : DEER_BIG;
    ctx.drawImage(deerImg, 86 + flinch, 5 + dbob, 64, 48);
  }
  // what Alvin defends: the garden bench with all six pots, as scenery —
  // the yard's picket fence peeks over the bench, and the bench casts a shadow
  ctx.fillStyle = '#f4f4f0';
  for (let x = 0; x < 94; x += 8) { ctx.fillRect(x, 88, 3, 5); }
  ctx.fillRect(0, 91, 94, 1);
  ctx.fillStyle = SHADOW; ctx.fillRect(0, 106, 52, 3);
  for (let i = 0; i < 3; i++) ctx.drawImage(TILES.bench, 2 + i * 16, 92);
  trialPlantsList().slice(0, 6).forEach((p, i) => ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], 4 + i * 10, 84, 10, 10));
  // Alvin, the only actor on this side — he hops forward on LUNGE, pops up on BARK
  let ax = 20, ay = 56;
  if (t.anim && t.phase === 'wait') {
    const s = Math.sin(Math.min(1, t.timer / 0.45) * Math.PI);
    if (t.anim === 'lunge') ax += Math.round(5 * s);
    else if (t.anim === 'bark') ay -= Math.round(3 * s);
  }
  const alvinImg = (t.phase === 'wait' && t.anim === 'bark') ? ALVIN_BIG_BARK
    : (t.phase === 'wait' && t.anim === 'lunge') ? ALVIN_BIG_LUNGE : ALVIN_BIG;
  ctx.drawImage(alvinImg, ax, ay, 56, 40);
  if (t.anim === 'lunge' && t.phase === 'wait' && t.timer < 0.3) { // dust kicked up at his hind paws
    ctx.fillStyle = '#c9b18a';
    ctx.fillRect(ax + 1, ay + 37, 2, 1); ctx.fillRect(ax + 5, ay + 35, 1, 1); ctx.fillRect(ax - 1, ay + 34, 1, 1);
  }
  if (alvinImg === ALVIN_BIG_BARK) { // two bark arcs off his muzzle, toward the deer
    ctx.fillStyle = '#20242a';
    ctx.fillRect(ax + 56, ay + 4, 2, 1); ctx.fillRect(ax + 57, ay + 6, 2, 1); ctx.fillRect(ax + 56, ay + 8, 2, 1);
    ctx.fillRect(ax + 60, ay + 2, 2, 1); ctx.fillRect(ax + 62, ay + 6, 2, 1); ctx.fillRect(ax + 60, ay + 9, 2, 1);
  }
  // status boxes: DEER pressure above, ALVIN's HP below — one box per side
  ctx.fillStyle = '#20242a'; ctx.fillRect(3, 5, 76, 25); ctx.fillStyle = '#f8f8f8'; ctx.fillRect(5, 7, 72, 21);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(5, 27, 72, 1); // gold trim, as on the panels
  drawText(t.foe, 8, 9, '#20242a', 1);
  drawText(TEXT.trials.pressure, 8, 17, '#5a6270', 1);
  drawBar(8, 23, 62, t.pressure / t.maxPressure, t.pressure > t.maxPressure / 3 ? '#37b24d' : '#e0483e');
  ctx.fillStyle = '#20242a'; ctx.fillRect(81, 66, 76, 27); ctx.fillStyle = '#f8f8f8'; ctx.fillRect(83, 68, 72, 23);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(83, 90, 72, 1);
  drawText('ALVIN', 86, 70, '#20242a', 1);
  drawText('HP', 86, 79, '#5a6270', 1);
  drawBar(94, 80, 38, t.vigor / t.maxVigor, t.vigor > 8 ? '#37b24d' : '#e0483e');
  drawText(t.vigor + '/' + t.maxVigor, 134, 79, '#20242a', 1);
  if (t.shield) drawText('GUARD', 130, 70, '#3b6fe0', 1);
  if (t.armor) drawText(TEXT.trials.dugIn, 126, 88, '#8a5a2e', 1);
  // text box / menus
  drawBox(102, 40);
  if (t.phase === 'menu' || t.phase === 'moves') {
    const lines = wrapText((t.phase === 'menu' ? TEXT.trials.whatWillAlvinDo : TEXT.trials.chooseAMove), 20);
    lines.slice(0, 3).forEach((l, i) => drawText(l, 7, 108 + i * 8, '#20242a', 1));
    const items = (t.phase === 'menu' ? TEXT.trials.defend : MOVES);
    items.forEach((m, i) => {
      const x = 96 + (i % 2) * 32, y = 110 + Math.floor(i / 2) * 12;
      if (i === (t.sel || 0)) drawText('▶', x - 6, y, '#b03030', 1);
      drawText(m, x, y, '#20242a', 1);
    });
  } else if (t.phase === 'plants' || t.phase === 'bag') {
    if (t.phase === 'plants') {
      drawText(TEXT.trials.theGardenAlvinGuards, 7, 107, '#20242a', 1);
      trialPlantsList().forEach((q, i) => {
        const x = 7 + (i % 2) * 78, y = 117 + Math.floor(i / 2) * 8;
        drawText((q.name || '').slice(0, 9) + ' ' + STAGE_NAMES[q.stage], x, y, '#20242a', 1);
      });
      drawText(TEXT.trials.aBBack, 10, 133, '#5a6270', 1);
    } else {
      drawText('BAG:', 7, 108, '#20242a', 1);
      if ((t.sel || 0) === 0) drawText('▶', 7, 118, '#b03030', 1);
      drawText(F(TEXT.trials.compostTeaTea10, { tea: G.save.tea }), 13, 118, '#20242a', 1);
      drawText(TEXT.screens.bBack, 13, 128, '#5a6270', 1);
    }
  } else {
    wrapText(t.msg, 36).slice(0, 4).forEach((l, i) => drawText(l, 8, 107 + i * 8, '#20242a', 1));
  }
}

/* ============================== CARD / DEX / MENU ============================== */
function cardUpdate() {
  if (Input.aHit || Input.bHit) { mode = 'overworld'; chapterCardDone(cardChapter); } // KEEP TENDING
}
function chapterCardDone(n) { if (n === 1) ch2Opening(); if (n === 2) ch3Opening(); if (n === 3) ch4Opening(); if (n === 4) ch5Opening(); if (n === 5) ch6Opening(); if (n === 6) ch7Opening(); if (n === 7) ch8Opening(); if (n === 8) ch9Opening(); if (n === 9) ch10Opening(); if (n === 10) ltOpening(); }
function renderCard() {
  ctx.fillStyle = '#1d3a26'; ctx.fillRect(0, 0, VW, VH);
  drawSceneBanner(2, true);
  drawText(TEXT.cards.chapterComplete, 80 - textW(TEXT.cards.chapterComplete, 1) / 2, 70, '#cfe8cf', 1);
  ctx.fillStyle = '#ffd94a'; // two little stars, twinkling in turn
  if (Math.floor(perfNow * 2) % 2 === 0) { ctx.fillRect(24, 71, 1, 3); ctx.fillRect(23, 72, 3, 1); }
  else { ctx.fillRect(133, 71, 1, 3); ctx.fillRect(132, 72, 3, 1); }
  const info = CHAPTER_INFO[cardChapter] || CHAPTER_INFO[1];
  drawText(info.name, 80 - textW(info.name, 2) / 2, 78, TEXT.screens.ffd94a, 2);
  const teaser = wrapText(info.teaser, 34);
  teaser.forEach((l, i) => drawText(l, 80 - textW(l, 1) / 2, 94 + i * 7, '#ffffff', 1));
  if (cardChapter === 1) {
    // the roll call: the six, named, cycling two at a time so it never crowds
    const names = sixPlants().map(p => p.name);
    const pair = Math.floor(perfNow / 2.5) % 3;
    const roll = names[pair * 2] + ' · ' + names[pair * 2 + 1];
    const pre = TEXT.cards.theSix;
    const rx = 80 - (textW(pre, 1) + textW(roll, 1)) / 2;
    drawText(pre, rx, 110, '#cfe8cf', 1);
    drawText(roll, rx + textW(pre, 1), 110, TEXT.screens.ffd94a, 1);
  } else {
    const liv = livingPlants().length, mem = G.save.plants.length - liv;
    const line = F(TEXT.cards.theRegisterLivLiving, { liv: liv, v: (mem ? F(TEXT.cards.memRemembered, { mem: mem }) : "") });
    drawText(line, 80 - textW(line, 1) / 2, 110, '#cfe8cf', 1);
  }
  const l = TEXT.cards.keepTendingA;
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(Math.round(80 - textW(l, 1) / 2 - 4), 118, textW(l, 1) + 8, 9);
  drawText(l, 80 - textW(l, 1) / 2, 120, '#20242a', 1);
  // no book links on the card — Daniel's ruling: links live on the title
  // menu only, so the card is text + KEEP TENDING and nothing else
}

const MENU_ITEMS = ['RESUME', 'CONTROLS', 'SAVE & QUIT'];
function menuUpdate() {
  if (Input.bHit || Input.startHit) { mode = 'overworld'; return; }
  if (menuNavHit('up')) menuSel = (menuSel + MENU_ITEMS.length - 1) % MENU_ITEMS.length;
  if (menuNavHit('down')) menuSel = (menuSel + 1) % MENU_ITEMS.length;
  if (Input.aHit) {
    if (menuSel === 0) mode = 'overworld';
    else if (menuSel === 1) openControls('menu');
    else { // SAVE & QUIT: write the save out, then back to the title screen
      saveGame();
      titleSel = 0; titleConfirm = false;
      mode = 'title';
    }
  }
}
function renderMenu() {
  renderOverworld();
  ctx.fillStyle = 'rgba(10,16,10,0.55)'; ctx.fillRect(0, 0, VW, VH);
  drawPanel(24, 18, 112, 108);
  // display-only info: day, objective, Berrydex summary, tea
  drawText(F(TEXT.hud.dayDay, { day: G.save.day }), 32, 26, '#20242a', 1);
  wrapText(objective(), 24).slice(0, 3).forEach((l, i) => drawText(l, 32, 36 + i * 7, '#5a6270', 1));
  const seen = G.save.dex.blueberry;
  wrapText(F(TEXT.screens.berrydexV, { v: (seen.length ? seen.join(" · ") : TEXT.screens.nothingSeenYet) }), 24).slice(0, 2).forEach((l, i) => drawText(l, 32, 57 + i * 7, '#5a6270', 1));
  drawText(F(TEXT.screens.teaTeaCompostCompost, { tea: G.save.tea, compost: G.save.compost }), 32, 71, '#5a6270', 1);
  drawText(F(TEXT.screens.goodDirtGooddirt, { goodDirt: G.save.goodDirt }), 32, 78, '#5a6270', 1);
  MENU_ITEMS.forEach((l, i) => {
    const y = 86 + i * 12;
    if (i === menuSel) drawText('▶', 32, y, '#b03030', 1);
    drawText(l, 40, y, '#20242a', 1);
  });
}

/* ============================== CONTROLS SCREEN ============================== */
let controlsFrom = 'title', controlsSel = 0; // row 0: stick setting, row 1: music, row 2: back
const PAD_MODES = ['AUTO', 'ALWAYS', 'OFF'];
function openControls(from) { controlsFrom = from; controlsSel = 0; mode = 'controls'; }
function cycleStick(d) {
  const cur = PAD_MODES.indexOf(settings.stick.toUpperCase());
  settings.stick = PAD_MODES[(cur + d + PAD_MODES.length) % PAD_MODES.length].toLowerCase();
  saveSettings(); applyStickPref();
}
function cycleMusic() { settings.music = !settings.music; saveSettings(); }
function controlsUpdate() {
  if (Input.bHit) { mode = controlsFrom; return; }
  if (controlsFrom === 'menu' && Input.startHit) { mode = 'menu'; return; }
  if (menuNavHit('up')) controlsSel = (controlsSel + 2) % 3;
  if (menuNavHit('down')) controlsSel = (controlsSel + 1) % 3;
  if (controlsSel === 0) {
    if (menuNavHit('left')) cycleStick(-1);
    if (menuNavHit('right')) cycleStick(1);
    if (Input.aHit) cycleStick(1);
  } else if (controlsSel === 1) {
    if (menuNavHit('left') || menuNavHit('right') || Input.aHit) cycleMusic();
  } else if (Input.aHit) mode = controlsFrom;
}
function renderControls() {
  ctx.fillStyle = '#1d3a26'; ctx.fillRect(0, 0, VW, VH);
  drawPanel(4, 4, 152, 136);
  // the cast presents the controls, each standing on a soft ground shade
  // in the panel's own paper tones (as on the register card)
  ctx.fillStyle = '#c9ced4'; ctx.fillRect(12, 25, 12, 1); ctx.fillRect(136, 25, 12, 1);
  ctx.fillStyle = '#dfe9f5'; ctx.fillRect(13, 26, 10, 1); ctx.fillRect(137, 26, 10, 1);
  ctx.drawImage(FRANK_DOWN, 10, 2, 16, 24); ctx.drawImage(ALVIN_DOWN, 132, 8, 20, 18);
  drawText(TEXT.controls.controls, 80 - textW(TEXT.controls.controls, 2) / 2, 10, '#20242a', 2);
  const head = (t, y) => drawText(t, 12, y, '#2e8b3a', 1);
  const row = (t, y) => drawText(t, 12, y, '#20242a', 1);
  head(TEXT.controls.keyboard, 28);
  row(TEXT.controls.arrowsOrWasdMove, 37);
  row(TEXT.controls.zOrEnterA, 45);
  row(TEXT.controls.pMenu, 53);
  head(TEXT.controls.gamepad, 65);
  row(TEXT.controls.stickOrDPad, 74);
  row(TEXT.controls.aOkBBack, 82);
  head('TOUCH', 94);
  row(TEXT.controls.stickMoveOnScreen, 103);
  ctx.fillStyle = '#c9ced4'; ctx.fillRect(12, 108, 136, 1);
  if (controlsSel === 0) drawText('▶', 12, 114, '#b03030', 1);
  drawText(F(TEXT.controls.showStickTouppercaseval, { toUpperCaseVal: settings.stick.toUpperCase() }), 20, 114, '#20242a', 1);
  if (controlsSel === 1) drawText('▶', 12, 122, '#b03030', 1);
  drawText(F(TEXT.controls.musicV, { v: (settings.music ? "ON" : "OFF") }), 20, 122, '#20242a', 1);
  if (controlsSel === 2) drawText('▶', 12, 130, '#b03030', 1);
  drawText('BACK', 20, 130, '#20242a', 1);
}
/* ============================== PLANT REGISTER ============================== */
/* Frank's garden journal lives on the porch. It is a JOURNAL, not storage:
   every plant is an individual who lives on the bench, and the register
   simply remembers their lives — the Berrydex, kept by hand. Progress is
   the stages witnessed across the six lives (G.save.dex). */
let regView = 'list', regSel = 0, regCardSel = 0;
let regLoc = 'BENCH', regPage = 0, regPlant = -1; // regPlant: index into G.save.plants for the open card
/* THE BERRYDEX (Nov 27, 2026): a reference shelf in the back of the
   register — real blueberry varieties, their marks, the four kinds,
   and a year of care. All of its writing lives in TEXT.berrydex.
   Nothing points here: no prompt, no quest, no HUD. It is reached
   only from the register's own index, by a reader who goes looking. */
let dexView = 'menu', dexSel = 0, dexPage = 0, dexScroll = 0, dexVar = 0, dexTextKind = 'about';
const DEX_PER_PAGE = 6, DEX_TEXT_LINES = 10;
const REG_LOCS = ['FAVORITES', 'BENCH', 'WINDOW', 'FRIDGE', 'GREENHOUSE', 'NURSERY', 'OFFICE', 'ROW1', 'ROW2', 'ROW3', 'ROW4', 'ROW5', 'ROW6', 'ROW7', 'ROW8', 'ROW9', 'ROW10', 'ROW11', 'ROW12', 'GARDEN', 'MEMORIAL'];
const LOC_PRETTY = TEXT.register.locPretty;
function locPretty(loc) { return (LOC_PRETTY[loc] || (loc.startsWith('ROW') ? F(TEXT.misc.fieldReplaceval, { replaceVal: loc.replace("ROW", "ROW ") }) : loc)); }
function regLocPlants(loc) {
  if (loc === 'FAVORITES') return favPlants();
  if (loc.startsWith('AZ:')) return G.save.plants.filter(p => p.name.startsWith(loc.slice(3))); // the index of THE NAMED (spec A4) — every plant in the book is a named one
  if (loc === 'MEMORIAL') return G.save.plants.filter(p => p.memorial);
  if (loc === 'NURSERY') return G.save.plants.filter(p => p.location === 'GREENHOUSE' && !p.memorial && !p.gone);
  if (loc.startsWith('ROW')) { const r = parseInt(loc.slice(3), 10); return G.save.plants.filter(p => p.row === r && !p.memorial && !p.gone); }
  return G.save.plants.filter(p => p.location === loc && !p.memorial);
}
function regLocationsPresent() {
  return REG_LOCS.filter(l => regLocPlants(l).length > 0 || (l === 'MEMORIAL' && G.save.plants.some(p => p.memorial)));
}
function regInspectMark(p) {
  if (G.save.world.ch === 7 && p && !p.memorial && !p.history.includes(TEXT.plants.firstFall)) { p.history.push(TEXT.plants.firstFall); saveGame(); }
}
function openRegister() {
  regView = 'list'; regSel = 0; regPage = 0;
  const six = sixPlants().find(p => !p.memorial);
  regLoc = six ? (six.row != null ? 'ROW' + six.row : six.location) : 'BENCH';
  if (!regLocPlants(regLoc).length) { const ls = regLocationsPresent(); if (ls.length) regLoc = ls[0]; }
  mode = 'register';
}
function renamePlantObj(p) {
  let v = null;
  try { v = window.prompt(TEXT.register.aNameForThis, p.name); } catch (e) {}
  if (v == null) return; // blank/cancel keeps the name Frank gave
  v = String(v).trim().toUpperCase().replace(/[^A-Z0-9 .,'&!?-]/g, '').slice(0, 14).trim();
  if (v) { p.name = v; saveGame(); toast(F(TEXT.toasts.renamedV, { v: v })); }
}
/* Decision 11-A (Nov 27, 2026): succession, register-driven. The one
   Favorite's memorial page offers the replant — one nursery stock, her
   own place, her name with the next ordinal — and the successor is the
   new single Favorite. The offer stands even when it cannot be taken;
   the register explains, in its own idiom, why not. */
const ORDINALS = ['SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH'];
function successorName(name) {
  const m = /^(.*) THE ([A-Z]+)$/.exec(name || '');
  if (m) {
    const i = ORDINALS.indexOf(m[2]);
    if (i >= 0 && i < ORDINALS.length - 1) return m[1] + ' THE ' + ORDINALS[i + 1];
    if (i === ORDINALS.length - 1) return m[1] + ' THE ' + (ORDINALS.length + 2) + 'TH';
  }
  return (name || 'PLANT') + ' THE SECOND';
}
function regCardOptions(p) {
  const opts = [];
  if (p && p.memorial && isFav(p) && !p.succName) {
    const stock = (G.save.nursery && G.save.nursery.stock) || 0;
    const blocked = stock < 1 ? 'stock' : (G.save.plants.some(q => q !== p && q.fav && !q.memorial && !q.gone) ? 'cap' : null);
    opts.push({ kind: 'succ', label: F(TEXT.register.succPlant, { name: successorName(p.name) }), blocked });
  }
  opts.push({ kind: 'rename', label: 'RENAME' });
  opts.push({ kind: 'back', label: 'BACK' });
  return opts;
}
function plantSuccessor(p) {
  const s = G.save;
  if (!p || !p.memorial || !isFav(p) || p.succName) return;
  if (!s.nursery || s.nursery.stock < 1) { toast(TEXT.register.succNoStock); return; }
  if (s.plants.some(q => q !== p && q.fav && !q.memorial && !q.gone)) { toast(TEXT.register.succCircleFull); return; }
  s.nursery.stock--;
  const name = successorName(p.name);
  const home = p.home || { location: (p.location && p.location !== 'MEMORIAL') ? p.location : 'BENCH', row: p.row, slot: p.slot };
  if (home.location === 'BENCH' && home.slot == null) {
    const used = new Set(s.plants.filter(q => !q.memorial && !q.gone && q.location === 'BENCH').map(q => q.slot));
    home.slot = 0; while (used.has(home.slot)) home.slot++;
  }
  const stage = Math.min(3, Math.max(2, s.nursery.stage || 2));
  const np = freshPlant(name, {
    variety: p.variety, stage, location: home.location, row: home.row, slot: home.slot,
    sownDay: s.day, sproutedDay: stage >= 2 ? s.day : null, seedlingDay: stage >= 3 ? s.day : null,
    plantedDay: s.day, fav: true, ofLine: p.ofLine || p.name,
    gardenState: home.location === 'GARDEN' ? 'NEW' : null,
    history: [F(TEXT.register.succBornLine, { name: p.name })],
  });
  s.plants.push(np);
  p.succName = name; p.succDay = s.day;
  p.history.push(F(TEXT.register.succLine, { name, day: s.day }));
  // the husk is laid to rest in the register; the place is hers now
  if (p.husk) { p.husk = false; p.location = 'MEMORIAL'; p.row = null; p.slot = null; }
  saveGame();
  toast(F(TEXT.register.succPlanted, { name }));
}
function dexMenuEntries() {
  const B = TEXT.berrydex;
  return [
    { kind: 'list', label: F(B.menuVarieties, { n: B.varieties.length }) },
    { kind: 'text', text: 'about', label: B.menuAbout },
    { kind: 'text', text: 'primer', label: B.menuPrimer },
    { kind: 'text', text: 'care', label: B.menuCare },
    { kind: 'text', text: 'sources', label: B.menuSources },
  ];
}
function dexBgText(bg) { const B = TEXT.berrydex; return bg === 'YES' ? B.bgYes : bg === 'LISTED' ? B.bgListed : bg === 'GUIDE' ? B.bgGuide : B.bgNo; }
function dexZ6Text(z6) { const B = TEXT.berrydex; return z6 === 'YES' ? B.z6Yes : z6 === 'EDGE' ? B.z6Edge : B.z6No; }
function dexChips(v) {
  const B = TEXT.berrydex;
  return (v.bg === 'YES' ? B.chipBg : v.bg === 'NO' ? B.chipNone : B.chipBgQ) + ' ' + (v.z6 === 'YES' ? B.chipZ6 : v.z6 === 'NO' ? B.chipNone : B.chipZ6Q);
}
/* A variety's page: short fields ride on one line (label in green,
   fact in ink); long ones take a green heading and wrapped lines. */
function dexDetailLines(v) {
  const B = TEXT.berrydex, out = [];
  const field = (label, val) => {
    if ((label + ' ' + val).length <= 36) out.push({ k: 'kv', a: label, b: val });
    else { out.push({ k: 'h', t: label }); for (const l of wrapText(val, 32)) out.push({ k: 't', t: '  ' + l }); }
  };
  field(B.fType, v.type);
  if (v.aka) field(B.fAka, v.aka);
  field(B.fZones, v.zones);
  field(B.fChill, v.chill);
  field(B.fSize, v.size);
  field(B.fFruit, v.fruit);
  field(B.fSeason, v.season);
  field(B.fYield, v.yld);
  field(B.fPoll, v.poll);
  field(B.fNotes, v.notes);
  field(B.fBluegrass, dexBgText(v.bg));
  field(B.fZone6a, dexZ6Text(v.z6));
  return out;
}
/* The shelf's prose pages — about, the four kinds, a year of care,
   the sources — as wrapped lines with green headings. */
function dexTextLines(kind) {
  const B = TEXT.berrydex, out = [];
  const para = t => { for (const l of wrapText(t, 35)) out.push({ k: 't', t: l }); out.push({ k: 't', t: '' }); };
  const head = t => { for (const l of wrapText(t, 35)) out.push({ k: 'h', t: l }); };
  if (kind === 'about') B.about.forEach(para);
  else if (kind === 'primer') for (const k of B.primer) { head(k.h); for (const l of wrapText(k.t, 33)) out.push({ k: 't', t: '  ' + l }); out.push({ k: 't', t: '' }); }
  else if (kind === 'care') {
    para(B.careIntro);
    for (const sec of B.care) {
      head(sec.h);
      for (const b of sec.lines) { const wl = wrapText(b, 32); wl.forEach((l, i) => out.push({ k: 't', t: (i === 0 ? '· ' : '  ') + l })); }
      out.push({ k: 't', t: '' });
    }
  }
  else B.sources.forEach(para);
  while (out.length && out[out.length - 1].t === '') out.pop();
  return out;
}
function dexTextTitle() {
  const B = TEXT.berrydex;
  return dexTextKind === 'about' ? B.menuAbout : dexTextKind === 'primer' ? B.menuPrimer : dexTextKind === 'care' ? B.menuCare : B.menuSources;
}
function dexUpdate() {
  const B = TEXT.berrydex;
  if (dexView === 'menu') {
    const es = dexMenuEntries();
    if (Input.bHit) { regView = 'index'; regSel = 0; return; }
    if (menuNavHit('up')) dexSel = (dexSel + es.length - 1) % es.length;
    if (menuNavHit('down')) dexSel = (dexSel + 1) % es.length;
    if (Input.aHit) {
      const e = es[dexSel];
      if (e.kind === 'list') { dexView = 'list'; dexSel = 0; dexPage = 0; }
      else { dexView = 'text'; dexTextKind = e.text; dexScroll = 0; }
    }
  } else if (dexView === 'list') {
    const n = B.varieties.length, pageCount = Math.ceil(n / DEX_PER_PAGE);
    if (Input.bHit) { dexView = 'menu'; dexSel = 0; return; }
    if (menuNavHit('up')) { if (dexSel > 0) dexSel--; else if (dexPage > 0) { dexPage--; dexSel = Math.min(DEX_PER_PAGE, n - dexPage * DEX_PER_PAGE) - 1; } }
    if (menuNavHit('down')) { const pageItems = Math.min(DEX_PER_PAGE, n - dexPage * DEX_PER_PAGE); if (dexSel < pageItems - 1) dexSel++; else if (dexPage < pageCount - 1) { dexPage++; dexSel = 0; } }
    if (menuNavHit('left')) { dexPage = (dexPage + pageCount - 1) % pageCount; dexSel = 0; }
    if (menuNavHit('right')) { dexPage = (dexPage + 1) % pageCount; dexSel = 0; }
    if (Input.aHit) { dexVar = dexPage * DEX_PER_PAGE + dexSel; dexView = 'detail'; dexScroll = 0; }
  } else { // detail | text — a page of lines, read at the reader's pace
    if (Input.bHit) { dexView = dexView === 'detail' ? 'list' : 'menu'; dexScroll = 0; return; }
    const lines = dexView === 'detail' ? dexDetailLines(B.varieties[dexVar]) : dexTextLines(dexTextKind);
    const maxScroll = Math.max(0, lines.length - DEX_TEXT_LINES);
    if (menuNavHit('up')) dexScroll = Math.max(0, dexScroll - 1);
    if (menuNavHit('down')) dexScroll = Math.min(maxScroll, dexScroll + 1);
    if (menuNavHit('left')) dexScroll = Math.max(0, dexScroll - DEX_TEXT_LINES);
    if (menuNavHit('right')) dexScroll = Math.min(maxScroll, dexScroll + DEX_TEXT_LINES);
  }
}
function renderDex() {
  const B = TEXT.berrydex;
  if (dexView === 'menu') {
    drawText(B.title, 80 - textW(B.title, 2) / 2, 10, '#20242a', 2);
    drawText(B.subTitle, 80 - textW(B.subTitle, 1) / 2, 24, '#2e8b3a', 1);
    dexMenuEntries().forEach((e, i) => {
      const y = 38 + i * 11;
      if (i === dexSel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, y - 3, 142, 11); drawText('▶', 11, y, '#b03030', 1); }
      drawText(e.label.slice(0, 34), 20, y, '#20242a', 1);
    });
    drawText(TEXT.screens.bBack, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  } else if (dexView === 'list') {
    const vars = B.varieties, pageCount = Math.ceil(vars.length / DEX_PER_PAGE);
    drawText(B.title, 80 - textW(B.title, 2) / 2, 10, '#20242a', 2);
    const cur = vars[dexPage * DEX_PER_PAGE + dexSel];
    if (cur) drawText(cur.group, 12, 23, '#2e8b3a', 1);
    if (pageCount > 1) { const pg = F(B.pageOf, { p: dexPage + 1, n: pageCount }); drawText(pg, 148 - textW(pg, 1), 23, '#5a6270', 1); }
    vars.slice(dexPage * DEX_PER_PAGE, dexPage * DEX_PER_PAGE + DEX_PER_PAGE).forEach((v, i) => {
      const y = 38 + i * 14;
      if (i === dexSel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, y - 3, 142, 12); drawText('▶', 11, y, '#b03030', 1); }
      ctx.fillStyle = '#dfe9f5'; ctx.fillRect(12, y + 9, 136, 1);
      ctx.fillStyle = '#3b4a8c'; ctx.fillRect(21, y - 1, 7, 7);
      ctx.fillStyle = '#7d94d8'; ctx.fillRect(22, y, 2, 2);
      drawText(v.name.slice(0, 16), 36, y, '#20242a', 1);
      const chips = dexChips(v);
      drawText(chips, 148 - textW(chips, 1), y, '#5a6270', 1);
    });
    drawText(B.hintList, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  } else {
    const isDetail = dexView === 'detail';
    const title = isDetail ? B.varieties[dexVar].name : dexTextTitle();
    drawText(title, 80 - textW(title, 2) / 2, 10, '#20242a', 2);
    const lines = isDetail ? dexDetailLines(B.varieties[dexVar]) : dexTextLines(dexTextKind);
    lines.slice(dexScroll, dexScroll + DEX_TEXT_LINES).forEach((L, i) => {
      const y = 32 + i * 9;
      if (L.k === 'kv') { drawText(L.a, 14, y, '#2e8b3a', 1); drawText(L.b, 14 + textW(L.a, 1) + 4, y, '#20242a', 1); }
      else if (L.k === 'h') drawText(L.t, 14, y, '#2e8b3a', 1);
      else drawText(L.t, 14, y, '#20242a', 1);
    });
    if (dexScroll > 0) drawText('↑', 148, 32, '#5a6270', 1);
    if (dexScroll + DEX_TEXT_LINES < lines.length) drawText('▼', 148, 32 + (DEX_TEXT_LINES - 1) * 9, '#5a6270', 1);
    drawText(TEXT.screens.bBack, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  }
}
function registerUpdate() {
  const locs = regLocationsPresent();
  if (regView === 'list') {
    const plants = regLocPlants(regLoc);
    const pageCount = Math.max(1, Math.ceil(plants.length / 6));
    if (Input.bHit) { mode = 'overworld'; return; }
    if (regSel < 0) { // the location header is selected
      if (menuNavHit('left') || menuNavHit('right')) {
        const d = menuNavHit('left') ? -1 : 1;
        let i = locs.indexOf(regLoc); i = (i + d + locs.length) % locs.length;
        regLoc = locs[i]; regPage = 0;
      }
      if (menuNavHit('down')) regSel = plants.length ? 0 : -1;
      if (Input.aHit) { regView = 'index'; regSel = 0; }
      return;
    }
    if (menuNavHit('up')) { regSel--; if (regSel < 0) regSel = -1; }
    if (menuNavHit('down')) { const pageItems = plants.slice(regPage * 6, regPage * 6 + 6).length; if (regSel < pageItems - 1) regSel++; else if (regPage < pageCount - 1) { regPage++; regSel = 0; } }
    if (menuNavHit('left')) { regPage = (regPage + pageCount - 1) % pageCount; regSel = 0; }
    if (menuNavHit('right')) { regPage = (regPage + 1) % pageCount; regSel = 0; }
    if (Input.aHit && plants.length) {
      regPlant = G.save.plants.indexOf(plants[regPage * 6 + regSel]);
      regView = 'card'; regCardSel = 0; regInspectMark(G.save.plants[regPlant]);
    }
  } else if (regView === 'index') {
    const entries = regIndexEntries();
    if (Input.bHit) { regView = 'list'; regSel = -1; return; }
    if (menuNavHit('up')) regSel = (regSel + entries.length - 1) % entries.length;
    if (menuNavHit('down')) regSel = (regSel + 1) % entries.length;
    if (Input.aHit) {
      const e = entries[regSel];
      if (e.kind === 'loc') { regLoc = e.loc; regPage = 0; regSel = -1; regView = 'list'; }
      else if (e.kind === 'az') { regView = 'az'; regSel = 0; }
      else if (e.kind === 'back') { regView = 'back'; regSel = 0; }
      else if (e.kind === 'dex') { regView = 'dex'; dexView = 'menu'; dexSel = 0; dexScroll = 0; }
      else if (e.kind === 'page') { regView = 'page'; regPage = e.page; regSel = 0; }
    }
  } else if (regView === 'az') {
    if (Input.bHit) { regView = 'index'; regSel = 0; return; }
    if (menuNavHit('left')) regSel = (regSel + 25) % 26;
    if (menuNavHit('right')) regSel = (regSel + 1) % 26;
    if (menuNavHit('up')) regSel = (regSel + 20) % 26;
    if (menuNavHit('down')) regSel = (regSel + 6) % 26;
    if (Input.aHit) {
      const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[regSel];
      const found = G.save.plants.filter(p => p.name.startsWith(letter));
      if (found.length) { regLoc = 'AZ:' + letter; regPage = 0; regSel = -1; regView = 'list'; }
    }
  } else if (regView === 'back') {
    if (Input.bHit) { regView = 'index'; regSel = 0; return; }
    const mems = G.save.plants.filter(p => p.memorial);
    if (menuNavHit('up')) regSel = (regSel + Math.max(1, mems.length) - 1) % Math.max(1, mems.length);
    if (menuNavHit('down')) regSel = (regSel + 1) % Math.max(1, mems.length);
    if (Input.aHit && mems.length) { regPlant = G.save.plants.indexOf(mems[regSel]); regView = 'card'; regCardSel = 0; }
  } else if (regView === 'page') {
    if (regPage === 'ROWS') {
      const planted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(rn => rowHasBushes(rn) || G.save.cropRows[rn - 1].plantedDay != null);
      if (Input.bHit) { regView = 'index'; regSel = 0; return; }
      if (menuNavHit('up')) regSel = (regSel + Math.max(1, planted.length) - 1) % Math.max(1, planted.length);
      if (menuNavHit('down')) regSel = (regSel + 1) % Math.max(1, planted.length);
      if (Input.aHit && planted.length) { regPage = 'ROWDET:' + planted[regSel]; }
      return;
    }
    if (typeof regPage === 'string' && regPage.startsWith('ROWDET:')) {
      if (Input.bHit || Input.aHit) { regPage = 'ROWS'; regSel = 0; }
      return;
    }
    if (Input.bHit || Input.aHit) { regView = 'index'; regSel = 0; return; }
  } else if (regView === 'dex') {
    dexUpdate();
  } else { // card
    if (Input.bHit) { regView = regLoc === 'MEMORIAL' || (G.save.plants[regPlant] && G.save.plants[regPlant].memorial) ? 'back' : 'list'; if (regView === 'list') regSel = 0; return; }
    const p = G.save.plants[regPlant];
    const opts = regCardOptions(p);
    if (regCardSel >= opts.length) regCardSel = 0;
    if (menuNavHit('down')) regCardSel = (regCardSel + 1) % opts.length;
    if (menuNavHit('up')) regCardSel = (regCardSel + opts.length - 1) % opts.length;
    if (Input.aHit) {
      const o = opts[regCardSel];
      if (!o) return;
      if (o.kind === 'succ') plantSuccessor(p);
      else if (o.kind === 'rename') renamePlantObj(p);
      else { regView = 'list'; regSel = 0; }
    }
  }
}
function regIndexEntries() {
  const es = regLocationsPresent().map(l => ({ kind: 'loc', loc: l, label: (l === 'FAVORITES' ? TEXT.register.favorites : locPretty(l)) + ' (' + regLocPlants(l).length + ')' }));
  if (G.save.cropRows.some(r => (r.bushCount || 0) > 0 || r.plantedDay != null)) es.push({ kind: 'page', page: 'ROWS', label: TEXT.register.theRows });
  if ((G.save.company && !G.save.company.gone) || (G.save.company && G.save.company.plantedOut) || (G.save.nursery && (G.save.nursery.stock > 0 || G.save.nursery.history.length))) es.push({ kind: 'page', page: 'COMPANY', label: TEXT.register.theCompanyNursery });
  es.push({ kind: 'az', label: TEXT.register.aZNameIndex });
  es.push({ kind: 'back', label: TEXT.register.theBackPagesIn });
  es.push({ kind: 'dex', label: TEXT.berrydex.indexLabel }); // the reference shelf, behind the written pages
  if (G.save.germ) es.push({ kind: 'page', page: 'GERMINATION', label: TEXT.register.germinationRecord });
  if (G.save.promise) es.push({ kind: 'page', page: 'PROMISE', label: TEXT.register.omaSPromise });
  if (G.save.wine.batches.length || G.save.wine.jar) es.push({ kind: 'page', page: 'CELLAR', label: TEXT.register.theCellar });
  if (G.save.world.flags.barberKnown) es.push({ kind: 'page', page: 'BARBER', label: TEXT.trials.theBarber });
  if (G.save.world.ch >= 11) es.push({ kind: 'page', page: 'TENDING', label: TEXT.cards.theLongTending });
  if (G.save.world.flags.goats) es.push({ kind: 'page', page: 'GOATS', label: TEXT.register.theGoats });
  return es;
}
function dayOr(day, none) { return (day != null ? F(TEXT.hud.dayDay, { day: day }) : none); }
function drawPaw(x, y, col) { // Alvin has signed the journal, in his own way
  ctx.fillStyle = col;
  ctx.fillRect(x + 2, y + 4, 5, 3); ctx.fillRect(x + 3, y + 7, 3, 1);
  ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 3, y, 2, 2); ctx.fillRect(x + 6, y + 1, 2, 2);
}
const HEALTH_COL = ['#2e8b3a', '#b07f2a', '#d2691e', '#e0483e', '#5a5148'];
function healthGlyph(p) { return p.memorial ? '' : ['', '!', '!!', '!!!', ''][p.health] || ''; }
function plantStageLabel(p) {
  if (p.location === 'GARDEN' && p.gardenState) return p.gardenState;
  return STAGE_NAMES[p.stage];
}
function renderRegister() {
  ctx.fillStyle = '#1d3a26'; ctx.fillRect(0, 0, VW, VH);
  drawPanel(4, 4, 152, 136);
  const s = G.save;
  if (regView === 'list') {
    const az = regLoc.startsWith('AZ:');
    const plants = regLocPlants(regLoc);
    drawText(TEXT.register.plantRegister, 80 - textW(TEXT.register.plantRegister, 2) / 2, 10, '#20242a', 2);
    const head = (az ? F(TEXT.register.namesSliceval, { sliceVal: regLoc.slice(3) }) : F(TEXT.register.locprettyval, { locPrettyVal: locPretty(regLoc) }));
    if (regSel < 0) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, 21, 142, 10); drawText('▶', 11, 23, '#b03030', 1); }
    drawText(head, 80 - textW(head, 1) / 2, 23, '#20242a', 1);
    const pageCount = Math.max(1, Math.ceil(plants.length / 6));
    if (pageCount > 1) drawText(F(TEXT.register.pageRegpage1Pagecount, { regPage: regPage, pageCount: pageCount }), 128, 23, '#5a6270', 1);
    plants.slice(regPage * 6, regPage * 6 + 6).forEach((p, i) => {
      const y = 38 + i * 14;
      if (i === regSel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, y - 3, 142, 12); drawText('▶', 11, y, '#b03030', 1); }
      ctx.fillStyle = '#dfe9f5'; ctx.fillRect(12, y + 9, 136, 1);
      ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], 20, y - 4, 12, 12);
      drawText(p.name.slice(0, 14), 36, y, '#20242a', 1);
      drawText(plantStageLabel(p).slice(0, 9), 92, y, '#5a6270', 1);
      const hg = healthGlyph(p);
      if (p.memorial) drawText('RESTS', 128, y, '#5a6270', 1);
      else if (p.gone) drawText('GONE', 128, y, '#5a6270', 1);
      else if (hg) drawText(hg, 128, y, HEALTH_COL[p.health], 1);
      else drawText(p.watered ? 'WET' : '', 128, y, '#3b6fe0', 1);
    });
    if (!plants.length) drawText(TEXT.register.nothingHereYet, 14, 44, '#5a6270', 1);
    drawText(TEXT.register.aCardPageB, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  } else if (regView === 'index') {
    drawText(TEXT.register.theRegister, 80 - textW(TEXT.register.theRegister, 2) / 2, 10, '#20242a', 2);
    drawText(TEXT.register.everyPlantByName, 80 - textW(TEXT.register.everyPlantByName, 1) / 2, 24, '#2e8b3a', 1);
    const idxEntries = regIndexEntries();
    const idxStart = Math.max(0, Math.min(regSel - 8, idxEntries.length - 9)); // the window follows the reader past nine entries
    idxEntries.slice(idxStart, idxStart + 9).forEach((e, i) => {
      const y = 38 + i * 11;
      if (idxStart + i === regSel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, y - 3, 142, 11); drawText('▶', 11, y, '#b03030', 1); }
      drawText(e.label.slice(0, 34), 20, y, '#20242a', 1);
    });
    drawText(TEXT.screens.bBack, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  } else if (regView === 'az') {
    drawText(TEXT.register.nameIndex, 80 - textW(TEXT.register.nameIndex, 2) / 2, 10, '#20242a', 2);
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((L, i) => {
      const x = 16 + (i % 6) * 22, y = 34 + Math.floor(i / 6) * 16;
      const has = s.plants.some(p => p.name.startsWith(L));
      if (i === regSel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x - 3, y - 3, 12, 12); }
      drawText(L, x, y, has ? '#20242a' : '#b9c0c9', 1);
    });
    drawText(TEXT.register.aNamesUnderThe, 12, 129, '#5a6270', 1);
  } else if (regView === 'back') {
    drawText(TEXT.register.theBackPages, 80 - textW(TEXT.register.theBackPages, 2) / 2, 10, '#20242a', 2);
    drawText(TEXT.register.inMemory, 80 - textW(TEXT.register.inMemory, 1) / 2, 24, '#5a6270', 1);
    const mems = s.plants.filter(p => p.memorial);
    mems.slice(0, 5).forEach((p, i) => {
      const y = 38 + i * 11;
      if (i === regSel) { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(9, y - 3, 142, 11); drawText('▶', 11, y, '#b03030', 1); }
      drawText(p.name.slice(0, 16), 20, y, '#20242a', 1);
      drawText(F(TEXT.register.dayV, { v: (p.diedDay || "?") }), 108, y, '#5a6270', 1);
    });
    if (!mems.length) drawText(TEXT.register.noOneRestsHere, 14, 40, '#5a6270', 1);
    const named = s.plants.length, living = livingPlants().length;
    drawText(F(TEXT.register.rollCallNamedNamed, { named: named, living: living, length: mems.length }), 12, 100, '#20242a', 1);
    drawText(F(TEXT.register.inTheGround, { n: fieldBushes() }), 12, 110, '#20242a', 1);
    drawText(F(TEXT.register.berrydexLength18Cells, { length: s.dex.cells.length }), 12, 118, '#20242a', 1);
    if (ltGoalsMet()) drawText(TEXT.register.wellTended, 80 - textW(TEXT.register.wellTended, 1) / 2, 128, '#2e8b3a', 1);
    drawText(TEXT.screens.bBack, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  } else if (regView === 'page') {
    const pg = regPageLines();
    drawText(pg.title, 80 - textW(pg.title, 2) / 2, 10, '#20242a', 2);
    if (regPage === 'ROWS') drawText('▶', 6, 32 + regSel * 9, '#b03030', 1);
    pg.lines.slice(0, 12).forEach((l, i) => drawText(l.slice(0, 36), 14, 32 + i * 9, '#20242a', 1));
    drawText(TEXT.screens.bBack, 12, 129, '#5a6270', 1);
    drawPaw(142, 124, '#b09a72');
  } else if (regView === 'dex') {
    renderDex();
  } else {
    const p = s.plants[regPlant];
    if (!p) { regView = 'list'; return; }
    drawText(p.name.slice(0, 12), 14, 11, '#20242a', 2);
    ctx.fillStyle = '#dfe9f5'; ctx.fillRect(14, 22, 100, 1);
    ctx.drawImage(POT_SPRITES[Math.min(p.stage, 3)], 122, 8, 30, 30);
    ctx.fillStyle = '#c9ced4'; ctx.fillRect(126, 38, 22, 1);
    ctx.fillStyle = '#dfe9f5'; ctx.fillRect(129, 39, 16, 1);
    if (p.dirt) {
      ctx.fillStyle = '#3d2412'; ctx.fillRect(133, 40, 8, 2); ctx.fillRect(135, 39, 4, 1);
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(136, 40, 2, 1);
      drawText(TEXT.register.goodDirt, 118, 44, '#5a3a1e', 1);
    }
    drawText(F(TEXT.register.vPlantstagelabelval, { v: (p.variety || TEXT.register.blueberry), plantStageLabelVal: plantStageLabel(p) }), 14, 25, '#2e8b3a', 1);
    drawText(F(TEXT.register.livesAtV, { v: (p.memorial ? TEXT.register.theBackPages : locPretty((p.row != null ? F(TEXT.register.rowRow, { row: p.row }) : p.location))) }), 14, 34, '#5a6270', 1);
    drawText(F(TEXT.register.healthV, { v: HEALTH_NAMES[p.health] }), 14, 43, HEALTH_COL[p.health], 1);
    const rows = [F(TEXT.register.sownDayorvalV, { dayOrVal: dayOr(p.sownDay, TEXT.register.notYet), v: (p.sproutedDay ? F(TEXT.register.sproutedDaySproutedday, { sproutedDay: p.sproutedDay }) : "") }), F(TEXT.register.seedlingDayorvalV, { dayOrVal: dayOr(p.seedlingDay, TEXT.register.notYet), v: (p.bushDay ? F(TEXT.register.bushDayBushday, { bushDay: p.bushDay }) : "") }), F(TEXT.register.daysTendedTendedToday, { tended: p.tended, v: (p.stage === 0 ? "-" : (p.watered ? TEXT.register.watered : TEXT.register.thirsty)) })];
    if (p.memorial) rows.push(F(TEXT.register.diedDayDiedday, { diedDay: p.diedDay }), F(TEXT.register.causeV, { v: (p.cause || "") }));
    if (p.memorial && p.succName) rows.push(F(TEXT.register.succLine, { name: p.succName, day: p.succDay }));
    if (p.gone) rows.push(F(p.location === 'GARDEN' ? TEXT.dawn.gardenGoneLine : TEXT.register.goneLine, { name: p.name }));
    const hy = Object.keys(p.harvestByYear || {});
    if (hy.length) rows.push(F(TEXT.register.harvestJoinval, { joinVal: hy.map(y => 'Y' + y + ' ' + p.harvestByYear[y] + 'LB').join(" · ") }));
    (p.history || []).slice(0, 2).forEach(h => rows.push(h));
    rows.slice(0, p.memorial ? 6 : 5).forEach((r, i) => drawText(r.slice(0, 36), 14, 54 + i * 9, '#20242a', 1));
    const cardOpts = regCardOptions(p);
    const menuY = cardOpts.length > 2 ? 106 : 114, menuStep = cardOpts.length > 2 ? 10 : 11;
    cardOpts.forEach((o, i) => {
      const y = menuY + i * menuStep;
      if (i === regCardSel) drawText('▶', 14, y, '#b03030', 1);
      drawText(o.label.slice(0, 30), 22, y, o.blocked ? '#8a8f98' : '#20242a', 1);
    });
    drawPaw(142, 124, '#b09a72');
  }
}
function regPageLines() {
  const s = G.save;
  if (regPage === TEXT.register.germination && s.germ) return { title: TEXT.register.germination, lines: [F(TEXT.register.sownSownSeedsLate, { sown: s.germ.sown }), F(TEXT.register.pottedUpPottedEvery, { potted: s.germ.potted }), F(TEXT.register.lostAlongTheWay, { lost: s.germ.lost }), TEXT.register.theTrayIsEmpty] };
  if (regPage === 'PROMISE') {
    // Decision 10: the filled-jar line is the LOVELY ending's, not any
    // verdict's — a lesser wine gets the soberer line
    const b = s.wine.batches[s.wine.batches.length - 1];
    const jarLine = (!b || !b.verdict) ? TEXT.register.theJarWaitsEmpty : (b.verdict === TEXT.wine.lovely ? TEXT.register.theJarIsFilled : TEXT.register.theJarIsFilledLesson);
    return { title: TEXT.register.omaSPromise, lines: [TEXT.register.shePromisedToStay, TEXT.register.untilSheTastesThe, TEXT.register.madeFromThisField, "", jarLine] };
  }
  if (regPage === 'ROWS') {
    const lines = [];
    for (let rn = 1; rn <= 12; rn++) {
      const row = s.cropRows[rn - 1];
      if (!rowHasBushes(rn) && row.plantedDay == null) continue;
      const total = (row.bushCount || 0) + s.plants.filter(p => !p.memorial && !p.gone && p.row === rn).length;
      lines.push(F(TEXT.register.rowSummaryLine, { rn: rn, variety: row.variety || 'CHANDLER', n: total }) + ((row.rowHealth || 0) > 0 ? ' ' + '!'.repeat(row.rowHealth) : ''));
    }
    return { title: TEXT.register.theRows, lines: (lines.length ? lines : [TEXT.register.nothingHereYet]) };
  }
  if (typeof regPage === 'string' && regPage.startsWith('ROWDET:')) {
    const rn = parseInt(regPage.slice(7), 10), row = s.cropRows[rn - 1];
    const favs = s.plants.filter(p => !p.memorial && !p.gone && p.row === rn);
    const lifetime = Math.round(Object.values(row.poundsByYear || {}).reduce((a, b) => a + b, 0) * 10) / 10;
    const lines = [
      F(TEXT.register.rowPlantedLine, { v: dayOr(row.plantedDay, TEXT.register.notYet) }),
      F(TEXT.register.rowDetailLine, { stage: STAGE_NAMES[row.stage || 0] || '', health: HEALTH_NAMES[row.rowHealth || 0], rating: row.yieldRating || 1 }),
      F(TEXT.register.rowPoundsLine, { lbs: lifetime, fs: row.fruitSet || 0 }),
    ];
    const favHere = favs.find(p => p.fav), namedHere = favs.filter(p => !p.fav);
    if (favHere) lines.push(F(TEXT.register.rowFavNote, { name: favHere.name }));
    if (namedHere.length === 1) lines.push(F(TEXT.register.rowNamedNote, { name: namedHere[0].name }));
    else if (namedHere.length > 1) lines.push(F(TEXT.register.rowNamedNoteMany, { n: namedHere.length }));
    for (const h of (row.history || []).slice(-6)) lines.push(h);
    return { title: F(TEXT.register.rowSummaryLine, { rn: rn, variety: row.variety || 'CHANDLER', n: (row.bushCount || 0) + favs.length }), lines };
  }
  if (regPage === 'COMPANY') {
    const lines = [], c = s.company, n = s.nursery;
    if (c && !c.gone && c.n > 0) {
      lines.push(F(TEXT.register.companyCardN, { n: c.n }));
      lines.push(F(TEXT.register.companyCardStage, { stage: STAGE_NAMES[c.stage] || '', health: HEALTH_NAMES[c.health] || '', loc: locPretty(c.loc) }));
      for (const h of (c.history || []).slice(-2)) lines.push(h);
      if (c.roll && c.roll.length) { lines.push(TEXT.register.companyRollLine, TEXT.register.companyRollLine2); lines.push(c.roll.slice(0, 8).join(", ") + (c.roll.length > 8 ? "…" : "")); }
    } else if (c && c.plantedOut) {
      lines.push(TEXT.register.companyArchived, TEXT.register.companyArchived2);
      lines.push(F(TEXT.register.companyPlantedOut, { v: c.plantedOut.map(x => 'ROW ' + x[0] + ' ×' + x[1]).join(", ") }));
      if (c.roll && c.roll.length) { lines.push(TEXT.register.companyRollLine, TEXT.register.companyRollLine2); lines.push(c.roll.slice(0, 8).join(", ") + (c.roll.length > 8 ? "…" : "")); }
    }
    if (n && (n.stock > 0 || n.history.length)) {
      lines.push(F(TEXT.register.nurseryCard, { n: n.stock }));
      lines.push(F(TEXT.register.nurseryCardStage, { stage: STAGE_NAMES[n.stage] || '', health: HEALTH_NAMES[n.health] || '' }));
      for (const h of (n.history || []).slice(-3)) lines.push(h);
    }
    return { title: TEXT.register.theCompanyNursery, lines: (lines.length ? lines : [TEXT.register.nothingHereYet]) };
  }
  if (regPage === 'TENDING') { const g = ltGoals(); const mark = b => b ? '* ' : '- '; return { title: TEXT.cards.theLongTending, lines: [F(TEXT.register.markvalBerrydexLength18, { markVal: mark(g.dex), length: G.save.dex.cells.length }), F(TEXT.register.markvalAll12Rows, { markVal: mark(g.rows) }), F(TEXT.register.markvalA900Lb, { markVal: mark(g.nineHundred) }), F(TEXT.register.markvalALovelyBatch, { markVal: mark(g.lovely) }), F(TEXT.register.markvalCellarStreak3, { markVal: mark(g.streak) }), F(TEXT.register.markvalEveryGardenEntry, { markVal: mark(g.garden) }), F(TEXT.register.markvalRow1Accounted, { markVal: mark(g.rowOne) }), F(TEXT.register.markvalRollCallLength, { markVal: mark(g.rollCall), length: fieldBushes() }), "", (ltGoalsMet() ? TEXT.register.wellTended : TEXT.register.theFieldIsYoung)] }; }
  if (regPage === 'GOATS') return { title: TEXT.register.theGoats, lines: TEXT.register.twoGoatsByAppeal };
  if (regPage === 'BARBER') return { title: TEXT.trials.theBarber, lines: TEXT.register.unknownSmallPrecise };
  if (regPage === 'CELLAR') {
    const lines = s.wine.batches.map(b => F(TEXT.register.batchNVerdictHoney, { n: b.n, verdict: b.verdict, toFixedVal: b.index.toFixed(2), care: b.care }));
    lines.push(F(TEXT.register.poundsSharedDownThe, { v: (s.wine.shared || 0) }));
    return { title: TEXT.register.theCellar, lines: (lines.length ? lines : TEXT.register.noBatchesYet) };
  }
  return { title: TEXT.register.theRegister, lines: [] };
}
function ltGoals() {
  const s = G.save;
  const years = [...new Set(s.wine.batches.filter(b => b.verdict === TEXT.wine.lovely).map(b => b.year))].sort((a, b) => a - b);
  let streak = false;
  for (const y of years) if (years.includes(y + 1) && years.includes(y + 2)) streak = true;
  const garden = s.plants.filter(p => p.location === 'GARDEN' && !p.memorial && !p.gone);
  return {
    dex: s.dex.cells.length >= 18,
    rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every(rn => rowHasBushes(rn)),
    nineHundred: Object.values(s.wine.poundsByYear).some(v => v >= 900),
    lovely: s.wine.batches.some(b => b.verdict === TEXT.wine.lovely),
    streak,
    garden: garden.length > 0 && garden.every(p => p.gardenState === 'FLOURISHING'),
    // Decision 5, as the circle-of-one ruling restates it: THE FAVORITE
    // ACCOUNTED FOR — she carries a first harvest, or a memorial page
    rowOne: (() => { const f = s.plants.find(p => p.fav); return !f || f.memorial || f.firstHarvestDay != null; })(),
    // Decision 5: THE FIELD AT FULL STRENGTH — 120 bushes in the ground
    rollCall: fieldBushes() >= 120,
  };
}
function ltGoalsMet() { const g = ltGoals(); return Object.values(g).every(Boolean); }

/* ============================== MAIN LOOP ============================== */
let perfNow = 0, lastT = 0;
const audibleBtn = document.getElementById('audibleBtn');
audibleBtn.href = AUDIBLE_URL;
const bookBtn = document.getElementById('bookBtn');
bookBtn.href = BOOK_URL;
function update(dt) {
  themeSync(); // the theme song lives on the title screen, and only there
  if (toastT > 0) toastT -= dt;
  if (fade > 0 && mode !== 'overworld') fade = Math.max(0, fade - dt * 2);
  switch (mode) {
    case 'title': titleUpdate(); break;
    case 'chapters': chaptersUpdate(); break;
    case 'travel': travelUpdate(dt); break;
    case 'travelgo': travelGoUpdate(dt); break;
    case 'overworld': overworldUpdate(dt); break;
    case 'dialogue': dlgUpdate(dt); break;
    case 'trial': trialUpdate(dt); break;
    case 'card': cardUpdate(); break;
    case 'menu': menuUpdate(); break;
    case 'register': registerUpdate(); break;
    case 'controls': controlsUpdate(); break;
  }
  // Daniel's ruling (updated Nov 26, 2026): the book links live on the
  // title menu AND the pause menu, as plaques beside the menu — the
  // chapter card and every other screen stay link-free.
  const linksShown = mode === 'title' || mode === 'menu';
  audibleBtn.hidden = !linksShown;
  bookBtn.hidden = !linksShown;
}
function render() {
  switch (mode) {
    case 'title': renderTitle(); break;
    case 'chapters': renderChapters(); break;
    case 'travel': renderTravel(); break;
    case 'travelgo': renderTravelGo(); break;
    case 'overworld': case 'dialogue': renderOverworld(); if (mode === 'dialogue' && dlg) drawDlg(); break;
    case 'trial': renderTrial(); break;
    case 'card': renderCard(); break;
    case 'menu': renderMenu(); break;
    case 'register': renderRegister(); break;
    case 'controls': renderControls(); break;
  }
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, VW, VH); }
  if (toastT > 0) {
    ctx.fillStyle = 'rgba(20,26,20,0.9)'; const w = textW(toastMsg, 1) + 10;
    ctx.fillRect(Math.round(80 - w / 2), 4, w, 11);
    drawText(toastMsg, 80 - textW(toastMsg, 1) / 2, 7, '#ffffff', 1);
  }
}
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, lastT ? (ts - lastT) / 1000 : 0.016); lastT = ts; perfNow = ts / 1000;
  Input.poll(); update(dt); render();
  navPrev = { x: Input.dir.x, y: Input.dir.y };
}
/* keep the saved player position fresh whenever we persist */
const _saveGame = saveGame;
saveGame = function () { if (G && G.save) { G.save.player = { x: player.tx, y: player.ty, dir: player.dir }; } _saveGame(); };

G = { save: newSave() };
buildSnow();
requestAnimationFrame(frame);

/* ============================== TIME TRAVEL ==============================
   Daniel (Nov 27, 2026): "Add a time travel slider that fast forwards
   the game with perfect progression to any point. It won't preserve
   user particulars." A TIME TRAVEL entry on the title menu opens a
   slider spanning the whole campaign; the landing is the canonical
   PERFECT run at that point — every earlier objective complete, every
   trial won, every named plant alive and thriving, HOPE the Favorite,
   the story's beats as written (the first wine still tart) — and it
   replaces the player's garden wholesale, as the confirm step warns.

   Mechanism: deterministic simulation through the game's own logic.
   The canonical run is played from a fresh start by scripted perfect
   decisions (tend everything daily, win every trial, take every
   objective the day it opens), one dawn at a time, and the save is
   snapshotted at every clean morning. A landing is therefore coherent
   by construction: it is a state the game itself produced, so the
   chapter it lands in can always be played out from it. The build
   runs chunked across frames behind the travel screen's montage, in a
   borrowed G.save; the player's real save is restored after every
   chunk, so backing out costs nothing — only the confirmed jump
   replaces their garden. The timeline is cached in memory only (a
   few hundred mornings is far too much for localStorage). */
let ttTimeline = null;   // [{day, ch, step, json}] — one per canonical morning
let ttBuild = null;      // {json, snaps, day, done, error, n} while building
let ttStash = null;      // the player's raw save string, held during a build
let ttSel = 0, ttConfirm = false, ttGo = null, ttDrag = false, ttHold = 0;
const TT_X0 = 14, TT_X1 = 146, TT_Y = 88;

function ttFlush() {
  // Resolve every transient state the way a perfect player would:
  // every conversation read to its end (choice A), every trial won,
  // every chapter card turned. Loops because each resolution can open
  // the next (a won trial speaks; a turned card opens a chapter).
  let g = 0;
  while (g++ < 800) {
    if (trial) { trial.result = 'win'; endTrial(); continue; }
    if (mode === 'card') { mode = 'overworld'; chapterCardDone(cardChapter); continue; }
    if (dlg) { endDlg(0); continue; }
    break;
  }
  if (mode === 'dialogue') mode = 'overworld';
}
function ttWater() { // __hss.waterEverything's tending, inlined for the sim
  const s = G.save;
  for (const p of s.plants) if (p.stage >= 1 && !p.memorial && !p.gone) waterPlant(p);
  for (const r of s.cropRows) r.watered = true;
  if (s.company && !s.company.gone && s.company.n > 0) s.company.watered = true;
  if (s.nursery && s.nursery.stock > 0) s.nursery.watered = true;
  if (s.tray.n > 0) s.tray.watered = true;
}
function ttTalk(id) {
  // Find an NPC wherever the game's own layout puts them today and
  // talk, the way walking up and pressing A would.
  const spots = { yard: [11, 6], house: [10, 11], barnOut: [13, 5], barnIn: [14, 6], oma: [10, 5], green: [6, 7] };
  for (const a of ['yard', 'house', 'barnOut', 'barnIn', 'oma', 'green']) {
    setArea(a, spots[a][0], spots[a][1]); ttFlush();
    const npc = npcList.find(n => n.id === id);
    if (npc) { npcTalk(npc); ttFlush(); return true; }
  }
  return false;
}
function ttStairs() { // ch.5: face the barn stairs and choose BUILD
  setArea('barnIn', 14, 6); player.dir = 'up'; syncPixels(player);
  interact(); ttFlush();
}
function ttShed() { // ch.4: face the good shed and read what is there
  setArea('barnOut', 22, 5); player.dir = 'up'; syncPixels(player);
  interact(); ttFlush();
}
function ttVentOpen() {
  // ch.6: the greenhouse stove dialogue — B is the vent. With the vent
  // open the crisis dawns cannot slip a plant (ch6Dawn returns per
  // plant) and mitigation is certain, so the perfect run opens it on
  // the first morning and never shuts it.
  const rows = AREAS.green.rows;
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    if (rows[y][x] === 'h') {
      setArea('green', x, y + 1); player.dir = 'up'; syncPixels(player);
      interact();
      if (dlg && dlg.choice) endDlg(1); // OPEN/CLOSE THE VENT
      ttFlush();
      return;
    }
  }
}
function ttPullWeeds() { // ch.8: spend the day's leftover projects on weeds
  const s = G.save, w = s.world;
  let g = 0;
  while (w.proj < 3 && g++ < 6) {
    const sec = s.field.weedLv.findIndex(v => v > 0);
    if (sec < 0) break;
    const before = w.proj, lv = s.field.weedLv[sec];
    pullWeeds(sec); ttFlush();
    if (w.proj === before && s.field.weedLv[sec] === lv) break; // refused; do not spin
  }
}
function ttFieldPrep() { // ch.6, step 5: the planting gate, one day at a time
  const s = G.save, w = s.world, f = w.flags;
  if (!f.pipeFound) { digPipe(); ttFlush(); }
  else if (!s.field.pipe) { turnValve(); ttFlush(); turnValve(); ttFlush(); }
  let g = 0;
  while (w.proj < 3 && g++ < 8) {
    const before = w.proj;
    if (s.field.tarp.some(t => t === 4)) patchTarp(s.field.tarp.indexOf(4));
    else if (s.field.tarp.some(t => t === 0)) layTarp(s.field.tarp.indexOf(0));
    else if (s.field.tarp.some(t => t === 2)) moveTarp(s.field.tarp.indexOf(2));
    else if (s.field.fenceSeg.some(x => !x)) buildFenceSeg(s.field.fenceSeg.findIndex(x => !x));
    else if (s.cropRows.slice(0, 7).some(r => !r.mulched) && s.field.mulch >= 3) mulchRow(s.cropRows.findIndex(r => !r.mulched) + 1);
    else break;
    ttFlush();
    if (w.proj === before) break;
  }
  if (s.cropRows.slice(0, 7).some(r => !r.mulched) && s.field.mulch < 3 && !f.mulchComing) { orderMulch(); ttFlush(); }
  if (plantingGate().length === 0) { doPlanting(); ttFlush(); }
}
function ttAct() {
  // One day of scripted perfect decisions for the chapter in progress.
  // Everything here is the game's own function, the call a player's
  // button press would reach; dawns and dialogues do the rest.
  const s = G.save, w = s.world, f = w.flags;
  switch (w.ch) {
    case 1: {
      for (const p of sixPlants()) if (p.stage === 0 && s.seedsLeft > 0) { potInteract(p); ttFlush(); }
      for (const p of sixPlants()) if (p.stage >= 1 && !p.watered) { potInteract(p); ttFlush(); }
      if (s.deerPresent && !s.deerBeaten && sixPlants().some(p => p.stage >= 2)) { startTrial(); ttFlush(); }
      break;
    }
    case 2: {
      if (w.step === 1) {
        if (!f.fridgeTray) { fridgeSeeds(); ttFlush(); }
        if (!f.carried) ttTalk('jeremiah');
      }
      else if (w.step === 5) { storageTrip(); ttFlush(); }
      else if (w.step === 7 && f.frostDone) { let g = 0; while (w.step === 7 && g++ < 45) { potUp(); ttFlush(); } }
      else if (w.step === 8) { signSale(); ttFlush(); }
      break;
    }
    case 3: {
      if (w.step === 1) { setArea('barnOut', 2, 1); ttFlush(); }
      else if (w.step === 4) { chooseLoadOrder('plants'); ttFlush(); }
      else if (w.step === 6 && (f.buildStep || 0) < 3) { buildGreenhouse(); ttFlush(); }
      else if (w.step === 7) { let g = 0; while (w.step === 7 && g++ < 12) { carryPlants(); ttFlush(); } }
      break;
    }
    case 4: {
      if (w.step === 0) { stakeField(); ttFlush(); }
      else if (w.step === 1) { irisInteract(); ttFlush(); }
      else if (w.step === 2 && f.scoutsDone) ttShed();
      else if (w.step === 3 && !f.fenceNotes) ttShed();
      break;
    }
    case 5: {
      if (w.step === 0 && f.stairsDay == null) ttStairs();
      else if (w.step === 1 || w.step === 2) { let g = 0; while (w.step < 3 && g++ < 14) { patchInteract(); ttFlush(); } }
      else if (w.step === 4 && !s.promise) ttTalk('oma');
      break;
    }
    case 6: {
      if (w.step <= 2 && !s.field.vent) ttVentOpen();
      else if (w.step === 4 && f.repotReady) { repot(); ttFlush(); }
      else if (w.step === 5) ttFieldPrep();
      break;
    }
    case 7: {
      if (w.step === 1) w.watchRow = 'NURSERY'; // the barn-door watch, set for the night
      break;
    }
    case 8: {
      if (w.step === 1 && f.momDay === s.day) { let g = 0; while (!f.momDone && g++ < 12) { if (!ttTalk('mom')) break; } }
      else if (w.step === 2) {
        proudWeedInteract(); ttFlush(); proudWeedInteract(); ttFlush(); proudWeedInteract(); ttFlush();
        if (f.proudChopped) { burnPileInteract(); ttFlush(); }
      }
      else if (w.step === 3) { let g = 0; while (w.step === 3 && g++ < 5) { strawberryInteract(); ttFlush(); } }
      else if (w.step === 4 && !f.butterflyPlanted) {
        if (!f.butterflyReady) ttTalk('oma');
        if (f.butterflyReady) { butterflyPlant(); ttFlush(); }
      }
      ttPullWeeds();
      break;
    }
    case 9: {
      if (w.step === 0) {
        if (!f.forsythiaReady) ttTalk('oma');
        if (f.forsythiaReady && !f.forsythiaPlanted) { forsythiaPlant(); ttFlush(); }
      }
      else if (w.step === 2) {
        // the campaign's own watch: rows 1 and 2 on the first two
        // nights, the third night left to providence (fruitSet 90/90/50)
        if ((f.frostNight || 0) === 0) f.watchTonight = 1;
        else if ((f.frostNight || 0) === 1) f.watchTonight = 2;
        else delete f.watchTonight;
        saveGame();
      }
      break;
    }
    case 10: {
      const j = s.wine.jar, yr = seasonOf(s.day).year;
      if (w.step === 0 && !j) { startBatchOne(); ttFlush(); }
      else if ((w.step === 1 || w.step === 4) && j) {
        if (j.phase === 'open') { swishJar(); ttFlush(); }
        else if (j.phase === 'sealed') { sealCheck(); ttFlush(); }
        else if (j.phase === 'done') { bottleJar(); ttFlush(); }
      }
      else if (w.step === 2) {
        for (let rn = 1; rn <= 7; rn++) {
          const row = s.cropRows[rn - 1];
          if (row.harvestedYear === yr || row.fruitFell === yr) continue;
          if (w.proj >= 3) break;
          harvestRow(rn); ttFlush();
        }
      }
      else if (w.step === 3 && !j) { startBatchTwo(0.65); ttFlush(); } // the lesson ratio: LOVELY, as written
      else if (w.step === 5) { tasting(); ttFlush(); }
      break;
    }
  }
}
function ttSimDay() {
  // One canonical day: snapshot the clean morning, act, tend, dawn.
  const s = G.save, w = s.world;
  ttFlush();
  if (dlg || trial || mode === 'card') throw new Error('the morning of day ' + s.day + ' would not come clean');
  ttBuild.snaps.push({ day: s.day, ch: w.ch, step: w.step || 0, json: JSON.stringify(s) });
  if (w.ch === 11) { ttBuild.done = true; return; } // the Long Tending's first morning is the journey's end
  if (++ttBuild.n > 1500) throw new Error('the years ran long at chapter ' + w.ch + ', step ' + w.step + ', day ' + s.day);
  const chBefore = w.ch;
  ttAct();
  // A chapter that ends inside its own day (the promise kept, the
  // tasting held) hands the rest of that day to the next chapter, as
  // it does for a player: ch.6 must get its first afternoon, or its
  // first crisis dawn falls before the vent was ever opened.
  if (w.ch !== chBefore) ttAct();
  ttWater();
  dawn();
  ttFlush();
  ttBuild.day = G.save.day;
}
function ttSimInit() {
  G.save = newSave();
  area = 'yard'; AW = AREAS.yard.w; AH = AREAS.yard.h; npcList = [];
  player.tx = 11; player.ty = 6; syncPixels(player);
  alvin.tx = 10; alvin.ty = 7; syncPixels(alvin);
  mode = 'overworld'; dlg = null; trial = null;
  startIntro();
  ttFlush();
}
function ttRestorePlayer() {
  // Hand the machine back exactly as the player left it: their save in
  // localStorage and in G.save, their Frank where they left him.
  try {
    if (ttStash) localStorage.setItem(SAVE_KEY, ttStash); else localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
  let raw = null;
  try { raw = ttStash ? JSON.parse(ttStash) : null; } catch (e) {}
  G.save = raw ? normalizeSave(raw) : newSave();
  area = AREAS[G.save.world.area] ? G.save.world.area : 'yard';
  AW = curArea().w; AH = curArea().h;
  player.tx = G.save.player.x; player.ty = G.save.player.y; player.dir = G.save.player.dir || 'down'; syncPixels(player);
  alvin.tx = G.save.player.x; alvin.ty = Math.min(AH - 1, G.save.player.y + 1); syncPixels(alvin);
  layoutNPCs();
  dlg = null; trial = null;
  toastT = 0; // a toast the sim raised (potting up, in its world) is not the player's to read
}
function ttBuildChunk(budgetMs) {
  const t0 = performance.now();
  if (ttBuild.json == null) ttSimInit();
  else {
    G.save = normalizeSave(JSON.parse(ttBuild.json));
    area = AREAS[G.save.world.area] ? G.save.world.area : 'yard';
    AW = curArea().w; AH = curArea().h;
    player.tx = G.save.player.x; player.ty = G.save.player.y; syncPixels(player);
    layoutNPCs();
  }
  mode = 'overworld'; dlg = null; trial = null;
  try {
    while (!ttBuild.done && performance.now() - t0 < budgetMs) ttSimDay();
  } catch (e) { ttBuild.error = String((e && (e.stack || e.message)) || e); ttBuild.done = true; }
  ttBuild.json = JSON.stringify(G.save);
  ttBuild.day = G.save.day;
  if (ttBuild.done && !ttBuild.error) {
    ttTimeline = ttBuild.snaps;
    // aim the slider at the player's own chapter (the stash is their save)
    let cur = 1;
    try { if (ttStash) cur = (JSON.parse(ttStash).world || {}).ch || 1; } catch (e) { /* keep 1 */ }
    const i = ttTimeline.findIndex(snp => snp.ch >= cur);
    ttSel = i >= 0 ? i : ttTimeline.length - 1;
  }
  ttRestorePlayer();
}
function ttInstall(idx) {
  const snap = ttTimeline && ttTimeline[idx];
  if (!snap) return false;
  const sv = normalizeSave(JSON.parse(snap.json));
  G.save = sv;
  area = AREAS[sv.world.area] ? sv.world.area : 'yard';
  AW = curArea().w; AH = curArea().h;
  player.tx = sv.player.x; player.ty = sv.player.y; player.dir = sv.player.dir || 'down'; syncPixels(player);
  alvin.tx = sv.player.x; alvin.ty = Math.min(AH - 1, sv.player.y + 1); syncPixels(alvin);
  layoutNPCs();
  dlg = null; trial = null;
  mode = 'overworld';
  saveGame();
  toast(TEXT.travel.arrived);
  return true;
}
function openTravel() {
  mode = 'travel'; ttConfirm = false;
  if (!ttTimeline && !ttBuild) {
    try { ttStash = localStorage.getItem(SAVE_KEY); } catch (e) { ttStash = null; }
    ttBuild = { json: null, snaps: [], day: 1, done: false, error: null, n: 0 };
  }
  if (ttTimeline) { // open the slider at the player's own chapter
    let cur = 1;
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) cur = (JSON.parse(raw).world || {}).ch || 1; } catch (e) {}
    const i = ttTimeline.findIndex(snp => snp.ch >= cur);
    ttSel = i >= 0 ? i : 0;
  }
}
function ttReadout(snp) {
  const so = seasonOf(snp.day);
  const first = ttTimeline.find(x => x.ch === snp.ch);
  const title = snp.ch === 11 ? TEXT.cards.theLongTending : 'CHAPTER ' + snp.ch + ' · ' + CHAPTER_INFO[snp.ch].name;
  const when = snp.ch === 11 ? TEXT.travel.firstMorning : F(TEXT.travel.dayOfChapter, { n: snp.day - first.day + 1 });
  return { title, line: SEASON_NAMES[so.idx] + ', YEAR ' + so.year + ' · ' + when };
}
function travelUpdate(dt) {
  if (ttBuild && !ttBuild.done) {
    ttBuildChunk(18);
    mode = 'travel'; // the chunk borrows the machine (the sim lives in overworld mode); hand it back
    return;
  }
  if (!ttTimeline) { if (Input.bHit) mode = 'title'; return; }
  if (ttConfirm) {
    if (Input.aHit) { ttGo = { idx: ttSel, t: 0 }; mode = 'travelgo'; }
    if (Input.bHit) ttConfirm = false;
    return;
  }
  if (Input.dir.x === 0) ttHold = 0;
  else {
    if (navPrev.x === 0) { ttSel += Input.dir.x; ttHold = 0; }
    else { ttHold += dt; while (ttHold >= 0.09) { ttSel += Input.dir.x; ttHold -= 0.09; } }
    ttSel = Math.max(0, Math.min(ttTimeline.length - 1, ttSel));
  }
  if (menuNavHit('down')) { // hop to the next chapter's first morning
    const i = ttTimeline.findIndex((snp, j) => j > ttSel && snp.ch !== ttTimeline[ttSel].ch);
    if (i >= 0) ttSel = i;
  }
  if (menuNavHit('up')) { // hop back a chapter
    let i = ttSel;
    const ch = ttTimeline[ttSel].ch;
    while (i > 0 && ttTimeline[i - 1].ch === ch) i--;
    if (i === ttSel && i > 0) { const c2 = ttTimeline[i - 1].ch; while (i > 0 && ttTimeline[i - 1].ch === c2) i--; }
    ttSel = i;
  }
  if (Input.aHit) ttConfirm = true;
  if (Input.bHit) mode = 'title';
}
function travelGoUpdate(dt) {
  if (!ttGo) { mode = 'title'; return; }
  ttGo.t += dt;
  if (ttGo.t >= 1.6) { const idx = ttGo.idx; ttGo = null; ttInstall(idx); }
}
function renderTravel() {
  ctx.fillStyle = '#1d3a26'; ctx.fillRect(0, 0, VW, VH);
  drawText(TEXT.travel.title, 80 - textW(TEXT.travel.title, 2) / 2, 8, '#ffffff', 2);
  drawText(TEXT.screens.bBack, 126, 8, '#9fc79f', 1);
  if (!ttTimeline) {
    // the fast-forward montage, while the years are built: the day
    // counter spins and the seasons flash past
    const d = ttBuild ? ttBuild.day : 1, so = seasonOf(d);
    drawText(TEXT.travel.remembering, 80 - textW(TEXT.travel.remembering, 1) / 2, 44, '#9fc79f', 1);
    const dl = 'DAY ' + d;
    drawText(dl, 80 - textW(dl, 2) / 2, 62, '#ffd94a', 2);
    const sl = SEASON_NAMES[so.idx] + ', YEAR ' + so.year;
    drawText(sl, 80 - textW(sl, 1) / 2, 84, '#cfe8cf', 1);
    if (ttBuild && ttBuild.error) drawText(TEXT.travel.couldNot, 80 - textW(TEXT.travel.couldNot, 1) / 2, 110, '#e08a8a', 1);
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(0, 0, VW, 1); ctx.fillRect(0, VH - 1, VW, 1); ctx.fillRect(0, 0, 1, VH); ctx.fillRect(VW - 1, 0, 1, VH);
    return;
  }
  const snp = ttTimeline[ttSel], ro = ttReadout(snp);
  const ttNote = TEXT.travel.note;
  ttNote.forEach((l, i) => drawText(l, 80 - textW(l, 1) / 2, 30 + i * 7, '#9fc79f', 1));
  drawText(ro.title, 80 - textW(ro.title, 1) / 2, 56, '#ffffff', 1);
  drawText(ro.line, 80 - textW(ro.line, 1) / 2, 65, '#cfe8cf', 1);
  ctx.fillStyle = '#3f6a45'; ctx.fillRect(TT_X0, TT_Y, TT_X1 - TT_X0, 2);
  for (let i = 0; i < ttTimeline.length; i++) {
    if (i === 0 || ttTimeline[i].ch !== ttTimeline[i - 1].ch) {
      const x = TT_X0 + (TT_X1 - TT_X0) * i / (ttTimeline.length - 1);
      ctx.fillStyle = '#9fc79f'; ctx.fillRect(Math.round(x), TT_Y - 2, 1, 6);
    }
  }
  const kx = TT_X0 + (TT_X1 - TT_X0) * ttSel / (ttTimeline.length - 1);
  ctx.fillStyle = '#ffd94a'; ctx.fillRect(Math.round(kx) - 2, TT_Y - 4, 5, 10);
  ctx.fillStyle = '#20242a'; ctx.fillRect(Math.round(kx), TT_Y - 1, 1, 4);
  drawText(TEXT.travel.choose, 80 - textW(TEXT.travel.choose, 1) / 2, 108, '#9fc79f', 1);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(0, 0, VW, 1); ctx.fillRect(0, VH - 1, VW, 1); ctx.fillRect(0, 0, 1, VH); ctx.fillRect(VW - 1, 0, 1, VH);
  if (ttConfirm) {
    drawBox(48, 34);
    drawText(TEXT.travel.travelHere, 80 - textW(TEXT.travel.travelHere, 1) / 2, 54, '#20242a', 1);
    drawText(TEXT.travel.replaced, 80 - textW(TEXT.travel.replaced, 1) / 2, 63, '#20242a', 1);
    drawText(TEXT.screens.aYesBNo, 80 - textW(TEXT.screens.aYesBNo, 1) / 2, 74, '#b03030', 1);
  }
}
function renderTravelGo() {
  ctx.fillStyle = '#1d3a26'; ctx.fillRect(0, 0, VW, VH);
  if (ttGo && ttTimeline) {
    const target = ttTimeline[ttGo.idx];
    const p = Math.min(1, ttGo.t / 1.6), e = 1 - (1 - p) * (1 - p);
    const d = Math.max(1, Math.round(1 + (target.day - 1) * e));
    const so = seasonOf(d);
    const dl = 'DAY ' + d;
    drawText(dl, 80 - textW(dl, 2) / 2, 52, '#ffd94a', 2);
    const sl = SEASON_NAMES[so.idx] + ', YEAR ' + so.year;
    drawText(sl, 80 - textW(sl, 1) / 2, 74, '#cfe8cf', 1);
    const ro = ttReadout(target);
    drawText(ro.title, 80 - textW(ro.title, 1) / 2, 96, '#9fc79f', 1);
  }
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(0, 0, VW, 1); ctx.fillRect(0, VH - 1, VW, 1); ctx.fillRect(0, 0, 1, VH); ctx.fillRect(VW - 1, 0, 1, VH);
}
(function () { // the slider answers a thumb as well as the arrows
  const cvs = document.getElementById('game');
  const toSel = e => {
    const r = cvs.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
    if (Math.abs(y - (TT_Y + 1)) > 10) return false;
    ttSel = Math.max(0, Math.min(ttTimeline.length - 1, Math.round((x - TT_X0) / (TT_X1 - TT_X0) * (ttTimeline.length - 1))));
    return true;
  };
  cvs.addEventListener('pointerdown', e => {
    if (mode === 'travel' && ttTimeline && !ttConfirm && toSel(e)) {
      ttDrag = true;
      try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });
  cvs.addEventListener('pointermove', e => { if (ttDrag && mode === 'travel') toSel(e); });
  const end = () => { ttDrag = false; };
  cvs.addEventListener('pointerup', end);
  cvs.addEventListener('pointercancel', end);
})();
(function () { // a dialogue's choice list answers a tap on a row, like the slider answers a thumb
  const cvs = document.getElementById('game');
  cvs.addEventListener('pointerdown', e => {
    if (mode !== 'dialogue' || !dlgListOpen()) return;
    const r = cvs.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
    const g = dlgListGeom(), start = dlgListStart();
    if (x < g.x || x >= g.x + g.w) return;
    const row = Math.floor((y - (g.y + 2)) / DLG_PITCH);
    if (row >= 0 && row < g.rows) { dlgTapRow = start + row; dlgTapFor = dlg; }
  });
})();

/* ============================== TEST HOOK ============================== */
window.__hss = {
  state() {
    const so = seasonOf(G.save.day);
    const ser = p => ({ name: p.name, stage: p.stage, wateredDays: p.wateredDays, watered: p.watered, vigor: p.vigor, tended: p.tended, sownDay: p.sownDay, sproutedDay: p.sproutedDay, seedlingDay: p.seedlingDay, location: p.location, dirt: p.dirt, dirtCredit: p.dirtCredit, variety: p.variety, health: p.health, dryDays: p.dryDays, memorial: p.memorial, row: p.row, slot: p.slot, chill: p.chill, wintered: p.wintered, history: p.history.slice(), firstSix: p.firstSix, giftName: p.giftName, gardenState: p.gardenState, firstHarvestDay: p.firstHarvestDay, harvestByYear: p.harvestByYear, fav: !!p.fav, gone: !!p.gone, succName: p.succName || null, ofLine: p.ofLine || null, home: p.home || null });
    return {
      mode, day: G.save.day, season: SEASON_NAMES[so.idx], year: so.year, tutorial: G.save.tutorial, seedsLeft: G.save.seedsLeft, tea: G.save.tea,
      compost: G.save.compost, goodDirt: G.save.goodDirt, weeds: JSON.parse(JSON.stringify(G.save.weeds || [])),
      pots: sixPlants().map(ser),
      plants: G.save.plants.map(ser),
      tray: JSON.parse(JSON.stringify(G.save.tray)),
      world: { ch: G.save.world.ch, step: G.save.world.step, area, flags: JSON.parse(JSON.stringify(G.save.world.flags)), proj: G.save.world.proj, rainToday: G.save.world.rainToday },
      field: JSON.parse(JSON.stringify(G.save.field)),
      rows: G.save.cropRows.map(r => ({ yieldRating: r.yieldRating, fruitSet: r.fruitSet, wateredDays: r.wateredDays, poundsByYear: r.poundsByYear, mulched: r.mulched, watered: r.watered, mowed: !!r.mowed, bushCount: r.bushCount || 0, rowHealth: r.rowHealth || 0, stage: r.stage || 0, variety: r.variety, plantedDay: r.plantedDay, history: (r.history || []).slice(), foundingRoll: r.foundingRoll })),
      company: G.save.company ? JSON.parse(JSON.stringify(G.save.company)) : null,
      nursery: G.save.nursery ? JSON.parse(JSON.stringify(G.save.nursery)) : null,
      saveVersion: G.save.v,
      wine: { jar: G.save.wine.jar ? { phase: G.save.wine.jar.phase, days: G.save.wine.jar.days, index: G.save.wine.jar.index, care: G.save.wine.jar.care, batch: G.save.wine.jar.batch } : null, batches: G.save.wine.batches.map(b => ({ n: b.n, verdict: b.verdict, index: b.index, care: b.care })), honey: G.save.wine.honey, pounds: G.save.wine.pounds, poundsByYear: G.save.wine.poundsByYear, shared: G.save.wine.shared },
      promise: G.save.promise, germ: G.save.germ,
      npcs: npcList.map(n => ({ id: n.id, x: n.tx, y: n.ty })),
      register: { view: regView, sel: regSel, cardSel: regCardSel, loc: regLoc, page: regPage },
      berrydex: { view: dexView, sel: dexSel, page: dexPage, scroll: dexScroll, variety: dexVar, text: dexTextKind },
      dex: JSON.parse(JSON.stringify(G.save.dex)), deerBeaten: G.save.deerBeaten, deerPresent: G.save.deerPresent,
      chapterDone: G.save.chapterDone, player: { x: player.tx, y: player.ty, dir: player.dir },
      alvin: { x: alvin.tx, y: alvin.ty }, trial: trialSnapshot(),
      settings: { stick: settings.stick, music: settings.music }, padVisible: !deckEl.hidden, menuSel,
      theme: { playing: themePlaying, scheduled: themeDbg.scheduled, ctx: themeCtx ? themeCtx.state : 'none' },
      stick: { dir: stickDebug.dir, mag: stickDebug.mag },
    };
  },
  advanceDay() {
    if (trial) return;
    dlg = null; if (mode === 'dialogue') mode = 'overworld';
    dawn();
    if (mode === 'dialogue') { dlg = null; mode = 'overworld'; }
  },
  waterAll() { sixPlants().forEach(p => { if (p.stage >= 1 && !p.memorial) waterPlant(p); }); saveGame(); },
  waterEverything() { for (const p of G.save.plants) if (p.stage >= 1 && !p.memorial && !p.gone) waterPlant(p); for (const r of G.save.cropRows) r.watered = true; if (G.save.company && !G.save.company.gone && G.save.company.n > 0) G.save.company.watered = true; if (G.save.nursery && G.save.nursery.stock > 0) G.save.nursery.watered = true; if (G.save.tray.n > 0) G.save.tray.watered = true; saveGame(); },
  plantAll() {
    sixPlants().forEach(p => { if (p.stage === 0 && G.save.seedsLeft > 0) { p.stage = 1; if (p.sownDay == null) p.sownDay = G.save.day; G.save.seedsLeft--; dexAdd('SEED', p.variety); } });
    if (G.save.tutorial === 1) G.save.tutorial = 2;
    saveGame();
  },
  openRegister() { openRegister(); },
  skipIntro() { dlg = null; if (G.save.tutorial === 0) G.save.tutorial = 1; if (mode === 'dialogue') mode = 'overworld'; saveGame(); },
  startTrial() { if (G.save.deerPresent && !G.save.deerBeaten && strongestPot() >= 0) startTrial(); },
  startFoe(cfg) { startTrial(cfg); },
  fridgeSeeds() { fridgeSeeds(); },
  storageTrip() { storageTrip(); },
  potUp() { potUp(); },
  signSale() { if (G.save.world.step === 8) signSale(); },
  buildGreenhouse() { buildGreenhouse(); },
  chooseLoadOrder(o) { chooseLoadOrder(o); },
  stakeField() { stakeField(); },
  irisInteract() { irisInteract(); },
  patchInteract() { patchInteract(); },
  repot() { repot(); },
  doPlanting() { doPlanting(); },
  fieldInteractAt(x, y) { fieldInteract({ x, y }); },
  fenceSeg(seg) { buildFenceSeg(seg); },
  layTarp(bi) { layTarp(bi); },
  patchTarp(bi) { patchTarp(bi); },
  moveTarp(bi) { moveTarp(bi); },
  digPipe() { digPipe(); },
  turnValve() { turnValve(); },
  orderMulch() { orderMulch(); },
  mulchRow(rn) { mulchRow(rn); },
  plantingGate() { return plantingGate(); },
  setWatch(w) { G.save.world.watchRow = w; saveGame(); },
  pullWeeds(sec) { pullWeeds(sec); },
  feedRow(rn) { feedRow(rn); },
  proudWeed() { proudWeedInteract(); },
  burnPile() { burnPileInteract(); },
  strawberry() { strawberryInteract(); },
  butterfly() { butterflyPlant(); },
  forsythia() { forsythiaPlant(); },
  setFrostWatch(rn) { G.save.world.flags.watchTonight = rn; saveGame(); },
  startBatchOne() { startBatchOne(); },
  startBatchTwo(i) { startBatchTwo(i); },
  swishJar() { swishJar(); },
  sealCheck() { sealCheck(); },
  bottleJar() { bottleJar(); },
  harvestRow(rn) { harvestRow(rn); },
  tasting() { tasting(); },
  dlgLines() { return dlg ? dlg.lines.map(l => ({ name: l.name, text: l.text })) : []; },
  dlgState() { return dlg ? { choice: dlg.choice ? dlg.choice.slice() : null, sel: dlg.sel, idx: dlg.idx, chars: dlg.chars, total: dlg.lines[dlg.idx].text.length, lines: dlg.lines.length } : null; },
  ltGoals() { return ltGoals(); },
  plantNurseryRow(rn) { plantNurseryRow(rn); },
  pruneRow(rn) { pruneRow(rn); },
  sowTrayLT() { sowTrayLT(); },
  potUpLT() { potUpLT(); },
  shareStand() { shareStand(); },
  carryPlants() { carryPlants(); },
  warp(x, y) { player.tx = x; player.ty = y; syncPixels(player); alvin.tx = x; alvin.ty = Math.min(AH - 1, y + 1); syncPixels(alvin); },
  gotoArea(a, x, y) { setArea(a, x, y); },
  setDay(n) { G.save.day = n; saveGame(); },
  setChapter(ch, step) { G.save.world.ch = ch; G.save.world.step = step || 0; saveGame(); },
  setHealth(name, h) { const p = G.save.plants.find(q => q.name === name); if (p) { p.health = h; if (h === 3) { p.critSince = G.save.day; p.warnedDay = G.save.day; } saveGame(); } },
  debugSave() { return JSON.parse(JSON.stringify(G.save)); },
  setSave(obj) { G.save = normalizeSave(obj); area = AREAS[G.save.world.area] ? G.save.world.area : 'yard'; AW = curArea().w; AH = curArea().h; player.tx = G.save.player.x; player.ty = G.save.player.y; syncPixels(player); layoutNPCs(); saveGame(); },
  trialState() { return trial ? { foe: trial.foe, pressure: trial.pressure, maxPressure: trial.maxPressure, vigor: trial.vigor, phase: trial.phase, wave: trial.wave || 1, over: trial.over, result: trial.result } : null; },
  ttState() { return { built: !!ttTimeline, building: !!ttBuild && !ttBuild.done, error: ttBuild ? ttBuild.error : null, count: ttTimeline ? ttTimeline.length : (ttBuild ? ttBuild.snaps.length : 0), buildDay: ttBuild ? ttBuild.day : null, sel: ttSel, confirm: ttConfirm }; },
  ttMeta() { return ttTimeline ? ttTimeline.map(snp => ({ day: snp.day, ch: snp.ch, step: snp.step })) : []; },
  ttBuildSync() {
    if (!ttTimeline) {
      if (!ttBuild) { try { ttStash = localStorage.getItem(SAVE_KEY); } catch (e) { ttStash = null; } ttBuild = { json: null, snaps: [], day: 1, done: false, error: null, n: 0 }; }
      let g = 0;
      while (!ttBuild.done && g++ < 400) ttBuildChunk(250);
    }
    return !!ttTimeline;
  },
  ttLand(i) { return ttTimeline ? ttInstall(i) : false; },
  ttReset() { ttTimeline = null; ttBuild = null; ttStash = null; ttSel = 0; ttConfirm = false; ttGo = null; },
  ttSize() { return ttTimeline ? ttTimeline.reduce((a, snp) => a + snp.json.length, 0) : 0; },
  setWeeds(list) { G.save.weeds = (list || []).map(w => ({ x: w.x, y: w.y, deep: !!w.deep, area: w.area === 'field' ? 'field' : 'yard' })); saveGame(); },
  spawnFieldWeeds(n) { spawnFieldWeeds(n || 2); saveGame(); },
  fieldRowAt(x, y) { return fieldRowAt(x, y); },
  rowBushPos(rn, idx) { return rowBushPos(rn, idx); },
  giveCompost(n) { G.save.compost += n; saveGame(); },
  giveDirt(n) { G.save.goodDirt += n; saveGame(); },
  themeData() { return { bpm: THEME.bpm, beats: THEME.beats, melody: THEME.melody.map(e => e[0]), bass: THEME.bass.map(e => e[0]), chords: THEME.chords.map(e => e[0]) }; },


};
