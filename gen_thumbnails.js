// Generate small thumbnail WebPs for the card grid. The home/list view shows many
// cards at once but each image renders small, so serving the full 1600px art there
// wastes bandwidth. Cards load poem_X.thumb.webp (~THUMB_WIDTH px); the reader/detail
// view and lightbox keep loading the full-size image. app.js derives the thumb path
// from the full path (.webp -> .thumb.webp), so no data changes are needed.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = 'images';
const THUMB_WIDTH = 480;   // covers card display size on retina (cards render ~340-660px CSS)
const QUALITY = 72;        // thumbnails tolerate a bit more compression than the full art

async function run() {
    const files = fs.readdirSync(DIR)
        .filter((n) => n.toLowerCase().endsWith('.webp') && !n.toLowerCase().endsWith('.thumb.webp'));
    let made = 0, skipped = 0, before = 0, after = 0;

    for (const name of files) {
        const src = path.join(DIR, name);
        const out = path.join(DIR, name.slice(0, -'.webp'.length) + '.thumb.webp');
        const stat = fs.statSync(src);
        try {
            // Always emit a thumb so the card can unconditionally use .thumb.webp.
            // withoutEnlargement means small sources aren't upscaled — just re-encoded.
            const buf = await sharp(src, { failOn: 'none' })
                .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
                .webp({ quality: QUALITY })
                .toBuffer();
            fs.writeFileSync(out, buf);
            before += stat.size;
            after += buf.length;
            made++;
        } catch (e) {
            skipped++;
            console.log(`  SKIP ${name}: ${e.message}`);
        }
    }

    console.log(`${made} thumbnails made, ${skipped} skipped (small/error).`);
    if (before) console.log(`Full->thumb for those: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB`);
}

run();
