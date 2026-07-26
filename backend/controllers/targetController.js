const db = require('../database/db');
const logRepository = require('../repositories/logRepository');

class TargetController {
    async getTargets(req, res) {
        try {
            const filters = req.query;
            let sql = `
                SELECT t.*, 
                CASE WHEN t.target_type = 'dealer' THEN d.name ELSE n.name END as target_name,
                CASE WHEN t.target_type = 'dealer' THEN d.dealer_code ELSE '' END as dealer_code,
                m.name as model_name, m.is_focus
                FROM targets t
                LEFT JOIN dealers d ON t.target_type = 'dealer' AND t.target_id = d.id
                LEFT JOIN networks n ON t.target_type = 'network' AND t.target_id = n.id
                LEFT JOIN models m ON t.model_id = m.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.month) {
                sql += ' AND t.month = ?';
                params.push(filters.month);
            }
            if (filters.target_type) {
                sql += ' AND t.target_type = ?';
                params.push(filters.target_type);
            }
            if (filters.target_id) {
                sql += ' AND t.target_id = ?';
                params.push(filters.target_id);
            }
            if (req.user.role === 'dealer') {
                sql += ' AND t.target_type = "dealer" AND t.target_id = ?';
                params.push(req.user.id);
            }

            const targets = await db.query(sql, params);
            return res.status(200).json({ success: true, data: targets });
        } catch (error) {
            console.error('Get targets error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch targets.' });
        }
    }

    async saveTarget(req, res) {
        // targets: array of { variant_color_id (optional, null = overall), target_qty }
        // OR legacy: { model_id, target_qty } – we save as overall (variant_color_id = NULL)
        const { target_type, target_id, month, targets, total_target } = req.body;
        const adminId = req.user.id;

        if (!target_type || !target_id || !month) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        try {
            // ── Case 1: Simple total_target (one number, no model breakdown) ──────────
            if (typeof total_target === 'number' || total_target !== undefined) {
                const qty = parseInt(total_target, 10) || 0;
                await db.query(`
                    DELETE FROM targets 
                    WHERE target_type = ? AND target_id = ? AND month = ?
                `, [target_type, target_id, month]);

                if (qty > 0) {
                    await db.query(`
                        INSERT INTO targets (target_type, target_id, month, variant_color_id, target_qty, created_by)
                        VALUES (?, ?, ?, NULL, ?, ?)
                    `, [target_type, target_id, month, qty, adminId]);
                }

                await logRepository.logActivity({
                    actorType: 'admin', actorId: adminId, username: req.user.username,
                    action: 'Set Target',
                    details: `Set overall target for ${target_type} ${target_id} in ${month}: ${qty}`,
                    ipAddress: req.ip || req.headers['x-forwarded-for']
                });

                return res.status(200).json({ success: true, message: 'Target saved successfully.' });
            }

            // ── Case 2: Model-level breakdown (model_id used as grouping key) ──────────
            // We now store each model's target individually using the model_id column.
            if (Array.isArray(targets)) {
                // Delete existing overall target for this dealer/month
                await db.query(`
                    DELETE FROM targets 
                    WHERE target_type = ? AND target_id = ? AND month = ?
                `, [target_type, target_id, month]);

                let grandTotal = 0;
                for (const t of targets) {
                    const mId = t.model_id;
                    const qty = parseInt(t.target_qty, 10) || 0;
                    if (qty > 0) {
                        await db.query(`
                            INSERT INTO targets (target_type, target_id, month, variant_color_id, model_id, target_qty, created_by)
                            VALUES (?, ?, ?, NULL, ?, ?, ?)
                        `, [target_type, target_id, month, mId, qty, adminId]);
                        grandTotal += qty;
                    }
                }

                await logRepository.logActivity({
                    actorType: 'admin', actorId: adminId, username: req.user.username,
                    action: 'Set Target',
                    details: `Set model-wise targets for ${target_type} ${target_id} in ${month}. Grand total: ${grandTotal}`,
                    ipAddress: req.ip || req.headers['x-forwarded-for']
                });

                return res.status(200).json({ success: true, message: 'Targets saved successfully.' });
            }

            return res.status(400).json({ success: false, message: 'Provide either total_target or targets array.' });

        } catch (error) {
            console.error('Save target error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save targets.' });
        }
    }

    async bulkImport(req, res) {
        const { month, targetsData } = req.body;
        const adminId = req.user.id;

        if (!month || !Array.isArray(targetsData)) {
            return res.status(400).json({ success: false, message: 'Invalid data for bulk import.' });
        }

        try {
            for (const row of targetsData) {
                if (!row.target_type || !row.target_id) continue;

                await db.query(`
                    DELETE FROM targets 
                    WHERE target_type = ? AND target_id = ? AND month = ?
                `, [row.target_type, row.target_id, month]);

                const qty = parseInt(row.target_qty, 10) || 0;
                if (qty > 0) {
                    await db.query(`
                        INSERT INTO targets (target_type, target_id, month, variant_color_id, target_qty, created_by)
                        VALUES (?, ?, ?, NULL, ?, ?)
                    `, [row.target_type, row.target_id, month, qty, adminId]);
                }
            }

            return res.status(200).json({ success: true, message: 'Bulk import successful.' });
        } catch (error) {
            console.error('Bulk import error:', error);
            return res.status(500).json({ success: false, message: 'Bulk import failed.' });
        }
    }
    
    async deleteTarget(req, res) {
        const { target_type, target_id, month } = req.query;
        const adminId = req.user.id;
        
        if (!target_type || !target_id || !month) {
            return res.status(400).json({ success: false, message: 'Missing required query parameters.' });
        }
        
        try {
            await db.query(`
                DELETE FROM targets 
                WHERE target_type = ? AND target_id = ? AND month = ?
            `, [target_type, target_id, month]);
            
            await logRepository.logActivity({
                actorType: 'admin', actorId: adminId, username: req.user.username,
                action: 'Delete Target',
                details: `Deleted all targets for ${target_type} ${target_id} in ${month}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });
            
            return res.status(200).json({ success: true, message: 'Target deleted successfully.' });
        } catch (error) {
            console.error('Delete target error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete target.' });
        }
    }
}

module.exports = new TargetController();
