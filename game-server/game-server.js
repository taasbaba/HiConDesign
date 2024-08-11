const http = require('http');
const socketIo = require('socket.io');
const socketIoClient = require('socket.io-client'); // 引入 socket.io-client，用來連接到 Instance Server
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const yaml = require('js-yaml');
const ERROR_CODES = require('../utils/errorCodes'); // 引入 errorCodes.js
const {
    bindInstanceServerEvents,
    handleAttackMonster,
    clearMonsterAttackRecord
} = require('./monster-event-module'); // 引入 monster-event-module.js

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
    pingInterval: gameServerConfig.pingInterval || 25000,  // 讀取 ping 間隔時間，若無則設置默認值
    pingTimeout: gameServerConfig.pingTimeout || 5000      // 讀取 ping 超時時間，若無則設置默認值
});

// 創建與 Instance Server 的 Socket.IO 客戶端連接
const instanceServerSocket = socketIoClient.connect(instanceServerConfig.url);

// 設置 Instance Server 事件監聽器
bindInstanceServerEvents(instanceServerSocket, io);

// 當有客戶端連接時執行
io.on('connection', (socket) => {

    // 監聽客戶端發送的驗證請求
    socket.on('authenticate', ({ token }) => {
        try {
            // 驗證 JWT token 並提取 username
            const decoded = jwt.verify(token, crypto.createSecretKey(Buffer.from('your_jwt_secret')));
            const username = decoded.username;
            console.log(`[${serverName}] Client authenticated: ${username}`, decoded);

            // 處理 attackMonster 事件
            handleAttackMonster(socket, instanceServerSocket, username);

            // 在用戶斷開連接時清理其記錄
            socket.on('disconnect', () => {
                clearMonsterAttackRecord(username);
                console.log(`[${serverName}] Client ${username} disconnected from Game Server`);
            });

        } catch (error) {
            // 處理驗證失敗的情況
            socket.emit('authError', ERROR_CODES.INVALID_TOKEN);
            socket.disconnect(); // 驗證失敗後斷開連接
        }
    });
});

// 啟動伺服器，使用配置文件中的 URL 端口
const port = gameServerConfig.url.split(':').pop();
server.listen(port, () => {
    console.log(`[${serverName}] is running on port ${port}`);
});
