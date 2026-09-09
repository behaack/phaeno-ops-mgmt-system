# Quote document assets

- `phaeno-logo.png` is the existing Phaeno logo from
  `website/public/images/phaeno124x40.png`, copied without modification.
- `Ubuntu-Regular.ttf` and `Ubuntu-Bold.ttf` are unmodified Ubuntu font files
  from the bundled Poppler runtime. Copyright 2011 Canonical Ltd.
  Their Ubuntu Font Licence 1.0 is included in `Ubuntu-FONT-LICENSE.txt` and
  distributed with the application.
  Official licence source: <https://canonical.com/legal/font-licence>.

The fonts are embedded in the PDF, so the renderer does not depend on fonts
installed on the application server. They support Latin, Greek, and Cyrillic
text, including common accented customer names. The renderer checks every
character before output and reports an unavailable document if a character
is unsupported; it never substitutes question marks for customer names.
The Portal's Geist web font is a WOFF2 variable font; the PDF uses these
redistributable TrueType fonts without adding a conversion or runtime dependency.
