export const settings = Object.freeze({
  maxResponseBytes: 5 * 1024 * 1024,
  timeoutMs: 9000,
  maxRedirects: 5,
  userAgent: "Mozilla/5.0 (compatible; SimpleWebProxy/1.0)"
});

export const allowedProtocols = new Set(["http:", "https:"]);
export const allowedMethods = new Set(["GET", "HEAD"]);
