const db = require('../database/db');

class NetworkRepository {
    async findAll() {
        return db.query('SELECT * FROM networks ORDER BY name ASC');
    }

    async findById(id) {
        return db.get('SELECT * FROM networks WHERE id = ?', [id]);
    }

    async findByName(name) {
        return db.get('SELECT * FROM networks WHERE name = ?', [name]);
    }

    async create(name) {
        return db.query('INSERT INTO networks (name) VALUES (?)', [name]);
    }

    async delete(id) {
        // SQLite will prevent deletion if there are active foreign key restrictions and enabled in SQLite
        return db.query('DELETE FROM networks WHERE id = ?', [id]);
    }
}

module.exports = new NetworkRepository();
