const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // 用於發送 HTTP 請求

// 秘鑰，用於驗證 JWT token
const secretKey = crypto.createSecretKey(Buffer.from('your_jwt_secret'));

// 創建 HTTP 伺服器
const server = http.createServer();
const io = socketIo(server);

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
            socket.on('pong', async () => {
                console.log('Received: pong');

                // 向 Instance Server 發送攻擊請求的異步函數
                async function sendAttackRequest() {
                    try {
                        await axios.post('http://localhost:4050/attack', { username });
                        console.log(`${username} Attack request sent to Instance Server`);
                    } catch (error) {
                        console.error('Failed to send attack request:', error.message);
                    }
                }

                // 呼叫異步函數
                sendAttackRequest();
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

// 啟動伺服器
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Game Server is running on port ${PORT}`);
});
