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
- **Videos.** Each video is a `.reel-frame` with `data-yt="<YouTube id>"` and an optional `data-start` in seconds. `data-crop` zooms in and `data-focus` sets the zoom origin, which is how editor captures are framed on the game viewport.
- **What I did.** Each project's `.did` list holds its contributions. A `.did-head` button with `data-yt` (plus optional `data-start`, `data-crop`, `data-focus` and `data-caption`) switches the project video when opened; one without `data-yt` only opens its text.
- **Local loops.** Add `data-loop="media/<file>.mp4"` to a `.reel-frame` or `.did-head` button to play a local muted loop instead of the YouTube preview. See `docs/media/README.md`.

## Deploying changes

After editing `css/site.css` or `js/site.js`, bump the `?v=` number on their links in `index.html`. Browsers cache those files, and without the bump a returning visitor can get new HTML with old styles.

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
