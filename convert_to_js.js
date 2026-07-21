const fs = require('fs');

try {
    const raw = fs.readFileSync('poems_data.json', 'utf8');
    const poems = JSON.parse(raw);
    // Emit as a JSON string fed to JSON.parse: V8 parses a JSON string ~2x faster than
    // the equivalent JS object literal, and it stays the exact same sync global (no app.js change).
    const jsonStr = JSON.stringify(poems);
    const jsContent = `// Auto-generated poem database
window.POEMS_DATA = JSON.parse(${JSON.stringify(jsonStr)});
`;
    fs.writeFileSync('poems.js', jsContent);
    console.log('Successfully created poems.js with', poems.length, 'poems!');
} catch (e) {
    console.error('Error creating poems.js:', e.message);
}

