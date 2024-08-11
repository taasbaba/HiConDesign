const http = require('http');
const socketIo = require('socket.io');
const socketIoClient = require('socket.io-client'); // 引入 socket.io-client
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const yaml = require('js-yaml');

// 讀取配置文件
const config = yaml.load(fs.readFileSync('./server-config.yml', 'utf8'));

// 獲取全局設置
const environment = config.environment;

// 根據啟動時的參數確定這是第幾個 Game Server
const serverName = process.argv[2]; // 從命令行參數獲取 server 名稱

// 找到這台 Game Server 的配置
const gameServerConfig = config.servers.find(server => server.name === serverName);
if (!gameServerConfig) {
    throw new Error(`${serverName} configuration not found`);
}

// 找到 Instance Server 的配置
const instanceServerConfig = config.servers.find(server => server.name === 'instance');
if (!instanceServerConfig) {
    throw new Error('Instance Server configuration not found');
}

// 創建 HTTP 伺服器
const server = http.createServer();
// 初始化 Socket.IO 並應用心跳機制設置
const io = socketIo(server, {
    pingInterval: gameServerConfig.pingInterval,  // 讀取 ping 間隔時間
    pingTimeout: gameServerConfig.pingTimeout     // 讀取 ping 超時時間
});

// 創建與 Instance Server 的 Socket.IO 客戶端連接
const instanceServerSocket = socketIoClient.connect(instanceServerConfig.url);

// 秘鑰，用於驗證 JWT token
const secretKey = crypto.createSecretKey(Buffer.from('your_jwt_secret'));

// 當有客戶端連接時執行
io.on('connection', (socket) => {
    console.log('A client connected to Game Server');

    // 監聽客戶端發送的驗證請求
    socket.on('authenticate', ({ token }) => {
        try {
            // 驗證 JWT token
            const decoded = jwt.verify(token, secretKey);
            console.log('Client authenticated:', decoded);

            // 從解碼的 token 中提取 username
            const username = decoded.username;

            // 驗證成功後，開始每5秒傳遞 ping/pong 消息
            const intervalId = setInterval(() => {
                socket.emit('ping');
                console.log('Sent: ping');
            }, 5000);

            // 監聽客戶端的 pong 消息
            socket.on('pong', () => {
                console.log('Received: pong');

                // 通過 Socket.IO 向 Instance Server 發送攻擊請求
                instanceServerSocket.emit('attack', { username });
                console.log(`${username} Attack request sent to Instance Server`);
            });

            // 當客戶端斷開連接時清除間隔計時器
            socket.on('disconnect', () => {
                clearInterval(intervalId);
                console.log('Client disconnected from Game Server');
            });

        } catch (error) {
            console.log('Authentication failed:', error.message);
            socket.emit('authError', { message: 'Invalid token' });
            socket.disconnect(); // 驗證失敗後斷開連接
        }
    });
});

// 啟動伺服器，使用配置文件中的 URL 端口
const port = gameServerConfig.url.split(':').pop();
server.listen(port, () => {
    console.log(`${serverName} is running on port ${port}`);
});
