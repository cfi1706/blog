const fs = require('fs');
const path = require('path');

// Helper script to add new poems directly into poems_data.json and update poems.js
// Usage: node add_poem.js "Tên Bài Thơ" "Nội dung bài thơ (mỗi câu một dòng)"

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
        content_html: `\n${paragraphs}\n`,
        content_text: cleanText,
        featured_image: imageUrl || '',
        inline_images: [],
        all_images: imageUrl ? [imageUrl] : [],
        local_images: imageUrl ? [imageUrl] : []
    };

    poems.unshift(newPoem); // Add to top of list as newest poem

    fs.writeFileSync('poems_data.json', JSON.stringify(poems, null, 2));

    // Update poems.js
    const jsContent = `// Auto-generated poem database\nwindow.POEMS_DATA = ${JSON.stringify(poems, null, 2)};\n`;
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
