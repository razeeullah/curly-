# SK Films Productions — Cinema Edition

A light-themed cinematic portfolio with warm-white surfaces, charcoal typography, a fullscreen image-panel hero and source-derived motion components. Built with HTML, CSS and vanilla JavaScript, plus locally vendored GSAP 3.12.5 and ScrollTrigger. The public visuals remain vanilla JavaScript. Netlify online editing uses Node Functions and Blobs; the optional Python preview protects private local editor files.

## Netlify deployment

Deploy this source through a Netlify Git connection or CLI. `netlify.toml` builds with `npm run build`, publishes `dist/` and deploys the Node Functions. Set a private `SK_ADMIN_PASSWORD` of at least 16 characters in Netlify’s Functions environment, then redeploy and open `/admin.html`. Online edits/uploads persist in Netlify Blobs. A drag-and-drop static upload alone cannot deploy the admin backend. See [NETLIFY.md](NETLIFY.md).

## Content editor

Run `python3 admin_server.py` and open http://127.0.0.1:8083/admin.html. Read the generated password locally in `.admin-state/password`. The editor saves portfolio, articles and approved locations to project files. See [ADMIN.md](ADMIN.md) for publishing/recovery and [SEO.md](SEO.md) for the Pakistan/Dubai SEO plan.

Generate the deployable public website with `python3 tools/export_site.py`; upload the contents of `archive/public-site.zip`. Private editor files and drafts are excluded. Hosting has not been configured.

## Run locally

From this folder:

```sh
python3 serve_site.py
```

Open **http://127.0.0.1:8081/**. Use HTTP rather than a local file URL for reliable video loading and browser testing. If port 8081 is already occupied by this project's server, open the address without starting another instance.

The dedicated [Services page](services.html) covers films/drama, commercials, CGI/VFX, 3D animation, architectural visualization, music videos and digital branding. It links to the existing local-brief enquiry form. The selected online admin, Insights/blog, office map controls and technical SEO setup are now included. English–Urdu switching was not selected.

## What changed

- Replaced the thumbnail hero rail with full-height expanding film panels, with keyboard selection and a vertical touch layout.
- Established an editorial light/charcoal/gold visual foundation using local Inter Tight and JetBrains Mono fonts.
- Restored source scroll, cursor, Canvas, SVG and CSS 3D mechanisms rather than relying on similarly named approximations.
- Fixed the motion initialization error, scroll refresh measurements, initial odometer construction, navigation morphing, shared-image dialog closing and intro/menu interruption handling.
- Preserved portfolio filters and all five gallery modes: Grid, List, Cinema, Archive and Filmstrip. Service disclosures, colour comparison, creative-discipline flips and local brief export remain functional.
- Added ambient-motion pause, reduced-motion layouts, offscreen/hidden-tab pausing and touch/keyboard alternatives.

The collection follows the opening. Studio continues through a four-part image narrative, a text-mask statement, opposing four-scene tracks and a velocity-driven band. Five photographic process stages culminate in the original ident and local enquiry brief.

## Files

- `index.html`: semantic page, original-media dialogs and controls.
- `insights.html`, `insights.css`: public blog index and generated article styling.
- `admin.html`, `admin.js`, `admin.css`: shared local/online content editor.
- `netlify/functions/`, `lib/online-*.mjs`: online authentication, durable content/uploads and server-rendered pages.
- `admin_server.py`, `tools/content_engine.py`: authenticated local saves, validation and static publishing.
- `serve_site.py`: protected public preview.
- `ADMIN.md`, `SEO.md`: editing instructions and SEO research/operating plan.
- `style.css`: existing layout and control foundations.
- `cinema.css`: art direction, new compositions and responsive layouts.
- `motion.css`: scoped source-derived effect styling.
- `light.css`: light palette and contrasting media controls.
- `experience.css`: final collection, editorial Studio/About, photographic process and contact/footer compositions.
- `script.js`: media, menu, portfolio, project dialogs and local brief export.
- `motion.js`: effect lifecycle, source algorithms and GSAP scroll contexts.
- `AGENTS.md`: maintenance instructions.
- `ANIMATION_AUDIT.md`: all 30 components, original behavior, adaptations and actual verification status.
- `archive/project-history.zip`: previous versions, browser reports, screenshots and recordings, with their original paths inside.
- `tools/verification/`: preservation checksums and the original component inventory.

For the online Netlify admin, follow [NETLIFY.md](NETLIFY.md). `archive/public-site.zip` from `tools/export_site.py` is a static-only export without online editing. Never publish `.admin-state/`.

## Verification

```sh
python3 tools/verify-project.py
node --check script.js
node --check motion.js
```

Historical acceptance reports, refinement results and fresh recordings of all 30 original demos are preserved in `archive/project-history.zip` under their original `output/playwright/` paths. Browser verification uses the actual packaged assets over HTTP. See the audit and archived JSON reports for supported claims, intentional deviations and remaining device-testing limitations. Recordings show intermediate motion states; screenshots alone are not treated as proof of animation accuracy.

## Content and behavior

The official `assets/logo.png` and `assets/sk-films-ident.mp4` are preserved. The video is the original SK Films opening ident, not a production showreel. The intro starts muted, can be skipped, and can be replayed; sound requires deliberate user action. A viewed or skipped opening is remembered for the browser session. Reduced-motion visitors enter the site directly.

Portfolio titles, stills, proposed services and workflow copy remain illustrative. Approved films, credits, director data and contact details are still needed before publishing as a factual production portfolio. Existing stills include small source images and are not represented as high-resolution original production photography.

**The enquiry form downloads a local text brief. It does not send a message.** The success state says this explicitly. A real sending service has not been added.

## Attribution

Motion components adapted from **Jay / RoboLabs — Cinematic Site Modules**, MIT. See `LICENSE-CINEMATIC-MODULES.txt`. Original reference files remain unchanged in `/Users/mc/Desktop/cinematic-site-components`.

GSAP and ScrollTrigger retain their upstream license/copyright headers. Local font license files are in `assets/fonts/`.

The current light palette is defined in `light.css`; source-driven scroll colors and the Canvas contact background are coordinated in `motion.js`. Photographic frames and the official ident retain their original cinematic contrast.

## Image clarity update

The six current illustrative images use `assets/hero-v2.webp`, `portrait-v2.webp`, `landscape-v2.webp`, `stage-v2.webp`, `story-v2.webp` and `camera-v2.webp`. Each is1536×1024, generated with the built-in image tool and exported to high-quality WebP. Original low-resolution stills are retained for reference; the official logo/video are unchanged. Prompts and asset details: `archive/image-generation.json`. Lossless PNG masters: `archive/image-masters.zip`. These are illustrative scenes, not completed client work.
# curly-
