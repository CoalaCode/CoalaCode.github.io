# CoalaCode — Personal Portfolio

A single-page developer portfolio built with plain HTML, CSS and JavaScript. No frameworks, no build step, no dependencies — the files in this repo are exactly what the browser receives.

**Live:** https://coalacode.github.io/

## Why it's built this way

- **No build step.** The repo is deployable as-is from the `main` branch root. Nothing to install, nothing to compile, nothing to break between commit and deploy.
- **No third-party requests.** Fonts are self-hosted, there is no analytics, no CDN and no contact-form service. Loading the page contacts exactly one origin: this one. That also keeps the GDPR surface to a single paragraph about hosting.
- **Content as data.** Projects live in `data/projects.json` and all UI copy in `data/translations.json`, so adding a project or a language means editing JSON, not markup.

## Structure

```
index.html            Landing page
datenschutz.html      Privacy policy (German + English, works without JS)
404.html
css/styles.css        All styles, including self-hosted @font-face
js/main.js            i18n, project rendering, carousel, navigation
data/projects.json    Project data (bilingual)
data/translations.json  UI copy (en / de)
assets/fonts/         Self-hosted Inter + Roboto (variable, latin subset)
assets/images/        Screenshots, logo, Open Graph card
assets/icons/         SVG icons and favicons
```

## Running locally

The page fetches JSON, which fails over `file://`. Serve it over HTTP — and send
`Cache-Control: no-store` while doing it. Plain `python3 -m http.server` sends no cache headers at
all, so the browser falls back to heuristic freshness and keeps rendering a stale `data/*.json`
long after you have edited it:

```bash
python3 -c "
import http.server
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
http.server.test(HandlerClass=H, port=8000)
"
# then open http://localhost:8000
```

## Adding a project

Append an entry to `data/projects.json`:

```json
{
  "title_en": "Project Name",
  "title_de": "Projektname",
  "description_en": "What it does.",
  "description_de": "Was es macht.",
  "tags": ["Swift", "SwiftUI"],
  "images": ["assets/images/project.jpg"],
  "imageAlts_en": ["A description of the screenshot"],
  "liveUrl": "https://example.com",
  "repoUrl": "https://github.com/user/repo",
  "category": "Mobile Apps",
  "year": "2026"
}
```

Notes:
- `liveUrl` / `repoUrl` set to `"#"` are treated as absent and the button is not rendered, so a project without a public repo simply shows fewer links.
- `imageAlts_en` / `imageAlts_de` are optional; without them each image falls back to `"Title — screenshot N of M"`.
- Categories are derived from the `category` field — a new value automatically creates a new sidebar section.

## Images

There is no image pipeline. Before committing a screenshot, resize it to 1200px wide and compress it:

```bash
sips -Z 1200 -s format jpeg -s formatOptions 80 input.png --out output.jpg
```

Use JPEG unless the image genuinely needs transparency — check first, because an alpha *channel* is not the same as transparent *pixels*:

```bash
sips -g hasAlpha input.png   # a "yes" here is often a false positive
```

Images that *do* need transparency stay PNG, reduced to a 256-colour palette **with dithering** —
without it the gradients in the game screenshots posterise visibly. `sips` cannot do this; use PIL:

```python
im.convert("RGBA").quantize(colors=256, method=Image.FASTOCTREE,
                            dither=Image.FLOYDSTEINBERG).save(out, "PNG", optimize=True)
```

Do not crop these to their alpha bounding box. The card wrapper is a fixed 4:3 box with
`object-fit: cover`, so the transparent margin is what letterboxes a 2:1 screenshot into it —
crop it away and `cover` starts eating the sides of the screenshot itself.

Target ≤150 KB per image.

## Accessibility

The site targets WCAG 2.2 AA. When changing the UI, keep in mind:

- every interactive element needs a visible `:focus-visible` ring
- carousel dots and the language switch are `<button>`s, not styled `<span>`s
- inactive carousel slides must be hidden from the accessibility tree, not just faded out
- `prefers-reduced-motion` is respected globally and in `scrollToPosition()`

## Deployment

GitHub Pages, `main` branch, root directory, with **Enforce HTTPS** enabled. No workflow required.
