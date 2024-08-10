const http = require('http');
const socketIo = require('socket.io');

// 創建 HTTP 伺服器
const server = http.createServer();
const io = socketIo(server);

// 當有客戶端連接時執行
io.on('connection', (socket) => {
    console.log('A client connected to Instance Server');

    // 監聽來自 Game Server 的攻擊請求
    socket.on('attack', ({ username }) => {
        console.log(`${username} 發動了攻擊`);
        // 在這裡進行攻擊邏輯計算
    });

    // 處理斷開連接的事件
    socket.on('disconnect', () => {
        console.log('Client disconnected from Instance Server');
    });
});

// 啟動伺服器
const PORT = 4050;
server.listen(PORT, () => {
    console.log(`Instance Server is running on port ${PORT}`);
});
