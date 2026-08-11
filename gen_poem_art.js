// Generate illustration art for poems that have no real image.
//
// Draws a layered vector scene (sky, sun/moon, mist, ridges, midground motif,
// silhouette foreground, grain, vignette) and rasterises it with sharp.
// The scene template and palette are picked from keywords in the poem's title +
// text, so a poem about mưa gets rain and one about mẹ/quê gets a village dusk.
// Placement inside a template is seeded by the poem id, so every run of this
// script reproduces the same art and no two poems get the same composition.
//
// Usage:
//   node gen_poem_art.js 2012-2046        # id range
//   node gen_poem_art.js 2012 2013 2020   # single ids
//   node gen_poem_art.js --sample 2021,2029,2035 --out /tmp/preview
//
// Writes images/poem_<id>_img_0.webp at 1600x1200 quality 82 (same budget as the
// rest of the art — see CLAUDE.md). Run `node gen_thumbnails.js` afterwards; the
// card grid reads the .thumb.webp, so stale thumbs must be regenerated.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1600;
const H = 1200;
const QUALITY = 82;
const DATA = 'poems_data.json';
const DIR = 'images';

/* ---------------------------------------------------------------- utilities */

// mulberry32 — small deterministic PRNG so art is reproducible per poem id.
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a += 0x6d2b79f5;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rnd = (r, min, max) => min + r() * (max - min);
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const n = (v) => Number(v).toFixed(1);

// Strip Vietnamese diacritics so keyword matching survives typing variants.
function plain(s) {
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function mix(hexA, hexB, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [a, b] = [p(hexA), p(hexB)];
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ---------------------------------------------------------------- palettes  */
// Each palette varies in value, not just hue — 35 dark-navy cards would read as
// one image in the grid no matter how different the shapes are.
const PALETTES = {
    dawnWarm: { sky: ['#2a2140', '#77505e', '#e6a468'], light: '#ffe0b0', haze: '#f0c79a', ink: '#1b1428', water: '#3a2c40' },
    sunsetAmber: { sky: ['#3a2340', '#a85641', '#f4b978'], light: '#ffd79a', haze: '#f3c087', ink: '#241522', water: '#4a2b30' },
    duskViolet: { sky: ['#1c1a3c', '#4d3b6e', '#c98da6'], light: '#ffd9e2', haze: '#c9a6c4', ink: '#141026', water: '#2b2447' },
    nightIndigo: { sky: ['#060a1c', '#101f3e', '#2b4270'], light: '#f2f3e2', haze: '#8fa6cc', ink: '#04060f', water: '#0b1630' },
    monsoonGray: { sky: ['#2b3440', '#4c5763', '#8e9aa2'], light: '#dfe6ea', haze: '#b8c3c9', ink: '#1a2028', water: '#39424c' },
    mistTeal: { sky: ['#1d3038', '#3f6167', '#a9c6bd'], light: '#e8f2ea', haze: '#c2d8d0', ink: '#122127', water: '#28454a' },
    autumnGold: { sky: ['#3b2617', '#8d5b2c', '#eab873'], light: '#ffe1a6', haze: '#e6bd84', ink: '#211408', water: '#4b3018' },
    daySoft: { sky: ['#3f7ba6', '#93bfd4', '#ece5d0'], light: '#fffaf0', haze: '#e2ecef', ink: '#1f3a48', water: '#4a7e94' },
    greenQue: { sky: ['#2f4a3c', '#6d8a5c', '#dcd291'], light: '#fff2c4', haze: '#cfd8a4', ink: '#1a2a20', water: '#38513c' },
};

/* ------------------------------------------------------------- svg helpers  */

function linGrad(id, stops) {
    const s = stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`;
}
function radGrad(id, stops) {
    const s = stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
    return `<radialGradient id="${id}">${s}</radialGradient>`;
}
// Filter regions are given in user space covering the whole canvas: a %-based region
// is relative to the element bbox, so a wide flat ellipse gets its blur clipped and
// the clip edge shows up as a hard horizontal seam across the picture.
function blurFilter(id, dev) {
    return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}"><feGaussianBlur stdDeviation="${dev}"/></filter>`;
}

// A soft horizon ridge: two summed sines keep it organic without control points.
function ridgePath(baseY, amp, rough, r) {
    const p1 = r() * 6.3, p2 = r() * 6.3;
    const steps = 40;
    let d = `M0,${H} L0,${n(baseY)}`;
    for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * W;
        const t = i / steps;
        const y = baseY - amp * (0.62 * Math.sin(t * Math.PI * rough + p1) + 0.38 * Math.sin(t * Math.PI * rough * 2.4 + p2));
        d += ` L${n(x)},${n(y)}`;
    }
    return d + ` L${W},${H} Z`;
}

function glow(cx, cy, r, color, op, filterId) {
    return (
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.8)}" fill="${color}" opacity="${(op * 0.42).toFixed(3)}" filter="url(#${filterId})"/>` +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.34)}" fill="${color}" opacity="${(op * 0.5).toFixed(3)}" filter="url(#blurMed)"/>`
    );
}

function broadTree(x, groundY, h, r, color, opacity = 1) {
    const w = h * 0.06;
    const lean = rnd(r, -0.06, 0.06) * h;
    let s = `<g fill="${color}" opacity="${opacity}">`;
    s += `<path d="M${n(x - w)},${n(groundY)} Q${n(x + lean * 0.4)},${n(groundY - h * 0.55)} ${n(x + lean)},${n(groundY - h)} L${n(x + lean + w * 0.7)},${n(groundY - h)} Q${n(x + lean * 0.4 + w * 1.4)},${n(groundY - h * 0.5)} ${n(x + w * 1.5)},${n(groundY)} Z"/>`;
    const cx = x + lean, cy = groundY - h;
    const blobs = 16 + Math.floor(r() * 8);
    for (let i = 0; i < blobs; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * h * 0.5;
        s += `<ellipse cx="${n(cx + Math.cos(a) * d)}" cy="${n(cy - Math.sin(a) * d * 0.55 - h * 0.06)}" rx="${n(rnd(r, h * 0.09, h * 0.2))}" ry="${n(rnd(r, h * 0.07, h * 0.15))}"/>`;
    }
    // a few branches poking past the canopy read as drawn rather than blobby
    for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + rnd(r, -1.1, 1.1);
        s += `<path d="M${n(cx)},${n(cy + h * 0.12)} q${n(Math.cos(a) * h * 0.16)},${n(Math.sin(a) * h * 0.14)} ${n(Math.cos(a) * h * 0.34)},${n(Math.sin(a) * h * 0.3)}" stroke="${color}" stroke-width="${n(h * 0.014)}" fill="none"/>`;
    }
    return s + '</g>';
}

