const express = require('express');
const app = express();

app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URLパラメーターが必要です。' });
  }

  try {
    new URL(targetUrl);
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

    const htmlData = await response.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(htmlData);
  } catch (err) {
    return res.status(500).json({
      error: `取得中にエラーが発生しました: ${err.message}`,
    });
  }
});

module.exports = app;
