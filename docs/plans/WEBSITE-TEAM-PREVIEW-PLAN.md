# Website team preview plan

## Status

The repository-side review mode and isolated Preview-search path are
implemented locally. The owner authorized the Blog and White Papers routes,
Media navigation, matching footer links, and a separately rebuilt search index
for a private team `dev` preview. Production publication and external indexing
remain separate release decisions.

The Phaeno Website Vercel project uses `website/` as its root, tracks `main` as
Production, sends unassigned branches to Preview, and already protects Preview
deployments with Vercel Authentication. `PUBLIC_SITE_REVIEW_MODE=true` is
configured only for Preview. No branch push or Preview deployment has occurred.

## Review contract

- Deploy `website/` as the Vercel project root from a short-lived Website
  branch or pull request.
- Protect Preview deployments with Vercel Authentication and grant access only
  to the team members who need to review them.
- Set `PUBLIC_SITE_REVIEW_MODE=true` only for the Preview environment. Leave it
  unset or `false` in Production.
- Review builds show a persistent `Team preview` banner, emit
  `noindex, nofollow, noarchive`, omit Vercel Web Analytics, route Website
  search through a same-origin Vercel Function and the Portal API's separate
  Preview index, prevent contact and demo submissions, do not load reCAPTCHA,
  and do not generate the production-facing `llms.txt` artifact.
- The production Website remains public and retains its existing search,
  analytics, reCAPTCHA, contact, and demo behavior.
- The Preview crawler authenticates to Vercel with a Protection Bypass for
  Automation secret. The browser never receives that secret or the Portal
  preview-search proxy key.
- The Portal API must refuse to enable Preview search when the Preview and
  production Lucene paths resolve to the same directory.

## Current preview content

- `/media/blog` and each prepared blog article
- `/media/white-papers` and each prepared white-paper landing page
- the restored **Media** header menu
- the restored **Blog** and **White Papers** footer links

Because these routes participate in an ordinary Astro build, the preview
sitemap includes them. Review mode deliberately omits `llms.txt`; the next
ordinary production build will include the routes there. Vercel Authentication
and the review-mode crawler directives are both required before sharing the
preview.

## Runtime activation

The code is disabled by default. Activation requires all of the following in
the Portal API runtime:

- `WebsitePreviewSearch__Enabled=true`;
- `WebsitePreviewSearch__Url` set to the stable protected branch URL;
- `WebsitePreviewSearch__SearchIndexLocation` set to the dedicated mounted
  Preview index volume;
- `WebsitePreviewSearch__VercelProtectionBypassSecret` set from Vercel's
  Protection Bypass for Automation secret; and
- `WebsitePreviewSearch__ProxyApiKey` set to a random value of at least 32
  characters.

The same proxy key and the versioned Portal API base URL must be stored as the
Vercel Preview-only, server-side variables documented in `website/README.md`.
They must not use a `PUBLIC_` prefix.

## Verification

1. Build with `PUBLIC_SITE_REVIEW_MODE=true` and confirm the banner, crawler
   directive, Preview search proxy path, disabled submission services, Media
   navigation, routes, Preview-origin sitemap, and absence of `llms.txt`.
2. Build with the flag unset and confirm the review banner and crawler
   directive are absent and live Website interactions retain production
   behavior.
3. After an authorized API and Website Preview deployment, confirm the Preview
   crawler builds the dedicated index, representative new Media queries return
   Preview URLs, and equivalent production queries still use the unchanged
   production index.
4. Verify an unauthenticated Preview request is denied, the same-origin search
   proxy works for an authenticated team member, direct API requests without
   the proxy key are denied, and neither secret appears in browser assets or
   responses.
