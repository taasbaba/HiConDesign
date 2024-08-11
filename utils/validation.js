// utils/validation.js

/**
 * 檢查 username 是否為有效的 uint64 數字並轉換
 * @param {string} username - 要檢查的用戶名
 * @returns {BigInt} - 轉換後的 uint64 值
 * @throws {Error} - 如果 username 不是有效的 uint64 數字，則拋出錯誤
 */
function validateAndConvertToUint64(username) {
    // 檢查是否為數字並且是正整數
    if (/^\d+$/.test(username)) {
        // 將字符串轉換為 BigInt 並檢查其是否在 uint64 範圍內
        const uint64Value = BigInt(username);
        if (uint64Value >= BigInt(0) && uint64Value <= BigInt('0xFFFFFFFFFFFFFFFF')) {
            return uint64Value;
        } else {
            throw new Error('Error: Number out of uint64 range'); // 返回錯誤碼或錯誤信息
        }
    } else {
        throw new Error('Error: Invalid uint64 number'); // 返回錯誤碼或錯誤信息
    }
}

module.exports = {
    validateAndConvertToUint64
};
