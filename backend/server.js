const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for IP logging
app.set('trust proxy', true);

// Initialize Database connection & schemas
const db = require('./database/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const networkRoutes = require('./routes/networkRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const stockAdjustmentRoutes = require('./routes/stockAdjustmentRoutes');
const targetRoutes = require('./routes/targetRoutes');
const dealerStockRoutes = require('./routes/dealerStockRoutes');
const masterRoutes = require('./routes/masterRoutes');
const reportingRoutes = require('./routes/reportingRoutes');

// API Routes registration
app.use('/api/auth', authRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/networks', networkRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/stock-adjustments', stockAdjustmentRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/dealer-stock', dealerStockRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/reporting', reportingRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await db.get('SELECT 1');
        res.status(200).json({ status: 'ok', server: 'running', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', server: 'running', database: 'disconnected', error: err.message });
    }
});

app.get('/health', async (req, res) => {
    try {
        await db.get('SELECT 1');
        res.status(200).json({ success: true, message: 'Shiva Honda API Server is healthy and running.', database: 'connected' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server running, but database connection failed.', error: err.message });
    }
});

// ─── App Version Check Endpoint ────────────────────────────────
// Public endpoint — no auth required.
// Update MINIMUM_VERSION when you make breaking backend changes.
// All older APKs will be blocked from the app until the user updates.
const APP_VERSION_CONFIG = {
    minimum_version: '1.0.0',   // ← Bump this to block old APKs
    latest_version: '1.0.0',    // ← Informational: latest available APK version
    update_message: 'A new version of the app is available. Please update to continue using Shiva Honda Reporting.',
    update_url: '',             // ← Optional: Google Play / APK direct download URL
    force_update: false,        // ← Set to true to block old APKs from using the app
};

app.get('/api/app/version', (req, res) => {
    const clientVersion = req.query.version || '0.0.0';

    const parseVersion = (v) => v.split('.').map(Number);
    const isOutdated = (client, minimum) => {
        const c = parseVersion(client);
        const m = parseVersion(minimum);
        for (let i = 0; i < 3; i++) {
            if ((c[i] || 0) < (m[i] || 0)) return true;
            if ((c[i] || 0) > (m[i] || 0)) return false;
        }
        return false;
    };

    const outdated = isOutdated(clientVersion, APP_VERSION_CONFIG.minimum_version);
    const needsUpdate = outdated && APP_VERSION_CONFIG.force_update;

    return res.status(200).json({
        success: true,
        data: {
            minimum_version: APP_VERSION_CONFIG.minimum_version,
            latest_version: APP_VERSION_CONFIG.latest_version,
            current_version: clientVersion,
            needs_update: needsUpdate,
            is_outdated: outdated,
            force_update: APP_VERSION_CONFIG.force_update,
            update_message: APP_VERSION_CONFIG.update_message,
            update_url: APP_VERSION_CONFIG.update_url,
        }
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('API Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Start Cron Reminders
const cronService = require('./services/cronService');
cronService.startCron();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`  SHIVA HONDA DEALER DAILY REPORTING BACKEND`);
    console.log(`  Running on port: ${PORT} (Bound to 0.0.0.0)`);
    console.log(`  Mode: SQLite (Development/Production Scale)`);
    console.log(`  Timezone Context: India Standard Time (UTC+5:30)`);
    console.log('====================================================');
});

// Trigger nodemon reload comment

