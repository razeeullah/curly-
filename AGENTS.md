# SK Films Productions

## Project and execution
- Static HTML, CSS, vanilla JavaScript. Serve the public preview with `python3 serve_site.py` on8081; it blocks private editor files. Do not use an unrestricted directory server now that private CMS data exists.
- `script.js` owns intro/media, menus, portfolio state, project dialogs and local brief export. `motion.js` owns source-derived effects and their lifecycle. Load locally vendored GSAP 3.12.5 and ScrollTrigger before these scripts.
- Keep the screenshot’s seven named categories first and in the same order, with visible short descriptions. The homepage retains five older offerings under Supporting craft.
- `services.html` and `services.css` provide the dedicated, static seven-service page. Do not load homepage-only scripts on this standalone page.
- The user explicitly requested admin, Insights/blog, Maps and advanced SEO. `admin_server.py` is the local-only authenticated editor; `tools/content_engine.py` validates and publishes static pages. Private state/password/drafts live in `.admin-state/`; never expose or package this directory. `tools/export_site.py` exports only the public site. `ADMIN.md` documents local vs production limits.
- Preserve existing features; do not add a framework, backend, CMS or routes without a task requiring them.
- Git was initialized for GitHub submission after the original audit. Historical snapshots and browser evidence are preserved locally in `archive/project-history.zip` (original folder paths retained inside).

## Source authority and preservation
- The 30 standalone HTML files in `/Users/mc/Desktop/cinematic-site-components` are read-only animation references. Inspect complete HTML/CSS/JS before changing an effect.
- Preserve algorithms, timing, easing, perspective, state changes and scroll synchronization. CSS transitions are correct where the original uses them. Do not mistake a demo name or README claim for its actual implementation.
- Document corrections to source bugs and responsive/accessibility adaptations in `ANIMATION_AUDIT.md`. Core plus relevant variants are required, not every unrelated demonstration.
- Never modify official `assets/logo.png` or `assets/sk-films-ident.mp4`. Baseline SHA-256 hashes are recorded in `tools/verification/checksums.json`.
- Retain Jay from RoboLabs' MIT notice in `LICENSE-CINEMATIC-MODULES.txt`, font licenses and vendored dependency notices.

## Design
- Film production portfolio for prospective clients and creative collaborators; primary actions are exploring film concepts, playing the official ident, and preparing an enquiry brief.
- Light theme: warm white #FAF9F6, white #FFFFFF, pale stone #F2F0EB, charcoal #1C1C1C, readable gold #896313. Photographic hero/reel and the original ident retain contrasting media controls. `experience.css` owns the final gallery/editorial compositions; `light.css` owns palette overrides; scroll palettes and Canvas colors must stay light too. Local Inter Tight display/body; JetBrains Mono only for useful film metadata.
- Expanding image panels beneath a light editorial masthead are the hero's defining gesture. Keep the headline, image stage and bottom controls in separate vertical zones. Editorial scale, asymmetry, precise grids, generous space. Avoid generic agency cards, ornamental labels and decorative gradients except source effects.
- Official tagline: Bringing Stories to Life. Illustrative imagery and project concepts must remain identified. The current sharper generated assets are `assets/*-v2.webp` (1536×1024); keep them marked illustrative and prefer them over the small original stills. Prompts and lossless masters are in `archive/image-generation.json` and `archive/image-masters.zip`. Never invent factual clients, credits, awards, people or contact details.
- The enquiry form downloads a local text brief; it sends nothing. Keep this clear in UI and success feedback.

## Section ownership
- Keep the collection immediately after the opening. Studio/About uses four natural-flow `.narrative-feature` triggers and matching `.narrative-state` images. The five `.step` process cards have independent sticky-card triggers and the original curved SVG route. Do not couple these two stories.
- Keep portfolio filters synchronous. Use the optional native shared-image transition for project details, with the source overlay as fallback. Clean up active transitions and filmstrip triggers when modes change.

## Motion and accessibility
- The user requested a slower Story/Light/Movement/Feeling marquee. Keep its base speed40px/s, scroll boost capped at12px/s and velocity decay; this overrides the original fast marquee parameters.
- The user explicitly removed hero zoom. Keep the hero in normal document flow, with no layered zoom ScrollTriggers or long sticky scroll runway. This overrides the reference-fidelity requirement for Zoom Parallax.
- One owner per transform; nest wrappers when combining scroll/cursor/entry motion.
- Use scoped GSAP contexts and clean up listeners, observers, timers and frames. Re-measure after assets load, gallery changes and viewport changes.
- Essential content works without GSAP. Reduced motion uses readable static layouts and immediate state changes. Touch gets explicit controls. No autoplay audio or hover-only essential content.
- Pause ambient motion offscreen/when hidden; provide pause controls. Keep visible focus, dialog focus return, Escape support and touch targets at least 44px.

## Verification
- Verify the actual packaged video/assets over HTTP, not embedded substitutes.
- Run `python3 tools/test_content_admin.py` for isolated publishing/auth tests. Use temporary content for test articles/projects; do not publish fictional client material into the real site.
- Test source demos and integrated intermediate motion states. Keep recordings/screenshots and machine-readable results under `output/playwright/`.
- Responsive widths: 1920, 1440, 1280, 1024, 768, 430, 390, 360, 320. Test filters + all five gallery views, dialogs, intro/replay/sound, menu/island, grading and brief export.
- Check console errors, asset failures, overflow, reduced motion, dependency failure and media failure. Never mark untested behavior as verified.
