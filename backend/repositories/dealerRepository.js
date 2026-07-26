const db = require('../database/db');

class DealerRepository {
    async findByDealerCode(dealerCode) {
        return db.get('SELECT * FROM dealers WHERE dealer_code = ?', [dealerCode]);
    }

    async findById(id) {
        return db.get('SELECT d.*, n.name as network_name FROM dealers d LEFT JOIN networks n ON d.network_id = n.id WHERE d.id = ?', [id]);
    }

    async create({ dealerCode, name, passwordHash, networkId, district, state, dealerType, role, gstNo }) {
        return db.query(
            'INSERT INTO dealers (dealer_code, name, password_hash, network_id, district, state, dealer_type, role, status, gst_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", ?)',
            [dealerCode, name, passwordHash, networkId || null, district, state, dealerType, role || 'dealer', gstNo || null]
        );
    }

    async update(id, { name, passwordHash, networkId, district, state, dealerType, status, role, gstNo }) {
        if (passwordHash) {
            return db.query(
                'UPDATE dealers SET name = ?, password_hash = ?, network_id = ?, district = ?, state = ?, dealer_type = ?, status = ?, role = ?, gst_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [name, passwordHash, networkId, district, state, dealerType, status, role || 'dealer', gstNo || null, id]
            );
        } else {
            return db.query(
                'UPDATE dealers SET name = ?, network_id = ?, district = ?, state = ?, dealer_type = ?, status = ?, role = ?, gst_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [name, networkId, district, state, dealerType, status, role || 'dealer', gstNo || null, id]
            );
        }
    }

    async updatePassword(id, passwordHash) {
        return db.query('UPDATE dealers SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, id]);
    }

    async delete(id) {
        return db.query('DELETE FROM dealers WHERE id = ?', [id]);
    }

    async listAll(filters = {}) {
        let sql = `
            SELECT d.id, d.dealer_code, d.name, d.network_id, n.name as network_name, 
                   d.district, d.state, d.dealer_type, d.role, d.status, d.last_login_at, d.created_at, d.gst_no 
            FROM dealers d 
            LEFT JOIN networks n ON d.network_id = n.id
        `;
        const params = [];
        const whereClauses = [];

        if (filters.network_id) {
            whereClauses.push('d.network_id = ?');
            params.push(filters.network_id);
        }
        if (filters.status) {
            whereClauses.push('d.status = ?');
            params.push(filters.status);
        }
        if (filters.district) {
            whereClauses.push('d.district = ?');
            params.push(filters.district);
        }
        if (filters.state) {
            whereClauses.push('d.state = ?');
            params.push(filters.state);
        }
        if (filters.dealer_type) {
            whereClauses.push('d.dealer_type = ?');
            params.push(filters.dealer_type);
        }
        if (filters.search) {
            whereClauses.push('(d.name LIKE ? OR d.dealer_code LIKE ?)');
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY d.dealer_code ASC';
        return db.query(sql, params);
    }

    async updateLoginInfo(id, deviceId, pushToken) {
        return db.query(
            'UPDATE dealers SET device_id = ?, push_token = ?, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [deviceId, pushToken, id]
        );
    }
}

module.exports = new DealerRepository();
