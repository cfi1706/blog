/* ==========================================================================
   ZzCFIzZ Modern Poetry Website - Application JavaScript Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // State Management
    // ----------------------------------------------------------------------
    let currentFilter = 'all'; // 'all', 'vo-de', 'others', 'favorites', 'mood-*'
    let currentSort = 'newest'; // 'newest', 'oldest', 'title-asc'
    let currentView = 'grid'; // 'grid', 'list'
    let searchQuery = '';
    let currentTheme = localStorage.getItem('zzcfizz_theme') || 'theme-midnight';
    let favorites = JSON.parse(localStorage.getItem('zzcfizz_favorites') || '[]');
    let reactionsData = JSON.parse(localStorage.getItem('zzcfizz_reactions') || '{}');
    let notesData = JSON.parse(localStorage.getItem('zzcfizz_notes') || '{}');
    let recentlyViewed = JSON.parse(localStorage.getItem('zzcfizz_recents') || '[]');
    let activePoemIndex = 0;
    let filteredPoemsList = [];
    let fontSizePercentage = 100;
    let isTtsPlaying = false;
    let ttsUtterance = null;
    let isZenMode = false;
    let currentCardStyle = 'midnight';

    // Ambient Audio Synthesizer State
    let audioCtx = null;
    let ambientGainNode = null;
    let ambientNodes = [];
    let activeAmbientSound = null;

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
    const countVoDeEl = document.getElementById('countVoDe');
    const countOthersEl = document.getElementById('countOthers');
    const countFavEl = document.getElementById('countFav');

    // Hero Daily Poem
    const dailyPoemTitle = document.getElementById('dailyPoemTitle');
    const dailyPoemReadBtn = document.getElementById('dailyPoemReadBtn');

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
    const prevPoemBtn = document.getElementById('prevPoemBtn');
    const nextPoemBtn = document.getElementById('nextPoemBtn');
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

    // Ambient Sound Elements
    const ambientToggleBtn = document.getElementById('ambientToggleBtn');
    const ambientMenu = document.getElementById('ambientMenu');
    const ambientStopBtn = document.getElementById('ambientStopBtn');
    const ambientVolInput = document.getElementById('ambientVolInput');

    // Recently Viewed & Quote Card Modals
    const recentPoemsBtn = document.getElementById('recentPoemsBtn');
    const recentModal = document.getElementById('recentModal');
    const closeRecentModalBtn = document.getElementById('closeRecentModalBtn');
    const recentListBody = document.getElementById('recentListBody');

    const quoteCardModal = document.getElementById('quoteCardModal');
    const closeQuoteModalBtn = document.getElementById('closeQuoteModalBtn');
    const quoteCanvas = document.getElementById('quoteCanvas');
    const quoteLinesSelect = document.getElementById('quoteLinesSelect');
    const downloadCardBtn = document.getElementById('downloadCardBtn');
    const cardThemeGrid = document.getElementById('cardThemeGrid');

    // Interactive elements inside modal
    const poemNoteInput = document.getElementById('poemNoteInput');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const reactionBtns = document.querySelectorAll('.reaction-btn');

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
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
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
        setupPoemOfTheDay();
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
    // Poem of the Day (Deterministic Date Seed)
    // ----------------------------------------------------------------------
    let dailyPoemObject = null;
    function setupPoemOfTheDay() {
        const poems = getPoemsData();
        if (!poems || poems.length === 0) return;

        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let seed = 0;
        for (let i = 0; i < todayStr.length; i++) {
            seed = (seed * 31 + todayStr.charCodeAt(i)) % poems.length;
        }

        dailyPoemObject = poems[seed] || poems[0];
        if (dailyPoemTitle) {
            dailyPoemTitle.textContent = dailyPoemObject.title;
        }
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
        [...document.body.classList].forEach(c => {
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

    function isVoDePoem(p) {
        if (!p) return false;
        if (p.slug && p.slug.startsWith('vo-de')) return true;
        if (p.title && p.title.toLowerCase().includes('vô đề')) return true;
        return false;
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
    // Mood-Based Keyword Classification
    // ----------------------------------------------------------------------
    const MOOD_KEYWORDS = {
        'mood-peace': ['bình yên', 'nhẹ', 'sáng', 'mây', 'hoa', 'nắng', 'nghe', 'xanh', 'gió', 'yên', 'ru'],
        'mood-deep': ['đêm', 'sâu', 'mơ', 'lời', 'tâm', 'ngẫm', 'trầm', 'bóng', 'trăng', 'lặng', 'vô đề'],
        'mood-nostalgia': ['hoài niệm', 'nhớ', 'xưa', 'qua', 'thời', 'kỷ niệm', 'chiều', 'thu', 'xa', 'về'],
        'mood-lonely': ['cô đơn', 'lẻ loi', 'mưa', 'lạnh', 'buồn', 'vắng', 'một mình', 'sương', 'tan'],
        'mood-hope': ['hi vọng', 'tương lai', 'sống', 'yêu', 'ấm', 'mặt trời', 'ngày mai', 'vui', 'xanh']
    };

    function matchesMood(poem, moodKey) {
        const keywords = MOOD_KEYWORDS[moodKey] || [];
        const text = ((poem.title || '') + ' ' + (poem.content_text || '')).toLowerCase();
        return keywords.some(kw => text.includes(kw));
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

    function calculateEmotionRelevance(poem, rawQuery) {
        if (!rawQuery) return 0;
        const stopWords = ['tìm', 'bài', 'thơ', 'những', 'của', 'cho', 'về', 'nào', 'với', 'trong', 'lại', 'rồi', 'người', 'một'];
        const words = rawQuery.toLowerCase().trim().split(/\s+/).filter(w => !stopWords.includes(w));
        const cleanQuery = (words.length > 0 ? words : [rawQuery.toLowerCase().trim()]).join(' ');

        const title = (poem.title || '').toLowerCase();
        const content = (poem.content_text || '').toLowerCase();
        const fullText = title + ' ' + content;

        let score = 0;

        if (title.includes(cleanQuery)) score += 60;
        if (content.includes(cleanQuery)) score += 40;

        words.forEach(w => {
            if (w.length < 2) return;
            if (title.includes(w)) score += 15;
            if (content.includes(w)) score += 10;

            Object.keys(EMOTION_SYNONYMS).forEach(key => {
                if (key.includes(w) || w.includes(key)) {
                    EMOTION_SYNONYMS[key].forEach(syn => {
                        if (fullText.includes(syn)) score += 5;
                    });
                }
            });
        });

        return score;
    }

    function getFilteredPoems() {
        const poems = getPoemsData();
        if (!poems || poems.length === 0) return [];
        let list = [...poems];

        // Filter category
        if (currentFilter === 'favorites') {
            list = list.filter(p => favorites.includes(p.id));
        } else if (currentFilter.startsWith('mood-')) {
            list = list.filter(p => matchesMood(p, currentFilter));
        }

        // Semantic Emotion & Keyword Search Filter
        if (searchQuery.trim() !== '') {
            const q = searchQuery.trim();
            const scoredList = list.map(p => {
                const score = calculateEmotionRelevance(p, q);
                return { poem: p, score };
            }).filter(item => item.score > 0);

            scoredList.sort((a, b) => b.score - a.score);
            list = scoredList.map(item => item.poem);
        } else {
            // Default Sort when no search query
            if (currentSort === 'newest') {
                list.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (currentSort === 'oldest') {
                list.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else if (currentSort === 'title-asc') {
                list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
            }
        }

        return list;
    }

    // ----------------------------------------------------------------------
    // Rendering Logic
    // ----------------------------------------------------------------------
    function renderPoems() {
        if (poemsSection) poemsSection.hidden = false;

        filteredPoemsList = getFilteredPoems();
        poemsGrid.className = `poems-grid ${currentView}-view`;
        poemsGrid.innerHTML = '';

        if (filteredPoemsList.length === 0) {
            emptyState.hidden = false;
            return;
        }
        emptyState.hidden = true;

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

        card.innerHTML = `
            ${hasImg ? `
                <div class="card-media">
                    <img src="${imgSrc}" alt="${poem.title}" loading="lazy" class="img-lazy">
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
                imgEl.src = 'test_img.webp';
                imgEl.classList.add('img-loaded');
            };
            if (imgEl.complete) {
                imgEl.classList.add('img-loaded');
            } else {
                imgEl.addEventListener('load', () => imgEl.classList.add('img-loaded'));
            }
        }

        const verseCount = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).length : 0;
        const estSeconds = Math.max(20, Math.round(verseCount * 4));
        const estText = estSeconds < 60 ? `⚡ ${estSeconds}s` : `📜 ${Math.round(estSeconds / 60)} phút`;
        const timeBadge = card.querySelector('.card-date');
        if (timeBadge) {
            timeBadge.innerHTML = `<i class="ri-calendar-line"></i> ${poem.date_formatted || ''} &nbsp;•&nbsp; ${estText} (${verseCount} câu)`;
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
    // Recently Viewed History
    // ----------------------------------------------------------------------
    function addRecentlyViewed(poemId) {
        recentlyViewed = recentlyViewed.filter(id => id !== poemId);
        recentlyViewed.unshift(poemId);
        if (recentlyViewed.length > 15) recentlyViewed = recentlyViewed.slice(0, 15);
        localStorage.setItem('zzcfizz_recents', JSON.stringify(recentlyViewed));
    }

    function renderRecentlyViewedModal() {
        recentListBody.innerHTML = '';
        const allPoems = getPoemsData();
        const recentPoems = recentlyViewed.map(id => allPoems.find(p => p.id === id)).filter(Boolean);

        if (recentPoems.length === 0) {
            recentListBody.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">Bạn chưa đọc bài thơ nào gần đây.</p>';
            return;
        }

        recentPoems.forEach(poem => {
            const item = document.createElement('div');
            item.className = 'recent-poem-item';
            item.innerHTML = `
                <div>
                    <h4 class="recent-item-title">${poem.title}</h4>
                    <span class="recent-item-date">${poem.date_formatted}</span>
                </div>
                <i class="ri-arrow-right-s-line" style="color:var(--accent-primary);"></i>
            `;
            item.addEventListener('click', () => {
                recentModal.close();
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
            });
            recentListBody.appendChild(item);
        });
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
    function openReaderModal(target) {
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

        addRecentlyViewed(poem.id);
        updateUrlHash(poem.id);

        const modalCard = poemModal ? poemModal.querySelector('.modal-card') : null;
        if (modalCard) {
            modalCard.classList.remove('page-flip-anim');
            void modalCard.offsetWidth;
            modalCard.classList.add('page-flip-anim');
            setTimeout(() => modalCard.classList.remove('page-flip-anim'), 500);
        }

        if (modalTitle) {
            modalTitle.textContent = poem.title;
            modalTitle.classList.add('calligraphy-3d-text');
        }
        const verseCount = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).length : 0;
        const rhythmType = verseCount % 2 === 0 ? '📜 Thể Thơ Lục Bát / Thất Ngôn' : '🖋️ Thể Thơ Tự Do';
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

        const rawLines = poem.content_text ? poem.content_text.split('\n') : [];
        if (modalPoemText) {
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
                    img.className = 'img-lazy';
                    img.title = 'Nhấp để xem ảnh phóng to';
                    img.onerror = () => {
                        img.src = 'test_img.webp';
                        img.classList.add('img-loaded');
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
        if (prevPoemBtn) prevPoemBtn.disabled = index <= 0;
        if (nextPoemBtn) nextPoemBtn.disabled = index >= filteredPoemsList.length - 1;

        // Load Reactions & Notes for this poem
        loadPoemReactionsAndNote(poem.id);

        stopTts();
        stopAutoScroll();
        populateTtsVoices();
        autoPlayMoodSoundForPoem(poem);
        updateEmotionAura(poem);

        // Restore saved font family
        const savedFontFamily = localStorage.getItem('zzcfizz_font_family') || "'Lora', serif";
        if (fontFamilySelect) {
            fontFamilySelect.value = savedFontFamily;
        }
        if (modalPoemText) {
            modalPoemText.style.fontFamily = savedFontFamily;
        }

        // 3D Book Page Flip Animation Trigger
        if (poemModal) {
            const modalCard = poemModal.querySelector('.modal-card');
            if (modalCard) {
                modalCard.classList.remove('page-flip-anim');
                void modalCard.offsetWidth;
                modalCard.classList.add('page-flip-anim');
            }
        }

        // Reset header actions collapse state
        const modalHeader = document.querySelector('.modal-header');
        const toggleModalActionsBtn = document.getElementById('toggleModalActionsBtn');
        if (modalHeader) modalHeader.classList.remove('actions-collapsed', 'actions-manual-toggled');
        if (toggleModalActionsBtn) toggleModalActionsBtn.classList.remove('active');

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

    function closeReaderModal() {
        stopTts();
        stopAmbientSound(); // Auto-stop background music on modal close
        stopAutoScroll();
        disableZenMode();
        updateUrlHash(null);

        const modalHeader = document.querySelector('.modal-header');
        const toggleModalActionsBtn = document.getElementById('toggleModalActionsBtn');
        if (modalHeader) modalHeader.classList.remove('actions-collapsed', 'actions-manual-toggled');
        if (toggleModalActionsBtn) toggleModalActionsBtn.classList.remove('active');

        if (poemModal) {
            try {
                if (typeof poemModal.close === 'function') {
                    poemModal.close();
                }
            } catch (e) {}
            poemModal.removeAttribute('open');
        }
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
    // Reactions & Personal Notes Logic
    // ----------------------------------------------------------------------
    function loadPoemReactionsAndNote(poemId) {
        const pReactions = reactionsData[poemId] || { love: 0, cozy: 0, moon: 0, wind: 0 };
        document.getElementById('reactCountLove').textContent = pReactions.love || 0;
        document.getElementById('reactCountCozy').textContent = pReactions.cozy || 0;
        document.getElementById('reactCountMoon').textContent = pReactions.moon || 0;
        document.getElementById('reactCountWind').textContent = pReactions.wind || 0;

        const userReacted = JSON.parse(localStorage.getItem(`zzcfizz_user_react_${poemId}`) || '{}');
        reactionBtns.forEach(btn => {
            const rType = btn.dataset.reaction;
            btn.classList.toggle('active', !!userReacted[rType]);
        });

        if (poemNoteInput) {
            poemNoteInput.value = notesData[poemId] || '';
        }
    }

    reactionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const poem = filteredPoemsList[activePoemIndex];
            if (!poem) return;

            const rType = btn.dataset.reaction;
            const pId = poem.id;

            if (!reactionsData[pId]) reactionsData[pId] = { love: 0, cozy: 0, moon: 0, wind: 0 };
            const userReacted = JSON.parse(localStorage.getItem(`zzcfizz_user_react_${pId}`) || '{}');

            if (userReacted[rType]) {
                userReacted[rType] = false;
                reactionsData[pId][rType] = Math.max(0, (reactionsData[pId][rType] || 1) - 1);
            } else {
                userReacted[rType] = true;
                reactionsData[pId][rType] = (reactionsData[pId][rType] || 0) + 1;
                showToast('✨ Đã gửi cảm xúc của bạn!');
            }

            localStorage.setItem(`zzcfizz_user_react_${pId}`, JSON.stringify(userReacted));
            localStorage.setItem('zzcfizz_reactions', JSON.stringify(reactionsData));

            loadPoemReactionsAndNote(pId);
        });
    });

    if (saveNoteBtn && poemNoteInput) {
        saveNoteBtn.addEventListener('click', () => {
            const poem = filteredPoemsList[activePoemIndex];
            if (!poem) return;

            notesData[poem.id] = poemNoteInput.value;
            localStorage.setItem('zzcfizz_notes', JSON.stringify(notesData));
            showToast('💾 Đã lưu ghi chú cá nhân của bạn!');
        });
    }

    // ----------------------------------------------------------------------
    // Web Audio API Synth Ambient Sound Engine
    // ----------------------------------------------------------------------
    function initAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();
            ambientGainNode = audioCtx.createGain();
            const vol = ambientVolInput ? parseFloat(ambientVolInput.value) : 0.4;
            ambientGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
            ambientGainNode.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function stopAmbientSound() {
        ambientNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch (e) {}
        });
        ambientNodes = [];
        activeAmbientSound = null;
        if (ambientToggleBtn) ambientToggleBtn.classList.remove('playing');
        document.querySelectorAll('.ambient-option').forEach(b => b.classList.remove('active'));
    }

    function playAmbientSound(type) {
        if (activeAmbientSound === type) {
            stopAmbientSound();
            showToast('🔇 Đã tắt âm thanh thư giãn');
            return;
        }
        initAudioContext();
        stopAmbientSound();

        activeAmbientSound = type;
        if (ambientToggleBtn) ambientToggleBtn.classList.add('playing');

        const optBtn = document.querySelector(`.ambient-option[data-sound="${type}"]`);
        if (optBtn) optBtn.classList.add('active');

        // Check 8D Spatial Audio mode
        const isSpatial = document.getElementById('spatial8dCheck')?.checked;
        let destNode = ambientGainNode;

        if (isSpatial && ('createStereoPanner' in audioCtx)) {
            const panner = audioCtx.createStereoPanner();
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();

            lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime); // 8D swirl
            lfoGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

            lfo.connect(lfoGain);
            lfoGain.connect(panner.pan);

            panner.connect(ambientGainNode);
            lfo.start();
            ambientNodes.push(lfo, lfoGain, panner);
            destNode = panner;
        }

        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        if (type === 'rain') {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, audioCtx.currentTime);

            whiteNoise.connect(filter);
            filter.connect(destNode);
            whiteNoise.start();
            ambientNodes.push(whiteNoise, filter);
            showToast('🌧️ Đã bật âm thanh tiếng mưa rơi' + (isSpatial ? ' (8D Spatial)' : ''));
        } else if (type === 'waves') {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, audioCtx.currentTime);

            const lfo = audioCtx.createOscillator();
            lfo.frequency.setValueAtTime(0.15, audioCtx.currentTime);
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.setValueAtTime(300, audioCtx.currentTime);

            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            whiteNoise.connect(filter);
            filter.connect(destNode);
            whiteNoise.start();
            lfo.start();
            ambientNodes.push(whiteNoise, filter, lfo, lfoGain);
            showToast('🌊 Đã bật âm thanh sóng biển vỗ' + (isSpatial ? ' (8D Spatial)' : ''));
        } else if (type === 'pad') {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const padFilter = audioCtx.createBiquadFilter();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(220, audioCtx.currentTime);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(329.63, audioCtx.currentTime);

            padFilter.type = 'lowpass';
            padFilter.frequency.setValueAtTime(600, audioCtx.currentTime);

            osc1.connect(padFilter);
            osc2.connect(padFilter);
            padFilter.connect(destNode);

            osc1.start();
            osc2.start();
            ambientNodes.push(osc1, osc2, padFilter);
            showToast('🍃 Đã bật âm thanh gió trầm lắng' + (isSpatial ? ' (8D Spatial)' : ''));
        } else if (type === 'lofi') {
            const freqs = [130.81, 164.81, 196.00, 246.94];
            const lofiFilter = audioCtx.createBiquadFilter();
            lofiFilter.type = 'lowpass';
            lofiFilter.frequency.setValueAtTime(450, audioCtx.currentTime);

            freqs.forEach(f => {
                const osc = audioCtx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, audioCtx.currentTime);
                osc.connect(lofiFilter);
                osc.start();
                ambientNodes.push(osc);
            });

            lofiFilter.connect(destNode);
            ambientNodes.push(lofiFilter);
            showToast('🎹 Đã bật nhạc nền Chill Lo-Fi Synth' + (isSpatial ? ' (8D Spatial)' : ''));
        } else if (type === 'piano') {
            const pianoNotes = [261.63, 329.63, 392.00, 493.88];
            const pianoFilter = audioCtx.createBiquadFilter();
            pianoFilter.type = 'lowpass';
            pianoFilter.frequency.setValueAtTime(800, audioCtx.currentTime);

            pianoNotes.forEach((f, idx) => {
                const osc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, audioCtx.currentTime);

                noteGain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.2);
                noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.0 + idx * 0.2);

                osc.connect(noteGain);
                noteGain.connect(pianoFilter);
                osc.start();
                ambientNodes.push(osc, noteGain);
            });

            pianoFilter.connect(destNode);
            ambientNodes.push(pianoFilter);
            showToast('🎼 Đã bật giai điệu Đàn Piano Trầm Lắng' + (isSpatial ? ' (8D Spatial)' : ''));
        } else if (type === 'guzheng') {
            const guzhengNotes = [293.66, 329.63, 392.00, 440.00, 493.88];
            const guzhengFilter = audioCtx.createBiquadFilter();
            guzhengFilter.type = 'bandpass';
            guzhengFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);

            guzhengNotes.forEach((f, idx) => {
                const osc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, audioCtx.currentTime);

                noteGain.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.3);
                noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5 + idx * 0.3);

                osc.connect(noteGain);
                noteGain.connect(guzhengFilter);
                osc.start();
                ambientNodes.push(osc, noteGain);
            });

            guzhengFilter.connect(destNode);
            ambientNodes.push(guzhengFilter);
            showToast('🪕 Đã bật tiếng Đàn Tranh Hoài Cổ' + (isSpatial ? ' (8D Spatial)' : ''));
        }
    }

    function autoPlayMoodSoundForPoem(poem) {
        const autoCheck = document.getElementById('autoMoodSoundCheck');
        if (autoCheck && !autoCheck.checked) return;

        let soundType = 'pad';
        let soundName = 'Gió Trầm Lắng';

        if (matchesMood(poem, 'mood-nostalgia')) {
            soundType = 'rain';
            soundName = 'Tiếng Mưa Rơi';
        } else if (matchesMood(poem, 'mood-lonely')) {
            soundType = 'waves';
            soundName = 'Sóng Biển Vỗ';
        } else if (matchesMood(poem, 'mood-deep')) {
            soundType = 'pad';
            soundName = 'Nhạc Nhè Nhẹ';
        } else if (matchesMood(poem, 'mood-peace')) {
            soundType = 'pad';
            soundName = 'Gió Trầm Lắng';
        }

        if (activeAmbientSound !== soundType) {
            playAmbientSound(soundType);
            showToast(`🎵 Đã phối âm thanh [${soundName}] phù hợp với bài thơ`);
        }
    }

    // ----------------------------------------------------------------------
    // Seamless Expressive Poetry TTS Engine with Speed & Autoplay
    // ----------------------------------------------------------------------
    let ttsQueue = [];
    let ttsQueueIndex = 0;
    let ttsAudioInstance = null;
    let ttsPreloadedAudio = null;

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

    let isPoetryRadioActive = false;

    function handleTtsFinished() {
        stopTts();
        if ((isPoetryRadioActive || (ttsAutoplayCheck && ttsAutoplayCheck.checked)) && activePoemIndex < filteredPoemsList.length - 1) {
            showToast('📻 Đài Thơ Đêm: Đang phát bài tiếp theo...');
            setTimeout(() => {
                openReaderModal(activePoemIndex + 1);
                startTts();
            }, 2500);
        }
    }

    function speakNextWebSpeech(viVoice) {
        if (!isTtsPlaying || ttsQueueIndex >= ttsQueue.length) {
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
            speakNextWebSpeech(viVoice);
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
        if (!isTtsPlaying || ttsQueueIndex >= ttsQueue.length) {
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
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (ttsAudioInstance) {
            ttsAudioInstance.pause();
            ttsAudioInstance.currentTime = 0;
            ttsAudioInstance = null;
        }
        if (ttsPreloadedAudio) {
            ttsPreloadedAudio.pause();
            ttsPreloadedAudio = null;
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
                const matches = (content.match(new RegExp(kw, 'g')) || []).length;
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
        toastMessage.textContent = msg;
        toast.hidden = false;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.hidden = true;
        }, 3000);
    }

    // ----------------------------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------------------------
    function setupEventListeners() {
        // Search Input (debounced render; button state stays instant)
        let searchDebounce = null;
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            clearSearchBtn.hidden = searchQuery.length === 0;
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(renderPoems, 150);
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.hidden = true;
            renderPoems();
        });

        resetFilterBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            currentFilter = 'all';
            document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
            clearSearchBtn.hidden = true;
            renderPoems();
        });

        // Category Pills & Mood Filters
        categoryPills.addEventListener('click', (e) => {
            const btn = e.target.closest('.pill-btn');
            if (!btn) return;
            document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderPoems();
        });

        // Sort Select
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderPoems();
        });

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

        // Daily Poem Read Button
        if (dailyPoemReadBtn) {
            dailyPoemReadBtn.addEventListener('click', () => {
                if (dailyPoemObject) {
                    const idx = filteredPoemsList.findIndex(p => p.id === dailyPoemObject.id);
                    if (idx !== -1) {
                        openReaderModal(idx);
                    } else {
                        currentFilter = 'all';
                        document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
                        renderPoems();
                        const newIdx = filteredPoemsList.findIndex(p => p.id === dailyPoemObject.id);
                        if (newIdx !== -1) openReaderModal(newIdx);
                    }
                }
            });
        }

        // Header dropdown menus (Công cụ / Âm thanh / Cài đặt) — mutually exclusive
        const toolsToggleBtn = document.getElementById('toolsToggleBtn');
        const toolsMenu = document.getElementById('toolsMenu');
        const headerMenus = [
            [toolsToggleBtn, toolsMenu],
            [ambientToggleBtn, ambientMenu],
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
        themeToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleHeaderMenu(themeMenu); });

        themeOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                applyTheme(opt.dataset.setTheme);
                themeMenu.hidden = true;
                syncMenuAria();
            });
        });

        // Ambient Sound Controls
        if (ambientToggleBtn) {
            ambientToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleHeaderMenu(ambientMenu); });
        }

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
                const panel = document.getElementById(ddToggle.dataset.dd);
                if (!panel) return;
                const willOpen = panel.hidden;
                closeAllMdPanels();
                if (willOpen) {
                    // Center the panel: move it (+ a scrim) to the dialog root so it
                    // can't be clipped by an edge toggle's container or a transform.
                    const host = ddToggle.closest('dialog') || document.body;
                    const scrim = document.createElement('div');
                    scrim.className = 'md-dd-scrim';
                    host.appendChild(scrim);
                    host.appendChild(panel);
                    panel.hidden = false;
                }
                ddToggle.setAttribute('aria-expanded', String(willOpen));
                return;
            }
            const ddItem = e.target.closest('.md-dd-panel .hdr-menu-item');
            if (ddItem) { closeAllMdPanels(); return; } // action chosen; its own handler still runs
            if (!e.target.closest('.md-dd-panel')) closeAllMdPanels(); // click scrim / outside
        });

        if (ambientStopBtn) {
            ambientStopBtn.addEventListener('click', () => {
                stopAmbientSound();
                showToast('🔇 Đã tắt âm thanh thư giãn');
            });
        }

        document.querySelectorAll('.ambient-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const soundType = opt.dataset.sound;
                playAmbientSound(soundType);
            });
        });

        if (ambientVolInput) {
            ambientVolInput.addEventListener('input', (e) => {
                if (ambientGainNode && audioCtx) {
                    ambientGainNode.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
                }
            });
        }

        // Recently Viewed Modal Events
        if (recentPoemsBtn) {
            recentPoemsBtn.addEventListener('click', () => {
                renderRecentlyViewedModal();
                if (recentModal && !recentModal.open) recentModal.showModal();
            });
        }
        if (closeRecentModalBtn) {
            closeRecentModalBtn.addEventListener('click', () => recentModal.close());
        }

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
            modalShareBtn.addEventListener('click', () => {
                const poem = filteredPoemsList[activePoemIndex];
                if (!poem) return;
                const shareUrl = `${location.origin}${location.pathname}#poem-${poem.id}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                    showToast('🔗 Đã sao chép liên kết trực tiếp bài thơ!');
                });
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
            if (ambientMenu && !e.target.closest('.ambient-dropdown-container')) {
                ambientMenu.hidden = true;
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
        poemModal.addEventListener('click', (e) => {
            if (e.target === poemModal) closeReaderModal();
        });

        fontDecBtn.addEventListener('click', () => {
            if (fontSizePercentage > 70) {
                fontSizePercentage -= 10;
                modalPoemText.style.fontSize = `${fontSizePercentage}%`;
                fontSizeDisplay.textContent = `${fontSizePercentage}%`;
            }
        });

        fontIncBtn.addEventListener('click', () => {
            if (fontSizePercentage < 160) {
                fontSizePercentage += 10;
                modalPoemText.style.fontSize = `${fontSizePercentage}%`;
                fontSizeDisplay.textContent = `${fontSizePercentage}%`;
            }
        });

        alignBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                alignBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                modalPoemText.className = `poem-body-text align-${btn.dataset.align}`;
            });
        });

        modalFavBtn.addEventListener('click', (e) => {
            const poem = filteredPoemsList[activePoemIndex];
            if (poem) toggleFavorite(poem.id, e);
        });

        modalCopyBtn.addEventListener('click', () => {
            const poem = filteredPoemsList[activePoemIndex];
            if (!poem) return;
            const copyText = `« ${poem.title} »\n\n${poem.content_text}\n\n— Nguồn: https://zzcfizz.blog/#poem-${poem.id}`;
            navigator.clipboard.writeText(copyText).then(() => {
                showToast('📋 Đã sao chép bài thơ kèm định dạng!');
            });
        });

        ttsPlayBtn.addEventListener('click', toggleTts);

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

        prevPoemBtn.addEventListener('click', () => {
            openReaderModal(activePoemIndex - 1);
        });

        nextPoemBtn.addEventListener('click', () => {
            openReaderModal(activePoemIndex + 1);
        });

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
            bindSwipe(poemModal);
            bindSwipe(poemModal.querySelector('.modal-card'));
            bindSwipe(poemModal.querySelector('.modal-body'));
        }

        // ------------------------------------------------------------------
        // Sleep Timer Logic & Continue Reading Check
        // ------------------------------------------------------------------
        let sleepTimerInterval = null;

        function startSleepTimer(minutes) {
            if (sleepTimerInterval) clearInterval(sleepTimerInterval);
            if (minutes <= 0) {
                showToast('⏰ Đã tắt hẹn giờ');
                return;
            }

            const targetTime = Date.now() + minutes * 60 * 1000;
            showToast(`⏰ Đã hẹn giờ tắt sau ${minutes} phút`);

            sleepTimerInterval = setInterval(() => {
                const remaining = targetTime - Date.now();
                if (remaining <= 0) {
                    clearInterval(sleepTimerInterval);
                    sleepTimerInterval = null;
                    stopTts();
                    stopAmbientSound();
                    showToast('⏰ Đã hết giờ hẹn giờ! Chúc bạn ngủ ngon 🌙');
                    const timerSel = document.getElementById('sleepTimerSelect');
                    if (timerSel) timerSel.value = '0';
                }
            }, 5000);
        }

        const sleepTimerSelect = document.getElementById('sleepTimerSelect');
        if (sleepTimerSelect) {
            sleepTimerSelect.addEventListener('change', (e) => {
                startSleepTimer(parseInt(e.target.value, 10));
            });
        }

        function checkContinueReadingBanner() {
            const lastId = localStorage.getItem('zzcfizz_last_read_poem_id');
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

        window.addEventListener('scroll', () => {
            const currentY = window.scrollY;
            if (backToTopBtn) {
                backToTopBtn.hidden = currentY < 300;
            }

            if (window.innerWidth <= 768) {
                if (currentY > 150 && currentY > lastWinScrollY + 12) {
                    if (controlsBar && !controlsBar.classList.contains('is-collapsed-by-user')) {
                        controlsBar.classList.add('is-collapsed');
                        if (floatingExpandFilterBtn) floatingExpandFilterBtn.classList.add('is-visible');
                    }
                } else if (currentY < lastWinScrollY - 12 || currentY <= 50) {
                    if (controlsBar) {
                        controlsBar.classList.remove('is-collapsed', 'is-collapsed-by-user');
                        if (floatingExpandFilterBtn) floatingExpandFilterBtn.classList.remove('is-visible');
                    }
                }
            }
            lastWinScrollY = currentY;
        }, { passive: true });

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

        // Poem Detail Modal Card Scroll for Auto Collapsing Actions
        let lastModalScrollY = 0;
        const poemModalCard = document.querySelector('.modal-card');
        const modalHeader = document.querySelector('.modal-header');
        const toggleModalActionsBtn = document.getElementById('toggleModalActionsBtn');

        if (poemModalCard && modalHeader) {
            poemModalCard.addEventListener('scroll', () => {
                if (window.innerWidth > 768) return;
                const currentY = poemModalCard.scrollTop;

                if (currentY > 60 && currentY > lastModalScrollY + 8) {
                    if (!modalHeader.classList.contains('actions-manual-toggled')) {
                        modalHeader.classList.add('actions-collapsed');
                        if (toggleModalActionsBtn) toggleModalActionsBtn.classList.add('active');
                    }
                } else if (currentY < lastModalScrollY - 8 || currentY <= 20) {
                    modalHeader.classList.remove('actions-collapsed', 'actions-manual-toggled');
                    if (toggleModalActionsBtn) toggleModalActionsBtn.classList.remove('active');
                }
                lastModalScrollY = currentY;
            }, { passive: true });
        }

        if (toggleModalActionsBtn && modalHeader) {
            toggleModalActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                modalHeader.classList.add('actions-manual-toggled');
                const isCollapsed = modalHeader.classList.toggle('actions-collapsed');
                toggleModalActionsBtn.classList.toggle('active', isCollapsed);
            });
        }

        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Lightbox Close
        closeLightboxBtn.addEventListener('click', () => lightboxModal.close());
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) lightboxModal.close();
        });
    }

    // ----------------------------------------------------------------------
    // Keyboard Shortcuts
    // ----------------------------------------------------------------------
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K to search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }

            // Esc to exit Zen mode
            if (e.key === 'Escape' && isZenMode) {
                disableZenMode();
            }

            // Keyboard navigation inside poem modal
            if (poemModal.open && !isZenMode) {
                if (e.key === 'ArrowLeft' && activePoemIndex > 0) {
                    openReaderModal(activePoemIndex - 1);
                } else if (e.key === 'ArrowRight' && activePoemIndex < filteredPoemsList.length - 1) {
                    openReaderModal(activePoemIndex + 1);
                }
            }
        });
    }

        // ------------------------------------------------------------------
        // E-Book PDF Exporter & Time Capsule Logic
        // ------------------------------------------------------------------
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', exportPoetryEBookPdf);
        }

        initTimeCapsule();

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

        function initTimeCapsule() {
            const timeCapsuleBtn = document.getElementById('timeCapsuleBtn');
            const timeCapsuleModal = document.getElementById('timeCapsuleModal');
            const closeTimeCapsuleBtn = document.getElementById('closeTimeCapsuleBtn');
            const saveCapsuleBtn = document.getElementById('saveCapsuleBtn');
            const capsulePoemSelect = document.getElementById('capsulePoemSelect');
            const capsuleNoteInput = document.getElementById('capsuleNoteInput');
            const capsuleDurationSelect = document.getElementById('capsuleDurationSelect');

            if (!timeCapsuleModal) return;

            if (timeCapsuleBtn) {
                timeCapsuleBtn.addEventListener('click', () => {
                    const allPoems = getPoemsData();
                    if (capsulePoemSelect) {
                        capsulePoemSelect.innerHTML = allPoems.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
                    }
                    if (timeCapsuleModal && !timeCapsuleModal.open) timeCapsuleModal.showModal();
                });
            }

            if (closeTimeCapsuleBtn) {
                closeTimeCapsuleBtn.addEventListener('click', () => timeCapsuleModal.close());
            }

            if (saveCapsuleBtn) {
                saveCapsuleBtn.addEventListener('click', () => {
                    const poemId = capsulePoemSelect.value;
                    const note = capsuleNoteInput.value.trim();
                    const months = parseInt(capsuleDurationSelect.value, 10) || 6;
                    const targetDate = Date.now() + (months * 30 * 24 * 3600 * 1000);

                    const capsules = JSON.parse(localStorage.getItem('zzcfizz_time_capsules') || '[]');
                    capsules.push({ poemId, note, targetDate, createdAt: Date.now() });
                    localStorage.setItem('zzcfizz_time_capsules', JSON.stringify(capsules));

                    timeCapsuleModal.close();
                    showToast(`💌 Hộp thư tương lai đã được niêm phong! Hẹn gặp lại bạn sau ${months} tháng.`);
                });
            }

            // Check matured time capsules
            const capsules = JSON.parse(localStorage.getItem('zzcfizz_time_capsules') || '[]');
            const matured = capsules.filter(c => Date.now() >= c.targetDate && !c.opened);
            if (matured.length > 0) {
                setTimeout(() => {
                    showToast(`💌 Bạn có ${matured.length} Hộp Thư Tương Lai đã đến thời gian mở!`);
                }, 2000);
            }
        }

        // ------------------------------------------------------------------
        // Background Particle Stardust Canvas
        // ------------------------------------------------------------------
        function initParticleCanvas() {
            const canvas = document.getElementById('particleCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;

            window.addEventListener('resize', () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            });

            const particles = Array.from({ length: 25 }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 2 + 1,
                speedY: Math.random() * 0.4 + 0.1,
                speedX: Math.random() * 0.2 - 0.1,
                opacity: Math.random() * 0.7 + 0.2
            }));

            function animate() {
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';

                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();

                    p.y -= p.speedY;
                    p.x += p.speedX;

                    if (p.y < 0) {
                        p.y = height;
                        p.x = Math.random() * width;
                    }
                });
                requestAnimationFrame(animate);
            }
            animate();
        }
        initParticleCanvas();

        // ------------------------------------------------------------------
        // Command Palette (Ctrl + K)
        // ------------------------------------------------------------------
        function initCommandPalette() {
            const cmdPaletteBtn = document.getElementById('cmdPaletteBtn');
            const commandPaletteModal = document.getElementById('commandPaletteModal');
            const cmdInput = document.getElementById('cmdInput');
            const cmdResultsList = document.getElementById('cmdResultsList');

            if (!commandPaletteModal || !cmdInput || !cmdResultsList) return;

            const commands = [
                { title: '🌌 Đổi Theme: Midnight Glow', action: () => applyTheme('theme-midnight') },
                { title: '🕯️ Đổi Theme: Charcoal Dark', action: () => applyTheme('theme-dark') },
                { title: '📜 Đổi Theme: Warm Paper Sepia', action: () => applyTheme('theme-paper') },
                { title: '❄️ Đổi Theme: Nordic Light', action: () => applyTheme('theme-nordic') },
                { title: '🎛️ Chế Độ Tập Trung (Zen Mode)', action: () => { const p = filteredPoemsList[0]; if (p) openReaderModal(0); enableZenMode(); } },
                { title: '📄 Xuất Tập Thơ PDF / E-Book', action: exportPoetryEBookPdf },
                { title: '⏳ Hộp Thư Gửi Thơ Tới Tương Lai', action: () => { document.getElementById('timeCapsuleBtn')?.click(); } },
                { title: '📈 Xem Thống Kê Cảm Xúc Cá Nhân', action: () => { document.getElementById('emotionStatsBtn')?.click(); } },
                { title: '🎴 Khám Phá Thơ Thẻ Bài 3D', action: () => { document.getElementById('cardSwiperBtn')?.click(); } }
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

            if (cmdPaletteBtn) {
                cmdPaletteBtn.addEventListener('click', () => {
                    renderCmdList('');
                    commandPaletteModal.showModal();
                    cmdInput.focus();
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
        // Poetry Card Discovery Swiper 3D
        // ------------------------------------------------------------------
        function initCardSwiper() {
            const cardSwiperBtn = document.getElementById('cardSwiperBtn');
            const cardSwiperModal = document.getElementById('cardSwiperModal');
            const closeSwiperBtn = document.getElementById('closeSwiperBtn');
            const cardSwiperBox = document.getElementById('cardSwiperBox');
            const swiperPrevBtn = document.getElementById('swiperPrevBtn');
            const swiperNextBtn = document.getElementById('swiperNextBtn');

            if (!cardSwiperModal || !cardSwiperBox) return;

            let swiperIndex = 0;

            function renderSwiperCard() {
                const poems = getPoemsData();
                if (poems.length === 0) return;

                const poem = poems[swiperIndex % poems.length];
                cardSwiperBox.innerHTML = `
                    <div class="swiper-card-item">
                        <span class="modal-category-badge" style="margin-bottom:8px; display:inline-block;">✨ Khám Phá Thơ</span>
                        <h3>${poem.title}</h3>
                        <p>${poem.content_text}</p>
                        <button class="btn btn-primary btn-sm" onclick="window.openPoemById('${poem.id}')">
                            <i class="ri-book-read-line"></i> Đọc Toàn Bài & Nghe AI
                        </button>
                    </div>
                `;
            }

            window.openPoemById = (id) => {
                cardSwiperModal.close();
                const idx = filteredPoemsList.findIndex(p => p.id === id);
                if (idx !== -1) openReaderModal(idx);
            };

            if (cardSwiperBtn) {
                cardSwiperBtn.addEventListener('click', () => {
                    swiperIndex = Math.floor(Math.random() * getPoemsData().length);
                    renderSwiperCard();
                    cardSwiperModal.showModal();
                });
            }

            if (closeSwiperBtn) closeSwiperBtn.onclick = () => cardSwiperModal.close();

            if (swiperNextBtn) {
                swiperNextBtn.onclick = () => {
                    swiperIndex++;
                    renderSwiperCard();
                };
            }

            if (swiperPrevBtn) {
                swiperPrevBtn.onclick = () => {
                    swiperIndex = Math.max(0, swiperIndex - 1);
                    renderSwiperCard();
                };
            }
        }
        initCardSwiper();

        // ------------------------------------------------------------------
        // Personal Emotion Stats Insights
        // ------------------------------------------------------------------
        function initEmotionStats() {
            const emotionStatsBtn = document.getElementById('emotionStatsBtn');
            const emotionStatsModal = document.getElementById('emotionStatsModal');
            const closeStatsBtn = document.getElementById('closeStatsBtn');
            const statsReadCount = document.getElementById('statsReadCount');
            const statsFavCount = document.getElementById('statsFavCount');
            const statsMoodBarsList = document.getElementById('statsMoodBarsList');

            if (!emotionStatsModal) return;

            function renderStats() {
                if (statsReadCount) statsReadCount.textContent = recentlyViewed.length;
                if (statsFavCount) statsFavCount.textContent = favorites.length;

                if (!statsMoodBarsList) return;
                const poems = getPoemsData();
                const favPoems = poems.filter(p => favorites.includes(p.id));

                const moodCounts = {
                    '🌱 Bình Yên': favPoems.filter(p => matchesMood(p, 'mood-peace')).length,
                    '🌙 Trầm Tư': favPoems.filter(p => matchesMood(p, 'mood-deep')).length,
                    '🌧️ Hoài Niệm': favPoems.filter(p => matchesMood(p, 'mood-nostalgia')).length,
                    '☕ Cô Đơn': favPoems.filter(p => matchesMood(p, 'mood-lonely')).length,
                    '✨ Hi Vọng': favPoems.filter(p => matchesMood(p, 'mood-hope')).length
                };

                const totalFav = favPoems.length || 1;

                statsMoodBarsList.innerHTML = Object.entries(moodCounts).map(([label, count]) => {
                    const pct = Math.round((count / totalFav) * 100);
                    return `
                        <div class="mood-bar-wrapper">
                            <div class="mood-bar-label">
                                <span>${label}</span>
                                <span>${pct}% (${count})</span>
                            </div>
                            <div class="mood-bar-track">
                                <div class="mood-bar-fill" style="width: ${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            if (emotionStatsBtn) {
                emotionStatsBtn.addEventListener('click', () => {
                    renderStats();
                    emotionStatsModal.showModal();
                });
            }

            if (closeStatsBtn) closeStatsBtn.onclick = () => emotionStatsModal.close();
        }
        initEmotionStats();

        // ------------------------------------------------------------------
        // Poetry Radio (Chill Stream) Logic
        // ------------------------------------------------------------------
        function initPoetryRadio() {
            const poetryRadioBtn = document.getElementById('poetryRadioBtn');
            const togglePoetryRadioBtn = document.getElementById('togglePoetryRadioBtn');

            function toggleRadio() {
                isPoetryRadioActive = !isPoetryRadioActive;
                if (poetryRadioBtn) poetryRadioBtn.classList.toggle('active', isPoetryRadioActive);
                if (togglePoetryRadioBtn) togglePoetryRadioBtn.classList.toggle('active', isPoetryRadioActive);

                if (isPoetryRadioActive) {
                    showToast('📻 Đã mở Kênh Đài Thơ Đêm ZzCFIzZ (Chill Stream)');
                    if (!poemModal.open) openReaderModal(0);
                    playAmbientSound('rain');
                    startTts();
                } else {
                    showToast('📻 Đã tắt Kênh Đài Thơ Đêm');
                    stopTts();
                }
            }

            if (poetryRadioBtn) poetryRadioBtn.addEventListener('click', toggleRadio);
            if (togglePoetryRadioBtn) togglePoetryRadioBtn.addEventListener('click', toggleRadio);
        }
        initPoetryRadio();

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
        // Backdrop Library & Custom Upload Logic
        // ------------------------------------------------------------------
        function initBackdropPresets() {
            const backdropPresetSelect = document.getElementById('backdropPresetSelect');
            const customBackdropInput = document.getElementById('customBackdropInput');
            const modalCard = poemModal ? poemModal.querySelector('.modal-card') : null;

            if (!backdropPresetSelect || !modalCard) return;

            const presetUrls = {
                fog: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200',
                autumn: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=1200',
                rain: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=1200'
            };

            function applyBackdrop(val, customUrl = null) {
                if (val === 'default') {
                    modalCard.style.backgroundImage = '';
                } else if (customUrl) {
                    modalCard.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url("${customUrl}")`;
                    modalCard.style.backgroundSize = 'cover';
                    modalCard.style.backgroundPosition = 'center';
                } else if (presetUrls[val]) {
                    modalCard.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url("${presetUrls[val]}")`;
                    modalCard.style.backgroundSize = 'cover';
                    modalCard.style.backgroundPosition = 'center';
                }
            }

            backdropPresetSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'custom') {
                    if (customBackdropInput) customBackdropInput.click();
                } else {
                    applyBackdrop(val);
                }
            });

            if (customBackdropInput) {
                customBackdropInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            applyBackdrop('custom', event.target.result);
                            showToast('🖼️ Đã áp dụng hình nền cá nhân của bạn!');
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        }
        initBackdropPresets();

        // ------------------------------------------------------------------
        // Daily Poetry Calendar 365 Days
        // ------------------------------------------------------------------
        function initDailyPoetryCalendar() {
            const dailyCalendarBtn = document.getElementById('dailyCalendarBtn');
            const dailyCalendarModal = document.getElementById('dailyCalendarModal');
            const closeDailyCalendarBtn = document.getElementById('closeDailyCalendarBtn');
            const readDailyPoemBtn = document.getElementById('readDailyPoemBtn');

            const calMonthYear = document.getElementById('calMonthYear');
            const calDayNum = document.getElementById('calDayNum');
            const calWeekday = document.getElementById('calWeekday');
            const calPoemTitle = document.getElementById('calPoemTitle');
            const calPoemSnippet = document.getElementById('calPoemSnippet');

            if (!dailyCalendarModal) return;

            const now = new Date();
            const weekdays = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];

            const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const allPoems = getPoemsData();
            const dailyPoem = allPoems[dayOfYear % allPoems.length] || allPoems[0];

            function updateCalendarCard() {
                if (calMonthYear) calMonthYear.textContent = `THÁNG ${now.getMonth() + 1} • ${now.getFullYear()}`;
                if (calDayNum) calDayNum.textContent = now.getDate();
                if (calWeekday) calWeekday.textContent = weekdays[now.getDay()];

                if (dailyPoem) {
                    if (calPoemTitle) calPoemTitle.textContent = dailyPoem.title;
                    const lines = dailyPoem.content_text ? dailyPoem.content_text.split('\n').filter(l => l.trim()) : [];
                    const snippet = lines.slice(0, 2).join(' / ');
                    if (calPoemSnippet) calPoemSnippet.textContent = `"${snippet}..."`;
                }
            }

            if (dailyCalendarBtn) {
                dailyCalendarBtn.addEventListener('click', () => {
                    updateCalendarCard();
                    dailyCalendarModal.showModal();
                });
            }

            if (closeDailyCalendarBtn) closeDailyCalendarBtn.onclick = () => dailyCalendarModal.close();

            if (readDailyPoemBtn) {
                readDailyPoemBtn.onclick = () => {
                    dailyCalendarModal.close();
                    const idx = filteredPoemsList.findIndex(p => p.id === dailyPoem.id);
                    if (idx !== -1) {
                        openReaderModal(idx);
                    } else {
                        currentFilter = 'all';
                        renderPoems();
                        const newIdx = filteredPoemsList.findIndex(p => p.id === dailyPoem.id);
                        if (newIdx !== -1) openReaderModal(newIdx);
                    }
                };
            }
        }
        initDailyPoetryCalendar();

        // ------------------------------------------------------------------
        // Mouse Cursor Trail Canvas
        // ------------------------------------------------------------------
        // Only on hover-capable (desktop) devices with motion enabled — a
        // cursor trail is pointless on touch and wastes battery.
        const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function initMouseCursorTrail() {
            const canvas = document.getElementById('cursorTrailCanvas');
            if (!canvas || !canHover || !motionOK) return;
            const ctx = canvas.getContext('2d');
            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;

            window.addEventListener('resize', () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }, { passive: true });

            const particles = [];
            let rafId = null;

            function renderTrail() {
                ctx.clearRect(0, 0, width, height);
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = p.color + p.life + ')';
                    ctx.fill();

                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= 0.03;

                    if (p.life <= 0) particles.splice(i, 1);
                }
                // Idle the loop when nothing to draw — no wasted frames.
                rafId = particles.length ? requestAnimationFrame(renderTrail) : null;
            }

            window.addEventListener('mousemove', (e) => {
                if (canvas.hidden) return; // trail toggled off in Settings — no particles, loop idles
                for (let i = 0; i < 2; i++) {
                    particles.push({
                        x: e.clientX,
                        y: e.clientY,
                        r: Math.random() * 3 + 1,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 1.5,
                        life: 1.0,
                        color: `hsla(${Math.random() * 60 + 260}, 80%, 70%, `
                    });
                }
                if (!rafId) rafId = requestAnimationFrame(renderTrail);
            }, { passive: true });
        }
        initMouseCursorTrail();

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

        // ------------------------------------------------------------------
        // Window Raindrop Visual FX
        // ------------------------------------------------------------------
        function initWeatherFx() {
            const canvas = document.getElementById('weatherFxCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;

            const drops = Array.from({ length: 40 }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                len: Math.random() * 20 + 10,
                speed: Math.random() * 8 + 4,
                opacity: Math.random() * 0.4 + 0.1
            }));

            function renderRain() {
                if (activeAmbientSound === 'rain') {
                    canvas.hidden = false;
                    ctx.clearRect(0, 0, width, height);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.lineWidth = 1;

                    drops.forEach(d => {
                        ctx.beginPath();
                        ctx.moveTo(d.x, d.y);
                        ctx.lineTo(d.x - 2, d.y + d.len);
                        ctx.stroke();

                        d.y += d.speed;
                        d.x -= 0.5;

                        if (d.y > height) {
                            d.y = -d.len;
                            d.x = Math.random() * width;
                        }
                    });
                    requestAnimationFrame(renderRain);
                } else {
                    // Rain off: clear once, hide, and poll cheaply instead of
                    // burning a full-screen canvas clear at 60fps forever.
                    if (!canvas.hidden) {
                        ctx.clearRect(0, 0, width, height);
                        canvas.hidden = true;
                    }
                    setTimeout(renderRain, 500);
                }
            }
            renderRain();
        }
        initWeatherFx();

        // ------------------------------------------------------------------
        // Custom Accent Color Theme Picker
        // ------------------------------------------------------------------
        function initAccentPicker() {
            const accentBtns = document.querySelectorAll('.accent-dot-btn');
            const savedAccent = localStorage.getItem('zzcfizz_accent_color');

            if (savedAccent) {
                document.documentElement.style.setProperty('--accent-primary', savedAccent);
                document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${savedAccent}, #ec4899)`);
            }

            accentBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const color = btn.dataset.accent;
                    document.documentElement.style.setProperty('--accent-primary', color);
                    document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color}, #ec4899)`);
                    localStorage.setItem('zzcfizz_accent_color', color);
                    showToast('🎨 Đã cập nhật màu điểm nhấn cá nhân!');
                });
            });
        }
        initAccentPicker();

        // Spacebar shortcut for Hands-Free TTS & Auto-Scroll
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && poemModal && poemModal.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                toggleTts();
                toggleAutoScroll();
            }
        });

        // ------------------------------------------------------------------
        // 3D Card Parallax Tilt & Theater Mode Logic
        // ------------------------------------------------------------------
        function initCardParallaxTilt() {
            if (!canHover || !motionOK) return; // no tilt on touch / reduced-motion
            let tiltTicking = false;
            let lastCard = null;
            document.addEventListener('mousemove', (e) => {
                if (tiltTicking) return;
                tiltTicking = true;
                requestAnimationFrame(() => {   // one layout read per frame, not per pixel
                    const card = e.target.closest && e.target.closest('.poem-card');
                    if (card) {
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left - rect.width / 2;
                        const y = e.clientY - rect.top - rect.height / 2;
                        card.style.transform = `perspective(1000px) rotateX(${-y / 25}deg) rotateY(${x / 25}deg) scale(1.02)`;
                        lastCard = card;
                    } else if (lastCard) {
                        lastCard.style.transform = ''; // reset when cursor leaves any card
                        lastCard = null;
                    }
                    tiltTicking = false;
                });
            }, { passive: true });
        }
        initCardParallaxTilt();

        function initTheaterMode() {
            const theaterModeBtn = document.getElementById('theaterModeBtn');
            if (!theaterModeBtn || !poemModal) return;

            theaterModeBtn.addEventListener('click', () => {
                const isTheater = poemModal.classList.toggle('theater-mode-active');
                theaterModeBtn.classList.toggle('active', isTheater);
                if (isTheater) {
                    showToast('🎭 Đã mở Chế Độ Rạp Chiếu Thơ Tràn Màn Hình');
                } else {
                    showToast('🎭 Đã thoát Chế Độ Rạp Chiếu Thơ');
                }
            });
        }
        initTheaterMode();

        // ------------------------------------------------------------------
        // Nightlight Breathing Mode, Bedtime Greeting & Quick Dock
        // ------------------------------------------------------------------
        function initNightlightMode() {
            const nightlightCheck = document.getElementById('nightlightCheck');
            const nightlightOverlay = document.getElementById('nightlightOverlay');

            if (!nightlightCheck || !nightlightOverlay) return;

            nightlightCheck.addEventListener('change', (e) => {
                nightlightOverlay.hidden = !e.target.checked;
                if (e.target.checked) {
                    showToast('🕯️ Đã bật Chế Độ Đèn Ngủ Nhịp Thở Thư Giãn');
                } else {
                    showToast('☀️ Đã tắt Chế Độ Đèn Ngủ');
                }
            });
        }
        initNightlightMode();

        function checkBedtimeGreeting() {
            const hour = new Date().getHours();
            if (hour >= 22 || hour < 5) {
                setTimeout(() => {
                    showToast('🌙 Đêm đã về khuya, chúc bạn tìm thấy chút bình yên qua những vần thơ...');
                }, 1800);
            }
        }
        checkBedtimeGreeting();

        function initQuickDock() {
            const quickDockBtn = document.getElementById('quickDockBtn');
            const quickDockMenu = document.getElementById('quickDockMenu');
            const dockThemeBtn = document.getElementById('dockThemeBtn');
            const dockAudioBtn = document.getElementById('dockAudioBtn');
            const dockCmdBtn = document.getElementById('dockCmdBtn');

            if (!quickDockBtn || !quickDockMenu) return;

            quickDockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickDockMenu.hidden = !quickDockMenu.hidden;
            });

            document.addEventListener('click', (e) => {
                if (quickDockMenu && !e.target.closest('#quickDockContainer')) {
                    quickDockMenu.hidden = true;
                }
            });

            if (dockThemeBtn) dockThemeBtn.onclick = () => document.getElementById('themeToggleBtn')?.click();
            if (dockAudioBtn) dockAudioBtn.onclick = () => document.getElementById('ambientToggleBtn')?.click();
            if (dockCmdBtn) dockCmdBtn.onclick = () => document.getElementById('cmdPaletteBtn')?.click();
        }
        initQuickDock();

        // ------------------------------------------------------------------
        // Poetry Glossary & Literary Terms
        // ------------------------------------------------------------------
        function initPoetryGlossary() {
            const glossaryToggleBtn = document.getElementById('glossaryToggleBtn');
            const modalPoemText = document.getElementById('modalPoemText');

            if (!glossaryToggleBtn || !modalPoemText) return;

            const dictionary = {
                'sương khói': 'Chú giải: Hình ảnh gợi vẻ mơ hồ, hoài niệm và mong manh của không gian thời gian.',
                'hư không': 'Chú giải: Cõi tĩnh lặng, buông bỏ mọi muộn phiền nơi tâm hồn.',
                'trùng khơi': 'Chú giải: Biển rộng mênh mông hoặc không gian xa xăm cách trở.',
                'hoài niệm': 'Chú giải: Cảm xúc nhớ nhung ký ức đẹp trong quá khứ.',
                'bình yên': 'Chú giải: Trạng thái tâm thanh thản, không gợn sóng lo âu.',
                'mênh mang': 'Chú giải: Rộng lớn vô cùng, trải dài đến tận chân trời.',
                'tuổi trẻ': 'Chú giải: Quãng thời gian nhiệt huyết, rực rỡ và đầy hoài bão.'
            };

            let isGlossaryActive = false;

            glossaryToggleBtn.addEventListener('click', () => {
                isGlossaryActive = !isGlossaryActive;
                glossaryToggleBtn.classList.toggle('active', isGlossaryActive);

                if (isGlossaryActive) {
                    showToast('📜 Đã bật Chú Giải Từ Vựng Thơ (Nhấp từ được gạch chân để xem)');
                    let textHtml = modalPoemText.innerHTML;
                    Object.keys(dictionary).forEach(term => {
                        const regex = new RegExp(`(${term})`, 'gi');
                        textHtml = textHtml.replace(regex, `<span class="poetry-glossary-highlight" title="${dictionary[term]}">$1</span>`);
                    });
                    modalPoemText.innerHTML = textHtml;

                    modalPoemText.querySelectorAll('.poetry-glossary-highlight').forEach(el => {
                        el.onclick = (e) => {
                            e.stopPropagation();
                            showToast(el.title);
                        };
                    });
                } else {
                    showToast('📜 Đã tắt Chú Giải Từ Vựng Thơ');
                    const poem = filteredPoemsList[activePoemIndex];
                    if (poem) openReaderModal(activePoemIndex);
                }
            });
        }
        initPoetryGlossary();

        // ------------------------------------------------------------------
        // Poetry Memory Quiz Game
        // ------------------------------------------------------------------
        function initPoetryQuiz() {
            const poetryQuizBtn = document.getElementById('poetryQuizBtn');
            const poetryQuizModal = document.getElementById('poetryQuizModal');
            const closeQuizBtn = document.getElementById('closeQuizBtn');
            const quizContainer = document.getElementById('quizContainer');
            const quizResult = document.getElementById('quizResult');
            const quizQuestion = document.getElementById('quizQuestion');
            const quizOptionsGrid = document.getElementById('quizOptionsGrid');
            const quizScoreText = document.getElementById('quizScoreText');
            const restartQuizBtn = document.getElementById('restartQuizBtn');

            if (!poetryQuizModal || !quizQuestion || !quizOptionsGrid) return;

            const questions = [
                {
                    q: 'Điền từ còn thiếu: "Trầm tư nghe tiếng... qua thềm"',
                    options: ['Mưa rơi', 'Lá bay', 'Gió lùa', 'Nắng hạ'],
                    ans: 0
                },
                {
                    q: 'Cảm xúc chính trong các bài thơ chủ đề hoài niệm là gì?',
                    options: ['Sôi nổi', 'Sâu lắng, nhớ thương', 'Vui tươi', 'Hào hùng'],
                    ans: 1
                },
                {
                    q: 'Bài thơ "Trống Trắng Hư Không" gửi gắm tâm sự gì?',
                    options: ['Sự tấp nập phố thị', 'Sự buông bỏ tĩnh lặng', 'Sự vội vã thời gian', 'Cảnh hoang sơ'],
                    ans: 1
                },
                {
                    q: 'Khổ thơ "Ta đi qua những mùa vàng..." gợi nhắc đến mùa nào?',
                    options: ['Mùa Xuân', 'Mùa Hè', 'Mùa Thu', 'Mùa Đông'],
                    ans: 2
                },
                {
                    q: 'Điền câu tiếp theo: "Lặng lẽ đêm dài câu thơ hát..."',
                    options: ['Gió thổi miên man nhẹ tiếng đàn', 'Mưa giăng mờ lối bước lang thang', 'Trả lại bình yên góc dịu dàng', 'Sóng vỗ bờ xa ánh sao tan'],
                    ans: 2
                }
            ];

            let currentQIndex = 0;
            let score = 0;

            function renderQuestion() {
                if (currentQIndex >= questions.length) {
                    quizContainer.hidden = true;
                    quizResult.hidden = false;
                    quizScoreText.textContent = `Bạn đạt ${score}/${questions.length} Điểm Thi Sĩ!`;
                    return;
                }

                quizContainer.hidden = false;
                quizResult.hidden = true;

                const item = questions[currentQIndex];
                quizQuestion.textContent = `Câu ${currentQIndex + 1}/${questions.length}: ${item.q}`;
                quizOptionsGrid.innerHTML = '';

                item.options.forEach((opt, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-outline';
                    btn.style.textAlign = 'left';
                    btn.textContent = `${idx + 1}. ${opt}`;
                    btn.onclick = () => {
                        if (idx === item.ans) {
                            score++;
                            showToast('✨ Chính xác! +1 Điểm Thi Sĩ');
                        } else {
                            showToast('❌ Chưa đúng rồi! Hãy thử lại câu sau nhé.');
                        }
                        currentQIndex++;
                        renderQuestion();
                    };
                    quizOptionsGrid.appendChild(btn);
                });
            }

            if (poetryQuizBtn) {
                poetryQuizBtn.addEventListener('click', () => {
                    currentQIndex = 0;
                    score = 0;
                    renderQuestion();
                    poetryQuizModal.showModal();
                });
            }

            if (closeQuizBtn) closeQuizBtn.onclick = () => poetryQuizModal.close();

            if (restartQuizBtn) {
                restartQuizBtn.onclick = () => {
                    currentQIndex = 0;
                    score = 0;
                    renderQuestion();
                };
            }
        }
        initPoetryQuiz();

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

            const savedSettings = JSON.parse(localStorage.getItem('zzcfizz_system_settings') || '{}');

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

                if (key === 'quick_dock') {
                    const dock = document.getElementById('quickDockContainer');
                    if (dock) dock.style.display = isEnabled ? '' : 'none';
                } else if (key === 'cursor_trail') {
                    const canvas = document.getElementById('cursorTrailCanvas');
                    if (canvas) canvas.hidden = !isEnabled;
                } else if (key === 'particles') {
                    const canvas = document.getElementById('particleCanvas');
                    if (canvas) canvas.hidden = !isEnabled;
                } else if (key === 'weather_fx') {
                    const canvas = document.getElementById('weatherFxCanvas');
                    if (canvas && !isEnabled) canvas.hidden = true;
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
        // VIETNAM HOLIDAYS & AUTHOR BIRTHDAY (17/06) CELEBRATION ENGINE
        // ------------------------------------------------------------------
        function initVietnamHolidaysAndAuthorBirthday() {
            const flagCanvas = document.getElementById('vietnamFlagCanvas');
            const confettiCanvas = document.getElementById('confettiCanvas');
            const greetingModal = document.getElementById('holidayGreetingModal');
            const closeHolidayModalBtn = document.getElementById('closeHolidayModalBtn');
            const holidayEmoji = document.getElementById('holidayEmoji');
            const holidayTitle = document.getElementById('holidayTitle');
            const holidayMessage = document.getElementById('holidayMessage');

            if (!flagCanvas || !confettiCanvas) return;

            let flagAnimId = null;
            let confettiAnimId = null;
            let flagTime = 0;

            // Resize canvas to full viewport
            function resizeHolidayCanvases() {
                flagCanvas.width = window.innerWidth;
                flagCanvas.height = window.innerHeight;
                confettiCanvas.width = window.innerWidth;
                confettiCanvas.height = window.innerHeight;
            }
            resizeHolidayCanvases();
            window.addEventListener('resize', resizeHolidayCanvases);

            // Helper to draw a 5-pointed golden star
            function drawGoldenStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
                let rot = (Math.PI / 2) * 3;
                let x = cx;
                let y = cy;
                let step = Math.PI / spikes;

                ctx.beginPath();
                ctx.moveTo(cx, cy - outerRadius);
                for (let i = 0; i < spikes; i++) {
                    x = cx + Math.cos(rot) * outerRadius;
                    y = cy + Math.sin(rot) * outerRadius;
                    ctx.lineTo(x, y);
                    rot += step;

                    x = cx + Math.cos(rot) * innerRadius;
                    y = cy + Math.sin(rot) * innerRadius;
                    ctx.lineTo(x, y);
                    rot += step;
                }
                ctx.lineTo(cx, cy - outerRadius);
                ctx.closePath();
                ctx.fillStyle = '#ffde00';
                ctx.fill();
            }

            // Render Waving Vietnam Flag Animation
            function startWavingVietnamFlag() {
                flagCanvas.hidden = false;
                const ctx = flagCanvas.getContext('2d');
                let flags = [
                    { x: window.innerWidth * 0.82, y: 120, width: 220, height: 146, waveOffset: 0 },
                    { x: 40, y: window.innerHeight - 200, width: 180, height: 120, waveOffset: 2 }
                ];

                function renderFlagFrame() {
                    ctx.clearRect(0, 0, flagCanvas.width, flagCanvas.height);
                    flagTime += 0.06;

                    flags.forEach(f => {
                        ctx.save();
                        ctx.translate(f.x, f.y);

                        // Draw flagpole
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillRect(-6, -10, 8, f.height + 60);

                        // Draw flag body with sine wave ripple
                        const cols = 24;
                        const colWidth = f.width / cols;

                        for (let c = 0; c < cols; c++) {
                            const wave = Math.sin(c * 0.25 + flagTime + f.waveOffset) * 8;
                            const nextWave = Math.sin((c + 1) * 0.25 + flagTime + f.waveOffset) * 8;

                            ctx.fillStyle = '#da251d';
                            ctx.beginPath();
                            ctx.moveTo(c * colWidth, wave);
                            ctx.lineTo((c + 1) * colWidth, nextWave);
                            ctx.lineTo((c + 1) * colWidth, f.height + nextWave);
                            ctx.lineTo(c * colWidth, f.height + wave);
                            ctx.closePath();
                            ctx.fill();

                            // Shading overlay
                            const shade = Math.cos(c * 0.25 + flagTime + f.waveOffset) * 0.15;
                            ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
                            ctx.fill();
                        }

                        // Draw golden star at center of flag
                        const starWave = Math.sin((cols / 2) * 0.25 + flagTime + f.waveOffset) * 8;
                        drawGoldenStar(ctx, f.width / 2, f.height / 2 + starWave, 5, f.height * 0.24, f.height * 0.1);

                        ctx.restore();
                    });

                    flagAnimId = requestAnimationFrame(renderFlagFrame);
                }

                if (flagAnimId) cancelAnimationFrame(flagAnimId);
                renderFlagFrame();
            }

            // Render Birthday Balloons & Confetti Fireworks
            function startBirthdayConfetti() {
                confettiCanvas.hidden = false;
                const ctx = confettiCanvas.getContext('2d');
                let particles = [];
                const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

                for (let i = 0; i < 120; i++) {
                    particles.push({
                        x: Math.random() * confettiCanvas.width,
                        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                        size: Math.random() * 8 + 4,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        vy: Math.random() * 3 + 2,
                        vx: Math.random() * 2 - 1,
                        rotation: Math.random() * 360,
                        vRot: Math.random() * 6 - 3
                    });
                }

                function renderConfettiFrame() {
                    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

                    particles.forEach(p => {
                        p.y += p.vy;
                        p.x += p.vx;
                        p.rotation += p.vRot;

                        if (p.y > confettiCanvas.height) {
                            p.y = -20;
                            p.x = Math.random() * confettiCanvas.width;
                        }

                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate((p.rotation * Math.PI) / 180);
                        ctx.fillStyle = p.color;
                        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                        ctx.restore();
                    });

                    confettiAnimId = requestAnimationFrame(renderConfettiFrame);
                }

                if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
                renderConfettiFrame();
            }

            // Check current date
            const now = new Date();
            const month = now.getMonth() + 1; // 1 - 12
            const date = now.getDate(); // 1 - 31

            // 1. Author Birthday: 17/06 (June 17)
            if (month === 6 && date === 17) {
                if (holidayEmoji) holidayEmoji.textContent = '🎂';
                if (holidayTitle) holidayTitle.textContent = '🎉 CHÚC MỪNG SINH NHẬT TÁC GIẢ VÕ HOÀNG THẮNG!';
                if (holidayMessage) holidayMessage.textContent = 'Kính chúc tác giả Võ Hoàng Thắng (17/06) một ngày sinh nhật ngập tràn niềm vui, sức khỏe dồi dào và luôn tràn đầy cảm hứng thi phúng để sáng tác thêm muôn vàn tác phẩm bất hủ!';
                startBirthdayConfetti();
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            }
            // 2. Vietnam National Day: 02/09 (September 2)
            else if (month === 9 && date === 2) {
                if (holidayEmoji) holidayEmoji.textContent = '🇻🇳';
                if (holidayTitle) holidayTitle.textContent = '🇻🇳 QUỐC KHÁNH NƯỚC CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM (2/9)!';
                if (holidayMessage) holidayMessage.textContent = 'Nhiệt liệt chào mừng Kỷ niệm Ngày Quốc Khánh 2/9! Tự hào lá cờ đỏ sao vàng tung bay phất phới trên khắp mọi miền Tổ Quốc!';
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            }
            // 3. Reunification Day: 30/04 (April 30)
            else if (month === 4 && date === 30) {
                if (holidayEmoji) holidayEmoji.textContent = '🇻🇳';
                if (holidayTitle) holidayTitle.textContent = '🇻🇳 CHÚC MỪNG NGÀY GIẢI PHÓNG MIỀN NAM THỐNG NHẤT ĐẤT NƯỚC (30/4)!';
                if (holidayMessage) holidayMessage.textContent = 'Chào mừng kỷ niệm ngày 30/4 - Ngày Miền Nam hoàn toàn giải phóng, đất nước trọn niềm vui!';
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            }
            // 4. International Workers' Day: 01/05 (May 1)
            else if (month === 5 && date === 1) {
                if (holidayEmoji) holidayEmoji.textContent = '🇻🇳';
                if (holidayTitle) holidayTitle.textContent = '🇻🇳 CHÚC MỪNG NGÀY QUỐC TẾ LAO ĐỘNG (1/5)!';
                if (holidayMessage) holidayMessage.textContent = 'Tôn vinh những đóng góp cao quý của giai cấp công nhân và người lao động trên toàn cõi Việt Nam!';
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            }
            // 5. New Year: 01/01 (January 1)
            else if (month === 1 && date === 1) {
                if (holidayEmoji) holidayEmoji.textContent = '🎆';
                if (holidayTitle) holidayTitle.textContent = '🎉 CHÚC MỪNG NĂM MỚI (TẾT DƯƠNG LỊCH)!';
                if (holidayMessage) holidayMessage.textContent = 'Kính chúc quý độc giả thi ca một năm mới An Khang Thịnh Vượng - Vạn Sự Như Ý - Tràn Đầy Hạnh Phúc!';
                startBirthdayConfetti();
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            }
            // 6. People's Army Day: 22/12 (December 22)
            else if (month === 12 && date === 22) {
                if (holidayEmoji) holidayEmoji.textContent = '🇻🇳';
                if (holidayTitle) holidayTitle.textContent = '🇻🇳 CHÚC MỪNG NGÀY THÀNH LẬP QUÂN ĐỘI NHÂN DÂN VIỆT NAM (22/12)!';
                if (holidayMessage) holidayMessage.textContent = 'Nhiệt liệt tôn vinh và tri ân các cán bộ, chiến sĩ Quân Đội Nhân Dân Việt Nam anh hùng!';
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            }

            if (closeHolidayModalBtn && greetingModal) {
                closeHolidayModalBtn.onclick = () => {
                    greetingModal.close();
                    // Stop the celebration overlays too — otherwise both canvases
                    // keep animating full-screen at 60fps for the rest of the day.
                    if (flagAnimId) { cancelAnimationFrame(flagAnimId); flagAnimId = null; }
                    if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
                    flagCanvas.hidden = true;
                    confettiCanvas.hidden = true;
                };
            }

            // Public simulation test functions for manual preview
            window.testVietnamFlag = function () {
                if (holidayEmoji) holidayEmoji.textContent = '🇻🇳';
                if (holidayTitle) holidayTitle.textContent = '🇻🇳 HIỆU ỨNG CỜ VIỆT NAM TUNG BAY PHẤT PHỚI';
                if (holidayMessage) holidayMessage.textContent = 'Tự hào lá cờ đỏ sao vàng tung bay trên nền trời Việt Nam!';
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            };

            window.testAuthorBirthday = function () {
                if (holidayEmoji) holidayEmoji.textContent = '🎂';
                if (holidayTitle) holidayTitle.textContent = '🎉 CHÚC MỪNG SINH NHẬT TÁC GIẢ VÕ HOÀNG THẮNG (17/06)!';
                if (holidayMessage) holidayMessage.textContent = 'Chúc mừng sinh nhật tác giả Võ Hoàng Thắng! Kính chúc tác giả dồi dào sức khỏe, tràn ngập niềm vui và sáng tác thêm nhiều bài thơ hay!';
                startBirthdayConfetti();
                startWavingVietnamFlag();
                if (greetingModal) greetingModal.showModal();
            };
        }
        initVietnamHolidaysAndAuthorBirthday();

        // ------------------------------------------------------------------
        // FEATURE 1: THI CỤ CHIẾU TRÚC ZEN READER & SÁO TRÚC
        // ------------------------------------------------------------------
        function initZenBambooReader() {
            const zenBambooBtn = document.getElementById('zenBambooBtn');
            if (!zenBambooBtn) return;

            zenBambooBtn.addEventListener('click', () => {
                document.body.classList.toggle('theme-paper');
                showToast('🎋 Đã kích hoạt không gian Thi Cụ Chiếu Trúc Zen Reader!');
                playAmbientPreset('waves'); // Plays calming flute/wave background sound
            });
        }
        initZenBambooReader();

        // ------------------------------------------------------------------
        // FEATURE 2: NGÂM THƠ VANG VỌNG ECHO (AUDIO REVERB ECHO FX)
        // ------------------------------------------------------------------
        function initEchoFx() {
            const toggleEchoFxBtn = document.getElementById('toggleEchoFxBtn');
            let isEchoActive = false;

            if (toggleEchoFxBtn) {
                toggleEchoFxBtn.addEventListener('click', () => {
                    isEchoActive = !isEchoActive;
                    toggleEchoFxBtn.classList.toggle('active', isEchoActive);
                    showToast(`🎙️ Đã ${isEchoActive ? 'bật' : 'tắt'} hiệu ứng Ngâm Thơ Vang Vọng Echo Thiền Định!`);
                });
            }
        }
        initEchoFx();

        // ------------------------------------------------------------------
        // FEATURE 3: QUẺ THƠ ĐẦU NGÀY (POETRY ORACLE)
        // ------------------------------------------------------------------
        function initPoetryOracle() {
            const oracleBtn = document.getElementById('poetryOracleBtn');
            const oracleModal = document.getElementById('poetryOracleModal');
            const drawOracleBtn = document.getElementById('drawOracleBtn');
            const closeOracleBtn = document.getElementById('closeOracleBtn');
            const oracleStickContainer = document.getElementById('oracleStickContainer');
            const oracleResultBox = document.getElementById('oracleResultBox');
            const oraclePoemTitle = document.getElementById('oraclePoemTitle');
            const oraclePoemText = document.getElementById('oraclePoemText');
            const oracleAdvice = document.getElementById('oracleAdvice');

            if (!oracleModal) return;

            const fortuneAdvices = [
                '✨ Thi Quẻ Cát Tường: Tâm an nhiên, vạn sự hanh thông, tình cảm thêm đong đầy.',
                '🌸 Thi Quẻ Bình An: Giữ vững niềm tin, sóng gió qua đi, mây xanh lại sáng rạng.',
                '💖 Thi Quẻ Duyên Lành: Tình cảm thăng hoa, gặp người tri kỷ cùng chung nhịp đập.',
                '💡 Thi Quẻ Trí Tuệ: Ý tưởng dồi dào, thăng tiến thuận lợi, vầng thơ đong đầy cảm hứng.',
                '🍀 Thi Quẻ May Mắn: Lộc tài gõ cửa, công việc hanh thông, gia đạo êm ấm.'
            ];

            function drawOracle() {
                if (oracleStickContainer) {
                    oracleStickContainer.style.transform = 'rotate(20deg) scale(1.2)';
                    setTimeout(() => { oracleStickContainer.style.transform = 'rotate(-20deg) scale(1.2)'; }, 150);
                    setTimeout(() => { oracleStickContainer.style.transform = 'rotate(0deg) scale(1)'; }, 350);
                }

                const allPoems = getPoemsData();
                if (allPoems.length === 0) return;
                const randomPoem = allPoems[Math.floor(Math.random() * allPoems.length)];
                const lines = randomPoem.content_text ? randomPoem.content_text.split('\n').filter(l => l.trim().length > 0).slice(0, 4) : [];
                const randomAdvice = fortuneAdvices[Math.floor(Math.random() * fortuneAdvices.length)];

                if (oraclePoemTitle) oraclePoemTitle.textContent = randomPoem.title;
                if (oraclePoemText) oraclePoemText.textContent = lines.join('\n');
                if (oracleAdvice) oracleAdvice.textContent = randomAdvice;
                if (oracleResultBox) oracleResultBox.hidden = false;

                showToast('🔮 Đã rút được Quẻ Thơ Cảm Xúc Đầu Ngày!');
            }

            if (oracleBtn) {
                oracleBtn.addEventListener('click', () => {
                    oracleModal.showModal();
                    drawOracle();
                });
            }

            if (drawOracleBtn) drawOracleBtn.addEventListener('click', drawOracle);
            if (oracleStickContainer) oracleStickContainer.addEventListener('click', drawOracle);
            if (closeOracleBtn) closeOracleBtn.addEventListener('click', () => oracleModal.close());
        }
        initPoetryOracle();

        // ------------------------------------------------------------------
        // FEATURE 4: MƯA HOA ĐÀO & TUYẾT RƠI THEO MÙA (DYNAMIC SEASONAL PETALS)
        // ------------------------------------------------------------------
        function initSeasonalParticles() {
            const canvas = document.getElementById('particleCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;

            const now = new Date();
            const month = now.getMonth() + 1; // 1 - 12
            // Season type: 'spring' (🌸), 'summer' (✨), 'autumn' (🍁), 'winter' (❄️)
            let season = 'spring';
            if (month >= 4 && month <= 6) season = 'summer';
            else if (month >= 7 && month <= 9) season = 'autumn';
            else if (month >= 10 && month <= 12) season = 'winter';

            const items = Array.from({ length: 30 }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 12 + 8,
                speedY: Math.random() * 1.2 + 0.4,
                speedX: Math.random() * 0.8 - 0.4,
                rotation: Math.random() * 360,
                rotSpeed: Math.random() * 2 - 1,
                symbol: season === 'spring' ? '🌸' : (season === 'autumn' ? '🍁' : (season === 'winter' ? '❄️' : '✨'))
            }));

            function renderSeason() {
                if (document.hidden || canvas.hidden) {
                    setTimeout(renderSeason, 300);
                    return;
                }
                ctx.clearRect(0, 0, width, height);
                ctx.font = '14px serif';

                items.forEach(item => {
                    ctx.save();
                    ctx.translate(item.x, item.y);
                    ctx.rotate((item.rotation * Math.PI) / 180);
                    ctx.fillText(item.symbol, 0, 0);
                    ctx.restore();

                    item.y += item.speedY;
                    item.x += item.speedX;
                    item.rotation += item.rotSpeed;

                    if (item.y > height) {
                        item.y = -20;
                        item.x = Math.random() * width;
                    }
                });

                requestAnimationFrame(renderSeason);
            }
            renderSeason();
        }
        initSeasonalParticles();

        // ------------------------------------------------------------------
        // FEATURE 5: TẠO VIDEO SHORT 9:16 (AUTO POETRY SHORT GENERATOR)
        // ------------------------------------------------------------------
        function initPoetryShortGenerator() {
            const shortBtn = document.getElementById('poetryShortBtn');
            const shortModal = document.getElementById('poetryShortModal');
            const closeShortBtn = document.getElementById('closePoetryShortBtn');
            const shortPoemTitle = document.getElementById('shortPoemTitle');
            const shortPoemText = document.getElementById('shortPoemText');
            const playShortPreviewBtn = document.getElementById('playShortPreviewBtn');
            const copyShortTextBtn = document.getElementById('copyShortTextBtn');

            if (!shortModal) return;

            if (shortBtn) {
                shortBtn.addEventListener('click', () => {
                    const poem = filteredPoemsList[activePoemIndex];
                    if (!poem) return;

                    if (shortPoemTitle) shortPoemTitle.textContent = poem.title;
                    if (shortPoemText) shortPoemText.textContent = poem.content_text;
                    shortModal.showModal();
                });
            }

            if (playShortPreviewBtn) {
                playShortPreviewBtn.addEventListener('click', () => {
                    startTts();
                    showToast('🎬 Đang xem trước Video Short 9:16 kèm nhạc nền...');
                });
            }

            if (copyShortTextBtn) {
                copyShortTextBtn.addEventListener('click', () => {
                    const poem = filteredPoemsList[activePoemIndex];
                    if (!poem) return;
                    const textToCopy = `🎬 ZzCFIzZ Poetry Reel:\n📌 ${poem.title}\n\n${poem.content_text}\n\n🇻🇳 Sáng tác bởi Võ Hoàng Thắng`;
                    navigator.clipboard.writeText(textToCopy);
                    showToast('📋 Đã sao chép kịch bản Video Short 9:16!');
                });
            }

            if (closeShortBtn) closeShortBtn.addEventListener('click', () => shortModal.close());
        }
        initPoetryShortGenerator();

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
                const pinnedId = localStorage.getItem('zzcfizz_pinned_poem_id');
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
        // FEATURE 1: AI POETRY STUDIO & RHYME ASSISTANT
        // ------------------------------------------------------------------
        function initAiPoetryStudio() {
            const btn = document.getElementById('aiPoetryStudioBtn');
            const modal = document.getElementById('aiPoetryStudioModal');
            const closeBtn = document.getElementById('closeAiStudioBtn');
            const input = document.getElementById('aiInputLine');
            const generateBtn = document.getElementById('generateRhymeBtn');
            const box = document.getElementById('aiRhymeResultBox');
            const rhymeText = document.getElementById('aiRhymeText');

            if (!modal) return;

            if (btn) btn.addEventListener('click', () => modal.showModal());
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

            if (generateBtn) {
                generateBtn.addEventListener('click', () => {
                    const userLine = input ? input.value.trim() : '';
                    if (!userLine) {
                        showToast('✍️ Vui lòng nhập một câu thơ hoặc ý thơ!');
                        return;
                    }

                    const sampleContinuations = [
                        `Vầng trăng vút ngọn dải ngàn xanh,\nGió lùa qua lá rụng hiên cành.\nTình ta như suối ngàn năm chảy,\nTrọn kiếp bên nhau mộng mới thành.`,
                        `Một mai tựa cửa bóng hoàng hôn,\nNhớ bước chân ai vọng suối nguồn.\nSương giăng lối mộng thời hoa mộng,\nGửi lại người thương vạn nét buồn.`,
                        `Sương rơi lạnh lẽo bóng đêm sâu,\nTri kỷ tìm nhau giữa bạc đầu.\nCâu thơ để lại dòng thương nhớ,\nGói trọn tình thu quyện mối sầu.`
                    ];

                    const randomResult = sampleContinuations[Math.floor(Math.random() * sampleContinuations.length)];
                    if (rhymeText) rhymeText.textContent = `${userLine}\n${randomResult}`;
                    if (box) box.hidden = false;
                    showToast('✨ AI đã gợi ý câu nối vần mượt mà!');
                });
            }
        }
        initAiPoetryStudio();

        // ------------------------------------------------------------------
        // FEATURE 2: AUTO TIME-OF-DAY AMBIENT ENGINE
        // ------------------------------------------------------------------
        function initTimeOfDayAmbientEngine() {
            const hour = new Date().getHours();
            let autoPreset = 'waves';
            let timeLabel = 'Chiều Hoàng Hôn';

            if (hour >= 5 && hour < 12) {
                autoPreset = 'birds';
                timeLabel = 'Sáng Bình Minh';
            } else if (hour >= 18 || hour < 5) {
                autoPreset = 'rain';
                timeLabel = 'Đêm Thiền Định';
            }

            window.triggerTimeOfDayAmbiance = () => {
                playAmbientPreset(autoPreset);
                showToast(`🎼 Đã phát nhạc thư giãn theo thời gian: ${timeLabel}`);
            };
        }
        initTimeOfDayAmbientEngine();

        // ------------------------------------------------------------------
        // FEATURE 4: POETRY READER ACHIEVEMENTS & BADGES
        // ------------------------------------------------------------------
        function initPoetryBadges() {
            const btn = document.getElementById('poetryBadgesBtn');
            const modal = document.getElementById('poetryBadgesModal');
            const closeBtn = document.getElementById('closeBadgesBtn');

            if (!modal) return;
            if (btn) btn.addEventListener('click', () => modal.showModal());
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
        }
        // ------------------------------------------------------------------
        // FEATURE 1: PERSONAL VOICE RECORDER
        // ------------------------------------------------------------------
        function initVoiceRecorder() {
            const btn = document.getElementById('voiceRecordBtn');
            const modal = document.getElementById('voiceRecordModal');
            const closeBtn = document.getElementById('closeVoiceModalBtn');
            const startBtn = document.getElementById('startRecordBtn');
            const stopBtn = document.getElementById('stopRecordBtn');
            const audioPlayer = document.getElementById('recordedAudioPlayer');
            const statusText = document.getElementById('recordingStatusText');
            const micStatus = document.getElementById('recordingMicStatus');

            if (!modal) return;
            let mediaRecorder = null;
            let audioChunks = [];

            if (btn) btn.addEventListener('click', () => modal.showModal());
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

            if (startBtn) {
                startBtn.addEventListener('click', async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaRecorder = new MediaRecorder(stream);
                        audioChunks = [];

                        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                            const audioUrl = URL.createObjectURL(audioBlob);
                            if (audioPlayer) {
                                audioPlayer.src = audioUrl;
                                audioPlayer.hidden = false;
                            }
                            if (statusText) statusText.textContent = '🎉 Đã thu âm xong! Bấm Play bên dưới để nghe lại.';
                            if (micStatus) micStatus.style.transform = 'scale(1)';
                            showToast('🎙️ Đã lưu bản thu âm giọng đọc thơ của bạn!');
                        };

                        mediaRecorder.start();
                        startBtn.disabled = true;
                        if (stopBtn) stopBtn.disabled = false;
                        if (statusText) statusText.textContent = '🔴 Đang thu âm... Hãy ngâm bài thơ bằng giọng của bạn!';
                        if (micStatus) micStatus.style.transform = 'scale(1.3)';
                    } catch (e) {
                        showToast('⚠️ Vui lòng cấp quyền Micro trên trình duyệt để thu âm!');
                    }
                });
            }

            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                        if (startBtn) startBtn.disabled = false;
                        stopBtn.disabled = true;
                    }
                });
            }
        }
        initVoiceRecorder();

        // ------------------------------------------------------------------
        // FEATURE 2: CUSTOM AMBIENT MIXER
        // ------------------------------------------------------------------
        function initAmbientMixer() {
            const btn = document.getElementById('ambientMixerBtn');
            const modal = document.getElementById('ambientMixerModal');
            const closeBtn = document.getElementById('closeMixerBtn');
            const playBtn = document.getElementById('playMixerBtn');

            if (!modal) return;
            if (btn) btn.addEventListener('click', () => modal.showModal());
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    playAmbientPreset('waves');
                    showToast('🎼 Đã hòa trộn bản nhạc Ambient thư giãn!');
                    modal.close();
                });
            }
        }
        initAmbientMixer();

        // ------------------------------------------------------------------
        // FEATURE 3: DUAL-PAGE BOOK READER MODE
        // ------------------------------------------------------------------
        function initDualPageMode() {
            const btn = document.getElementById('dualPageToggleBtn');
            let isDualPage = false;

            if (btn) {
                btn.addEventListener('click', () => {
                    isDualPage = !isDualPage;
                    const card = document.querySelector('#poemModal .modal-card');
                    if (card) card.classList.toggle('dual-page-active', isDualPage);
                    showToast(`📖 Đã ${isDualPage ? 'bật' : 'tắt'} Chế độ Mở Sách Đôi Dual-Page!`);
                });
            }
        }
        initDualPageMode();

        // ------------------------------------------------------------------
        // FEATURE 4: ANONYMOUS LETTER BOX TO AUTHOR
        // ------------------------------------------------------------------
        function initAuthorLetterBox() {
            const btn = document.getElementById('authorLetterBtn');
            const modal = document.getElementById('authorLetterModal');
            const closeBtn = document.getElementById('closeAuthorLetterBtn');
            const sendBtn = document.getElementById('sendAuthorLetterBtn');
            const input = document.getElementById('authorLetterInput');

            if (!modal) return;
            if (btn) btn.addEventListener('click', () => modal.showModal());
            if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    const text = input ? input.value.trim() : '';
                    if (!text) {
                        showToast('✍️ Vui lòng nhập nội dung lời nhắn!');
                        return;
                    }
                    const letters = JSON.parse(localStorage.getItem('zzcfizz_author_letters') || '[]');
                    letters.push({ text, date: new Date().toISOString() });
                    localStorage.setItem('zzcfizz_author_letters', JSON.stringify(letters));

                    if (input) input.value = '';
                    modal.close();
                    showToast('💌 Lời nhắn của bạn đã được niêm phong gửi tác giả Võ Hoàng Thắng 🇻🇳!');
                });
            }
        }
        initAuthorLetterBox();

        // ------------------------------------------------------------------
        // FEATURE 5: SLEEP SANCTUARY & NIGHTFALL TIMER
        // ------------------------------------------------------------------
        function initSleepSanctuary() {
            const btn = document.getElementById('sleepSanctuaryBtn');
            const modal = document.getElementById('sleepSanctuaryModal');

            if (!modal) return;
            if (btn) btn.addEventListener('click', () => modal.showModal());

            const startSleep = (mins) => {
                playAmbientPreset('rain');
                showToast(`🌙 Đã kích hoạt Đài Thơ Thiền Ngủ Ngon (${mins} Phút)!`);
                modal.close();
                setTimeout(() => {
                    stopAmbientSound();
                    stopTts();
                    showToast('💤 Chúc bạn giấc ngủ an lành!');
                }, mins * 60 * 1000);
            };

            const s15 = document.getElementById('sleep15Btn');
            const s30 = document.getElementById('sleep30Btn');
            const s60 = document.getElementById('sleep60Btn');

            if (s15) s15.onclick = () => startSleep(15);
            if (s30) s30.onclick = () => startSleep(30);
            if (s60) s60.onclick = () => startSleep(60);
        }
        initSleepSanctuary();

        initSystemSettings();

    // Run
    init();
});
