# OurTownProperties.com Ask Magic Mike Integration

No confirmed live OurTownProperties.com repo was found locally. Use these artifacts for the production site owner or WordPress admin.

## Sitewide Floating Widget

Add the snippet from `docs/integrations/ourtownproperties-widget-snippet.html` before the closing `</body>` tag, in a WordPress Custom HTML block, or through the theme/footer injection area.

## Google Tag Manager Option

Create a Custom HTML tag with the same widget snippet. Trigger it on all pages. Keep the data attributes intact so leads include:

- `source=ourtownproperties`
- `medium=website`
- `campaign=parent-site-widget`
- `placement=sitewide-floating`
- parent page URL and embed host

## Homepage Section

Use `docs/integrations/ourtownproperties-homepage-section.html` in a Custom HTML block where a homepage CTA section is appropriate. It sends visitors to:

- `https://askmagicmike.com/home-value`
- `https://askmagicmike.com/ask`
- the widget seller path through the sitewide launcher

## QA Checklist

- Widget launcher appears bottom-right on desktop.
- Widget opens into a Black Diamond panel, not a generic blue chat bubble.
- Mobile widget behaves like a near full-screen bottom sheet.
- Home-value lead submits through `/api/leads`.
- Attribution includes `parent_url`, `embed_host`, `source`, `medium`, `campaign`, and `placement`.
- Escape closes the widget on desktop.
- No Mike image is altered or regenerated.
