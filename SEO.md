# SK Films — SEO implementation and optimization plan

Updated 27 November 2026. Approved domain: **https://skfilmsproductions.com**. Target markets supplied by the owner: **Pakistan and Dubai**. Offices supplied: Islamabad, Lahore, Dubai and Australia; Australia city and three other precise addresses remain unconfirmed. The approved Islamabad address/map comes from the owner-supplied [Google Maps listing](https://maps.app.goo.gl/ine7izpesokFrH8E9). No invented local addresses, ratings, awards, phone numbers or opening hours appear in structured data.

## Implemented

- Server-rendered/static HTML for the collection, services, Insights index and each published article. Core text is readable without JavaScript.
- Editable homepage search title/description, one canonical URL per public page, Open Graph/social metadata, Organization/service-catalog JSON-LD and BlogPosting JSON-LD on published articles.
- `sitemap.xml` rebuilt after each save using the approved domain. Draft/unpublished/deleted articles are excluded. `robots.txt` points to the sitemap and excludes admin/internal paths; admin HTML also carries noindex/nofollow. Robots rules do not replace authentication.
- Local asset URLs, descriptive image alternatives, labeled navigation, service jump links and mobile layouts. Blog body is plain text rendered with escaping.
- Approved locations and map embeds can be maintained separately. No place is guessed from a city name.

## Keyword research and page mapping

This is a qualitative search-intent assessment from current search results and production-company service language, not a paid keyword-volume study. No search volumes, difficulty scores or ranking guarantees were fabricated. These terms should be validated against Search Console queries and qualified enquiries after launch.

| Intent | Primary candidate queries | Supporting regional terms | Destination |
|---|---|---|---|
| Find a production partner | film production company Pakistan; production house Islamabad | film production Lahore; production company Dubai | Homepage, work and approved office information |
| Commission a commercial | TVC production Pakistan; commercial production Dubai | brand film production; promotional video production | Services / commercials |
| Digital visual effects | CGI production Pakistan; VFX studio Dubai | CGI advertising; product visualization | Services / CGI and VFX |
| Animation | 3D animation company Pakistan; motion graphics Dubai | product animation; animated brand films | Services / 3D animation |
| Property visualization | architectural visualization Pakistan; 3D walkthrough Dubai | architectural renders Islamabad; interior visualization | Services / architectural visualization |
| Artist production | music video production Pakistan; music video production Dubai | artist performance film; music video director | Services / music videos and approved work |
| Branded digital content | branded content production Pakistan; social video production Dubai | digital content studio; brand design | Services / digital and branding |

Current qualitative examples: [HA Productions’ commercial service page](https://haprods.com/services/commercial-tvc) uses TVC/commercial production and CGI/VFX language. [Timeline TV Studios](https://timelinetvstudios.com/) combines Islamabad video production and architectural visualization. [CEMA’s own about page](https://cema.ae/about/) describes Dubai commercials and brand/product films. These support terminology choices, not claims about SK Films, relative rankings or demand size.

## Editorial priorities

Publish approved, useful studio material instead of fabricated news: a completed film's creative process; how a commercial brief becomes a treatment; practical versus CG production decisions; preparing reference material for an architectural walkthrough; music-video performance and narrative approaches. Each article needs a real author-approved text, title, summary and publication date. The Insights page stays honestly empty until content is published.

Avoid mass-produced near-identical city pages or keyword stuffing. Publish detailed regional pages only when real location information, work and audience-specific content justify them.

## Ongoing operating cadence

1. After deployment: verify ownership in Google Search Console, submit `https://skfilmsproductions.com/sitemap.xml`, inspect homepage/services/article indexing and confirm production redirects, HTTPS and canonical host behavior.
2. Weekly: review indexing errors, broken URLs, qualified enquiries and impressions/clicks for the service groups above. Record baseline dates and outcomes; compare like-for-like periods.
3. Monthly: improve relevant titles and content using actual query intent and enquiry quality, publish approved case studies/articles, check mobile page experience and recheck internal links.
4. After a portfolio/blog change: save, export and deploy the current public files, then inspect the affected URLs. Sitemap inclusion does not guarantee indexing.

No Search Console account, analytics access or production hosting was supplied. Account verification, live indexing, measured keyword volumes, ranking improvement and an ongoing managed optimization service have **not** been claimed as completed.

## Primary guidance

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): useful content, clear page structure and descriptive presentation.
- [Google sitemap overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview): discovery support and sitemap limits.
- [Google technical requirements](https://developers.google.com/search/docs/essentials/technical): public crawl/index prerequisites.
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup must represent visible, accurate content.
- [Google LocalBusiness guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business): use verified business details; detailed local-business markup remains deferred until addresses are approved.

## Netlify online publishing

The online dashboard renders portfolio/article content, canonical metadata, robots and sitemap from persistent Blobs content on each request. Publishing/unpublishing is immediate without a rebuild. Local Python saves do not synchronize to that store. Domain/DNS, Search Console ownership and live crawl/indexing checks remain deployment tasks; see NETLIFY.md.
