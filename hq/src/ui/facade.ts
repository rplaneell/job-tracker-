import { TOWER_WINDOW } from '../domain/intro';

/**
 * The tower the drone climbs, the city behind it and the clouds in front of it. They are painted once with the browser's own
 * drawing tools when the page opens, so there are no image files to download. Sizes are in pixels of the painted picture.
 */

export const FACADE = {
  w: 1200,
  h: 3400,
  /** Where the drone starts: the point of the tower in the middle of the screen at the street. */
  startY: 2880,
  /** Where it ends: the middle of the big window of the office floor. */
  endY: 387,
  /** The window of the office floor, in the same pixels. It is left see through: the real 3D office shows in it. */
  window: { x: 214, y: 178, w: TOWER_WINDOW.w, h: TOWER_WINDOW.h },
};

/** A tiny random number generator, so every painting is the same each time. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A colour between two hex colours. */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function make(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return ctx ? [canvas, ctx] : null;
}

/** A soft round blob of one colour that fades to nothing at its edge. */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const ROOF = 120;
const TOP_FLOOR_BOTTOM = 620; // the office floor runs from just under the roof down to here
const FLOOR_H = 130;
const FLOORS = 18;
const GROUND = TOP_FLOOR_BOTTOM + FLOORS * FLOOR_H;
const COLS = 8;
const PANE_W = 100;
/** The tower is narrower than the picture, so the sky and the city show on both sides of it. */
const TOWER_W = COLS * PANE_W;
const TOWER_X = (FACADE.w - TOWER_W) / 2;

