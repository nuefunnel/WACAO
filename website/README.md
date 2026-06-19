# WACAO landing page

Static, single-page landing site for the WACAO Chrome extension. No build step.

```
website/
├── index.html             # the entire page (inline CSS, no framework)
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── favicon.svg            # full WACAO badge (vector) — large icons
├── favicon-mark.svg       # badge cropped to the mask — small icons
├── favicon.ico            # 16/32/48, from the mask
├── favicon-32.png
├── apple-touch-icon.png   # 180, full badge
├── icon-192.png           # PWA / Android (any maskable)
├── icon-512.png
├── assets/
│   ├── wacao-logo.webp
│   ├── og-image.jpg       # 1200×630 social share card
│   ├── screenshot-translate.jpg
│   └── screenshot-summary.jpg
└── scripts/               # on-demand asset generators (not run at deploy)
    ├── generate-og-image.{sh,mjs}
    └── generate-favicons.mjs
```

## Regenerating brand assets

The favicon set and OG card are committed static files. Regenerate on demand
(requires `rsvg-convert` + `node`; the OG wrapper also fetches the brand fonts):

```bash
cd website
node scripts/generate-favicons.mjs       # favicons + manifest from favicon*.svg
bash scripts/generate-og-image.sh        # assets/og-image.jpg
```

## Local preview

```bash
cd website
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy — Cloudflare Pages

Connect this repository in the Cloudflare dashboard (Workers & Pages → Create → Pages → Connect to Git), then set:

| Setting                  | Value     |
| ------------------------ | --------- |
| Framework preset         | None      |
| Build command            | *(empty)* |
| Build output directory   | `website` |

No build runs — Cloudflare serves `website/` as-is. Pushes to the production branch deploy live; other branches get preview URLs.

The custom domain (`wacao.in`) cutover from Wix is done **after** the first successful deploy, via Pages → Custom domains.
