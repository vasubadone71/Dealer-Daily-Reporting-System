const cron = require('node-cron');
const db = require('../database/db');
const reportRepository = require('../repositories/reportRepository');
const logRepository = require('../repositories/logRepository');
const pushNotificationService = require('./pushNotificationService');

const getTodayIstDate = () => {
    const now = new Date();
    // Get UTC offset
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    // Shift by +5.5 hours for IST
    const istDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffsetMs);
    return istDate.toISOString().split('T')[0];
};

const sendReminders = async (isFinalLock = false) => {
    const today = getTodayIstDate();
    console.log(`[Reminder Cron] Running task. Date: ${today}, isFinalLock: ${isFinalLock}`);
    try {
        // 1. Get report statuses for today
        const statuses = await reportRepository.getTodayReportsStatus(today);
        
        // 2. Filter dealers who have not submitted and have not been marked 'Not Sent' yet
        // Since 'Locked' is a new state for finalized reports, exclude that too.
        const lateDealers = statuses.filter(s => s.status !== 'Submitted' && s.status !== 'Not Sent' && s.status !== 'Locked');
        
        if (lateDealers.length === 0) {
            console.log('[Reminder Cron] All dealers have submitted today!');
            return;
        }

        // Gather active push tokens
        const tokens = [];
        for (let dealer of lateDealers) {
            const dRecord = await db.get('SELECT push_token FROM dealers WHERE id = ?', [dealer.dealer_id]);
            if (dRecord?.push_token) {
                tokens.push(dRecord.push_token);
            }
        }

        if (tokens.length > 0) {
            console.log(`[Reminder Cron] Sending push reminders to ${tokens.length} dealers...`);
            await pushNotificationService.sendBroadcast(
                tokens,
                '⚠️ Submit Today\'s Report',
                'Please submit your Shiva Honda daily sales and stock report. Auto-lock at 12:00 AM!'
            );
        }

        // 3. At 21:30, flag dealers who haven't submitted as 'Not Sent'
        //    (We no longer lock Submitted reports here — that happens at midnight.)
        if (isFinalLock) {
            console.log('[Reminder Cron] 9:30 PM — marking non-submitted dealers as Not Sent (reminder lock)...');
            if (reportRepository.lockNotSubmittedReports) {
                await reportRepository.lockNotSubmittedReports(today);
            }
            console.log('[Reminder Cron] Non-submission flagging done.');
        }

    } catch (error) {
        console.error('[Reminder Cron] Error during reminder generation:', error);
    }
};

// ── MIDNIGHT AUTO-LOCK ────────────────────────────────────────────────────────
// Runs at 12:01 AM IST every night.
// Locks all Pending/Submitted reports from yesterday (IST) → status = 'Locked'.
// Creates "Not Sent" records for dealers who never submitted.
const autoLockPreviousDay = async () => {
    // Compute yesterday's IST date
    const nowUtc = Date.now();
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // +5:30
    const nowIst = new Date(nowUtc + istOffsetMs);
    nowIst.setDate(nowIst.getDate() - 1); // go back one day
    const yesterdayIst = nowIst.toISOString().split('T')[0];

    console.log(`[Midnight Cron] Auto-locking reports for ${yesterdayIst} (IST yesterday)...`);
    try {
        await reportRepository.lockPreviousDayReports(yesterdayIst);
        
        console.log(`[Midnight Cron] Auto-cleaning old tracking logs (older than 90 days)...`);
        await logRepository.deleteOldLogs(90);

        console.log(`[Midnight Cron] Auto-lock and cleanup completed for ${yesterdayIst}.`);
    } catch (error) {
        console.error('[Midnight Cron] Auto-lock failed:', error);
    }
};

const startCron = () => {
    console.log('Initializing Shiva Honda reminder system cron schedules...');
    
    // 18:30 reminder
    cron.schedule('30 18 * * *', () => sendReminders(false), {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    // 19:30 reminder
    cron.schedule('30 19 * * *', () => sendReminders(false), {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    // 20:30 reminder
    cron.schedule('30 20 * * *', () => sendReminders(false), {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    // 21:30 reminder & flag late dealers
    cron.schedule('30 21 * * *', () => sendReminders(true), {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    // 12:01 AM IST — Auto-lock all previous day's reports
    cron.schedule('1 0 * * *', () => autoLockPreviousDay(), {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    console.log('[Cron] Midnight auto-lock cron scheduled at 12:01 AM IST.');
};

module.exports = {
    startCron,
    getTodayIstDate
};
