"""Build the three one-page résumé PDFs from resume.json.

    pip install playwright && python -m playwright install chromium
    python tools/resume/build_resumes.py

Writes docs/resumes/<file>.pdf. Fails if any variant spills past one page.
"""
import html
import re
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = ROOT / "docs" / "resumes"
FONT = (ROOT / "docs" / "fonts" / "bricolage-grotesque.woff2").as_uri()


def esc(s):
    return html.escape(s or "", quote=False)


def entry_html(e, key):
    bullets = [b["t"] for b in e.get("bullets", []) if key in b["v"]]
    intro = e.get("intro", {}).get(key) if isinstance(e.get("intro"), dict) else e.get("intro")
    parts = [
        '<div class="entry">',
        f'<div class="row"><h3>{esc(e["title"])}'
        + (f'<span class="meta">{esc(e["meta"])}</span>' if e.get("meta") else "")
        + f'</h3><span class="date">{esc(e.get("date"))}</span></div>',
    ]
    if intro:
        parts.append(f'<p class="intro">{esc(intro)}</p>')
    if e.get("oneLine"):
        parts.append(f'<p class="intro">{esc(e["oneLine"])}</p>')
    if bullets:
        parts.append("<ul>" + "".join(f"<li>{esc(b)}</li>" for b in bullets) + "</ul>")
    parts.append("</div>")
    return "".join(parts)


def page_html(data, key, v):
    h = data["header"]
    contact = "".join(f"<span>{esc(c)}</span>" for c in h["contact"])
    skills = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(val)}</dd></div>" for k, val in v["skills"])
    edu = "".join(
        f'<div class="row edu"><p><b>{esc(e["left"])}</b>, {esc(e["org"])}'
        + (f'. {esc(e["note"])}' if e.get("note") else "")
        + f'</p><span class="date">{esc(e["date"])}</span></div>'
        for e in data["education"]
    )
    sections = ""
    for title, entries in v["sections"]:
        body = "".join(entry_html(e, key) for e in entries if not e.get("bullets") or any(key in b["v"] for b in e["bullets"]) or e.get("oneLine"))
        sections += f"<section><h2>{esc(title)}</h2>{body}</section>"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(h['name'])}, {esc(v['title'])}</title>
<style>
@font-face {{ font-family: B; src: url("{FONT}") format("woff2-variations"); font-weight: 200 800; font-stretch: 75% 100%; }}
@page {{ size: Letter; margin: 0.4in 0.5in; }}
* {{ box-sizing: border-box; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ margin: 0; font-family: B, sans-serif; font-size: 9.2pt; line-height: 1.3; color: #16181d; font-variation-settings: "opsz" 12; }}
header {{ display: flex; justify-content: space-between; align-items: flex-end; gap: 16pt; padding-bottom: 7pt; border-bottom: 1.5pt solid #16181d; }}
h1 {{ margin: 0; font-size: 24pt; line-height: 0.95; font-weight: 760; font-stretch: 78%; letter-spacing: -0.02em; font-variation-settings: "opsz" 72; }}
.title {{ margin: 3pt 0 0; font-size: 11pt; font-weight: 600; color: #3346d3; }}
.contact {{ display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1pt 10pt; max-width: 52%; font-size: 8.6pt; color: #3d424b; text-align: right; }}
.summary {{ margin: 8pt 0 0; }}
h2 {{ break-after: avoid; margin: 8pt 0 3pt; font-size: 10.5pt; font-weight: 720; font-stretch: 85%; color: #3346d3; }}
h3 {{ margin: 0; font-size: 9.8pt; font-weight: 680; }}
.row {{ display: flex; justify-content: space-between; gap: 12pt; align-items: baseline; }}
.date {{ flex: none; font-size: 8.6pt; color: #555b66; font-variant-numeric: tabular-nums; }}
.edu p {{ margin: 0 0 1.5pt; }}
dl {{ margin: 0; }}
dl div {{ display: grid; grid-template-columns: 58pt 1fr; gap: 6pt; margin-bottom: 1.5pt; }}
dt {{ font-weight: 650; }}
dd {{ margin: 0; }}
.entry {{ margin-bottom: 5pt; break-inside: avoid; }}
.meta {{ margin-left: 7pt; font-size: 8.3pt; font-weight: 450; color: #555b66; }}
.intro {{ margin: 1.5pt 0 0; }}
ul {{ margin: 2pt 0 0; padding-left: 11pt; }}
li {{ margin-bottom: 1.2pt; padding-left: 1pt; }}
li::marker {{ color: #8a909a; }}
</style></head><body>
<header><div><h1>{esc(h['name'])}</h1><p class="title">{esc(v['title'])}</p></div><div class="contact">{contact}</div></header>
<p class="summary">{esc(v['summary'])}</p>
<section><h2>Education</h2>{edu}</section>
<section><h2>Skills</h2><dl>{skills}</dl></section>
{sections}
</body></html>"""


def main():
    data = json.loads((HERE / "resume.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    failed = False
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for key, v in data["variants"].items():
            src = HERE / f".build-{key}.html"
            src.write_text(page_html(data, key, v), encoding="utf-8")
            page.goto(src.as_uri())
            page.evaluate("document.fonts.ready")
            pdf = OUT / f"{v['file']}.pdf"
            page.pdf(path=str(pdf), format="Letter", prefer_css_page_size=True, print_background=True)
            pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf.read_bytes()))
            src.unlink()
            print(f"{pdf.name}: {pages} page(s)")
            failed |= pages > 1
        browser.close()
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
