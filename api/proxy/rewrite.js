import * as cheerio from "cheerio";
import { proxyUrl } from "./security.js";
import { rewriteCss } from "./css.js";

function toProxyUrl(value, baseUrl) {
  if (!value || /^(data:|blob:|javascript:|mailto:|tel:|#|about:)/i.test(value.trim())) return value;
  try {
    return proxyUrl(new URL(value, baseUrl).toString());
  } catch {
    return value;
  }
}

export function rewriteHtml(html, baseUrl) {
  const $ = cheerio.load(html);

  $("a[href], link[href], script[src], img[src], iframe[src], source[src], video[poster], audio[src], form[action]").each((_, element) => {
    const node = $(element);
    for (const attr of ["href", "src", "poster", "action"]) {
      const value = node.attr(attr);
      if (value) node.attr(attr, toProxyUrl(value, baseUrl));
    }
  });

  $("style").each((_, element) => {
    const node = $(element);
    node.text(rewriteCss(node.text(), baseUrl));
  });

  $("[style]").each((_, element) => {
    const node = $(element);
    node.attr("style", rewriteCss(node.attr("style"), baseUrl));
  });

  // ページ内の相対リンク解決用。元ページのURLを基準にする。
  if (!$("base").length) $("head").prepend(`<base href="${baseUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">`);
  $("base").first().attr("href", baseUrl);

  return $.html();
}
