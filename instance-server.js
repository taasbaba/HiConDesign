const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const yaml = require('js-yaml');

// 讀取配置文件
const config = yaml.load(fs.readFileSync('./server-config.yml', 'utf8'));

// 找到這台 Instance Server 的配置
const instanceServerConfig = config.servers.find(server => server.name === 'instance');
if (!instanceServerConfig) {
    throw new Error('Instance Server configuration not found');
}

// 創建 HTTP 伺服器
const server = http.createServer();
// 初始化 Socket.IO 並應用心跳機制設置
const io = socketIo(server, {
    pingInterval: instanceServerConfig.pingInterval,  // 讀取 ping 間隔時間
    pingTimeout: instanceServerConfig.pingTimeout     // 讀取 ping 超時時間
});

// 設置怪獸初始 HP
let monsterHp = 10;
let monsterAlive = true;

// 攻擊隊列
const attackQueue = [];

// 處理攻擊請求的函數
function processNextAttack() {
    if (attackQueue.length === 0) return;

    const { username, damage, callback } = attackQueue.shift();

    console.log(`${username} wants to attack monster HP: ${monsterHp} alive: ${monsterAlive}`);
    if (monsterAlive) {
        monsterHp = Math.max(monsterHp - damage, 0);
        console.log(`${username} attacked the monster. Pending HP: ${monsterHp}`);

        // 立即通過回調函數回傳結果給 Game Server
        callback({ code: 0, hp: monsterHp });

        console.log(`Sent attackResult to ${username}, HP: ${monsterHp}`);
        
        if (monsterHp <= 0) {
            handleMonsterDeath(username); // 處理怪獸死亡
        }
    } else {
        console.log('Attack ignored. No monster alive currently.');
        // 回傳錯誤結果給 Game Server
        callback({
            code: 4001, // 自訂的錯誤代碼，表示沒有怪獸存活
            message: 'No monster alive currently.'
        });
    }

    // 處理下一個攻擊請求
    processNextAttack();
}

// 怪獸出現的函數
function spawnMonster() {
    monsterHp = 10;
    monsterAlive = true;
    console.log(`A new monster has appeared with full HP (${monsterHp}).`);
    io.emit('monsterAppeared', { hp: monsterHp }); // 廣播怪獸出現事件
}

// 怪獸死亡處理函數
function handleMonsterDeath(username) {
    monsterAlive = false;
    const deathTime = new Date();
    console.log(`Monster has been killed by ${username} at ${deathTime}.`);
    io.emit('monsterDied', {
        killer: username,
        deathTime: deathTime.toISOString()
    }); // 廣播怪獸死亡事件

    // 5 秒後生成一隻新的怪獸
    setTimeout(spawnMonster, 5000);
}

// 定期廣播怪獸狀態更新
setInterval(() => {
    if (monsterAlive) {
        io.emit('monsterStatus', { hp: monsterHp });
        console.log(`Broadcasting monster HP update: ${monsterHp}`);
    }
}, 1000); // 每秒廣播一次

// 當有客戶端連接時執行
io.on('connection', (socket) => {
    console.log('A client connected to Instance Server');

    // 監聽來自 Game Server 的攻擊請求
    socket.on('attackMonster', ({ username, damage = 3 }, callback) => {
        // 將攻擊請求加入隊列
        attackQueue.push({ username, damage, callback });

        // 如果隊列中只有這一個請求，立即處理它
        if (attackQueue.length === 1) {
            processNextAttack();
        }
    });

    // 處理斷開連接的事件
    socket.on('disconnect', () => {
        console.log('Client disconnected from Instance Server');
    });
});

// 啟動伺服器，使用配置文件中的 URL 端口
const port = instanceServerConfig.url.split(':').pop();
server.listen(port, () => {
    console.log(`Instance Server is running on port ${port}`);

    // 伺服器啟動時生成第一隻怪獸
    spawnMonster();
});
