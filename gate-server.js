// Gate Server 內的代碼示例
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const gameServerUrl = 'http://localhost:4000'; // 假設 Game Server 運行在這個地址

// 將字符串密鑰轉換為 KeyObject
const secretKey = crypto.createSecretKey(Buffer.from('your_jwt_secret'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('login', ({ username, password }) => {
        console.log('Login attempt:', { username, password });

        if (username === 'your-username' && password === 'your-password') {
            console.log('Credentials are valid, generating token...');

            try {
                const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
                console.log('Token generated:', token);

                socket.emit('loginSuccess', { token, gameServerUrl });
            } catch (error) {
                console.error('Error generating token:', error);
                socket.emit('loginError', { message: 'Error generating token' });
            }

        } else {
            console.log('Invalid credentials');
            socket.emit('loginError', { message: 'Invalid credentials' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});


server.listen(3000, () => {
    console.log('Gate Server running on port 3000');
});
