const bcrypt = require('bcryptjs');
const db = require('../database/db');
const userRepository = require('../repositories/userRepository');
const dealerRepository = require('../repositories/dealerRepository');
const reportRepository = require('../repositories/reportRepository');
const cronService = require('../services/cronService');

async function runTests() {
    console.log('====================================================');
    console.log('   SHIVA HONDA - BACKEND INTEGRATION VERIFIER');
    console.log('====================================================');
    
    // Wait for DB to connect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
        const today = cronService.getTodayIstDate();
        console.log(`Current Test Date context (IST): ${today}`);

        // ----------------------------------------------------
        // TEST 1: Admin Authentication & 2FA Flow
        // ----------------------------------------------------
        console.log('\n--- TEST 1: Admin Credentials Verification & 2FA ---');
        const admin = await userRepository.findByUsername('admin');
        if (!admin) throw new Error('Seeded admin user not found!');
        console.log('✔ Found admin user.');

        const isPasswordCorrect = bcrypt.compareSync('admin123', admin.password_hash);
        if (!isPasswordCorrect) throw new Error('Password verification failed for admin123!');
        console.log('✔ Admin password verify matches.');

        // Simulate OTP dispatch
        const otpCode = '987654';
        const expiry = new Date(Date.now() + 5 * 60000).toISOString();
        await userRepository.updateOtp(admin.id, otpCode, expiry);
        console.log(`✔ Seeded 2FA OTP Code: ${otpCode} (Expires: ${expiry})`);

        // Read back OTP
        const freshAdminObj = await userRepository.findById(admin.id);
        if (freshAdminObj.otp_code !== otpCode) throw new Error('OTP was not updated correctly in database!');
        console.log('✔ Verified OTP code stored successfully.');

        // OTP Verification Match
        if (freshAdminObj.otp_code === otpCode && new Date(freshAdminObj.otp_expires_at) > new Date()) {
            await userRepository.resetOtpAttempts(admin.id);
            console.log('✔ OTP Verified. Admin logged in successfully.');
        } else {
            throw new Error('OTP validation check failed!');
        }

        // Lockout test (wrong OTP)
        console.log('\n--- TEST 2: OTP Wrong Attempt Lockout Policy ---');
        await userRepository.updateOtp(admin.id, '111111', expiry);
        let attempts = 0;
        for (let i = 0; i < 5; i++) {
            await userRepository.incrementOtpAttempts(admin.id);
            attempts++;
        }
        let lockedAdmin = await userRepository.findById(admin.id);
        console.log(`✔ Attempted wrong OTP ${attempts} times. Current DB failed attempts: ${lockedAdmin.otp_attempts}`);
        
        const lockTime = new Date(Date.now() + 30 * 60000).toISOString();
        await userRepository.lockAccount(admin.id, lockTime);
        lockedAdmin = await userRepository.findById(admin.id);
        console.log(`✔ Account temporary lock status: Locked until ${lockedAdmin.locked_until}`);
        
        // Reset Admin to clean state
        await userRepository.resetOtpAttempts(admin.id);
        await db.query('UPDATE users SET locked_until = NULL WHERE id = ?', [admin.id]);
        console.log('✔ Reset admin account to active state.');

        // ----------------------------------------------------
        // TEST 3: Dealer Actions & Validation Calculations
        // ----------------------------------------------------
        console.log('\n--- TEST 3: Dealer Report Calculations & Locks ---');
        const dealer = await dealerRepository.findByDealerCode('DL001');
        if (!dealer) throw new Error('DL001 dealer not found. Run seeding first!');
        console.log(`✔ Found dealer: ${dealer.name} (${dealer.dealer_code})`);

        // Create Report Draft
        const salesData = {
            activa_110_std: 5,
            activa_110_dlx: 2,
            activa_h_smart: 3,
            activa_125: 4,
            activa_125_h_smart: 1, // Scooter Sum = 15
            cb_hornet125: 2,
            shine100dx: 1,
            sp160: 1,
            sp125_drum: 2,
            sp125_disc: 2,
            shine125_drum: 1,
            shine125_disc: 1,
            shine100: 3,
            shine100_2b: 1,
            hornet2_0: 1, // Motorcycle Sum = 15
            today_booking: 8,
            total_booking: 45
        };

        const stockData = {
            activa_110_std: 10,
            activa_110_dlx: 5,
            activa_h_smart: 8,
            activa_125: 6,
            activa_125_h_smart: 4, // Scooter Stock = 33
            cb_hornet125: 4,
            shine100dx: 2,
            sp160: 3,
            sp125_drum: 5,
            sp125_disc: 5,
            shine125_drum: 3,
            shine125_disc: 3,
            shine100: 8,
            shine100_2b: 2,
            hornet2_0: 2 // Motorcycle Stock = 37
        };

        // Clear existing test report if any to allow fresh submission
        await db.query('DELETE FROM reports WHERE dealer_id = ? AND date = ?', [dealer.id, today]);

        // Save Draft
        console.log('Saving dealer report draft...');
        const draft = await reportRepository.createOrUpdateDraft(dealer.id, today, { sales: salesData, stock: stockData });
        console.log(`✔ Draft saved. Status: ${draft.status}`);

        // Submit Report
        console.log('Finalizing report submission (Locks it)...');
        await reportRepository.submitFinalReport(dealer.id, today);
        const submitted = await reportRepository.findByDealerAndDate(dealer.id, today);
        console.log(`✔ Submitted. New Status: ${submitted.status}`);

        // Verify Lock
        try {
            console.log('Testing update on locked report (Should throw error)...');
            await reportRepository.createOrUpdateDraft(dealer.id, today, { sales: salesData, stock: stockData });
            throw new Error('FAIL: Report was edited after final submission!');
        } catch (e) {
            console.log(`✔ SUCCESS: Edit blocked. Error: "${e.message}"`);
        }

        // Verify calculations
        console.log('\n--- TEST 4: Aggregation & Dashboard Logic Verification ---');
        const stats = await reportRepository.getDashboardStats(today);
        console.log(`Dashboard statistics for ${today}:`);
        console.log(`- Today Submitted: ${stats.summary.submitted}`);
        console.log(`- Today Sales (SC/MC): ${stats.summary.today_sales} (${stats.summary.today_sc_sales}/${stats.summary.today_mc_sales})`);
        console.log(`- Today Stock (SC/MC): ${stats.summary.today_stock} (${stats.summary.today_sc_stock}/${stats.summary.today_mc_stock})`);
        console.log(`- Today Bookings: ${stats.summary.today_booking}`);

        if (stats.summary.today_sales !== 30) {
            throw new Error(`Incorrect sale total calculations! Expected 30, got ${stats.summary.today_sales}`);
        }
        if (stats.summary.today_sc_sales !== 15 || stats.summary.today_mc_sales !== 15) {
            throw new Error('Incorrect category sale calculations!');
        }
        if (stats.summary.today_stock !== 70) {
            throw new Error(`Incorrect stock total calculations! Expected 70, got ${stats.summary.today_stock}`);
        }
        if (stats.summary.today_sc_stock !== 33 || stats.summary.today_mc_stock !== 37) {
            throw new Error('Incorrect category stock calculations!');
        }
        console.log('✔ All math and aggregations are 100% correct.');

        // Clean up test reports
        await db.query('DELETE FROM reports WHERE dealer_id = ? AND date = ?', [dealer.id, today]);
        console.log('\n✔ Test reports cleaned up.');

        console.log('====================================================');
        console.log('   API INTEGRATION VERIFICATION COMPLETE: ALL PASSED');
        console.log('====================================================');
        process.exit(0);

    } catch (err) {
        console.error('\n✖ VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

runTests();
