const db = require('../database/db');

class UserRepository {
    async findByUsername(username) {
        return db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username]);
    }

    async findById(id) {
        return db.get('SELECT id, username, telegram_chat_id, role, status, otp_code, otp_expires_at, otp_attempts, locked_until, device_id, created_at, updated_at FROM users WHERE id = ?', [id]);
    }

    async updateOtp(userId, otpCode, expiresAt) {
        return db.query(
            'UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [otpCode, expiresAt, userId]
        );
    }

    async incrementOtpAttempts(userId) {
        return db.query(
            'UPDATE users SET otp_attempts = otp_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
    }

    async resetOtpAttempts(userId) {
        return db.query(
            'UPDATE users SET otp_attempts = 0, otp_code = NULL, otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
    }

    async lockAccount(userId, lockedUntil) {
        return db.query(
            'UPDATE users SET locked_until = ?, otp_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [lockedUntil, userId]
        );
    }

    async updateDeviceId(userId, deviceId) {
        return db.query(
            'UPDATE users SET device_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [deviceId, userId]
        );
    }

    async createAdmin({ username, passwordHash, telegramChatId, role }) {
        return db.query(
            'INSERT INTO users (username, password_hash, telegram_chat_id, role, status) VALUES (?, ?, ?, ?, "active")',
            [username, passwordHash, telegramChatId, role]
        );
    }

    async deleteAdmin(id) {
        return db.query('DELETE FROM users WHERE id = ? AND role != "super_admin"', [id]);
    }

    async updateAdminDetails(id, { username, passwordHash, telegramChatId, role, status }) {
        if (passwordHash) {
            return db.query(
                'UPDATE users SET username = ?, password_hash = ?, telegram_chat_id = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [username, passwordHash, telegramChatId, role, status, id]
            );
        } else {
            return db.query(
                'UPDATE users SET username = ?, telegram_chat_id = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [username, telegramChatId, role, status, id]
            );
        }
    }

    async listAllAdmins() {
        return db.query('SELECT id, username, telegram_chat_id, role, status, created_at, updated_at FROM users WHERE role != "super_admin" OR role = "super_admin"');
    }
}

module.exports = new UserRepository();