function palm(x, groundY, h, r, color) {
    const lean = rnd(r, -0.18, 0.18) * h;
    const top = groundY - h;
    let s = `<g fill="${color}" stroke="${color}">`;
    s += `<path d="M${n(x - h * 0.018)},${n(groundY)} Q${n(x + lean * 0.3)},${n(groundY - h * 0.6)} ${n(x + lean)},${n(top)} L${n(x + lean + h * 0.02)},${n(top)} Q${n(x + lean * 0.3 + h * 0.03)},${n(groundY - h * 0.6)} ${n(x + h * 0.03)},${n(groundY)} Z" stroke="none"/>`;
    const fronds = 7;
    for (let i = 0; i < fronds; i++) {
        const a = Math.PI + (i / (fronds - 1)) * Math.PI + rnd(r, -0.12, 0.12);
        const len = h * rnd(r, 0.28, 0.42);
        const ex = x + lean + Math.cos(a) * len;
        const ey = top + Math.sin(a) * len * 0.55 + len * 0.22;
        const mx = (x + lean + ex) / 2;
        const my = top + Math.sin(a) * len * 0.5 - len * 0.16;
        const wdt = len * 0.16;
        s += `<path d="M${n(x + lean)},${n(top)} Q${n(mx)},${n(my - wdt * 0.5)} ${n(ex)},${n(ey)} Q${n(mx)},${n(my + wdt * 0.5)} ${n(x + lean)},${n(top)} Z" stroke="none"/>`;
    }
    return s + '</g>';
}

function bamboo(x, groundY, h, r, color) {
    let s = `<g stroke="${color}" fill="none" stroke-linecap="round">`;
    for (let i = 0; i < 3; i++) {
        const bx = x + i * h * 0.07 + rnd(r, -6, 6);
        const bh = h * rnd(r, 0.8, 1.05);
        s += `<path d="M${n(bx)},${n(groundY)} Q${n(bx + h * 0.06)},${n(groundY - bh * 0.6)} ${n(bx + h * 0.14)},${n(groundY - bh)}" stroke-width="${n(h * 0.016)}"/>`;
        for (let k = 0; k < 9; k++) {
            const t = 0.5 + (k / 9) * 0.55;
            const lx = bx + h * 0.14 * t + rnd(r, -4, 4);
            const ly = groundY - bh * t;
            const dir = k % 2 ? 1 : -1;
            const ll = h * rnd(r, 0.1, 0.19);
            const drop = h * rnd(r, 0.03, 0.08);
            // leaf = lens shape (two arcs), the way bamboo foliage actually reads
            s += `<path d="M${n(lx)},${n(ly)} q${n(dir * ll * 0.5)},${n(-drop * 0.5)} ${n(dir * ll)},${n(drop)} q${n(-dir * ll * 0.45)},${n(-drop * 0.15)} ${n(-dir * ll)},${n(-drop)} Z" fill="${color}" stroke="none"/>`;
        }
    }
    return s + '</g>';
}

// Silhouette proportions roughly 7.5 heads tall — anything chunkier reads as a doll.
function person(x, groundY, h, color, facing = 1) {
    const hr = h * 0.062;          // head radius
    const headY = groundY - h + hr;
    const shoulderY = headY + hr * 2.3;
    const hipY = groundY - h * 0.46;
    const sw = h * 0.085;          // shoulder half-width
    return `<g fill="${color}">
        <ellipse cx="${n(x)}" cy="${n(headY)}" rx="${n(hr * 0.86)}" ry="${n(hr)}"/>
        <rect x="${n(x - hr * 0.3)}" y="${n(headY + hr * 0.7)}" width="${n(hr * 0.6)}" height="${n(hr * 0.8)}"/>
        <path d="M${n(x - sw * 0.35)},${n(shoulderY - hr * 0.5)}
                 Q${n(x - sw)},${n(shoulderY)} ${n(x - sw * 0.82)},${n(hipY)}
                 L${n(x + sw * 0.82)},${n(hipY)}
                 Q${n(x + sw)},${n(shoulderY)} ${n(x + sw * 0.35)},${n(shoulderY - hr * 0.5)} Z"/>
        <path d="M${n(x - sw * 0.78)},${n(shoulderY)} q${n(-sw * 0.35)},${n(h * 0.16)} ${n(-sw * 0.2)},${n(h * 0.29)} l${n(sw * 0.3)},${n(h * 0.02)} q${n(-sw * 0.05)},${n(-h * 0.15)} ${n(sw * 0.28)},${n(-h * 0.26)} Z"/>
        <path d="M${n(x + sw * 0.78)},${n(shoulderY)} q${n(sw * 0.35)},${n(h * 0.16)} ${n(sw * 0.2)},${n(h * 0.29)} l${n(-sw * 0.3)},${n(h * 0.02)} q${n(sw * 0.05)},${n(-h * 0.15)} ${n(-sw * 0.28)},${n(-h * 0.26)} Z"/>
        <path d="M${n(x - sw * 0.8)},${n(hipY - h * 0.02)} L${n(x - sw * (0.6 + 0.25 * facing))},${n(groundY)} L${n(x - sw * 0.12)},${n(groundY)} L${n(x - sw * 0.05)},${n(hipY)} Z"/>
        <path d="M${n(x + sw * 0.8)},${n(hipY - h * 0.02)} L${n(x + sw * (0.6 + 0.25 * facing))},${n(groundY)} L${n(x + sw * 0.12)},${n(groundY)} L${n(x + sw * 0.05)},${n(hipY)} Z"/>
    </g>`;
}

// Người gánh: figure + shoulder pole + two baskets.
function carrier(x, groundY, h, color) {
    const sw = h * 0.085;
    const poleY = groundY - h * 0.78;
    const reach = h * 0.34;
    let s = person(x, groundY, h, color, 1);
    s += `<g fill="${color}" stroke="${color}">`;
    s += `<path d="M${n(x - reach)},${n(poleY + h * 0.03)} Q${n(x)},${n(poleY - h * 0.03)} ${n(x + reach)},${n(poleY + h * 0.03)}" stroke-width="${n(h * 0.016)}" fill="none"/>`;
    for (const dir of [-1, 1]) {
        const bx = x + dir * reach * 0.94;
        const by = poleY + h * 0.16;
        s += `<path d="M${n(bx)},${n(poleY + h * 0.035)} L${n(bx - h * 0.07)},${n(by)} L${n(bx + h * 0.07)},${n(by)} Z" stroke-width="${n(h * 0.006)}"/>`;
        s += `<ellipse cx="${n(bx)}" cy="${n(by)}" rx="${n(h * 0.085)}" ry="${n(h * 0.035)}"/>`;
    }
    return s + '</g>';
}

