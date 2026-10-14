# rohith-s98.github.io

Personal portfolio of **Rohith S**, a quality engineer who finds where systems break, then makes sure they don't.

Live: https://rohith-s98.github.io (after the first deploy)

## What's interesting here
- **Tests gate deploys.** Playwright checks run on every push: navigation, the interactive test runner, data loading, horizontal overflow, safe external links, console errors, and WCAG 2 A/AA accessibility (axe). They run on desktop and mobile viewports. GitHub Pages only deploys when they pass ([workflow](.github/workflows/deploy.yml)).
- **No framework, no build step.** Plain HTML, CSS and JavaScript, so there's nothing to break between source and production.
- **Content lives in data.** Projects and notebook entries are JSON files, so adding one is a one-line change.
- **Accessible motion.** The intro, scroll reveals and pointer effects all switch off under `prefers-reduced-motion`.

## Run locally
```bash
npm install
npm start          # http://localhost:4173
npm test           # Playwright (uses installed Microsoft Edge locally, Chromium in CI)
```

## Updating content
| What | Where |
|---|---|
| Add a project | `data/projects.json` (status: `live` / `building` / `planned` / `archive`) |
| Add a note or a read | `data/notes.json` (`type`: `note` for my writing, `read` for recommendations) |
| Change the accent colour | `--accent` at the top of `styles.css` |
| Change the intro line | `text` in the intro block of `main.js` |
