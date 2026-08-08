# Mailgun Website templates

Each HTML filename without the `.html` extension is the exact Mailgun template
name used by the Website API. Technical-brief fulfillment therefore uses:

- `fulfill-web-technical-brief-request.en-US`
- `fulfill-web-technical-brief-request.ar`
- `fulfill-web-technical-brief-request.fr`
- `fulfill-web-technical-brief-request.es`
- `fulfill-web-technical-brief-request.zh-Hans`
- `fulfill-web-technical-brief-request.ja`
- `fulfill-web-technical-brief-request.de-DE`
- `fulfill-web-technical-brief-request.it`

The templates require `firstName`, `lastName`, and `technicalBriefPath` Mailgun
variables. The API supplies those values; do not replace the `{{...}}`
placeholders with environment-specific values in these source files.

Uploading or versioning a template in Mailgun remains an operational action;
adding the source file to this directory does not publish it. Before activating
a locale, verify that its template exists in Mailgun and that its configured
technical-brief PDF URL returns the reviewed document for that locale.
