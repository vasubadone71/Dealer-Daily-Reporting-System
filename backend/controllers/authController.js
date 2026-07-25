const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const dealerRepository = require('../repositories/dealerRepository');
const logRepository = require('../repositories/logRepository');
const telegramService = require('../services/telegramService');

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
};

class AuthController {
    // ----------------------------------------------------
    // ADMIN AUTHENTICATION
    // ----------------------------------------------------
    async adminLogin(req, res) {
        const { username, password, deviceId, deviceName } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required.' });
        }

        try {
            const user = await userRepository.findByUsername(username);
            if (!user) {
                await logRepository.logActivity({
                    actorType: 'admin',
                    actorId: null,
                    username,
                    action: 'Login Failed',
                    details: 'Invalid username',
                    ipAddress
                });
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }

            // Check if account is locked
            const now = new Date();
            if (user.locked_until && new Date(user.locked_until) > now) {
                const minutesLeft = Math.ceil((new Date(user.locked_until) - now) / 60000);
                return res.status(401).json({ 
                    success: false, 
                    message: `Account is temporarily locked due to excessive failed OTP attempts. Try again in ${minutesLeft} minutes.` 
                });
            }

            // Check password
            const isMatch = bcrypt.compareSync(password, user.password_hash);
            if (!isMatch) {
                await logRepository.logActivity({
                    actorType: 'admin',
                    actorId: user.id,
                    username,
                    action: 'Wrong Password',
                    details: 'Incorrect password entered',
                    ipAddress
                });
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }

            if (user.status !== 'active') {
                return res.status(403).json({ success: false, message: 'Your account is inactive. Contact Super Admin.' });
            }

            // Device security check
            let isNewDevice = false;
            if (user.device_id && user.device_id !== deviceId) {
                isNewDevice = true;
                // Log and alert
                await logRepository.logActivity({
                    actorType: 'admin',
                    actorId: user.id,
                    username,
                    action: 'New Device Login Attempt',
                    details: `New device ID: ${deviceId}, Name: ${deviceName}`,
                    ipAddress
                });
                if (user.telegram_chat_id) {
                    await telegramService.sendSecurityAlert(user.telegram_chat_id, {
                        username,
                        action: 'Login Attempt from New Device',
                        ipAddress,
                        deviceName
                    });
                }
            } else if (!user.device_id && deviceId) {
                // Register device on first login
                await userRepository.updateDeviceId(user.id, deviceId);
            }

            // Generate OTP
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes validity
            await userRepository.updateOtp(user.id, otp, expiresAt.toISOString());

            // Send via Telegram
            if (user.telegram_chat_id) {
                const sent = await telegramService.sendOtp(user.telegram_chat_id, otp);
                if (!sent) {
                    console.error('Failed to send OTP to telegram chat ID:', user.telegram_chat_id);
                } else {
                    await logRepository.logActivity({
                        actorType: 'admin',
                        actorId: user.id,
                        username,
                        action: 'OTP Sent',
                        details: `OTP dispatched to registered Telegram Chat ID`,
                        ipAddress
                    });
                }
            } else {
                console.warn(`Admin ${username} does not have a telegram_chat_id registered.`);
            }

            // Issue temporary token for verification
            const tempToken = jwt.sign(
                { id: user.id, username: user.username, type: 'admin_temp' },
                process.env.JWT_SECRET || 'shiva_honda_super_secret_jwt_key_2026',
                { expiresIn: '5m' }
            );

            return res.status(200).json({
                success: true,
                requires_otp: true,
                temp_token: tempToken,
                telegram_chat_id: user.telegram_chat_id ? `******${user.telegram_chat_id.slice(-4)}` : null,
                is_new_device: isNewDevice
            });

        } catch (error) {
            console.error('Admin login error:', error);
            return res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }

    async adminVerifyOtp(req, res) {
        const { tempToken, otp, deviceId, deviceName } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];

        if (!tempToken || !otp) {
            return res.status(400).json({ success: false, message: 'Verification details missing.' });
        }

