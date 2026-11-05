import { proxyUrl } from "./security.js";

function shouldSkip(value) {
  return !value || /^(?:data:|blob:|#|about:|javascript:)/i.test(value.trim());
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
  if (typeof css !== "string" || !css) return css;

  // Rewrite quoted @import paths that do not use url(...).
  let output = css.replace(
    /(@import\s+)(["'])([^"'\\]*(?:\\.[^"'\\]*)*)\2/gi,
    (whole, prefix, quote, value) => {
      if (shouldSkip(value)) return whole;
      return `${prefix}${quote}${rewriteReference(value, baseUrl)}${quote}`;
    }
  );

  // Rewrite url(...) once, including @import url(...).
  output = output.replace(
    /url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi,
    (whole, quote, quotedValue, unquotedValue) => {
      const value = (quotedValue ?? unquotedValue ?? "").trim();
      if (shouldSkip(value)) return whole;
      const rewritten = rewriteReference(value, baseUrl);
      return `url("${rewritten.replace(/"/g, "%22")}")`;
    }
  );

  return output;
}
