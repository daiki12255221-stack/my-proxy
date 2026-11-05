import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { allowedProtocols } from "../../config/settings.js";

export function validateUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URLの形式が正しくありません。");
  }

  if (!allowedProtocols.has(url.protocol)) {
    throw new Error("HTTPまたはHTTPSのURLだけ利用できます。");
  }
  if (url.username || url.password) {
    throw new Error("ユーザー名・パスワード付きURLは利用できません。");
  }
  if (!url.hostname || url.hostname.length > 253) {
    throw new Error("ホスト名が正しくありません。");
  }
  return url;
}

function isPublicAddress(address) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export async function resolvePublicHost(hostname) {
  // IPリテラルもDNS名も、接続先がグローバルユニキャストか確認する。
  if (ipaddr.isValid(hostname)) {
    if (!isPublicAddress(hostname)) throw new Error("この接続先にはアクセスできません。");
    const parsed = ipaddr.process(hostname);
    return { address: parsed.toString(), family: parsed.kind() === "ipv4" ? 4 : 6 };
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !isPublicAddress(record.address))) {
    throw new Error("安全でない接続先が検出されました。");
  }
  return records[0];
}

export function proxyUrl(target) {
  return `/api/proxy?url=${encodeURIComponent(target)}`;
}
