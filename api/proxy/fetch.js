import { Agent, fetch as undiciFetch } from "undici";
import { settings } from "../../config/settings.js";
import { resolvePublicHost, validateUrl } from "./security.js";

async function readLimited(response, limit) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > limit) throw new Error("ページの容量が上限を超えています。");

  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("ページの容量が上限を超えています。");
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

export async function fetchTarget(input, method = "GET") {
  let current = validateUrl(input);

  for (let redirects = 0; redirects <= settings.maxRedirects; redirects++) {
    const resolved = await resolvePublicHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);

    // undici may request DNS results with { all: true }.
    // Return the matching Node.js lookup callback shape in both cases.
    const dispatcher = new Agent({
      connect: {
        lookup(_hostname, options, callback) {
          if (options?.all) {
            callback(null, [{
              address: resolved.address,
              family: resolved.family
            }]);
          } else {
            callback(null, resolved.address, resolved.family);
          }
        }
      }
    });

    try {
      const response = await undiciFetch(current, {
        method,
        redirect: "manual",
        dispatcher,
        signal: controller.signal,
        headers: {
          "user-agent": settings.userAgent,
          "accept": "text/html,text/css,application/javascript,image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,font/woff2,*/*;q=0.5"
        }
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();

        if (!location) throw new Error("転送先がありません。");
        if (redirects === settings.maxRedirects) {
          throw new Error("転送回数の上限を超えました。");
        }

        // Validate every redirect target before the next connection.
        current = validateUrl(new URL(location, current).toString());
        continue;
      }

      const body = method === "HEAD"
        ? Buffer.alloc(0)
        : await readLimited(response, settings.maxResponseBytes);

      return {
        status: response.status,
        headers: response.headers,
        body,
        finalUrl: current.toString()
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("接続がタイムアウトしました。");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      await dispatcher.close().catch(() => {});
    }
  }

  throw new Error("ページを取得できませんでした。");
}
