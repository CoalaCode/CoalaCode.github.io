# Personal Developer Portfolio Website

## Project Overview
A single-page personal developer portfolio used for job applications. It showcases projects and provides a contact email.

Positioned as a **private, non-commercial portfolio** — deliberately not a freelance sales page. Copy must describe how I work, never sell services to a client, because a services pitch would trigger a mandatory §5 DDG Impressum and signals moonlighting to hiring managers.

## Identity
Two names, used deliberately — don't collapse them:

- **Max Schneider** — the person. Titles, `<h1>`, OG/Twitter tags, JSON-LD `name`, and the privacy-policy controller block.
- **CoalaCode** — the brand/mark. Logo wordmark, JSON-LD `alternateName`, manifest `short_name`, and parenthetically in descriptions ("Portfolio of Max Schneider (CoalaCode), …").

Contact address: `coalacode@protonmail.com`. It appears in `index.html` (mailto, link text, `data-email` on the copy button, JSON-LD) and twice in `datenschutz.html`. Change all of them together.

**There is no Impressum page, and no postal address anywhere.** That is a deliberate decision, not an oversight — see Privacy below.

## Tech Stack
- **HTML5, CSS3, vanilla JavaScript** — no frameworks, no build step
- **Hosting:** GitHub Pages (static only)
- **Contact:** a plain email address with a copy-to-clipboard button — no form, no third-party processor
- **Fonts:** self-hosted woff2 (never link Google Fonts; see Privacy below)
- **Design source:** Figma (accessed via MCP server)

## Project Structure
```
/
├── index.html          # Single landing page
├── datenschutz.html    # Privacy policy (DE + EN inline, must work without JS)
├── 404.html
├── robots.txt / sitemap.xml / site.webmanifest
├── css/
│   └── styles.css      # All styles, incl. self-hosted @font-face
├── js/
│   └── main.js         # i18n, project rendering, carousel, navigation
├── data/
│   ├── projects.json   # Project data (bilingual)
│   └── translations.json  # All UI copy (en / de)
├── assets/
│   ├── fonts/          # Self-hosted Inter + Roboto (variable, latin subset)
│   ├── images/         # Screenshots, logo, Open Graph card
│   └── icons/          # SVG icons and favicons
├── CLAUDE.md
└── .vscode/
    └── mcp.json        # Figma MCP server config
```

## Running locally
`fetch()` fails on `file://`, so the page must be served over HTTP. Use a server that
sends `Cache-Control: no-store` — plain `python3 -m http.server` sends no cache headers
at all, which makes the browser serve stale `data/*.json` (see Gotchas):
```bash
python3 -c "
import http.server
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
http.server.test(HandlerClass=H, port=8000)
"
```

## Gotchas that have already bitten us

**Edits to `data/*.json` can keep rendering the old copy.** `python3 -m http.server`
sends `Last-Modified` but no `Cache-Control`, so browsers fall back to *heuristic*
freshness and reuse the cached body without revalidating — the page renders an
outdated `projects.json` and a plain reload changes nothing. Clearing the cache from
the browser's settings UI does not evict an open tab's memory cache; DevTools →
Network → "Disable cache" does. `fetchJson()` now passes `cache: 'no-cache'` to force
revalidation, and the documented local server sends `no-store`. GitHub Pages has the
same failure mode with its `max-age=600`.

**`<title>` and `<meta name="description">` are overwritten at runtime.**
`applyTranslations()` sets `document.title` and the meta description from
`data/translations.json` (`meta.title` / `meta.description`). Editing them in
`index.html` has no lasting effect — the HTML values are only a pre-JS fallback.
Change `translations.json` and keep the HTML in sync. `og:*` and `twitter:*` are
**not** overwritten and must be edited in the HTML.

**Don't put `<br>` inside a grid or flex container.** It becomes its own
grid/flex item and silently breaks the column layout (this bit the old
`.about__text` two-column layout, since removed). Use `gap` for spacing between blocks.

