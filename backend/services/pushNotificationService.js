const { Expo } = require('expo-server-sdk');
const expo = new Expo();

class PushNotificationService {
    /**
     * Sends a single notification to an Expo push token.
     */
    async sendNotification(pushToken, title, body, data = {}) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.warn(`Token ${pushToken} is not a valid Expo push token`);
            return false;
        }

        const message = {
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data,
            _displayInForeground: true
        };

        try {
            const ticketChunk = await expo.sendPushNotificationsAsync([message]);
            console.log('Push notification ticket response:', ticketChunk);
            return ticketChunk;
        } catch (error) {
            console.error('Push notification send exception:', error);
            return false;
        }
    }

    /**
     * Sends broadcast or targeted group notifications in chunks.
     */
    async sendBroadcast(tokens, title, body, data = {}) {
        const messages = [];
        for (let token of tokens) {
            if (Expo.isExpoPushToken(token)) {
                messages.push({
                    to: token,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: data,
                    _displayInForeground: true
                });
            }
        }

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending push notification chunk:', error);
            }
        }
        return tickets;
    }
}

module.exports = new PushNotificationService();
