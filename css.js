import { proxyUrl } from "./security.js";

export function rewriteCss(css, baseUrl) {
  return css
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (whole, quote, value) => {
      const trimmed = value.trim();
      if (!trimmed || /^(data:|blob:|#|about:)/i.test(trimmed)) return whole;
      try {
        const absolute = new URL(trimmed, baseUrl).toString();
        return `url("${proxyUrl(absolute)}")`;
      } catch {
        return whole;
      }
    })
    .replace(/@import\s+(?:url\()?(['"])(.*?)\1\)?/gi, (whole, quote, value) => {
      try {
        return `@import url("${proxyUrl(new URL(value, baseUrl).toString())}")`;
      } catch {
        return whole;
      }
    });
}
