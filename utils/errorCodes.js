const ERROR_CODES = Object.freeze({
    SUCCESS: { code: 0, message: 'Success' },
    REQUEST_TOO_FREQUENT: { code: 429, message: 'Request too frequent' },
    MONSTER_NOT_ALIVE: { code: 4001, message: 'No monster alive currently' },
    INVALID_TOKEN: { code: 401, message: 'Invalid token' },
    // 其他錯誤代碼...
});

module.exports = ERROR_CODES;
