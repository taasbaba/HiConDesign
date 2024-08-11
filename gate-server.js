const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const yaml = require('js-yaml');

// 讀取配置文件
const config = yaml.load(fs.readFileSync('./server-config.yml', 'utf8'));

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 獲取全局設置
const environment = config.environment;

// 找到這台服務器的配置
const gateServerConfig = config.servers.find(server => server.name === 'gate');
if (!gateServerConfig) {
    throw new Error('Gate Server configuration not found');
}

// 預先讀取 Game Server URLs
const gameServers = {
    game1: config.servers.find(server => server.name === 'game-1').url,
    game2: config.servers.find(server => server.name === 'game-2').url
};

// 將字符串密鑰轉換為 KeyObject
const secretKey = crypto.createSecretKey(Buffer.from('your_jwt_secret'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('login', ({ username, password }) => {
        console.log('Login attempt:', { username, password });

        // 檢查環境並決定是否驗證密碼
        if (environment === 'prod') {
            if (username === 'your-username' && password === 'your-password') {
                console.log('Credentials are valid, generating token...');
            } else {
                console.log('Invalid credentials');
                socket.emit('loginError', { message: 'Invalid credentials' });
                return;
            }
        } else {
            console.log('Development mode: Skipping password validation...');
        }

        try {
            const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
            console.log('Token generated:', token);

            // 對 username 取 2 餘數來選擇 Game Server
            const serverChoice = username.length % 2 === 0 ? gameServers.game1 : gameServers.game2;
            console.log(`User ${username} assigned to ${serverChoice}`);

            socket.emit('loginSuccess', { token, gameServerUrl: serverChoice });
        } catch (error) {
            console.error('Error generating token:', error);
            socket.emit('loginError', { message: 'Error generating token' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(gateServerConfig.url.split(':').pop(), () => {
    console.log(`Gate Server running on ${gateServerConfig.url} in ${environment} mode`);
});