**An alpha *channel* is not transparency.** `sips -g hasAlpha` returns "yes" for
most PNG exports even when every pixel is opaque. Check real pixel data before
converting to JPEG. `VSCodeFull` and `og-card` both reported "yes" and were fully
opaque; the Space Runner shots, the two app banners and the CNN plots are
genuinely transparent (38–62% of pixels) and must stay PNG.

**The transparent margin on a card image is doing layout work.** Those PNGs are
mostly a hard-edged shape on an empty background, so cropping to the alpha
bounding box looks like free savings. It isn't: `.project-card__image-wrapper` is
a fixed 4:3 box with `object-fit: cover`, and the margin is what letterboxes a
2:1 screenshot into it. Crop it and `cover` scales up to fill, cutting off the
sides of the actual screenshot.

**Quantize with dithering.** Reducing those PNGs to a 256-colour palette is the
big win (3.2 MB → 0.5 MB), but undithered it posterises the Space Runner nebula
and earth gradient into visible blotches. `Image.FLOYDSTEINBERG` fixes it and
costs nothing in file size at this palette depth. `sips` can't quantize; use PIL.

**Anchor clicks are delegated.** `setupHeaderScrollOffset()` listens on
`document` because category links are rendered from JSON after load and replaced
on every language switch. A bare `href="#"` is treated as "scroll to top", so
never leave `href="#"` on a link that is meant to navigate somewhere.

## Conventions

### HTML
- Semantic HTML elements (`<header>`, `<main>`, `<section>`, `<footer>`, etc.)
- Sections should have descriptive `id` attributes for anchor navigation

### CSS
- Use CSS custom properties (variables) for colors, fonts, and spacing
- Responsive via `max-width` media queries at 1200 / 1024 / 768 / 480 (desktop-first — the existing breakpoints all narrow downward; follow that rather than mixing paradigms)
- Multi-column text collapses to one column at ≤768px, matching where the header switches to the hamburger
- BEM-like class naming: `block__element--modifier`
- No CSS frameworks — write all styles from scratch to match the Figma design
- When removing a component, grep the media queries too — dead rules for the old contact form survived there twice

### JavaScript
- Vanilla JS only, no libraries
- Projects are stored in `data/projects.json` and rendered dynamically
- Use `fetch()` via `fetchJson()`, which checks `response.ok` so a bad deploy fails loudly
- Keep JS minimal — dynamic content rendering, i18n and navigation only
- All user-facing strings live in `data/translations.json` with `en`/`de` parity — never hardcode copy in markup except as a pre-JS fallback
- Escape anything interpolated into `innerHTML` with `escapeHtml()`
- Rendering happens once, from `applyTranslations()` — don't render in `loadProjects()`
- `main.js` is shared with `datenschutz.html`, so guard any lookup of an element that only exists on the landing page. `404.html` deliberately loads no script at all
- A landing `#hash` is resolved by the browser before the cards are fetched and rendered, which moves the target. `restoreHashPosition()` re-applies it at the end of `DOMContentLoaded` — keep it last
- Register global listeners once. `observeCategorySections()` previously added a new `resize` listener and `IntersectionObserver` on every language switch

### i18n
- `data-i18n` sets `textContent`, `data-i18n-html` sets `innerHTML`
- `data-i18n-attr="aria-label:a11y.mainNav"` translates attributes; several pairs can be separated by `;`
- `data-lang-block="de|en"` toggles whole sections — used for the legal page, where German is visible by default so it survives with JS disabled
- Keys must exist in **both** `en` and `de`

### Accessibility (target: WCAG 2.2 AA)
- Every interactive element needs a visible `:focus-visible` ring — never `outline: none` without a replacement
- Use real `<button>`s for controls; never a `<span>` with a click handler
- Hidden carousel slides must leave the accessibility tree, not just fade to `opacity: 0`
- Respect `prefers-reduced-motion` (globally in CSS and in `scrollToPosition()`)
- Repeated link text ("Live Demo") needs a `.visually-hidden` suffix naming the project

