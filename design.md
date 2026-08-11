# Design — ZzCFIzZ Poetry

Locked design system. Future Hallmark runs read this file first; pages defer
to it. Amend intentionally — the file is the rule.

## System
- Genre · atmospheric
- Macrostructure · Portfolio Grid (filterable poem grid IS the page)
- Theme · catalog: Midnight, tuned in-place (10-theme engine preserved)
- Axes · dark (L 16%) / classical-serif display (Playfair, roman) / cool accent (hue 258–265)

## Token contract
This project predates Hallmark and keeps its own colour contract in
`style.css` per theme (`--bg-page`, `--bg-surface`, `--bg-card`, `--bg-hover`,
`--border-color`, `--text-primary/-secondary/-muted`, `--accent-primary`).
Structural tokens live in `tokens.css` (source of truth): `--space-*` 4-pt
scale, `--text-*` 1.25 ratio, `--ease-out/in/in-out`, `--dur-*`, `--z-*`.

Canonical Midnight values (hue anchor 265):

```css
body.theme-midnight {
  --bg-page:        oklch(16% 0.030 265);   /* paper   */
  --bg-card:        oklch(22% 0.034 265);   /* paper-2 — elevation = lightness, never glass */
  --border-color:   oklch(33% 0.030 265);   /* rule    */
  --text-primary:   oklch(95% 0.008 265);   /* ink     */
  --text-muted:     oklch(70% 0.020 265);
  --accent-primary: oklch(62% 0.170 258);   /* ONE accent, ≤3% per viewport */
  --text-on-accent: #ffffff;
}
```

## Typography
- Display · Playfair Display 700, roman only — italic headers banned
- Body · Lora 400 (poem text) · Plus Jakarta Sans (UI) — 3-family ceiling
- Every face MUST ship the Vietnamese subset — non-negotiable for this content

## CTA voice
- Primary · accent fill · `--radius-full` pill · `--text-on-accent` ink
- Secondary · hairline outline on `--bg-card` · same pill radius
- Press state · `translateY(1px)`, instant

## Motion stance
- ≤3 primitives per page: card-lift (transform-only), one-shot line reveal, karaoke tint
- Banned here: bounce easing, cursor followers, tilt, glassmorphism, gradient text,
  animated orbs, layout-property transitions
- Blooms · exactly 2, static radial-gradient, no filter:blur (mobile scroll perf)
- Reduced-motion fallback · ≤150 ms opacity crossfade (global override exists)

## Exports
`tokens.css` (in this project) is the source of truth. For Tailwind v4
`@theme`, DTCG `tokens.json`, or shadcn/ui CSS variables, ask "extend
design.md with Tailwind exports".
