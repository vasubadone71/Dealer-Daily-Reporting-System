const bcrypt = require('bcryptjs');
const db = require('../database/db');
const userRepository = require('../repositories/userRepository');
const logRepository = require('../repositories/logRepository');

class SettingsController {
    // ----------------------------------------------------
    // SYSTEM SETTINGS
    // ----------------------------------------------------
    async getSettings(req, res) {
        try {
            const settings = await db.get('SELECT * FROM settings WHERE id = 1');
            return res.status(200).json({ success: true, data: settings });
        } catch (error) {
            console.error('Get settings error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
        }
    }

    async updateSettings(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required.' });
        }

        const { companyName, telegramBotToken, reminder1, reminder2, reminder3, reminder4, hondaLogo, pdfHeader, pdfFooter } = req.body;

        try {
            await db.query(
                `UPDATE settings SET 
                    company_name = ?, 
                    telegram_bot_token = ?, 
                    notification_reminder_1 = ?, 
                    notification_reminder_2 = ?, 
                    notification_reminder_3 = ?, 
                    notification_reminder_4 = ?,
                    honda_logo = ?,
                    pdf_header = ?,
                    pdf_footer = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1`,
                [companyName, telegramBotToken, reminder1, reminder2, reminder3, reminder4, hondaLogo, pdfHeader, pdfFooter]
            );

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Settings Updated',
                details: 'System settings changed',
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Settings updated successfully.' });
        } catch (error) {
            console.error('Update settings error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update settings.' });
        }
    }

    // ----------------------------------------------------
    // ADMIN ACCOUNT MANAGEMENT (SUPER ADMIN ONLY)
    // ----------------------------------------------------
    async getAdmins(req, res) {
        try {
            const admins = await userRepository.listAllAdmins();
            return res.status(200).json({ success: true, data: admins });
        } catch (error) {
            console.error('Get admins error:', error);
            return res.status(500).json({ success: false, message: 'Failed to list admin users.' });
        }
    }

    async createAdmin(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required.' });
        }

        const { username, password, telegramChatId, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ success: false, message: 'Username, password and role are required.' });
        }

        try {
            const existing = await userRepository.findByUsername(username);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Admin username already exists.' });
            }

            const passwordHash = bcrypt.hashSync(password, 10);
            await userRepository.createAdmin({ username, passwordHash, telegramChatId, role });

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Admin Account Created',
                details: `Created admin: ${username} with role: ${role}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(201).json({ success: true, message: 'Admin account created successfully.' });
        } catch (error) {
            console.error('Create admin error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create admin.' });
        }
    }

    async updateAdmin(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required.' });
        }

        const { id } = req.params;
        const { username, password, telegramChatId, role, status } = req.body;

        try {
            const admin = await userRepository.findById(id);
            if (!admin) {
                return res.status(404).json({ success: false, message: 'Admin user not found.' });
            }

            let passwordHash = null;
            if (password) {
                passwordHash = bcrypt.hashSync(password, 10);
            }

            await userRepository.updateAdminDetails(id, {
                username, passwordHash, telegramChatId, role, status
            });

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Admin Details Changed',
                details: `Updated details for admin ID: ${id} (${username})`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Admin user updated successfully.' });
        } catch (error) {
            console.error('Update admin error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update admin.' });
        }
    }

    async deleteAdmin(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required.' });
        }

        const { id } = req.params;

        try {
            const admin = await userRepository.findById(id);
            if (!admin) {
                return res.status(404).json({ success: false, message: 'Admin user not found.' });
            }

            if (admin.role === 'super_admin') {
                return res.status(400).json({ success: false, message: 'Cannot delete Super Admin account.' });
            }

            await userRepository.deleteAdmin(id);

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Admin Account Deleted',
                details: `Deleted admin: ${admin.username}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Admin account deleted successfully.' });
        } catch (error) {
            console.error('Delete admin error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete admin.' });
        }
    }

    // ----------------------------------------------------
    // CHANGE PASSWORD (LOGGED IN USER CHANGES THEIR OWN)
    // ----------------------------------------------------
    async changeOwnPassword(req, res) {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const userType = req.user.type; // 'admin' or 'dealer'

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password required.' });
        }

        try {
            if (userType === 'admin') {
                const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
                if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
                    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
                }
                const newHash = bcrypt.hashSync(newPassword, 10);
                await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
                
                await logRepository.logActivity({
                    actorType: 'admin',
                    actorId: userId,
                    username: user.username,
                    action: 'Password Changed',
                    details: 'Admin changed own password',
                    ipAddress: req.ip || req.headers['x-forwarded-for']
                });
            } else {
                const dealer = await db.get('SELECT * FROM dealers WHERE id = ?', [userId]);
                if (!bcrypt.compareSync(currentPassword, dealer.password_hash)) {
                    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
                }
                const newHash = bcrypt.hashSync(newPassword, 10);
                await db.query('UPDATE dealers SET password_hash = ? WHERE id = ?', [newHash, userId]);

                await logRepository.logActivity({
                    actorType: 'dealer',
                    actorId: userId,
                    username: dealer.dealer_code,
                    action: 'Password Changed',
                    details: 'Dealer changed own password',
                    ipAddress: req.ip || req.headers['x-forwarded-for']
                });
            }

            return res.status(200).json({ success: true, message: 'Password changed successfully.' });

        } catch (error) {
            console.error('Change password error:', error);
            return res.status(500).json({ success: false, message: 'Failed to change password: ' + error.message });
        }
    }

    // ----------------------------------------------------
    // ACTIVITY LOGS
    // ----------------------------------------------------
    async getActivityLogs(req, res) {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;

        try {
            const logs = await logRepository.listLogs(limit, offset);
            const total = await logRepository.getLogsCount();
            return res.status(200).json({ success: true, data: logs, total });
        } catch (error) {
            console.error('Get logs error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch activity logs.' });
        }
    }

    async logClientAction(req, res) {
        const { action, details } = req.body;
        const userId = req.user.id;
        const username = req.user.username || req.user.dealer_code || 'unknown';
        const actorType = req.user.type;

        if (!action) {
            return res.status(400).json({ success: false, message: 'Action name is required.' });
        }

        try {
            await logRepository.logActivity({
                actorType,
                actorId: userId,
                username,
                action,
                details,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Log client action error:', error);
            return res.status(500).json({ success: false, message: 'Failed to write action log.' });
        }
    }
}

module.exports = new SettingsController();
