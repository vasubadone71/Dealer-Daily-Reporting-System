const db = require('../database/db');
const pushNotificationService = require('../services/pushNotificationService');
const logRepository = require('../repositories/logRepository');

class NotificationController {
    async sendNotification(req, res) {
        const { title, message, type, targetId } = req.body;
        const adminId = req.user.id;

        if (!title || !message || !type) {
            return res.status(400).json({ success: false, message: 'Title, message, and type are required.' });
        }

        try {
            // Find target push tokens
            let tokens = [];
            let targetName = 'All Dealers';

            if (type === 'broadcast' || type === 'urgent') {
                const dealers = await db.query('SELECT push_token FROM dealers WHERE status = "active" AND push_token IS NOT NULL');
                tokens = dealers.map(d => d.push_token);
            } else if (type === 'dealer') {
                const dealer = await db.get('SELECT push_token, name FROM dealers WHERE id = ?', [targetId]);
                if (!dealer) {
                    return res.status(404).json({ success: false, message: 'Dealer not found.' });
                }
                targetName = dealer.name;
                if (dealer.push_token) {
                    tokens.push(dealer.push_token);
                }
            } else if (type === 'network') {
                const network = await db.get('SELECT name FROM networks WHERE id = ?', [targetId]);
                if (!network) {
                    return res.status(404).json({ success: false, message: 'Network not found.' });
                }
                targetName = `Network: ${network.name}`;
                const dealers = await db.query('SELECT push_token FROM dealers WHERE status = "active" AND network_id = ? AND push_token IS NOT NULL', [targetId]);
                tokens = dealers.map(d => d.push_token);
            }

            // Save to database
            const insertRes = await db.query(
                'INSERT INTO notifications (title, message, type, target_id, sent_by) VALUES (?, ?, ?, ?, ?)',
                [title, message, type, targetId || null, adminId]
            );

            // Send push notifications via Expo
            let tickets = [];
            if (tokens.length > 0) {
                tickets = await pushNotificationService.sendBroadcast(tokens, title, message, {
                    type,
                    notificationId: insertRes.lastID
                });
            }

            // Log activity
            await logRepository.logActivity({
                actorType: 'admin',
                actorId: adminId,
                username: req.user.username,
                action: 'Notification Sent',
                details: `Sent ${type} alert to: ${targetName}. Title: "${title}"`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({
                success: true,
                message: 'Notification sent successfully.',
                recipients_count: tokens.length,
                tickets
            });

        } catch (error) {
            console.error('Send notification error:', error);
            return res.status(500).json({ success: false, message: 'Failed to send notification.' });
        }
    }

    async getNotifications(req, res) {
        const userType = req.user.type; // 'admin' or 'dealer'
        const userId = req.user.id;

        try {
            let sql = '';
            let params = [];

            if (userType === 'admin') {
                // Admins see all sent notifications
                sql = `
                    SELECT n.*, u.username as sent_by_user 
                    FROM notifications n 
                    JOIN users u ON n.sent_by = u.id 
                    ORDER BY n.created_at DESC
                `;
            } else {
                // Dealers see broadcasts, their network notifications, or dealer-specific notifications
                const dealer = await db.get('SELECT network_id FROM dealers WHERE id = ?', [userId]);
                if (!dealer) {
                    return res.status(404).json({ success: false, message: 'Dealer not found.' });
                }

                sql = `
                    SELECT n.id, n.title, n.message, n.type, n.created_at 
                    FROM notifications n
                    WHERE n.type = 'broadcast' 
                       OR n.type = 'urgent'
                       OR (n.type = 'network' AND n.target_id = ?)
                       OR (n.type = 'dealer' AND n.target_id = ?)
                    ORDER BY n.created_at DESC
                `;
                params = [dealer.network_id, userId];
            }

            const list = await db.query(sql, params);
            return res.status(200).json({ success: true, data: list });

        } catch (error) {
            console.error('Get notifications error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
        }
    }

    async deleteNotification(req, res) {
        const { id } = req.params;
        try {
            await db.query('DELETE FROM notifications WHERE id = ?', [id]);
            
            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Notification Deleted',
                details: `Deleted notification ID: ${id}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Notification deleted successfully.' });
        } catch (error) {
            console.error('Delete notification error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
        }
    }

    async resendNotification(req, res) {
        const { id } = req.params;
        try {
            const notification = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
            if (!notification) {
                return res.status(404).json({ success: false, message: 'Notification not found.' });
            }

            const { title, message, type, target_id } = notification;
            let tokens = [];
            let targetName = 'All Dealers';

            if (type === 'broadcast' || type === 'urgent') {
                const dealers = await db.query('SELECT push_token FROM dealers WHERE status = "active" AND push_token IS NOT NULL');
                tokens = dealers.map(d => d.push_token);
            } else if (type === 'dealer') {
                const dealer = await db.get('SELECT push_token, name FROM dealers WHERE id = ?', [target_id]);
                if (dealer) {
                    targetName = dealer.name;
                    if (dealer.push_token) tokens.push(dealer.push_token);
                }
            } else if (type === 'network') {
                const network = await db.get('SELECT name FROM networks WHERE id = ?', [target_id]);
                if (network) targetName = `Network: ${network.name}`;
                const dealers = await db.query('SELECT push_token FROM dealers WHERE status = "active" AND network_id = ? AND push_token IS NOT NULL', [target_id]);
                tokens = dealers.map(d => d.push_token);
            }

            let tickets = [];
            if (tokens.length > 0) {
                tickets = await pushNotificationService.sendBroadcast(tokens, title, message, {
                    type,
                    notificationId: id
                });
            }

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Notification Resent',
                details: `Resent ${type} alert to: ${targetName}. Title: "${title}"`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({
                success: true,
                message: 'Notification reminder sent successfully.',
                recipients_count: tokens.length,
                tickets
            });

        } catch (error) {
            console.error('Resend notification error:', error);
            return res.status(500).json({ success: false, message: 'Failed to resend notification.' });
        }
    }
}

module.exports = new NotificationController();
