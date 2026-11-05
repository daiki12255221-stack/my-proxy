import * as cheerio from "cheerio";
import { proxyUrl } from "./security.js";
import { rewriteCss } from "./css.js";

function toProxyUrl(value, baseUrl) {
  if (!value || /^(data:|blob:|javascript:|mailto:|tel:|#|about:)/i.test(value.trim())) return value;
  try {
    const url = new URL(value, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return value;
    return proxyUrl(url.toString());
  } catch {
    return value;
  }
}

function rewriteSrcset(value, baseUrl) {
  if (!value || /^\\s*data:/i.test(value)) return value;
  return value.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return entry;
    const match = trimmed.match(/^(\\S+)(\\s+.*)?$/);
    if (!match) return entry;
    return `${toProxyUrl(match[1], baseUrl)}${match[2] || ""}`;
  }).join(", ");
}

export function rewriteHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const selectors = [
    "a[href]", "area[href]", "link[href]", "script[src]",
    "img[src]", "iframe[src]", "frame[src]", "source[src]",
    "video[poster]", "video[src]", "audio[src]", "track[src]",
    "form[action]", "input[src]", "button[formaction]",
    "object[data]", "embed[src]", "svg image[href]",
    "svg image[xlink\\\\:href]", "use[href]", "use[xlink\\\\:href]"
  ].join(", ");

  $(selectors).each((_, element) => {
    const node = $(element);
    for (const attr of ["href", "src", "poster", "action", "data", "xlink:href", "formaction"]) {
      const value = node.attr(attr);
      if (value) node.attr(attr, toProxyUrl(value, baseUrl));
    }
  });

  $("[srcset]").each((_, element) => {
    const node = $(element);
    node.attr("srcset", rewriteSrcset(node.attr("srcset"), baseUrl));
  });
  $("style").each((_, element) => {
    const node = $(element);
    node.text(rewriteCss(node.text(), baseUrl));
  });
  $("[style]").each((_, element) => {
    const node = $(element);
    node.attr("style", rewriteCss(node.attr("style"), baseUrl));
  });

  if (!$("head").length) $("html").prepend("<head></head>");
  if (!$("base").length) $("head").prepend("<base>");
  $("base").first().attr("href", baseUrl);
  return $.html();
}
