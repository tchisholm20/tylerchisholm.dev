# tylerchisholm.dev

Portfolio site. Plain HTML, CSS and JavaScript with no build step, served by GitHub Pages from `docs/`.

## Layout

```
docs/                  the published site
  index.html           all page content
  css/site.css         styles
  js/site.js           role switch and video previews
  fonts/               Bricolage Grotesque (OFL), self-hosted
  img/                 favicon and link-preview image
  resumes/             the three résumé PDFs (generated, see below)
  media/               optional local video loops
  CNAME                custom domain for GitHub Pages
tools/resume/          résumé source and PDF build
```

## Editing content

Everything on the page lives in `docs/index.html`.

- **Role switch.** Any element with `data-for="design rendering simulation"` shows only for the listed roles. Projects reorder through `data-order-design`, `data-order-rendering` and `data-order-simulation`.
- **Role links.** `tylerchisholm.dev/?for=rendering` or `?for=simulation` opens the page with that role selected. Use these links in applications.
- **Videos.** Each video is a `.reel-frame` with `data-yt="<YouTube id>"`. Clip buttons switch the video. `data-crop="1.12"` zooms in to hide pillarbox bars baked into an upload.
- **Local loops.** Add `data-loop="media/<file>.mp4"` to a `.reel-frame` or clip button to play a local muted loop instead of the YouTube preview. See `docs/media/README.md`.

## Résumés

Content is in `tools/resume/resume.json`. Each bullet's `v` field lists the variants it appears in: `D` technical design, `A` tech art and rendering, `S` real-time and simulation.

```
pip install playwright
python -m playwright install chromium
python tools/resume/build_resumes.py
```

The script writes `docs/resumes/*.pdf` and exits with an error if any variant runs past one page.

## Preview locally

```
cd docs
python -m http.server 8000
```

Then open http://localhost:8000.
