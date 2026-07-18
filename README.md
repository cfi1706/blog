# ZzCFIzZ — Tuyển Tập Thơ

Static Vietnamese poetry reader. No build step, no framework — open `index.html`.

## Features

- Poem grid/list views, search, mood filters, sort, favorites (localStorage)
- Reader modal: adjustable font/size/align, zen mode, auto-scroll, reading progress
- Text-to-speech (Web Speech API, Vietnamese) with karaoke line highlight
- Quote-card image generator (canvas → PNG) with QR
- Ambient sounds (Web Audio synth: rain / waves / pad)
- Reactions, personal notes, recently viewed, keyword "AI" poem suggester
- 4 themes, deep-linking (`#poem-<id>`), keyboard shortcuts (Ctrl+K, ←/→, Esc)

## Files

| File | Role |
|------|------|
| `index.html` | Page markup |
| `style.css` | All styles + themes |
| `app.js` | All app logic |
| `poems.js` | Runtime poem database (`window.POEMS_DATA`) — **the only data file loaded** |
| `images/` | Local poem images |

### Data pipeline (build inputs, not loaded at runtime)

`download_all.js` scrapes poems + images from the source blog → `clean_poems.json`
→ `poems_data.json` → `convert_to_js.js` emits `poems.js`.

```bash
node download_all.js     # fetch images, write poems_data.json
node convert_to_js.js    # poems_data.json -> poems.js
```

`all_posts.json`, `clean_poems.json`, `poems_data.json` are pipeline
artifacts — regenerable, not referenced by the site.

## Run

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Opening `index.html` directly works too; TTS network fallback needs a server.

## Note

`config` in this repo is an SSH host config (personal/work Git identities) —
it looks misplaced in a web project; consider moving it to `~/.ssh/config`.