function birds(r, count, cx, cy, spread, color, scale = 1) {
    let s = `<g stroke="${color}" fill="none" stroke-linecap="round">`;
    for (let i = 0; i < count; i++) {
        const x = cx + rnd(r, -spread, spread);
        const y = cy + rnd(r, -spread * 0.4, spread * 0.4);
        const w = rnd(r, 10, 22) * scale;
        s += `<path d="M${n(x - w)},${n(y)} q${n(w * 0.5)},${n(-w * 0.55)} ${n(w)},0 q${n(w * 0.5)},${n(-w * 0.55)} ${n(w)},0" stroke-width="${n(Math.max(1.4, w * 0.09))}"/>`;
    }
    return s + '</g>';
}

// Horizontal light streaks + a vertical glitter column: reads as water.
function waterSurface(pal, horizon, r, lightX, opts = {}) {
    const light = opts.light || pal.light;
    let s = `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="url(#waterGrad)"/>`;
    // glitter column under the light source: short dashes, widening and thinning out
    const rows = 90;
    for (let i = 0; i < rows; i++) {
        const t = i / rows;
        const y = horizon + Math.pow(t, 1.7) * (H - horizon);
        const spread = W * (0.03 + t * 0.22);
        const cx = lightX + rnd(r, -spread, spread);
        const rx = rnd(r, 14, 70) * (0.5 + t * 2.2);
        const falloff = Math.max(0, 1 - Math.abs(cx - lightX) / (spread + 1));
        s += `<ellipse cx="${n(cx)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(1.2 + t * 3.2)}" fill="${light}" opacity="${(0.06 + falloff * (0.3 - t * 0.16)).toFixed(3)}"/>`;
    }
    // scattered ripples elsewhere so the rest of the surface is not dead flat
    for (let i = 0; i < 70; i++) {
        const t = r();
        const y = horizon + Math.pow(t, 1.5) * (H - horizon);
        const x = rnd(r, 0, W);
        s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rnd(r, 16, 90) * (0.4 + t))}" ry="${n(1 + t * 2.2)}" fill="${light}" opacity="${(0.03 + r() * 0.06).toFixed(3)}"/>`;
    }
    return s;
}

function mistBand(y, height, color, op, filterId) {
    return `<ellipse cx="${W / 2}" cy="${n(y)}" rx="${W * 0.75}" ry="${n(height)}" fill="${color}" opacity="${op}" filter="url(#${filterId})"/>`;
}

/* ---------------------------------------------------------------- scenes    */
// Each scene returns the body markup; shared defs (sky, water, blurs, grain,
// vignette) are added by render().