/** The glass tower, from the roof (top) down to the street (bottom). The office floor is the tall lit one just under the roof. */
export function drawFacade(): HTMLCanvasElement | null {
  const made = make(FACADE.w, FACADE.h);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = mulberry32(21);
  const W = TOWER_W;
  ctx.translate(TOWER_X, 0);

  // Ordinary floors: panes of glass that mirror the sky, a few with a lit room behind them.
  for (let r = 0; r < FLOORS; r++) {
    const y0 = TOP_FLOOR_BOTTOM + r * FLOOR_H;
    for (let c = 0; c < COLS; c++) {
      const x0 = c * PANE_W;
      const t = rand();
      const glassH = FLOOR_H - 24;
      const g = ctx.createLinearGradient(0, y0, 0, y0 + glassH);
      g.addColorStop(0, mix('#a9cfea', '#d6e9f6', t));
      g.addColorStop(0.55, mix('#6e9cc4', '#9cc0dd', t));
      g.addColorStop(1, mix('#3d6284', '#5f86a8', t));
      ctx.fillStyle = g;
      ctx.fillRect(x0 + 3, y0 + 3, PANE_W - 6, glassH - 3);
      if (rand() < 0.14) {
        const w = ctx.createLinearGradient(0, y0, 0, y0 + glassH);
        w.addColorStop(0, '#ffe7b8');
        w.addColorStop(1, '#e9a860');
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = w;
        ctx.fillRect(x0 + 3, y0 + 3, PANE_W - 6, glassH - 3);
        ctx.globalAlpha = 1;
        const blinds = 2 + Math.floor(rand() * 4);
        ctx.fillStyle = 'rgba(120,70,20,0.28)';
        for (let k = 0; k < blinds; k++) ctx.fillRect(x0 + 3, y0 + 9 + k * 9, PANE_W - 6, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x0 + 3, y0 + 3, PANE_W - 6, 4); // ceiling light
      }
    }
    // The floor slab between this row and the next: a dark band with a bright top edge.
    ctx.fillStyle = '#383e45';
    ctx.fillRect(0, y0 + FLOOR_H - 24, W, 24);
    ctx.fillStyle = '#9aa3ab';
    ctx.fillRect(0, y0 + FLOOR_H - 24, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y0 + FLOOR_H - 3, W, 3);
  }
  // Vertical frames between the panes.
  for (let c = 0; c <= COLS; c++) {
    ctx.fillStyle = '#1f252b';
    ctx.fillRect(c * PANE_W - 2, TOP_FLOOR_BOTTOM, 4, FLOORS * FLOOR_H);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(c * PANE_W + 2, TOP_FLOOR_BOTTOM, 1, FLOORS * FLOOR_H);
  }
  // Big soft reflections of clouds and the sun across the whole glass skin, and shade towards the street.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP_FLOOR_BOTTOM, W, FLOORS * FLOOR_H);
  ctx.clip();
  for (let i = 0; i < 46; i++) blob(ctx, rand() * W, TOP_FLOOR_BOTTOM + rand() * FLOORS * FLOOR_H, 70 + rand() * 170, '255,255,255', 0.05 + rand() * 0.1);
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const x = -200 + i * 360 + rand() * 80;
    const band = ctx.createLinearGradient(x, 0, x + 260, 0);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.setTransform(1, 0, -0.32, 1, 0, 0);
    ctx.fillRect(x, TOP_FLOOR_BOTTOM, 260, FLOORS * FLOOR_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-over';
  const shade = ctx.createLinearGradient(0, TOP_FLOOR_BOTTOM, 0, GROUND);
  shade.addColorStop(0, 'rgba(10,25,45,0)');
  shade.addColorStop(1, 'rgba(10,25,45,0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, TOP_FLOOR_BOTTOM, W, FLOORS * FLOOR_H);
  ctx.restore();

  // The office floor: one big window, left empty (see through) so the real 3D office shows in it, in a steel frame.
  const win = { x: FACADE.window.x - TOWER_X, y: FACADE.window.y, w: FACADE.window.w, h: FACADE.window.h };
  const frameBottom = TOP_FLOOR_BOTTOM - 24;
  ctx.fillStyle = '#2f353c';
  ctx.fillRect(0, win.y - 16, W, 16); // beam above the window
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(0, win.y - 16, W, 2);
  for (const x of [0, win.x + win.w]) {
    // The corner columns of the tower on both sides of the window.
    const col = ctx.createLinearGradient(x, 0, x + win.x, 0);
    col.addColorStop(0, '#444b53');
    col.addColorStop(0.5, '#262b31');
    col.addColorStop(1, '#3a4047');
    ctx.fillStyle = col;
    ctx.fillRect(x, win.y - 16, win.x, frameBottom - win.y + 16);
  }
  // A few thin mullions between the big panes of the window.
  for (let c = 1; c < TOWER_W / 200; c++) {
    const x = c * 200;
    if (x <= win.x || x >= win.x + win.w) continue;
    ctx.fillStyle = '#20252b';
    ctx.fillRect(x - 3, win.y, 6, win.h);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 2, win.y, 1, win.h);
  }
  // A faint sheen on the glass, the sky reflected in it, so it reads as glass and not as a hole.
  const sheen = ctx.createLinearGradient(0, win.y, 0, win.y + win.h);
  sheen.addColorStop(0, 'rgba(190,222,248,0.3)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sheen.addColorStop(1, 'rgba(120,165,205,0.16)');
  ctx.fillStyle = sheen;
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(win.x, win.y, win.w, win.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  for (const x of [win.x + 120, win.x + 470]) {
    const band = ctx.createLinearGradient(x, 0, x + 170, 0);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.13)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.setTransform(1, 0, -0.36, 1, TOWER_X, 0);
    ctx.fillRect(x, win.y, 170, win.h);
  }
  ctx.setTransform(1, 0, 0, 1, TOWER_X, 0);
  ctx.restore();
  // The slab under the window, with a glowing amber edge so the floor reads from far away.
  ctx.fillStyle = '#383e45';
  ctx.fillRect(0, frameBottom, W, 24);
  ctx.fillStyle = '#9aa3ab';
  ctx.fillRect(0, frameBottom, W, 2);
  ctx.save();
  ctx.shadowColor = 'rgba(255,170,60,0.95)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(0, frameBottom + 4, W, 5);
  ctx.restore();

  // The roof edge and its parapet.
  ctx.fillStyle = '#2b3138';
  ctx.fillRect(0, ROOF, W, win.y - 16 - ROOF);
  ctx.fillStyle = '#a9b2ba';
  ctx.fillRect(0, ROOF, W, 3);
  ctx.fillStyle = '#555c64';
  ctx.fillRect(TOWER_W / 2 - 3, ROOF - 70, 6, 70); // a mast
  ctx.fillStyle = '#ff5a4f';
  ctx.beginPath();
  ctx.arc(TOWER_W / 2, ROOF - 74, 5, 0, Math.PI * 2);
  ctx.fill();

  // The lobby at street level: dark glass with warm light inside, and an entrance under a canopy.
  const lobby = ctx.createLinearGradient(0, GROUND, 0, GROUND + 300);
  lobby.addColorStop(0, '#16283a');
  lobby.addColorStop(1, '#0b1722');
  ctx.fillStyle = lobby;
  ctx.fillRect(0, GROUND, W, 300);
  for (let c = 0; c < COLS; c++) {
    const w = ctx.createLinearGradient(0, GROUND + 40, 0, GROUND + 290);
    w.addColorStop(0, 'rgba(255,214,150,0.15)');
    w.addColorStop(1, 'rgba(255,196,120,0.78)');
    ctx.fillStyle = w;
    ctx.fillRect(c * PANE_W + 4, GROUND + 40, PANE_W - 8, 246);
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.fillStyle = '#10161c';
    ctx.fillRect(c * PANE_W - 3, GROUND, 6, 300);
  }
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(TOWER_W / 2 - 100, GROUND + 90, 95, 196);
  ctx.fillRect(TOWER_W / 2 + 5, GROUND + 90, 95, 196);
  ctx.fillStyle = '#8b9298';
  ctx.fillRect(TOWER_W / 2 - 2, GROUND + 90, 4, 196);
  ctx.fillStyle = '#242a31';
  ctx.fillRect(0, GROUND, W, 40);
  ctx.fillStyle = '#9aa3ab';
  ctx.fillRect(0, GROUND, W, 2);
  for (let x = 30; x < W; x += 60) {
    ctx.fillStyle = 'rgba(255,240,205,0.9)';
    ctx.fillRect(x, GROUND + 30, 24, 4);
  }

  // The two edges of the tower, a little darker, so the tower reads as a solid.
  const edge = ctx.createLinearGradient(0, 0, 36, 0);
  edge.addColorStop(0, 'rgba(8,16,28,0.55)');
  edge.addColorStop(1, 'rgba(8,16,28,0)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, ROOF, 36, GROUND + 300 - ROOF);
  const edge2 = ctx.createLinearGradient(W, 0, W - 36, 0);
  edge2.addColorStop(0, 'rgba(8,16,28,0.55)');
  edge2.addColorStop(1, 'rgba(8,16,28,0)');
  ctx.fillStyle = edge2;
  ctx.fillRect(W - 36, ROOF, 36, GROUND + 300 - ROOF);
  // Pavement and road, across the whole picture.
  ctx.translate(-TOWER_X, 0);
  const street = ctx.createLinearGradient(0, GROUND + 300, 0, FACADE.h);
  street.addColorStop(0, '#9a9ca0');
  street.addColorStop(0.35, '#6c6e72');
  street.addColorStop(0.36, '#2d2e32');
  street.addColorStop(1, '#1c1d20');
  ctx.fillStyle = street;
  ctx.fillRect(0, GROUND + 300, FACADE.w, FACADE.h - GROUND - 300);
  return canvas;
}

/** Other towers far behind, in the haze, with a few lit windows. */
export function drawSkyline(): HTMLCanvasElement | null {
  const made = make(1800, 900);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = mulberry32(5);
  for (let layer = 0; layer < 3; layer++) {
    const tone = ['rgba(150,176,203,0.5)', 'rgba(124,152,184,0.62)', 'rgba(96,126,160,0.75)'][layer];
    let x = -40;
    while (x < 1800) {
      const w = 50 + rand() * 110;
      const h = 220 + layer * 70 + rand() * (360 - layer * 40);
      ctx.fillStyle = tone;
      ctx.fillRect(x, 900 - h, w, h);
      if (layer === 2) {
        for (let k = 0; k < 14; k++) {
          ctx.fillStyle = `rgba(255,214,150,${0.35 + rand() * 0.5})`;
          ctx.fillRect(x + 6 + rand() * (w - 14), 900 - h + 12 + rand() * (h - 30), 3, 4);
        }
      }
      x += w + rand() * 40 - 10;
    }
  }
  const haze = ctx.createLinearGradient(0, 400, 0, 900);
  haze.addColorStop(0, 'rgba(235,226,214,0)');
  haze.addColorStop(1, 'rgba(244,222,190,0.85)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 400, 1800, 500);
  return canvas;
}

/** Banks of cloud, soft and white, for the drone to climb through. */
export function drawClouds(): HTMLCanvasElement | null {
  const made = make(1600, 2600);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = mulberry32(13);
  for (let i = 0; i < 26; i++) {
    const cx = rand() * 1600;
    const cy = rand() * 2600;
    const r = 90 + rand() * 150;
    for (let j = 0; j < 9; j++) blob(ctx, cx + (rand() - 0.5) * r * 2.2, cy + (rand() - 0.5) * r * 0.7, r * (0.5 + rand() * 0.6), '255,255,255', 0.2 + rand() * 0.22);
  }
  return canvas;
}

/** Turns a painting into a web address the page can use as a background, without making the page wait for it. */
export function canvasUrl(canvas: HTMLCanvasElement | null): Promise<string> {
  return new Promise((resolve) => {
    if (!canvas) return resolve('none');
    try {
      canvas.toBlob((blob) => resolve(blob ? `url(${URL.createObjectURL(blob)})` : 'none'), 'image/png');
    } catch {
      resolve('none');
    }
  });
}
