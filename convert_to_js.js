const fs = require('fs');

try {
    const raw = fs.readFileSync('poems_data.json', 'utf8');
    const poems = JSON.parse(raw);
    const jsContent = `// Auto-generated poem database
window.POEMS_DATA = ${JSON.stringify(poems, null, 2)};
`;
    fs.writeFileSync('poems.js', jsContent);
    console.log('Successfully created poems.js with', poems.length, 'poems!');
} catch (e) {
    console.error('Error creating poems.js:', e.message);
}

