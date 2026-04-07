export const defaultContent = {
  siteLogoUrl: '/brand/logo.png',
  themeGradientStart: '#1a0a12',
  themeGradientEnd: '#4a1520',
  themeAccent: '#c9a227',
  themeAccentHover: '#e8c547',
  themePageText: '#f5f0e6',
  themePageTextMuted: '#d4cfc8',
  themeCardHeading: '#111827',
  themeCardBody: '#1f2937',
  themeCardMuted: '#6b7280',
  themeChromeTint: '#0a0a0a',
  themeChromeText: '#ffffff',
  heroFogEnabled: 'true',
  heroFogOpacity: '0.38',
  heroFogSpeedSec: '72',
  heroFogTint: '#94a3b8',
  themeFontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  homeTitle: "Welcome to Sam's Stag Do",
  homeTagline: 'June/July 2025 • A weekend to remember (or forget)',
  homeAbout:
    "This is your private hub for all things Sam's Stag Do. Share stories, coordinate plans, and make sure we've got everything sorted for an epic weekend. What happens here, stays here... mostly.",
  detailsWhen: 'June/July 2025',
  detailsWhenDescription: 'Specific dates to be confirmed. Check back soon for exact dates and times.',
  detailsWhere: 'Location TBD',
  detailsWhereDescription:
    "We're still finalizing the location. It's going to be epic, that's all we can say for now.",
  detailsWhereMapEmbedUrl: '',
  detailsWhereMapLinkUrl: '',
  detailsAccommodationUrl: '',
  detailsWho: '~12 People',
  detailsWhoDescription: "The core crew. If you're reading this, you're invited. Congratulations!",
  detailsCost: 'TBD',
  detailsCostDescription: "Budget breakdown and payment details coming soon. We'll keep it reasonable (probably).",
  detailsBring:
    'Valid ID / Passport\nComfortable shoes\nSmart casual outfit for dinner\nSense of humor\nWillingness to embarrass Sam\nPhone charger',
  detailsItinerary:
    "The full itinerary will be posted here as we get closer to the date. For now, just know it's going to involve good food, good drinks, and plenty of opportunities to remind Sam of his questionable life choices.",
  chatEnabled: 'true',
  chatModel: '',
  chatSystemPrompt:
    "You are Sam's stag-do memory wingman. Help users expand funny or heartwarming memories about Sam by asking follow-up questions and suggesting vivid details. Keep tone playful but respectful, avoid inventing harmful claims, and keep replies concise (3-8 sentences).",
  kittyHtml: ''
};

/**
 * Merge DB rows with defaults and map legacy theme keys so older SQLite rows still work.
 * @param {Record<string, string>} stored — merged defaultContent + DB key/value
 */
export function normalizeThemeFromStored(stored) {
  const out = { ...stored };

  if (!out.themePageText && stored.themeHeroText) {
    out.themePageText = stored.themeHeroText;
  }
  if (!out.themeCardBody && stored.themeTextOnLight) {
    out.themeCardBody = stored.themeTextOnLight;
  }
  if (!out.themeCardMuted && stored.themeTextMuted) {
    out.themeCardMuted = stored.themeTextMuted;
  }
  if (!out.themeCardHeading && stored.themeHeadingOnLight) {
    out.themeCardHeading = stored.themeHeadingOnLight;
  }
  if (!out.themeChromeTint && stored.themeNavSolid) {
    out.themeChromeTint = stored.themeNavSolid;
  }
  if (!out.themeChromeText) {
    out.themeChromeText =
      stored.themeChromeText ||
      stored.themeNavLinkColor ||
      stored.themeFooterText ||
      defaultContent.themeChromeText;
  }
  if (!out.themePageTextMuted) {
    out.themePageTextMuted =
      stored.themePageTextMuted || stored.themeTextMuted || defaultContent.themePageTextMuted;
  }

  return out;
}

export const contentKeys = Object.keys(defaultContent);

/** Keys exposed without auth (login + global theming). Keep this list explicit. */
export const publicBrandingKeys = [
  'siteLogoUrl',
  'homeTitle',
  'homeTagline',
  'themeGradientStart',
  'themeGradientEnd',
  'themeAccent',
  'themeAccentHover',
  'themePageText',
  'themePageTextMuted',
  'themeCardHeading',
  'themeCardBody',
  'themeCardMuted',
  'themeChromeTint',
  'themeChromeText',
  'themeFontFamily',
  'heroFogEnabled',
  'heroFogOpacity',
  'heroFogSpeedSec',
  'heroFogTint'
];

export function pickPublicBranding(merged) {
  const normalized = normalizeThemeFromStored({ ...defaultContent, ...merged });
  const out = {};
  for (const key of publicBrandingKeys) {
    const v = normalized[key];
    out[key] = typeof v === 'string' ? v : defaultContent[key] ?? '';
  }
  return out;
}
