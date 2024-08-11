const io = require('socket.io-client');

// 連接到 Gate Server
const socket = io('http://localhost:3000');

// 當連接成功時執行
socket.on('connect', () => {
    console.log('Connected to Gate Server');

    // 模擬用戶登入
    socket.emit('login', { username: 'your-username', password: 'your-password' });
});

// 在 loginSuccess 事件中連接到 Game Server
socket.on('loginSuccess', ({ token, gameServerUrl }) => {
    console.log('Login successful!');
    console.log('Token:', token);
    console.log('Game Server URL:', gameServerUrl);

    // 連接到 Game Server
    const gameSocket = io(gameServerUrl);

    // 當連接成功時，發送 token 進行驗證
    gameSocket.on('connect', () => {
        console.log('Connected to Game Server');
        gameSocket.emit('authenticate', { token });
    });

    // 處理驗證錯誤
    gameSocket.on('authError', (error) => {
        console.log('Authentication failed:', error.message);
    });

    // 處理 attackMonster 的頻繁發送
    let attackIntervalId = setInterval(() => {
        console.log('Sending: attackMonster');
        gameSocket.emit('attackMonster');
    }, 500); // 每 500 毫秒發送一次

    // 處理伺服器回應的錯誤
    gameSocket.on('error', (error) => {
        if (error.code === 429) { // 處理請求過於頻繁的錯誤
            console.log('Error:', error.message);
        }
    });

    // 處理斷開連接
    gameSocket.on('disconnect', () => {
        console.log('Disconnected from Game Server');
        clearInterval(attackIntervalId); // 在斷開連接時停止發送 attackMonster
    });
});

// 當收到登入失敗的消息時執行
socket.on('loginError', (error) => {
    console.log('Login failed:', error.message);
});

// 當斷開連接時執行
socket.on('disconnect', () => {
    console.log('Disconnected from Gate Server');
});
