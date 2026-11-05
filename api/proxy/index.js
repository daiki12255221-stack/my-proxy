import { allowedMethods } from "../../config/settings.js";
import { fetchTarget } from "./fetch.js";
import { rewriteHtml } from "./rewrite.js";
import { rewriteCss } from "./css.js";

function send(res, status, message) {
  res.statusCode = status;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(message);
}

export default async function handler(req, res) {
  if (!allowedMethods.has(req.method)) {
    res.setHeader("allow", "GET, HEAD");
    return send(res, 405, "Method Not Allowed");
  }

  const target = typeof req.query?.url === "string" ? req.query.url : "";
  if (!target) return send(res, 400, "URLを指定してください。");

  try {
    const result = await fetchTarget(target, req.method);
    const contentType = result.headers.get("content-type") || "application/octet-stream";
    const mime = contentType.split(";")[0].trim().toLowerCase();
    const looksLikeCss = /\.css(?:$|[?#])/i.test(result.finalUrl);

    let body = result.body;
    if (mime === "text/html" || mime === "application/xhtml+xml") {
      body = Buffer.from(rewriteHtml(body.toString("utf8"), result.finalUrl));
    } else if (mime === "text/css" || looksLikeCss) {
      body = Buffer.from(rewriteCss(body.toString("utf8"), result.finalUrl));
    }

    res.statusCode = result.status;
    res.setHeader("content-type", mime === "text/plain" && looksLikeCss
      ? "text/css; charset=utf-8"
      : contentType);
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("cache-control", "no-store");
    res.setHeader("content-security-policy", "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors *");
    res.setHeader("referrer-policy", "no-referrer");
    res.end(body);
  } catch (error) {
    console.error("[proxy] request failed", {
      name: error?.name,
      message: error?.message,
      causeName: error?.cause?.name,
      causeMessage: error?.cause?.message,
      causeCode: error?.cause?.code,
      stack: error?.stack
    });

    const message = error?.message || "ページを取得できませんでした。";
    const status = /URL|接続先|ホスト名|HTTPまたはHTTPS|ユーザー名/.test(message) ? 400 : 502;
    return send(res, status, message);
  }
}
