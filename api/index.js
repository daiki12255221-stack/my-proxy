const express = require('express');
const app = express();

app.get('/api/proxy', async (req, res) => {
  let targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URLパラメーターが必要です。' });
  }

  // http:// または https:// がついていなければ自動補完
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  let parsedTargetUrl;
  try {
    parsedTargetUrl = new URL(targetUrl);
  } catch (err) {
    return res.status(400).json({ error: '無効なURL形式です。' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `対象サイトからの取得に失敗しました (Status: ${response.status})`,
      });
    }

    let htmlData = await response.text();

    // 1. <head> の先頭に <base> タグを注入（CSSや画像の相対パス崩れを完全に防ぐ）
    const baseTag = `<base href="${targetUrl}">`;
    if (/<head[^>]*>/i.test(htmlData)) {
      htmlData = htmlData.replace(/<head[^>]*>/i, `$&${baseTag}`);
    } else {
      htmlData = `${baseTag}${htmlData}`;
    }

    // 2. ページ内のリンク (href) をすべてプロキシ経由のURLに書き換える
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
      error: `取得中にエラーが発生しました: ${err.message}`,
    });
  }
});

module.exports = app;
