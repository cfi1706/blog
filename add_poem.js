const fs = require('fs');
const path = require('path');

// Helper script to add new poems directly into poems_data.json and update poems.js
// Usage: node add_poem.js "Tên Bài Thơ" "Nội dung bài thơ (mỗi câu một dòng)" "images/xxx.webp"
//
// IMAGES: always pass a WebP path (never jpg/png). After placing the source in images/,
// run `node convert_to_webp.js` then `node gen_thumbnails.js` so both the full .webp and
// its .thumb.webp exist (cards use the thumb, the reader uses the full). See CLAUDE.md.

function classifyPoem(contentText) {
    if (!contentText) return 'Tự do';
    const lines = contentText.split('\n')
        .map(line => line.trim().replace(/[\u200B-\u200D\uFEFF]/g, ''))
        .filter(line => line.length > 0);
    if (lines.length === 0) return 'Tự do';
    const wordCounts = lines.map(line => {
        return line.split(/\s+/).filter(word => word.length > 0).length;
    });
    const totalLines = wordCounts.length;

    // 1. Check for Lục Bát: 6-8 alternating
    let scoreA = 0;
    let scoreB = 0;
    for (let i = 0; i < totalLines; i++) {
        const count = wordCounts[i];
        if (count === (i % 2 === 0 ? 6 : 8)) scoreA++;
        if (count === (i % 2 === 0 ? 8 : 6)) scoreB++;
    }
    const ratioA = scoreA / totalLines;
    const ratioB = scoreB / totalLines;
    if (ratioA >= 0.7 || ratioB >= 0.7) return 'Lục bát';

    // 2. Check for Song Thất Lục Bát
    let scoreSTL = 0;
    const stlPattern = [7, 7, 6, 8];
    for (let i = 0; i < totalLines; i++) {
        if (wordCounts[i] === stlPattern[i % 4]) scoreSTL++;
    }
    if (scoreSTL / totalLines >= 0.7) return 'Song thất lục bát';

    // 3. Check for Thất Ngôn
    const sevenWordLines = wordCounts.filter(c => c === 7).length;
    const isMostlySeven = (sevenWordLines / totalLines) >= 0.8;
    if (isMostlySeven) {
        if (totalLines === 8) return 'Thất ngôn bát cú';
        if (totalLines === 4) return 'Thất ngôn tứ tuyệt';
        return 'Thất ngôn';
    }

    // 4. Check for Ngũ Ngôn
    const fiveWordLines = wordCounts.filter(c => c === 5).length;
    if ((fiveWordLines / totalLines) >= 0.8) return 'Ngũ ngôn';

    return 'Tự do';
}

function addPoem(title, contentText, imageUrl = '') {
    if (!contentText || !contentText.trim()) {
        console.error('Lỗi: Nội dung bài thơ không được để trống.');
        return;
    }

    const poems = JSON.parse(fs.readFileSync('poems_data.json', 'utf8'));

    // Generate clean text and html
    const cleanText = contentText.replace(/\r/g, '').trim();
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    // Auto title if not provided
    const finalTitle = (title && title.trim()) ? title.trim() : (lines[0] || 'Vô Đề').replace(/[,;.:!?]+$/, '');

    // Format HTML paragraphs
    const paragraphs = cleanText.split(/\n\s*\n/).map(para => {
        const paraLines = para.split('\n').map(l => l.trim()).join('<br>');
        return `<p class="wp-block-paragraph">${paraLines}</p>`;
    }).join('\n');

    // Generate new unique ID
    const maxId = poems.reduce((max, p) => Math.max(max, p.id || 0), 0);
    const newId = maxId + 1;

    const now = new Date();
    const formattedDate = `${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;

    const newPoem = {
        id: newId,
        slug: `bai-tho-${newId}`,
        title: finalTitle,
        date: now.toISOString(),
        date_formatted: formattedDate,
        genre: classifyPoem(cleanText),
        content_html: `\n${paragraphs}\n`,
        content_text: cleanText,
        featured_image: imageUrl || '',
        inline_images: [],
        all_images: imageUrl ? [imageUrl] : [],
        local_images: imageUrl ? [imageUrl] : []
    };

    poems.unshift(newPoem); // Add to top of list as newest poem

    fs.writeFileSync('poems_data.json', JSON.stringify(poems, null, 2));

    // Update poems.js (JSON string parsing for ~2x faster V8 startup)
    const jsonStr = JSON.stringify(poems);
    const jsContent = `// Auto-generated poem database\nwindow.POEMS_DATA = JSON.parse(${JSON.stringify(jsonStr)});\n`;
    fs.writeFileSync('poems.js', jsContent);

    console.log(`✅ Đã thêm bài thơ mới thành công!`);
    console.log(`- ID: ${newId}`);
    console.log(`- Tiêu đề: "${finalTitle}"`);
    console.log(`- Tổng số bài thơ hiện tại: ${poems.length}`);
}

const args = process.argv.slice(2);
if (args.length > 0) {
    addPoem(args[0], args[1] || args[0], args[2] || '');
} else {
    module.exports = addPoem;
}