        try {
            const secret = process.env.JWT_SECRET || 'shiva_honda_super_secret_jwt_key_2026';
            let decoded;
            try {
                decoded = jwt.verify(tempToken, secret);
            } catch (err) {
                return res.status(401).json({ success: false, message: 'Verification session expired. Please login again.' });
            }

            if (decoded.type !== 'admin_temp') {
                return res.status(403).json({ success: false, message: 'Invalid verification token.' });
            }

            const user = await userRepository.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            // Check if locked
            const now = new Date();
            if (user.locked_until && new Date(user.locked_until) > now) {
                return res.status(401).json({ success: false, message: 'Account is locked. Please wait.' });
            }

            // Validate OTP
            if (!user.otp_code || user.otp_code !== otp) {
                // Increment failed attempts
                await userRepository.incrementOtpAttempts(user.id);
                const updatedUser = await userRepository.findById(user.id);
                
                await logRepository.logActivity({
                    actorType: 'admin',
                    actorId: user.id,
                    username: user.username,
                    action: 'Wrong OTP',
                    details: `Failed OTP attempt. Total failed attempts: ${updatedUser.otp_attempts}`,
                    ipAddress
                });

                if (updatedUser.otp_attempts >= 5) {
                    const lockTime = new Date(Date.now() + 30 * 60000); // 30 minutes lock
                    await userRepository.lockAccount(user.id, lockTime.toISOString());
                    
                    if (user.telegram_chat_id) {
                        await telegramService.sendMessage(
                            user.telegram_chat_id,
                            `🚨 <b>My Shiva Honda Security Alert</b>\n\nYour admin account has been locked for 30 minutes due to 5 failed OTP verification attempts.`
                        );
                    }

                    return res.status(401).json({
                        success: false,
                        message: 'Too many incorrect attempts. Account locked for 30 minutes.'
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: `Invalid OTP code. ${5 - updatedUser.otp_attempts} attempts remaining.`
                });
            }

            // Check expiry
            if (new Date(user.otp_expires_at) < now) {
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
            }

            // Reset OTP details
            await userRepository.resetOtpAttempts(user.id);

            // Register device if it was a new device verification
            if (deviceId && user.device_id !== deviceId) {
                await userRepository.updateDeviceId(user.id, deviceId);
                await logRepository.logActivity({
                    actorType: 'admin',
                    actorId: user.id,
                    username: user.username,
                    action: 'New Device Registered',
                    details: `Device ID: ${deviceId}, Name: ${deviceName}`,
                    ipAddress
                });
            }

            // Login successful, generate JWT
            const accessToken = jwt.sign(
                { id: user.id, username: user.username, role: user.role, type: 'admin' },
                secret,
                { expiresIn: '8h' } // 8 hours session security
            );

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: user.id,
                username: user.username,
                action: 'Login Success',
                details: `Admin logged in successfully using 2FA. Device: ${deviceName || 'Unknown'}`,
                ipAddress
            });

