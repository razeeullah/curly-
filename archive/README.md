# Project history

`project-history.zip` preserves 233 historical files: baseline, pre-refinement and pre-theme snapshots, browser evidence and duplicate-cleanup records. Every archived file was read back and checked against its SHA-256 before the loose originals were removed.

These files are not needed to run or deploy the website. Extract the ZIP into the project root to restore their original `output/` and `.playwright-cli/` paths. Future browser runs may recreate these folders.

Binary history/image-master ZIPs are local-only and intentionally excluded from Git. Optimized website assets and `image-generation.json` are included. Rebuild `public-site.zip` with `python3 tools/export_site.py`.