const SCENES = {
    // mẹ, quê, bếp, gánh, nhà, lúa — làng quê lúc chiều buông
    village(pal, r) {
        const horizon = H * rnd(r, 0.56, 0.63);
        const sunX = W * rnd(r, 0.18, 0.8);
        const sunY = horizon - rnd(r, 40, 130);
        let s = '';
        s += glow(sunX, sunY, 320, pal.haze, 0.55, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(rnd(r, 46, 62))}" fill="${pal.light}" opacity="0.92" filter="url(#blurSm)"/>`;
        s += mistBand(horizon - 30, 60, pal.haze, 0.3, 'blurBig');
        s += `<path d="${ridgePath(horizon - 18, 46, 3.1, r)}" fill="${mix(pal.sky[1], pal.ink, 0.45)}" opacity="0.8"/>`;
        // ruộng lúa: one gradient sheet, then only the near furrows — drawing both bands
        // and full-height furrows turns the field into a tiled floor
        const fieldTop = horizon;
        s += `<rect x="0" y="${n(fieldTop)}" width="${W}" height="${n(H - fieldTop)}" fill="url(#fieldGrad)"/>`;
        const vp = W * rnd(r, 0.35, 0.65);
        for (let i = -16; i <= 16; i++) {
            const yStart = fieldTop + (H - fieldTop) * 0.34;
            const xStart = vp + i * 12 * 3.4;
            s += `<path d="M${n(xStart)},${n(yStart)} L${n(vp + i * 210)},${H}" stroke="${mix(pal.ink, pal.light, 0.22)}" stroke-width="2.4" opacity="0.16" fill="none"/>`;
        }
        // bờ ruộng: a couple of soft dividing banks, fading with distance
        for (let i = 0; i < 3; i++) {
            const t = 0.25 + i * 0.26;
            const y = fieldTop + Math.pow(t, 1.4) * (H - fieldTop);
            s += `<path d="M0,${n(y)} Q${n(W * 0.5)},${n(y + rnd(r, -18, 18))} ${W},${n(y + rnd(r, -14, 14))}" stroke="${mix(pal.ink, pal.light, 0.3)}" stroke-width="${n(3 + i * 3)}" fill="none" opacity="${(0.12 + i * 0.05).toFixed(2)}"/>`;
        }
        // nhà tranh + khói bếp
        const hx = W * rnd(r, 0.2, 0.75);
        const hy = horizon + (H - horizon) * 0.16;
        const hw = 190, hh = 96;
        s += `<g fill="${pal.ink}">
            <rect x="${n(hx - hw / 2)}" y="${n(hy - hh)}" width="${n(hw)}" height="${n(hh)}"/>
            <path d="M${n(hx - hw * 0.62)},${n(hy - hh)} L${n(hx)},${n(hy - hh * 1.75)} L${n(hx + hw * 0.62)},${n(hy - hh)} Z"/>
            <rect x="${n(hx + hw * 0.16)}" y="${n(hy - hh * 2.0)}" width="26" height="${n(hh * 0.5)}"/>
        </g>`;
        s += `<rect x="${n(hx - hw * 0.2)}" y="${n(hy - hh * 0.72)}" width="52" height="46" fill="${pal.light}" opacity="0.85"/>`;
        s += glow(hx - hw * 0.2 + 26, hy - hh * 0.5, 70, pal.light, 0.5, 'blurMed');
        for (let i = 0; i < 5; i++) {
            const sy = hy - hh * 2.0 - i * 46;
            s += `<ellipse cx="${n(hx + hw * 0.2 + i * rnd(r, 6, 26))}" cy="${n(sy)}" rx="${n(24 + i * 16)}" ry="${n(16 + i * 10)}" fill="${pal.haze}" opacity="${(0.3 - i * 0.05).toFixed(2)}" filter="url(#blurMed)"/>`;
        }
        s += bamboo(W * rnd(r, 0.04, 0.14), hy + 30, 420, r, pal.ink);
        s += palm(W * rnd(r, 0.82, 0.94), hy + 60, 480, r, pal.ink);
        s += broadTree(W * rnd(r, 0.26, 0.44), hy + 4, 230, r, pal.ink, 0.95);
        s += carrier(W * rnd(r, 0.3, 0.7), H * rnd(r, 0.9, 0.96), rnd(r, 200, 260), pal.ink);
        // lúa in the near field, two depths so the ground doesn't read as empty sand
        s += grassRow(r, mix(pal.ink, pal.sky[1], 0.3), H * 0.9, 70, 120, 0.16);
        s += grassRow(r, pal.ink, H + 20, 150, 110, 0.2);
        s += birds(r, 6, W * 0.62, horizon - 220, 200, mix(pal.ink, pal.sky[1], 0.35), 0.8);
        return s;
    },

    // mưa
    rain(pal, r) {
        const horizon = H * rnd(r, 0.6, 0.68);
        let s = '';
        for (let i = 0; i < 5; i++) {
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, 60, horizon * 0.6))}" rx="${n(rnd(r, 260, 520))}" ry="${n(rnd(r, 60, 130))}" fill="${mix(pal.sky[0], pal.ink, 0.3)}" opacity="0.5" filter="url(#blurBig)"/>`;
        }
        s += mistBand(horizon - 20, 70, pal.haze, 0.26, 'blurBig');
        s += `<path d="${ridgePath(horizon - 10, 40, 2.6, r)}" fill="${mix(pal.sky[1], pal.ink, 0.55)}" opacity="0.85"/>`;
        // wet ground with a mirrored sheen
        s += `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="url(#waterGrad)"/>`;
        for (let i = 0; i < 26; i++) {
            const t = r();
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(horizon + Math.pow(t, 1.4) * (H - horizon) * 0.55)}" rx="${n(rnd(r, 60, 260))}" ry="${n(2 + t * 4)}" fill="${pal.light}" opacity="${(0.04 + r() * 0.07).toFixed(3)}"/>`;
        }
        const shoreY = horizon + (H - horizon) * 0.55;
        s += `<path d="M0,${H} L0,${n(shoreY + 14)} Q${n(W * 0.5)},${n(shoreY - 18)} ${W},${n(shoreY + 10)} L${W},${H} Z" fill="${mix(pal.ink, pal.water, 0.4)}"/>`;
        // puddles catching the sky
        for (let i = 0; i < 9; i++) {
            const t = r();
            const py = shoreY + 30 + t * (H - shoreY) * 0.9;
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(py)}" rx="${n(rnd(r, 70, 240))}" ry="${n(8 + t * 20)}" fill="${pal.haze}" opacity="${(0.08 + r() * 0.1).toFixed(2)}"/>`;
        }
        const px = W * rnd(r, 0.3, 0.72);
        const pgy = shoreY + (H - shoreY) * 0.45;
        const umb = 150;
        s += person(px, pgy, 210, pal.ink);
        s += `<g fill="${pal.ink}"><path d="M${n(px - umb)},${n(pgy - 250)} q${n(umb)},${n(-umb * 0.95)} ${n(umb * 2)},0 Z"/><rect x="${n(px - 4)}" y="${n(pgy - 252)}" width="8" height="120"/></g>`;
        s += `<ellipse cx="${n(px)}" cy="${n(pgy + 8)}" rx="120" ry="16" fill="${pal.ink}" opacity="0.35" filter="url(#blurMed)"/>`;
        // rain streaks, foreground ones heavier
        const tilt = rnd(r, 0.08, 0.2);
        for (let i = 0; i < 420; i++) {
            const x = rnd(r, -100, W + 100);
            const y = rnd(r, -60, H);
            const len = rnd(r, 26, 90);
            const near = r() > 0.82;
            s += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + len * tilt)}" y2="${n(y + len)}" stroke="${pal.light}" stroke-width="${near ? 2.6 : 1.2}" opacity="${(near ? 0.3 : 0.16) + r() * 0.1}"/>`;
        }
        s += broadTree(W * rnd(r, 0.06, 0.2), shoreY + 40, 420, r, pal.ink, 0.92);
        return s;
    },

    // thu, lá, vàng
    autumn(pal, r) {
        const horizon = H * rnd(r, 0.66, 0.74);
        const sunX = W * rnd(r, 0.55, 0.85);
        let s = glow(sunX, horizon - 180, 380, pal.haze, 0.5, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(horizon - 180)}" r="70" fill="${pal.light}" opacity="0.85" filter="url(#blurSm)"/>`;
        s += mistBand(horizon - 40, 80, pal.haze, 0.3, 'blurBig');
        s += `<path d="${ridgePath(horizon - 26, 54, 2.2, r)}" fill="${mix(pal.sky[1], pal.ink, 0.4)}" opacity="0.7"/>`;
        s += `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix(pal.sky[2], pal.ink, 0.6)}"/>`;
        for (let i = 0; i < 30; i++) {
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, horizon + 10, H))}" rx="${n(rnd(r, 40, 170))}" ry="${n(rnd(r, 6, 16))}" fill="${mix(pal.light, pal.ink, 0.45)}" opacity="${(0.1 + r() * 0.14).toFixed(2)}"/>`;
        }
        const tx = W * rnd(r, 0.16, 0.38);
        s += broadTree(tx, horizon + 30, 620, r, mix(pal.ink, pal.sky[1], 0.12));
        // leaves lifting off the canopy and drifting across the frame
        const leafCols = [pal.light, pal.haze, mix(pal.haze, pal.ink, 0.35)];
        for (let i = 0; i < 90; i++) {
            const x = tx + rnd(r, -180, W * 0.72);
            const y = rnd(r, 120, H - 40);
            const sz = rnd(r, 5, 15);
            const rot = rnd(r, 0, 360);
            s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(sz)}" ry="${n(sz * 0.55)}" fill="${pick(r, leafCols)}" opacity="${(0.35 + r() * 0.5).toFixed(2)}" transform="rotate(${n(rot)} ${n(x)} ${n(y)})"/>`;
        }
        return s;
    },

    // trăng, đêm, sao
    moon(pal, r) {
        const horizon = H * rnd(r, 0.58, 0.66);
        const mx = W * rnd(r, 0.2, 0.8);
        const my = horizon - rnd(r, 260, 460);
        const mr = rnd(r, 58, 92);
        let s = '';
        for (let i = 0; i < 180; i++) {
            const x = rnd(r, 0, W), y = rnd(r, 0, horizon - 20);
            s += `<circle cx="${n(x)}" cy="${n(y)}" r="${(0.7 + r() * 1.9).toFixed(2)}" fill="${pal.light}" opacity="${(0.15 + r() * 0.6).toFixed(2)}"/>`;
        }
        s += glow(mx, my, mr * 4.2, pal.light, 0.3, 'blurBig');
        s += `<circle cx="${n(mx)}" cy="${n(my)}" r="${n(mr)}" fill="${pal.light}" opacity="0.96"/>`;
        s += `<circle cx="${n(mx - mr * 0.3)}" cy="${n(my - mr * 0.2)}" r="${n(mr * 0.18)}" fill="${mix(pal.light, pal.ink, 0.12)}" opacity="0.5"/>`;
        s += `<circle cx="${n(mx + mr * 0.25)}" cy="${n(my + mr * 0.3)}" r="${n(mr * 0.12)}" fill="${mix(pal.light, pal.ink, 0.12)}" opacity="0.45"/>`;
        for (let i = 0; i < 4; i++) {
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, my - 80, horizon - 60))}" rx="${n(rnd(r, 200, 420))}" ry="${n(rnd(r, 22, 48))}" fill="${mix(pal.sky[2], pal.light, 0.2)}" opacity="0.22" filter="url(#blurMed)"/>`;
        }
        s += `<path d="${ridgePath(horizon - 4, 70, 2.4, r)}" fill="${mix(pal.sky[1], pal.ink, 0.65)}"/>`;
        s += waterSurface(pal, horizon, r, mx);
        s += broadTree(W * rnd(r, 0.72, 0.92), horizon + (H - horizon) * 0.25, 420, r, pal.ink, 0.95);
        return s;
    },

    // sông, biển, sóng, thuyền, đò, bến
    water(pal, r) {
        const horizon = H * rnd(r, 0.44, 0.52);
        const sunX = W * rnd(r, 0.25, 0.75);
        let s = glow(sunX, horizon - 90, 360, pal.haze, 0.55, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(horizon - 90)}" r="${n(rnd(r, 52, 78))}" fill="${pal.light}" opacity="0.9" filter="url(#blurSm)"/>`;
        for (let i = 0; i < 4; i++) {
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, 90, horizon - 120))}" rx="${n(rnd(r, 240, 460))}" ry="${n(rnd(r, 26, 58))}" fill="${pal.haze}" opacity="0.2" filter="url(#blurMed)"/>`;
        }
        s += mistBand(horizon - 14, 46, pal.haze, 0.35, 'blurBig');
        s += `<path d="${ridgePath(horizon - 6, 44, 2.8, r)}" fill="${mix(pal.sky[1], pal.ink, 0.5)}" opacity="0.75"/>`;
        s += waterSurface(pal, horizon, r, sunX);
        // thuyền
        const bx = W * rnd(r, 0.22, 0.76);
        const by = horizon + (H - horizon) * rnd(r, 0.3, 0.5);
        const bw = rnd(r, 150, 260);
        s += `<g fill="${pal.ink}">
            <path d="M${n(bx - bw / 2)},${n(by)} Q${n(bx)},${n(by + bw * 0.22)} ${n(bx + bw / 2)},${n(by)} Q${n(bx)},${n(by + bw * 0.06)} ${n(bx - bw / 2)},${n(by)} Z"/>
            <rect x="${n(bx + bw * 0.1)}" y="${n(by - bw * 0.62)}" width="${n(bw * 0.022)}" height="${n(bw * 0.62)}"/>
            <path d="M${n(bx + bw * 0.12)},${n(by - bw * 0.6)} Q${n(bx + bw * 0.42)},${n(by - bw * 0.28)} ${n(bx + bw * 0.12)},${n(by - bw * 0.04)} Z"/>
        </g>`;
        s += person(bx - bw * 0.2, by - 2, bw * 0.3, pal.ink);
        s += `<ellipse cx="${n(bx)}" cy="${n(by + 16)}" rx="${n(bw * 0.5)}" ry="${n(10)}" fill="${pal.ink}" opacity="0.28" filter="url(#blurSm)"/>`;
        s += birds(r, 5, W * rnd(r, 0.15, 0.8), horizon - 260, 220, mix(pal.ink, pal.sky[1], 0.3), 0.75);
        return s;
    },

    // núi, sương, mây, đèo
    mountains(pal, r) {
        const horizon = H * rnd(r, 0.72, 0.8);
        const sunX = W * rnd(r, 0.2, 0.8);
        const sunY = H * rnd(r, 0.24, 0.36);
        let s = glow(sunX, sunY, 400, pal.haze, 0.5, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(rnd(r, 48, 74))}" fill="${pal.light}" opacity="0.9" filter="url(#blurSm)"/>`;
        // ridge layers, each lighter-to-darker with a mist band tucked at its base
        const layers = 5;
        for (let i = 0; i < layers; i++) {
            const t = i / (layers - 1);
            const baseY = H * (0.44 + t * 0.36);
            const amp = 170 - t * 90;
            s += `<path d="${ridgePath(baseY, amp, 1.6 + t * 1.6, r)}" fill="${mix(pal.sky[1], pal.ink, 0.25 + t * 0.6)}"/>`;
            s += mistBand(baseY + 26, 42 - t * 8, pal.haze, 0.34 - t * 0.04, 'blurBig');
        }
        s += broadTree(W * rnd(r, 0.06, 0.2), H * 0.98, 520, r, pal.ink);
        s += birds(r, 7, W * rnd(r, 0.4, 0.75), H * 0.3, 230, mix(pal.ink, pal.sky[1], 0.35), 0.9);
        return s;
    },

    // đường, ngõ, bước, lối, về
    road(pal, r) {
        const horizon = H * rnd(r, 0.52, 0.58);
        const vp = W * rnd(r, 0.4, 0.6);
        const sunX = vp + rnd(r, -120, 120);
        let s = glow(sunX, horizon - 70, 340, pal.haze, 0.55, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(horizon - 70)}" r="${n(rnd(r, 48, 70))}" fill="${pal.light}" opacity="0.9" filter="url(#blurSm)"/>`;
        s += mistBand(horizon - 20, 60, pal.haze, 0.34, 'blurBig');
        s += `<path d="${ridgePath(horizon - 8, 40, 2.4, r)}" fill="${mix(pal.sky[1], pal.ink, 0.45)}" opacity="0.75"/>`;
        s += `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix(pal.sky[2], pal.ink, 0.62)}"/>`;
        const halfTop = 34, halfBottom = W * 0.42;
        s += `<path d="M${n(vp - halfTop)},${n(horizon)} L${n(vp + halfTop)},${n(horizon)} L${n(vp + halfBottom)},${H} L${n(vp - halfBottom)},${H} Z" fill="${mix(pal.sky[2], pal.ink, 0.32)}" opacity="0.85"/>`;
        for (let i = 0; i < 9; i++) {
            const t = Math.pow(i / 9, 1.7);
            const y = horizon + t * (H - horizon);
            const hw = halfTop + t * (halfBottom - halfTop);
            s += `<rect x="${n(vp - hw * 0.045)}" y="${n(y)}" width="${n(hw * 0.09)}" height="${n(12 + t * 46)}" fill="${pal.light}" opacity="0.16"/>`;
        }
        // trees lining both sides, scaled by distance
        for (let i = 0; i < 7; i++) {
            const t = Math.pow((i + 1) / 7, 1.5);
            const y = horizon + t * (H - horizon) * 0.92;
            const hw = halfTop + t * (halfBottom - halfTop);
            const h = 90 + t * 620;
            s += broadTree(vp - hw - h * 0.1, y, h, r, pal.ink, 0.95);
            s += broadTree(vp + hw + h * 0.1, y - rnd(r, 0, 30), h * rnd(r, 0.85, 1.1), r, pal.ink, 0.95);
        }
        s += person(vp + rnd(r, -40, 40), horizon + (H - horizon) * 0.3, 150, mix(pal.ink, pal.sky[1], 0.25));
        return s;
    },

    // hoa, vườn, cây, xuân
    garden(pal, r) {
        const horizon = H * rnd(r, 0.7, 0.78);
        const sunX = W * rnd(r, 0.3, 0.7);
        let s = glow(sunX, horizon - 260, 460, pal.haze, 0.5, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(horizon - 260)}" r="64" fill="${pal.light}" opacity="0.85" filter="url(#blurSm)"/>`;
        s += mistBand(horizon - 30, 70, pal.haze, 0.3, 'blurBig');
        s += `<path d="${ridgePath(horizon - 10, 40, 2.4, r)}" fill="${mix(pal.sky[1], pal.ink, 0.4)}" opacity="0.6"/>`;
        s += `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix(pal.sky[2], pal.ink, 0.55)}"/>`;
        // bokeh — sunlight through leaves
        for (let i = 0; i < 14; i++) {
            s += `<circle cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, 60, horizon))}" r="${n(rnd(r, 16, 60))}" fill="${pal.light}" opacity="${(0.05 + r() * 0.1).toFixed(2)}" filter="url(#blurSm)"/>`;
        }
        // cành hoa từ mép trên
        const petal = pick(r, [mix(pal.light, '#ff9ec2', 0.45), mix(pal.haze, '#ffb3c9', 0.35), mix(pal.light, '#ffd27a', 0.4)]);
        const startX = r() > 0.5 ? -40 : W + 40;
        const dir = startX < 0 ? 1 : -1;
        for (let b = 0; b < 3; b++) {
            const y0 = rnd(r, 40, 260);
            const len = rnd(r, W * 0.5, W * 0.85);
            const sag = rnd(r, 120, 300);
            const d = `M${n(startX)},${n(y0)} Q${n(startX + dir * len * 0.5)},${n(y0 + sag)} ${n(startX + dir * len)},${n(y0 + sag * 0.6)}`;
            s += `<path d="${d}" stroke="${mix(pal.ink, pal.sky[0], 0.1)}" stroke-width="${n(rnd(r, 12, 20))}" fill="none" stroke-linecap="round"/>`;
            // twigs off the main branch, then blossoms clustered on them
            for (let k = 0; k < 7; k++) {
                const t = 0.12 + r() * 0.8;
                const bx0 = startX + dir * len * t;
                const by0 = y0 + sag * (2 * t * (1 - t));
                const tl = rnd(r, 60, 170);
                const ang = rnd(r, 0.4, 1.5);
                s += `<path d="M${n(bx0)},${n(by0)} q${n(dir * tl * 0.4)},${n(Math.sin(ang) * tl * 0.5)} ${n(dir * tl)},${n(Math.sin(ang) * tl)}" stroke="${mix(pal.ink, pal.sky[0], 0.1)}" stroke-width="${n(rnd(r, 4, 8))}" fill="none" stroke-linecap="round"/>`;
            }
            for (let i = 0; i < 16; i++) {
                const t = r();
                const x = startX + dir * len * t;
                const y = y0 + sag * (2 * t * (1 - t)) + rnd(r, -60, 80);
                const rr = rnd(r, 16, 34);
                // 5 petals around a small centre
                for (let k = 0; k < 5; k++) {
                    const a = (k / 5) * Math.PI * 2 + r();
                    s += `<ellipse cx="${n(x + Math.cos(a) * rr * 0.62)}" cy="${n(y + Math.sin(a) * rr * 0.62)}" rx="${n(rr * 0.5)}" ry="${n(rr * 0.42)}" fill="${petal}" opacity="${(0.62 + r() * 0.3).toFixed(2)}"/>`;
                }
                s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr * 0.2)}" fill="${mix(petal, pal.ink, 0.35)}" opacity="0.75"/>`;
            }
        }
        // petals drifting down + grass at the bottom edge
        for (let i = 0; i < 40; i++) {
            const x = rnd(r, 0, W), y = rnd(r, 200, H);
            const sz = rnd(r, 4, 11);
            s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(sz)}" ry="${n(sz * 0.6)}" fill="${petal}" opacity="${(0.25 + r() * 0.4).toFixed(2)}" transform="rotate(${n(rnd(r, 0, 360))} ${n(x)} ${n(y)})"/>`;
        }
        s += grassRow(r, pal.ink, H + 10, 150, 90);
        return s;
    },

    // gió, nắng, hè, đồng
    field(pal, r) {
        const horizon = H * rnd(r, 0.6, 0.68);
        const sunX = W * rnd(r, 0.15, 0.85);
        let s = glow(sunX, horizon - 210, 420, pal.haze, 0.5, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(horizon - 210)}" r="${n(rnd(r, 52, 78))}" fill="${pal.light}" opacity="0.9" filter="url(#blurSm)"/>`;
        for (let i = 0; i < 5; i++) {
            s += `<ellipse cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, 100, horizon - 180))}" rx="${n(rnd(r, 200, 420))}" ry="${n(rnd(r, 30, 70))}" fill="${pal.light}" opacity="${(0.1 + r() * 0.12).toFixed(2)}" filter="url(#blurMed)"/>`;
        }
        s += mistBand(horizon - 16, 54, pal.haze, 0.3, 'blurBig');
        s += `<path d="${ridgePath(horizon - 6, 36, 2.6, r)}" fill="${mix(pal.sky[1], pal.ink, 0.45)}" opacity="0.7"/>`;
        s += `<rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${mix(pal.sky[2], pal.ink, 0.5)}"/>`;
        s += broadTree(W * rnd(r, 0.62, 0.86), horizon + (H - horizon) * 0.18, 400, r, pal.ink);
        // wind combing the grass — all strokes lean the same way
        const lean = rnd(r, 0.18, 0.42);
        for (let band = 0; band < 3; band++) {
            const y = horizon + (H - horizon) * (0.35 + band * 0.3);
            s += grassRow(r, mix(pal.ink, pal.sky[1], 0.25 - band * 0.1), y + 120, 90 + band * 90, 70 + band * 30, lean);
        }
        for (let i = 0; i < 22; i++) {
            const x = rnd(r, 0, W), y = rnd(r, horizon - 120, H - 200);
            s += `<path d="M${n(x)},${n(y)} q${n(rnd(r, 40, 120))},${n(rnd(r, -30, 30))} ${n(rnd(r, 90, 220))},${n(rnd(r, -20, 20))}" stroke="${pal.light}" stroke-width="2" fill="none" opacity="${(0.06 + r() * 0.1).toFixed(2)}"/>`;
        }
        return s;
    },

    // em, anh, yêu, nhớ, xa, chia ly
    figures(pal, r) {
        const horizon = H * rnd(r, 0.55, 0.62);
        const sunX = W * rnd(r, 0.3, 0.7);
        let s = glow(sunX, horizon - 120, 380, pal.haze, 0.55, 'blurBig');
        s += `<circle cx="${n(sunX)}" cy="${n(horizon - 120)}" r="${n(rnd(r, 60, 90))}" fill="${pal.light}" opacity="0.9" filter="url(#blurSm)"/>`;
        s += mistBand(horizon - 16, 56, pal.haze, 0.34, 'blurBig');
        s += `<path d="${ridgePath(horizon - 6, 48, 2.2, r)}" fill="${mix(pal.sky[1], pal.ink, 0.5)}" opacity="0.8"/>`;
        s += waterSurface(pal, horizon, r, sunX);
        const gy = horizon + (H - horizon) * rnd(r, 0.62, 0.78);
        const solo = r() > 0.55;
        const gap = solo ? 0 : rnd(r, 260, 620);
        const cx = W * rnd(r, 0.35, 0.65);
        const h1 = rnd(r, 300, 360);
        // wet sand foreground first, then the figures standing on it
        s += `<path d="M0,${H} L0,${n(gy + 10)} Q${n(W * 0.5)},${n(gy - 16)} ${W},${n(gy + 6)} L${W},${H} Z" fill="${mix(pal.ink, pal.water, 0.35)}" opacity="0.92"/>`;
        s += `<ellipse cx="${n(cx - gap / 2)}" cy="${n(gy + 6)}" rx="${n(h1 * 0.16)}" ry="${n(h1 * 0.03)}" fill="#000" opacity="0.3" filter="url(#blurSm)"/>`;
        if (!solo) s += `<ellipse cx="${n(cx + gap / 2)}" cy="${n(gy + 6)}" rx="${n(h1 * 0.15)}" ry="${n(h1 * 0.03)}" fill="#000" opacity="0.3" filter="url(#blurSm)"/>`;
        s += person(cx - gap / 2, gy, h1, pal.ink, 1);
        if (!solo) s += person(cx + gap / 2, gy, h1 * rnd(r, 0.9, 1.0), pal.ink, -1);
        if (solo) {
            // a lone figure needs something to weigh the frame — a bank and a tree
            s += broadTree(W * rnd(r, 0.72, 0.94), gy + 40, rnd(r, 380, 520), r, pal.ink, 0.95);
            s += grassRow(r, pal.ink, H + 10, 120, 60, 0.24);
        }
        s += birds(r, 4, W * rnd(r, 0.2, 0.8), horizon - 280, 200, mix(pal.ink, pal.sky[1], 0.3), 0.7);
        return s;
    },

    // chén, rượu, đèn, lửa, hội — đèn hoa đăng trên sông đêm
    lantern(pal, r) {
        const horizon = H * rnd(r, 0.42, 0.5);
        let s = '';
        for (let i = 0; i < 140; i++) {
            s += `<circle cx="${n(rnd(r, 0, W))}" cy="${n(rnd(r, 0, horizon - 30))}" r="${(0.6 + r() * 1.7).toFixed(2)}" fill="${pal.light}" opacity="${(0.12 + r() * 0.5).toFixed(2)}"/>`;
        }
        s += `<path d="${ridgePath(horizon - 4, 60, 2.2, r)}" fill="${mix(pal.sky[1], pal.ink, 0.7)}"/>`;
        s += waterSurface(pal, horizon, r, W * 0.5, { light: '#ffcf8a' });
        const warm = '#ffb968';
        const count = 16;
        for (let i = 0; i < count; i++) {
            const t = r();
            const x = rnd(r, 40, W - 40);
            const y = horizon + Math.pow(t, 1.5) * (H - horizon) * 0.95;
            const sz = 10 + t * 34;
            s += glow(x, y, sz * 2.4, warm, 0.22, 'blurMed');
            // hoa đăng: paper dome on a small float, plus its streak on the water
            s += `<path d="M${n(x - sz * 0.8)},${n(y + sz * 0.25)} Q${n(x - sz * 0.7)},${n(y - sz * 0.95)} ${n(x)},${n(y - sz)} Q${n(x + sz * 0.7)},${n(y - sz * 0.95)} ${n(x + sz * 0.8)},${n(y + sz * 0.25)} Z" fill="${warm}" opacity="0.92"/>`;
            s += `<ellipse cx="${n(x)}" cy="${n(y + sz * 0.26)}" rx="${n(sz * 0.86)}" ry="${n(sz * 0.16)}" fill="${mix(warm, '#ffffff', 0.45)}" opacity="0.9"/>`;
            s += `<ellipse cx="${n(x)}" cy="${n(y - sz * 0.35)}" rx="${n(sz * 0.32)}" ry="${n(sz * 0.4)}" fill="${mix(warm, '#ffffff', 0.6)}" opacity="0.85" filter="url(#blurSm)"/>`;
            s += `<ellipse cx="${n(x)}" cy="${n(y + sz * 0.95)}" rx="${n(sz * 0.5)}" ry="${n(sz * 1.1)}" fill="${warm}" opacity="0.26" filter="url(#blurSm)"/>`;
        }
        // bờ tối phía trước
        s += `<path d="M0,${H} L0,${n(H - 150)} Q${n(W * 0.4)},${n(H - 230)} ${W},${n(H - 120)} L${W},${H} Z" fill="${pal.ink}"/>`;
        s += broadTree(W * rnd(r, 0.75, 0.92), H - 130, 460, r, pal.ink);
        return s;
    },
};

