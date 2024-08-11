const io = require('socket.io-client');

// 配置
const NUMBER_OF_BOTS = 5; // 機器人數量
const PASSWORD = 'your-password'; // 所有機器人的密碼
const GATE_SERVER_URL = 'http://localhost:3000'; // Gate Server 的 URL

// 儲存所有的 socket 連接和定時器ID，方便在退出時處理
const sockets = [];
const attackIntervalIds = [];

// 創建機器人
for (let i = 0; i < NUMBER_OF_BOTS; i++) {  // 修正起始條件
    const username = `${1000 + i}`;  // 用 1000 + i 作為用戶名
    createBot(username, PASSWORD);
}

function createBot(username, password) {
    // 連接到 Gate Server
    const socket = io(GATE_SERVER_URL);
    sockets.push(socket);  // 將 socket 加入到 sockets 陣列中

    // 當連接成功時執行
    socket.on('connect', () => {
        console.log(`${username} connected to Gate Server`);

        // 模擬用戶登入
        socket.emit('login', { username, password });
    });

    // 在 loginSuccess 事件中連接到 Game Server
    socket.on('loginSuccess', ({ token, gameServerUrl }) => {
        console.log(`${username} login successful!`);
        console.log(`${username} Token:`, token);
        console.log(`${username} Game Server URL:`, gameServerUrl);

        // 斷開 Gate Server 的連接
        socket.disconnect();

        // 連接到 Game Server
        const gameSocket = io(gameServerUrl);
        sockets.push(gameSocket);  // 將 gameSocket 加入到 sockets 陣列中

        // 當連接成功時，發送 token 進行驗證
        gameSocket.on('connect', () => {
            console.log(`${username} connected to Game Server`);
            gameSocket.emit('authenticate', { token });
        });

        // 處理驗證錯誤
        gameSocket.on('authError', (error) => {
            console.log(`${username} authentication failed:`, error.message);
        });

        // 處理 attackMonster 的頻繁發送
        let attackIntervalId = setInterval(() => {
            console.log(`${username} Sending: attackMonster`);
            gameSocket.emit('attackMonster');
        }, 500); // 每 500 毫秒發送一次
        attackIntervalIds.push(attackIntervalId);  // 儲存定時器ID

        // 處理伺服器回應的錯誤
        gameSocket.on('error', (error) => {
            if (error.code === 429) { // 處理請求過於頻繁的錯誤
                console.log(`${username} Error:`, error.message);
            }
        });

        // 處理來自伺服器的 attackResult
        gameSocket.on('attackResult', (data) => {
            console.log(`${username} received attack result: Remaining HP: ${data.hp}`);
        });

        // 監聽怪獸廣播事件
        gameSocket.on('monsterAppeared', (data) => {
            console.log(`${username} received: Monster appeared with HP: ${data.hp}`);
        });

        gameSocket.on('monsterStatus', (data) => {
            console.log(`${username} received: Monster status updated. Remaining HP: ${data.hp}`);
        });

        gameSocket.on('monsterDied', (data) => {
            console.log(`${username} received: Monster died. Killer: ${data.killer}, Time: ${data.deathTime}`);
        });

        // 處理來自伺服器的 attackMonster 錯誤
        gameSocket.on('monsterAttackError', (error) => {
            console.log(`${username} received error: ${error.message} (Code: ${error.code})`);
        });

        // 處理斷開連接
        gameSocket.on('disconnect', () => {
            console.log(`${username} disconnected from Game Server`);
            clearInterval(attackIntervalId); // 在斷開連接時停止發送 attackMonster
        });
    });

    // 當收到登入失敗的消息時執行
    socket.on('loginError', (error) => {
        console.log(`${username} login failed:`, error.message);
        
        // 斷開 Gate Server 的連接
        socket.disconnect();
    });

    // 當斷開連接時執行
    socket.on('disconnect', () => {
        console.log(`${username} disconnected from Gate Server`);
    });
}

// 監聽 Ctrl+C (SIGINT) 信號
process.on('SIGINT', () => {
    console.log('Gracefully shutting down...');

    // 清除所有定時器
    attackIntervalIds.forEach(clearInterval);

    // 斷開所有 socket 連接
    sockets.forEach(socket => socket.disconnect());

    // 結束進程
    process.exit(0);
});
