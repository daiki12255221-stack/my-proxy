import { proxyUrl } from "./security.js";

function shouldSkip(value) {
  return !value || /^(data:|blob:|#|about:|javascript:)/i.test(value.trim());
}

function rewriteReference(value, baseUrl) {
  const trimmed = value.trim();
  if (shouldSkip(trimmed)) return value;

  try {
    const absolute = new URL(trimmed, baseUrl);
    if (!["http:", "https:"].includes(absolute.protocol)) return value;
    return proxyUrl(absolute.toString());
  } catch {
    return value;
  }
}

export function rewriteCss(css, baseUrl) {
  // CSS url(...) references, including quoted/unquoted values.
  let output = css.replace(
    /url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi,
    (whole, quote, quotedValue, unquotedValue) => {
      const value = (quotedValue ?? unquotedValue ?? "").trim();
      if (shouldSkip(value)) return whole;
      return `url("${rewriteReference(value, baseUrl).replace(/"/g, "%22")}")`;
    }
  );

  // @import "file.css" and @import url(file.css) are handled separately.
  output = output.replace(
    /@import\s+(?:(["'])(.*?)\1|url\(\s*(?:(["'])(.*?)\3|([^)]*?))\s*\))/gi,
    (whole, q1, v1, q2, v2, v3) => {
      const value = (v1 ?? v2 ?? v3 ?? "").trim();
      if (shouldSkip(value)) return whole;
      return `@import url("${rewriteReference(value, baseUrl).replace(/"/g, "%22")}")`;
    }
  );

  return output;
}