// Shared grass helper (used by garden + field).
function grassRow(r, color, baseY, height, count, lean = 0.22) {
    let s = `<g stroke="${color}" fill="none" stroke-linecap="round">`;
    for (let i = 0; i < count; i++) {
        const x = rnd(r, -40, W + 40);
        const h = height * rnd(r, 0.5, 1.3);
        const dx = h * lean * rnd(r, 0.6, 1.4);
        s += `<path d="M${n(x)},${n(baseY)} q${n(dx * 0.3)},${n(-h * 0.6)} ${n(dx)},${n(-h)}" stroke-width="${n(Math.max(2, h * 0.035))}"/>`;
    }
    return s + '</g>';
}

/* ------------------------------------------------------- theme classifier   */
// First matching rule wins, so the more specific motifs are listed first.
const RULES = [
    { scene: 'rain', pals: ['monsoonGray', 'mistTeal', 'duskViolet'], kw: ['mua roi', 'mua bay', 'con mua', 'mua ', ' mua', 'giot mua', 'uot'] },
    { scene: 'lantern', pals: ['nightIndigo', 'duskViolet'], kw: ['chen ', 'ruou', 'say ', 'den long', 'hoa dang', 'lua ', 'bep lua'] },
    { scene: 'moon', pals: ['nightIndigo', 'duskViolet', 'mistTeal'], kw: ['trang', 'dem ', ' dem', 'sao troi', 'khuya', 'nguyet'] },
    { scene: 'water', pals: ['dawnWarm', 'sunsetAmber', 'mistTeal', 'daySoft'], kw: ['song ', 'bien', 'con song', 'thuyen', 'do ngang', 'ben ', 'do  ', 'sang ngang', 'dong song', 'nuoc ', 'do xua', 'ben vang'] },
    { scene: 'mountains', pals: ['mistTeal', 'daySoft', 'dawnWarm', 'monsoonGray'], kw: ['nui', 'suong', 'may ', 'deo ', 'doi ', 'troi cao', 'non ', 'song nui', 'nuoc non'] },
    { scene: 'autumn', pals: ['autumnGold', 'sunsetAmber', 'dawnWarm'], kw: ['mua thu', 'thu roi', ' thu', 'la vang', 'chiec la', 'la roi', 'heo hat'] },
    { scene: 'village', pals: ['sunsetAmber', 'greenQue', 'dawnWarm', 'autumnGold'], kw: ['me ', ' me', 'cha ', 'que ', 'bep', 'ganh', 'lung coi', 'lang ', 'ruong', 'lua ', 'con co', 'khai hoan', 'giac tau', 'do ho', 'nha ', 'con cieu', 'ba ba'] },
    { scene: 'garden', pals: ['daySoft', 'greenQue', 'dawnWarm'], kw: ['hoa ', 'vuon', 'canh hoa', 'huong hoa', 'cay la', 'xuan', 'binh yen', 'nhanh hoa'] },
    { scene: 'road', pals: ['sunsetAmber', 'dawnWarm', 'duskViolet', 'autumnGold'], kw: ['con duong', 'duong ', 'ngo nho', 'loi ve', 'buoc ', 'lo buoc', 'di giua', 'tro lai'] },
    { scene: 'field', weight: 0.75, pals: ['daySoft', 'greenQue', 'sunsetAmber'], kw: ['gio ', 'nang', 'he ', 'canh dong', 'lung lo', 'thoi gian'] },
    { scene: 'figures', weight: 0.4, pals: ['duskViolet', 'dawnWarm', 'mistTeal', 'sunsetAmber'], kw: ['em ', 'anh ', 'yeu', 'nho ', 'xa la', 'chia ly', 'ky niem', 'con tim', 'tinh '] },
];

