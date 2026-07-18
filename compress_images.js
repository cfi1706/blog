// One-time image compressor for images/.
// Keeps filename + format (poems.js references exact paths), strips metadata,
// downscales only images whose long edge exceeds MAX_EDGE, re-encodes at
// QUALITY, and overwrites ONLY when the result is smaller. Small files are
// left untouched so their quality is never degraded.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = 'images';
const MAX_EDGE = 1600;       // px; retina reader/lightbox never needs more here
const QUALITY = 82;          // visually near-lossless for these illustrations
const MIN_BYTES = 120 * 1024; // skip files already this small

async function run() {
    const files = fs.readdirSync(DIR);
    let before = 0, after = 0, changed = 0, skipped = 0;

    for (const name of files) {
        const fp = path.join(DIR, name);
        const stat = fs.statSync(fp);
        if (!stat.isFile()) continue;
        before += stat.size;

        const ext = path.extname(name).toLowerCase();
        if (ext === '.gif' || stat.size < MIN_BYTES) { after += stat.size; skipped++; continue; }

        try {
            let img = sharp(fp, { failOn: 'none' }).rotate(); // rotate() bakes EXIF orientation
            const meta = await img.metadata();
            if (Math.max(meta.width || 0, meta.height || 0) > MAX_EDGE) {
                img = img.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });
            }

            if (ext === '.png') {
                img = img.png({ quality: QUALITY, compressionLevel: 9, palette: true });
            } else if (ext === '.webp') {
                img = img.webp({ quality: QUALITY });
            } else { // .jpg .jpeg
                img = img.jpeg({ quality: QUALITY, mozjpeg: true });
            }

            const buf = await img.toBuffer();
            if (buf.length < stat.size) {
                fs.writeFileSync(fp, buf);
                after += buf.length;
                changed++;
                console.log(`  ${name}: ${(stat.size/1024).toFixed(0)}KB -> ${(buf.length/1024).toFixed(0)}KB`);
            } else {
                after += stat.size;
                skipped++;
            }
        } catch (e) {
            after += stat.size;
            console.log(`  SKIP ${name}: ${e.message}`);
        }
    }

    console.log(`\nDone. ${changed} recompressed, ${skipped} left as-is.`);
    console.log(`Total: ${(before/1024/1024).toFixed(1)}MB -> ${(after/1024/1024).toFixed(1)}MB` +
        ` (${(100*(before-after)/before).toFixed(0)}% smaller)`);
}

run();
