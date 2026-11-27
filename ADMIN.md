# SK Films content editor

## Start and sign in

From the project directory, run:

```sh
python3 admin_server.py
```

Open **http://127.0.0.1:8083/admin.html**. The generated password is in `.admin-state/password`; open that file locally and copy it into the sign-in form. Do not upload or share this file. To use your own password, set `SK_ADMIN_PASSWORD` before starting the server; it must contain at least 12 characters.

The admin server binds only to **127.0.0.1**. This is a local authoring tool, not a remotely deployed CMS. Run `python3 serve_site.py` for the protected public preview on8081; it displays the generated files. Edit/save on8083 and refresh the preview. An ordinary `python3 -m http.server` cannot process admin saves and would expose private workspace files; use the included preview server instead.

## Portfolio

Select a project to edit its title, discipline, category, description, accessible image description and focal point. Choose an existing image or upload JPEG/PNG/WebP up to4MB. Add, reorder or delete entries, then **Save changes**. At least one project is retained. The editor updates the shared collection used by Grid, List, Cinema, Archive and Filmstrip and its matching detail data.

Keep “illustrative concept imagery” selected for concepts; uncheck it only for approved actual work. The four illustrative opening-selector frames and official ident are intentionally separate from the editable portfolio. New portfolio entries do not invent new intro footage.

## Insights

Create an article, fill its title, unique lowercase URL slug, date, summary and body. Blank lines separate paragraphs; HTML is treated as text. Save with Published unchecked to keep it a private draft. Check **Published** and save to generate `insights/<slug>.html`, list it in Insights and add it to the sitemap. Unpublish/delete and save to remove the generated page. Changing a published slug changes its URL; production redirects must be configured on the chosen host if an old URL has already been indexed.

No sample news was fabricated or published. The public index has a designed empty state until you publish an approved article.

## SEO and office locations

The approved domain is **https://skfilmsproductions.com** and the requested SEO markets are Pakistan and Dubai. Edit the homepage search title/description and domain under SEO & locations. Canonical tags, social metadata, structured data, robots and the sitemap are regenerated on save. See `SEO.md` for keyword intent mapping and the ongoing measurement plan.

Office names supplied: Islamabad, Lahore, Dubai and Australia. A Google Maps place/link or street address is required to configure a specific map. Paste a Google Maps embed URL from Share → Embed a map and approve it in the dashboard; only approved address/map fields are public. The owner-approved Islamabad listing is configured with its official Google embed and address. Lahore, Dubai and Australia remain city/country-only entries without guessed street addresses. Each office is configured independently.

A fresh Git clone initializes private editor content from `content/public.json` on first start and generates its own password. Only published articles and approved public location details are included; private drafts and credentials are not part of Git. Existing private content is never overwritten by this initialization.

## Persistence and recovery

- `.admin-state/content.json`: private portfolio, posts, settings and revision. Includes drafts.
- `.admin-state/previous.json`: the immediately previous saved state for manual recovery.
- `.admin-state/password`: local password. Session cookies are HTTP-only, same-site and expire after30minutes.
- `content/public.json`: only portfolio and published articles; no draft bodies or passwords.
- `index.html`, the `PROJECTS` data block in `script.js`, `services.html` SEO, `insights.html`, published article pages, sitemap and robots are generated on save. Maintain structural/animation code in source; use the editor for project content.
- **Export content** downloads the current editor model, including drafts and unsaved edits. Keep this backup private. It does not contain the login password.

The API validates inputs, rejects unsafe asset/map paths, requires a local same-origin request plus a valid session, prevents stale revisions from overwriting another editor's work, and retains the previous content. Do not expose this local server publicly; production access requires a hosting decision and a separate deployment/security configuration.

## Public deployment package

```sh
python3 tools/export_site.py
```

Upload the contents of **archive/public-site.zip** to the chosen static host. The package includes public HTML, styles/scripts, media, font/dependency licenses, published content, robots and sitemap. It excludes the admin app/server, passwords, drafts, source tools, test evidence and historical archives.

Saving in the local editor updates local files. It does **not** upload them to a host. After changes, export and deploy the new package. The owner has supplied a domain, but not the hosting provider/access; no remote admin, DNS change or production deployment is claimed.

## Verification

```sh
python3 tools/test_content_admin.py
python3 tools/verify-project.py
node --check admin.js
node --check script.js
node --check motion.js
```

API tests use a temporary copy of the site and do not publish test content into the actual project. Browser callbacks are in `tools/admin-browser-check.js`; evidence is under `output/playwright/`.