function classify(poem) {
    const title = plain(poem.title || '');
    const body = plain((poem.content_text || '').slice(0, 900));
    const hay = ' ' + title + ' | ' + title + ' | ' + body + ' ';
    let best = null;
    for (const rule of RULES) {
        let score = 0;
        for (const k of rule.kw) {
            // the title is what the card shows, so a motif named there outweighs the body
            if (title.includes(k)) score += 3;
            if (hay.includes(k)) score += 1;
        }
        score *= rule.weight != null ? rule.weight : 1;
        if (score && (!best || score > best.score)) best = { rule, score };
    }
    return best ? best.rule : RULES[RULES.length - 1];
}

/* ---------------------------------------------------------------- render    */

function buildSvg(poem) {
    const r = seeded(poem.id * 2654435761);
    const rule = classify(poem);
    const pal = PALETTES[pick(r, rule.pals)];
    const body = SCENES[rule.scene](pal, r);

    const defs = [
        linGrad('sky', [
            [0, pal.sky[0]],
            [0.52, pal.sky[1]],
            [1, pal.sky[2]],
        ]),
        linGrad('fieldGrad', [
            [0, mix(pal.sky[2], pal.ink, 0.42)],
            [0.45, mix(pal.sky[2], pal.ink, 0.58)],
            [1, mix(pal.ink, pal.sky[1], 0.18)],
        ]),
        linGrad('waterGrad', [
            [0, mix(pal.sky[2], pal.water, 0.35)],
            [0.35, pal.water],
            [1, mix(pal.water, pal.ink, 0.75)],
        ]),
        radGrad('vig', [
            [0.5, '#000', 0],
            [0.82, '#000', 0.14],
            [1, '#000', 0.4],
        ]),
        blurFilter('blurSm', 14),
        blurFilter('blurMed', 38),
        blurFilter('blurBig', 90),
        // desaturated film grain — keeps the flat vector fills from looking plastic
        `<filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
        </filter>`,
    ].join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${body}
<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.07"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
}