            return res.status(200).json({
                success: true,
                access_token: accessToken,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    telegram_chat_id: user.telegram_chat_id
                }
            });

        } catch (error) {
            console.error('Admin OTP verify error:', error);
            return res.status(500).json({ success: false, message: 'Server error during verification.' });
        }
    }

    // ----------------------------------------------------
    // DEALER AUTHENTICATION
    // ----------------------------------------------------
    async dealerLogin(req, res) {
        const { dealerCode, password, deviceId, pushToken, deviceName } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];

        if (!dealerCode || !password) {
            return res.status(400).json({ success: false, message: 'Dealer Code and password required.' });
        }

        try {
            const dealer = await dealerRepository.findByDealerCode(dealerCode);
            if (!dealer) {
                return res.status(401).json({ success: false, message: 'Invalid Dealer Code or password.' });
            }

            if (dealer.status !== 'active') {
                return res.status(403).json({ success: false, message: 'Dealer account is deactivated.' });
            }

            // Verify Password
            const isMatch = bcrypt.compareSync(password, dealer.password_hash);
            if (!isMatch) {
                await logRepository.logActivity({
                    actorType: 'dealer',
                    actorId: dealer.id,
                    username: dealerCode,
                    action: 'Dealer Login Failed',
                    details: 'Incorrect password',
                    ipAddress
                });
                return res.status(401).json({ success: false, message: 'Invalid Dealer Code or password.' });
            }

            // Save login info
            await dealerRepository.updateLoginInfo(dealer.id, deviceId, pushToken);

            // Generate JWT for Dealer
            const secret = process.env.JWT_SECRET || 'shiva_honda_super_secret_jwt_key_2026';
            const token = jwt.sign(
                { id: dealer.id, dealer_code: dealer.dealer_code, role: 'dealer', type: 'dealer' },
                secret,
                { expiresIn: '30d' } // Dealers keep longer sessions for easy access
            );

            await logRepository.logActivity({
                actorType: 'dealer',
                actorId: dealer.id,
                username: dealerCode,
                action: 'Login Success',
                details: `Dealer logged in successfully. Device: ${deviceName || 'Unknown'}`,
                ipAddress
            });

            return res.status(200).json({
                success: true,
                token: token,
                dealer: {
                    id: dealer.id,
                    dealer_code: dealer.dealer_code,
                    name: dealer.name,
                    network_id: dealer.network_id,
                    network_name: dealer.network_name,
                    district: dealer.district,
                    state: dealer.state,
                    dealer_type: dealer.dealer_type
                }
            });

        } catch (error) {
            console.error('Dealer login error:', error);
            return res.status(500).json({ success: false, message: 'Server error during dealer login.' });
        }
    }

    // ----------------------------------------------------
    // UNIFIED MOBILE LOGIN (Dealer + Network Manager)
    // ----------------------------------------------------
    async mobileLogin(req, res) {
        const { username, password, deviceId, pushToken, deviceName } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const secret = process.env.JWT_SECRET || 'shiva_honda_super_secret_jwt_key_2026';

        try {
            // ── STEP 1: Try Dealer login first (by dealer_code) ──────────
            const dealer = await dealerRepository.findByDealerCode(username.trim().toUpperCase());

            if (dealer) {
                if (dealer.status !== 'active') {
                    console.log(`Mobile Login: Dealer ${dealer.dealer_code} is inactive.`);
                    return res.status(403).json({ success: false, message: 'Dealer account is deactivated. Contact your administrator.' });
                }

                const isMatch = bcrypt.compareSync(password, dealer.password_hash);
                if (!isMatch) {
                    console.log(`Mobile Login: Dealer ${dealer.dealer_code} password mismatch.`);
                    await logRepository.logActivity({
                        actorType: 'dealer', actorId: dealer.id, username: dealer.dealer_code,
                        action: 'Mobile Login Failed', details: 'Incorrect password', ipAddress
                    });
                    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
                }

                // Update device info & push token
                await dealerRepository.updateLoginInfo(dealer.id, deviceId, pushToken);

                const token = jwt.sign(
                    { id: dealer.id, dealer_code: dealer.dealer_code, role: 'dealer', type: 'dealer' },
                    secret,
                    { expiresIn: '30d' }
                );

                await logRepository.logActivity({
                    actorType: 'dealer', actorId: dealer.id, username: dealer.dealer_code,
                    action: 'Mobile Login Success', details: `Dealer logged in via mobile. Device: ${deviceName || 'Unknown'}`, ipAddress
                });

                // Get network name
                const db = require('../database/db');
                const network = await db.get('SELECT name FROM networks WHERE id = ?', [dealer.network_id]);

                return res.status(200).json({
                    success: true,
                    token,
                    role: 'dealer',
                    user: {
                        id: dealer.id,
                        name: dealer.name,
                        username: dealer.dealer_code,
                        dealer_code: dealer.dealer_code,
                        role: 'dealer',
                        type: 'dealer',
                        network_id: dealer.network_id,
                        network_name: network ? network.name : null,
                        district: dealer.district,
                        state: dealer.state,
                        dealer_type: dealer.dealer_type
                    }
                });
            }

            // ── STEP 2: Try Network Manager login (by username) ──────────
            const nmUser = await userRepository.findByUsername(username.trim());

            if (nmUser && nmUser.role === 'network_manager') {
                if (nmUser.status !== 'active') {
                    console.log(`Mobile Login: NM ${nmUser.username} is inactive.`);
                    return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
                }

                // Check if account is locked
                const now = new Date();
                if (nmUser.locked_until && new Date(nmUser.locked_until) > now) {
                    const minutesLeft = Math.ceil((new Date(nmUser.locked_until) - now) / 60000);
                    return res.status(401).json({ success: false, message: `Account locked. Try again in ${minutesLeft} minutes.` });
                }

                const isMatch = bcrypt.compareSync(password, nmUser.password_hash);
                if (!isMatch) {
                    console.log(`Mobile Login: NM ${nmUser.username} password mismatch.`);
                    await logRepository.logActivity({
                        actorType: 'admin', actorId: nmUser.id, username: nmUser.username,
                        action: 'NM Mobile Login Failed', details: 'Incorrect password', ipAddress
                    });
                    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
                }

                // Update device_id for NM
                await userRepository.updateDeviceId(nmUser.id, deviceId);

                const token = jwt.sign(
                    { id: nmUser.id, username: nmUser.username, role: nmUser.role, type: 'admin' },
                    secret,
                    { expiresIn: '7d' }
                );

                await logRepository.logActivity({
                    actorType: 'admin', actorId: nmUser.id, username: nmUser.username,
                    action: 'NM Mobile Login Success', details: `Network Manager logged in via mobile. Device: ${deviceName || 'Unknown'}`, ipAddress
                });

                return res.status(200).json({
                    success: true,
                    token,
                    role: 'network_manager',
                    user: {
                        id: nmUser.id,
                        name: nmUser.username,
                        username: nmUser.username,
                        role: 'network_manager',
                        type: 'admin',
                        telegram_chat_id: nmUser.telegram_chat_id
                    }
                });
            } else if (nmUser && nmUser.role === 'super_admin') {
                // If they try to login as super admin on mobile, return specific error
                console.log(`Mobile Login: Super Admin ${nmUser.username} tried to login on mobile app.`);
                return res.status(401).json({ success: false, message: 'Super Admin must use the Web Dashboard.' });
            }

            // ── STEP 3: Not found in either table ────────────────────────
            console.log(`Mobile Login: Username '${username}' not found in dealers or network managers.`);
            return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your username and password.' });

        } catch (error) {
            console.error('Mobile login error:', error);
            return res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }
}

module.exports = new AuthController();
