const express = require('express');
const http = require('http');  // httpsではなくhttpを使用
const path = require('path');

const app = express();

// publicディレクトリの静的ファイルを提供
app.use(express.static('public'));

// ルートパスでindex.htmlを表示
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// HTTPサーバーを3000ポートで起動
const server = http.createServer(app);

server.listen(3000, () => {
    console.log('HTTP Server is running on port 3000');
    console.log('Access the site at https://dimensia.aixrlab.space');
});