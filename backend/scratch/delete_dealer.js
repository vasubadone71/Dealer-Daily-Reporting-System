const db = require('../database/db'); async function run() { await db.query('UPDATE dealers SET status = "inactive" WHERE dealer_code = "MP43SB01"'); console.log('Done'); process.exit(0); } run();