### Assets
- Optimize images before committing. No build step, so do it manually:
  `sips -Z 1200 -s format jpeg -s formatOptions 80 in.png --out out.jpg`
- Target ≤150 KB per image; `assets/images` currently sits at ~1.7 MB and every file is under that. Keep it there
- Re-encoding an already well-compressed PNG can make it *bigger* — check before replacing. Files that are *already* JPEG also pay generation loss, so re-encode those at q85, not q80
- Every card image is capped at 1200px wide, the widest one is ever rendered
- No ImageMagick/cwebp on this machine. To rasterise an SVG:
  `mkdir -p out && qlmanage -t -s 512 -o out icon.svg` (square canvas only — for
  non-square output, pad the SVG to a square and crop with `sips -c H W`)
- Prefer SVG for icons and logos
- Use descriptive filenames: `project-name-screenshot.png`, not `img1.png`

## Projects Data Format (`data/projects.json`)
```json
[
  {
    "title_en": "Project Name",
    "title_de": "Projektname",
    "description_en": "Short description of the project.",
    "description_de": "Kurze Beschreibung des Projekts.",
    "tags": ["HTML", "CSS", "JavaScript"],
    "images": ["assets/images/project-name.jpg"],
    "imageAlts_en": ["Optional per-image alt text"],
    "liveUrl": "https://example.com",
    "repoUrl": "https://github.com/user/repo",
    "category": "Websites",
    "year": "2026"
  }
]
```
`liveUrl`/`repoUrl` of `"#"` mean "absent" — the button is not rendered.
Categories are derived from the `category` field and drive the sidebar.

## Verifying changes
There is no test framework and no browser automation here. What works:

```bash
# JS syntax
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc \
  -e "try { new Function(read('js/main.js')); print('OK') } catch(e) { print(e) }"

# JSON validity
python3 -c "import json; [json.load(open(f)) for f in ['data/projects.json','data/translations.json','site.webmanifest']]"
```

`jsc` can also run `js/main.js` against the real JSON with stubbed
`document`/`window`/`localStorage` to assert on the rendered card HTML — no dead
`href="#"`, correct link counts, unique alt text. Worth rebuilding that harness
before touching `createProjectCard()`.

Also check: every `data-i18n*` key resolves in both languages, no local `src`/`href`
404s, and no external hosts appear in `index.html`/`styles.css`/`main.js`.

Still needs a real browser: Lighthouse, axe DevTools, VoiceOver, and a keyboard pass.

## GitHub Pages
- Deployed as a **user site** from the repo `CoalaCode/CoalaCode.github.io`, `main` branch root (`/`)
- Live at `https://coalacode.github.io/`. That URL is hardcoded in `index.html`
  (canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD `url`), `robots.txt`,
  `sitemap.xml` and `README.md` — change all of them together
- Because it is a user site and not a project site, root-relative paths resolve
  correctly. `404.html` relies on this (`/css/styles.css`), as does the manifest's
  `start_url: "/"`. Both would break if this ever became a project site
- The repo must be **public**: Pages only serves a private repo on a paid plan
- No build step required — files are served as-is
- Enable **Enforce HTTPS** (the clipboard API needs a secure context)
- A custom domain can be added later via a `CNAME` file

## Privacy (German audience — do not regress these)
The site's compliance story rests on it making **zero third-party requests**. Before
adding anything, check it does not break that:
- **Never** link Google Fonts or any CDN — fonts are self-hosted in `assets/fonts/`
- No analytics, no tracking, no embeds, no contact-form service
- No cookies. `localStorage` holds only the language preference, which is
  "strictly necessary" under § 25(2) TDDDG — so no consent banner is needed.
  Adding anything else to storage would change that.
- `datenschutz.html` must render fully with JavaScript disabled
- Adding any third party means updating `datenschutz.html` first
- The privacy policy names a controller and email but **no postal address**. This is a
  deliberate, accepted grey area (Art. 13(1)(a) is widely read to require one). It was
  chosen to keep a home address off the public internet, and dropping the contact form
  reduced the exposure. If a c/o or business address ever becomes available, add it.
