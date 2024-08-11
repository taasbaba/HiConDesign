const http = require('http');
const socketIo = require('socket.io');
const socketIoClient = require('socket.io-client'); // 引入 socket.io-client，用來連接到 Instance Server
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
    pingInterval: gameServerConfig.pingInterval || 25000,  // 讀取 ping 間隔時間，若無則設置默認值
    pingTimeout: gameServerConfig.pingTimeout || 5000      // 讀取 ping 超時時間，若無則設置默認值
});

// 創建與 Instance Server 的 Socket.IO 客戶端連接
const instanceServerSocket = socketIoClient.connect(instanceServerConfig.url);

// 秘鑰，用於驗證 JWT token
const secretKey = crypto.createSecretKey(Buffer.from('your_jwt_secret'));

// 記錄每個用戶的上次攻擊時間
const lastAttackTime = new Map();

// 保存每次攻擊請求的映射，根據 attackId 保存對應的 socket
const pendingAttacks = new Map();

// 當有客戶端連接時執行
io.on('connection', (socket) => {

    // 監聽客戶端發送的驗證請求
    socket.on('authenticate', ({ token }) => {
        try {
            // 驗證 JWT token 並提取 username
            const decoded = jwt.verify(token, secretKey);
            const username = decoded.username;
            console.log(`[${serverName}] Client authenticated: ${username}`, decoded);

            // 監聽來自玩家的 attackMonster 事件
            socket.on('attackMonster', () => {
                const currentTime = Date.now();

                // 檢查攻擊間隔時間
                if (lastAttackTime.has(username) && currentTime - lastAttackTime.get(username) < 1000) {
                    // 如果間隔時間小於 1 秒，發送錯誤信息
                    socket.emit('error', {
                        code: 429, // 常見的 HTTP 429 錯誤碼，表示請求過於頻繁
                        message: 'Request too frequent'
                    });
                    console.log(`[${serverName}] Request too frequent from ${username}`);
                } else {
                    // 更新上次攻擊時間
                    lastAttackTime.set(username, currentTime);

                    // 生成一個唯一的 attackId 來識別這次攻擊
                    const attackId = crypto.randomUUID();

                    // 保存這次攻擊對應的 socket
                    pendingAttacks.set(attackId, socket);

                    // 通過 Socket.IO 向 Instance Server 發送 attackMonster 事件
                    instanceServerSocket.emit('attackMonster', { username, attackId });

                    console.log(`[${serverName}] ${username} Attack request sent to Instance Server with attackId: ${attackId}`);
                }
            });

            // 監聽 Instance Server 的 attackResult 事件
            if (!instanceServerSocket.listeners('attackResult').length) {
                instanceServerSocket.on('attackResult', (response) => {
                    const { attackId, hp } = response;
                    const clientSocket = pendingAttacks.get(attackId);

                    if (clientSocket) {
                        console.log(`[${serverName}] Received attackResult from Instance Server for ${attackId}, Remaining HP: ${hp}`);
                        clientSocket.emit('attackResult', { hp }); // 將剩餘 HP 回傳給對應的 client
                        pendingAttacks.delete(attackId); // 刪除已處理的攻擊
                    }
                });
            }

            // 監聽 Instance Server 廣播的怪獸事件
            if (!instanceServerSocket.listeners('monsterStatus').length) {
                instanceServerSocket.on('monsterStatus', (data) => {
                    console.log(`[${serverName}] Monster status updated. Remaining HP: ${data.hp}`);
                    io.emit('monsterStatus', data);
                });
            }

            if (!instanceServerSocket.listeners('monsterAppeared').length) {
                instanceServerSocket.on('monsterAppeared', (data) => {
                    console.log(`[${serverName}] Monster appeared with HP: ${data.hp}`);
                    io.emit('monsterAppeared', data);
                });
            }

            if (!instanceServerSocket.listeners('monsterDied').length) {
                instanceServerSocket.on('monsterDied', (data) => {
                    console.log(`[${serverName}] Monster died. Killer: ${data.killer}, Time: ${data.deathTime}`);
                    io.emit('monsterDied', data);
                });
            }

            // 當客戶端斷開連接時清除用戶的上次攻擊時間記錄
            socket.on('disconnect', () => {
                lastAttackTime.delete(username);
                console.log(`[${serverName}] Client ${username} disconnected from Game Server`);
            });

        } catch (error) {
            // 處理驗證失敗的情況
            console.log(`[${serverName}] Authentication failed for client: ${error.message}`);
            socket.emit('authError', { message: 'Invalid token' });
            socket.disconnect(); // 驗證失敗後斷開連接
        }
    });
});

// 啟動伺服器，使用配置文件中的 URL 端口
const port = gameServerConfig.url.split(':').pop();
server.listen(port, () => {
    console.log(`[${serverName}] is running on port ${port}`);
});
