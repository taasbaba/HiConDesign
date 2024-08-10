const { spawn } = require('child_process');

// 啟動 Gate Server
const gateServer = spawn('node', ['gate-server.js'], { stdio: 'inherit' });
console.log('Gate Server is running...');

// 啟動 Game Server
const gameServer = spawn('node', ['game-server.js'], { stdio: 'inherit' });
console.log('Game Server is running...');

// 啟動 Instance Server
const instanceServer = spawn('node', ['instance-server.js'], { stdio: 'inherit' });
console.log('Instance Server is running...');

// 監聽 Gate Server 的退出事件
gateServer.on('close', (code) => {
  console.log(`Gate Server exited with code ${code}`);
});

// 監聽 Game Server 的退出事件
gameServer.on('close', (code) => {
  console.log(`Game Server exited with code ${code}`);
});

// 監聽 Instance Server 的退出事件
instanceServer.on('close', (code) => {
  console.log(`Instance Server exited with code ${code}`);
});

// 當 app.js 被終止時，確保伺服器也被關閉
process.on('SIGINT', () => {
  console.log('Terminating servers...');
  gateServer.kill();
  gameServer.kill();
  instanceServer.kill();
  process.exit();
});
