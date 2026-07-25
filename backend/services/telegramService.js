const db = require('../database/db');

class TelegramService {
    async sendMessage(chatId, text) {
        try {
            // Check dynamic database settings first, fallback to process.env
            const settings = await db.get('SELECT telegram_bot_token FROM settings WHERE id = 1');
            const botToken = settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
            
            if (!botToken || botToken.includes('SampleToken')) {
                console.warn('Telegram Bot Token not configured in settings/env. Skipping message:', text);
                return false;
            }
            if (!chatId) {
                console.warn('No Telegram Chat ID provided. Skipping message:', text);
                return false;
            }

            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            });

            const data = await response.json();
            if (!data.ok) {
                console.error('Telegram API returned error:', data.description);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Exception in sending Telegram message:', error);
            return false;
        }
    }

    async sendOtp(chatId, otp) {
        const text = `🔐 <b>My Shiva Honda Security</b>\n\nLogin OTP: <b>${otp}</b>\n\nValid for 5 minutes.\nDo not share this OTP with anyone.`;
        return this.sendMessage(chatId, text);
    }

    async sendSecurityAlert(chatId, { username, action, ipAddress, deviceName }) {
        const text = `⚠️ <b>My Shiva Honda Security Alert</b>\n\n` +
                     `<b>User:</b> ${username}\n` +
                     `<b>Event:</b> ${action}\n` +
                     `<b>IP:</b> ${ipAddress || 'Unknown'}\n` +
                     `<b>Device:</b> ${deviceName || 'Unknown'}\n` +
                     `<b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        return this.sendMessage(chatId, text);
    }
}

module.exports = new TelegramService();
