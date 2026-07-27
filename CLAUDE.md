# Personal Developer Portfolio Website

## Project Overview
A single-page personal developer portfolio and landing page to showcase projects and provide a contact form.

## Tech Stack
- **HTML5, CSS3, vanilla JavaScript** — no frameworks, no build step
- **Hosting:** GitHub Pages (static only)
- **Contact form:** Formspree (GitHub Pages has no server-side processing)
- **Design source:** Figma (accessed via MCP server)

## Project Structure
```
/
├── index.html          # Single landing page
├── css/
│   └── styles.css      # All styles
├── js/
│   └── main.js         # JS for dynamic rendering and interactions
├── data/
│   └── projects.json   # Project portfolio data (rendered dynamically via JS)
├── assets/
│   ├── images/         # Project screenshots, profile photo, etc.
│   └── icons/          # SVG icons if needed
├── CLAUDE.md
└── .vscode/
    └── mcp.json        # Figma MCP server config
```

## Conventions

### HTML
- Semantic HTML elements (`<header>`, `<main>`, `<section>`, `<footer>`, etc.)
- Sections should have descriptive `id` attributes for anchor navigation

### CSS
- Use CSS custom properties (variables) for colors, fonts, and spacing
- Mobile-first responsive design using media queries
- BEM-like class naming: `block__element--modifier`
- No CSS frameworks — write all styles from scratch to match the Figma design

### JavaScript
- Vanilla JS only, no libraries
- Projects are stored in `data/projects.json` and rendered dynamically
- Use `fetch()` to load the JSON, then generate project cards from a template
- Keep JS minimal — only for dynamic content rendering and form handling

### Assets
- Optimize images before committing (compress PNGs/JPGs)
- Prefer SVG for icons and logos
- Use descriptive filenames: `project-name-screenshot.png`, not `img1.png`

## Projects Data Format (`data/projects.json`)
```json
[
  {
    "title": "Project Name",
    "description": "Short description of the project.",
    "tags": ["HTML", "CSS", "JavaScript"],
    "image": "assets/images/project-name.png",
    "liveUrl": "https://example.com",
    "repoUrl": "https://github.com/user/repo"
  }
]
```

## GitHub Pages
- Deploy from the `main` branch root (`/`)
- No build step required — files are served as-is
- Custom domain can be added later via a `CNAME` file

## Formspree Contact Form
- Form `action` points to `https://formspree.io/f/{form_id}`
- Method is `POST`
- Include honeypot or reCAPTCHA if spam becomes an issue
- Replace `{form_id}` with the actual Formspree form ID before deploying
