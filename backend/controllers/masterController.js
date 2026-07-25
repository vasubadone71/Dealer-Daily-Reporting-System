const db = require('../database/db');

class MasterController {
    // ----------------------------------------------------
    // INVENTORY TREE (Model -> Variant -> Color)
    // ----------------------------------------------------
    async getInventoryTree(req, res) {
        try {
            // Get all active models
            const models = await db.query('SELECT * FROM models WHERE is_active = 1 ORDER BY type, name');
            
            // Get all active variants
            const variants = await db.query('SELECT * FROM variants WHERE is_active = 1 ORDER BY name');
            
            // Get all active variant-color mappings with color details
            const variantColors = await db.query(`
                SELECT vc.id as variant_color_id, vc.variant_id, c.id as color_id, c.name as color_name, c.hex_code 
                FROM variant_colors vc
                JOIN colors c ON vc.color_id = c.id
                WHERE vc.is_active = 1 AND c.is_active = 1
                ORDER BY c.name
            `);

            // Build the nested tree
            const tree = models.map(model => {
                const modelVariants = variants
                    .filter(v => v.model_id === model.id)
                    .map(variant => {
                        const colors = variantColors
                            .filter(vc => vc.variant_id === variant.id)
                            .map(vc => ({
                                variant_color_id: vc.variant_color_id,
                                color_id: vc.color_id,
                                color_name: vc.color_name,
                                hex_code: vc.hex_code
                            }));
                        return {
                            ...variant,
                            colors
                        };
                    });
                return {
                    ...model,
                    variants: modelVariants
                };
            });

            return res.status(200).json({ success: true, data: tree });
        } catch (error) {
            console.error('getInventoryTree error:', error);
            return res.status(500).json({ success: false, message: 'Server error fetching inventory tree' });
        }
    }

    // ----------------------------------------------------
    // COLORS CRUD
    // ----------------------------------------------------
    async getColors(req, res) {
        try {
            const colors = await db.query('SELECT * FROM colors ORDER BY name');
            return res.status(200).json({ success: true, data: colors });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    async addColor(req, res) {
        const { name, hex_code } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Color name is required' });

        try {
            const resDb = await db.query('INSERT INTO colors (name, hex_code) VALUES (?, ?)', [name.trim(), hex_code]);
            return res.status(201).json({ success: true, data: { id: resDb.lastID, name: name.trim(), hex_code, is_active: 1 } });
        } catch (error) {
            console.error(error);
            if (error.message.includes('UNIQUE')) {
                return res.status(400).json({ success: false, message: 'Color already exists' });
            }
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    async updateColor(req, res) {
        const { id } = req.params;
        const { name, hex_code, is_active } = req.body;

        try {
            await db.query('UPDATE colors SET name = ?, hex_code = ?, is_active = ? WHERE id = ?', [name, hex_code, is_active, id]);
            return res.status(200).json({ success: true, message: 'Color updated' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    // ----------------------------------------------------
    // VARIANT-COLOR ASSIGNMENTS
    // ----------------------------------------------------
    async assignColorToVariant(req, res) {
        const { variant_id, color_id } = req.body;
        if (!variant_id || !color_id) return res.status(400).json({ success: false, message: 'variant_id and color_id required' });

        try {
            await db.query('INSERT INTO variant_colors (variant_id, color_id) VALUES (?, ?)', [variant_id, color_id]);
            return res.status(201).json({ success: true, message: 'Color assigned to variant' });
        } catch (error) {
            console.error(error);
            if (error.message.includes('UNIQUE')) {
                return res.status(400).json({ success: false, message: 'Color is already assigned to this variant' });
            }
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    async removeColorFromVariant(req, res) {
        const { variant_id, color_id } = req.params;
        try {
            await db.query('DELETE FROM variant_colors WHERE variant_id = ? AND color_id = ?', [variant_id, color_id]);
            return res.status(200).json({ success: true, message: 'Color removed from variant' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }
}

module.exports = new MasterController();
