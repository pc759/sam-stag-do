import { defaultContent, pickPublicBranding } from './siteContent';

/**
 * Apply CMS branding to document CSS variables (browser only).
 * @param {Record<string, string>} data — merged branding keys (e.g. from public-branding API)
 */
export function applyBrandingToDocument(data) {
  if (typeof document === 'undefined') return;

  const b = pickPublicBranding({ ...defaultContent, ...data });
  const root = document.documentElement;

  root.style.setProperty('--grad-start', b.themeGradientStart);
  root.style.setProperty('--grad-end', b.themeGradientEnd);
  root.style.setProperty('--accent', b.themeAccent);
  root.style.setProperty('--accent-hover', b.themeAccentHover);
  root.style.setProperty('--page-text', b.themePageText);
  root.style.setProperty('--page-text-muted', b.themePageTextMuted);
  root.style.setProperty('--card-heading', b.themeCardHeading);
  root.style.setProperty('--card-body', b.themeCardBody);
  root.style.setProperty('--card-muted', b.themeCardMuted);
  root.style.setProperty('--chrome-tint', b.themeChromeTint);
  root.style.setProperty('--chrome-text', b.themeChromeText);

  const font = (b.themeFontFamily || '').trim().replace(/\s+/g, ' ');
  if (font) {
    root.style.setProperty('--font-body', font);
  }

  const fogOpacity = clamp01(parseFloat(b.heroFogOpacity));
  if (!Number.isNaN(fogOpacity)) {
    root.style.setProperty('--hero-fog-opacity', String(fogOpacity));
  }

  const speed = parseFloat(b.heroFogSpeedSec);
  if (!Number.isNaN(speed) && speed > 0) {
    root.style.setProperty('--hero-fog-duration', `${speed}s`);
  }

  root.style.setProperty('--hero-fog-tint', b.heroFogTint || defaultContent.heroFogTint);

  const fogOn = b.heroFogEnabled !== 'false';
  root.setAttribute('data-hero-fog', fogOn ? 'on' : 'off');
}

function clamp01(n) {
  if (Number.isNaN(n)) return NaN;
  return Math.min(1, Math.max(0, n));
}
