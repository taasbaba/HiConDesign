const http = require('http');
const express = require('express');

const app = express();
app.use(express.json()); // 解析 JSON 請求體

// 處理攻擊請求的路由
app.post('/attack', (req, res) => {
  const { username } = req.body;
  console.log(`${username} 發動了攻擊`);
  res.sendStatus(200); // 返回狀態 200 表示成功
});

// 啟動伺服器
const PORT = 4050;
app.listen(PORT, () => {
  console.log(`Instance Server is running on port ${PORT}`);
});
