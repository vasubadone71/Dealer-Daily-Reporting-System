const db = require('../database/db');

class LogRepository {
    async logActivity({
        actorType,
        actorId,
        username,
        action,
        details = null,
        ipAddress = null,
        deviceId = null,
        deviceName = null,
        osVersion = null,
        appVersion = null
    }) {
        return db.query(
            `INSERT INTO activity_logs (
                actor_type, actor_id, username, action, details, 
                ip_address, device_id, device_name, os_version, app_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                actorType, actorId, username, action, details,
                ipAddress, deviceId, deviceName, osVersion, appVersion
            ]
        );
    }

    async listLogs(limit = 100, offset = 0) {
        return db.query(
            'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
    }

    async getLogsCount() {
        const row = await db.get('SELECT COUNT(*) as count FROM activity_logs');
        return row ? row.count : 0;
    }

    async deleteOldLogs(days) {
        return db.query(
            `DELETE FROM activity_logs WHERE created_at < datetime('now', 'localtime', '-' || ? || ' days')`,
            [days]
        );
    }
}

module.exports = new LogRepository();
