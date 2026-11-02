const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

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

  let browser = null;
  try {
    // Vercel環境用のChromium実行パスを取得
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 一般的なブラウザになりすます
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // ページへ移動し、ネットワーク通信が落ち着くまで（JSの描画を）最大25秒待つ
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    // 描画された最終的なHTMLを取得
    let htmlData = await page.content();
    await browser.close();

    // <base> タグの挿入（相対パスのCSSや画像を救済）
    const baseTag = `<base href="${targetUrl}">`;
    if (/<head[^>]*>/i.test(htmlData)) {
      htmlData = htmlData.replace(/<head[^>]*>/i, `$&${baseTag}`);
    } else {
      htmlData = `${baseTag}${htmlData}`;
    }

    // リンクをプロキシ経由に書き換え
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
    if (browser) {
      await browser.close();
    }
    return res.status(500).json({
      error: `ページの読み込みに失敗しました（動的描画エラー）: ${err.message}`,
    });
  }
});

module.exports = app;
