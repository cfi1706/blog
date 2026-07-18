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

        // Filter search query
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(p => (p.title && p.title.toLowerCase().includes(q)) || (p.content_text && p.content_text.toLowerCase().includes(q)));
        }

        // Sort
        if (currentSort === 'newest') {
            list.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (currentSort === 'oldest') {
            list.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (currentSort === 'title-asc') {
            list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
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

        filteredPoemsList.forEach((poem, index) => {
            const card = createPoemCard(poem, index);
            poemsGrid.appendChild(card);
        });

        observeElements();
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
    function toggleFavorite(poemId) {
        if (favorites.includes(poemId)) {
            favorites = favorites.filter(id => id !== poemId);
            showToast('Đã xóa bài thơ khỏi danh sách yêu thích.');
        } else {
            favorites.push(poemId);
            showToast('❤️ Đã thêm bài thơ vào danh sách yêu thích!');
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

        if (modalTitle) modalTitle.textContent = poem.title;
        const verseCount = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0).length : 0;
        if (modalDate) modalDate.innerHTML = `<i class="ri-calendar-line"></i> ${poem.date_formatted || ''} &nbsp;•&nbsp; <i class="ri-quill-pen-line"></i> ${verseCount} câu thơ`;
        if (modalCategory) modalCategory.textContent = 'Tác Phẩm Thơ';

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

        // Restore saved font family
        const savedFontFamily = localStorage.getItem('zzcfizz_font_family') || "'Lora', serif";
        if (fontFamilySelect) {
            fontFamilySelect.value = savedFontFamily;
        }
        if (modalPoemText) {
            modalPoemText.style.fontFamily = savedFontFamily;
        }

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
        stopAutoScroll();
        disableZenMode();
        updateUrlHash(null);

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
            filter.connect(ambientGainNode);
            whiteNoise.start();
            ambientNodes.push(whiteNoise, filter);
            showToast('🌧️ Đã bật âm thanh tiếng mưa rơi');
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
            filter.connect(ambientGainNode);
            whiteNoise.start();
            lfo.start();
            ambientNodes.push(whiteNoise, filter, lfo, lfoGain);
            showToast('🌊 Đã bật âm thanh sóng biển vỗ');
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
            padFilter.connect(ambientGainNode);

            osc1.start();
            osc2.start();
            ambientNodes.push(osc1, osc2, padFilter);
            showToast('🍃 Đã bật âm thanh gió trầm lắng');
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
        defaultOpt.textContent = 'Giọng AI Mặc Định';
        ttsVoiceSelect.appendChild(defaultOpt);

        if (voices.length === 0) return;

        const viVoices = voices.filter(v => v.lang && v.lang.toLowerCase().includes('vi'));
        const otherVoices = voices.filter(v => !v.lang || !v.lang.toLowerCase().includes('vi'));

        const savedVoiceURI = localStorage.getItem('zzcfizz_tts_voice_uri');

        if (viVoices.length > 0) {
            const viOptGroup = document.createElement('optgroup');
            viOptGroup.label = 'Giọng Tiếng Việt';
            viVoices.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.voiceURI || v.name;
                opt.textContent = `${v.name}`;
                if (savedVoiceURI && (v.voiceURI === savedVoiceURI || v.name === savedVoiceURI)) {
                    opt.selected = true;
                }
                viOptGroup.appendChild(opt);
            });
            ttsVoiceSelect.appendChild(viOptGroup);
        }

        if (otherVoices.length > 0) {
            const otherOptGroup = document.createElement('optgroup');
            otherOptGroup.label = 'Giọng Nói Khác';
            otherVoices.slice(0, 10).forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.voiceURI || v.name;
                opt.textContent = `${v.name} (${v.lang})`;
                if (savedVoiceURI && (v.voiceURI === savedVoiceURI || v.name === savedVoiceURI)) {
                    opt.selected = true;
                }
                otherOptGroup.appendChild(opt);
            });
            ttsVoiceSelect.appendChild(otherOptGroup);
        }

        if (savedVoiceURI && savedVoiceURI !== 'auto') {
            ttsVoiceSelect.value = savedVoiceURI;
        } else if (viVoices.length > 0) {
            ttsVoiceSelect.value = viVoices[0].voiceURI || viVoices[0].name;
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
        ttsBtnText.textContent = 'Dừng Đọc';

        ttsQueue = phrases;
        ttsQueueIndex = 0;

        let selectedVoice = getSelectedTtsVoice();

        if (selectedVoice) {
            showToast(`🔊 Đọc với giọng ${selectedVoice.name}...`);
            speakNextWebSpeech(selectedVoice);
        } else {
            showToast('🔊 Đang đọc bài thơ bằng giọng nói AI...');
            speakNextWebSpeech(null);
        }
    }

    function getSelectedTtsSpeed() {
        return parseFloat(ttsSpeedSelect ? ttsSpeedSelect.value : '1.0');
    }

    function handleTtsFinished() {
        stopTts();
        if (ttsAutoplayCheck && ttsAutoplayCheck.checked && activePoemIndex < filteredPoemsList.length - 1) {
            showToast('▶️ Tự động chuyển bài tiếp theo...');
            setTimeout(() => {
                openReaderModal(activePoemIndex + 1);
                startTts();
            }, 1500);
        }
    }

    function speakNextWebSpeech(viVoice) {
        if (!isTtsPlaying || ttsQueueIndex >= ttsQueue.length) {
            handleTtsFinished();
            return;
        }

        const phraseObj = ttsQueue[ttsQueueIndex];
        highlightActiveLine(phraseObj.lineIndex);

        ttsUtterance = new SpeechSynthesisUtterance(phraseObj.text);
        ttsUtterance.lang = 'vi-VN';
        ttsUtterance.rate = 0.88 * getSelectedTtsSpeed();
        ttsUtterance.pitch = 1.05;
        ttsUtterance.voice = viVoice;

        ttsUtterance.onend = () => {
            ttsQueueIndex++;
            speakNextWebSpeech(viVoice);
        };

        ttsUtterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                preloadNextAudioStream(ttsQueueIndex);
                playNextAudioStream();
                return;
            }
            ttsQueueIndex++;
            speakNextWebSpeech(viVoice);
        };

        window.speechSynthesis.speak(ttsUtterance);
    }

    function preloadNextAudioStream(currentIndex) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= ttsQueue.length) {
            ttsPreloadedAudio = null;
            return;
        }
        const phraseObj = ttsQueue[nextIndex];
        const chunk = phraseObj.text.substring(0, 200);
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
        ttsPreloadedAudio = new Audio(audioUrl);
        ttsPreloadedAudio.playbackRate = 0.92 * getSelectedTtsSpeed();
        ttsPreloadedAudio.load();
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

        if (ttsPreloadedAudio && ttsQueueIndex > 0) {
            ttsAudioInstance = ttsPreloadedAudio;
        } else {
            const chunk = phraseObj.text.substring(0, 200);
            const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
            ttsAudioInstance = new Audio(audioUrl);
            ttsAudioInstance.playbackRate = 0.92 * getSelectedTtsSpeed();
        }

        preloadNextAudioStream(ttsQueueIndex);

        ttsAudioInstance.onended = () => {
            ttsQueueIndex++;
            playNextAudioStream();
        };

        ttsAudioInstance.onerror = (e) => {
            ttsQueueIndex++;
            playNextAudioStream();
        };

        ttsAudioInstance.play().catch(err => {
            stopTts();
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
    function renderQuoteCardCanvas() {
        const poem = filteredPoemsList[activePoemIndex];
        if (!poem || !quoteCanvas) return;

        const ctx = quoteCanvas.getContext('2d');
        const width = 600;
        const height = 750;

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

        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✒️ ZzCFIzZ Poetry', width / 2, 70);

        ctx.shadowBlur = 0;

        ctx.fillStyle = currentCardStyle === 'paper' ? '#78350f' : '#ffffff';
        ctx.font = 'bold 30px "Cormorant Garamond", "Lora", serif';
        ctx.fillText(poem.title, width / 2, 130);

        ctx.strokeStyle = currentCardStyle === 'paper' ? '#d97706' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 60, 150);
        ctx.lineTo(width / 2 + 60, 150);
        ctx.stroke();

        const allLines = poem.content_text ? poem.content_text.split('\n').filter(l => l.trim().length > 0) : [];
        let selectedLines = [...allLines];
        const lineChoice = quoteLinesSelect ? quoteLinesSelect.value : 'full';

        if (lineChoice === 'first4') {
            selectedLines = allLines.slice(0, 4);
        } else if (lineChoice === 'last4') {
            selectedLines = allLines.slice(-4);
        } else {
            selectedLines = allLines.slice(0, 12);
        }

        ctx.font = 'italic 20px "Lora", serif';
        ctx.fillStyle = currentCardStyle === 'paper' ? '#451a03' : '#f1f5f9';
        ctx.textAlign = 'center';

        const startY = 220;
        const lineHeight = 38;

        selectedLines.forEach((line, idx) => {
            ctx.fillText(line, width / 2, startY + (idx * lineHeight));
        });

        const linesEndY = startY + (selectedLines.length * lineHeight);

        // Render Signature / Dedicated Name
        const signatureText = quoteSignatureInput ? quoteSignatureInput.value.trim() : '';
        if (signatureText) {
            ctx.font = 'italic 20px "Dancing Script", "Lora", serif';
            ctx.fillStyle = currentCardStyle === 'paper' ? '#d97706' : '#c084fc';
            ctx.textAlign = 'right';
            ctx.fillText(`— ${signatureText}`, width - 60, Math.min(linesEndY + 35, height - 120));
        }

        // Render QR Code & Footer Link
        const showQr = quoteQrCheckbox ? quoteQrCheckbox.checked : true;
        if (showQr) {
            const qrSize = 60;
            const qrX = 40;
            const qrY = height - 95;
            const linkUrl = `https://zzcfizz.blog/#poem-${poem.id}`;
            drawQrCodeCanvas(ctx, linkUrl, qrX, qrY, qrSize, currentCardStyle === 'paper' ? '#78350f' : '#ffffff', currentCardStyle === 'paper' ? '#fde68a' : 'rgba(15,23,42,0.6)');

            ctx.font = '12px sans-serif';
            ctx.fillStyle = currentCardStyle === 'paper' ? '#92400e' : 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'left';
            ctx.fillText('Quét để đọc thơ', qrX + qrSize + 12, qrY + 26);
            ctx.fillText(poem.date_formatted, qrX + qrSize + 12, qrY + 45);
        } else {
            ctx.font = '13px sans-serif';
            ctx.fillStyle = currentCardStyle === 'paper' ? '#92400e' : 'rgba(255,255,255,0.6)';
            ctx.textAlign = 'center';
            ctx.fillText(`${poem.date_formatted}  •  zzcfizz.blog`, width / 2, height - 50);
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
                const replyText = `Dựa trên cảm xúc và từ khóa "**${query}**", tôi gợi ý ${matches.length} bài thơ đặc sắc phù hợp nhất dành cho bạn:`;
                appendChatMessage('bot', replyText, matches);
            } else {
                const poems = getPoemsData();
                const randomPoem = poems[Math.floor(Math.random() * poems.length)];
                const replyText = `Tôi chưa tìm thấy bài thơ khớp hoàn toàn với từ khóa "**${query}**", nhưng xin gợi ý cho bạn bài thơ rất được yêu thích này:`;
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

        // Theme Toggle Dropdown
        themeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeMenu.hidden = !themeMenu.hidden;
            if (ambientMenu) ambientMenu.hidden = true;
        });

        themeOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                applyTheme(opt.dataset.setTheme);
                themeMenu.hidden = true;
            });
        });

        // Ambient Sound Controls
        if (ambientToggleBtn) {
            ambientToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ambientMenu.hidden = !ambientMenu.hidden;
                if (themeMenu) themeMenu.hidden = true;
            });
        }

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

        modalFavBtn.addEventListener('click', () => {
            const poem = filteredPoemsList[activePoemIndex];
            if (poem) toggleFavorite(poem.id);
        });

        modalCopyBtn.addEventListener('click', () => {
            const poem = filteredPoemsList[activePoemIndex];
            if (!poem) return;
            navigator.clipboard.writeText(`${poem.title}\n\n${poem.content_text}`).then(() => {
                showToast('📋 Đã sao chép văn bản bài thơ!');
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

        // Modal Body Scroll Progress
        if (modalBody) {
            modalBody.addEventListener('scroll', () => {
                const scrollTop = modalBody.scrollTop;
                const scrollHeight = modalBody.scrollHeight - modalBody.clientHeight;
                const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 100;
                if (readingProgressBar) readingProgressBar.style.width = `${progress}%`;
            });
        }

        // Window Scroll for Back to Top Button
        window.addEventListener('scroll', () => {
            if (backToTopBtn) {
                backToTopBtn.hidden = window.scrollY < 300;
            }
        });

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

    // Run
    init();
});
