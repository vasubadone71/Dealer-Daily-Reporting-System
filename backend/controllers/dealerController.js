const bcrypt = require('bcryptjs');
const db = require('../database/db');
const dealerRepository = require('../repositories/dealerRepository');
const logRepository = require('../repositories/logRepository');

class DealerController {
    async getDealers(req, res) {
        try {
            const dealers = await dealerRepository.listAll(req.query);
            return res.status(200).json({ success: true, data: dealers });
        } catch (error) {
            console.error('List dealers error:', error);
            return res.status(500).json({ success: false, message: 'Failed to list dealers.' });
        }
    }

    async getDealerById(req, res) {
        try {
            const dealer = await dealerRepository.findById(req.params.id);
            if (!dealer) {
                return res.status(404).json({ success: false, message: 'Dealer not found.' });
            }
            return res.status(200).json({ success: true, data: dealer });
        } catch (error) {
            console.error('Get dealer error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dealer details.' });
        }
    }

    async createDealer(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required to create dealers.' });
        }

        const { dealerCode, name, password, networkId, district, state, dealerType, role, gstNo } = req.body;
        if (!dealerCode || !name || !password || !district || !state || !dealerType) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        try {
            const existing = await dealerRepository.findByDealerCode(dealerCode);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Dealer Code already registered.' });
            }

            // If no networkId provided, auto-assign the first available network
            let resolvedNetworkId = networkId ? parseInt(networkId) : null;
            if (!resolvedNetworkId) {
                const firstNetwork = await db.get('SELECT id FROM networks ORDER BY id ASC LIMIT 1');
                if (!firstNetwork) {
                    return res.status(400).json({ success: false, message: 'No network found. Please create a network first.' });
                }
                resolvedNetworkId = firstNetwork.id;
            }

            const passwordHash = bcrypt.hashSync(password, 10);
            await dealerRepository.create({
                dealerCode, name, passwordHash, networkId: resolvedNetworkId, district, state, dealerType, role: role || 'dealer', gstNo
            });

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Dealer Created',
                details: `Created dealer: ${dealerCode} (${name})`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(201).json({ success: true, message: 'Dealer created successfully.' });
        } catch (error) {
            console.error('Create dealer error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create dealer.' });
        }
    }

    async updateDealer(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required to edit dealers.' });
        }

        const { id } = req.params;
        const { name, password, networkId, district, state, dealerType, status, role, gstNo } = req.body;

        try {
            const dealer = await dealerRepository.findById(id);
            if (!dealer) {
                return res.status(404).json({ success: false, message: 'Dealer not found.' });
            }

            let passwordHash = null;
            if (password) {
                passwordHash = bcrypt.hashSync(password, 10);
            }

            await dealerRepository.update(id, {
                name, passwordHash, networkId, district, state, dealerType, status, role, gstNo
            });

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Dealer Details Changed',
                details: `Updated dealer ID: ${id} (${dealer.dealer_code})`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Dealer updated successfully.' });
        } catch (error) {
            console.error('Update dealer error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update dealer.' });
        }
    }

    async deleteDealer(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required to delete dealers.' });
        }

        const { id } = req.params;

        try {
            const dealer = await dealerRepository.findById(id);
            if (!dealer) {
                return res.status(404).json({ success: false, message: 'Dealer not found.' });
            }

            await dealerRepository.delete(id);

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Dealer Deleted',
                details: `Deleted dealer: ${dealer.dealer_code} - ${dealer.name}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Dealer deleted successfully.' });
        } catch (error) {
            console.error('Delete dealer error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete dealer.' });
        }
    }

    async resetPassword(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required to reset dealer passwords.' });
        }

        const { id } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'New password required.' });
        }

        try {
            const dealer = await dealerRepository.findById(id);
            if (!dealer) {
                return res.status(404).json({ success: false, message: 'Dealer not found.' });
            }

            const passwordHash = bcrypt.hashSync(password, 10);
            await dealerRepository.updatePassword(id, passwordHash);

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Password Changed',
                details: `Reset password for dealer: ${dealer.dealer_code}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Dealer password reset successful.' });
        } catch (error) {
            console.error('Reset password error:', error);
            return res.status(500).json({ success: false, message: 'Failed to reset password.' });
        }
    }

    async getPerformance(req, res) {
        const { id } = req.params;
        
        if (req.user.role === 'dealer' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        let month = req.query.month;
        if (!month) {
            const today = new Date();
            month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        }
        
        try {
            const performanceService = require('../services/performanceService');
            const performance = await performanceService.getDealerPerformance(id, month);
            return res.status(200).json({ success: true, data: performance });
        } catch (error) {
            console.error('Get performance error:', error);
            return res.status(500).json({ success: false, message: 'Failed to calculate performance score.' });
        }
    }
}

module.exports = new DealerController();
