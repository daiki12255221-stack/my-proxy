const express = require('express');
const app = express();

app.get('/api/proxy', async (req, res) => {
  let targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URLパラメーターが必要です。' });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    new URL(targetUrl);
  } catch (err) {
    return res.status(400).json({ error: '無効なURL形式です。' });
  }

  try {
    // オールインワンのCORS/プロキシサービス経由でHTMLを取得して文字化けやブロックを回避
    const proxyApiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('プロキシサービスからの取得に失敗しました。');
    }

    const data = await response.json();
    let htmlData = data.contents;

    if (!htmlData) {
      return res.status(500).json({ error: '対象サイトのコンテンツを取得できませんでした。' });
    }

    // <base> タグを挿入して相対パス（CSS・画像）の崩れを防止
    const baseTag = `<base href="${targetUrl}">`;
    if (/<head[^>]*>/i.test(htmlData)) {
      htmlData = htmlData.replace(/<head[^>]*>/i, `$&${baseTag}`);
    } else {
      htmlData = `${baseTag}${htmlData}`;
    }

    // リンクをプロキシ経由のURLに書き換え
    htmlData = htmlData.replace(/href=["']([^"']+)["']/g, (match, href) => {
      if (
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return match;
      }
      try {
        const absoluteUrl = new URL(href, targetUrl).toString();
        return `href="/?url=${encodeURIComponent(absoluteUrl)}"`;
      } catch (e) {
        return match;
      }
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlData);
  } catch (err) {
    return res.status(500).json({
      error: `取得エラー: ${err.message}`,
    });
  }
});

module.exports = app;
