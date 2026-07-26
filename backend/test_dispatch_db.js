const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../database.sqlite');
db.all("SELECT * FROM dispatches WHERE dealer_id = 31", (err, rows) => {
    console.log(err || rows);
});
