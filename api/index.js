const express = require('express');
const app = express();

app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URLパラメーターが必要です。' });
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
    const baseUrl = `${parsedTargetUrl.protocol}//${parsedTargetUrl.host}`;

    // 簡易的な相対パスの絶対パス化（srcやhrefが / から始まる場合にベースURLを補う）
    // ※ 完璧ではありませんが、多くの静的アセットの読み込みを救済します
    htmlData = htmlData.replace(
      /(src|href)=["'](\/[^"']*)["']/g,
      `$1="${baseUrl}$2"`
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlData);
  } catch (err) {
    return res.status(500).json({
      error: `取得中にエラーが発生しました: ${err.message}`,
    });
  }
});

module.exports = app;
