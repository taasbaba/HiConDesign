const io = require('socket.io-client');

// 連接到 Gate Server
const socket = io('http://localhost:3000');

// 當連接成功時執行
socket.on('connect', () => {
  console.log('Connected to Gate Server');

  // 模擬用戶登入
  socket.emit('login', { username: 'your-username', password: 'your-password' });
});

// 當收到登入成功的消息時執行
socket.on('loginSuccess', ({ token, gameServerUrl }) => {
  console.log('Login successful!');
  console.log('Token:', token);
  console.log('Game Server URL:', gameServerUrl);
  
  // 在這裡，你可以選擇繼續連接到 Game Server
});

// 當收到登入失敗的消息時執行
socket.on('loginError', (error) => {
  console.log('Login failed:', error.message);
});

// 當斷開連接時執行
socket.on('disconnect', () => {
  console.log('Disconnected from Gate Server');
});
