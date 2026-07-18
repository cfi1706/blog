const http = require('https');
const fs = require('fs');
const path = require('path');

async function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ...headers } }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ headers: res.headers, buffer: Buffer.concat(chunks), status: res.statusCode }));
        });
        req.on('error', reject);
    });
}

async function run() {
    console.log('Bypassing anti-bot challenge...');
    const page1 = await get('https://cfi1706.lovestoblog.com');
    const aesJs = await get('https://cfi1706.lovestoblog.com/aes.js');
    const vm = require('vm');
    const context = { location: {}, document: {} };
    vm.createContext(context);
    vm.runInContext(aesJs.buffer.toString(), context);
    const jsCode = page1.buffer.toString().match(/<script>(.*?)<\/script>/s)[1];
    vm.runInContext(jsCode, context);
    const cookie = context.document.cookie.split(';')[0];
    await get('https://cfi1706.lovestoblog.com/?i=1', { 'Cookie': cookie });
    console.log('Session initialized with cookie:', cookie);

    const poems = JSON.parse(fs.readFileSync('clean_poems.json', 'utf8'));
    fs.mkdirSync('images', { recursive: true });

    let downloadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < poems.length; i++) {
        const poem = poems[i];
        poem.local_images = [];

        for (let j = 0; j < poem.all_images.length; j++) {
            const imgUrl = poem.all_images[j];
            const urlObj = new URL(imgUrl);
            const ext = path.extname(urlObj.pathname) || '.jpg';
            const filename = `poem_${poem.id}_img_${j}${ext}`;
            const localPath = path.join('images', filename);

            if (fs.existsSync(localPath) && fs.statSync(localPath).size > 2000) {
                poem.local_images.push(`images/${filename}`);
                continue;
            }

            try {
                const imgRes = await get(imgUrl, { 'Cookie': cookie, 'Referer': 'https://cfi1706.lovestoblog.com/' });
                if (imgRes.status === 200 && imgRes.buffer.length > 1000) {
                    fs.writeFileSync(localPath, imgRes.buffer);
                    poem.local_images.push(`images/${filename}`);
                    downloadedCount++;
                } else {
                    console.log(`Failed ${imgUrl}: Status ${imgRes.status}, Size ${imgRes.buffer.length}`);
                    failedCount++;
                }
            } catch(e) {
                console.log(`Err ${imgUrl}: ${e.message}`);
                failedCount++;
            }
        }
        if ((i + 1) % 20 === 0 || i === poems.length - 1) {
            console.log(`Progress: ${i + 1}/${poems.length} poems. New downloaded: ${downloadedCount}, Failed: ${failedCount}`);
        }
    }

    fs.writeFileSync('poems_data.json', JSON.stringify(poems, null, 2));
    console.log('Saved final poems_data.json with all local image mappings!');
}

run();
