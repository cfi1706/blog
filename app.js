/* ==========================================================================
   ZzCFIzZ Modern Poetry Website - Application JavaScript Logic
   ========================================================================== */

// Register the service worker after first paint so it never competes with the
// initial render. It caches the app shell + assets for near-instant repeat visits.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is best-effort */ });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // State Management
    // ----------------------------------------------------------------------
    let currentFilter = 'all'; // 'all', 'vo-de', 'others', 'favorites'
    let currentSort = 'newest'; // 'newest', 'oldest', 'title-asc'
    let currentView = 'grid'; // 'grid', 'list'
    let searchQuery = '';
    let currentTheme = localStorage.getItem('zzcfizz_theme') || 'theme-midnight';
    // One corrupt localStorage value must not crash the whole app at startup.
    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }
    let favorites = readJson('zzcfizz_favorites', []);
    let activePoemIndex = 0;
    let filteredPoemsList = [];
    let fontSizePercentage = 100;
    let isTtsPlaying = false;
    let ttsUtterance = null;
    let ttsHeartbeat = null;
    let isZenMode = false;
    let currentCardStyle = 'midnight';

    // ----------------------------------------------------------------------
    // DOM Element References
    // ----------------------------------------------------------------------
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const categoryPills = document.getElementById('categoryPills');
    const sortSelect = document.getElementById('sortSelect');
    const viewButtons = document.querySelectorAll('.view-btn');
    const poemsGrid = document.getElementById('poemsGrid');
    const poemsSection = document.getElementById('poemsSection');
    const emptyState = document.getElementById('emptyState');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const randomPoemBtn = document.getElementById('randomPoemBtn');

    // Theme elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeMenu = document.getElementById('themeMenu');
    const themeOptions = document.querySelectorAll('.theme-option');

    // Counters
    const countAllEl = document.getElementById('countAll');
    const countFavEl = document.getElementById('countFav');


    // Reader Modal Elements
    const poemModal = document.getElementById('poemModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalCategory = document.getElementById('modalCategory');
    const modalTitle = document.getElementById('modalTitle');
    const modalDate = document.getElementById('modalDate');
    const modalPoemText = document.getElementById('modalPoemText');
    const modalImagesContainer = document.getElementById('modalImagesContainer');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const fontDecBtn = document.getElementById('fontDecBtn');
    const fontIncBtn = document.getElementById('fontIncBtn');
    const alignBtns = document.querySelectorAll('.align-btn');
    const modalFavBtn = document.getElementById('modalFavBtn');
    const modalCopyBtn = document.getElementById('modalCopyBtn');
    const modalShareBtn = document.getElementById('modalShareBtn');
    const zenModeBtn = document.getElementById('zenModeBtn');
    const exitZenBtn = document.getElementById('exitZenBtn');
    const quoteCardBtn = document.getElementById('quoteCardBtn');
    const firstPoemBtn = document.getElementById('firstPoemBtn');
    const prevPoemBtn = document.getElementById('prevPoemBtn');
    const nextPoemBtn = document.getElementById('nextPoemBtn');
    const lastPoemBtn = document.getElementById('lastPoemBtn');
    const poemCounterText = document.getElementById('poemCounterText');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const btnAutoScroll = document.getElementById('btnAutoScroll');
    const quoteSignatureInput = document.getElementById('quoteSignatureInput');
    const quoteQrCheckbox = document.getElementById('quoteQrCheckbox');

    // TTS Elements
    const ttsPlayBtn = document.getElementById('ttsPlayBtn');
    const ttsBtnText = document.getElementById('ttsBtnText');
    const ttsVoiceSelect = document.getElementById('ttsVoiceSelect');
    const ttsSpeedSelect = document.getElementById('ttsSpeedSelect');
    const ttsAutoplayCheck = document.getElementById('ttsAutoplayCheck');

    // Quote Card Modal
    const quoteCardModal = document.getElementById('quoteCardModal');
    const closeQuoteModalBtn = document.getElementById('closeQuoteModalBtn');
    const quoteCanvas = document.getElementById('quoteCanvas');
    const quoteLinesSelect = document.getElementById('quoteLinesSelect');
    const downloadCardBtn = document.getElementById('downloadCardBtn');
    const cardThemeGrid = document.getElementById('cardThemeGrid');

    // QR Badge Modal
    const qrBadgeModal = document.getElementById('qrBadgeModal');
    const closeQrBadgeModalBtn = document.getElementById('closeQrBadgeModalBtn');
    const qrBadgeCanvas = document.getElementById('qrBadgeCanvas');
    const downloadQrBadgeBtn = document.getElementById('downloadQrBadgeBtn');
    const modalQrBadgeBtn = document.getElementById('modalQrBadgeBtn');
    const qrStyleMidnight = document.getElementById('qrStyleMidnight');
    const qrStylePaper = document.getElementById('qrStylePaper');
    let currentQrStyle = 'midnight';

    // AI Poetry Bot Elements
    const headerBotBtn = document.getElementById('headerBotBtn');
    const botToggleBtn = document.getElementById('botToggleBtn');
    const poemBotDrawer = document.getElementById('poemBotDrawer');
    const closeBotBtn = document.getElementById('closeBotBtn');
    const botChatBody = document.getElementById('botChatBody');
    const botChatForm = document.getElementById('botChatForm');
    const botInput = document.getElementById('botInput');
    const chatChipsContainer = document.getElementById('chatChipsContainer');

    // Lightbox, Toast & Floating Actions
    const lightboxModal = document.getElementById('lightboxModal');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxGoToPoemBtn = document.getElementById('lightboxGoToPoemBtn');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const modalBody = document.getElementById('modalBody');
    const readingProgressBar = document.getElementById('readingProgressBar');

    // ----------------------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------------------
    function init() {
        applyTheme(currentTheme);
        setupScrollObserver();
        updateCategoryCounts();
        renderPoems();
        setupEventListeners();
        setupKeyboardShortcuts();
        checkUrlHashForPoem();
        // TTS voices load async in Chrome; setupEventListeners wires onvoiceschanged=populateTtsVoices.

        // Pause the blurred ambient orbs while the tab is hidden (saves GPU/battery).
        document.addEventListener('visibilitychange', () => {
            document.body.classList.toggle('bg-paused', document.hidden);
        });
    }

    // ----------------------------------------------------------------------
    // Direct URL Hash Deep-Linking
    // ----------------------------------------------------------------------
    function checkUrlHashForPoem() {
        const hash = location.hash;
        if (hash && hash.startsWith('#poem-')) {
            const idStr = hash.replace('#poem-', '');
            const poemId = parseInt(idStr, 10);
            const poems = getFilteredPoems();
            const idx = poems.findIndex(p => p.id === poemId);
            if (idx !== -1) {
                setTimeout(() => openReaderModal(idx), 300);
            }
        }
    }

    function updateUrlHash(poemId) {
        if (poemId) {
            history.replaceState(null, null, `#poem-${poemId}`);
        } else {
            history.replaceState(null, null, location.pathname + location.search);
        }
    }

    // ----------------------------------------------------------------------
    // Theme Switcher
    // ----------------------------------------------------------------------
    function applyTheme(themeName) {
        Array.from(document.body.classList).forEach(c => {
            if (c.startsWith('theme-')) document.body.classList.remove(c);
        });
        document.body.classList.add(themeName);
        currentTheme = themeName;
        localStorage.setItem('zzcfizz_theme', themeName);

        themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.setTheme === themeName);
        });
    }

    // ----------------------------------------------------------------------
    // Scroll Reveal Observer
    // ----------------------------------------------------------------------
    let scrollObserver = null;

    function setupScrollObserver() {
        if ('IntersectionObserver' in window) {
            scrollObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        scrollObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.01,
                rootMargin: '100px 0px 100px 0px'
            });
        }
    }

    // ----------------------------------------------------------------------
    // Heart Burst Particle Effect
    // ----------------------------------------------------------------------
    function createHeartBurst(x, y) {
        if (!x || !y) {
            x = window.innerWidth / 2;
            y = window.innerHeight / 2;
        }
        const icons = ['❤️', '✨', '💖', '🌸', '🌙', '🍃', '💕'];
        for (let i = 0; i < 9; i++) {
            const particle = document.createElement('span');
            particle.className = 'heart-particle';
            particle.textContent = icons[Math.floor(Math.random() * icons.length)];

            const dx = (Math.random() - 0.5) * 120 + 'px';
            const dy = (Math.random() - 0.7) * 120 + 'px';
            const rot = (Math.random() - 0.5) * 90 + 'deg';

            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.setProperty('--dx', dx);
            particle.style.setProperty('--dy', dy);
            particle.style.setProperty('--rot', rot);

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }

    function observeElements() {
        const elements = document.querySelectorAll('.reveal-on-scroll:not(.is-visible)');
        if (scrollObserver) {
            elements.forEach(el => {
                scrollObserver.observe(el);
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight + 200) {
                    el.classList.add('is-visible');
                }
            });
            setTimeout(() => {
                elements.forEach(el => el.classList.add('is-visible'));
            }, 100);
        } else {
            elements.forEach(el => el.classList.add('is-visible'));
        }
    }

    function getPoemsData() {
        if (typeof window !== 'undefined' && window.POEMS_DATA) return window.POEMS_DATA;
        if (typeof POEMS_DATA !== 'undefined') return POEMS_DATA;
        return [];
    }

    function updateCategoryCounts() {
        const poems = getPoemsData();
        if (!poems || poems.length === 0) return;
        const all = poems.length;
        const fav = favorites.length;

        if (countAllEl) countAllEl.textContent = all;
        if (countFavEl) countFavEl.textContent = fav;
    }

    // ----------------------------------------------------------------------
    // Semantic Emotion Search Logic
    // ----------------------------------------------------------------------
    const EMOTION_SYNONYMS = {
        'buồn': ['buồn', 'sầu', 'lẻ loi', 'cô đơn', 'đơn côi', 'u sầu', 'tàn', 'lạnh', 'tan'],
        'nhớ': ['nhớ', 'hoài niệm', 'kỷ niệm', 'xưa', 'người cũ', 'qua', 'xa', 'về'],
        'mưa': ['mưa', 'giọt mưa', 'chiều mưa', 'sương', 'lạnh', 'đêm'],
        'bình yên': ['bình yên', 'yên', 'nhẹ', 'tịnh', 'tĩnh', 'xanh', 'ru', 'nắng', 'hoa', 'mây'],
        'trầm tư': ['trầm', 'sâu', 'ngẫm', 'lặng', 'trăng', 'đêm', 'vô đề', 'mơ', 'bóng'],
        'yêu': ['yêu', 'thương', 'tình', 'trái tim', 'má', 'môi', 'nụ cười'],
        'hi vọng': ['hi vọng', 'sống', 'ngày mai', 'tương lai', 'ấm', 'mặt trời', 'ước', 'vui']
    };

    function prepareQueryContext(rawQuery) {
        if (!rawQuery) return null;
        const stopWords = ['tìm', 'bài', 'thơ', 'những', 'của', 'cho', 'về', 'nào', 'với', 'trong', 'lại', 'rồi', 'người', 'một'];
        const words = rawQuery.toLowerCase().trim().split(/\s+/).filter(w => !stopWords.includes(w));
        const cleanQuery = (words.length > 0 ? words : [rawQuery.toLowerCase().trim()]).join(' ');

        const synonymsSet = new Set();
        words.forEach(w => {
            if (w.length < 2) return;
            Object.keys(EMOTION_SYNONYMS).forEach(key => {
                if (key.includes(w) || w.includes(key)) {
                    EMOTION_SYNONYMS[key].forEach(syn => synonymsSet.add(syn));
                }
            });
        });

        return {
            words: words.filter(w => w.length >= 2),
            cleanQuery,
            synonyms: Array.from(synonymsSet)
        };
    }

    function calculateEmotionRelevance(poem, ctx) {
        if (!ctx) return 0;

        const title = (poem.title || '').toLowerCase();
        const content = (poem.content_text || '').toLowerCase();
        const fullText = title + ' ' + content;

        let score = 0;

        if (title.includes(ctx.cleanQuery)) score += 60;
        if (content.includes(ctx.cleanQuery)) score += 40;

        ctx.words.forEach(w => {
            if (title.includes(w)) score += 15;
            if (content.includes(w)) score += 10;
        });

        ctx.synonyms.forEach(syn => {
            if (fullText.includes(syn)) score += 5;
        });

        return score;
    }

    const filterMemoCache = new Map();

    function invalidateFilterCache() {
        filterMemoCache.clear();
    }

    function getFilteredPoems() {
        const poems = getPoemsData();
        if (!poems || poems.length === 0) return [];

        const cacheKey = `${currentFilter}|${currentSort}|${searchQuery.trim()}|${favorites.join(',')}`;
        if (filterMemoCache.has(cacheKey)) {
            return filterMemoCache.get(cacheKey);
        }

        let list = [...poems];

        // Filter category
        if (currentFilter === 'favorites') {
            list = list.filter(p => favorites.includes(p.id));
        }

        // Semantic Emotion & Keyword Search Filter
        if (searchQuery.trim() !== '') {
            const ctx = prepareQueryContext(searchQuery);
            const scoredList = list.map(p => {
                const score = calculateEmotionRelevance(p, ctx);
                return { poem: p, score };
            }).filter(item => item.score > 0);

            scoredList.sort((a, b) => b.score - a.score);
            list = scoredList.map(item => item.poem);
        } else {
            // Default Sort when no search query.
            // Cache each poem's parsed timestamp — sorting parses O(n log n)
            // date strings otherwise, on every filter/render.
            const ts = (p) => p._ts !== undefined ? p._ts : (p._ts = Date.parse(p.date) || 0);
            if (currentSort === 'newest') {
                list.sort((a, b) => ts(b) - ts(a));
            } else if (currentSort === 'oldest') {
                list.sort((a, b) => ts(a) - ts(b));
            } else if (currentSort === 'title-asc') {
                list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
            }
        }

        filterMemoCache.set(cacheKey, list);
        return list;
    }

    // ----------------------------------------------------------------------
    // Rendering Logic
    // ----------------------------------------------------------------------
    function renderPoems() {
        if (poemsSection) poemsSection.hidden = false;

        filteredPoemsList = getFilteredPoems();
        // Guard once: the batch renderer below appends to poemsGrid, so a
        // half-guarded null would still throw at appendChild time.
        if (!poemsGrid) return;
        poemsGrid.className = `poems-grid ${currentView}-view`;
        poemsGrid.innerHTML = '';

        if (filteredPoemsList.length === 0) {
            if (emptyState) emptyState.hidden = false;
            return;
        }
        if (emptyState) emptyState.hidden = true;

        // Render initial batch (12 cards) immediately for instantaneous LCP (<0.3s)
        const INITIAL_BATCH = 12;
        const firstBatch = filteredPoemsList.slice(0, INITIAL_BATCH);
        const fragment = document.createDocumentFragment();

        firstBatch.forEach((poem, index) => {
            const card = createPoemCard(poem, index);
            fragment.appendChild(card);
        });
        poemsGrid.appendChild(fragment);
        observeElements();

        // Batch render remaining cards asynchronously in idle time to keep Main Thread 100% responsive (0ms TBT)
        if (filteredPoemsList.length > INITIAL_BATCH) {
            let offset = INITIAL_BATCH;
            function renderNextBatch() {
                if (offset >= filteredPoemsList.length) return;
                const end = Math.min(offset + 16, filteredPoemsList.length);
                const batchFragment = document.createDocumentFragment();
                for (let i = offset; i < end; i++) {
                    const card = createPoemCard(filteredPoemsList[i], i);
                    batchFragment.appendChild(card);
                }
                poemsGrid.appendChild(batchFragment);
                offset = end;
                if (offset < filteredPoemsList.length) {
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(renderNextBatch);
                    } else {
                        setTimeout(renderNextBatch, 16);
                    }
                } else {
                    observeElements();
                }
            }

            if ('requestIdleCallback' in window) {
                requestIdleCallback(renderNextBatch);
            } else {
                setTimeout(renderNextBatch, 16);
            }
        }
    }

    function createPoemCard(poem, index) {
        const card = document.createElement('article');
        card.className = 'poem-card is-visible';
        card.style.transitionDelay = `${(index % 8) * 0.05}s`;
        const isFav = favorites.includes(poem.id);

        const lines = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).slice(0, 4) : [];
        const excerpt = lines.join('\n');

        const hasImg = poem.local_images && poem.local_images.length > 0;
        const imgSrc = hasImg ? poem.local_images[0] : null;
        // Cards show a lightweight thumbnail; the full-size image loads only in the
        // reader/lightbox. Every .webp has a matching .thumb.webp (see gen_thumbnails.js).
        const cardImgSrc = imgSrc && imgSrc.endsWith('.webp')
            ? imgSrc.replace(/\.webp$/, '.thumb.webp')
            : imgSrc;

        card.innerHTML = `
            ${hasImg ? `
                <div class="card-media">
                    <img src="${cardImgSrc}" alt="${poem.title}" loading="lazy" decoding="async" class="img-lazy">
                    <div class="card-media-overlay"></div>
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" data-id="${poem.id}" title="${isFav ? 'Bỏ yêu thích' : 'Yêu thích'}">
                        <i class="${isFav ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
                    </button>
                </div>
            ` : `
                <div class="card-no-media-header" style="position: absolute; top: 12px; right: 12px; z-index: 2;">
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" data-id="${poem.id}" title="${isFav ? 'Bỏ yêu thích' : 'Yêu thích'}">
                        <i class="${isFav ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
                    </button>
                </div>
            `}
            <div class="card-body">
                <h3 class="card-title">${poem.title}</h3>
                <p class="card-excerpt">${excerpt}</p>
                <div class="card-footer">
                    <span class="card-date-text"><i class="ri-calendar-line"></i> ${poem.date_formatted}</span>
                    <button class="card-read-btn" data-index="${index}" title="Đọc bài thơ">
                        <i class="ri-arrow-right-line"></i>
                    </button>
                </div>
            </div>
        `;

        const imgEl = card.querySelector('img');
        if (imgEl) {
            imgEl.onerror = () => {
                // Thumb missing? fall back to the full image, then hide the media
                // box entirely (no placeholder file exists to substitute).
                if (imgSrc && imgEl.src.includes('.thumb.webp')) {
                    imgEl.src = imgSrc;
                    return;
                }
                const media = imgEl.closest('.card-media');
                if (media) media.style.display = 'none';
            };
            if (imgEl.complete) {
                imgEl.classList.add('img-loaded');
            } else {
                imgEl.addEventListener('load', () => imgEl.classList.add('img-loaded'));
            }
        }

        const favBtn = card.querySelector('.card-fav-btn');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(poem.id);
            });
        }

        const readBtn = card.querySelector('.card-read-btn');
        if (readBtn) {
            readBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openReaderModal(index);
            });
        }

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-fav-btn')) {
                openReaderModal(index);
            }
        });

        return card;
    }

    // ----------------------------------------------------------------------
    // Favorites Management
    // ----------------------------------------------------------------------
    function toggleFavorite(poemId, event) {
        if (favorites.includes(poemId)) {
            favorites = favorites.filter(id => id !== poemId);
            showToast('Đã xóa bài thơ khỏi danh sách yêu thích.');
        } else {
            favorites.push(poemId);
            showToast('❤️ Đã thêm bài thơ vào danh sách yêu thích!');
            if (event && event.clientX) {
                createHeartBurst(event.clientX, event.clientY);
            }
        }
        localStorage.setItem('zzcfizz_favorites', JSON.stringify(favorites));
        invalidateFilterCache();
        updateCategoryCounts();
        renderPoems();

        if (poemModal.open) {
            const currentPoem = filteredPoemsList[activePoemIndex];
            if (currentPoem && currentPoem.id === poemId) {
                const isFav = favorites.includes(poemId);
                modalFavBtn.classList.toggle('active', isFav);
                modalFavBtn.querySelector('i').className = isFav ? 'ri-heart-fill' : 'ri-heart-line';
            }
        }
    }

    // ----------------------------------------------------------------------
    // Auto-Scroll Logic (Outer Scope)
    // ----------------------------------------------------------------------
    let isAutoScrolling = false;
    let autoScrollInterval = null;

    function stopAutoScroll() {
        isAutoScrolling = false;
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
        if (btnAutoScroll) {
            btnAutoScroll.classList.remove('active');
            const textEl = btnAutoScroll.querySelector('.auto-scroll-text');
            if (textEl) textEl.textContent = 'Tự Cuộn';
        }
    }

    function toggleAutoScroll() {
        if (!modalBody) return;
        isAutoScrolling = !isAutoScrolling;
        if (btnAutoScroll) {
            btnAutoScroll.classList.toggle('active', isAutoScrolling);
            const textEl = btnAutoScroll.querySelector('.auto-scroll-text');
            if (textEl) textEl.textContent = isAutoScrolling ? 'Dừng Cuộn' : 'Tự Cuộn';
        }

        if (isAutoScrolling) {
            autoScrollInterval = setInterval(() => {
                if (!modalBody || !isAutoScrolling) {
                    stopAutoScroll();
                    return;
                }
                if (modalBody.scrollTop + modalBody.clientHeight >= modalBody.scrollHeight - 5) {
                    stopAutoScroll();
                } else {
                    modalBody.scrollTop += 1;
                }
            }, 35);
        } else {
            stopAutoScroll();
        }
    }

    // ----------------------------------------------------------------------
    // Modal Reader Logic
    // ----------------------------------------------------------------------
    // Picker-only fonts (Cormorant/Dancing/Merriweather) are NOT in the initial page load.
    // Inject them the first time the reader opens so the font-picker + any saved choice render.
    let pickerFontsLoaded = false;
    function ensurePickerFonts() {
        if (pickerFontsLoaded) return;
        pickerFontsLoaded = true;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Dancing+Script:wght@500;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap';
        document.head.appendChild(link);
    }

    function openReaderModal(target) {
        ensurePickerFonts();
        if (!filteredPoemsList || filteredPoemsList.length === 0) {
            filteredPoemsList = getFilteredPoems();
        }

        let index = -1;
        let poem = null;

        if (typeof target === 'number' && target >= 0 && target < filteredPoemsList.length) {
            index = target;
            poem = filteredPoemsList[index];
        }

        if (!poem) {
            index = filteredPoemsList.findIndex(p => p.id === target || p.id === Number(target));
            if (index !== -1) {
                poem = filteredPoemsList[index];
            } else {
                const allData = getPoemsData();
                const foundIdx = allData.findIndex(p => p.id === target || p.id === Number(target));
                if (foundIdx !== -1) {
                    poem = allData[foundIdx];
                    filteredPoemsList = [...allData];
                    index = foundIdx;
                }
            }
        }

        if (!poem) return;
        activePoemIndex = index;

        updateUrlHash(poem.id);

        if (modalTitle) {
            modalTitle.textContent = poem.title;
            modalTitle.classList.add('calligraphy-3d-text');
        }
        const verseCount = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).length : 0;
        
        let rhythmType = '🖋️ Thể Thơ Tự Do';
        if (poem.genre) {
            const genreMap = {
                'Lục bát': '📜 Thể Thơ Lục Bát',
                'Song thất lục bát': '📜 Thể Thơ Song Thất Lục Bát',
                'Thất ngôn bát cú': '✒️ Thể Thơ Thất Ngôn Bát Cú',
                'Thất ngôn tứ tuyệt': '✒️ Thể Thơ Thất Ngôn Tứ Tuyệt',
                'Thất ngôn': '✒️ Thể Thơ Thất Ngôn',
                'Ngũ ngôn': '🖋️ Thể Thơ Ngũ Ngôn',
                'Tự do': '🖋️ Thể Thơ Tự Do'
            };
            rhythmType = genreMap[poem.genre] || `📜 Thể Thơ ${poem.genre}`;
        } else {
            rhythmType = verseCount % 2 === 0 ? '📜 Thể Thơ Lục Bát / Thất Ngôn' : '🖋️ Thể Thơ Tự Do';
        }

        if (modalDate) modalDate.innerHTML = `<i class="ri-calendar-line"></i> ${poem.date_formatted || ''} &nbsp;•&nbsp; <i class="ri-quill-pen-line"></i> ${verseCount} câu thơ &nbsp;•&nbsp; ${rhythmType}`;
        if (modalCategory) modalCategory.textContent = 'Tác Phẩm Thơ';

        // Dynamic Emotion Mood Lighting Filter
        const orb1 = document.querySelector('.orb-1');
        const orb2 = document.querySelector('.orb-2');
        if (orb1 && poem.mood) {
            if (poem.mood.includes('peace') || poem.mood.includes('calm')) {
                orb1.style.background = 'radial-gradient(circle, rgba(16, 185, 129, 0.45), transparent 70%)';
            } else if (poem.mood.includes('deep') || poem.mood.includes('nostalgia') || poem.mood.includes('sad')) {
                orb1.style.background = 'radial-gradient(circle, rgba(168, 85, 247, 0.45), transparent 70%)';
                if (orb2) orb2.style.background = 'radial-gradient(circle, rgba(236, 72, 153, 0.35), transparent 70%)';
            } else if (poem.mood.includes('hope') || poem.mood.includes('warm') || poem.mood.includes('love')) {
                orb1.style.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.45), transparent 70%)';
                if (orb2) orb2.style.background = 'radial-gradient(circle, rgba(251, 191, 36, 0.35), transparent 70%)';
            } else {
                orb1.style.background = 'radial-gradient(circle, rgba(59, 130, 246, 0.45), transparent 70%)';
            }
        }

        // Bookmark last read poem
        localStorage.setItem('zzcfizz_last_read_poem_id', poem.id);

        if (modalBody) modalBody.scrollTop = 0;
        if (readingProgressBar) readingProgressBar.style.width = '0%';

        const defaultAlign = (poem.genre === 'Lục bát' || poem.genre === 'Song thất lục bát') 
            ? 'center' 
            : (poem.genre ? 'left' : (verseCount % 2 === 0 ? 'center' : 'left'));

        if (alignBtns) {
            alignBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.align === defaultAlign);
            });
        }

        const rawLines = poem.content_text ? poem.content_text.split('\n') : [];
        if (modalPoemText) {
            modalPoemText.className = `poem-body-text align-${defaultAlign}`;
            modalPoemText.innerHTML = '';
            let verseIdx = 0;
            rawLines.forEach((lineText) => {
                const cleanLine = lineText.replace(/[\u200B-\u200D\uFEFF]/g, '');
                if (cleanLine.trim().length === 0) {
                    const spacer = document.createElement('div');
                    spacer.className = 'poem-paragraph-spacer';
                    modalPoemText.appendChild(spacer);
                } else {
                    const span = document.createElement('span');
                    span.className = 'poem-line';
                    span.dataset.lineIndex = verseIdx;
                    span.textContent = cleanLine;
                    modalPoemText.appendChild(span);
                    verseIdx++;
                }
            });
            modalPoemText.style.fontSize = `${fontSizePercentage}%`;
        }

        // Images
        if (modalImagesContainer) {
            modalImagesContainer.innerHTML = '';
            if (poem.local_images && poem.local_images.length > 0) {
                poem.local_images.forEach(imgSrc => {
                    const img = document.createElement('img');
                    img.src = imgSrc;
                    img.alt = poem.title;
                    img.loading = 'lazy';
                    img.decoding = 'async';
                    img.className = 'img-lazy';
                    img.title = 'Nhấp để xem ảnh phóng to';
                    img.onerror = () => {
                        // No placeholder file exists — hide the broken image instead.
                        img.style.display = 'none';
                    };
                    if (img.complete) {
                        img.classList.add('img-loaded');
                    } else {
                        img.addEventListener('load', () => img.classList.add('img-loaded'));
                    }
                    img.addEventListener('click', () => {
                        openLightbox(imgSrc, poem);
                    });
                    modalImagesContainer.appendChild(img);
                });
            }
        }

        // Bookmark & Navigation
        const isFav = favorites.includes(poem.id);
        if (modalFavBtn) {
            modalFavBtn.classList.toggle('active', isFav);
            const favIcon = modalFavBtn.querySelector('i');
            if (favIcon) favIcon.className = isFav ? 'ri-heart-fill' : 'ri-heart-line';
        }

        if (poemCounterText) poemCounterText.textContent = `${index + 1} / ${filteredPoemsList.length}`;
        if (firstPoemBtn) firstPoemBtn.disabled = index <= 0;
        if (prevPoemBtn) prevPoemBtn.disabled = index <= 0;
        if (nextPoemBtn) nextPoemBtn.disabled = index >= filteredPoemsList.length - 1;
        if (lastPoemBtn) lastPoemBtn.disabled = index >= filteredPoemsList.length - 1;

        stopTts();
        stopAutoScroll();
        populateTtsVoices();
        updateEmotionAura(poem);

        // Restore saved font family
        const savedFontFamily = localStorage.getItem('zzcfizz_font_family') || "'Lora', serif";
        if (fontFamilySelect) {
            fontFamilySelect.value = savedFontFamily;
        }
        if (modalPoemText) {
            modalPoemText.style.fontFamily = savedFontFamily;
        }

        // Apply saved header actions collapse preference
        const modalHeader = document.querySelector('.modal-header');
        const toggleModalActionsBtn = document.getElementById('toggleModalActionsBtn');
        const isHeaderCollapsed = localStorage.getItem('zzcfizz_reader_header_collapsed') === 'true';
        if (modalHeader) modalHeader.classList.toggle('actions-collapsed', isHeaderCollapsed);
        if (toggleModalActionsBtn) toggleModalActionsBtn.classList.toggle('active', isHeaderCollapsed);

        if (poemModal) {
            if (typeof poemModal.showModal === 'function') {
                if (!poemModal.open) {
                    poemModal.showModal();
                }
            } else {
                poemModal.setAttribute('open', 'true');
            }
        }
    }

    // All teardown lives here (idempotent) and is bound to the dialog's 'close'
    // event, so every close path runs it — close button, backdrop click AND Esc,
    // which previously bypassed cleanup and left TTS playing + the #poem- hash set.
    function onReaderModalClosed() {
        stopTts();
        stopAutoScroll();
        disableZenMode();
        updateUrlHash(null);

        const modalHeader = document.querySelector('.modal-header');
        const toggleModalActionsBtn = document.getElementById('toggleModalActionsBtn');
        if (modalHeader) modalHeader.classList.remove('actions-collapsed', 'actions-manual-toggled');
        if (toggleModalActionsBtn) toggleModalActionsBtn.classList.remove('active');
    }
    if (poemModal) poemModal.addEventListener('close', onReaderModalClosed);

    function closeReaderModal() {
        if (!poemModal) return;
        try {
            if (typeof poemModal.close === 'function' && poemModal.open) {
                poemModal.close(); // fires 'close' -> onReaderModalClosed
                return;
            }
        } catch (e) {}
        // Fallback for browsers without <dialog> support.
        poemModal.removeAttribute('open');
        onReaderModalClosed();
    }

    // ----------------------------------------------------------------------
    // Zen Mode Reader
    // ----------------------------------------------------------------------
    function toggleZenMode() {
        if (isZenMode) {
            disableZenMode();
        } else {
            enableZenMode();
        }
    }

    function enableZenMode() {
        isZenMode = true;
        document.body.classList.add('zen-mode-active');
        if (exitZenBtn) exitZenBtn.hidden = false;
        showToast('🧘 Đã bật Chế độ Tập Trung Đọc Thơ');
    }

    function disableZenMode() {
        isZenMode = false;
        document.body.classList.remove('zen-mode-active');
        if (exitZenBtn) exitZenBtn.hidden = true;
    }

    // ----------------------------------------------------------------------


    // ----------------------------------------------------------------------
    // Seamless Expressive Poetry TTS Engine with Speed & Autoplay
    // ----------------------------------------------------------------------
    let ttsQueue = [];
    let ttsQueueIndex = 0;
    let ttsAudioInstance = null;

    function cleanTextForTts(text) {
        if (!text) return '';
        return text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    }

    function highlightActiveLine(lineIndex) {
        document.querySelectorAll('.poem-line.active-karaoke-line').forEach(el => {
            el.classList.remove('active-karaoke-line');
        });

        if (lineIndex === null || lineIndex === undefined || lineIndex < 0) return;

        const lineEl = document.querySelector(`.poem-line[data-line-index="${lineIndex}"]`);
        if (lineEl) {
            lineEl.classList.add('active-karaoke-line');
            if (modalBody) {
                lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function buildPoemPhrases(title, contentText) {
        const cleanTitle = cleanTextForTts(title);
        const cleanContent = cleanTextForTts(contentText);

        const rawLines = cleanContent.split('\n').map(l => l.trim());
        const phrases = [];

        if (cleanTitle) {
            phrases.push({ text: cleanTitle + '.', lineIndex: -1 });
        }

        let lineIdx = 0;
        for (let line of rawLines) {
            if (line.length === 0) continue;

            let lineWithPause = line;
            if (!/[.,!?;:]$/.test(lineWithPause)) {
                lineWithPause += ',';
            }

            phrases.push({ text: lineWithPause, lineIndex: lineIdx });
            lineIdx++;
        }

        return phrases;
    }

    function getSelectedTtsVoice() {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        const selectedURI = ttsVoiceSelect ? ttsVoiceSelect.value : '';
        if (selectedURI) {
            const found = voices.find(v => (v.voiceURI && v.voiceURI === selectedURI) || v.name === selectedURI);
            if (found) return found;
        }
        return voices.find(v => v.lang && (v.lang.toLowerCase() === 'vi-vn' || v.lang.toLowerCase().startsWith('vi')))
            || voices.find(v => v.name && (v.name.toLowerCase().includes('vietnamese') || v.name.toLowerCase().includes('tiếng việt')));
    }

    function populateTtsVoices() {
        if (!('speechSynthesis' in window) || !ttsVoiceSelect) return;

        const voices = window.speechSynthesis.getVoices() || [];
        ttsVoiceSelect.innerHTML = '';

        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'auto';
        defaultOpt.textContent = '🔊 Giọng AI Tiếng Việt Mặc Định';
        ttsVoiceSelect.appendChild(defaultOpt);

        // Filter ONLY Vietnamese language voices (vi-VN, vi_VN, or Vietnamese in name)
        const viVoices = voices.filter(v => v.lang && (v.lang.toLowerCase().includes('vi') || (v.name && v.name.toLowerCase().includes('vietnamese'))));

        const savedVoiceURI = localStorage.getItem('zzcfizz_tts_voice_uri');

        if (viVoices.length > 0) {
            const viOptGroup = document.createElement('optgroup');
            viOptGroup.label = '🇻🇳 Giọng Đọc Tiếng Việt System';
            viVoices.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.voiceURI || v.name;
                opt.textContent = `🇻🇳 ${v.name}`;
                if (savedVoiceURI && (v.voiceURI === savedVoiceURI || v.name === savedVoiceURI)) {
                    opt.selected = true;
                }
                viOptGroup.appendChild(opt);
            });
            ttsVoiceSelect.appendChild(viOptGroup);
        } else {
            // Preset AI options when no native local vi-VN voices exist on browser/OS
            const aiPresetGroup = document.createElement('optgroup');
            aiPresetGroup.label = '🇻🇳 Giọng Đọc AI Trực Tuyến';

            const p1 = document.createElement('option');
            p1.value = 'ai_female_south';
            p1.textContent = '🔊 Giọng Nữ AI Tiếng Việt (Trầm Ấm)';
            aiPresetGroup.appendChild(p1);

            const p2 = document.createElement('option');
            p2.value = 'ai_male_north';
            p2.textContent = '🔊 Giọng Nam AI Tiếng Việt (Truyền Cảm)';
            aiPresetGroup.appendChild(p2);

            ttsVoiceSelect.appendChild(aiPresetGroup);
        }

        if (savedVoiceURI && savedVoiceURI !== 'auto') {
            ttsVoiceSelect.value = savedVoiceURI;
        }
    }

    function toggleTts() {
        if (isTtsPlaying) {
            stopTts();
        } else {
            startTts();
        }
    }

    function startTts() {
        const poem = filteredPoemsList[activePoemIndex];
        if (!poem) return;

        stopTts();

        const phrases = buildPoemPhrases(poem.title, poem.content_text);
        if (phrases.length === 0) return;

        isTtsPlaying = true;
        ttsPlayBtn.classList.add('active');
        if (ttsBtnText) ttsBtnText.textContent = 'Dừng Đọc';

        ttsQueue = phrases;
        ttsQueueIndex = 0;

        let selectedVoice = getSelectedTtsVoice();

        if (selectedVoice) {
            showToast(`🔊 Đọc bài thơ bằng giọng ${selectedVoice.name}...`);
            // Chrome watchdog silently stops speechSynthesis after ~15s.
            // Nudge it alive with a periodic pause/resume while speaking.
            if (ttsHeartbeat) clearInterval(ttsHeartbeat);
            ttsHeartbeat = setInterval(() => {
                if (!isTtsPlaying) return;
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000);
            speakNextWebSpeech(selectedVoice);
        } else {
            showToast('🔊 Đọc bài thơ bằng Giọng Nói AI Tiếng Việt...');
            const modalImagesContainer = document.getElementById('modalImagesContainer');
            if (modalImagesContainer) modalImagesContainer.classList.add('ken-burns-active');
            playNextAudioStream();
        }
    }

    // Reading style (whisper/poetic) adjusts rate multiplier + pitch.
    function getSelectedTtsStyle() {
        const sel = document.getElementById('ttsStyleSelect');
        const style = sel ? sel.value : 'standard';
        if (style === 'whisper') return { rateMul: 0.8, pitch: 0.75 };
        if (style === 'poetic') return { rateMul: 0.85, pitch: 0.95 };
        return { rateMul: 1.0, pitch: 1.05 };
    }

    // Returns the effective speed multiplier (callers multiply their base rate).
    function getSelectedTtsSpeed() {
        const speedVal = parseFloat(ttsSpeedSelect ? ttsSpeedSelect.value : '1.0');
        return getSelectedTtsStyle().rateMul * speedVal;
    }

    function handleTtsFinished() {
        stopTts();
        if (ttsAutoplayCheck && ttsAutoplayCheck.checked && activePoemIndex < filteredPoemsList.length - 1) {
            showToast('▶️ Tự động phát bài tiếp theo...');
            setTimeout(() => {
                openReaderModal(activePoemIndex + 1);
                startTts();
            }, 2500);
        }
    }

    function speakNextWebSpeech(viVoice) {
        // Stopped by the user (e.g. between onend and the deferred setTimeout
        // below): bail silently. Only a naturally exhausted queue may reach
        // handleTtsFinished(), which can autoplay the next poem.
        if (!isTtsPlaying) return;
        if (ttsQueueIndex >= ttsQueue.length) {
            handleTtsFinished();
            return;
        }

        const phraseObj = ttsQueue[ttsQueueIndex];
        highlightActiveLine(phraseObj.lineIndex);

        if (!('speechSynthesis' in window)) {
            playNextAudioStream();
            return;
        }

        ttsUtterance = new SpeechSynthesisUtterance(phraseObj.text);
        ttsUtterance.lang = 'vi-VN';
        ttsUtterance.rate = 0.88 * getSelectedTtsSpeed();
        ttsUtterance.pitch = getSelectedTtsStyle().pitch;
        if (viVoice) ttsUtterance.voice = viVoice;

        ttsUtterance.onend = () => {
            if (!isTtsPlaying) return;
            ttsQueueIndex++;
            // Defer out of onend: calling speak() synchronously inside onend
            // makes Chrome's engine stall after a few utterances.
            setTimeout(() => speakNextWebSpeech(viVoice), 0);
        };

        ttsUtterance.onerror = (e) => {
            console.warn('SpeechSynthesis error on line', ttsQueueIndex, e);
            if (!isTtsPlaying) return;
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                playNextAudioStream();
                return;
            }
            ttsQueueIndex++;
            speakNextWebSpeech(viVoice);
        };

        window.speechSynthesis.speak(ttsUtterance);
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }

    function playNextAudioStream() {
        if (!isTtsPlaying) return; // stopped by the user — no autoplay
        if (ttsQueueIndex >= ttsQueue.length) {
            handleTtsFinished();
            return;
        }

        const phraseObj = ttsQueue[ttsQueueIndex];
        if (!phraseObj || !phraseObj.text) {
            ttsQueueIndex++;
            playNextAudioStream();
            return;
        }

        highlightActiveLine(phraseObj.lineIndex);

        if (ttsAudioInstance) {
            ttsAudioInstance.pause();
            ttsAudioInstance = null;
        }

        const chunk = phraseObj.text.substring(0, 200);
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
        ttsAudioInstance = new Audio(audioUrl);
        ttsAudioInstance.playbackRate = 0.92 * getSelectedTtsSpeed();

        ttsAudioInstance.onended = () => {
            if (!isTtsPlaying) return;
            ttsQueueIndex++;
            playNextAudioStream();
        };

        ttsAudioInstance.onerror = (e) => {
            console.warn('AudioStream error on line', ttsQueueIndex, e);
            if (!isTtsPlaying) return;
            ttsQueueIndex++;
            playNextAudioStream();
        };

        ttsAudioInstance.play().catch(err => {
            console.warn('Audio play error:', err);
            if (isTtsPlaying) {
                ttsQueueIndex++;
                playNextAudioStream();
            }
        });
    }

    function stopTts() {
        if (ttsHeartbeat) {
            clearInterval(ttsHeartbeat);
            ttsHeartbeat = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (ttsAudioInstance) {
            ttsAudioInstance.pause();
            ttsAudioInstance.currentTime = 0;
            ttsAudioInstance = null;
        }
        highlightActiveLine(-1);

        isTtsPlaying = false;
        ttsQueue = [];
        ttsQueueIndex = 0;
        if (ttsPlayBtn) ttsPlayBtn.classList.remove('active');
        if (ttsBtnText) ttsBtnText.textContent = 'Đọc Thơ';
    }

    // ----------------------------------------------------------------------
    // Quote Card Generator Canvas Logic
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // Quote Card Generator Canvas with Aspect Ratios
    // ----------------------------------------------------------------------
    let currentCardAspect = 'portrait'; // portrait (9:16), square (1:1), classic (4:5)

    function renderQuoteCardCanvas() {
        const poem = filteredPoemsList[activePoemIndex];
        if (!poem || !quoteCanvas) return;

        let width = 600;
        let height = 750;

        if (currentCardAspect === 'portrait') {
            width = 540;
            height = 960;
        } else if (currentCardAspect === 'square') {
            width = 600;
            height = 600;
        } else if (currentCardAspect === 'desktop') {
            width = 1920;
            height = 1080;
        } else if (currentCardAspect === 'bookmark') {
            width = 360;
            height = 1080;
        } else {
            width = 600;
            height = 750;
        }

        quoteCanvas.width = width;
        quoteCanvas.height = height;

        const ctx = quoteCanvas.getContext('2d');

        if (currentCardStyle === 'midnight') {
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 20;
        } else if (currentCardStyle === 'paper') {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(0, 0, width, height);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.strokeRect(20, 20, width - 40, height - 40);
        } else if (currentCardStyle === 'sunset') {
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, '#451a03');
            grad.addColorStop(0.5, '#78350f');
            grad.addColorStop(1, '#831843');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#fde047';
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 15;
        } else if (currentCardStyle === 'emerald') {
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, '#064e3b');
            grad.addColorStop(1, '#022c22');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#34d399';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 15;
        } else if (currentCardStyle === 'cosmic') {
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, '#311042');
            grad.addColorStop(1, '#11092b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#c084fc';
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 15;
        }

        ctx.font = '22px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✒️ ZzCFIzZ Poetry', width / 2, 60);

        ctx.shadowBlur = 0;

        ctx.fillStyle = currentCardStyle === 'paper' ? '#78350f' : '#ffffff';
        ctx.font = 'bold 28px "Cormorant Garamond", "Lora", serif';
        ctx.fillText(poem.title, width / 2, 115);

        ctx.strokeStyle = currentCardStyle === 'paper' ? '#d97706' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 60, 135);
        ctx.lineTo(width / 2 + 60, 135);
        ctx.stroke();

        const allLines = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0) : [];
        let selectedLines = [...allLines];
        const lineChoice = quoteLinesSelect ? quoteLinesSelect.value : 'full';

        if (lineChoice === 'first4') {
            selectedLines = allLines.slice(0, 4);
        } else if (lineChoice === 'last4') {
            selectedLines = allLines.slice(-4);
        } else {
            selectedLines = allLines.slice(0, currentCardAspect === 'portrait' ? 14 : 8);
        }

        ctx.font = 'italic 19px "Lora", serif';
        ctx.fillStyle = currentCardStyle === 'paper' ? '#451a03' : '#f1f5f9';
        ctx.textAlign = 'center';

        const startY = 190;
        const lineHeight = 36;

        selectedLines.forEach((line, idx) => {
            ctx.fillText(line, width / 2, startY + (idx * lineHeight));
        });

        const linesEndY = startY + (selectedLines.length * lineHeight);

        // Render Signature / Dedicated Name
        const signatureText = quoteSignatureInput ? quoteSignatureInput.value.trim() : '';
        if (signatureText) {
            ctx.font = 'italic 19px "Dancing Script", "Lora", serif';
            ctx.fillStyle = currentCardStyle === 'paper' ? '#d97706' : '#c084fc';
            ctx.textAlign = 'right';
            ctx.fillText(`— ${signatureText}`, width - 50, Math.min(linesEndY + 35, height - 100));
        }

        // Render QR Code & Footer Link
        const showQr = quoteQrCheckbox ? quoteQrCheckbox.checked : true;
        if (showQr) {
            const qrSize = 54;
            const qrX = 36;
            const qrY = height - 85;
            const linkUrl = `https://zzcfizz.blog/#poem-${poem.id}`;
            drawQrCodeCanvas(ctx, linkUrl, qrX, qrY, qrSize, currentCardStyle === 'paper' ? '#78350f' : '#ffffff', currentCardStyle === 'paper' ? '#fde68a' : 'rgba(15,23,42,0.6)');

            ctx.font = '11px sans-serif';
            ctx.fillStyle = currentCardStyle === 'paper' ? '#92400e' : 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'left';
            ctx.fillText('Quét để đọc thơ', qrX + qrSize + 10, qrY + 22);
            ctx.fillText(poem.date_formatted, qrX + qrSize + 10, qrY + 40);
        } else {
            ctx.font = '12px sans-serif';
            ctx.fillStyle = currentCardStyle === 'paper' ? '#92400e' : 'rgba(255,255,255,0.6)';
            ctx.textAlign = 'center';
            ctx.fillText(`${poem.date_formatted}  •  zzcfizz.blog`, width / 2, height - 40);
        }

        // Render Red Wax Seal Stamp
        const quoteWaxSealCheckbox = document.getElementById('quoteWaxSealCheckbox');
        if (quoteWaxSealCheckbox && quoteWaxSealCheckbox.checked) {
            const sealRadius = 26;
            const sealX = width - 50;
            const sealY = height - 55;

            ctx.save();
            ctx.beginPath();
            ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#991b1b';
            ctx.shadowColor = '#450a0a';
            ctx.shadowBlur = 10;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sealX, sealY, sealRadius - 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#b91c1c';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 16px serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 0;
            ctx.fillText('📜', sealX, sealY + 6);
            ctx.restore();
        }
    }

    function drawQrCodeCanvas(ctx, text, x, y, size, darkColor, lightColor) {
        ctx.save();
        ctx.fillStyle = lightColor || '#ffffff';
        ctx.fillRect(x, y, size, size);

        ctx.strokeStyle = darkColor || '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, size, size);

        const grid = 21;
        const cell = size / grid;

        const fillCell = (r, c) => {
            ctx.fillStyle = darkColor || '#000000';
            ctx.fillRect(x + c * cell, y + r * cell, cell + 0.3, cell + 0.3);
        };

        const drawFinder = (r0, c0) => {
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 7; c++) {
                    if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                        fillCell(r0 + r, c0 + c);
                    }
                }
            }
        };

        drawFinder(0, 0);
        drawFinder(0, 14);
        drawFinder(14, 0);

        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff;

        for (let r = 0; r < grid; r++) {
            for (let c = 0; c < grid; c++) {
                if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
                if (r === 6 || c === 6) {
                    if ((r + c) % 2 === 0) fillCell(r, c);
                    continue;
                }
                const bit = Math.abs(Math.sin(r * 13 + c * 29 + hash)) > 0.45;
                if (bit) fillCell(r, c);
            }
        }
        ctx.restore();
    }

    function renderQrBadgeCanvas() {
        if (!qrBadgeCanvas) return;
        const ctx = qrBadgeCanvas.getContext('2d');
        const width = qrBadgeCanvas.width;
        const height = qrBadgeCanvas.height;

        const poem = filteredPoemsList[activePoemIndex];
        if (!poem) return;

        // 1. Clear & Background
        ctx.clearRect(0, 0, width, height);

        let bgGrad;
        if (currentQrStyle === 'midnight') {
            // Midnight gradient
            bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
            bgGrad.addColorStop(0, '#1e1b4b');
            bgGrad.addColorStop(1, '#0b0a1a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // Double border lines
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 10, width - 20, height - 20);
            ctx.strokeStyle = '#4338ca';
            ctx.strokeRect(14, 14, width - 28, height - 28);
        } else {
            // Warm Paper background
            ctx.fillStyle = '#fdf6e2';
            ctx.fillRect(0, 0, width, height);

            // Double border lines
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(10, 10, width - 20, height - 20);
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 0.75;
            ctx.strokeRect(14, 14, width - 28, height - 28);
        }

        // 2. Draw Top Wordmark / Logo
        ctx.save();
        ctx.fillStyle = currentQrStyle === 'midnight' ? '#a5b4fc' : '#b45309';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🖋️  ZzCFIzZ  —  TUYỂN TẬP THƠ  📜', width / 2, 40);
        
        // Horizontal line ornament
        ctx.strokeStyle = currentQrStyle === 'midnight' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(180, 83, 9, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 52);
        ctx.lineTo(width - 80, 52);
        ctx.stroke();
        ctx.restore();

        // 3. Draw Title
        ctx.save();
        ctx.fillStyle = currentQrStyle === 'midnight' ? '#ffffff' : '#78350f';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px serif';
        
        const titleText = poem.title || 'Vô Đề';
        const words = titleText.split(' ');
        let currentLine = '';
        let titleLines = [];
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > 320 && i > 0) {
                titleLines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        titleLines.push(currentLine);
        
        let titleY = 85;
        titleLines.forEach((lineText, idx) => {
            ctx.fillText(lineText, width / 2, titleY + idx * 24);
        });
        ctx.restore();

        // 4. Draw Excerpt (First 3 lines of the poem)
        ctx.save();
        ctx.fillStyle = currentQrStyle === 'midnight' ? '#cbd5e1' : '#451a03';
        ctx.font = 'italic 14px serif';
        ctx.textAlign = 'center';
        
        const rawLines = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).slice(0, 3) : [];
        let excerptY = titleY + titleLines.length * 24 + 16;
        
        rawLines.forEach((lineText, idx) => {
            ctx.fillText(lineText, width / 2, excerptY + idx * 20);
        });
        ctx.restore();

        // 5. Draw QR Code
        const qrSize = 140;
        const qrX = (width - qrSize) / 2;
        const qrY = 270;
        const linkUrl = `https://zzcfizz.blog/#poem-${poem.id}`;
        
        const qrDarkColor = currentQrStyle === 'midnight' ? '#110d1c' : '#78350f';
        const qrLightColor = currentQrStyle === 'midnight' ? '#ffffff' : '#fdf6e2';
        
        drawQrCodeCanvas(ctx, linkUrl, qrX, qrY, qrSize, qrDarkColor, qrLightColor);

        // 6. Draw Footer Text
        ctx.save();
        ctx.fillStyle = currentQrStyle === 'midnight' ? '#94a3b8' : '#78350f';
        ctx.font = '500 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QUÉT MÃ ĐỂ ĐỌC BÀI THƠ NÀY', width / 2, qrY + qrSize + 24);
        
        ctx.fillStyle = currentQrStyle === 'midnight' ? 'rgba(99, 102, 241, 0.7)' : 'rgba(180, 83, 9, 0.7)';
        ctx.font = '400 10px sans-serif';
        ctx.fillText('zzcfizz.blog', width / 2, qrY + qrSize + 40);
        ctx.restore();
    }

    // ----------------------------------------------------------------------
    // Poetry AI Chatbot & Recommendation Engine
    // ----------------------------------------------------------------------
    function toggleBotDrawer() {
        if (!poemBotDrawer) return;
        poemBotDrawer.hidden = !poemBotDrawer.hidden;
        if (!poemBotDrawer.hidden && botInput) {
            botInput.focus();
        }
    }

    function searchPoemsWithBot(queryStr) {
        const poems = getPoemsData();
        if (!poems || poems.length === 0) return [];

        const q = queryStr.toLowerCase().trim();
        const keywords = q.split(/\s+/).filter(w => w.length > 1);

        const scored = poems.map(p => {
            let score = 0;
            const title = (p.title || '').toLowerCase();
            const content = (p.content_text || '').toLowerCase();

            if (title.includes(q)) score += 25;
            keywords.forEach(kw => {
                if (title.includes(kw)) score += 10;
                // Count occurrences without a RegExp: raw user input as a regex can throw
                // on special chars (e.g. "(", "["), and split avoids per-poem regex compiles.
                const matches = content.split(kw).length - 1;
                score += matches * 3;
            });

            return { poem: p, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.filter(s => s.score > 0).slice(0, 3).map(s => s.poem);
    }

    function handleBotQuery(queryText) {
        if (!queryText || !queryText.trim()) return;
        const query = queryText.trim();

        appendChatMessage('user', query);
        if (botInput) botInput.value = '';

        setTimeout(() => {
            const matches = searchPoemsWithBot(query);
            if (matches.length > 0) {
                const replyText = `Dựa trên cảm xúc và từ khóa “**${query}**”, tôi gợi ý ${matches.length} bài thơ đặc sắc phù hợp nhất dành cho bạn:`;
                appendChatMessage('bot', replyText, matches);
            } else {
                const poems = getPoemsData();
                const randomPoem = poems[Math.floor(Math.random() * poems.length)];
                const replyText = `Tôi chưa tìm thấy bài thơ khớp hoàn toàn với từ khóa “**${query}**”, nhưng xin gợi ý cho bạn bài thơ rất được yêu thích này:`;
                appendChatMessage('bot', replyText, [randomPoem]);
            }
        }, 300);
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function appendChatMessage(sender, text, recommendations = []) {
        if (!botChatBody) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}-msg`;

        let recsHtml = '';
        if (recommendations && recommendations.length > 0) {
            recommendations.forEach(poem => {
                const lines = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).slice(0, 2) : [];
                const snippet = lines.join('\n');
                recsHtml += `
                    <div class="bot-recommendation-card">
                        <div class="bot-rec-title">📜 ${escapeHtml(poem.title)}</div>
                        <div class="bot-rec-excerpt">"${escapeHtml(snippet)}..."</div>
                        <button class="btn btn-sm btn-primary bot-rec-btn" data-poem-id="${poem.id}">
                            <i class="ri-book-open-line"></i> Đọc Bài Thơ
                        </button>
                    </div>
                `;
            });
        }

        // Escape first (untrusted user query flows into `text`), then re-enable **bold** only.
        const safeText = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        msgDiv.innerHTML = `
            <div class="msg-bubble">${safeText}</div>
            ${recsHtml}
        `;

        msgDiv.querySelectorAll('.bot-rec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pId = parseInt(btn.dataset.poemId, 10);
                const idx = filteredPoemsList.findIndex(p => p.id === pId);
                if (idx !== -1) {
                    openReaderModal(idx);
                } else {
                    currentFilter = 'all';
                    document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
                    renderPoems();
                    const newIdx = filteredPoemsList.findIndex(p => p.id === pId);
                    if (newIdx !== -1) openReaderModal(newIdx);
                }
            });
        });

        botChatBody.appendChild(msgDiv);
        botChatBody.scrollTop = botChatBody.scrollHeight;
    }

    // ----------------------------------------------------------------------
    // Lightbox & Toast
    // ----------------------------------------------------------------------
    function openLightbox(imgSrc, poem) {
        lightboxImg.src = imgSrc;
        lightboxTitle.textContent = poem.title;
        lightboxGoToPoemBtn.onclick = () => {
            lightboxModal.close();
            const idx = filteredPoemsList.findIndex(p => p.id === poem.id);
            if (idx !== -1) {
                openReaderModal(idx);
            } else {
                currentFilter = 'all';
                document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
                renderPoems();
                const newIdx = filteredPoemsList.findIndex(p => p.id === poem.id);
                if (newIdx !== -1) openReaderModal(newIdx);
            }
        };
        if (lightboxModal && !lightboxModal.open) {
            lightboxModal.showModal();
        }
    }

    let toastTimeout = null;
    function showToast(msg) {
        // The toast element isn't in index.html, so create it lazily (and reuse it).
        let toastEl = document.getElementById('toast');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'toast';
            toastEl.className = 'toast-container';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        // Use display (not [hidden]) — the .toast-container rule sets display:flex and would win over [hidden].
        toastEl.style.display = 'flex';
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.style.display = 'none';
        }, 3000);
    }

    // ----------------------------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------------------------
    function setupEventListeners() {
        // Search Input (debounced render; button state stays instant)
        let searchDebounce = null;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                if (clearSearchBtn) clearSearchBtn.hidden = searchQuery.length === 0;
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(renderPoems, 150);
            });
        }

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                searchQuery = '';
                clearSearchBtn.hidden = true;
                renderPoems();
            });
        }

        if (resetFilterBtn) {
            resetFilterBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                searchQuery = '';
                currentFilter = 'all';
                document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
                if (clearSearchBtn) clearSearchBtn.hidden = true;
                renderPoems();
            });
        }

        // Category Pills & Mood Filters
        if (categoryPills) {
            categoryPills.addEventListener('click', (e) => {
                const btn = e.target.closest('.pill-btn');
                if (!btn) return;
                document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderPoems();
            });
        }

        // Sort Select
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                renderPoems();
            });
        }

        // View Mode Switcher
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                renderPoems();
            });
        });

        // Random Poem Button
        if (randomPoemBtn) {
            randomPoemBtn.addEventListener('click', () => {
                const data = getPoemsData();
                if (!data || data.length === 0) return;

                if (!filteredPoemsList || filteredPoemsList.length === 0) {
                    filteredPoemsList = getFilteredPoems();
                }
                if (filteredPoemsList.length === 0) {
                    filteredPoemsList = [...data];
                }

                const randomIndex = Math.floor(Math.random() * filteredPoemsList.length);
                openReaderModal(randomIndex);
                showToast('🎲 Đã mở 1 bài thơ ngẫu nhiên!');
            });
        }


        // Header dropdown menus (Công cụ / Âm thanh / Cài đặt) — mutually exclusive
        const toolsToggleBtn = document.getElementById('toolsToggleBtn');
        const toolsMenu = document.getElementById('toolsMenu');
        const headerMenus = [
            [toolsToggleBtn, toolsMenu],
            [themeToggleBtn, themeMenu],
        ];
        function syncMenuAria() {
            headerMenus.forEach(([btn, menu]) => {
                if (btn && menu) btn.setAttribute('aria-expanded', String(!menu.hidden));
            });
        }
        function toggleHeaderMenu(target) {
            headerMenus.forEach(([, menu]) => { if (menu && menu !== target) menu.hidden = true; });
            if (target) target.hidden = !target.hidden;
            syncMenuAria();
        }

        if (toolsToggleBtn && toolsMenu) {
            toolsToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleHeaderMenu(toolsMenu); });
            // Close after picking a tool (each item's own handler still fires first).
            toolsMenu.addEventListener('click', (e) => {
                if (e.target.closest('.hdr-menu-item')) { toolsMenu.hidden = true; syncMenuAria(); }
            });
        }

        // Theme / Settings Dropdown
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleHeaderMenu(themeMenu); });
        }

        themeOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                applyTheme(opt.dataset.setTheme);
                themeMenu.hidden = true;
                syncMenuAria();
            });
        });

        // Generic dropdowns for the poem-detail toolbar (data-dd="panelId").
        // Mutually exclusive; closes on outside-click or after an action item.
        function closeAllMdPanels() {
            document.querySelectorAll('.md-dd-panel').forEach(p => { p.hidden = true; });
            document.querySelectorAll('[data-dd]').forEach(b => b.setAttribute('aria-expanded', 'false'));
            document.querySelectorAll('.md-dd-scrim').forEach(s => s.remove());
        }

        document.addEventListener('click', (e) => {
            const ddToggle = e.target.closest('[data-dd]');
            if (ddToggle) {
                e.stopPropagation();
                const panelId = ddToggle.dataset.dd;
                const panel = document.getElementById(panelId);
                if (!panel) return;
                const willOpen = panel.hidden;
                closeAllMdPanels();
                if (willOpen) {
                    panel.hidden = false;
                    ddToggle.setAttribute('aria-expanded', 'true');
                } else {
                    ddToggle.setAttribute('aria-expanded', 'false');
                }
                return;
            }

            const ddItem = e.target.closest('.md-dd-panel .hdr-menu-item');
            if (ddItem) { closeAllMdPanels(); return; }
            if (!e.target.closest('.md-dd-panel')) closeAllMdPanels();
        });

        // ponytail: removed dead mode/align/font-size handlers — their button IDs
        // (mode*Btn, fontAlign*, btnFont*) don't exist in HTML. Live controls use
        // .align-btn (data-align), #fontIncBtn/#fontDecBtn, and the amber filter btn.



        // Quote Card Modal Events
        if (quoteCardBtn) {
            quoteCardBtn.addEventListener('click', () => {
                renderQuoteCardCanvas();
                if (quoteCardModal && !quoteCardModal.open) quoteCardModal.showModal();
            });
        }
        if (closeQuoteModalBtn) {
            closeQuoteModalBtn.addEventListener('click', () => quoteCardModal.close());
        }

        const cardAspectGrid = document.getElementById('cardAspectGrid');
        if (cardAspectGrid) {
            cardAspectGrid.querySelectorAll('.card-aspect-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    cardAspectGrid.querySelectorAll('.card-aspect-opt').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    currentCardAspect = opt.dataset.aspect;
                    renderQuoteCardCanvas();
                });
            });
        }

        if (cardThemeGrid) {
            cardThemeGrid.querySelectorAll('.card-style-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    cardThemeGrid.querySelectorAll('.card-style-opt').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    currentCardStyle = opt.dataset.style;
                    renderQuoteCardCanvas();
                });
            });
        }

        if (quoteLinesSelect) {
            quoteLinesSelect.addEventListener('change', () => {
                renderQuoteCardCanvas();
            });
        }

        if (downloadCardBtn && quoteCanvas) {
            downloadCardBtn.addEventListener('click', () => {
                const poem = filteredPoemsList[activePoemIndex];
                const titleSlug = (poem ? poem.title : 'poem').replace(/[^a-zA-Z0-9_]/g, '_');
                const link = document.createElement('a');
                link.download = `ThiepTho_${titleSlug}.png`;
                link.href = quoteCanvas.toDataURL('image/png');
                link.click();
                showToast('🖼️ Đã tải thiệp thơ PNG về máy!');
            });
        }

        // QR Badge Modal Events
        if (modalQrBadgeBtn) {
            modalQrBadgeBtn.addEventListener('click', () => {
                renderQrBadgeCanvas();
                if (qrBadgeModal && !qrBadgeModal.open) qrBadgeModal.showModal();
            });
        }
        if (closeQrBadgeModalBtn) {
            closeQrBadgeModalBtn.addEventListener('click', () => qrBadgeModal.close());
        }
        if (qrStyleMidnight) {
            qrStyleMidnight.addEventListener('click', () => {
                qrStyleMidnight.classList.add('active');
                if (qrStylePaper) qrStylePaper.classList.remove('active');
                currentQrStyle = 'midnight';
                renderQrBadgeCanvas();
            });
        }
        if (qrStylePaper) {
            qrStylePaper.addEventListener('click', () => {
                qrStylePaper.classList.add('active');
                if (qrStyleMidnight) qrStyleMidnight.classList.remove('active');
                currentQrStyle = 'paper';
                renderQrBadgeCanvas();
            });
        }
        if (downloadQrBadgeBtn && qrBadgeCanvas) {
            downloadQrBadgeBtn.addEventListener('click', () => {
                const poem = filteredPoemsList[activePoemIndex];
                const titleSlug = (poem ? poem.title : 'poem').replace(/[^a-zA-Z0-9_]/g, '_');
                const link = document.createElement('a');
                link.download = `TheQR_${titleSlug}.png`;
                link.href = qrBadgeCanvas.toDataURL('image/png');
                link.click();
                showToast('🎫 Đã tải thẻ QR chia sẻ về máy!');
            });
        }

        if (btnAutoScroll) btnAutoScroll.addEventListener('click', toggleAutoScroll);

        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                const selectedFont = e.target.value;
                if (modalPoemText) modalPoemText.style.fontFamily = selectedFont;
                localStorage.setItem('zzcfizz_font_family', selectedFont);
            });
        }

        if (quoteSignatureInput) quoteSignatureInput.addEventListener('input', renderQuoteCardCanvas);
        if (quoteQrCheckbox) quoteQrCheckbox.addEventListener('change', renderQuoteCardCanvas);

        // Zen Mode & Direct Link Share
        if (zenModeBtn) zenModeBtn.addEventListener('click', toggleZenMode);
        if (exitZenBtn) exitZenBtn.addEventListener('click', disableZenMode);

        if (modalShareBtn) {
            modalShareBtn.addEventListener('click', async () => {
                const poem = filteredPoemsList[activePoemIndex];
                if (!poem) return;
                // #poem-<id> is the format checkUrlHashForPoem() opens on load.
                const shareUrl = `${location.origin}${location.pathname}#poem-${poem.id}`;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(shareUrl);
                    } else {
                        throw new Error('clipboard API unavailable');
                    }
                    showToast('🔗 Đã sao chép liên kết bài thơ!');
                } catch (err) {
                    // Fallback for insecure contexts (e.g. plain http): legacy execCommand copy.
                    const ta = document.createElement('textarea');
                    ta.value = shareUrl;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    let ok = false;
                    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
                    document.body.removeChild(ta);
                    showToast(ok ? '🔗 Đã sao chép liên kết bài thơ!' : `🔗 Liên kết: ${shareUrl}`);
                }
            });
        }

        // AI Poetry Bot Events
        if (botToggleBtn) botToggleBtn.addEventListener('click', toggleBotDrawer);
        if (headerBotBtn) headerBotBtn.addEventListener('click', toggleBotDrawer);
        if (closeBotBtn) closeBotBtn.addEventListener('click', () => poemBotDrawer.hidden = true);

        if (botChatForm) {
            botChatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleBotQuery(botInput.value);
            });
        }

        if (chatChipsContainer) {
            chatChipsContainer.querySelectorAll('.chat-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    handleBotQuery(chip.dataset.query);
                });
            });
        }

        // Document global click to close menus
        document.addEventListener('click', (e) => {
            if (themeMenu && !e.target.closest('.theme-dropdown-container')) {
                themeMenu.hidden = true;
            }
            if (toolsMenu && !e.target.closest('.hdr-dd')) {
                toolsMenu.hidden = true;
            }
            syncMenuAria();
        });

        // Modal Controls
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                closeReaderModal();
            });
        }
        if (poemModal) {
            poemModal.addEventListener('click', (e) => {
                if (e.target === poemModal) closeReaderModal();
            });
        }

        if (fontDecBtn) {
            fontDecBtn.addEventListener('click', () => {
                if (fontSizePercentage > 70) {
                    fontSizePercentage -= 10;
                    if (modalPoemText) modalPoemText.style.fontSize = `${fontSizePercentage}%`;
                    if (fontSizeDisplay) fontSizeDisplay.textContent = `${fontSizePercentage}%`;
                }
            });
        }

        if (fontIncBtn) {
            fontIncBtn.addEventListener('click', () => {
                if (fontSizePercentage < 160) {
                    fontSizePercentage += 10;
                    if (modalPoemText) modalPoemText.style.fontSize = `${fontSizePercentage}%`;
                    if (fontSizeDisplay) fontSizeDisplay.textContent = `${fontSizePercentage}%`;
                }
            });
        }

        alignBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                alignBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (modalPoemText) modalPoemText.className = `poem-body-text align-${btn.dataset.align}`;
            });
        });

        if (modalFavBtn) {
            modalFavBtn.addEventListener('click', (e) => {
                const poem = filteredPoemsList[activePoemIndex];
                if (poem) toggleFavorite(poem.id, e);
            });
        }

        if (modalCopyBtn) {
            modalCopyBtn.addEventListener('click', () => {
                const poem = filteredPoemsList[activePoemIndex];
                if (!poem) return;
                const copyText = `« ${poem.title} »\n\n${poem.content_text}\n\n— Võ Hoàng Thắng (ZzCFIzZ)\nhttps://zzcfizz.blog/#poem-${poem.id}`;
                navigator.clipboard.writeText(copyText).then(() => {
                    showToast('📋 Đã sao chép toàn bộ bài thơ!');
                });
            });
        }

        if (ttsPlayBtn) {
            ttsPlayBtn.addEventListener('click', toggleTts);
        }

        if (ttsVoiceSelect) {
            ttsVoiceSelect.addEventListener('change', (e) => {
                localStorage.setItem('zzcfizz_tts_voice_uri', e.target.value);
                if (isTtsPlaying) {
                    startTts(); // Restart with new selected voice
                }
            });
        }

        // Initialize TTS Voices
        populateTtsVoices();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = populateTtsVoices;
        }

        if (firstPoemBtn) {
            firstPoemBtn.addEventListener('click', () => {
                openReaderModal(0);
                showToast('⏮️ Bài thơ đầu tiên');
            });
        }

        if (prevPoemBtn) {
            prevPoemBtn.addEventListener('click', () => {
                openReaderModal(activePoemIndex - 1);
            });
        }

        if (nextPoemBtn) {
            nextPoemBtn.addEventListener('click', () => {
                openReaderModal(activePoemIndex + 1);
            });
        }

        if (lastPoemBtn) {
            lastPoemBtn.addEventListener('click', () => {
                openReaderModal(filteredPoemsList.length - 1);
                showToast('⏭️ Bài thơ cuối cùng');
            });
        }

        // ------------------------------------------------------------------
        // Touch Swipe Left / Right Gesture Navigation for Mobile Reader
        // ------------------------------------------------------------------
        let touchStartX = 0;
        let touchStartY = 0;

        function bindSwipe(el) {
            if (!el) return;
            el.addEventListener('touchstart', (e) => {
                if (!e.touches || e.touches.length === 0) return;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            el.addEventListener('touchend', (e) => {
                if (!e.changedTouches || e.changedTouches.length === 0) return;
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;

                const diffX = touchEndX - touchStartX;
                const diffY = touchEndY - touchStartY;

                // Thresholds: horizontal swipe > 35px & horizontal movement dominates vertical scroll
                if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
                    if (diffX < 0) {
                        // Swipe Left -> Next Poem
                        if (activePoemIndex < filteredPoemsList.length - 1) {
                            openReaderModal(activePoemIndex + 1);
                            showToast('👉 Bài tiếp theo');
                        }
                    } else {
                        // Swipe Right -> Previous Poem
                        if (activePoemIndex > 0) {
                            openReaderModal(activePoemIndex - 1);
                            showToast('👈 Bài trước đó');
                        }
                    }
                }
            }, { passive: true });
        }

        if (poemModal) {
            // Bind once on the outermost element only — touchend bubbles up from
            // inner nodes, so binding on .modal-card / .modal-body too would fire
            // the handler 3× per swipe and jump 3 poems at once.
            bindSwipe(poemModal);
        }

        // ------------------------------------------------------------------
        // Continue Reading Check
        // ------------------------------------------------------------------
        function checkContinueReadingBanner() {
            // localStorage stores strings; poem ids are numbers — parse before comparing.
            const lastId = parseInt(localStorage.getItem('zzcfizz_last_read_poem_id'), 10);
            const continueBanner = document.getElementById('continueReadingBanner');
            const continueTitle = document.getElementById('continuePoemTitle');
            const continueBtn = document.getElementById('continueReadingBtn');

            if (!lastId || !continueBanner || !continueTitle || !continueBtn) return;

            const allPoems = getPoemsData();
            const poem = allPoems.find(p => p.id === lastId);

            if (poem) {
                continueTitle.textContent = poem.title;
                continueBanner.hidden = false;

                continueBtn.onclick = () => {
                    const pIdx = filteredPoemsList.findIndex(p => p.id === poem.id);
                    if (pIdx !== -1) {
                        openReaderModal(pIdx);
                    } else {
                        currentFilter = 'all';
                        renderPoems();
                        const newIdx = filteredPoemsList.findIndex(p => p.id === poem.id);
                        if (newIdx !== -1) openReaderModal(newIdx);
                    }
                    continueBanner.hidden = true;
                };
            }
        }

        checkContinueReadingBanner();

        // Window Scroll for Back to Top Button & List View Controls Collapsing
        let lastWinScrollY = 0;
        const controlsBar = document.querySelector('.controls-bar');
        const floatingExpandFilterBtn = document.getElementById('floatingExpandFilterBtn');
        const siteHeader = document.querySelector('.site-header');
        const navExpandBtn = document.getElementById('navExpandBtn');

        // Don't condense the pill while the user is typing in search or has a
        // header dropdown open.
        const headerInUse = () => {
            if (!siteHeader) return false;
            if (document.activeElement && document.activeElement !== document.body &&
                siteHeader.contains(document.activeElement)) return true;
            return !!siteHeader.querySelector('.hdr-menu:not([hidden]), .theme-menu:not([hidden])');
        };

        window.addEventListener('scroll', () => {
            const currentY = window.scrollY;
            if (backToTopBtn) {
                backToTopBtn.hidden = currentY < 300;
            }

            // Only condense header on desktop/tablet views to prevent lag on mobile scroll
            if (window.innerWidth > 768) {
                if (siteHeader) {
                    if (currentY > 200 && currentY > lastWinScrollY + 12 && !headerInUse()) {
                        siteHeader.classList.add('is-condensed');
                    } else if (currentY <= 80) {
                        siteHeader.classList.remove('is-condensed');
                    }
                }
            } else {
                if (siteHeader) siteHeader.classList.remove('is-condensed');
                
                // On Mobile: Condense controlsBar into the floating action button when scrolling down, expand on scroll up
                if (currentY > 120 && currentY > lastWinScrollY + 6) {
                    if (controlsBar && !controlsBar.classList.contains('is-collapsed-by-user')) {
                        controlsBar.classList.add('is-collapsed');
                        if (floatingExpandFilterBtn) floatingExpandFilterBtn.classList.add('is-visible');
                    }
                } else if (currentY < lastWinScrollY - 6 || currentY <= 50) {
                    if (controlsBar) {
                        controlsBar.classList.remove('is-collapsed', 'is-collapsed-by-user');
                        if (floatingExpandFilterBtn) floatingExpandFilterBtn.classList.remove('is-visible');
                    }
                }
            }
            lastWinScrollY = currentY;
        }, { passive: true });

        if (navExpandBtn && siteHeader) {
            navExpandBtn.addEventListener('click', () => {
                siteHeader.classList.remove('is-condensed');
                lastWinScrollY = window.scrollY; // avoid instant re-condense
            });
        }

        if (floatingExpandFilterBtn) {
            floatingExpandFilterBtn.addEventListener('click', () => {
                if (controlsBar) {
                    const isCollapsed = controlsBar.classList.contains('is-collapsed');
                    if (isCollapsed) {
                        controlsBar.classList.remove('is-collapsed', 'is-collapsed-by-user');
                        floatingExpandFilterBtn.classList.remove('is-visible');
                    } else {
                        controlsBar.classList.add('is-collapsed');
                        controlsBar.classList.add('is-collapsed-by-user');
                        floatingExpandFilterBtn.classList.add('is-visible');
                    }
                }
            });
        }

        // Poem Detail Modal Card Scroll for Auto Collapsing Actions (Removed auto-collapse on scroll to prevent lag)

        if (toggleModalActionsBtn && modalHeader) {
            toggleModalActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                modalHeader.classList.add('actions-manual-toggled');
                const isCollapsed = modalHeader.classList.toggle('actions-collapsed');
                toggleModalActionsBtn.classList.toggle('active', isCollapsed);
                localStorage.setItem('zzcfizz_reader_header_collapsed', isCollapsed ? 'true' : 'false');
                if (isCollapsed) {
                    showToast('📐 Đã thu gọn thanh công cụ đọc thơ');
                } else {
                    showToast('📖 Đã mở rộng thanh công cụ đọc thơ');
                }
            });
        }

        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Lightbox Close
        if (closeLightboxBtn && lightboxModal) {
            closeLightboxBtn.addEventListener('click', () => lightboxModal.close());
        }
        if (lightboxModal) {
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal) lightboxModal.close();
            });
        }
    }

    // ----------------------------------------------------------------------
    // Keyboard Shortcuts
    // ----------------------------------------------------------------------
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K opens the command palette (handled in initCommandPalette).

            // Esc to exit Zen mode
            if (e.key === 'Escape' && isZenMode) {
                disableZenMode();
            }

            // Keyboard navigation inside poem modal.
            // Skip keys aimed at form controls (voice/speed/font selects,
            // sliders): Home/End/arrows must keep their native behavior there.
            const inFormControl = e.target && e.target.closest
                && e.target.closest('input, textarea, select');
            if (poemModal.open && !inFormControl) {
                if (e.key === 'Home' || (e.shiftKey && e.key === 'ArrowLeft')) {
                    e.preventDefault();
                    openReaderModal(0);
                    showToast('⏮️ Bài thơ đầu tiên');
                } else if (e.key === 'End' || (e.shiftKey && e.key === 'ArrowRight')) {
                    e.preventDefault();
                    openReaderModal(filteredPoemsList.length - 1);
                    showToast('⏭️ Bài thơ cuối cùng');
                } else if (e.key === 'ArrowLeft' && activePoemIndex > 0) {
                    e.preventDefault();
                    openReaderModal(activePoemIndex - 1);
                } else if (e.key === 'ArrowRight' && activePoemIndex < filteredPoemsList.length - 1) {
                    e.preventDefault();
                    openReaderModal(activePoemIndex + 1);
                }
            }
        });
    }

        // ------------------------------------------------------------------
        // E-Book PDF Exporter
        // ------------------------------------------------------------------
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', exportPoetryEBookPdf);
        }

        function exportPoetryEBookPdf() {
            const allPoems = getPoemsData();
            const exportList = favorites.length > 0
                ? allPoems.filter(p => favorites.includes(p.id))
                : allPoems.slice(0, 30);

            if (exportList.length === 0) {
                showToast('⚠️ Chưa có bài thơ nào trong danh sách!');
                return;
            }

            const printWin = window.open('', '_blank');
            if (!printWin) {
                showToast('⚠️ Vui lòng cho phép mở cửa sổ mới để xuất PDF!');
                return;
            }

            const dateStr = new Date().toLocaleDateString('vi-VN');
            let htmlContent = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Tuyển Tập Thơ ZzCFIzZ - E-Book</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
                    body { font-family: 'Lora', serif; color: #1a1a1a; margin: 0; padding: 0; background: #ffffff; }
                    .cover-page { height: 95vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; border: 3px double #b05010; margin: 20px; padding: 40px; box-sizing: border-box; }
                    .cover-title { font-family: 'Cormorant Garamond', serif; font-size: 46px; color: #b05010; margin-bottom: 10px; }
                    .cover-subtitle { font-size: 16px; color: #666; margin-bottom: 30px; font-style: italic; }
                    .poem-page { padding: 40px 50px; page-break-after: always; box-sizing: border-box; min-height: 85vh; }
                    .poem-header { text-align: center; margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
                    .poem-title { font-family: 'Cormorant Garamond', serif; font-size: 30px; color: #111; margin: 0 0 6px 0; }
                    .poem-date { font-size: 12px; color: #777; }
                    .poem-content { font-size: 17px; line-height: 1.6; white-space: pre-wrap; text-align: center; color: #222; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="position:fixed; top:15px; right:15px; z-index:999;">
                    <button onclick="window.print()" style="padding:10px 22px; background:#b05010; color:#fff; border:none; border-radius:20px; font-size:14px; cursor:pointer; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.2);">🖨️ In / Xuất File PDF</button>
                </div>
                <div class="cover-page">
                    <div class="cover-title">TUYỂN TẬP THƠ HAY</div>
                    <div class="cover-subtitle">ZzCFIzZ Poetry Collection • ${dateStr}</div>
                    <p style="margin-top:40px; font-size:14px; color:#888;">Gồm ${exportList.length} tác phẩm chọn lọc</p>
                </div>
            `;

            exportList.forEach((poem, idx) => {
                htmlContent += `
                    <div class="poem-page">
                        <div class="poem-header">
                            <h2 class="poem-title">${idx + 1}. ${poem.title}</h2>
                            <div class="poem-date">${poem.date_formatted || ''}</div>
                        </div>
                        <div class="poem-content">${poem.content_text}</div>
                    </div>
                `;
            });

            htmlContent += `
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 800);
                    }
                </script>
            </body>
            </html>
            `;

            printWin.document.write(htmlContent);
            printWin.document.close();
        }

        // ------------------------------------------------------------------
        // Command Palette (Ctrl + K)
        // ------------------------------------------------------------------
        function initCommandPalette() {
            const commandPaletteModal = document.getElementById('commandPaletteModal');
            const cmdInput = document.getElementById('cmdInput');
            const cmdResultsList = document.getElementById('cmdResultsList');

            if (!commandPaletteModal || !cmdInput || !cmdResultsList) return;

            const commands = [
                { title: '🌙 Đọc Đêm OLED True-Black & Amber Shift', action: () => { document.getElementById('oledNightBtn')?.click(); } },
                { title: '🌐 Thơ Song Ngữ Anh - Việt (Bilingual)', action: () => { document.getElementById('bilingualPoetryBtn')?.click(); } },
                { title: '🎲 Đọc Bài Thơ Ngẫu Nhiên', action: () => { document.getElementById('randomPoemBtn')?.click(); } },
                { title: '📄 Xuất Tập Thơ PDF / E-Book', action: exportPoetryEBookPdf },
                { title: '🤖 Trợ Lý Thơ AI Antigravity', action: () => { document.getElementById('headerBotBtn')?.click(); } },
                { title: '🌌 Đổi Theme: Midnight Glow', action: () => applyTheme('theme-midnight') },
                { title: '🕯️ Đổi Theme: Charcoal Dark', action: () => applyTheme('theme-dark') },
                { title: '📜 Đổi Theme: Warm Paper Sepia', action: () => applyTheme('theme-paper') },
                { title: '❄️ Đổi Theme: Nordic Light', action: () => applyTheme('theme-nordic') },
                { title: '🎛️ Chế Độ Tập Trung (Zen Mode)', action: () => { const p = filteredPoemsList[0]; if (p) openReaderModal(0); enableZenMode(); } }
            ];

            function renderCmdList(filterQuery = '') {
                cmdResultsList.innerHTML = '';
                const q = filterQuery.toLowerCase().trim();

                const filteredCmds = commands.filter(c => c.title.toLowerCase().includes(q));
                const allPoems = getPoemsData();
                const matchedPoems = q.length > 0 ? allPoems.filter(p => p.title.toLowerCase().includes(q)).slice(0, 5) : [];

                filteredCmds.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'cmd-item';
                    div.innerHTML = `<i class="ri-terminal-box-line"></i> <span>${c.title}</span>`;
                    div.onclick = () => {
                        commandPaletteModal.close();
                        c.action();
                    };
                    cmdResultsList.appendChild(div);
                });

                matchedPoems.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'cmd-item';
                    div.innerHTML = `<i class="ri-quill-pen-line"></i> <span>Mở bài thơ: <strong>${p.title}</strong></span>`;
                    div.onclick = () => {
                        commandPaletteModal.close();
                        const idx = filteredPoemsList.findIndex(item => item.id === p.id);
                        if (idx !== -1) openReaderModal(idx);
                    };
                    cmdResultsList.appendChild(div);
                });
            }

            cmdInput.addEventListener('input', (e) => renderCmdList(e.target.value));

            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    renderCmdList('');
                    commandPaletteModal.showModal();
                    cmdInput.focus();
                }
            });
        }
        initCommandPalette();

        // ------------------------------------------------------------------
        // Amber Night Filter Logic
        // ------------------------------------------------------------------
        function initAmberFilter() {
            const amberFilterBtn = document.getElementById('amberFilterBtn');
            const toggleAmberFilterBtn = document.getElementById('toggleAmberFilterBtn');
            const amberOverlay = document.getElementById('amberOverlay');

            const isAmberSaved = localStorage.getItem('zzcfizz_amber_filter') === 'true';
            if (isAmberSaved && amberOverlay) {
                amberOverlay.hidden = false;
                if (amberFilterBtn) amberFilterBtn.classList.add('active');
                if (toggleAmberFilterBtn) toggleAmberFilterBtn.classList.add('active');
            }

            function toggleAmber() {
                if (!amberOverlay) return;
                const isHidden = amberOverlay.hidden;
                amberOverlay.hidden = !isHidden;
                localStorage.setItem('zzcfizz_amber_filter', isHidden ? 'true' : 'false');

                if (amberFilterBtn) amberFilterBtn.classList.toggle('active', isHidden);
                if (toggleAmberFilterBtn) toggleAmberFilterBtn.classList.toggle('active', isHidden);

                if (isHidden) {
                    showToast('🕯️ Đã bật Bộ Lọc Đêm Amber Dịu Mắt');
                } else {
                    showToast('☀️ Đã tắt Bộ Lọc Đêm Amber');
                }
            }

            if (amberFilterBtn) amberFilterBtn.addEventListener('click', toggleAmber);
            if (toggleAmberFilterBtn) toggleAmberFilterBtn.addEventListener('click', toggleAmber);
        }
        initAmberFilter();

        // ------------------------------------------------------------------
        // Backdrop Library Presets
        // ------------------------------------------------------------------
        function initBackdropPresets() {
            const backdropPresetSelect = document.getElementById('backdropPresetSelect');
            const modalCard = poemModal ? poemModal.querySelector('.modal-card') : null;

            if (!backdropPresetSelect || !modalCard) return;

            const presetUrls = {
                fog: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200',
                autumn: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=1200',
                rain: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=1200'
            };

            function applyBackdrop(val) {
                if (val === 'default') {
                    modalCard.style.backgroundImage = '';
                } else if (presetUrls[val]) {
                    modalCard.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url("${presetUrls[val]}")`;
                    modalCard.style.backgroundSize = 'cover';
                    modalCard.style.backgroundPosition = 'center';
                }
            }

            backdropPresetSelect.addEventListener('change', (e) => {
                applyBackdrop(e.target.value);
            });
        }
        initBackdropPresets();

        // ------------------------------------------------------------------
        // Top Reading Progress Bar Logic
        // ------------------------------------------------------------------
        function initTopReadingProgressBar() {
            const topBar = document.getElementById('topReadingProgressBar');
            const modalBody = document.getElementById('modalBody');

            if (!topBar) return;

            window.addEventListener('scroll', () => {
                if (!poemModal || !poemModal.open) {
                    const scrollTop = window.scrollY;
                    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
                    topBar.style.width = `${pct}%`;
                }
            }, { passive: true });

            if (modalBody) {
                modalBody.addEventListener('scroll', () => {
                    if (poemModal && poemModal.open) {
                        const scrollTop = modalBody.scrollTop;
                        const scrollHeight = modalBody.scrollHeight - modalBody.clientHeight;
                        const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 100;
                        topBar.style.width = `${pct}%`;
                    }
                }, { passive: true });
            }
        }
        initTopReadingProgressBar();

        // ------------------------------------------------------------------
        // Time-of-Day Sky Ambiance
        // ------------------------------------------------------------------
        function initTimeOfDayAmbiance() {
            const hour = new Date().getHours();
            const orb1 = document.querySelector('.orb-1');
            const orb2 = document.querySelector('.orb-2');

            if (hour >= 6 && hour < 12) {
                if (orb1) orb1.style.background = 'radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 70%)';
            } else if (hour >= 17 && hour < 20) {
                if (orb1) orb1.style.background = 'radial-gradient(circle, rgba(244, 63, 94, 0.45), transparent 70%)';
                if (orb2) orb2.style.background = 'radial-gradient(circle, rgba(217, 70, 239, 0.35), transparent 70%)';
            } else {
                if (orb1) orb1.style.background = 'radial-gradient(circle, rgba(168, 85, 247, 0.45), transparent 70%)';
            }
        }
        initTimeOfDayAmbiance();

        // Spacebar shortcut for Hands-Free TTS & Auto-Scroll
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && poemModal && poemModal.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                toggleTts();
                toggleAutoScroll();
            }
        });

        // ------------------------------------------------------------------
        // Theater Mode Logic
        // ------------------------------------------------------------------

        function initTheaterMode() {
            const theaterModeBtn = document.getElementById('theaterModeBtn');
            if (!theaterModeBtn || !poemModal) return;

            function exitTheater() {
                if (!poemModal.classList.contains('theater-mode-active')) return;
                poemModal.classList.remove('theater-mode-active');
                theaterModeBtn.classList.remove('active');
                showToast('🎭 Đã thoát Chế Độ Rạp Chiếu Thơ');
            }

            // Theater mode hides the toolbar (incl. this button), so add a floating
            // exit button — otherwise there's no way back without closing the reader.
            let exitBtn = poemModal.querySelector('#exitTheaterBtn');
            if (!exitBtn) {
                exitBtn = document.createElement('button');
                exitBtn.id = 'exitTheaterBtn';
                exitBtn.className = 'exit-theater-btn';
                exitBtn.title = 'Thoát rạp chiếu thơ (Esc)';
                exitBtn.innerHTML = '<i class="ri-close-line"></i> Thoát rạp chiếu';
                exitBtn.addEventListener('click', exitTheater);
                poemModal.appendChild(exitBtn);
            }

            theaterModeBtn.addEventListener('click', () => {
                const isTheater = poemModal.classList.toggle('theater-mode-active');
                theaterModeBtn.classList.toggle('active', isTheater);
                showToast(isTheater
                    ? '🎭 Đã mở Chế Độ Rạp Chiếu Thơ Tràn Màn Hình (Esc để thoát)'
                    : '🎭 Đã thoát Chế Độ Rạp Chiếu Thơ');
            });

            // In theater mode, Esc exits theater instead of closing the whole reader.
            poemModal.addEventListener('cancel', (e) => {
                if (poemModal.classList.contains('theater-mode-active')) {
                    e.preventDefault();
                    exitTheater();
                }
            });
        }
        initTheaterMode();

        // ------------------------------------------------------------------
        // Bedtime Greeting
        // ------------------------------------------------------------------
        function checkBedtimeGreeting() {
            const hour = new Date().getHours();
            if (hour >= 22 || hour < 5) {
                setTimeout(() => {
                    showToast('🌙 Đêm đã về khuya, chúc bạn tìm thấy chút bình yên qua những vần thơ...');
                }, 1800);
            }
        }
        checkBedtimeGreeting();
        // ------------------------------------------------------------------
        // Parchment Paper Texture & Print Poem Layout
        // ------------------------------------------------------------------
        function initParchmentMode() {
            const parchmentToggleBtn = document.getElementById('parchmentToggleBtn');
            if (!parchmentToggleBtn || !poemModal) return;

            const modalCard = poemModal.querySelector('.modal-card');
            parchmentToggleBtn.addEventListener('click', () => {
                const isParchment = modalCard.classList.toggle('parchment-mode');
                parchmentToggleBtn.classList.toggle('active', isParchment);
                if (isParchment) {
                    showToast('📜 Đã bật chất liệu Giấy Da Dê Cổ');
                } else {
                    showToast('📜 Đã tắt chất liệu Giấy Cổ');
                }
            });
        }
        initParchmentMode();

        function initPrintPoem() {
            const printPoemBtn = document.getElementById('printPoemBtn');
            if (!printPoemBtn) return;

            printPoemBtn.addEventListener('click', () => {
                showToast('🖨️ Đang mở trang in thơ nghệ thuật (A5 Layout)...');
                setTimeout(() => window.print(), 500);
            });
        }
        initPrintPoem();

        // ------------------------------------------------------------------
        // System Settings & Feature Manager Logic
        // ------------------------------------------------------------------
        function initSystemSettings() {
            const systemSettingsBtn = document.getElementById('systemSettingsBtn');
            const systemSettingsModal = document.getElementById('systemSettingsModal');
            const closeSettingsBtn = document.getElementById('closeSettingsBtn');
            const enableAllFeaturesBtn = document.getElementById('enableAllFeaturesBtn');
            const disableAllFeaturesBtn = document.getElementById('disableAllFeaturesBtn');
            const resetFeaturesBtn = document.getElementById('resetFeaturesBtn');
            const featureChecks = document.querySelectorAll('.feature-toggle-check');

            if (!systemSettingsModal) return;

            const savedSettings = readJson('zzcfizz_system_settings', {});

            featureChecks.forEach(check => {
                const key = check.dataset.feature;
                if (savedSettings.hasOwnProperty(key)) {
                    check.checked = savedSettings[key];
                }
                applyFeatureState(check);

                check.addEventListener('change', () => {
                    savedSettings[key] = check.checked;
                    localStorage.setItem('zzcfizz_system_settings', JSON.stringify(savedSettings));
                    applyFeatureState(check);
                    showToast(`⚙️ Đã ${check.checked ? 'bật' : 'tắt'} tính năng`);
                });
            });

            function applyFeatureState(check) {
                const key = check.dataset.feature;
                const isEnabled = check.checked;
                const targetSelector = check.dataset.target;

                if (targetSelector) {
                    const targets = document.querySelectorAll(targetSelector);
                    targets.forEach(el => {
                        el.style.display = isEnabled ? '' : 'none';
                    });
                }
            }

            if (systemSettingsBtn) {
                systemSettingsBtn.addEventListener('click', () => systemSettingsModal.showModal());
            }

            if (closeSettingsBtn) {
                closeSettingsBtn.onclick = () => systemSettingsModal.close();
            }

            if (enableAllFeaturesBtn) {
                enableAllFeaturesBtn.onclick = () => {
                    featureChecks.forEach(check => {
                        check.checked = true;
                        const key = check.dataset.feature;
                        savedSettings[key] = true;
                        applyFeatureState(check);
                    });
                    localStorage.setItem('zzcfizz_system_settings', JSON.stringify(savedSettings));
                    showToast('✅ Đã bật toàn bộ tất cả nút & tính năng!');
                };
            }

            if (disableAllFeaturesBtn) {
                disableAllFeaturesBtn.onclick = () => {
                    featureChecks.forEach(check => {
                        check.checked = false;
                        const key = check.dataset.feature;
                        savedSettings[key] = false;
                        applyFeatureState(check);
                    });
                    localStorage.setItem('zzcfizz_system_settings', JSON.stringify(savedSettings));
                    showToast('⛔ Đã tắt toàn bộ tất cả nút & tính năng!');
                };
            }

            if (resetFeaturesBtn) {
                resetFeaturesBtn.onclick = () => {
                    localStorage.removeItem('zzcfizz_system_settings');
                    featureChecks.forEach(check => {
                        check.checked = true;
                        applyFeatureState(check);
                    });
                    showToast('🔄 Đã khôi phục cài đặt mặc định!');
                };
            }
        }
        // ------------------------------------------------------------------
        // FEATURE 1: DYNAMIC EMOTION AURA BACKGROUND
        // ------------------------------------------------------------------
        function updateEmotionAura(poem) {
            if (!poem) return;
            const text = (poem.title + ' ' + (poem.content_text || '')).toLowerCase();
            const body = document.body;

            let orb1 = 'rgba(168, 85, 247, 0.25)';
            let orb2 = 'rgba(236, 72, 153, 0.2)';
            let orb3 = 'rgba(245, 158, 11, 0.15)';

            if (text.includes('yêu') || text.includes('thương') || text.includes('tình')) {
                orb1 = 'rgba(244, 63, 94, 0.35)'; // Rose pink
                orb2 = 'rgba(236, 72, 153, 0.25)';
                orb3 = 'rgba(251, 146, 60, 0.2)';
            } else if (text.includes('thu') || text.includes('chiều') || text.includes('lá')) {
                orb1 = 'rgba(245, 158, 11, 0.35)'; // Amber gold
                orb2 = 'rgba(217, 119, 6, 0.25)';
                orb3 = 'rgba(234, 88, 12, 0.2)';
            } else if (text.includes('mưa') || text.includes('đêm') || text.includes('sông')) {
                orb1 = 'rgba(6, 182, 212, 0.35)'; // Cyan blue
                orb2 = 'rgba(59, 130, 246, 0.25)';
                orb3 = 'rgba(99, 102, 241, 0.2)';
            } else if (text.includes('an') || text.includes('thiền') || text.includes('xanh')) {
                orb1 = 'rgba(16, 185, 129, 0.35)'; // Emerald green
                orb2 = 'rgba(52, 211, 153, 0.25)';
                orb3 = 'rgba(20, 184, 166, 0.2)';
            }

            body.style.setProperty('--orb-1', orb1);
            body.style.setProperty('--orb-2', orb2);
            body.style.setProperty('--orb-3', orb3);
        }

        // ------------------------------------------------------------------
        // FEATURE 4: PIN FAVORITE POEM TO TOP BANNER
        // ------------------------------------------------------------------
        function initPinnedPoem() {
            const banner = document.getElementById('pinnedPoemBanner');
            const titleEl = document.getElementById('pinnedPoemTitle');
            const readBtn = document.getElementById('readPinnedPoemBtn');
            const unpinBtn = document.getElementById('unpinPoemBtn');

            function renderPinnedBanner() {
                // localStorage stores strings; poem ids are numbers — parse before comparing.
                const pinnedId = parseInt(localStorage.getItem('zzcfizz_pinned_poem_id'), 10);
                if (!pinnedId || !banner) {
                    if (banner) banner.hidden = true;
                    return;
                }
                const poem = getPoemsData().find(p => p.id === pinnedId);
                if (!poem) {
                    banner.hidden = true;
                    return;
                }
                if (titleEl) titleEl.textContent = poem.title;
                banner.hidden = false;

                if (readBtn) {
                    readBtn.onclick = () => {
                        const idx = filteredPoemsList.findIndex(p => p.id === pinnedId);
                        if (idx !== -1) openReaderModal(idx);
                        else openReaderModal(0);
                    };
                }
                if (unpinBtn) {
                    unpinBtn.onclick = () => {
                        localStorage.removeItem('zzcfizz_pinned_poem_id');
                        renderPinnedBanner();
                        showToast('📌 Đã bỏ ghim bài thơ!');
                    };
                }
            }
            renderPinnedBanner();

            window.pinPoem = (id) => {
                localStorage.setItem('zzcfizz_pinned_poem_id', id);
                renderPinnedBanner();
                showToast('📌 Đã ghim bài thơ lên đầu trang chủ!');
            };
        }
        // ------------------------------------------------------------------
        // FEATURE: BILINGUAL POETRY (VI/EN)
        // ------------------------------------------------------------------
        function initBilingualPoetry() {
            const btn = document.getElementById('bilingualPoetryBtn');
            const modal = document.getElementById('bilingualPoetryModal');
            const closeBtn = document.getElementById('closeBilingualBtn');
            const selectEl = document.getElementById('bilingualPoemSelect');
            const viTitle = document.getElementById('bilingualViTitle');
            const viText = document.getElementById('bilingualViText');
            const enTitle = document.getElementById('bilingualEnTitle');
            const enText = document.getElementById('bilingualEnText');

            if (!modal) return;
            if (btn) {
                btn.addEventListener('click', () => {
                    populateBilingualSelect();
                    renderBilingualPoem(0);
                    modal.showModal();
                });
            }
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

            const translations = [
                {
                    viTitle: 'Con tim là tim của anh',
                    viText: 'Con tim là tim của anh\nMà sao nó mãi chạy quanh chốn nào\nGặp em thì nó hồng hào\nKhông em như nó rơi vào hư không',
                    enTitle: 'My Heart Belongs To Me',
                    enText: 'This heart of mine belongs to me,\nYet wanders far where breezes blow.\nBeside your smile, it glows with grace,\nWithout your eyes, it fades in space.'
                },
                {
                    viTitle: 'Bình Yên',
                    viText: 'Rủ bỏ muộn phiền nơi gót chân\nTrả lại tâm thanh tựa mây trôi\nMột chén trà thơm chiều thắt lại\nBình yên tìm thấy giữa hư không',
                    enTitle: 'Serenity',
                    enText: 'Cast off the troubles at your feet,\nLet your calm soul drift like clouds so sweet.\nA cup of tea as daylight dies,\nPeace found beneath the quiet skies.'
                }
            ];

            function populateBilingualSelect() {
                if (!selectEl) return;
                selectEl.innerHTML = translations.map((t, idx) => `<option value="${idx}">${t.viTitle} (${t.enTitle})</option>`).join('');
                selectEl.onchange = (e) => renderBilingualPoem(parseInt(e.target.value));
            }

            function renderBilingualPoem(idx) {
                const item = translations[idx] || translations[0];
                if (viTitle) viTitle.textContent = item.viTitle;
                if (viText) viText.textContent = item.viText;
                if (enTitle) enTitle.textContent = item.enTitle;
                if (enText) enText.textContent = item.enText;
            }
        }
        initBilingualPoetry();
        // ------------------------------------------------------------------
        // FEATURE: OLED NIGHT MODE (TRUE-BLACK)
        // ------------------------------------------------------------------
        function initOledNightMode() {
            const btn = document.getElementById('oledNightBtn');
            if (!btn) return;

            let isOled = false;
            btn.addEventListener('click', () => {
                isOled = !isOled;
                if (isOled) {
                    document.documentElement.classList.add('theme-oled-trueblack');
                    document.body.style.background = '#000000';
                    showToast('🌙 Đã bật chế độ đọc đêm OLED True-Black & Amber Shift 2700K dịu mắt!');
                } else {
                    document.documentElement.classList.remove('theme-oled-trueblack');
                    document.body.style.background = '';
                    showToast('☀️ Đã trở về giao diện tiêu chuẩn');
                }
            });
        }
        initOledNightMode();

        initPinnedPoem();
        initSystemSettings();

    // Run
    init();
});
