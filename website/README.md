# WACAO landing page

Static, single-page landing site for the WACAO Chrome extension. No build step.

```
website/
├── index.html        # the entire page (inline CSS, no framework)
└── assets/
    ├── wacao-logo.webp
    ├── screenshot-translate.jpg
    ├── screenshot-summary.jpg
    └── favicon.png
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
