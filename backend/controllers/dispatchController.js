const dispatchRepository = require('../repositories/dispatchRepository');
const logRepository = require('../repositories/logRepository');

class DispatchController {
    async getDispatches(req, res) {
        try {
            const filters = { ...req.query };
            
            // If user is a dealer, force filter by their dealer_id
            if (req.user.role === 'dealer') {
                filters.dealer_id = req.user.id;
            }

            const dispatches = await dispatchRepository.getDispatches(filters);
            return res.status(200).json({ success: true, data: dispatches });
        } catch (error) {
            console.error('Get dispatches error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dispatches.' });
        }
    }

    async saveDispatch(req, res) {
        const userId = req.user.id;
        const { dealerId, date, items, isOpeningStock, isReset } = req.body;

        if (!dealerId || !date || !items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Dealer ID, date, and items array are required.' });
        }

        try {
            if (isOpeningStock) {
                const db = require('../database/db');
                const existing = await db.get('SELECT id FROM dispatches WHERE dealer_id = ? AND is_opening_stock = 1 AND status = "Initialized"', [dealerId]);
                
                if (existing) {
                    if (isReset && req.user.role === 'super_admin') {
                        // Archive old
                        await db.query('UPDATE dispatches SET status = "Archived" WHERE id = ?', [existing.id]);
                        await logRepository.logActivity({
                            actorType: req.user.type, actorId: userId, username: req.user.username || req.user.dealer_code,
                            action: 'Reset Opening Stock', details: `Archived old opening stock for dealer ${dealerId}`,
                            ipAddress: req.ip || req.headers['x-forwarded-for']
                        });
                    } else {
                        return res.status(400).json({ success: false, message: 'Opening stock is already initialized.' });
                    }
                }
            }

            let sourceId = null;
            let initialStatus = null; // Let repository decide by default

            if (req.user.role === 'godown' || req.user.role === 'showroom') {
                sourceId = req.user.id;
            }

            const db = require('../database/db');
            const destDealer = await db.get('SELECT name, dealer_code, role FROM dealers WHERE id = ?', [dealerId]);
            
            if (req.user.role === 'godown' || req.user.role === 'showroom') {
                initialStatus = 'Completed'; // Instantly transferred everywhere in the network
            }

            const result = await dispatchRepository.saveDispatch(dealerId, date, items, userId, isOpeningStock, sourceId, initialStatus);
            
            const totalQty = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            let actionName = sourceId ? 'Vehicle Transfer' : 'Factory Dispatch';
            let detailStr = sourceId 
                ? `Transferred ${totalQty} vehicles to ${destDealer.name} (${destDealer.dealer_code})`
                : `Added ${totalQty} new vehicles from Factory to ${destDealer.name}`;

            await logRepository.logActivity({
                actorType: req.user.type,
                actorId: userId,
                username: req.user.username || req.user.dealer_code,
                action: actionName,
                details: detailStr,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Dispatch saved successfully.', data: result });
        } catch (error) {
            console.error('Save dispatch error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save dispatch: ' + error.message, stack: error.stack });
        }
    }

    async deleteDispatch(req, res) {
        const adminId = req.user.id;
        const id = req.params.id;

        try {
            const success = await dispatchRepository.deleteDispatch(id);
            if (!success) {
                return res.status(404).json({ success: false, message: 'Dispatch not found.' });
            }

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: adminId,
                username: req.user.username,
                action: 'Deleted Dispatch',
                details: `Deleted dispatch ID ${id}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Dispatch deleted and stock updated.' });
        } catch (error) {
            console.error('Delete dispatch error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete dispatch.' });
        }
    }

    async updateStatus(req, res) {
        const id = req.params.id;
        const { status } = req.body;
        
        if (!['Accepted', 'Rejected', 'Completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        try {
            await dispatchRepository.updateDispatchStatus(id, status);
            
            await logRepository.logActivity({
                actorType: req.user.type,
                actorId: req.user.id,
                username: req.user.username || req.user.dealer_code,
                action: 'Updated Dispatch Status',
                details: `Changed dispatch ID ${id} status to ${status}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: `Dispatch marked as ${status}.` });
        } catch (error) {
            console.error('Update dispatch status error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update dispatch status.' });
        }
    }

    async uploadExcel(req, res) {
        const adminId = req.user.id;
        const { dispatches } = req.body; // Array of { dealerId, date, items }

        if (!dispatches || !Array.isArray(dispatches)) {
            return res.status(400).json({ success: false, message: 'Invalid payload for Excel upload.' });
        }

        try {
            let successCount = 0;
            for (let d of dispatches) {
                if (d.dealerId && d.date && Array.isArray(d.items)) {
                    await dispatchRepository.saveDispatch(d.dealerId, d.date, d.items, adminId);
                    successCount++;
                }
            }
            
            await logRepository.logActivity({
                actorType: 'admin',
                actorId: adminId,
                username: req.user.username,
                action: 'Excel Dispatch Upload',
                details: `Uploaded ${successCount} dispatch records.`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: `Successfully uploaded ${successCount} dispatch records.` });
        } catch (error) {
            console.error('Excel upload error:', error);
            return res.status(500).json({ success: false, message: 'Failed to process Excel upload.' });
        }
    }

    async saveStockAdjustment(req, res) {
        const adminId = req.user.id;
        const { dealerId, date, variantColorId, adjustmentQty, reason } = req.body;

        if (!dealerId || !date || !variantColorId || adjustmentQty === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required adjustment fields.' });
        }

        try {
            await dispatchRepository.saveStockAdjustment(dealerId, date, variantColorId, adjustmentQty, reason, adminId);
            
            await logRepository.logActivity({
                actorType: 'admin',
                actorId: adminId,
                username: req.user.username,
                action: 'Stock Adjustment',
                details: `Adjusted stock for variant_color_id ${variantColorId} (Qty: ${adjustmentQty}) for dealer ${dealerId} on ${date}. Reason: ${reason}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Stock adjustment saved successfully.' });
        } catch (error) {
            console.error('Stock adjustment error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save stock adjustment.' });
        }
    }
}

module.exports = new DispatchController();
