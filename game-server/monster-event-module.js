// 引入所需的模組
const ERROR_CODES = require('../utils/errorCodes');

// 內部變數來儲存用戶的上次攻擊時間
const lastAttackTime = new Map();

// 定義過期時間限制（例如：1 小時未活動的用戶記錄將被清理）
const INACTIVE_TIME_LIMIT = 60 * 60 * 1000;

// 設置定期清理過期記錄的定時器
setInterval(() => {
    const currentTime = Date.now();
    lastAttackTime.forEach((lastTime, username) => {
        if (currentTime - lastTime > INACTIVE_TIME_LIMIT) {
            lastAttackTime.delete(username);
            console.log(`Removed inactive user: ${username} from lastAttackTime map`);
        }
    });
}, INACTIVE_TIME_LIMIT); // 每隔一小時執行一次清理

// 綁定 instanceServerSocket 的事件處理器，只執行一次
function bindInstanceServerEvents(instanceServerSocket, io) {
    if (instanceServerSocket.listeners('monsterStatus').length === 0) {
        instanceServerSocket.on('monsterStatus', (data) => {
            console.log(`Monster status updated. Remaining HP: ${data.hp}`);
            io.emit('monsterStatus', data);
        });
    }

    if (instanceServerSocket.listeners('monsterAppeared').length === 0) {
        instanceServerSocket.on('monsterAppeared', (data) => {
            console.log(`Monster appeared with HP: ${data.hp}`);
            io.emit('monsterAppeared', data);
        });
    }

    if (instanceServerSocket.listeners('monsterDied').length === 0) {
        instanceServerSocket.on('monsterDied', (data) => {
            console.log(`Monster died. Killer: ${data.killer}, Time: ${data.deathTime}`);
            io.emit('monsterDied', data);
        });
    }
}

// 處理玩家的 attackMonster 事件
function handleAttackMonster(socket, instanceServerSocket, username) {
    socket.on('attackMonster', (callback) => {
        const currentTime = Date.now();
    
        // 檢查攻擊間隔時間
        if (lastAttackTime.has(username) && currentTime - lastAttackTime.get(username) < 1000) {
            // 如果間隔時間小於 1 秒，回傳錯誤信息給 client
            callback(ERROR_CODES.REQUEST_TOO_FREQUENT);
            console.log(`Request too frequent from ${username}`);
        } else {
            // 更新上次攻擊時間
            lastAttackTime.set(username, currentTime);
    
            // 通過 Socket.IO 向 Instance Server 發送 attackMonster 事件，並在回應後直接回傳結果給 client
            instanceServerSocket.emit('attackMonster', { username }, (response) => {
                const { hp, code, message } = response;
                console.log(`Received response for username: ${username}, Remaining HP: ${hp}, Code: ${code}, Message: ${message}`);
                
                // 回傳結果給 client
                callback({ hp, code, message });
            });
    
            console.log(`${username} Attack request sent to Instance Server`);
        }
    });
}

// 清理用戶的怪物攻擊記錄
function clearMonsterAttackRecord(username) {
    lastAttackTime.delete(username);
    console.log(`Removed user: ${username} from lastAttackTime map on disconnect`);
}

module.exports = {
    bindInstanceServerEvents,
    handleAttackMonster,
    clearMonsterAttackRecord
};
