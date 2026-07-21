// One-time converter: jpg/jpeg/png in images/ -> webp, then rewrite image paths
// in poems_data.json to match. WebP at QUALITY is visually near-lossless for these
// illustrations while ~25-35% smaller than JPEG, so pages paint faster without a
// visible quality drop. GIF is left as-is (animation); existing .webp untouched.
//
// Originals are git-tracked, so after verifying the result you can delete them:
//   node convert_to_webp.js --delete-originals
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = 'images';
const DATA = 'poems_data.json';
const MAX_EDGE = 1600;   // retina reader/lightbox never needs more
const QUALITY = 82;      // near-lossless for these illustrations
const CONVERT_EXT = new Set(['.jpg', '.jpeg', '.png']);
const deleteOriginals = process.argv.includes('--delete-originals');

async function convert() {
    const files = fs.readdirSync(DIR);
    let before = 0, after = 0, made = 0, skipped = 0;
    const originals = [];

    for (const name of files) {
        const ext = path.extname(name).toLowerCase();
        if (!CONVERT_EXT.has(ext)) continue;

        const src = path.join(DIR, name);
        const stat = fs.statSync(src);
        if (!stat.isFile()) continue;

        const outName = name.slice(0, -ext.length) + '.webp';
        const out = path.join(DIR, outName);
        before += stat.size;

        try {
            let img = sharp(src, { failOn: 'none' }).rotate(); // bake EXIF orientation
            const meta = await img.metadata();
            if (Math.max(meta.width || 0, meta.height || 0) > MAX_EDGE) {
                img = img.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });
            }
            const buf = await img.webp({ quality: QUALITY }).toBuffer();
            fs.writeFileSync(out, buf);
            after += buf.length;
            made++;
            originals.push(src);
            console.log(`  ${name} -> ${outName}: ${(stat.size / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB`);
        } catch (e) {
            after += stat.size;
            skipped++;
            console.log(`  SKIP ${name}: ${e.message}`);
        }
    }

    console.log(`\n${made} converted, ${skipped} skipped.`);
    if (before) {
        console.log(`Converted bytes: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB` +
            ` (${(100 * (before - after) / before).toFixed(0)}% smaller)`);
    }
    return originals;
}

function rewriteData() {
    let raw = fs.readFileSync(DATA, 'utf8');
    // Only touch paths under images/ ending in the converted extensions.
    const rewritten = raw.replace(/(images\/[^"\\]+?)\.(jpg|jpeg|png)/gi, '$1.webp');
    if (rewritten !== raw) {
        fs.writeFileSync(DATA, rewritten);
        const n = (raw.match(/images\/[^"\\]+?\.(jpg|jpeg|png)/gi) || []).length;
        console.log(`Rewrote ${n} image path(s) in ${DATA} to .webp`);
    } else {
        console.log(`No .jpg/.jpeg/.png image paths found in ${DATA}`);
    }
}

async function run() {
    const originals = await convert();
    rewriteData();
    if (deleteOriginals) {
        originals.forEach((f) => fs.unlinkSync(f));
        console.log(`Deleted ${originals.length} original file(s).`);
    } else {
        console.log('\nOriginals kept. Verify pages, then run with --delete-originals to remove them.');
    }
}

run();