async function render(poem, outDir) {
    const svg = buildSvg(poem);
    const out = path.join(outDir, `poem_${poem.id}_img_0.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: QUALITY }).toFile(out);
    return out;
}

/* ---------------------------------------------------------------- cli       */

function parseIds(argv) {
    const ids = new Set();
    for (const a of argv) {
        const m = /^(\d+)-(\d+)$/.exec(a);
        if (m) {
            for (let i = +m[1]; i <= +m[2]; i++) ids.add(i);
        } else if (/^\d+$/.test(a)) {
            ids.add(+a);
        } else if (a.includes(',')) {
            a.split(',').forEach((x) => /^\d+$/.test(x.trim()) && ids.add(+x.trim()));
        }
    }
    return [...ids];
}

async function run() {
    const argv = process.argv.slice(2);
    const outIdx = argv.indexOf('--out');
    if (outIdx >= 0 && !argv[outIdx + 1]) {
        console.error('--out requires a directory argument');
        process.exit(1);
    }
    const outDir = outIdx >= 0 ? argv[outIdx + 1] : DIR;
    const args = argv.filter((a, i) => a !== '--sample' && i !== outIdx && (outIdx < 0 || i !== outIdx + 1));
    const ids = parseIds(args);
    if (!ids.length) {
        console.log('Usage: node gen_poem_art.js <id|id-id|id,id> [--out DIR]');
        process.exit(1);
    }
    const poems = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    const byId = new Map(poems.map((p) => [p.id, p]));
    fs.mkdirSync(outDir, { recursive: true });

    let made = 0;
    for (const id of ids.sort((a, b) => a - b)) {
        const poem = byId.get(id);
        if (!poem) {
            console.log(`  SKIP ${id}: not in ${DATA}`);
            continue;
        }
        const rule = classify(poem);
        const out = await render(poem, outDir);
        const size = (fs.statSync(out).size / 1024).toFixed(0);
        console.log(`  ${id}  ${rule.scene.padEnd(10)} ${size.padStart(4)}KB  ${poem.title}`);
        made++;
    }
    console.log(`${made} illustrations written to ${outDir}/ (${W}x${H}, q${QUALITY}).`);
    if (outDir === DIR) console.log('Next: node gen_thumbnails.js  (card grid reads .thumb.webp)');
}

run();
