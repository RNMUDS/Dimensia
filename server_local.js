const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// publicディレクトリの静的ファイルを提供
app.use(express.static('public'));

// ルートパスでindex.htmlを表示
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SSL証明書の読み込み
const options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
};

// HTTPSサーバーを3000ポートで起動
const server = https.createServer(options, app);

server.listen(3000, () => {
    console.log('HTTPS Server is running on port 3000');
    console.log('Access the site at https://localhost:3000 or https://dimensia.aixrlab.space');
});