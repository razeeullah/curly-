# Deploy SK Films with the online admin

This deployment uses static assets, Node 22 Netlify Functions and a site-wide Netlify Blobs store. Python is optional for local authoring; it is not used online.

## Deployment

1. Commit this source project to your Git repository and connect it to Netlify. Keep `.admin-state/`, `.env`, `output/`, `dist/` and `node_modules/` out of Git. The included `.gitignore` covers them.
2. Netlify reads `netlify.toml`: build **npm run build**, publish **dist**, Functions **netlify/functions**. Install dependencies with the committed lockfile. Do not change the publish directory to the workspace root.
3. In Netlify environment variables, create **SK_ADMIN_PASSWORD** with a unique password of at least **16 characters**, available to **Functions** in the production context. Keep the password private. Redeploy after adding or changing it.
4. Open `https://YOUR-SITE.netlify.app/admin.html` and sign in. Test a portfolio edit, published article and uploaded image on the deployed URL before launch.
5. Connect the approved domain **skfilmsproductions.com** in Netlify and configure its DNS. Canonical URLs use `https://skfilmsproductions.com` unless changed in SEO & locations.

Alternatively, use the Netlify CLI after signing in and linking this directory to the intended site: `netlify deploy --build --prod`. A Git connection or CLI deployment is required to include Functions. **Uploading only dist with Netlify Drop does not install this online backend.** The older `archive/public-site.zip` is a static-only export.

GitHub submission is still pending a repository destination and account sign-in. No account configuration, DNS update or cloud deployment has been performed here.

## Editing and persistence

- `/admin.html` edits projects, article drafts/publishing, homepage SEO and approved office locations. Saves update server-rendered pages and the sitemap immediately; content edits do not require a rebuild.
- Production uses the stable site-wide store `sk-films-live-v1`. Existing online content wins over the initial public seed on later deploys. Uploads live in Blobs, not Git. Keep the same Netlify site to retain its data.
- Deploy previews use separate `sk-films-preview-*` stores. Preview edits do not modify production. Preview drafts are not promoted automatically.
- On first use, only `content/public.json` and public HTML seed the store. Private local drafts/passwords are never imported. Export local drafts separately if needed.
- Missing administrator configuration disables editing with an explanatory message; public content remains available. Sessions expire after 30 minutes. Sign-out revokes the session; password changes invalidate existing sessions.
- Concurrent saves reject stale revisions. Export unsaved edits before reloading after a conflict. **Export content** downloads the current model, including drafts; keep that backup private. The store also retains the previous saved model under `previous`. Uploaded image files need their own storage backup; the JSON export contains references, not image bytes.
- The optional Python editor writes local project files. It does not synchronize with the online store. Once online editing begins, use the online dashboard as the content authority.

The enquiry form continues to download a local brief. It does not send email or submit to Netlify Forms.

## Validation

```sh
npm ci
npm run build
npm test
```

Automated tests cover packaging, authentication, session expiry/revocation, concurrent saves, draft privacy, publish/unpublish, image storage and server rendering. `tools/online-browser-check.js` exercises the built dashboard against `tools/preview_online.mjs`, a test-only HTTPS adapter with in-memory storage. This is not proof of a deployed Netlify account: live Functions/Blobs credentials, domain routing and platform quotas still require a deployed smoke test. Local evidence is under `output/playwright/` and `output/netlify-functions/`.

References: [Functions deployment](https://docs.netlify.com/build/functions/get-started/), [Functions configuration](https://docs.netlify.com/build/functions/configuration/), [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
