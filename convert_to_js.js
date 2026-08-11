const fs = require('fs');

// Only the fields index.html/app.js actually read. content_html duplicates
// content_text as markup nothing renders, and featured_image/all_images/
// inline_images/slug are pipeline-only — together ~47% of the payload the
// browser downloads, parses and keeps in memory. poems_data.json stays the
// full source of truth for the image/art scripts.
const RUNTIME_FIELDS = ['id', 'title', 'date', 'date_formatted', 'genre', 'content_text', 'local_images'];

function buildPoemsJs(poems, outFile = 'poems.js') {
    const slim = poems.map((p) => {
        const out = {};
        for (const k of RUNTIME_FIELDS) {
            if (p[k] !== undefined) out[k] = p[k];
        }
        return out;
    });
    // Emit as a JSON string fed to JSON.parse: V8 parses a JSON string ~2x faster than
    // the equivalent JS object literal, and it stays the exact same sync global (no app.js change).
    const jsonStr = JSON.stringify(slim);
    fs.writeFileSync(outFile, `// Auto-generated poem database\nwindow.POEMS_DATA = JSON.parse(${JSON.stringify(jsonStr)});\n`);
}

module.exports = { buildPoemsJs, RUNTIME_FIELDS };

if (require.main === module) {
    try {
        const poems = JSON.parse(fs.readFileSync('poems_data.json', 'utf8'));
        buildPoemsJs(poems);
        console.log('Successfully created poems.js with', poems.length, 'poems!');
    } catch (e) {
        console.error('Error creating poems.js:', e.message);
    }
}
