const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const yaml = require('js-yaml');

// 讀取配置文件
const config = yaml.load(fs.readFileSync('./server-config.yml', 'utf8'));

// 找到這台 Instance Server 的配置
const instanceServerConfig = config.servers.find(server => server.name === 'instance');
if (!instanceServerConfig) {
    throw new Error('Instance Server configuration not found');
}

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

// 啟動伺服器，使用配置文件中的 URL 端口
const port = instanceServerConfig.url.split(':').pop();
server.listen(port, () => {
    console.log(`Instance Server is running on port ${port}`);
});
